require("dotenv").config();
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");

const { PRIVATE_KEY } = process.env;

module.exports = {
  solidity: {
    version: "0.7.6",
    version: "0.8.7",
    version: "0.8.12",
    version: "0.8.13",
    version: "0.8.14",
    settings: {
      optimizer: {
        enabled: false,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545/",
      accounts: [`0x${PRIVATE_KEY}`],
    },
    rinkeby: {
      url: /* "https://eth-rinkeby.alchemyapi.io/v2/LsdjIhhDskpuzoIgg78Rs7BI3mzbdIZJ", */ "https://rinkeby.infura.io/v3/03ce6aff8f9b46b8bb3ebf13b2900c71",
      accounts: [`0x${PRIVATE_KEY}`],
    },
    ethereum: {
      url: "https://eth-mainnet.alchemyapi.io/v2/GQuvG_4t-tC23bv60y0LCF7tS9Zj3eq-",
      accounts: [`0x${PRIVATE_KEY}`],
    },
    polygon: {
      url: "https://speedy-nodes-nyc.moralis.io/efad5f42b02dc2f894f286f8/polygon/mumbai",
      accounts: [`0x${PRIVATE_KEY}`],
    },
    /*   mumbai: {
      url: process.env.MUMBAI_URL,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    }, */
  },
  gasReporter: {
    currency: "USD",
    gasPrice: 50,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
