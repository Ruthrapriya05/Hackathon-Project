import { Link } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { FiShield, FiSearch, FiUpload, FiUser, FiLock, FiZap, FiGlobe } from 'react-icons/fi';

const Home = () => {
  const { account, connectWallet, isConnecting } = useWeb3();

  return (
    <div className="fade-in">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <h1 className="hero-title">
            <span className="gradient-text">On-Chain</span> Academic<br />
            Certificate <span className="accent-text">Verification</span>
          </h1>
          <p className="hero-subtitle">
            Issue tamper-proof academic certificates on the Polygon blockchain. 
            Verify authenticity instantly through QR codes or certificate IDs. 
            Eliminate fake credentials forever.
          </p>
          <div className="hero-actions">
            <Link to="/verify" className="btn btn-primary btn-lg" id="hero-verify-btn">
              <FiSearch /> Verify Certificate
            </Link>
            {account ? (
              <Link to="/admin/login" className="btn btn-outline btn-lg" id="hero-admin-btn">
                <FiShield /> Admin Portal
              </Link>
            ) : (
              <button
                className="btn btn-outline btn-lg"
                onClick={connectWallet}
                disabled={isConnecting}
              >
                🦊 {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-value">100%</div>
              <div className="hero-stat-label">Tamper-Proof</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">&lt;2s</div>
              <div className="hero-stat-label">Verification Time</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">50+</div>
              <div className="hero-stat-label">Bulk Issuance</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">Polygon</div>
              <div className="hero-stat-label">Blockchain</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <div className="page-header">
            <h2 className="page-title">How It Works</h2>
            <p className="page-subtitle">
              A complete ecosystem for secure certificate management
            </p>
          </div>

          <div className="grid-3">
            <div className="card feature-card slide-in">
              <div className="feature-icon">
                <FiUpload />
              </div>
              <h3 className="feature-title">Issue Certificates</h3>
              <p className="feature-desc">
                Universities upload student data via CSV. Certificate hash is computed using SHA-256 
                and stored permanently on the Polygon blockchain.
              </p>
            </div>

            <div className="card feature-card slide-in" style={{ animationDelay: '0.1s' }}>
              <div className="feature-icon" style={{ background: 'rgba(0, 206, 201, 0.15)', color: 'var(--accent)' }}>
                <FiLock />
              </div>
              <h3 className="feature-title">Store Off-Chain</h3>
              <p className="feature-desc">
                Full certificate data is stored on IPFS via Pinata. Only the cryptographic hash 
                goes on-chain, ensuring privacy and low gas costs.
              </p>
            </div>

            <div className="card feature-card slide-in" style={{ animationDelay: '0.2s' }}>
              <div className="feature-icon" style={{ background: 'rgba(0, 184, 148, 0.15)', color: 'var(--success)' }}>
                <FiSearch />
              </div>
              <h3 className="feature-title">Verify Instantly</h3>
              <p className="feature-desc">
                Employers scan a QR code or enter a certificate ID. The system checks 
                the blockchain in real-time and shows validity status.
              </p>
            </div>

            <div className="card feature-card slide-in" style={{ animationDelay: '0.3s' }}>
              <div className="feature-icon" style={{ background: 'rgba(116, 185, 255, 0.15)', color: 'var(--info)' }}>
                <FiShield />
              </div>
              <h3 className="feature-title">Tamper-Proof</h3>
              <p className="feature-desc">
                Any modification to certificate data changes the hash, instantly 
                exposing forgery attempts. Immutable blockchain records.
              </p>
            </div>

            <div className="card feature-card slide-in" style={{ animationDelay: '0.4s' }}>
              <div className="feature-icon" style={{ background: 'rgba(253, 203, 110, 0.15)', color: 'var(--warning)' }}>
                <FiZap />
              </div>
              <h3 className="feature-title">Bulk Issuance</h3>
              <p className="feature-desc">
                Issue 50+ certificates in a single transaction. CSV upload with 
                automated hash computation and IPFS storage.
              </p>
            </div>

            <div className="card feature-card slide-in" style={{ animationDelay: '0.5s' }}>
              <div className="feature-icon" style={{ background: 'rgba(225, 112, 85, 0.15)', color: 'var(--danger)' }}>
                <FiUser />
              </div>
              <h3 className="feature-title">Role-Based Access</h3>
              <p className="feature-desc">
                Only authorized university issuers can create or revoke certificates. 
                OpenZeppelin AccessControl ensures security.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section className="features">
        <div className="container">
          <div className="page-header">
            <h2 className="page-title">Architecture</h2>
            <p className="page-subtitle">
              Built on Polygon Amoy Testnet with enterprise-grade security
            </p>
          </div>

          <div className="grid-3">
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              <div className="feature-icon" style={{ margin: '0 auto 1rem' }}>
                <FiUser />
              </div>
              <h3 className="feature-title">Admin Portal</h3>
              <p className="feature-desc">
                University admin → Backend API → Smart Contract → Polygon Blockchain
              </p>
            </div>

            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              <div className="feature-icon" style={{ margin: '0 auto 1rem', background: 'rgba(0, 206, 201, 0.15)', color: 'var(--accent)' }}>
                <FiGlobe />
              </div>
              <h3 className="feature-title">Student Wallet</h3>
              <p className="feature-desc">
                Student connects MetaMask → Views certificates → Generates QR → Shares with employers
              </p>
            </div>

            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              <div className="feature-icon" style={{ margin: '0 auto 1rem', background: 'rgba(0, 184, 148, 0.15)', color: 'var(--success)' }}>
                <FiSearch />
              </div>
              <h3 className="feature-title">Verification Portal</h3>
              <p className="feature-desc">
                Employer scans QR / enters ID → Backend queries blockchain → Shows instant result
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>
            Built with ❤️ for Hackathon | Powered by{' '}
            <a href="https://polygon.technology" target="_blank" rel="noopener noreferrer">
              Polygon
            </a>{' '}
            &{' '}
            <a href="https://ipfs.io" target="_blank" rel="noopener noreferrer">
              IPFS
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
