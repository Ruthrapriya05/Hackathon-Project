const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
const certificateRoutes = require("./routes/certificates");
const authRoutes = require("./routes/auth");
const ipfsRoutes = require("./routes/ipfs");
const verificationRoutes = require("./routes/verification");

app.use("/api/certificates", certificateRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/ipfs", ipfsRoutes);
app.use("/api/verify", verificationRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    network: process.env.NETWORK || "amoy",
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 CertChain Backend running on port ${PORT}`);
  console.log(`📋 API Health: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Network: ${process.env.NETWORK || "amoy"}\n`);
});

module.exports = app;
