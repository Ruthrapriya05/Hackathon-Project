const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Deploying CertificateRegistry to", hre.network.name, "...\n");

  const CertificateRegistry = await hre.ethers.getContractFactory("CertificateRegistry");
  const registry = await CertificateRegistry.deploy();

  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("✅ CertificateRegistry deployed to:", address);
  console.log("📋 Network:", hre.network.name);
  console.log("⛓️  Chain ID:", (await hre.ethers.provider.getNetwork()).chainId.toString());

  if (hre.network.name === "amoy") {
    console.log("\n⏳ Waiting for 5 block confirmations...");
    const deployTx = registry.deploymentTransaction();
    await deployTx.wait(5);
    
    console.log("🔍 Verifying contract on PolygonScan...");
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [],
      });
      console.log("✅ Contract verified on PolygonScan!");
    } catch (error) {
      console.log("⚠️  Verification failed:", error.message);
    }
  }

  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: address,
    deployer: (await hre.ethers.getSigners())[0].address,
    timestamp: new Date().toISOString(),
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
  };

  const deployDir = "./deployments";
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }

  fs.writeFileSync(
    `${deployDir}/${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n📁 Deployment info saved to", `${deployDir}/${hre.network.name}.json`);
  console.log("\n🎉 Deployment complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
