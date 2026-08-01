import React, { useState } from 'react';
import { HardDrive, Wifi, QrCode, Tv, Folder, Copy, Check, Server, Shield, Settings, Play, Radio } from 'lucide-react';

export default function Dashboard({ networkInfo, onNavigate, onRefreshNetwork }) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSmb, setCopiedSmb] = useState(false);
  const [customPath, setCustomPath] = useState(networkInfo?.rootDirectory || '');
  const [savingPath, setSavingPath] = useState(false);
  const [pathMessage, setPathMessage] = useState('');

  const primaryIp = networkInfo?.primaryIp || '192.168.x.x';
  const port = networkInfo?.port || 3000;
  const serverUrl = networkInfo?.serverUrl || `http://${primaryIp}:${port}`;
  const smbPath = networkInfo?.smbPath || `\\\\${networkInfo?.hostname || 'PC'}\\AiroSMB`;
  const storage = networkInfo?.storage || { total: 0, free: 0, used: 0, percentUsed: 0 };

  const formatGb = (bytes) => (bytes / (1024 * 1024 * 1024)).toFixed(1);

  const copyUrl = () => {
    navigator.clipboard.writeText(serverUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const copySmb = () => {
    navigator.clipboard.writeText(smbPath);
    setCopiedSmb(true);
    setTimeout(() => setCopiedSmb(false), 2000);
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
        setPathMessage('✅ Shared root path updated successfully!');
        if (onRefreshNetwork) onRefreshNetwork();
      } else {
        setPathMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setPathMessage('❌ Error updating shared directory path');
    } finally {
      setSavingPath(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Professional Server Status Header */}
      <div className="pro-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span className="status-pill status-active">
                <span className="status-dot"></span> Server Active
              </span>
              <span className="status-pill">
                <Wifi size={13} /> {primaryIp}
              </span>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', margin: '4px 0' }}>
              AiroSMB Home Server
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Local Network File Sharing & DLNA / UPnP Media Engine
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-pro-primary" onClick={() => onNavigate('explorer')}>
              <Folder size={16} /> Open Files
            </button>
            <button className="btn-pro-secondary" onClick={() => onNavigate('vlc')}>
              <Tv size={16} /> Stream Hub
            </button>
          </div>
        </div>
      </div>

      {/* 3 Main Connection & Storage Cards */}
      <div className="grid-3">
        
        {/* Storage Card */}
        <div className="pro-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              PC Shared Disk Space
            </span>
            <HardDrive size={18} color="var(--accent-blue)" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
            {storage.total > 0 ? `${formatGb(storage.free)} GB Free` : 'Shared Drive'}
          </div>
          {storage.total > 0 ? (
            <>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${storage.percentUsed}%` }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <span>{storage.percentUsed}% Used ({formatGb(storage.used)} GB)</span>
                <span>Total: {formatGb(storage.total)} GB</span>
              </div>
            </>
          ) : (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Storage information available</p>
          )}
        </div>

        {/* Web URL Card */}
        <div className="pro-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Web Dashboard Access
            </span>
            <Wifi size={18} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.05rem', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '16px', wordBreak: 'break-all' }}>
            {serverUrl}
          </div>
          <button onClick={copyUrl} className="btn-pro-secondary" style={{ width: '100%', justifyContent: 'center' }}>
            {copiedUrl ? <Check size={15} color="var(--accent-emerald)" /> : <Copy size={15} />}
            {copiedUrl ? 'Copied to Clipboard' : 'Copy Web Address'}
          </button>
        </div>

        {/* SMB Share Card */}
        <div className="pro-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Windows SMB Share Path
            </span>
            <Server size={18} color="var(--accent-purple)" />
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '16px', wordBreak: 'break-all' }}>
            {smbPath}
          </div>
          <button onClick={copySmb} className="btn-pro-secondary" style={{ width: '100%', justifyContent: 'center' }}>
            {copiedSmb ? <Check size={15} color="var(--accent-emerald)" /> : <Copy size={15} />}
            {copiedSmb ? 'Copied SMB Path' : 'Copy Windows SMB Link'}
          </button>
        </div>

      </div>

      {/* Services Status & Configuration Grid */}
      <div className="grid-2">
        
        {/* Active Engine Summary */}
        <div className="pro-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', color: 'var(--text-main)' }}>
            Active Network Engines
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
            <div className="service-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Radio size={16} color="var(--accent-cyan)" />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>DLNA / UPnP Media Server</span>
              </div>
              <span className="status-pill status-active" style={{ fontSize: '0.75rem' }}>Broadcasting (1900)</span>
            </div>

            <div className="service-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Server size={16} color="var(--accent-purple)" />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Windows SMB Share</span>
              </div>
              <span className="status-pill status-active" style={{ fontSize: '0.75rem' }}>Port 4450</span>
            </div>

            <div className="service-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Wifi size={16} color="var(--accent-blue)" />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Web Stream Engine</span>
              </div>
              <span className="status-pill status-active" style={{ fontSize: '0.75rem' }}>Port {port}</span>
            </div>

          </div>
        </div>

        {/* Change Shared Path Form */}
        <div className="pro-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Settings size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>Shared Folder Settings</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Current directory: <code style={{ color: 'var(--accent-cyan)', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>{networkInfo?.rootDirectory}</code>
          </p>

          <form onSubmit={handleUpdateRoot} style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="e.g. C:\Users\aseps\Downloads\Video"
              className="pro-input"
            />
            <button type="submit" className="btn-pro-primary" style={{ padding: '8px 14px', fontSize: '0.85rem' }} disabled={savingPath}>
              {savingPath ? 'Saving...' : 'Update'}
            </button>
          </form>

          {pathMessage && (
            <p style={{ marginTop: '10px', fontSize: '0.82rem', fontWeight: 600 }}>{pathMessage}</p>
          )}
        </div>

      </div>

      {/* Mobile Pairing Card */}
      {networkInfo?.qrDataUrl && (
        <div className="pro-card" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', flexShrink: 0 }}>
            <img src={networkInfo.qrDataUrl} alt="Pairing QR" style={{ width: '110px', height: '110px', display: 'block' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '4px' }}>Quick Mobile / TV Connection</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Scan this QR code using your smartphone camera to connect to your PC files on Wi-Fi without entering URLs manually.
            </p>
            <button className="btn-pro-secondary" style={{ padding: '5px 12px', fontSize: '0.8rem' }} onClick={copyUrl}>
              <QrCode size={14} /> Copy Mobile Link
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
