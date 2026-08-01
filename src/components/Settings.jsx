import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Server, Shield, HardDrive, Wifi, Copy, Check, RefreshCw, Power } from 'lucide-react';

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

  // Fetch Services Status
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

  // Fetch SMB Status
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
        setMsgPath('✅ Shared directory updated successfully');
        onRefreshNetwork();
      } else {
        setMsgPath(`❌ ${data.error}`);
      }
    } catch (err) {
      setMsgPath('❌ Error updating path');
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
        setMsgSmb('✅ AiroSMB Engine restarted on new port');
        fetchSmbStatus();
      } else {
        setMsgSmb(`❌ ${data.error}`);
      }
    } catch (err) {
      setMsgSmb('❌ Error updating SMB port');
    } finally {
      setSavingSmb(false);
    }
  };

  const copyDisableCmd = () => {
    navigator.clipboard.writeText('Stop-Service LanmanServer -Force; Set-Service LanmanServer -StartupType Disabled');
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const primaryIp = networkInfo?.primaryIp || '192.168.x.x';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header Banner */}
      <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(16, 24, 40, 0.9), rgba(0, 242, 254, 0.08))', border: '1px solid var(--border-glow)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#090d16' }}>
            <SettingsIcon size={26} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>AiroSMB Server Settings</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Configure your dedicated SMB engine ports, shared folders, authentication, and Windows SMB service.
            </p>
          </div>
        </div>
      </div>

      {/* Service Control Toggles Card */}
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Power size={24} color="var(--accent-cyan)" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Network Engine Service Toggles</h3>
        </div>

        <div className="grid-4">
          
          {/* HTTP Toggle */}
          <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-cyan)' }}>HTTP Web Server</span>
              <span className="badge" style={{ fontSize: '0.7rem', padding: '2px 8px', background: services.http ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: services.http ? 'var(--accent-emerald)' : '#f87171' }}>
                {services.http ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Port 3000 • Web Dashboard & M3U Streams</p>
            <button 
              className="btn-secondary" 
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', background: services.http ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: services.http ? '#f87171' : 'var(--accent-emerald)' }}
              onClick={() => toggleService('http', !services.http)}
            >
              {services.http ? 'Disable HTTP' : 'Enable HTTP'}
            </button>
          </div>

          {/* SMB Toggle */}
          <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-purple)' }}>Native SMB Engine</span>
              <span className="badge" style={{ fontSize: '0.7rem', padding: '2px 8px', background: services.smb ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: services.smb ? 'var(--accent-emerald)' : '#f87171' }}>
                {services.smb ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Port 4450 • Zero Auth SMB Shares</p>
            <button 
              className="btn-secondary" 
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', background: services.smb ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: services.smb ? '#f87171' : 'var(--accent-emerald)' }}
              onClick={() => toggleService('smb', !services.smb)}
            >
              {services.smb ? 'Disable SMB' : 'Enable SMB'}
            </button>
          </div>

          {/* FTP Toggle */}
          <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-emerald)' }}>High-Speed FTP Engine</span>
              <span className="badge" style={{ fontSize: '0.7rem', padding: '2px 8px', background: services.ftp ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: services.ftp ? 'var(--accent-emerald)' : '#f87171' }}>
                {services.ftp ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Port 2121 • High-Speed Anonymous Access</p>
            <button 
              className="btn-secondary" 
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', background: services.ftp ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: services.ftp ? '#f87171' : 'var(--accent-emerald)' }}
              onClick={() => toggleService('ftp', !services.ftp)}
            >
              {services.ftp ? 'Disable FTP' : 'Enable FTP'}
            </button>
          </div>

          {/* DLNA Toggle */}
          <div style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-amber)' }}>DLNA TV Broadcaster</span>
              <span className="badge" style={{ fontSize: '0.7rem', padding: '2px 8px', background: services.dlna ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: services.dlna ? 'var(--accent-emerald)' : '#f87171' }}>
                {services.dlna ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>UDP 1900 • Smart TV Auto-Discovery</p>
            <button 
              className="btn-secondary" 
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', background: services.dlna ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: services.dlna ? '#f87171' : 'var(--accent-emerald)' }}
              onClick={() => toggleService('dlna', !services.dlna)}
            >
              {services.dlna ? 'Disable DLNA' : 'Enable DLNA'}
            </button>
          </div>

        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid-2">
        
        {/* Card 1: AiroSMB Engine Port & Auth */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Server size={22} color="var(--accent-purple)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>AiroSMB Engine Configuration</h3>
          </div>

          <form onSubmit={handleSaveSmb} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                SMB Engine TCP Port:
              </label>
              <input 
                type="number" 
                value={smbPortInput} 
                onChange={(e) => setSmbPortInput(parseInt(e.target.value, 10))}
                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--text-main)', fontSize: '0.9rem' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                Default: <strong>4450</strong> (or <strong>445</strong> if Windows SMB is disabled).
              </span>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '12px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Shield size={20} color="var(--accent-emerald)" />
              <div>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>Anonymous Guest Access Enabled</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>VLC and mobile devices connect with zero username/password prompts.</p>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={savingSmb} style={{ width: '100%', justifyContent: 'center' }}>
              {savingSmb ? 'Applying Changes...' : 'Save SMB Engine Settings'}
            </button>

            {msgSmb && <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>{msgSmb}</p>}
          </form>
        </div>

        {/* Card 2: Shared Folder Path Config */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <HardDrive size={22} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Root Shared Directory</h3>
          </div>

          <form onSubmit={handleSavePath} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Target Folder Path:
              </label>
              <input 
                type="text" 
                value={sharedPath} 
                onChange={(e) => setSharedPath(e.target.value)}
                placeholder="C:\Users\aseps\Downloads"
                style={{ width: '100%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--text-main)', fontSize: '0.9rem' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                Default: <strong>C:\Users\aseps\Downloads</strong>
              </span>
            </div>

            <button type="submit" className="btn-primary" disabled={savingPath} style={{ width: '100%', justifyContent: 'center' }}>
              {savingPath ? 'Saving...' : 'Update Shared Directory'}
            </button>

            {msgPath && <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>{msgPath}</p>}
          </form>
        </div>

      </div>

      {/* Windows SMB Deactivation Helper Card */}
      <div className="glass-card" style={{ borderLeft: '4px solid #f87171' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Power size={22} color="#f87171" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f87171' }}>Windows SMB Service Control</h3>
          </div>

          <button onClick={copyDisableCmd} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem' }}>
            {copiedCmd ? <Check size={16} color="var(--accent-emerald)" /> : <Copy size={16} />}
            {copiedCmd ? 'Command Copied!' : 'Copy Permanent Disable Command'}
          </button>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
          To allow AiroSMB to use <strong>Port 445</strong> exclusively, run this command in <strong>Administrator PowerShell</strong>:
        </p>

        <code style={{ display: 'block', background: '#000', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: '#f87171', fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all' }}>
          Stop-Service LanmanServer -Force; Set-Service LanmanServer -StartupType Disabled
        </code>
      </div>

    </div>
  );
}
