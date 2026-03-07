const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CertificateRegistry", function () {
  let registry, admin, issuer, student, employer, other;

  const CERT_ID = "CERT-2025-001";
  const CERT_HASH = ethers.keccak256(ethers.toUtf8Bytes("student_cert_data_hash"));
  const IPFS_HASH = "QmTestIpfsHash123456789";

  beforeEach(async function () {
    [admin, issuer, student, employer, other] = await ethers.getSigners();
    const CertificateRegistry = await ethers.getContractFactory("CertificateRegistry");
    registry = await CertificateRegistry.deploy();
    await registry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set deployer as admin", async function () {
      const adminRole = await registry.DEFAULT_ADMIN_ROLE();
      expect(await registry.hasRole(adminRole, admin.address)).to.be.true;
    });

    it("Should set deployer as issuer", async function () {
      expect(await registry.isIssuer(admin.address)).to.be.true;
    });
  });

  describe("Role Management", function () {
    it("Should allow admin to add issuers", async function () {
      await registry.addIssuer(issuer.address);
      expect(await registry.isIssuer(issuer.address)).to.be.true;
    });

    it("Should prevent non-admin from adding issuers", async function () {
      await expect(
        registry.connect(other).addIssuer(issuer.address)
      ).to.be.reverted;
    });

    it("Should allow admin to remove issuers", async function () {
      await registry.addIssuer(issuer.address);
      await registry.removeIssuer(issuer.address);
      expect(await registry.isIssuer(issuer.address)).to.be.false;
    });
  });

  describe("Certificate Issuance", function () {
    it("Should issue a certificate", async function () {
      await expect(
        registry.issueCertificate(CERT_ID, CERT_HASH, student.address, IPFS_HASH)
      ).to.emit(registry, "CertificateIssued");
    });

    it("Should prevent duplicate certificate IDs", async function () {
      await registry.issueCertificate(CERT_ID, CERT_HASH, student.address, IPFS_HASH);
      const newHash = ethers.keccak256(ethers.toUtf8Bytes("different_data"));
      await expect(
        registry.issueCertificate(CERT_ID, newHash, student.address, IPFS_HASH)
      ).to.be.revertedWith("Certificate ID already exists");
    });

    it("Should prevent duplicate hashes", async function () {
      await registry.issueCertificate(CERT_ID, CERT_HASH, student.address, IPFS_HASH);
      await expect(
        registry.issueCertificate("CERT-002", CERT_HASH, student.address, IPFS_HASH)
      ).to.be.revertedWith("Certificate hash already registered");
    });

    it("Should prevent non-issuers from issuing", async function () {
      await expect(
        registry.connect(other).issueCertificate(CERT_ID, CERT_HASH, student.address, IPFS_HASH)
      ).to.be.reverted;
    });
  });

  describe("Bulk Issuance", function () {
    it("Should bulk issue 50 certificates", async function () {
      const ids = [];
      const hashes = [];
      const students = [];
      const ipfs = [];

      for (let i = 0; i < 50; i++) {
        ids.push(`CERT-BULK-${i.toString().padStart(3, "0")}`);
        hashes.push(ethers.keccak256(ethers.toUtf8Bytes(`cert_data_${i}`)));
        students.push(student.address);
        ipfs.push(`QmBulkHash${i}`);
      }

      await expect(
        registry.bulkIssueCertificates(ids, hashes, students, ipfs)
      ).to.emit(registry, "BulkCertificatesIssued");

      expect(await registry.getTotalCertificates()).to.equal(50);
    });

    it("Should reject batch larger than 100", async function () {
      const ids = [];
      const hashes = [];
      const students = [];
      const ipfs = [];

      for (let i = 0; i < 101; i++) {
        ids.push(`CERT-${i}`);
        hashes.push(ethers.keccak256(ethers.toUtf8Bytes(`data_${i}`)));
        students.push(student.address);
        ipfs.push(`QmHash${i}`);
      }

      await expect(
        registry.bulkIssueCertificates(ids, hashes, students, ipfs)
      ).to.be.revertedWith("Batch too large, max 100");
    });
  });

  describe("Verification", function () {
    beforeEach(async function () {
      await registry.issueCertificate(CERT_ID, CERT_HASH, student.address, IPFS_HASH);
    });

    it("Should verify a valid certificate", async function () {
      const result = await registry.verifyCertificate(CERT_ID);
      expect(result.status).to.equal(1); // Valid
      expect(result.certificateHash).to.equal(CERT_HASH);
      expect(result.issuerAddress).to.equal(admin.address);
    });

    it("Should return NotFound for non-existent certificate", async function () {
      const result = await registry.verifyCertificate("NON-EXISTENT");
      expect(result.status).to.equal(0); // NotFound
    });

    it("Should verify hash correctly", async function () {
      expect(await registry.verifyHash(CERT_ID, CERT_HASH)).to.be.true;
      const wrongHash = ethers.keccak256(ethers.toUtf8Bytes("wrong_data"));
      expect(await registry.verifyHash(CERT_ID, wrongHash)).to.be.false;
    });
  });

  describe("Revocation", function () {
    beforeEach(async function () {
      await registry.issueCertificate(CERT_ID, CERT_HASH, student.address, IPFS_HASH);
    });

    it("Should revoke a certificate", async function () {
      await expect(
        registry.revokeCertificate(CERT_ID, "Academic misconduct")
      ).to.emit(registry, "CertificateRevoked");

      const result = await registry.verifyCertificate(CERT_ID);
      expect(result.status).to.equal(2); // Revoked
    });

    it("Should prevent double revocation", async function () {
      await registry.revokeCertificate(CERT_ID, "Reason 1");
      await expect(
        registry.revokeCertificate(CERT_ID, "Reason 2")
      ).to.be.revertedWith("Certificate already revoked");
    });

    it("Should prevent unauthorized revocation", async function () {
      await registry.addIssuer(issuer.address);
      await expect(
        registry.connect(issuer).revokeCertificate(CERT_ID, "Not my cert")
      ).to.be.revertedWith("Only the original issuer or admin can revoke");
    });

    it("Should require revocation reason", async function () {
      await expect(
        registry.revokeCertificate(CERT_ID, "")
      ).to.be.revertedWith("Revocation reason required");
    });
  });

  describe("Certificate Details", function () {
    beforeEach(async function () {
      await registry.issueCertificate(CERT_ID, CERT_HASH, student.address, IPFS_HASH);
    });

    it("Should return full certificate details", async function () {
      const details = await registry.getCertificateDetails(CERT_ID);
      expect(details.certificateHash).to.equal(CERT_HASH);
      expect(details.issuerAddress).to.equal(admin.address);
      expect(details.status).to.equal(1); // Valid
      expect(details.ipfsHash).to.equal(IPFS_HASH);
    });

    it("Should return student certificates", async function () {
      const certs = await registry.getStudentCertificates(student.address);
      expect(certs).to.include(CERT_ID);
    });

    it("Should return issuer certificates", async function () {
      const certs = await registry.getIssuerCertificates(admin.address);
      expect(certs).to.include(CERT_ID);
    });
  });
});
