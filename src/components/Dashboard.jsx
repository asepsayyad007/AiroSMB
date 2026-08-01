import React, { useState } from 'react';
import { HardDrive, Wifi, QrCode, Tv, Folder, Copy, Check, Server, Shield, ArrowRight, Settings } from 'lucide-react';

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
    try {
      setSavingPath(true);
      setPathMessage('');
      const res = await fetch('/api/network/set-root', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPath: customPath })
      });
      const data = await res.json();
      if (res.ok) {
        setPathMessage('✅ Shared root path updated!');
        onRefreshNetwork();
      } else {
        setPathMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setPathMessage('❌ Error setting root directory');
    } finally {
      setSavingPath(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Welcome Hero Banner */}
      <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(16, 24, 40, 0.85), rgba(79, 172, 254, 0.1))', border: '1px solid var(--border-glow)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="badge">
                <Wifi size={14} /> LAN Online
              </span>
              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                <Shield size={14} /> No Auth (Home LAN)
              </span>
            </div>

            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px' }}>
              Welcome to <span style={{ background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-blue))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AiroSMB Home Server</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Your high-speed local file hub & VLC media streaming engine for PC, TV, and Mobile.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-primary" onClick={() => onNavigate('explorer')}>
              <Folder size={18} />
              Browse PC Files
            </button>
            <button className="btn-secondary" onClick={() => onNavigate('vlc')}>
              <Tv size={18} />
              VLC & TV Hub
            </button>
          </div>
        </div>
      </div>

      {/* Main Stats Cards Grid */}
      <div className="grid-3">
        
        {/* Storage Stats */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>PC Storage Status</span>
            <HardDrive size={20} color="var(--accent-cyan)" />
          </div>

          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {storage.total > 0 ? `${formatGb(storage.free)} GB Free` : 'PC Shared Drive'}
          </div>

          {storage.total > 0 && (
            <>
              <div className="storage-progress-bg">
                <div className="storage-progress-fill" style={{ width: `${storage.percentUsed}%` }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>{storage.percentUsed}% Used ({formatGb(storage.used)} GB)</span>
                <span>Total: {formatGb(storage.total)} GB</span>
              </div>
            </>
          )}
        </div>

        {/* Local LAN IP Card */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Local Web Server URL</span>
            <Wifi size={20} color="var(--accent-blue)" />
          </div>

          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '12px', wordBreak: 'break-all' }}>
            {serverUrl}
          </div>

          <button onClick={copyUrl} className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
            {copiedUrl ? <Check size={16} color="var(--accent-emerald)" /> : <Copy size={16} />}
            {copiedUrl ? 'URL Copied!' : 'Copy Local Web URL'}
          </button>
        </div>

        {/* Windows SMB Share Card */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Windows SMB Network Path</span>
            <Server size={20} color="var(--accent-purple)" />
          </div>

          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-purple)', marginBottom: '12px', wordBreak: 'break-all' }}>
            {smbPath}
          </div>

          <button onClick={copySmb} className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
            {copiedSmb ? <Check size={16} color="var(--accent-emerald)" /> : <Copy size={16} />}
            {copiedSmb ? 'SMB Path Copied!' : 'Copy Windows SMB Link'}
          </button>
        </div>

      </div>

      {/* QR Code Quick Pairing & Root Directory Settings */}
      <div className="grid-2">
        
        {/* Mobile Pairing Card */}
        <div className="glass-card" style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          {networkInfo?.qrDataUrl && (
            <div style={{ background: '#fff', padding: '12px', borderRadius: 'var(--radius-md)', flexShrink: 0 }}>
              <img src={networkInfo.qrDataUrl} alt="Quick Pairing QR" style={{ width: '130px', height: '130px', display: 'block' }} />
            </div>
          )}

          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>Scan to Open on Mobile / Tablet</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Point your iPhone, Android, or iPad camera at this QR code to access your PC files instantly on local Wi-Fi.
            </p>
            <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.82rem' }} onClick={copyUrl}>
              <QrCode size={16} /> Copy Direct Mobile Link
            </button>
          </div>
        </div>

        {/* Change Shared Root Folder Card */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <Settings size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Host PC Root Shared Path</h3>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Currently sharing: <code style={{ color: 'var(--accent-cyan)' }}>{networkInfo?.rootDirectory}</code>
          </p>

          <form onSubmit={handleUpdateRoot} style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="e.g. C:\Users\aseps\Downloads or D:\Movies"
              style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--text-main)', fontSize: '0.85rem' }}
            />
            <button type="submit" className="btn-primary" style={{ padding: '10px 16px' }} disabled={savingPath}>
              {savingPath ? 'Saving...' : 'Update Path'}
            </button>
          </form>

          {pathMessage && (
            <p style={{ marginTop: '10px', fontSize: '0.82rem', fontWeight: 600 }}>{pathMessage}</p>
          )}
        </div>

      </div>

    </div>
  );
}
