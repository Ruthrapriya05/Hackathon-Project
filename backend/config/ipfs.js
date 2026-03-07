const { PinataSDK } = require("pinata-web3");
const dotenv = require("dotenv");

dotenv.config();

let pinata = null;

const getPinata = () => {
  if (!pinata) {
    if (!process.env.PINATA_JWT) {
      throw new Error("PINATA_JWT not set in environment");
    }
    pinata = new PinataSDK({
      pinataJwt: process.env.PINATA_JWT,
      pinataGateway: process.env.PINATA_GATEWAY || "gateway.pinata.cloud",
    });
  }
  return pinata;
};

/**
 * Upload certificate data to IPFS via Pinata
 * @param {Object} certificateData Certificate metadata
 * @returns {string} IPFS CID
 */
const uploadToIPFS = async (certificateData) => {
  try {
    const pinataInstance = getPinata();
    const result = await pinataInstance.upload.json(certificateData);
    console.log("📌 Uploaded to IPFS:", result.IpfsCid);
    return result.IpfsCid;
  } catch (error) {
    console.error("IPFS upload error:", error.message);
    throw new Error(`Failed to upload to IPFS: ${error.message}`);
  }
};

/**
 * Fetch certificate data from IPFS
 * @param {string} cid IPFS CID
 * @returns {Object} Certificate data
 */
const fetchFromIPFS = async (cid) => {
  try {
    const pinataInstance = getPinata();
    const gateway = process.env.PINATA_GATEWAY || "gateway.pinata.cloud";
    const response = await fetch(`https://${gateway}/ipfs/${cid}`);
    if (!response.ok) throw new Error("Failed to fetch from IPFS");
    return await response.json();
  } catch (error) {
    console.error("IPFS fetch error:", error.message);
    throw new Error(`Failed to fetch from IPFS: ${error.message}`);
  }
};

/**
 * Bulk upload certificates to IPFS
 * @param {Array} certificatesData Array of certificate data objects
 * @returns {Array} Array of IPFS CIDs
 */
const bulkUploadToIPFS = async (certificatesData) => {
  const cids = [];
  for (const certData of certificatesData) {
    const cid = await uploadToIPFS(certData);
    cids.push(cid);
  }
  return cids;
};

module.exports = { uploadToIPFS, fetchFromIPFS, bulkUploadToIPFS, getPinata };
