require("dotenv").config();
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");

const { PRIVATE_KEY, RINKEBY_URL, ETHEREUM_URL, POLYGON_URL } = process.env;

module.exports = {
  solidity: {
    compilers: [{ version: "0.7.6" }, { version: "0.8.14" }],
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
      accounts: [
        `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`,
      ],
    },
    rinkeby: {
      url: `${RINKEBY_URL}`,
      accounts: [`0x${PRIVATE_KEY}`],
    },
    ethereum: {
      url: `${ETHEREUM_URL}`,
      accounts: [`0x${PRIVATE_KEY}`],
    },
    polygon: {
      url: `${POLYGON_URL}`,
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
