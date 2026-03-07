import { useState, useEffect } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { getStudentCertificates, getQRCode } from '../services/api';
import { FiAward, FiCopy, FiExternalLink, FiShare2 } from 'react-icons/fi';
import QRCode from 'react-qr-code';

const StudentPage = () => {
  const { account, connectWallet, formatAddress, isConnecting } = useWeb3();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCert, setSelectedCert] = useState(null);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (account) {
      fetchCertificates();
    }
  }, [account]);

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const res = await getStudentCertificates(account);
      setCertificates(res.data.data.certificates || []);
    } catch (err) {
      console.error('Failed to fetch certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const getVerificationUrl = (certId) => {
    return `${window.location.origin}/verify/${certId}`;
  };

  if (!account) {
    return (
      <div className="page fade-in">
        <div className="container">
          <div className="empty-state" style={{ paddingTop: '8rem' }}>
            <div className="empty-icon">🦊</div>
            <h2 className="empty-title">Connect Your Wallet</h2>
            <p className="empty-desc">
              Connect your MetaMask wallet to view your academic certificates
            </p>
            <button
              className="btn btn-primary btn-lg"
              onClick={connectWallet}
              disabled={isConnecting}
            >
              {isConnecting ? 'Connecting...' : '🦊 Connect MetaMask'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">My Certificates</h1>
          <p className="page-subtitle">
            Wallet: {formatAddress(account)}
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner"></div>
            <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>
              Loading your certificates from blockchain...
            </p>
          </div>
        ) : certificates.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎓</div>
            <h2 className="empty-title">No Certificates Found</h2>
            <p className="empty-desc">
              No certificates have been issued to your wallet address yet.
              <br />Contact your university if you believe this is an error.
            </p>
          </div>
        ) : (
          <div className="grid-2">
            {certificates.map((cert) => (
              <div className="card cert-card slide-in" key={cert.certificateId} id={`cert-${cert.certificateId}`}>
                <div className="cert-header">
                  <div>
                    <div className="cert-id">{cert.certificateId}</div>
                    <div className="cert-name">
                      {cert.localData?.studentName || 'Certificate'}
                    </div>
                    <div className="cert-course">
                      {cert.localData?.courseName || cert.certificateId}
                    </div>
                  </div>
                  <span className={`badge ${cert.status === 'Valid' ? 'badge-valid' : 'badge-revoked'}`}>
                    {cert.status}
                  </span>
                </div>

                <div className="cert-meta">
                  <div className="cert-meta-item">
                    <strong>Issued</strong>
                    {new Date(cert.issuedDate).toLocaleDateString()}
                  </div>
                  <div className="cert-meta-item">
                    <strong>Degree</strong>
                    {cert.localData?.degreeType || 'N/A'}
                  </div>
                  <div className="cert-meta-item">
                    <strong>Grade</strong>
                    {cert.localData?.grade || 'N/A'}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setSelectedCert(cert);
                      setShowQR(true);
                    }}
                    title="Show QR Code"
                  >
                    <FiShare2 /> Share
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => copyToClipboard(getVerificationUrl(cert.certificateId))}
                    title="Copy verification link"
                  >
                    <FiCopy /> Copy Link
                  </button>
                  {cert.ipfsHash && (
                    <a
                      className="btn btn-ghost btn-sm"
                      href={`https://gateway.pinata.cloud/ipfs/${cert.ipfsHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FiExternalLink /> IPFS
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* QR Modal */}
        {showQR && selectedCert && (
          <div className="modal-overlay" onClick={() => setShowQR(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Share Certificate</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowQR(false)}>✕</button>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                  Share this QR code with employers to verify your certificate
                </p>
                <div className="qr-container">
                  <QRCode
                    value={getVerificationUrl(selectedCert.certificateId)}
                    size={200}
                    bgColor="#ffffff"
                    fgColor="#1a1a2e"
                  />
                </div>
                <p style={{
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  color: 'var(--text-muted)',
                  marginTop: '1rem',
                  wordBreak: 'break-all',
                }}>
                  {selectedCert.certificateId}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => copyToClipboard(getVerificationUrl(selectedCert.certificateId))}
                  >
                    <FiCopy /> Copy Verification Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentPage;
