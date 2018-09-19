# NAHMII BY HUBII CLI

## About the CLI

This is a command line interface that aims to make usage of the _hubii nahmii_ APIs as
easy and convenient as possible, while maintaining the flexibility of the
platform.

## About nahmii

_nahmii_ is _hubii_'s scaling solution for the Ethereum block chain. It is a
hybrid centralized/decentralized solution that enables instant
(micro-) payments, trading and trustless settlements.

## About hubii

See www.hubii.com for more information.

## Prerequisites

* To use this software you need a modern version of **NodeJS and NPM**.
  We recommend having the current LTS version (v8.x) installed, or
  later, and updating NPM to the latest available version. You will also need
  Python and a C++ compiler installed. For a Windows 10 guide, see here:
  https://blog.risingstack.com/node-js-windows-10-tutorial/
* You will also need an **API key** for access to _hubii_'s APIs.
* An Ethereum wallet stored as an **UTC/keystore file**, and is's **passphrase**.

## Installation

To install and make the command part of your path:

    npm install -g nahmii-cli

## Configuration

To use the _nahmii_ CLI tool you need to first create a configuration in your
home folder as `.nahmii/config.yaml`

Use the `init` command to create a new config file:

    nahmii init

The `config.yaml` file is a YAML file where you will need to specify the
following properties:

- apiRoot - The root domain for _hubii_'s APIs.
- appId - The application ID created in _hubii_'s identity server.
- appSecret - The matching secret for the application ID.
- wallet:
    - address - The address of your wallet.
    - secret - The pass-phrase for your wallet's UTC file.

The CLI tool will give a warning in the shell if the configuration file is
accessible by anyone besides the owner. To keep your wallet and API access
secure, make sure **only you** have access to the config file.

Example file:

```yaml
apiRoot: api2.dev.hubii.net
appId: 123456789012345678901234
appSecret: ********************
wallet:
    address: 1234567890123456789012345678901234567890
    secret: ********************
```

The UTC file is expected to be found in `~/.nahmii/keystore`.

## Usage

To show the built-in help:

    nahmii --help

or to show help for a specific sub-command:

    nahmii <command> --help

### Initialize configuration

This will create a config folder and file if it doesnt already exist:

    nahmii init

To recreate and discard previous settings add the `--force` flag:

    nahmii init --force

### Check configuration

    nahmii configuration

### Deposit funds

Deposit on-chain funds to be available in _hubii nahmii_:

    nahmii deposit 1 ETH

    nahmii deposit 1 TT1

Results are printed as JSON. It is recommended to pipe the result
through `jq` to get a pretty output in the shell.

### Show balance

Shows your balance in _hubii nahmii_:

    nahmii show balance

Results are printed as JSON. It is recommended to pipe the result
through `jq` to get a pretty output in the shell.

### Make a payment

    nahmii pay 100 TT1 to 0a24740dcb4ba8fb8469ef4cfe22eeedcf069076

Results are printed as JSON. It is recommended to pipe the result
through `jq` to get a pretty output in the shell.

### Show pending payments

    nahmii show payments

Results are printed as JSON. It is recommended to pipe the result
through `jq` to get a pretty output in the shell.

### Show executed payments

    nahmii show receipts

Results are printed as JSON. It is recommended to pipe the result
through `jq` to get a pretty output in the shell.

### Get a list of supported currencies

    nahmii show tokens

Results are printed as JSON. It is recommended to pipe the result
through `jq` to get a pretty output in the shell.
