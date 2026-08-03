import React, { useState, useEffect } from 'react';
import { LayoutDashboard, QrCode, Settings as SettingsIcon, Wifi, Users, RefreshCw, Tv, Film, Power } from 'lucide-react';
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
  const [services, setServices] = useState({ http: true, ftp: true, dlna: true });

  const fetchNetworkInfo = async () => {
    try {
      const res = await fetch('/api/network/info');
      const data = await res.json();
      if (res.ok) {
        setNetworkInfo(data);
        if (data.services) setServices(data.services);
      }
    } catch (err) {
      console.error('Failed to fetch server network info:', err);
    }
  };

  const toggleService = async (serviceName, targetState) => {
    // Optimistic UI state update so toggle slides instantly on click!
    setServices(prev => ({ ...prev, [serviceName]: targetState }));
    try {
      const res = await fetch('/api/services/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceName, enable: targetState, state: targetState })
      });
      const data = await res.json();
      if (res.ok && data.services) {
        setServices(data.services);
      }
    } catch (err) {
      console.error('Failed to toggle service:', err);
      // Revert if API request failed
      setServices(prev => ({ ...prev, [serviceName]: !targetState }));
    }
  };

  useEffect(() => {
    fetchNetworkInfo();
  }, []);

  const primaryIp = networkInfo?.primaryIp || detectBrowserIp();
  const port = networkInfo?.port || window.location.port || 9900;
  const ftpPort = networkInfo?.ftpPort || 2121;
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

        {/* Server Engines Widget Below Settings */}
        <div className="sidebar-services-widget">
          <div className="sidebar-widget-header">
            <span className="sidebar-widget-title">SERVER ENGINES</span>
          </div>

          <div className="sidebar-services-list">
            {/* HTTP Web Engine */}
            <div className="sidebar-engine-row">
              <div className="sidebar-engine-meta">
                <div className="sidebar-engine-title-row">
                  <Wifi size={13} color={services.http ? "var(--accent-orange)" : "var(--text-muted)"} />
                  <span className="sidebar-engine-name">HTTP Web</span>
                </div>
                <span className="sidebar-engine-sub">Port {port}</span>
              </div>
              <button 
                type="button"
                role="switch"
                aria-checked={services.http}
                onClick={() => toggleService('http', !services.http)} 
                className={`engine-toggle-switch ${services.http ? 'active' : ''}`}
                title={services.http ? 'Stop HTTP Web Engine' : 'Start HTTP Web Engine'}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            {/* FTP Streaming Engine */}
            <div className="sidebar-engine-row">
              <div className="sidebar-engine-meta">
                <div className="sidebar-engine-title-row">
                  <Tv size={13} color={services.ftp ? "var(--accent-emerald)" : "var(--text-muted)"} />
                  <span className="sidebar-engine-name">FTP Stream</span>
                </div>
                <span className="sidebar-engine-sub">Port {ftpPort}</span>
              </div>
              <button 
                type="button"
                role="switch"
                aria-checked={services.ftp}
                onClick={() => toggleService('ftp', !services.ftp)} 
                className={`engine-toggle-switch ${services.ftp ? 'active' : ''}`}
                title={services.ftp ? 'Stop FTP Server' : 'Start FTP Server'}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            {/* DLNA Server Engine */}
            <div className="sidebar-engine-row">
              <div className="sidebar-engine-meta">
                <div className="sidebar-engine-title-row">
                  <Film size={13} color={services.dlna ? "#f59e0b" : "var(--text-muted)"} />
                  <span className="sidebar-engine-name">DLNA Server</span>
                </div>
                <span className="sidebar-engine-sub">UDP 1900</span>
              </div>
              <button 
                type="button"
                role="switch"
                aria-checked={services.dlna}
                onClick={() => toggleService('dlna', !services.dlna)} 
                className={`engine-toggle-switch ${services.dlna ? 'active' : ''}`}
                title={services.dlna ? 'Stop DLNA Broadcaster' : 'Start DLNA Broadcaster'}
              >
                <span className="toggle-thumb" />
              </button>
            </div>
          </div>
        </div>



        {/* Server Status Footer Card */}
        <div className="server-status-card">
          <div className="status-row-top">
            <span className="status-app-name">AiroShare</span>
            <span className="status-version">v{networkInfo?.version || '1.3.1'}</span>
          </div>
          <div className="status-connection-row">
            <span className="status-ip-text">
              {primaryIp ? `${primaryIp}:${port}` : 'Loading LAN IP...'}
            </span>
            <div className="status-indicator-badge">
              <span className="status-dot-pulse"></span>
              <span>Active</span>
            </div>
          </div>
          <div className="status-author-credit">
            Built by Asep Sayyad
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
              services={services}
              onToggleService={toggleService}
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
