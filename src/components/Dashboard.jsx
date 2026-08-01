import React, { useState } from 'react';
import { HardDrive, Wifi, QrCode, Tv, Folder, Copy, Check, Server, Settings } from 'lucide-react';

export default function Dashboard({ networkInfo, onNavigate, onRefreshNetwork }) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSmb, setCopiedSmb] = useState(false);
  const [copiedFtp, setCopiedFtp] = useState(false);
  const [customPath, setCustomPath] = useState(networkInfo?.rootDirectory || '');
  const [savingPath, setSavingPath] = useState(false);
  const [pathMessage, setPathMessage] = useState('');

  const primaryIp = networkInfo?.primaryIp || '192.168.x.x';
  const port = networkInfo?.port || 3000;
  const hostname = networkInfo?.hostname || 'PC';
  const serverUrl = networkInfo?.serverUrl || `http://${primaryIp}:${port}`;
  const smbPath = networkInfo?.smbPath || `\\\\${hostname}\\AiroSMB`;
  const ftpUrl = `ftp://${primaryIp}:2121`;
  const storage = networkInfo?.storage || { total: 0, free: 0, used: 0, percentUsed: 0 };

  const formatGb = (bytes) => (bytes / (1024 * 1024 * 1024)).toFixed(1);

  const copyToClipboard = (text, setFn) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  const handleUpdateRoot = async (e) => {
    e.preventDefault();
    if (!customPath.trim()) return;
    try {
      setSavingPath(true);
      setPathMessage('');
      const res = await fetch('/api/network/set-root', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPath: customPath.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setPathMessage('✅ Directory path updated successfully.');
        if (onRefreshNetwork) onRefreshNetwork();
      } else {
        setPathMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setPathMessage('❌ Failed to update directory path.');
    } finally {
      setSavingPath(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Metrics Banner */}
      <div className="pro-card">
        <div className="metrics-banner-grid">
          <div className="metric-item">
            <span className="metric-label">Server Host</span>
            <span className="metric-value">{hostname}</span>
          </div>

          <div className="metric-item">
            <span className="metric-label">Network IP</span>
            <span className="metric-value">{primaryIp}</span>
          </div>

          <div className="metric-item">
            <span className="metric-label">Storage Free</span>
            <span className="metric-value">
              {storage.total > 0 ? `${formatGb(storage.free)} GB` : 'Active'}
            </span>
          </div>

          <div className="metric-item">
            <span className="metric-label">DLNA Status</span>
            <span className="metric-value" style={{ color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="status-dot"></span> Active
            </span>
          </div>
        </div>
      </div>

      {/* Network Services Access Cards */}
      <div className="grid-3">
        
        {/* Web Access */}
        <div className="pro-card">
          <div className="card-header-clean">
            <span className="card-title-text">HTTP Web Server</span>
            <Wifi size={16} color="var(--accent-cyan)" />
          </div>
          <div className="card-mono-value">
            {serverUrl}
          </div>
          <button onClick={() => copyToClipboard(serverUrl, setCopiedUrl)} className="btn-pro-secondary w-full">
            {copiedUrl ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
            {copiedUrl ? 'Copied' : 'Copy Web Address'}
          </button>
        </div>

        {/* Windows SMB Share */}
        <div className="pro-card">
          <div className="card-header-clean">
            <span className="card-title-text">Windows SMB Share</span>
            <Server size={16} color="var(--accent-blue)" />
          </div>
          <div className="card-mono-value">
            {smbPath}
          </div>
          <button onClick={() => copyToClipboard(smbPath, setCopiedSmb)} className="btn-pro-secondary w-full">
            {copiedSmb ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
            {copiedSmb ? 'Copied' : 'Copy SMB Path'}
          </button>
        </div>

        {/* FTP Stream */}
        <div className="pro-card">
          <div className="card-header-clean">
            <span className="card-title-text">FTP Streaming Endpoint</span>
            <Tv size={16} color="var(--accent-emerald)" />
          </div>
          <div className="card-mono-value">
            {ftpUrl}
          </div>
          <button onClick={() => copyToClipboard(ftpUrl, setCopiedFtp)} className="btn-pro-secondary w-full">
            {copiedFtp ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
            {copiedFtp ? 'Copied' : 'Copy FTP Link'}
          </button>
        </div>

      </div>

      {/* Directory Configuration & Mobile QR Split Row */}
      <div className="grid-2">
        
        {/* Directory Switcher Form */}
        <div className="pro-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Settings size={16} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Shared Root Directory</span>
          </div>

          <form onSubmit={handleUpdateRoot} style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="Path to folder..."
              className="pro-input"
            />
            <button type="submit" className="btn-pro-primary" disabled={savingPath}>
              {savingPath ? 'Saving...' : 'Apply'}
            </button>
          </form>

          {pathMessage && (
            <div style={{ marginTop: '10px', fontSize: '0.82rem', color: pathMessage.startsWith('✅') ? 'var(--accent-emerald)' : '#f87171' }}>
              {pathMessage}
            </div>
          )}
        </div>

        {/* Quick Mobile QR */}
        {networkInfo?.qrDataUrl && (
          <div className="pro-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: '#fff', padding: '8px', borderRadius: '6px', flexShrink: 0 }}>
              <img src={networkInfo.qrDataUrl} alt="Pairing QR" style={{ width: '84px', height: '84px', display: 'block' }} />
            </div>
            <div>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Mobile & TV Pair</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: '10px' }}>
                Scan with smartphone camera to open dashboard on local Wi-Fi.
              </span>
              <button className="btn-pro-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => copyToClipboard(serverUrl, setCopiedUrl)}>
                <QrCode size={13} /> Copy Mobile Link
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
