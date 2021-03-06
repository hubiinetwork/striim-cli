'use strict';

const dbg = require('../../dbg');
const nahmii = require('nahmii-sdk');

function isSameAddress(a, b) {
    a = nahmii.utils.strip0x(a).toLowerCase();
    b = nahmii.utils.strip0x(b).toLowerCase();
    return a === b;
}

module.exports = {
    command: 'payments',
    describe: 'Show my pending payments',
    builder: {},
    handler: async () => {
        const config = require('../../config');
        const provider = await nahmii.NahmiiProvider.from(config.apiRoot, config.appId, config.appSecret);

        const isMyPayment = (payment) => {
            return isSameAddress(payment.sender.wallet, config.wallet.address)
                || isSameAddress(payment.recipient.wallet, config.wallet.address);
        };

        try {
            let payments = await provider.getPendingPayments();
            if (!payments.length)
                payments = [];
            payments = payments.filter(isMyPayment);
            console.log(JSON.stringify(payments));
        }
        catch (err) {
            dbg(err);
            throw new Error('Unable to show pending payments.');
        }
        finally {
            provider.stopUpdate();
        }
    }
};
