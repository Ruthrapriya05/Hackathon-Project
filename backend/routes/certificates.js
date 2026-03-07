const express = require("express");
const crypto = require("crypto");
const multer = require("multer");
const csv = require("csv-parser");
const { Readable } = require("stream");
const { v4: uuidv4 } = require("uuid");
const { authMiddleware, adminOnly } = require("../middleware/auth");
const { getContract, getReadOnlyContract, ethers } = require("../config/blockchain");
const { uploadToIPFS, bulkUploadToIPFS } = require("../config/ipfs");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// In-memory certificate metadata store (use DB in production)
const certificateStore = {};

/**
 * Generate SHA256 hash of certificate data
 */
const generateHash = (data) => {
  const jsonString = JSON.stringify(data, Object.keys(data).sort());
  return "0x" + crypto.createHash("sha256").update(jsonString).digest("hex");
};

/**
 * POST /api/certificates/issue
 * Issue a single certificate
 */
router.post("/issue", authMiddleware, adminOnly, async (req, res) => {
  try {
    const {
      studentName,
      studentEmail,
      studentAddress,
      courseName,
      degreeType,
      university,
      graduationDate,
      grade,
    } = req.body;

    // Validate required fields
    if (!studentName || !studentAddress || !courseName || !university) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: studentName, studentAddress, courseName, university",
      });
    }

    // Generate unique certificate ID
    const certificateId = `CERT-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;

    // Prepare certificate data
    const certificateData = {
      certificateId,
      studentName,
      studentEmail: studentEmail || "",
      courseName,
      degreeType: degreeType || "Bachelor's Degree",
      university: university || req.user.university,
      graduationDate: graduationDate || new Date().toISOString().split("T")[0],
      grade: grade || "N/A",
      issuedBy: req.user.username,
      issuedAt: new Date().toISOString(),
    };

    // Generate SHA256 hash
    const certificateHash = generateHash(certificateData);

    // Upload to IPFS
    const ipfsHash = await uploadToIPFS(certificateData);

    // Issue on blockchain
    const contract = getContract();
    const tx = await contract.issueCertificate(
      certificateId,
      certificateHash,
      studentAddress,
      ipfsHash
    );
    const receipt = await tx.wait();

    // Store metadata locally
    certificateStore[certificateId] = {
      ...certificateData,
      certificateHash,
      ipfsHash,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      studentAddress,
    };

    res.json({
      success: true,
      message: "Certificate issued successfully!",
      data: {
        certificateId,
        certificateHash,
        ipfsHash,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      },
    });
  } catch (error) {
    console.error("Issue error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/certificates/bulk-issue
 * Bulk issue certificates from CSV upload
 */
router.post("/bulk-issue", authMiddleware, adminOnly, upload.single("csvFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "CSV file required",
      });
    }

    // Parse CSV
    const records = [];
    const stream = Readable.from(req.file.buffer.toString());

    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on("data", (row) => records.push(row))
        .on("end", resolve)
        .on("error", reject);
    });

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message: "CSV file is empty",
      });
    }

    if (records.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Maximum 100 certificates per batch",
      });
    }

    // Prepare batch data
    const certificateIds = [];
    const certificateHashes = [];
    const studentAddresses = [];
    const ipfsHashes = [];
    const certificatesData = [];

    for (const record of records) {
      const certId = `CERT-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
      
      const certData = {
        certificateId: certId,
        studentName: record.studentName || record.student_name || record.name,
        studentEmail: record.studentEmail || record.student_email || record.email || "",
        courseName: record.courseName || record.course_name || record.course,
        degreeType: record.degreeType || record.degree_type || record.degree || "Bachelor's Degree",
        university: record.university || req.user.university,
        graduationDate: record.graduationDate || record.graduation_date || new Date().toISOString().split("T")[0],
        grade: record.grade || "N/A",
        issuedBy: req.user.username,
        issuedAt: new Date().toISOString(),
      };

      const hash = generateHash(certData);

      certificateIds.push(certId);
      certificateHashes.push(hash);
      studentAddresses.push(record.studentAddress || record.student_address || record.wallet_address);
      certificatesData.push(certData);
    }

    // Bulk upload to IPFS
    console.log(`📌 Uploading ${certificatesData.length} certificates to IPFS...`);
    const cids = await bulkUploadToIPFS(certificatesData);

    // Bulk issue on blockchain
    console.log(`⛓️  Issuing ${certificateIds.length} certificates on-chain...`);
    const contract = getContract();
    const tx = await contract.bulkIssueCertificates(
      certificateIds,
      certificateHashes,
      studentAddresses,
      cids
    );
    const receipt = await tx.wait();

    // Store locally
    for (let i = 0; i < certificateIds.length; i++) {
      certificateStore[certificateIds[i]] = {
        ...certificatesData[i],
        certificateHash: certificateHashes[i],
        ipfsHash: cids[i],
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        studentAddress: studentAddresses[i],
      };
    }

    res.json({
      success: true,
      message: `Successfully issued ${certificateIds.length} certificates!`,
      data: {
        count: certificateIds.length,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        certificates: certificateIds.map((id, i) => ({
          certificateId: id,
          studentName: certificatesData[i].studentName,
          ipfsHash: cids[i],
        })),
      },
    });
  } catch (error) {
    console.error("Bulk issue error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/certificates/revoke
 * Revoke a certificate
 */
router.post("/revoke", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { certificateId, reason } = req.body;

    if (!certificateId || !reason) {
      return res.status(400).json({
        success: false,
        message: "certificateId and reason are required",
      });
    }

    const contract = getContract();
    const tx = await contract.revokeCertificate(certificateId, reason);
    const receipt = await tx.wait();

    // Update local store
    if (certificateStore[certificateId]) {
      certificateStore[certificateId].status = "Revoked";
      certificateStore[certificateId].revocationReason = reason;
      certificateStore[certificateId].revocationTimestamp = new Date().toISOString();
    }

    res.json({
      success: true,
      message: "Certificate revoked successfully",
      data: {
        certificateId,
        reason,
        txHash: receipt.hash,
      },
    });
  } catch (error) {
    console.error("Revoke error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/certificates/:id
 * Get certificate details
 */
router.get("/:id", async (req, res) => {
  try {
    const contract = getReadOnlyContract();
    const details = await contract.getCertificateDetails(req.params.id);

    const statusMap = { 0: "NotFound", 1: "Valid", 2: "Revoked" };

    res.json({
      success: true,
      data: {
        certificateId: req.params.id,
        certificateHash: details.certificateHash,
        issuerAddress: details.issuerAddress,
        issuedTimestamp: Number(details.issuedTimestamp),
        issuedDate: new Date(Number(details.issuedTimestamp) * 1000).toISOString(),
        status: statusMap[Number(details.status)] || "Unknown",
        ipfsHash: details.ipfsHash,
        revocationReason: details.revocationReason,
        revocationTimestamp: Number(details.revocationTimestamp),
        localData: certificateStore[req.params.id] || null,
      },
    });
  } catch (error) {
    console.error("Get certificate error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/certificates/issuer/:address
 * Get certificates by issuer
 */
router.get("/issuer/:address", authMiddleware, async (req, res) => {
  try {
    const contract = getReadOnlyContract();
    const certIds = await contract.getIssuerCertificates(req.params.address);

    const certificates = [];
    for (const id of certIds) {
      if (certificateStore[id]) {
        certificates.push(certificateStore[id]);
      }
    }

    res.json({
      success: true,
      data: {
        count: certIds.length,
        certificateIds: certIds,
        certificates,
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
 * GET /api/certificates/student/:address
 * Get certificates by student
 */
router.get("/student/:address", async (req, res) => {
  try {
    const contract = getReadOnlyContract();
    const certIds = await contract.getStudentCertificates(req.params.address);

    const certificates = [];
    for (const id of certIds) {
      const details = await contract.getCertificateDetails(id);
      const statusMap = { 0: "NotFound", 1: "Valid", 2: "Revoked" };
      certificates.push({
        certificateId: id,
        certificateHash: details.certificateHash,
        issuerAddress: details.issuerAddress,
        issuedDate: new Date(Number(details.issuedTimestamp) * 1000).toISOString(),
        status: statusMap[Number(details.status)] || "Unknown",
        ipfsHash: details.ipfsHash,
        localData: certificateStore[id] || null,
      });
    }

    res.json({
      success: true,
      data: {
        studentAddress: req.params.address,
        count: certIds.length,
        certificates,
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
 * GET /api/certificates/stats/overview
 * Get issuer stats
 */
router.get("/stats/overview", authMiddleware, async (req, res) => {
  try {
    const contract = getReadOnlyContract();
    const total = await contract.getTotalCertificates();

    const allCerts = Object.values(certificateStore);
    const valid = allCerts.filter((c) => c.status !== "Revoked").length;
    const revoked = allCerts.filter((c) => c.status === "Revoked").length;

    res.json({
      success: true,
      data: {
        totalOnChain: Number(total),
        totalLocal: allCerts.length,
        valid,
        revoked,
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
