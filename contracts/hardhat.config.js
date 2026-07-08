require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    // `npx hardhat node` expoe http://127.0.0.1:8545 com contas pre-financiadas
    localhost: { url: "http://127.0.0.1:8545" },
  },
};
