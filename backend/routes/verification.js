const express = require("express");
const QRCode = require("qrcode");
const { getReadOnlyContract } = require("../config/blockchain");
const { fetchFromIPFS } = require("../config/ipfs");

const router = express.Router();

/**
 * GET /api/verify/:certificateId
 * Verify a certificate by ID - public endpoint
 */
router.get("/:certificateId", async (req, res) => {
  try {
    const { certificateId } = req.params;
    const contract = getReadOnlyContract();

    // Get on-chain data
    const result = await contract.verifyCertificate(certificateId);
    const statusMap = { 0: "NotFound", 1: "Valid", 2: "Revoked" };
    const status = statusMap[Number(result.status)] || "Unknown";

    if (status === "NotFound") {
      return res.json({
        success: true,
        data: {
          certificateId,
          status: "NotFound",
          message: "Certificate not found on the blockchain",
        },
      });
    }

    // Get full details
    const details = await contract.getCertificateDetails(certificateId);

    // Try to fetch IPFS data
    let ipfsData = null;
    try {
      if (details.ipfsHash) {
        ipfsData = await fetchFromIPFS(details.ipfsHash);
      }
    } catch (e) {
      console.warn("Could not fetch IPFS data:", e.message);
    }

    res.json({
      success: true,
      data: {
        certificateId,
        status,
        certificateHash: details.certificateHash,
        issuerAddress: details.issuerAddress,
        issuedTimestamp: Number(details.issuedTimestamp),
        issuedDate: new Date(Number(details.issuedTimestamp) * 1000).toISOString(),
        ipfsHash: details.ipfsHash,
        revocationReason: details.revocationReason || null,
        revocationTimestamp: Number(details.revocationTimestamp) || null,
        certificateData: ipfsData,
      },
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/verify/:certificateId/qr
 * Generate QR code for certificate verification
 */
router.get("/:certificateId/qr", async (req, res) => {
  try {
    const { certificateId } = req.params;
    const baseUrl = process.env.VERIFICATION_BASE_URL || "http://localhost:5173/verify";
    const verificationUrl = `${baseUrl}/${certificateId}`;

    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: "#1a1a2e",
        light: "#ffffff",
      },
    });

    res.json({
      success: true,
      data: {
        certificateId,
        verificationUrl,
        qrCode: qrDataUrl,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/verify/hash
 * Verify certificate by comparing hash
 */
router.post("/hash", async (req, res) => {
  try {
    const { certificateId, hash } = req.body;

    if (!certificateId || !hash) {
      return res.status(400).json({
        success: false,
        message: "certificateId and hash are required",
      });
    }

    const contract = getReadOnlyContract();
    const isValid = await contract.verifyHash(certificateId, hash);

    res.json({
      success: true,
      data: {
        certificateId,
        hashMatch: isValid,
        message: isValid
          ? "Certificate hash matches on-chain record"
          : "Hash does not match on-chain record",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
