'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const expect = chai.expect;
chai.use(sinonChai);

const proxyquire = require('proxyquire').noPreserveCache().noCallThru();

const wallet1 = '0x' + '00'.repeat(19) + '01';
const wallet2 = '0x' + '00'.repeat(19) + '02';
const wallet3 = '0x' + '00'.repeat(19) + '03';

const testPayments = [
    {
        id: '1',
        sender: {
            addr: wallet1
        },
        recipient: {
            addr: wallet2
        }
    },
    {
        id: '2',
        sender: {
            addr: wallet1
        },
        recipient: {
            addr: wallet3
        }
    },
    {
        id: '3',
        sender: {
            addr: wallet2
        },
        recipient: {
            addr: wallet1
        }
    },
    {
        id: '4',
        sender: {
            addr: wallet3
        },
        recipient: {
            addr: wallet2
        }
    },
    {
        id: '5',
        sender: {
            addr: wallet3
        },
        recipient: {
            addr: wallet1
        }
    },
];

const stubbedConfig = {
    wallet: {
        address: wallet1,
        secret: 'expected secret'
    },
    privateKey: sinon.stub()
};

const stubbedProvider = {
    getPendingPayments: sinon.stub()
};

function proxyquireCommand() {
    return proxyquire('./payments', {
        '../../sdk': {
            StriimProvider: function() {
                return stubbedProvider;
            },
            utils: require('../../sdk').utils
        },
        '../../config': stubbedConfig
    });
}

describe('Show Payments command', () => {
    let showPayments;

    beforeEach(() => {
        showPayments = proxyquireCommand().handler;
        sinon.stub(console, 'log');
    });

    afterEach(() => {
        console.log.restore();
        stubbedProvider.getPendingPayments.reset();
    });

    context('API responds with payments', () => {
        beforeEach(() => {
            stubbedProvider.getPendingPayments.resolves(testPayments);
        });

        it('outputs only payments related to my wallet', async () => {
            await showPayments();
            const expectedPayments = [
                testPayments[0],
                testPayments[1],
                testPayments[2],
                testPayments[4]
            ];
            expect(console.log).to.have.been.calledWith(JSON.stringify(expectedPayments));
        });
    });

    context('API responds with something other than an array', () => {
        beforeEach(() => {
            stubbedProvider.getPendingPayments.resolves({});
        });

        it('outputs empty array', async () => {
            await showPayments();
            const expectedPayments = [];
            expect(console.log).to.have.been.calledWith(JSON.stringify(expectedPayments));
        });
    });

    context('API responds with error', () => {
        beforeEach(() => {
            stubbedProvider.getPendingPayments.rejects();
        });

        it('outputs empty array', (done) => {
            showPayments().catch(err => {
                expect(err.message).to.match(/show.*pending.*payments/i);
                done();
            });
        });
    });
});
