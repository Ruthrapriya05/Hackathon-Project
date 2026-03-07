import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from '../context/Web3Context';
import { useAuth } from '../context/AuthContext';
import { FiShield, FiLogOut } from 'react-icons/fi';

const Navbar = () => {
  const location = useLocation();
  const { account, connectWallet, disconnectWallet, formatAddress, isConnecting, isAmoy } = useWeb3();
  const { isAuthenticated, logout, user } = useAuth();

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <nav className="navbar" id="main-navbar">
      <Link to="/" className="navbar-brand">
        <span className="logo-icon">
          <FiShield />
        </span>
        CertChain
      </Link>

      <ul className="navbar-links">
        <li><Link to="/" className={isActive('/')}>Home</Link></li>
        <li><Link to="/verify" className={isActive('/verify')}>Verify</Link></li>
        <li><Link to="/student" className={isActive('/student')}>Student</Link></li>
        {isAuthenticated && (
          <li><Link to="/admin" className={isActive('/admin')}>Admin</Link></li>
        )}
      </ul>

      <div className="navbar-actions">
        {account ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div className="wallet-badge">
              <span className="wallet-dot"></span>
              {formatAddress(account)}
              {!isAmoy && <span style={{ color: 'var(--warning)', marginLeft: '0.25rem' }}>⚠</span>}
            </div>
            {isAuthenticated && (
              <button className="btn btn-ghost btn-sm" onClick={() => { logout(); }} title="Logout">
                <FiLogOut />
              </button>
            )}
          </div>
        ) : (
          <button
            className="btn btn-primary btn-sm"
            onClick={connectWallet}
            disabled={isConnecting}
            id="connect-wallet-btn"
          >
            {isConnecting ? 'Connecting...' : '🦊 Connect Wallet'}
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
