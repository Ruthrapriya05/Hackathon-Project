import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { verifyCertificate } from '../services/api';
import { FiSearch, FiCheckCircle, FiXCircle, FiAlertTriangle, FiExternalLink } from 'react-icons/fi';

const VerifyPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [certificateId, setCertificateId] = useState(id || searchParams.get('id') || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleVerify = async (e) => {
    e?.preventDefault();
    if (!certificateId.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await verifyCertificate(certificateId.trim());
      setResult(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-verify if ID provided in URL
  useState(() => {
    if (id) {
      setCertificateId(id);
      handleVerify();
    }
  }, [id]);

  const renderStatus = () => {
    if (!result) return null;

    const { status } = result;

    if (status === 'Valid') {
      return (
        <div className="verify-result valid card slide-in" id="verify-result-valid">
          <div className="verify-icon valid">
            <FiCheckCircle />
          </div>
          <h2 className="verify-status" style={{ color: 'var(--success)' }}>
            ✅ Certificate Verified
          </h2>
          <p className="verify-message">
            This certificate is authentic and has been verified on the Polygon blockchain.
          </p>

          <div className="verify-details">
            <div className="verify-detail-row">
              <span className="verify-detail-label">Certificate ID</span>
              <span className="verify-detail-value">{result.certificateId}</span>
            </div>
            <div className="verify-detail-row">
              <span className="verify-detail-label">Status</span>
              <span className="verify-detail-value">
                <span className="badge badge-valid">✓ Valid</span>
              </span>
            </div>
            <div className="verify-detail-row">
              <span className="verify-detail-label">Issuer</span>
              <span className="verify-detail-value">{result.issuerAddress}</span>
            </div>
            <div className="verify-detail-row">
              <span className="verify-detail-label">Issued On</span>
              <span className="verify-detail-value">
                {new Date(result.issuedDate).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </span>
            </div>
            <div className="verify-detail-row">
              <span className="verify-detail-label">Certificate Hash</span>
              <span className="verify-detail-value" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                {result.certificateHash?.slice(0, 20)}...
              </span>
            </div>
            <div className="verify-detail-row">
              <span className="verify-detail-label">IPFS</span>
              <span className="verify-detail-value">
                <a href={`https://gateway.pinata.cloud/ipfs/${result.ipfsHash}`} target="_blank" rel="noopener noreferrer">
                  View on IPFS <FiExternalLink size={12} />
                </a>
              </span>
            </div>
          </div>

          {result.certificateData && (
            <div className="verify-details" style={{ marginTop: '1rem' }}>
              <h4 style={{ marginBottom: '0.75rem', color: 'var(--text-heading)', fontSize: '0.9rem' }}>
                📋 Certificate Details
              </h4>
              {result.certificateData.studentName && (
                <div className="verify-detail-row">
                  <span className="verify-detail-label">Student</span>
                  <span className="verify-detail-value">{result.certificateData.studentName}</span>
                </div>
              )}
              {result.certificateData.courseName && (
                <div className="verify-detail-row">
                  <span className="verify-detail-label">Course</span>
                  <span className="verify-detail-value">{result.certificateData.courseName}</span>
                </div>
              )}
              {result.certificateData.degreeType && (
                <div className="verify-detail-row">
                  <span className="verify-detail-label">Degree</span>
                  <span className="verify-detail-value">{result.certificateData.degreeType}</span>
                </div>
              )}
              {result.certificateData.university && (
                <div className="verify-detail-row">
                  <span className="verify-detail-label">University</span>
                  <span className="verify-detail-value">{result.certificateData.university}</span>
                </div>
              )}
              {result.certificateData.grade && (
                <div className="verify-detail-row">
                  <span className="verify-detail-label">Grade</span>
                  <span className="verify-detail-value">{result.certificateData.grade}</span>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (status === 'Revoked') {
      return (
        <div className="verify-result revoked card slide-in" id="verify-result-revoked">
          <div className="verify-icon revoked">
            <FiXCircle />
          </div>
          <h2 className="verify-status" style={{ color: 'var(--danger)' }}>
            ❌ Certificate Revoked
          </h2>
          <p className="verify-message">
            This certificate has been revoked by the issuing authority.
          </p>
          <div className="verify-details">
            <div className="verify-detail-row">
              <span className="verify-detail-label">Certificate ID</span>
              <span className="verify-detail-value">{result.certificateId}</span>
            </div>
            <div className="verify-detail-row">
              <span className="verify-detail-label">Status</span>
              <span className="verify-detail-value">
                <span className="badge badge-revoked">✗ Revoked</span>
              </span>
            </div>
            {result.revocationReason && (
              <div className="verify-detail-row">
                <span className="verify-detail-label">Reason</span>
                <span className="verify-detail-value">{result.revocationReason}</span>
              </div>
            )}
            <div className="verify-detail-row">
              <span className="verify-detail-label">Issuer</span>
              <span className="verify-detail-value">{result.issuerAddress}</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="verify-result card slide-in" id="verify-result-not-found">
        <div className="verify-icon not-found">
          <FiAlertTriangle />
        </div>
        <h2 className="verify-status" style={{ color: 'var(--warning)' }}>
          ⚠️ Certificate Not Found
        </h2>
        <p className="verify-message">
          No certificate with this ID was found on the blockchain. 
          Please check the ID and try again.
        </p>
      </div>
    );
  };

  return (
    <div className="page fade-in">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Verify Certificate</h1>
          <p className="page-subtitle">
            Enter a certificate ID or scan a QR code to verify its authenticity on the blockchain
          </p>
        </div>

        {/* Search Form */}
        <div style={{ maxWidth: '600px', margin: '0 auto 3rem' }}>
          <form onSubmit={handleVerify} style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Enter Certificate ID (e.g., CERT-2025-001)"
              value={certificateId}
              onChange={(e) => setCertificateId(e.target.value)}
              id="verify-input"
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !certificateId.trim()}
              id="verify-btn"
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 18, height: 18, margin: 0, borderWidth: 2 }}></span>
                  Verifying...
                </>
              ) : (
                <>
                  <FiSearch /> Verify
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="card slide-in" style={{
            maxWidth: '600px',
            margin: '0 auto 2rem',
            borderColor: 'var(--danger)',
            textAlign: 'center',
            padding: '1.5rem',
          }}>
            <p style={{ color: 'var(--danger)', fontWeight: 600 }}>⚠️ {error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="spinner"></div>
            <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>
              Querying blockchain...
            </p>
          </div>
        )}

        {/* Result */}
        {renderStatus()}
      </div>
    </div>
  );
};

export default VerifyPage;
