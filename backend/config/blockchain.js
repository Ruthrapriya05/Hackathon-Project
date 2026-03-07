const { ethers } = require("ethers");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();

// Load ABI from compiled artifacts
let contractABI;
try {
  const artifactPath = path.join(
    __dirname,
    "../../smart-contracts/artifacts/contracts/CertificateRegistry.sol/CertificateRegistry.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  contractABI = artifact.abi;
} catch (err) {
  console.warn("⚠️  Contract ABI not found. Compile the smart contract first.");
  contractABI = [];
}

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_AMOY_RPC);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const getContract = () => {
  if (!process.env.CONTRACT_ADDRESS) {
    throw new Error("CONTRACT_ADDRESS not set in environment");
  }
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, wallet);
};

const getReadOnlyContract = () => {
  if (!process.env.CONTRACT_ADDRESS) {
    throw new Error("CONTRACT_ADDRESS not set in environment");
  }
  return new ethers.Contract(process.env.CONTRACT_ADDRESS, contractABI, provider);
};

module.exports = { provider, wallet, getContract, getReadOnlyContract, ethers };
