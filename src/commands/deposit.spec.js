'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();
const ethers = require('ethers');

const stubbedWallet = {
    depositEth: sinon.stub(),
    approveTokenDeposit: sinon.stub(),
    completeTokenDeposit: sinon.stub()
};

const stubbedConfig = {
    wallet: {
        secret: 'secret much'
    },
    privateKey: sinon.stub()
};

const stubbedProviderConstructor = {
    from: sinon.stub()
};

const stubbedProvider = {
    getBlockNumber: sinon.stub(),
    getApiAccessToken: sinon.stub(),
    stopUpdate: sinon.stub(),
    getTransactionConfirmation: sinon.stub()
};

const stubbedOra = {
    start: sinon.stub(),
    succeed: sinon.stub(),
    fail: sinon.stub()
};
stubbedOra.start.returns(stubbedOra);

function proxyquireCommand() {
    return proxyquire('./deposit', {
        'nahmii-sdk': {
            NahmiiProvider: stubbedProviderConstructor,
            Wallet: function() {
                return stubbedWallet;
            }
        },
        '../config': stubbedConfig,
        'ora': function() {
            return stubbedOra;
        }
    });
}

describe('Deposit command', () => {
    let depositCmd;
    const txReceipt1 = {
        transactionHash: 'tx hash 1',
        blockNumber: 2,
        gasUsed: ethers.utils.bigNumberify(123)
    };
    const txReceipt2 = {
        transactionHash: 'tx hash 2',
        blockNumber: 3,
        gasUsed: ethers.utils.bigNumberify(1234)
    };

    beforeEach(() => {
        stubbedConfig.privateKey
            .withArgs(stubbedConfig.wallet.secret)
            .returns('privatekey');
        stubbedProviderConstructor.from
            .withArgs(stubbedConfig.apiRoot, stubbedConfig.appId, stubbedConfig.appSecret)
            .returns(stubbedProvider);
        stubbedProvider.getTransactionConfirmation
            .withArgs(txReceipt1.transactionHash)
            .returns(txReceipt1);
        stubbedProvider.getTransactionConfirmation
            .withArgs(txReceipt2.transactionHash)
            .returns(txReceipt2);
        stubbedProvider.getBlockNumber.resolves(1);
        stubbedProvider.getApiAccessToken.resolves('nahmii JWT');
        sinon.stub(console, 'log');
        depositCmd = proxyquireCommand();
        stubbedWallet.depositEth.resolves({hash: txReceipt1.transactionHash});
        stubbedWallet.approveTokenDeposit.resolves({hash: txReceipt1.transactionHash});
        stubbedWallet.completeTokenDeposit.resolves({hash: txReceipt2.transactionHash});
    });

    afterEach(() => {
        stubbedWallet.depositEth.reset();
        stubbedWallet.approveTokenDeposit.reset();
        stubbedWallet.completeTokenDeposit.reset();
        stubbedConfig.privateKey.reset();
        stubbedProviderConstructor.from.reset();
        stubbedProvider.getBlockNumber.reset();
        stubbedProvider.getApiAccessToken.reset();
        stubbedProvider.stopUpdate.reset();
        stubbedProvider.getTransactionConfirmation.reset();
        console.log.restore();
    });

    context('deposit 1.1 ETH', () => {
        beforeEach(() => {
            return depositCmd.handler.call(undefined, {
                amount: '1.1',
                currency: 'ETH',
                gas: 2,
                price: 2
            });
        });

        it('tells wallet to deposit 1.1 ETH', () => {
            expect(stubbedWallet.depositEth).to.have.been.calledWith('1.1', {gasLimit: 2, gasPrice: ethers.utils.bigNumberify(2000000000)});
        });

        it('outputs an single receipt to stdout', () => {
            expect(console.log).to.have.been.calledWith(JSON.stringify([
                {
                    transactionHash: txReceipt1.transactionHash,
                    blockNumber: txReceipt1.blockNumber,
                    gasUsed: '123',
                    href: `https://ropsten.etherscan.io/tx/${txReceipt1.transactionHash}`
                }
            ]));
        });

        it('stops token refresh', () => {
            expect(stubbedProvider.stopUpdate).to.have.been.called;
        });
    });

    context('deposit 0.07 TT1', () => {
        beforeEach(() => {
            return depositCmd.handler.call(undefined, {
                amount: '0.07',
                currency: 'TT1',
                gas: 2
            });
        });

        it('tells wallet to approve 0.07 TT1 transfer', () => {
            expect(stubbedWallet.approveTokenDeposit).to.have.been.calledWith('0.07', 'TT1', {gasLimit: 2, gasPrice: null});
        });

        it('tells wallet to complete 0.07 TT1 transfer', () => {
            expect(stubbedWallet.completeTokenDeposit).to.have.been.calledWith('0.07', 'TT1', {gasLimit: 2, gasPrice: null});
        });

        it('outputs correct tx receipts to stdout', () => {
            expect(console.log).to.have.been.calledWith(JSON.stringify([
                {
                    transactionHash: txReceipt1.transactionHash,
                    blockNumber: txReceipt1.blockNumber,
                    gasUsed: '123',
                    href: `https://ropsten.etherscan.io/tx/${txReceipt1.transactionHash}`
                },
                {
                    transactionHash: txReceipt2.transactionHash,
                    blockNumber: txReceipt2.blockNumber,
                    gasUsed: '1234',
                    href: `https://ropsten.etherscan.io/tx/${txReceipt2.transactionHash}`
                }
            ]));
        });

        it('stops token refresh', () => {
            expect(stubbedProvider.stopUpdate).to.have.been.called;
        });
    });

    context('deposit foo ETH', () => {
        it('yields an error', (done) => {
            depositCmd.handler
                .call(undefined, {
                    amount: 'foo',
                    currency: 'ETH',
                    gas: 2
                })
                .catch(err => {
                    expect(err.message).to.match(/amount.*number/i);
                    done();
                });
        });

        it('provider was not instantiated', (done) => {
            depositCmd.handler
                .call(undefined, {
                    amount: 'foo',
                    currency: 'ETH',
                    gas: 2
                })
                .catch(() => {
                    expect(stubbedProviderConstructor.from).to.not.have.been.called;
                    done();
                });
        });
    });

    context('deposit 0 ETH', () => {
        it('yields an error', (done) => {
            depositCmd.handler
                .call(undefined, {
                    amount: '0',
                    currency: 'ETH',
                    gas: 2
                })
                .catch(err => {
                    expect(err.message).to.match(/amount.*zero/i);
                    done();
                });
        });

        it('provider was not instantiated', (done) => {
            depositCmd.handler
                .call(undefined, {
                    amount: '0',
                    currency: 'ETH',
                    gas: 2
                })
                .catch(() => {
                    expect(stubbedProviderConstructor.from).to.not.have.been.called;
                    done();
                });
        });

    });

    [
        stubbedProvider.getTransactionConfirmation,
        stubbedWallet.depositEth
    ].forEach((depositFunc)=> {
        context('wallet fails to deposit ETH', () => {
            let error;

            beforeEach((done) => {
                depositFunc.reset();
                depositFunc.rejects(new Error('transaction failed'));
                depositCmd.handler
                    .call(undefined, {
                        amount: '1.2',
                        currency: 'ETH',
                        gas: 2
                    })
                    .catch(err => {
                        error = err;
                        done();
                    });
            });

            it('yields an error', () => {
                expect(error.message).to.match(/transaction failed/);
            });

            it('stops token refresh', () => {
                expect(stubbedProvider.stopUpdate).to.have.been.called;
            });
        });
    });

    [
        stubbedProvider.getTransactionConfirmation,
        stubbedWallet.approveTokenDeposit,
        stubbedWallet.completeTokenDeposit
    ].forEach((tokenDepositFunc)=> {
        context('wallet fails to deposit a token', () => {
            let error;

            beforeEach((done) => {
                tokenDepositFunc.reset();
                tokenDepositFunc.rejects(new Error('transaction failed'));
                depositCmd.handler
                    .call(undefined, {
                        amount: '1.2',
                        currency: 'TT1',
                        gas: 2
                    })
                    .catch(err => {
                        error = err;
                        done();
                    });
            });

            it('yields an error', () => {
                expect(error.message).to.match(/transaction failed/);
            });

            it('stops token refresh', () => {
                expect(stubbedProvider.stopUpdate).to.have.been.called;
            });
        });
    });
});
