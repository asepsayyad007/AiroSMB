import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, HardDrive, Tv, Wifi, Check, Folder, ChevronRight, Film, Lock, ShieldAlert, Ban, Info, Server } from 'lucide-react';

export default function Settings({ networkInfo, onRefreshNetwork }) {
  const isElectron = !!(window.electronAPI && window.electronAPI.isElectron);
  const [activeTab, setActiveTab] = useState('storage');

  // State
  const [isAutostart, setIsAutostart] = useState(false);
  const [sharedPath, setSharedPath] = useState(networkInfo?.rootDirectory || '');
  const [ftpPortInput, setFtpPortInput] = useState(2121);
  const [directoriesInfo, setDirectoriesInfo] = useState({ shortcuts: [], drives: [] });
  const [adminPin, setAdminPin] = useState('');
  const [blockedClients, setBlockedClients] = useState([]);
  
  // UI feedback states
  const [savingPath, setSavingPath] = useState(false);
  const [savingFtp, setSavingFtp] = useState(false);
  const [savingPin, setSavingPin] = useState(false);
  const [msgPath, setMsgPath] = useState('');
  const [msgFtp, setMsgFtp] = useState('');
  const [msgPin, setMsgPin] = useState('');

  // Initial Data Fetch
  useEffect(() => {
    if (isElectron) {
      window.electronAPI.getAutostartSettings().then(val => setIsAutostart(val));
    }
    fetchFtpStatus();
    fetchShortcutDirs();
    fetchSecurityStatus();
    fetchBlockedClients();
  }, [isElectron]);

  useEffect(() => {
    if (networkInfo?.rootDirectory) setSharedPath(networkInfo.rootDirectory);
  }, [networkInfo]);

  // Fetch Methods
  const fetchFtpStatus = async () => {
    try {
      const res = await fetch('/api/ftp/status');
      const data = await res.json();
      if (res.ok && data.port) setFtpPortInput(data.port);
    } catch (err) { console.error(err); }
  };

  const fetchShortcutDirs = async () => {
    try {
      const res = await fetch('/api/network/shortcut-directories');
      const data = await res.json();
      if (res.ok) setDirectoriesInfo(data);
    } catch (err) { console.error(err); }
  };

  const fetchSecurityStatus = async () => {
    try {
      const res = await fetch('/api/security/status');
      const data = await res.json();
      if (res.ok && data.hasPin) setAdminPin('********');
    } catch (err) { console.error(err); }
  };

  const fetchBlockedClients = async () => {
    try {
      const res = await fetch('/api/clients/blocked');
      if (res.ok) {
        const data = await res.json();
        setBlockedClients(data.blocked || []);
      }
    } catch (err) { console.error(err); }
  };

  // Actions
  const handleBrowseFolder = async () => {
    try {
      const selected = await window.electronAPI.selectFolder();
      if (selected) setSharedPath(selected);
    } catch (err) { console.error(err); }
  };

  const handleSavePath = async (e) => {
    e.preventDefault();
    try {
      setSavingPath(true); setMsgPath('');
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
      setTimeout(() => setMsgPath(''), 3000);
    }
  };

  const handleSaveFtp = async (e) => {
    e.preventDefault();
    try {
      setSavingFtp(true); setMsgFtp('');
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
      setTimeout(() => setMsgFtp(''), 3000);
    }
  };

  const handleSavePin = async (e) => {
    e.preventDefault();
    try {
      setSavingPin(true); setMsgPin('');
      const res = await fetch('/api/security/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: adminPin === '********' ? '' : adminPin })
      });
      if (res.ok) {
        setMsgPin('Admin PIN updated successfully.');
      } else {
        setMsgPin(`Error saving PIN.`);
      }
    } catch (err) {
      setMsgPin('Error updating Admin PIN.');
    } finally {
      setSavingPin(false);
      setTimeout(() => setMsgPin(''), 3000);
    }
  };

  const handleUnblock = async (ip) => {
    try {
      await fetch('/api/clients/unblock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
      });
      fetchBlockedClients();
    } catch (err) { console.error(err); }
  };

  // Nav Items
  const navItems = [
    { id: 'storage', icon: HardDrive, label: 'Storage & Network' },
    { id: 'security', icon: ShieldAlert, label: 'Security' },
    ...(isElectron ? [{ id: 'system', icon: SettingsIcon, label: 'System Options' }] : []),
    { id: 'about', icon: Info, label: 'About & Privacy' }
  ];

  return (
    <div style={{ display: 'flex', gap: '32px', maxWidth: '1200px', margin: '0 auto', height: '100%', minHeight: '600px' }}>
      
      {/* Sidebar Navigation */}
      <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '16px', paddingLeft: '12px' }}>
          Settings
        </h2>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: isActive ? 'linear-gradient(90deg, rgba(255,93,11,0.15) 0%, transparent 100%)' : 'transparent',
                border: 'none',
                borderLeft: isActive ? '3px solid var(--accent-orange)' : '3px solid transparent',
                borderRadius: '0 8px 8px 0',
                color: isActive ? '#fff' : 'var(--text-muted)',
                fontSize: '0.95rem',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'left'
              }}
            >
              <Icon size={18} color={isActive ? 'var(--accent-orange)' : 'var(--text-muted)'} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '16px 24px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', overflowY: 'auto' }}>
        
        {/* STORAGE & NETWORK TAB */}
        {activeTab === 'storage' && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Folder size={22} color="var(--accent-orange)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', margin: 0 }}>Root Shared Directory</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Set the master folder that will be shared across your local network via HTTP, FTP, and DLNA.
              </p>
              
              <form onSubmit={handleSavePath} className="pro-card" style={{ background: 'rgba(255,255,255,0.02)', padding: '24px' }}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <input 
                    type="text" 
                    value={sharedPath} 
                    onChange={(e) => setSharedPath(e.target.value)}
                    readOnly={isElectron}
                    className="pro-input"
                    style={{ flex: 1, fontSize: '0.9rem', padding: '12px' }}
                  />
                  {isElectron && (
                    <button type="button" className="btn-pro-secondary" onClick={handleBrowseFolder} style={{ padding: '0 20px' }}>
                      Browse
                    </button>
                  )}
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>Quick Select</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {directoriesInfo.shortcuts.map((shortcut, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSharedPath(shortcut.path)}
                        style={{
                          background: sharedPath === shortcut.path ? 'rgba(255,93,11,0.1)' : 'transparent',
                          border: `1px solid ${sharedPath === shortcut.path ? 'var(--accent-orange)' : 'var(--border-color)'}`,
                          color: sharedPath === shortcut.path ? 'var(--accent-orange)' : 'var(--text-main)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Folder size={14} /> {shortcut.name}
                      </button>
                    ))}
                    {directoriesInfo.drives.map((drive, i) => (
                      <button
                        key={`d-${i}`}
                        type="button"
                        onClick={() => setSharedPath(drive)}
                        style={{
                          background: sharedPath === drive ? 'rgba(255,93,11,0.1)' : 'transparent',
                          border: `1px solid ${sharedPath === drive ? 'var(--accent-orange)' : 'var(--border-color)'}`,
                          color: sharedPath === drive ? 'var(--accent-orange)' : 'var(--text-main)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <HardDrive size={14} /> {drive}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button type="submit" className="btn-pro-primary" disabled={savingPath}>
                    {savingPath ? 'Applying...' : 'Apply Directory'}
                  </button>
                  {msgPath && <span style={{ fontSize: '0.85rem', color: msgPath.startsWith('Error') ? '#ef4444' : '#10b981' }}>{msgPath}</span>}
                </div>
              </form>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Server size={22} color="var(--accent-emerald)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', margin: 0 }}>FTP Server Port</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Change the port used by the built-in FTP Engine. Leave as 2121 for best compatibility with VLC.
              </p>
              
              <form onSubmit={handleSaveFtp} className="pro-card" style={{ background: 'rgba(255,255,255,0.02)', padding: '24px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
                  <input 
                    type="number" 
                    value={ftpPortInput} 
                    onChange={(e) => setFtpPortInput(parseInt(e.target.value, 10))}
                    className="pro-input"
                    style={{ width: '120px', fontSize: '1rem', padding: '10px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button type="submit" className="btn-pro-primary" disabled={savingFtp} style={{ background: 'var(--accent-emerald)' }}>
                    {savingFtp ? 'Restarting FTP...' : 'Save & Restart FTP'}
                  </button>
                  {msgFtp && <span style={{ fontSize: '0.85rem', color: msgFtp.startsWith('Error') ? '#ef4444' : '#10b981' }}>{msgFtp}</span>}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Lock size={22} color="#ef4444" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', margin: 0 }}>Mobile Admin Authentication</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Set a PIN to secure the Admin Dashboard when accessing from a mobile device or remote computer. Connections originating from this PC will automatically bypass this PIN.
              </p>
              
              <form onSubmit={handleSavePin} className="pro-card" style={{ background: 'rgba(255,255,255,0.02)', padding: '24px' }}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                  <input 
                    type="password" 
                    placeholder="No PIN (Open Access)"
                    value={adminPin} 
                    onChange={(e) => setAdminPin(e.target.value)}
                    className="pro-input"
                    style={{ flex: 1, maxWidth: '300px' }}
                  />
                  {adminPin && adminPin !== '********' && (
                    <button 
                      type="button" 
                      className="btn-pro-secondary" 
                      onClick={() => { setAdminPin(''); handleSavePin({ preventDefault: () => {} }); }} 
                    >
                      Clear PIN
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button type="submit" className="btn-pro-primary" disabled={savingPin} style={{ background: '#ef4444' }}>
                    {savingPin ? 'Saving...' : 'Set Admin PIN'}
                  </button>
                  {msgPin && <span style={{ fontSize: '0.85rem', color: msgPin.startsWith('Error') ? '#ef4444' : '#10b981' }}>{msgPin}</span>}
                </div>
              </form>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Ban size={22} color="#ef4444" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', margin: 0 }}>Blocked Clients</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Manage IP addresses that have been permanently blocked from accessing any AiroShare services (HTTP/FTP/DLNA).
              </p>
              
              <div className="pro-card" style={{ background: 'rgba(255,255,255,0.02)', padding: '24px' }}>
                {blockedClients.length === 0 ? (
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>
                    No blocked clients.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {blockedClients.map((ip, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px 16px', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>{ip}</span>
                        <button className="btn-pro-secondary" onClick={() => handleUnblock(ip)} style={{ borderColor: 'rgba(239, 68, 68, 0.5)', color: '#ef4444' }}>
                          Revoke Block
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SYSTEM TAB */}
        {activeTab === 'system' && isElectron && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <SettingsIcon size={22} color="var(--accent-orange)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', margin: 0 }}>Desktop Integration</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Control how AiroShare integrates with your Windows operating system.
              </p>
              
              <div className="pro-card" style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox"
                    checked={isAutostart}
                    onChange={async (e) => {
                      const newVal = e.target.checked;
                      const result = await window.electronAPI.setAutostartSettings(newVal);
                      setIsAutostart(result);
                    }}
                    style={{ width: '20px', height: '20px', accentColor: 'var(--accent-orange)', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#fff' }}>Launch on System Startup</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Automatically start the background server when you log into Windows.</div>
                  </div>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'not-allowed', opacity: 0.7 }}>
                  <input 
                    type="checkbox"
                    checked={true}
                    disabled
                    style={{ width: '20px', height: '20px', accentColor: 'var(--accent-orange)' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#fff' }}>Minimize to System Tray</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Closing the window will keep the server running silently in the background.</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ABOUT TAB */}
        {activeTab === 'about' && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <Info size={22} color="var(--accent-orange)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', margin: 0 }}>Privacy & Legal Compliance</h3>
              </div>
              <div className="pro-card" style={{ background: 'rgba(255,255,255,0.02)', padding: '24px' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
                  AiroShare operates <strong style={{ color: '#fff' }}>100% locally</strong> on your machine and private network. It collects zero telemetry, aggregates no usage statistics, and makes no outbound internet requests. This utility is fully compliant under GDPR, CCPA, and COPPA by design. Your files never leave your local network.
                </p>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', margin: 0 }}>Open Source Credits</h3>
              </div>
              <div className="pro-card" style={{ background: 'rgba(255,255,255,0.02)', padding: '24px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                  Built by <strong style={{ color: '#fff' }}>Asep Sayyad</strong>. AiroShare stands on the shoulders of these incredible open-source projects:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  {[
                    { name: 'Electron', desc: 'App Wrapper' },
                    { name: 'React & Vite', desc: 'UI Framework' },
                    { name: 'Express', desc: 'HTTP Server API' },
                    { name: 'ftp-srv', desc: 'FTP Engine' },
                    { name: 'simple-upnp-dlna', desc: 'SSDP Broadcaster' },
                    { name: 'Lucide', desc: 'Iconography' },
                  ].map(tech => (
                    <div key={tech.name} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>{tech.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{tech.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
