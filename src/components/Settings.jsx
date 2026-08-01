import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, HardDrive, Tv, Wifi, Check, RefreshCw } from 'lucide-react';

export default function Settings({ networkInfo, onRefreshNetwork }) {
  const [sharedPath, setSharedPath] = useState(networkInfo?.rootDirectory || 'C:\\Users\\aseps\\Downloads\\Video');
  const [ftpPortInput, setFtpPortInput] = useState(2121);
  const [savingPath, setSavingPath] = useState(false);
  const [savingFtp, setSavingFtp] = useState(false);
  const [msgPath, setMsgPath] = useState('');
  const [msgFtp, setMsgFtp] = useState('');

  const fetchFtpStatus = async () => {
    try {
      const res = await fetch('/api/ftp/status');
      const data = await res.json();
      if (res.ok && data.port) {
        setFtpPortInput(data.port);
      }
    } catch (err) {
      console.error('Error fetching FTP status:', err);
    }
  };

  useEffect(() => {
    fetchFtpStatus();
  }, []);

  const handleSavePath = async (e) => {
    e.preventDefault();
    try {
      setSavingPath(true);
      setMsgPath('');
      const res = await fetch('/api/network/set-root', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPath: sharedPath })
      });
      const data = await res.json();
      if (res.ok) {
        setMsgPath('Shared directory updated successfully.');
        if (onRefreshNetwork) onRefreshNetwork();
      } else {
        setMsgPath(`Error: ${data.error}`);
      }
    } catch (err) {
      setMsgPath('Error updating directory path.');
    } finally {
      setSavingPath(false);
    }
  };

  const handleSaveFtp = async (e) => {
    e.preventDefault();
    try {
      setSavingFtp(true);
      setMsgFtp('');
      const res = await fetch('/api/ftp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPort: ftpPortInput, enable: true })
      });
      const data = await res.json();
      if (res.ok) {
        setMsgFtp('FTP Server restarted on new port.');
        fetchFtpStatus();
      } else {
        setMsgFtp(`Error: ${data.error}`);
      }
    } catch (err) {
      setMsgFtp('Error updating FTP port.');
    } finally {
      setSavingFtp(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* Important Configuration Section Header */}
      <div className="pro-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <SettingsIcon size={20} color="var(--accent-orange)" />
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Server Core Configurations
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Configure host root directory paths, FTP server streaming ports, and network engine options.
            </p>
          </div>
        </div>
      </div>

      {/* Main Configurations Grid */}
      <div className="grid-2">
        
        {/* Root Directory Configuration */}
        <div className="pro-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <HardDrive size={18} color="var(--accent-orange)" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Root Shared Directory</h3>
          </div>

          <form onSubmit={handleSavePath} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                Default Target Folder Path:
              </label>
              <input 
                type="text" 
                value={sharedPath} 
                onChange={(e) => setSharedPath(e.target.value)}
                className="pro-input"
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                System default: <code style={{ color: 'var(--accent-orange)' }}>C:\Users\aseps\Downloads\Video</code>
              </span>
            </div>

            <button type="submit" className="btn-pro-primary" disabled={savingPath} style={{ justifyContent: 'center' }}>
              {savingPath ? 'Saving...' : 'Update Root Directory'}
            </button>

            {msgPath && <p style={{ fontSize: '0.82rem', color: 'var(--accent-emerald)' }}>{msgPath}</p>}
          </form>
        </div>

        {/* FTP Server Port Configuration */}
        <div className="pro-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Tv size={18} color="var(--accent-emerald)" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>FTP Server Port & Options</h3>
          </div>

          <form onSubmit={handleSaveFtp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                FTP Streaming Port:
              </label>
              <input 
                type="number" 
                value={ftpPortInput} 
                onChange={(e) => setFtpPortInput(parseInt(e.target.value, 10))}
                className="pro-input"
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                Default: <strong>2121</strong> (Anonymous access enabled for zero-password VLC streaming).
              </span>
            </div>

            <button type="submit" className="btn-pro-primary" disabled={savingFtp} style={{ justifyContent: 'center' }}>
              {savingFtp ? 'Applying...' : 'Save FTP Port Settings'}
            </button>

            {msgFtp && <p style={{ fontSize: '0.82rem', color: 'var(--accent-emerald)' }}>{msgFtp}</p>}
          </form>
        </div>

      </div>

      {/* DLNA SSDP Broadcaster Settings Card */}
      <div className="pro-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Wifi size={18} color="var(--accent-orange)" />
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>DLNA & UPnP Auto-Discovery Settings</h3>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          DLNA SSDP multicast is broadcasting on UDP port <strong>1900</strong> (address <code>239.255.255.250</code>). Smart TVs and VLC players on local Wi-Fi will automatically discover AiroShare without manual configuration.
        </p>
      </div>

    </div>
  );
}
