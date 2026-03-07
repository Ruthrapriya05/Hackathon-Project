const express = require("express");
const { uploadToIPFS, fetchFromIPFS } = require("../config/ipfs");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

/**
 * POST /api/ipfs/upload
 * Upload JSON data to IPFS
 */
router.post("/upload", authMiddleware, async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({
        success: false,
        message: "Data is required",
      });
    }

    const cid = await uploadToIPFS(data);
    res.json({
      success: true,
      data: {
        cid,
        url: `https://${process.env.PINATA_GATEWAY || "gateway.pinata.cloud"}/ipfs/${cid}`,
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
 * GET /api/ipfs/:cid
 * Fetch data from IPFS
 */
router.get("/:cid", async (req, res) => {
  try {
    const data = await fetchFromIPFS(req.params.cid);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
