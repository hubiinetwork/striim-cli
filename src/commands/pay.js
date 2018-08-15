'use strict';

const striim = require('../sdk');
const prefix0x = striim.utils.prefix0x;
const ethers = require('ethers');

module.exports = {
    command: 'pay <amount> <currency> to <recipient>',
    describe: 'Send <amount> of <currency> from your current wallet to the <recipient>\'s wallet',
    builder: yargs => {
        yargs.coerce('amount', arg => arg); // Coerce it to remain a string
    },
    handler: async (argv) => {
        const config = require('../config');

        try {
            const provider = new striim.StriimProvider(config.apiRoot, config.appId, config.appSecret);
            const currencyDefinition = await getCurrencyBySymbol(provider, argv.currency);

            const amount = ethers.utils.parseUnits(argv.amount, currencyDefinition.decimals).toString();
            const currency = prefix0x(currencyDefinition.currency);
            const recipient = prefix0x(argv.recipient);
            const sender = prefix0x(config.wallet.address);

            const payment = new striim.Payment(provider, amount, currency, sender, recipient);

            const secret = config.wallet.secret;
            const privateKey = config.privateKey(secret);
            payment.sign(privateKey);

            const response = await payment.register();

            console.debug(JSON.stringify(response));
        }
        catch (err) {
            if (process.env.LOG_LEVEL === 'debug')
                console.error(err);
            throw new Error(`Payment failed: ${err.message}`);
        }
    }
};

async function getCurrencyBySymbol(provider, symbol) {
    if (symbol.toUpperCase() === 'ETH') {
        return {
            currency: prefix0x('00'.repeat(20)),
            decimals: 18,
            symbol: 'ETH'
        };
    }

    const tokens = await provider.getSupportedTokens();
    return tokens.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
}
