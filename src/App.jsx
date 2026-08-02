import React, { useState, useEffect } from 'react';
import { LayoutDashboard, QrCode, Settings as SettingsIcon, Wifi, Users, RefreshCw } from 'lucide-react';
import Dashboard from './components/Dashboard';
import ActiveClients from './components/ActiveClients';
import Settings from './components/Settings';
import AiroShareIcon from './components/AiroShareIcon';

const detectBrowserIp = () => {
  const host = window.location.hostname;
  if (host && host !== 'localhost' && host !== '127.0.0.1' && /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return host;
  }
  return '';
};

const detectBrowserHostname = () => {
  const host = window.location.hostname;
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return host.replace(/\.local$/i, '');
  }
  return 'Home Server';
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [networkInfo, setNetworkInfo] = useState(null);
  const [showTopQrModal, setShowTopQrModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNetworkInfo = async () => {
    try {
      const res = await fetch('/api/network/info');
      const data = await res.json();
      if (res.ok) {
        setNetworkInfo(data);
      }
    } catch (err) {
      console.error('Failed to fetch server network info:', err);
    }
  };

  useEffect(() => {
    fetchNetworkInfo();
  }, []);

  const primaryIp = networkInfo?.primaryIp || detectBrowserIp();
  const port = networkInfo?.port || window.location.port || 3000;
  const hostname = networkInfo?.hostname || detectBrowserHostname();
  const connectionType = networkInfo?.connectionType || 'Network';
  const serverUrl = primaryIp ? `http://${primaryIp}:${port}` : '';

  return (
    <div className="app-container">
      
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        
        {/* Brand Header with AiroShare Icon */}
        <div className="brand-header">
          <div className="brand-icon-wrapper">
            <AiroShareIcon size={34} />
          </div>
          <div>
            <h1 className="brand-title">AiroShare</h1>
            <p className="brand-subtitle">Media & File Server</p>
          </div>
        </div>

        {/* Navigation Items */}
        <ul className="nav-list">
          <li>
            <button 
              className={`nav-item-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard className="icon" />
              <span>Dashboard</span>
            </button>
          </li>

          <li>
            <button 
              className={`nav-item-btn ${activeTab === 'clients' ? 'active' : ''}`}
              onClick={() => setActiveTab('clients')}
            >
              <Users className="icon" />
              <span>Active Clients</span>
            </button>
          </li>

          <li>
            <button 
              className={`nav-item-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <SettingsIcon className="icon" />
              <span>Settings</span>
            </button>
          </li>
        </ul>

        {/* Server Status Footer Card */}
        <div className="server-status-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: 'var(--accent-emerald)', fontWeight: 600, marginBottom: '2px' }}>
            <span className="status-dot"></span>
            <span>Server Active</span>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            {primaryIp ? `${primaryIp}:${port}` : 'Loading LAN IP...'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>AiroShare</span>
            <span style={{ color: 'var(--accent-orange)', background: 'rgba(255, 93, 11, 0.1)', padding: '2px 6px', borderRadius: 'var(--radius-sm)', fontSize: '0.68rem', fontWeight: 700 }}>
              v{networkInfo?.version || '1.3.1'}
            </span>
          </div>
        </div>

      </aside>

      {/* Main Viewport */}
      <div className="main-wrapper">
        
        {/* Top Header Bar */}
        <header className="top-bar">
          <div className="top-title-area">
            <h2>
              {activeTab === 'dashboard' && 'Server Overview & Shared Files'}
              {activeTab === 'clients' && 'Active Connected Clients & Devices'}
              {activeTab === 'settings' && 'Server Settings & Port Configuration'}
            </h2>
          </div>

          <div className="top-actions">
            <span className="status-pill status-active">
              <Wifi size={12} /> {connectionType} {primaryIp ? `(${primaryIp})` : 'Loading IP...'}
            </span>

            <button 
              className="btn-pro-secondary" 
              onClick={async () => {
                setRefreshing(true);
                await fetchNetworkInfo();
                setRefreshing(false);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Refresh Network Configuration"
            >
              <RefreshCw size={12} className={refreshing ? 'spin' : ''} />
              <span>Refresh IP</span>
            </button>

            <button className="btn-pro-secondary" onClick={() => setShowTopQrModal(true)}>
              <QrCode size={14} /> Pair Mobile
            </button>
          </div>
        </header>

        {/* Main Content Render */}
        <main className="content-viewport">
          {activeTab === 'dashboard' && (
            <Dashboard 
              networkInfo={networkInfo} 
              onRefreshNetwork={fetchNetworkInfo}
            />
          )}

          {activeTab === 'clients' && (
            <ActiveClients />
          )}

          {activeTab === 'settings' && (
            <Settings 
              networkInfo={networkInfo}
              onRefreshNetwork={fetchNetworkInfo}
            />
          )}
        </main>

      </div>

      {/* Mobile Pairing Modal */}
      {showTopQrModal && networkInfo?.qrDataUrl && (
        <div className="modal-overlay" onClick={() => setShowTopQrModal(false)}>
          <div className="modal-card" style={{ maxWidth: '340px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: '10px' }}>
              <AiroShareIcon size={44} />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }}>Mobile Connection</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Scan QR code using smartphone camera to open dashboard on Wi-Fi:
            </p>
            <div style={{ background: '#fff', padding: '8px', borderRadius: 'var(--radius-md)', display: 'inline-block', marginBottom: '12px' }}>
              <img src={networkInfo.qrDataUrl} alt="Pairing QR Code" style={{ width: '160px', height: '160px', display: 'block' }} />
            </div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--accent-orange)', marginBottom: '14px' }}>
              {serverUrl}
            </p>
            <button className="btn-pro-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowTopQrModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
