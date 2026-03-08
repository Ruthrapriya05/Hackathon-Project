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

const axios = require('axios');

/**
 * Upload certificate data to IPFS via Pinata
 * @param {Object} certificateData Certificate metadata
 * @returns {string} IPFS CID
 */
const uploadToIPFS = async (certificateData) => {
  try {
    if (!process.env.PINATA_JWT) {
      throw new Error("PINATA_JWT not set in environment");
    }

    const payload = JSON.stringify({
      pinataOptions: { cidVersion: 1 },
      pinataMetadata: { name: certificateData.certificateId || "Certificate.json" },
      pinataContent: certificateData
    });

    const config = {
      method: 'post',
      url: 'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${process.env.PINATA_JWT}`
      },
      data: payload
    };

    const res = await axios(config);
    console.log("📌 Uploaded to IPFS:", res.data.IpfsHash);
    return res.data.IpfsHash;
  } catch (error) {
    console.error("IPFS upload error:", error.response?.data?.error || error.message);
    throw new Error(`Failed to upload to IPFS: ${error.response?.data?.error?.details || error.message}`);
  }
};

/**
 * Fetch certificate data from IPFS
 * @param {string} cid IPFS CID
 * @returns {Object} Certificate data
 */
const fetchFromIPFS = async (cid) => {
  try {
    const gateway = process.env.PINATA_GATEWAY || "gateway.pinata.cloud";
    // Check if gateway already includes protocol
    const url = gateway.startsWith('http') ? `${gateway}/ipfs/${cid}` : `https://${gateway}/ipfs/${cid}`;
    
    const response = await axios.get(url, { headers: { Accept: 'application/json' } });
    return response.data;
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
