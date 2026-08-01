import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Folder, Tv, Wifi, Radio, QrCode, Settings as SettingsIcon } from 'lucide-react';
import Dashboard from './components/Dashboard';
import FileManager from './components/FileManager';
import VlcStreamingHub from './components/VlcStreamingHub';
import Settings from './components/Settings';
import MediaPlayerModal from './components/MediaPlayerModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [networkInfo, setNetworkInfo] = useState(null);
  const [activeMediaFile, setActiveMediaFile] = useState(null);
  const [showTopQrModal, setShowTopQrModal] = useState(false);

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

  const primaryIp = networkInfo?.primaryIp || '192.168.x.x';
  const port = networkInfo?.port || 3000;
  const serverUrl = networkInfo?.serverUrl || `http://${primaryIp}:${port}`;

  return (
    <div className="app-container">
      
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        
        {/* Brand Header */}
        <div className="brand-header">
          <div className="brand-icon-wrapper">
            <Radio size={18} />
          </div>
          <div>
            <h1 className="brand-title">AiroSMB</h1>
            <p className="brand-subtitle">Home Server & Media</p>
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
              className={`nav-item-btn ${activeTab === 'explorer' ? 'active' : ''}`}
              onClick={() => setActiveTab('explorer')}
            >
              <Folder className="icon" />
              <span>File Explorer</span>
            </button>
          </li>

          <li>
            <button 
              className={`nav-item-btn ${activeTab === 'vlc' ? 'active' : ''}`}
              onClick={() => setActiveTab('vlc')}
            >
              <Tv className="icon" />
              <span>VLC & TV Hub</span>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--accent-emerald)', fontWeight: 600, marginBottom: '4px' }}>
            <span className="status-dot"></span>
            <span>Server Active</span>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {primaryIp}:{port}
          </div>
        </div>

      </aside>

      {/* Main Viewport */}
      <div className="main-wrapper">
        
        {/* Top Header Bar */}
        <header className="top-bar">
          <div className="top-title-area">
            <h2>
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'explorer' && 'File Explorer'}
              {activeTab === 'vlc' && 'VLC & TV Streaming'}
              {activeTab === 'settings' && 'Settings'}
            </h2>
          </div>

          <div className="top-actions">
            <span className="status-pill status-active">
              <Wifi size={12} /> {primaryIp}
            </span>

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
              onNavigate={(tab) => setActiveTab(tab)}
              onRefreshNetwork={fetchNetworkInfo}
            />
          )}

          {activeTab === 'explorer' && (
            <FileManager 
              networkInfo={networkInfo} 
              onPlayMedia={(file) => setActiveMediaFile(file)}
            />
          )}

          {activeTab === 'vlc' && (
            <VlcStreamingHub 
              networkInfo={networkInfo}
            />
          )}

          {activeTab === 'settings' && (
            <Settings 
              networkInfo={networkInfo}
              onRefreshNetwork={fetchNetworkInfo}
            />
          )}
        </main>

      </div>

      {/* Media Player Modal */}
      {activeMediaFile && (
        <MediaPlayerModal 
          file={activeMediaFile}
          networkInfo={networkInfo}
          onClose={() => setActiveMediaFile(null)}
        />
      )}

      {/* Mobile Pairing Modal */}
      {showTopQrModal && networkInfo?.qrDataUrl && (
        <div className="modal-overlay" onClick={() => setShowTopQrModal(false)}>
          <div className="modal-card" style={{ maxWidth: '360px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '6px' }}>Mobile Connection</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Scan QR code using smartphone camera to open dashboard on Wi-Fi:
            </p>
            <div style={{ background: '#fff', padding: '10px', borderRadius: 'var(--radius-md)', display: 'inline-block', marginBottom: '14px' }}>
              <img src={networkInfo.qrDataUrl} alt="Pairing QR Code" style={{ width: '180px', height: '180px', display: 'block' }} />
            </div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', color: 'var(--accent-cyan)', marginBottom: '16px' }}>
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
