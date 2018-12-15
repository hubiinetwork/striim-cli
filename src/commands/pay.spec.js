'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

const walletID = '0x1234567890123456789012345678901234567890';
const walletID2 = '0x1234567890123456789012345678901234567891';

const stubbedPayment = sinon.stub();
const stubbedMonetaryAmount = sinon.stub();
const stubbedWallet = sinon.stub();

const testCurrency = {
    hbt: {
        currency: '0x0000000000000000000000000000000000000001',
        symbol: 'HBT',
        decimals: '15'
    },
    wtf: {
        currency: '0x0000000000000000000000000000000000000002',
        symbol: 'WTF',
        decimals: '7'
    }
};

const stubbedConfig = {
    wallet: {
        address: walletID2,
        secret: 'expected secret'
    },
    privateKey: sinon.stub()
};

const stubbedProvider = {
    getSupportedTokens: sinon.stub(),
    stopUpdate: sinon.stub()
};

function proxyquireCommand() {
    return proxyquire('./pay', {
        'nahmii-sdk': {
            NahmiiProvider: function() {
                return stubbedProvider;
            },
            Wallet: stubbedWallet,
            Payment: stubbedPayment,
            MonetaryAmount: stubbedMonetaryAmount,
            utils: require('nahmii-sdk').utils
        },
        '../config': stubbedConfig
    });
}

describe('Pay command', () => {
    const registeredPayment = {expected: 'payment registration'};
    let fakePayment, fakeMoney, fakeWallet;

    beforeEach(() => {
        sinon.stub(console, 'log');
        fakePayment = {
            sign: sinon.stub(),
            register: sinon.stub()
        };
        fakePayment.register.resolves(registeredPayment);
        fakeMoney = {};
        fakeWallet = {};
    });

    afterEach(() => {
        stubbedProvider.getSupportedTokens.reset();
        stubbedProvider.stopUpdate.reset();
        stubbedPayment.reset();
        stubbedConfig.privateKey.reset();
        console.log.restore();
    });

    context(`pay 1000 HBT to ${walletID}`, () => {
        const expectedPrivateKey = 'a private key';

        beforeEach(async () => {
            let cmd = proxyquireCommand().handler;
            stubbedProvider.getSupportedTokens.resolves([testCurrency.hbt, testCurrency.wtf]);
            stubbedWallet
                .withArgs(
                    expectedPrivateKey,
                    stubbedProvider
                )
                .returns(fakeWallet);
            stubbedMonetaryAmount
                .withArgs(
                    (1000 * 10 ** testCurrency.hbt.decimals).toString(),
                    testCurrency.hbt.currency,
                )
                .returns(fakeMoney);
            stubbedPayment
                .withArgs(
                    fakeMoney,
                    walletID2,
                    walletID,
                    fakeWallet,
                )
                .returns(fakePayment);
            stubbedConfig.privateKey
                .withArgs(stubbedConfig.wallet.secret)
                .returns(expectedPrivateKey);
            await cmd({
                amount: '1000',
                currency: 'HBT',
                recipient: walletID
            });
        });

        it('signs the payment given secret from configuration', () => {
            expect(fakePayment.sign).to.have.been.calledWith(expectedPrivateKey);
        });

        it('registers payment with API', () => {
            expect(fakePayment.register).to.have.been.calledOnce;
        });

        it('outputs an single receipt to stdout', () => {
            expect(console.log).to.have.been.calledWith(JSON.stringify(registeredPayment));
        });

        it('stops token refresh', () => {
            expect(stubbedProvider.stopUpdate).to.have.been.called;
        });
    });

    context(`pay 1.1 ETH to ${walletID}`, () => {
        const expectedPrivateKey = 'a private key';

        beforeEach(async () => {
            let cmd = proxyquireCommand().handler;
            stubbedMonetaryAmount
                .withArgs('1100000000000000000', '0x' + '00'.repeat(20),)
                .returns(fakeMoney);

            stubbedWallet
                .withArgs(
                    expectedPrivateKey,
                    stubbedProvider
                )
                .returns(fakeWallet);
            stubbedPayment
                .withArgs(
                    fakeMoney,
                    walletID2,
                    walletID,
                    fakeWallet
                ).returns(fakePayment);
            stubbedConfig.privateKey
                .withArgs(stubbedConfig.wallet.secret)
                .returns(expectedPrivateKey);
            await cmd({
                amount: '1.1',
                currency: 'ETH',
                recipient: walletID
            });
        });

        it('signs the payment given secret from configuration', () => {
            expect(fakePayment.sign).to.have.been.calledWith(expectedPrivateKey);
        });

        it('registers payment with API', () => {
            expect(fakePayment.register).to.have.been.calledOnce;
        });

        it('outputs an single receipt to stdout', () => {
            expect(console.log).to.have.been.calledWith(JSON.stringify(registeredPayment));
        });

        it('stops token refresh', () => {
            expect(stubbedProvider.stopUpdate).to.have.been.called;
        });
    });
});
