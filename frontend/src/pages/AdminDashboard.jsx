import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import {
  issueCertificate,
  bulkIssueCertificates,
  revokeCertificate,
  getCertificateStats,
} from '../services/api';
import {
  FiHome,
  FiPlusCircle,
  FiUpload,
  FiXCircle,
  FiBarChart2,
  FiLogOut,
  FiCheckCircle,
  FiAlertTriangle,
} from 'react-icons/fi';

const AdminDashboard = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { account, formatAddress } = useWeb3();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  
  // Issue form state
  const [issueForm, setIssueForm] = useState({
    studentName: '',
    studentEmail: '',
    studentAddress: '',
    courseName: '',
    degreeType: "Bachelor's Degree",
    university: '',
    graduationDate: '',
    grade: '',
  });
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueResult, setIssueResult] = useState(null);
  
  // Bulk issue state
  const [csvFile, setCsvFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  
  // Revoke state
  const [revokeId, setRevokeId] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [revokeResult, setRevokeResult] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated]);

  const fetchStats = async () => {
    try {
      const res = await getCertificateStats();
      setStats(res.data.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleIssue = async (e) => {
    e.preventDefault();
    setIssueLoading(true);
    setIssueResult(null);
    try {
      const res = await issueCertificate({
        ...issueForm,
        university: issueForm.university || user?.university || 'Demo University',
      });
      setIssueResult({ success: true, data: res.data.data });
      setIssueForm({
        studentName: '',
        studentEmail: '',
        studentAddress: '',
        courseName: '',
        degreeType: "Bachelor's Degree",
        university: '',
        graduationDate: '',
        grade: '',
      });
      fetchStats();
    } catch (err) {
      setIssueResult({ success: false, message: err.response?.data?.message || err.message });
    } finally {
      setIssueLoading(false);
    }
  };

  const handleBulkIssue = async (e) => {
    e.preventDefault();
    if (!csvFile) return;
    
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const formData = new FormData();
      formData.append('csvFile', csvFile);
      const res = await bulkIssueCertificates(formData);
      setBulkResult({ success: true, data: res.data.data });
      setCsvFile(null);
      fetchStats();
    } catch (err) {
      setBulkResult({ success: false, message: err.response?.data?.message || err.message });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleRevoke = async (e) => {
    e.preventDefault();
    if (!revokeId || !revokeReason) return;

    // Sanitize accidental copy-paste prefixes
    const cleanId = revokeId.replace(/^Certificate ID:\s*/i, '').trim();

    setRevokeLoading(true);
    setRevokeResult(null);
    try {
      const res = await revokeCertificate(cleanId, revokeReason);
      setRevokeResult({ success: true, data: res.data.data });
      setRevokeId('');
      setRevokeReason('');
      fetchStats();
    } catch (err) {
      setRevokeResult({ success: false, message: err.response?.data?.message || err.message });
    } finally {
      setRevokeLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  const sidebarItems = [
    { key: 'dashboard', icon: <FiHome />, label: 'Dashboard' },
    { key: 'issue', icon: <FiPlusCircle />, label: 'Issue Certificate' },
    { key: 'bulk', icon: <FiUpload />, label: 'Bulk Issue' },
    { key: 'revoke', icon: <FiXCircle />, label: 'Revoke' },
    { key: 'analytics', icon: <FiBarChart2 />, label: 'Analytics' },
  ];

  const renderResult = (result, type) => {
    if (!result) return null;
    return (
      <div
        className="card slide-in"
        style={{
          marginTop: '1.5rem',
          borderColor: result.success ? 'var(--success)' : 'var(--danger)',
          padding: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          {result.success ? (
            <FiCheckCircle color="var(--success)" size={20} />
          ) : (
            <FiAlertTriangle color="var(--danger)" size={20} />
          )}
          <strong style={{ color: result.success ? 'var(--success)' : 'var(--danger)' }}>
            {result.success ? 'Success!' : 'Error'}
          </strong>
        </div>
        {result.success ? (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {result.data?.certificateId && (
              <p>Certificate ID: <code style={{ color: 'var(--accent)' }}>{result.data.certificateId}</code></p>
            )}
            {result.data?.txHash && (
              <p style={{ marginTop: '0.25rem' }}>
                TX:{' '}
                <a
                  href={`https://amoy.polygonscan.com/tx/${result.data.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                >
                  {result.data.txHash.slice(0, 20)}...
                </a>
              </p>
            )}
            {result.data?.count && (
              <p>{result.data.count} certificates issued successfully!</p>
            )}
          </div>
        ) : (
          <p style={{ fontSize: '0.85rem', color: 'var(--danger)' }}>{result.message}</p>
        )}
      </div>
    );
  };

  return (
    <div className="admin-layout fade-in">
      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ padding: '0 1rem 1rem', borderBottom: '1px solid var(--border-light)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            University Admin
          </p>
          <p style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.9rem' }}>
            {user?.university || 'Demo University'}
          </p>
          {account && (
            <p style={{ fontSize: '0.75rem', color: 'var(--primary-light)', fontFamily: 'monospace', marginTop: '0.25rem' }}>
              {formatAddress(account)}
            </p>
          )}
        </div>
        <ul className="sidebar-nav">
          {sidebarItems.map((item) => (
            <li key={item.key}>
              <a
                href="#"
                className={activeTab === item.key ? 'active' : ''}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab(item.key);
                }}
              >
                {item.icon} {item.label}
              </a>
            </li>
          ))}
          <li style={{ marginTop: '2rem' }}>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                logout();
                navigate('/');
              }}
              style={{ color: 'var(--danger)' }}
            >
              <FiLogOut /> Logout
            </a>
          </li>
        </ul>
      </aside>

      {/* Main Content */}
      <main className="admin-content">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="slide-in">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-heading)' }}>
              Dashboard Overview
            </h2>
            <div className="grid-4" style={{ marginBottom: '2rem' }}>
              <div className="card stat-card">
                <div className="stat-value" style={{ color: 'var(--primary-light)' }}>
                  {stats?.totalOnChain || 0}
                </div>
                <div className="stat-label">Total On-Chain</div>
              </div>
              <div className="card stat-card">
                <div className="stat-value" style={{ color: 'var(--success)' }}>
                  {stats?.valid || 0}
                </div>
                <div className="stat-label">Valid</div>
              </div>
              <div className="card stat-card">
                <div className="stat-value" style={{ color: 'var(--danger)' }}>
                  {stats?.revoked || 0}
                </div>
                <div className="stat-label">Revoked</div>
              </div>
              <div className="card stat-card">
                <div className="stat-value" style={{ color: 'var(--accent)' }}>
                  {stats?.totalLocal || 0}
                </div>
                <div className="stat-label">Local Cache</div>
              </div>
            </div>

            <div className="grid-2">
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ color: 'var(--text-heading)', marginBottom: '1rem' }}>Quick Actions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button className="btn btn-primary" onClick={() => setActiveTab('issue')}>
                    <FiPlusCircle /> Issue Certificate
                  </button>
                  <button className="btn btn-accent" onClick={() => setActiveTab('bulk')}>
                    <FiUpload /> Bulk Issue (CSV)
                  </button>
                  <button className="btn btn-outline" onClick={() => setActiveTab('revoke')}>
                    <FiXCircle /> Revoke Certificate
                  </button>
                </div>
              </div>
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ color: 'var(--text-heading)', marginBottom: '1rem' }}>System Info</h3>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <p style={{ marginBottom: '0.5rem' }}>🔗 Network: Polygon Amoy Testnet</p>
                  <p style={{ marginBottom: '0.5rem' }}>📋 Contract: Connected</p>
                  <p style={{ marginBottom: '0.5rem' }}>🗂️ Storage: IPFS (Pinata)</p>
                  <p>🔐 Auth: JWT Token Active</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Issue Certificate Tab */}
        {activeTab === 'issue' && (
          <div className="slide-in">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-heading)' }}>
              Issue Certificate
            </h2>
            <div className="card" style={{ maxWidth: '700px', padding: '2rem' }}>
              <form onSubmit={handleIssue}>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Student Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={issueForm.studentName}
                      onChange={(e) => setIssueForm({ ...issueForm, studentName: e.target.value })}
                      placeholder="John Doe"
                      required
                      id="issue-student-name"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Student Email</label>
                    <input
                      type="email"
                      className="form-input"
                      value={issueForm.studentEmail}
                      onChange={(e) => setIssueForm({ ...issueForm, studentEmail: e.target.value })}
                      placeholder="john@university.edu"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Student Wallet Address *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={issueForm.studentAddress}
                    onChange={(e) => setIssueForm({ ...issueForm, studentAddress: e.target.value })}
                    placeholder="0x..."
                    required
                    id="issue-student-address"
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Course Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={issueForm.courseName}
                      onChange={(e) => setIssueForm({ ...issueForm, courseName: e.target.value })}
                      placeholder="Computer Science"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Degree Type</label>
                    <select
                      className="form-select"
                      value={issueForm.degreeType}
                      onChange={(e) => setIssueForm({ ...issueForm, degreeType: e.target.value })}
                    >
                      <option>Bachelor&apos;s Degree</option>
                      <option>Master&apos;s Degree</option>
                      <option>PhD</option>
                      <option>Diploma</option>
                      <option>MBA</option>
                    </select>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">University</label>
                    <input
                      type="text"
                      className="form-input"
                      value={issueForm.university}
                      onChange={(e) => setIssueForm({ ...issueForm, university: e.target.value })}
                      placeholder={user?.university || 'Demo University'}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Graduation Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={issueForm.graduationDate}
                      onChange={(e) => setIssueForm({ ...issueForm, graduationDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Grade</label>
                  <input
                    type="text"
                    className="form-input"
                    value={issueForm.grade}
                    onChange={(e) => setIssueForm({ ...issueForm, grade: e.target.value })}
                    placeholder="A+, 3.8 GPA, First Class, etc."
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', marginTop: '0.5rem' }}
                  disabled={issueLoading}
                  id="issue-submit-btn"
                >
                  {issueLoading ? (
                    <>
                      <span className="spinner" style={{ width: 18, height: 18, margin: 0, borderWidth: 2 }}></span>
                      Issuing on Blockchain...
                    </>
                  ) : (
                    <>
                      <FiPlusCircle /> Issue Certificate
                    </>
                  )}
                </button>
              </form>
              {renderResult(issueResult)}
            </div>
          </div>
        )}

        {/* Bulk Issue Tab */}
        {activeTab === 'bulk' && (
          <div className="slide-in">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-heading)' }}>
              Bulk Issue Certificates
            </h2>
            <div className="card" style={{ maxWidth: '700px', padding: '2rem' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Upload a CSV file with student data. Required columns: 
                <code style={{ color: 'var(--accent)', margin: '0 0.25rem' }}>
                  studentName, studentAddress, courseName
                </code>
              </p>

              <form onSubmit={handleBulkIssue}>
                <div
                  className={`upload-area ${csvFile ? 'active' : ''}`}
                  onClick={() => document.getElementById('csv-upload').click()}
                >
                  <input
                    type="file"
                    id="csv-upload"
                    accept=".csv"
                    style={{ display: 'none' }}
                    onChange={(e) => setCsvFile(e.target.files[0])}
                  />
                  {csvFile ? (
                    <>
                      <div className="upload-icon">📄</div>
                      <p className="upload-text" style={{ fontWeight: 600, color: 'var(--accent)' }}>
                        {csvFile.name}
                      </p>
                      <p className="upload-hint">
                        {(csvFile.size / 1024).toFixed(1)} KB • Click to change
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="upload-icon">📁</div>
                      <p className="upload-text">
                        Drag & drop or click to upload CSV
                      </p>
                      <p className="upload-hint">
                        Max 100 certificates per batch • .csv files only
                      </p>
                    </>
                  )}
                </div>

                <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    📋 CSV Format Example:
                  </p>
                  <pre style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    fontFamily: 'monospace',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}>
{`studentName,studentEmail,studentAddress,courseName,degreeType,grade
Alice Johnson,alice@uni.edu,0x70997...,Computer Science,Bachelor's Degree,A+
Bob Smith,bob@uni.edu,0x3C44C...,Data Science,Master's Degree,A`}
                  </pre>
                </div>

                <button
                  type="submit"
                  className="btn btn-accent btn-lg"
                  style={{ width: '100%', marginTop: '1.5rem' }}
                  disabled={!csvFile || bulkLoading}
                  id="bulk-submit-btn"
                >
                  {bulkLoading ? (
                    <>
                      <span className="spinner" style={{ width: 18, height: 18, margin: 0, borderWidth: 2 }}></span>
                      Processing Batch...
                    </>
                  ) : (
                    <>
                      <FiUpload /> Issue All Certificates
                    </>
                  )}
                </button>
              </form>
              {renderResult(bulkResult)}
            </div>
          </div>
        )}

        {/* Revoke Tab */}
        {activeTab === 'revoke' && (
          <div className="slide-in">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-heading)' }}>
              Revoke Certificate
            </h2>
            <div className="card" style={{ maxWidth: '600px', padding: '2rem' }}>
              <div style={{
                padding: '1rem',
                background: 'var(--danger-bg)',
                border: '1px solid rgba(225, 112, 85, 0.3)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1.5rem',
              }}>
                <p style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>
                  ⚠️ Warning: Revocation is permanent and recorded on-chain.
                </p>
              </div>

              <form onSubmit={handleRevoke}>
                <div className="form-group">
                  <label className="form-label">Certificate ID *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={revokeId}
                    onChange={(e) => setRevokeId(e.target.value)}
                    placeholder="CERT-2025-001"
                    required
                    id="revoke-cert-id"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reason for Revocation *</label>
                  <textarea
                    className="form-textarea"
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    placeholder="e.g., Academic misconduct, Data error, etc."
                    required
                    id="revoke-reason"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-danger btn-lg"
                  style={{ width: '100%' }}
                  disabled={revokeLoading || !revokeId || !revokeReason}
                  id="revoke-submit-btn"
                >
                  {revokeLoading ? (
                    <>
                      <span className="spinner" style={{ width: 18, height: 18, margin: 0, borderWidth: 2 }}></span>
                      Revoking...
                    </>
                  ) : (
                    <>
                      <FiXCircle /> Revoke Certificate
                    </>
                  )}
                </button>
              </form>
              {renderResult(revokeResult)}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="slide-in">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-heading)' }}>
              Verification Analytics
            </h2>
            <div className="grid-3">
              <div className="card stat-card">
                <div className="stat-value" style={{ color: 'var(--primary-light)' }}>
                  {stats?.totalOnChain || 0}
                </div>
                <div className="stat-label">Total Issued</div>
              </div>
              <div className="card stat-card">
                <div className="stat-value" style={{ color: 'var(--success)' }}>
                  {stats?.valid || 0}
                </div>
                <div className="stat-label">Active Valid</div>
              </div>
              <div className="card stat-card">
                <div className="stat-value" style={{ color: 'var(--danger)' }}>
                  {stats?.revoked || 0}
                </div>
                <div className="stat-label">Revoked</div>
              </div>
            </div>

            <div className="card" style={{ marginTop: '1.5rem', padding: '2rem' }}>
              <h3 style={{ color: 'var(--text-heading)', marginBottom: '1rem' }}>
                Blockchain Activity
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                All certificate issuances and revocations are permanently recorded on the 
                Polygon Amoy blockchain. View transactions on{' '}
                <a href="https://amoy.polygonscan.com" target="_blank" rel="noopener noreferrer">
                  PolygonScan ↗
                </a>
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
