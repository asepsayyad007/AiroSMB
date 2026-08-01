import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Folder, Tv, Wifi, Radio, QrCode, Settings as SettingsIcon } from 'lucide-react';
import Dashboard from './components/Dashboard';
import FileManager from './components/FileManager';
import VlcStreamingHub from './components/VlcStreamingHub';
import Settings from './components/Settings';
import MediaPlayerModal from './components/MediaPlayerModal';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'explorer' | 'vlc' | 'settings'
  const [networkInfo, setNetworkInfo] = useState(null);
  const [activeMediaFile, setActiveMediaFile] = useState(null);
  const [showTopQrModal, setShowTopQrModal] = useState(false);

  // Fetch host network & system info
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
            <Radio className="brand-icon" />
          </div>
          <div>
            <h1 className="brand-title">AiroSMB</h1>
            <p className="brand-subtitle">Home Server & Media Engine</p>
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
          <div className="status-indicator">
            <div className="pulse-dot"></div>
            <span>Home LAN Server Active</span>
          </div>
          <div className="server-ip-text">
            <span>{primaryIp}:{port}</span>
          </div>
        </div>

      </aside>

      {/* Main Viewport */}
      <div className="main-wrapper">
        
        {/* Top Header Bar */}
        <header className="top-bar">
          <div className="top-title-area">
            <h2>
              {activeTab === 'dashboard' && 'Server Overview & Analytics'}
              {activeTab === 'explorer' && 'PC Shared Files & Explorer'}
              {activeTab === 'vlc' && 'VLC Player & Smart TV Streaming'}
              {activeTab === 'settings' && 'AiroSMB Server Settings'}
            </h2>
          </div>

          <div className="top-actions">
            <span className="badge">
              <Wifi size={14} /> {primaryIp}
            </span>

            <button className="btn-secondary" onClick={() => setShowTopQrModal(true)}>
              <QrCode size={16} />
              Pair Mobile
            </button>

            <button className="btn-primary" onClick={() => setActiveTab('explorer')}>
              <Folder size={16} />
              Shared Files
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
          <div className="modal-card" style={{ maxWidth: '400px', textCenter: 'center' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Mobile & TV Quick Pair</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Connect your phone or TV to your PC files instantly on Wi-Fi:
            </p>
            <div style={{ background: '#fff', padding: '16px', borderRadius: 'var(--radius-md)', display: 'inline-block', marginBottom: '20px' }}>
              <img src={networkInfo.qrDataUrl} alt="Pairing QR Code" style={{ width: '220px', height: '220px', display: 'block' }} />
            </div>
            <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', color: 'var(--accent-cyan)', marginBottom: '20px' }}>
              {serverUrl}
            </p>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowTopQrModal(false)}>
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
