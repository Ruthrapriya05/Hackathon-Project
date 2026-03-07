// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CertificateRegistry
 * @dev On-chain academic certificate registry with issuance, verification, and revocation
 * @notice Only certificate hashes are stored on-chain for privacy and gas efficiency
 */
contract CertificateRegistry is AccessControl, ReentrancyGuard {
    
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    enum CertificateStatus { NotFound, Valid, Revoked }

    struct Certificate {
        bytes32 certificateHash;      // SHA256 hash of certificate data
        address issuerAddress;        // Address of the issuing university
        uint256 issuedTimestamp;      // When the certificate was issued
        CertificateStatus status;    // Current status
        string ipfsHash;             // IPFS CID for off-chain data
        string revocationReason;     // Reason for revocation (if revoked)
        uint256 revocationTimestamp; // When it was revoked (if revoked)
    }

    // certificateId => Certificate
    mapping(string => Certificate) private certificates;
    
    // Track all certificate IDs for enumeration
    string[] private allCertificateIds;
    
    // issuerAddress => certificateId[]
    mapping(address => string[]) private issuerCertificates;
    
    // studentAddress => certificateId[]
    mapping(address => string[]) private studentCertificates;
    
    // Prevent duplicate hashes
    mapping(bytes32 => bool) private hashExists;

    // Events
    event CertificateIssued(
        string indexed certificateId,
        bytes32 certificateHash,
        address indexed issuer,
        uint256 timestamp,
        string ipfsHash
    );

    event CertificateRevoked(
        string indexed certificateId,
        address indexed revokedBy,
        string reason,
        uint256 timestamp
    );

    event BulkCertificatesIssued(
        address indexed issuer,
        uint256 count,
        uint256 timestamp
    );

    /**
     * @dev Constructor - sets deployer as admin and issuer
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
    }

    /**
     * @dev Add a new issuer (university)
     * @param issuer Address to grant issuer role
     */
    function addIssuer(address issuer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(ISSUER_ROLE, issuer);
    }

    /**
     * @dev Remove an issuer
     * @param issuer Address to revoke issuer role from
     */
    function removeIssuer(address issuer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(ISSUER_ROLE, issuer);
    }

    /**
     * @dev Issue a single certificate
     * @param certificateId Unique certificate identifier
     * @param certificateHash SHA256 hash of the certificate data
     * @param studentAddress Student's wallet address
     * @param ipfsHash IPFS CID where certificate data is stored
     */
    function issueCertificate(
        string calldata certificateId,
        bytes32 certificateHash,
        address studentAddress,
        string calldata ipfsHash
    ) external onlyRole(ISSUER_ROLE) nonReentrant {
        require(bytes(certificateId).length > 0, "Certificate ID cannot be empty");
        require(certificateHash != bytes32(0), "Certificate hash cannot be zero");
        require(studentAddress != address(0), "Student address cannot be zero");
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(certificates[certificateId].issuedTimestamp == 0, "Certificate ID already exists");
        require(!hashExists[certificateHash], "Certificate hash already registered");

        certificates[certificateId] = Certificate({
            certificateHash: certificateHash,
            issuerAddress: msg.sender,
            issuedTimestamp: block.timestamp,
            status: CertificateStatus.Valid,
            ipfsHash: ipfsHash,
            revocationReason: "",
            revocationTimestamp: 0
        });

        hashExists[certificateHash] = true;
        allCertificateIds.push(certificateId);
        issuerCertificates[msg.sender].push(certificateId);
        studentCertificates[studentAddress].push(certificateId);

        emit CertificateIssued(
            certificateId,
            certificateHash,
            msg.sender,
            block.timestamp,
            ipfsHash
        );
    }

    /**
     * @dev Bulk issue certificates (supports 50+ in one transaction)
     * @param certificateIds Array of certificate IDs
     * @param certificateHashes Array of certificate hashes
     * @param studentAddresses Array of student addresses
     * @param ipfsHashes Array of IPFS CIDs
     */
    function bulkIssueCertificates(
        string[] calldata certificateIds,
        bytes32[] calldata certificateHashes,
        address[] calldata studentAddresses,
        string[] calldata ipfsHashes
    ) external onlyRole(ISSUER_ROLE) nonReentrant {
        uint256 count = certificateIds.length;
        require(count > 0, "Empty batch");
        require(
            count == certificateHashes.length &&
            count == studentAddresses.length &&
            count == ipfsHashes.length,
            "Array length mismatch"
        );
        require(count <= 100, "Batch too large, max 100");

        for (uint256 i = 0; i < count; i++) {
            require(bytes(certificateIds[i]).length > 0, "Certificate ID cannot be empty");
            require(certificateHashes[i] != bytes32(0), "Certificate hash cannot be zero");
            require(studentAddresses[i] != address(0), "Student address cannot be zero");
            require(bytes(ipfsHashes[i]).length > 0, "IPFS hash cannot be empty");
            require(certificates[certificateIds[i]].issuedTimestamp == 0, "Duplicate certificate ID");
            require(!hashExists[certificateHashes[i]], "Duplicate certificate hash");

            certificates[certificateIds[i]] = Certificate({
                certificateHash: certificateHashes[i],
                issuerAddress: msg.sender,
                issuedTimestamp: block.timestamp,
                status: CertificateStatus.Valid,
                ipfsHash: ipfsHashes[i],
                revocationReason: "",
                revocationTimestamp: 0
            });

            hashExists[certificateHashes[i]] = true;
            allCertificateIds.push(certificateIds[i]);
            issuerCertificates[msg.sender].push(certificateIds[i]);
            studentCertificates[studentAddresses[i]].push(certificateIds[i]);

            emit CertificateIssued(
                certificateIds[i],
                certificateHashes[i],
                msg.sender,
                block.timestamp,
                ipfsHashes[i]
            );
        }

        emit BulkCertificatesIssued(msg.sender, count, block.timestamp);
    }

    /**
     * @dev Verify a certificate by its ID
     * @param certificateId Certificate ID to verify
     * @return status The certificate status
     * @return certificateHash The stored hash
     * @return issuerAddress The issuer address
     * @return issuedTimestamp When it was issued
     * @return ipfsHash IPFS CID for off-chain data
     */
    function verifyCertificate(string calldata certificateId) 
        external 
        view 
        returns (
            CertificateStatus status,
            bytes32 certificateHash,
            address issuerAddress,
            uint256 issuedTimestamp,
            string memory ipfsHash
        ) 
    {
        Certificate storage cert = certificates[certificateId];
        
        if (cert.issuedTimestamp == 0) {
            return (CertificateStatus.NotFound, bytes32(0), address(0), 0, "");
        }

        return (
            cert.status,
            cert.certificateHash,
            cert.issuerAddress,
            cert.issuedTimestamp,
            cert.ipfsHash
        );
    }

    /**
     * @dev Revoke a certificate
     * @param certificateId Certificate ID to revoke
     * @param reason Reason for revocation
     */
    function revokeCertificate(
        string calldata certificateId,
        string calldata reason
    ) external onlyRole(ISSUER_ROLE) nonReentrant {
        Certificate storage cert = certificates[certificateId];
        require(cert.issuedTimestamp != 0, "Certificate does not exist");
        require(cert.status == CertificateStatus.Valid, "Certificate already revoked");
        require(
            cert.issuerAddress == msg.sender || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Only the original issuer or admin can revoke"
        );
        require(bytes(reason).length > 0, "Revocation reason required");

        cert.status = CertificateStatus.Revoked;
        cert.revocationReason = reason;
        cert.revocationTimestamp = block.timestamp;

        emit CertificateRevoked(
            certificateId,
            msg.sender,
            reason,
            block.timestamp
        );
    }

    /**
     * @dev Get full certificate details
     * @param certificateId Certificate ID
     */
    function getCertificateDetails(string calldata certificateId)
        external
        view
        returns (
            bytes32 certificateHash,
            address issuerAddress,
            uint256 issuedTimestamp,
            CertificateStatus status,
            string memory ipfsHash,
            string memory revocationReason,
            uint256 revocationTimestamp
        )
    {
        Certificate storage cert = certificates[certificateId];
        require(cert.issuedTimestamp != 0, "Certificate does not exist");

        return (
            cert.certificateHash,
            cert.issuerAddress,
            cert.issuedTimestamp,
            cert.status,
            cert.ipfsHash,
            cert.revocationReason,
            cert.revocationTimestamp
        );
    }

    /**
     * @dev Verify certificate hash matches
     * @param certificateId Certificate ID
     * @param hash Hash to verify against
     */
    function verifyHash(string calldata certificateId, bytes32 hash)
        external
        view
        returns (bool)
    {
        Certificate storage cert = certificates[certificateId];
        if (cert.issuedTimestamp == 0) return false;
        return cert.certificateHash == hash;
    }

    /**
     * @dev Get certificates issued by a specific issuer
     */
    function getIssuerCertificates(address issuer)
        external
        view
        returns (string[] memory)
    {
        return issuerCertificates[issuer];
    }

    /**
     * @dev Get certificates for a specific student
     */
    function getStudentCertificates(address student)
        external
        view
        returns (string[] memory)
    {
        return studentCertificates[student];
    }

    /**
     * @dev Get total number of certificates issued
     */
    function getTotalCertificates() external view returns (uint256) {
        return allCertificateIds.length;
    }

    /**
     * @dev Check if an address has issuer role
     */
    function isIssuer(address account) external view returns (bool) {
        return hasRole(ISSUER_ROLE, account);
    }
}
