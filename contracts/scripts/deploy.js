const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const registry = await hre.ethers.deployContract("EvidenceRegistry");
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  const out = {
    address,
    deployer: deployer.address,
    network: hre.network.name,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(__dirname, "..", "deployment.json"),
    JSON.stringify(out, null, 2)
  );

  console.log("EvidenceRegistry deployed:");
  console.log("  address :", address);
  console.log("  deployer:", deployer.address);
  console.log("");
  console.log("Copie para backend/.env:");
  console.log("  CONTRACT_ADDRESS=" + address);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
