'use strict';

const nahmii = require('nahmii-sdk');

module.exports = {
    command: 'balance',
    describe: 'Show my nahmii assets',
    builder: {},
    handler: async (argv) => {
        const config = require('../../config');
        const provider = new nahmii.NahmiiProvider(config.apiRoot, config.appId, config.appSecret);

        try {
            let wallet = new nahmii.Wallet(config.privateKey(config.wallet.secret), provider);
            let balances = await wallet.getNahmiiBalance();
            console.log(JSON.stringify(balances));
        }
        catch (err) {
            if (process.env.LOG_LEVEL === 'debug')
                console.error(err);
            throw new Error('Unable to retrieve the balance.');
        }
    }
};
