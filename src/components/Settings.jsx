import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Server, Shield, HardDrive, Wifi, Copy, Check, Power, RefreshCw } from 'lucide-react';

export default function Settings({ networkInfo, onRefreshNetwork }) {
  const [services, setServices] = useState({ http: true, smb: true, ftp: true, dlna: true });
  const [smbStatus, setSmbStatus] = useState(null);
  const [sharedPath, setSharedPath] = useState(networkInfo?.rootDirectory || 'C:\\Users\\aseps\\Downloads');
  const [smbPortInput, setSmbPortInput] = useState(4450);
  const [savingPath, setSavingPath] = useState(false);
  const [savingSmb, setSavingSmb] = useState(false);
  const [msgPath, setMsgPath] = useState('');
  const [msgSmb, setMsgSmb] = useState('');
  const [copiedCmd, setCopiedCmd] = useState(false);

  const fetchServicesStatus = async () => {
    try {
      const res = await fetch('/api/services/status');
      const data = await res.json();
      if (res.ok) {
        setServices({
          http: data.http?.enabled ?? true,
          smb: data.smb?.enabled ?? true,
          ftp: data.ftp?.enabled ?? true,
          dlna: data.dlna?.enabled ?? true
        });
      }
    } catch (err) {
      console.error('Error fetching services status:', err);
    }
  };

  const toggleService = async (serviceName, targetState) => {
    try {
      const res = await fetch('/api/services/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceName, enable: targetState })
      });
      if (res.ok) {
        setServices(prev => ({ ...prev, [serviceName]: targetState }));
      }
    } catch (err) {
      console.error(`Error toggling service ${serviceName}:`, err);
    }
  };

  const fetchSmbStatus = async () => {
    try {
      const res = await fetch('/api/smb/status');
      const data = await res.json();
      if (res.ok) {
        setSmbStatus(data);
        if (data.port) setSmbPortInput(data.port);
      }
    } catch (err) {
      console.error('Error fetching SMB status:', err);
    }
  };

  useEffect(() => {
    fetchServicesStatus();
    fetchSmbStatus();
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
        setMsgPath('✅ Shared directory updated successfully.');
        if (onRefreshNetwork) onRefreshNetwork();
      } else {
        setMsgPath(`❌ ${data.error}`);
      }
    } catch (err) {
      setMsgPath('❌ Error updating path.');
    } finally {
      setSavingPath(false);
    }
  };

  const handleSaveSmb = async (e) => {
    e.preventDefault();
    try {
      setSavingSmb(true);
      setMsgSmb('');
      const res = await fetch('/api/smb/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPort: smbPortInput, enable: true })
      });
      const data = await res.json();
      if (res.ok) {
        setMsgSmb('✅ SMB Engine restarted on new port.');
        fetchSmbStatus();
      } else {
        setMsgSmb(`❌ ${data.error}`);
      }
    } catch (err) {
      setMsgSmb('❌ Error updating SMB port.');
    } finally {
      setSavingSmb(false);
    }
  };

  const copyDisableCmd = () => {
    navigator.clipboard.writeText('Stop-Service LanmanServer -Force; Set-Service LanmanServer -StartupType Disabled');
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* Engine Service Toggles */}
      <div className="pro-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Power size={18} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Network Engine Controls</h3>
        </div>

        <div className="grid-4">
          
          {/* HTTP */}
          <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>HTTP Web Engine</span>
              <span className="status-pill status-active" style={{ fontSize: '0.7rem' }}>Port 3000</span>
            </div>
            <button 
              className="btn-pro-secondary" 
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem' }}
              onClick={() => toggleService('http', !services.http)}
            >
              {services.http ? 'Disable Service' : 'Enable Service'}
            </button>
          </div>

          {/* SMB */}
          <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Native SMB Engine</span>
              <span className="status-pill status-active" style={{ fontSize: '0.7rem' }}>Port 4450</span>
            </div>
            <button 
              className="btn-pro-secondary" 
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem' }}
              onClick={() => toggleService('smb', !services.smb)}
            >
              {services.smb ? 'Disable Service' : 'Enable Service'}
            </button>
          </div>

          {/* FTP */}
          <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>FTP Server</span>
              <span className="status-pill status-active" style={{ fontSize: '0.7rem' }}>Port 2121</span>
            </div>
            <button 
              className="btn-pro-secondary" 
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem' }}
              onClick={() => toggleService('ftp', !services.ftp)}
            >
              {services.ftp ? 'Disable Service' : 'Enable Service'}
            </button>
          </div>

          {/* DLNA */}
          <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>DLNA Broadcaster</span>
              <span className="status-pill status-active" style={{ fontSize: '0.7rem' }}>UDP 1900</span>
            </div>
            <button 
              className="btn-pro-secondary" 
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem' }}
              onClick={() => toggleService('dlna', !services.dlna)}
            >
              {services.dlna ? 'Disable Service' : 'Enable Service'}
            </button>
          </div>

        </div>
      </div>

      {/* Main Configurations Grid */}
      <div className="grid-2">
        
        {/* SMB Port Configuration */}
        <div className="pro-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Server size={18} color="var(--accent-purple)" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>SMB Engine Settings</h3>
          </div>

          <form onSubmit={handleSaveSmb} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                SMB Engine Port:
              </label>
              <input 
                type="number" 
                value={smbPortInput} 
                onChange={(e) => setSmbPortInput(parseInt(e.target.value, 10))}
                className="pro-input"
                style={{ width: '100%' }}
              />
            </div>

            <button type="submit" className="btn-pro-primary" disabled={savingSmb} style={{ justifyContent: 'center' }}>
              {savingSmb ? 'Applying...' : 'Save SMB Configuration'}
            </button>

            {msgSmb && <p style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)' }}>{msgSmb}</p>}
          </form>
        </div>

        {/* Root Directory Configuration */}
        <div className="pro-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <HardDrive size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Root Shared Directory</h3>
          </div>

          <form onSubmit={handleSavePath} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                Folder Path:
              </label>
              <input 
                type="text" 
                value={sharedPath} 
                onChange={(e) => setSharedPath(e.target.value)}
                className="pro-input"
                style={{ width: '100%' }}
              />
            </div>

            <button type="submit" className="btn-pro-primary" disabled={savingPath} style={{ justifyContent: 'center' }}>
              {savingPath ? 'Saving...' : 'Update Directory'}
            </button>

            {msgPath && <p style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)' }}>{msgPath}</p>}
          </form>
        </div>

      </div>

      {/* Windows SMB Port 445 Command Helper */}
      <div className="pro-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Windows SMB Port 445 Disable Command</span>
          </div>

          <button onClick={copyDisableCmd} className="btn-pro-secondary" style={{ fontSize: '0.78rem' }}>
            {copiedCmd ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
            {copiedCmd ? 'Copied' : 'Copy PowerShell Command'}
          </button>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
          Run in Administrator PowerShell to allow AiroSMB to bind to default Port 445: <code style={{ color: 'var(--accent-cyan)' }}>Stop-Service LanmanServer -Force; Set-Service LanmanServer -StartupType Disabled</code>
        </p>
      </div>

    </div>
  );
}
