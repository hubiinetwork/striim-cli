'use strict';

const dbg = require('../../dbg');
const nahmii = require('nahmii-sdk');
const ethers = require('ethers');
const ora = require('ora');

module.exports = {
    command: 'nii for period <period> [--gas=<gaslimit>] [--price=<gasPrice in gwei>] [--timeout=<seconds>]',
    describe: 'Claims NII tokens from the time locked revenue token manager and deposits all NII to nahmii. Will only work if wallet is beneficiary of contract.',
    builder: yargs => {
        yargs.example('claim nii for period 1', 'Claims NII tokens for time locked period 1 (December 2018).');
        yargs.example('claim nii for period 1 --price=32', 'Claims NII tokens for period 1 paying 32 Gwei as gas price.');
        yargs.option('gas', {
            desc: 'Gas limit used _per on-chain transaction_.',
            default: 800000,
            type: 'number'
        });
        yargs.option('price', {
            desc: 'Gas price used _per transaction_. Deposits can be 1 or more transactions depending on the type of currency.',
            default: 12,
            type: 'number'
        });
        yargs.option('timeout', {
            desc: 'Number of seconds to wait for each on-chain transaction to be mined.',
            default: 60,
            type: 'number'
        });
    },
    handler: async (argv) => {
        const period = validatePeriod(argv.period);
        const gasLimit = validateGasLimit(argv.gas || 800000);
        const timeout = validateTimeout(argv.timeout);
        const gasPriceGWEI = validateGasPrice(argv.price || 12);

        const gasPrice = ethers.utils.parseUnits(gasPriceGWEI.toString(), 'gwei');
        const options = {gasLimit, gasPrice};

        const config = require('../../config');
        const provider = await nahmii.NahmiiProvider.from(config.apiRoot, config.appId, config.appSecret);
        const privateKey = await config.privateKey(config.wallet.secret);
        const wallet = new nahmii.Wallet(privateKey, provider);
        const niiContract = await nahmii.Erc20Contract.from('NII', wallet);

        const spinner = ora();
        try {
            const RevenueTokenManagerContract = require('../../contracts/revenue-token-manager-contract');
            const revenueTokenManager = new RevenueTokenManagerContract(wallet);

            let niiBalance = await niiContract.balanceOf(config.wallet.address);
            dbg(`Opening on-chain balance: ${ethers.utils.formatUnits(niiBalance, 15)} NII`);

            let releaseReceipt;
            try {
                spinner.start(`1/8 - Registering claim for period ${period}`);
                const releaseTx = await revenueTokenManager.release(period - 1, options);
                spinner.succeed(`1/8 - Claim registered for period ${period}`);

                spinner.start('2/8 - Confirming claim');
                releaseReceipt = await provider.getTransactionConfirmation(releaseTx.hash, timeout);
                spinner.succeed('2/8 - Claim confirmed');
            }
            catch (err) {
                dbg(err);
                spinner.fail(err.message);
            }

            niiBalance = await niiContract.balanceOf(config.wallet.address);
            dbg(`Depositing: ${ethers.utils.formatUnits(niiBalance, 15)} NII`);

            spinner.start('Checking allowance');
            const allowance = await wallet.getDepositAllowance('NII');
            spinner.succeed('Allowance retrieved: ' + allowance.toString());

            let approveReceipt = null;

            if (allowance.lt(niiBalance)) {
                if (allowance.gt(ethers.utils.bigNumberify(0))) {
                    spinner.start('3/8 - Clearing allowance');
                    const pendingClearTx = await wallet.approveTokenDeposit(0, 'NII', options);
                    spinner.succeed('3/8 - Allowance cleared');

                    spinner.start('4/8 - Confirming allowance is cleared');
                    await provider.getTransactionConfirmation(pendingClearTx.hash, timeout);
                    spinner.succeed('4/8 - Allowance confirmed cleared');
                }
                else {
                    spinner.succeed('3/8 - Skipped');
                    spinner.succeed('4/8 - Skipped');
                }

                spinner.start(`5/8 - Approving transfer of ${niiBalance} NII`);
                const pendingApprovalTx = await wallet.approveTokenDeposit(ethers.utils.formatUnits(niiBalance, 15), 'NII', options);
                spinner.succeed('5/8 - Transfer approval registered');

                spinner.start('6/8 - Confirming transfer approval');
                approveReceipt = await provider.getTransactionConfirmation(pendingApprovalTx.hash, timeout);
                spinner.succeed('6/8 - Transfer approval confirmed');
            }
            else {
                spinner.succeed('3/8 - Skipped');
                spinner.succeed('4/8 - Skipped');
                spinner.succeed('5/8 - Skipped');
                spinner.succeed('6/8 - Skipped');
            }

            spinner.start('7/8 - Registering nahmii deposit');
            const pendingCompleteTx = await wallet.completeTokenDeposit(ethers.utils.formatUnits(niiBalance, 15), 'NII', options);
            spinner.succeed('7/8 - nahmii deposit registered');

            spinner.start('8/8 - Confirming nahmii deposit');
            const completeReceipt = await provider.getTransactionConfirmation(pendingCompleteTx.hash, timeout);
            spinner.succeed(`8/8 - nahmii deposit of ${niiBalance} NII confirmed`);

            console.error('Please allow a few minutes for the nahmii balance to be updated!');

            const output = [releaseReceipt, approveReceipt, completeReceipt].map(reduceReceipt);
            console.log(JSON.stringify(output));
        }
        catch (err) {
            dbg(err);
            spinner.fail();
            throw new Error(`Claiming NII failed: ${err.message}`);
        }
        finally {
            const niiBalance = ethers.utils.formatUnits(await niiContract.balanceOf(config.wallet.address), 15);
            dbg(`Closing on-chain balance: ${niiBalance} NII`);

            provider.stopUpdate();
        }
    }
};

function validateGasPrice(priceGWei) {
    const price = parseInt(priceGWei);
    if (price <= 0)
        throw new Error('Gas price must be a number higher than 0.');
    return price;
}

function validateGasLimit(gas) {
    const gasLimit = parseInt(gas);
    if (gasLimit <= 0)
        throw new Error('Gas limit must be a number higher than 0.');
    return gasLimit;
}

function validatePeriod(period) {
    period = parseInt(period);
    if (period < 1 || period > 120)
        throw new Error('Period must be a number from 1 to 120.');
    return period;
}

function validateTimeout(timeout) {
    timeout = parseInt(timeout);
    if (timeout <= 0)
        throw new Error('Timeout must be a number higher than 0.');
    return timeout;
}

function reduceReceipt(txReceipt) {
    if (!txReceipt)
        return null;

    // TODO: Fix links when on mainnet
    return {
        transactionHash: txReceipt.transactionHash,
        blockNumber: txReceipt.blockNumber,
        gasUsed: ethers.utils.bigNumberify(txReceipt.gasUsed).toString(),
        href: `https://ropsten.etherscan.io/tx/${txReceipt.transactionHash}`
    };
}
