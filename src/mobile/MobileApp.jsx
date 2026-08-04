import React, { useState, useEffect, useRef } from 'react';
import { Wifi, Tv, Film, Users, Database, FolderOpen, ChevronRight, File, Folder, Download, Trash2, Upload, Lock, ShieldAlert, Ban } from 'lucide-react';
import './mobile.css';

export default function MobileApp() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinRequired, setPinRequired] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [adminPin, setAdminPin] = useState(''); // Store the successful PIN to use in headers

  const [networkInfo, setNetworkInfo] = useState(null);
  const [services, setServices] = useState({ http: true, ftp: true, dlna: true });
  const [clients, setClients] = useState([]);
  const [blockedClients, setBlockedClients] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');

  // File Manager State
  const [currentPath, setCurrentPath] = useState('');
  const [parentPath, setParentPath] = useState(null);
  const [directories, setDirectories] = useState([]);
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  // Helper for authenticated fetches
  const fetchAuth = async (url, options = {}) => {
    const headers = { ...options.headers };
    if (adminPin) {
      headers['x-admin-pin'] = adminPin;
    }
    return fetch(url, { ...options, headers });
  };

  useEffect(() => {
    checkSecurity();
  }, []);

  const checkSecurity = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlPin = urlParams.get('pin');
      
      if (urlPin) {
        const verifyRes = await fetch('/api/security/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: urlPin })
        });
        const verifyData = await verifyRes.json();
        
        if (verifyData.success) {
          setAdminPin(urlPin);
          setIsAuthenticated(true);
          setAuthChecked(true);
          // Remove pin from URL without reloading
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }
      }

      const res = await fetch('/api/security/status');
      const data = await res.json();
      if (res.ok) {
        if (data.isLocalhost || !data.hasPin) {
          setIsAuthenticated(true);
        } else {
          setPinRequired(true);
        }
      }
      setAuthChecked(true);
    } catch (err) {
      console.error('Failed to check security:', err);
      setAuthChecked(true);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/security/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput })
      });
      const data = await res.json();
      if (data.success) {
        setAdminPin(pinInput);
        setIsAuthenticated(true);
      } else {
        setPinError('Invalid PIN');
      }
    } catch (err) {
      setPinError('Error verifying PIN');
    }
  };

  const fetchNetworkInfo = async () => {
    try {
      const res = await fetch('/api/network/info');
      if (res.ok) {
        const data = await res.json();
        setNetworkInfo(data);
        if (!currentPath && data.rootDirectory) {
          fetchDirectory(data.rootDirectory);
        }
      }
      const resServices = await fetch('/api/services/status');
      if (resServices.ok) {
         const sData = await resServices.json();
         setServices({
           http: sData.http.enabled,
           ftp: sData.ftp.enabled,
           dlna: sData.dlna.enabled
         });
      }
    } catch (err) {
      console.error('Failed to fetch network info:', err);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
      const resBlocked = await fetchAuth('/api/clients/blocked');
      if (resBlocked.ok) {
        const bData = await resBlocked.json();
        setBlockedClients(bData.blocked || []);
      }
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };

  const handleBlock = async (ip) => {
    if (!window.confirm(`Block IP ${ip}? They will lose access to AiroShare.`)) return;
    try {
      await fetchAuth('/api/clients/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
      });
      fetchClients();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnblock = async (ip) => {
    try {
      await fetchAuth('/api/clients/unblock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip })
      });
      fetchClients();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleService = async (serviceName, targetState) => {
    setServices(prev => ({ ...prev, [serviceName]: targetState }));
    try {
      const res = await fetchAuth('/api/services/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceName, enable: targetState, state: targetState })
      });
      if (!res.ok) throw new Error('Unauthorized');
      const data = await res.json();
      if (data.services) setServices(data.services);
    } catch (err) {
      setServices(prev => ({ ...prev, [serviceName]: !targetState }));
      if (err.message === 'Unauthorized') alert('Unauthorized! Check PIN.');
    }
  };

  const fetchDirectory = async (pathUrl = '') => {
    try {
      setLoadingFiles(true);
      const res = await fetchAuth(`/api/files/browse?path=${encodeURIComponent(pathUrl)}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentPath(data.currentPath);
        setParentPath(data.parentPath);
        setDirectories(data.directories || []);
        setFiles(data.files || []);
      }
    } catch (err) {
      console.error('Failed to fetch files:', err);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleDelete = async (targetPath, isDir) => {
    if (!window.confirm(`Are you sure you want to delete this ${isDir ? 'folder' : 'file'}?`)) return;
    try {
      const res = await fetchAuth(`/api/files?path=${encodeURIComponent(targetPath)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchDirectory(currentPath);
      } else {
        alert('Failed to delete.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async (e) => {
    const filesToUpload = e.target.files;
    if (!filesToUpload || filesToUpload.length === 0) return;
    try {
      setUploading(true);
      const formData = new FormData();
      for (let i = 0; i < filesToUpload.length; i++) {
        formData.append('files', filesToUpload[i]);
      }
      const res = await fetchAuth(`/api/files/upload?path=${encodeURIComponent(currentPath)}`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        fetchDirectory(currentPath);
      } else {
        alert('Upload failed.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNetworkInfo();
      fetchClients();
      const interval = setInterval(() => {
        if (activeTab === 'dashboard') fetchNetworkInfo();
        if (activeTab === 'clients') fetchClients();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, activeTab]);

  if (!authChecked) {
    return <div className="mobile-app"><div style={{padding: '40px', textAlign: 'center', color: '#fff'}}>Loading...</div></div>;
  }

  if (!isAuthenticated && pinRequired) {
    return (
      <div className="mobile-app mobile-login-container">
        <div className="mobile-login-card">
          <ShieldAlert size={48} color="var(--accent-orange)" style={{ marginBottom: '16px' }} />
          <h2 style={{ marginBottom: '8px', color: '#fff' }}>Admin Access Required</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Please enter the Admin PIN to manage AiroShare from your mobile device.
          </p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input 
              type="password" 
              placeholder="Admin PIN" 
              className="pro-input" 
              value={pinInput} 
              onChange={e => setPinInput(e.target.value)} 
              autoFocus
            />
            {pinError && <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>{pinError}</div>}
            <button type="submit" className="btn-pro-primary" style={{ padding: '12px', justifyContent: 'center' }}>
              <Lock size={16} /> Authenticate
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-app">
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/AiroShare.svg" alt="AiroShare" width="28" height="28" />
          <h1>AiroShare Admin</h1>
        </div>
        {networkInfo && (
          <span className="mobile-header-ip">{networkInfo.primaryIp}:{networkInfo.port}</span>
        )}
      </header>

      <main className="mobile-content">
        {activeTab === 'dashboard' && (
          <div className="mobile-dashboard">
            <section className="mobile-section">
              <h2>Engines</h2>
              <div className="mobile-engine-card">
                <div className="engine-info">
                  <Wifi size={20} color={services.http ? "var(--accent-orange)" : "var(--text-muted)"} />
                  <div>
                    <strong>HTTP Web</strong>
                    <span>Port {networkInfo?.port || 9900}</span>
                  </div>
                </div>
                <button 
                  className={`mobile-toggle ${services.http ? 'active' : ''}`}
                  onClick={() => toggleService('http', !services.http)}
                >
                  <div className="toggle-knob"></div>
                </button>
              </div>

              <div className="mobile-engine-card">
                <div className="engine-info">
                  <Tv size={20} color={services.ftp ? "var(--accent-emerald)" : "var(--text-muted)"} />
                  <div>
                    <strong>FTP Stream</strong>
                    <span>Port {networkInfo?.ftpPort || 2121}</span>
                  </div>
                </div>
                <button 
                  className={`mobile-toggle ${services.ftp ? 'active' : ''}`}
                  onClick={() => toggleService('ftp', !services.ftp)}
                >
                  <div className="toggle-knob"></div>
                </button>
              </div>

              <div className="mobile-engine-card">
                <div className="engine-info">
                  <Film size={20} color={services.dlna ? "#f59e0b" : "var(--text-muted)"} />
                  <div>
                    <strong>DLNA Server</strong>
                    <span>UDP 1900</span>
                  </div>
                </div>
                <button 
                  className={`mobile-toggle ${services.dlna ? 'active' : ''}`}
                  onClick={() => toggleService('dlna', !services.dlna)}
                >
                  <div className="toggle-knob"></div>
                </button>
              </div>
            </section>

            {networkInfo && (
              <section className="mobile-section">
                <h2>Storage</h2>
                <div className="mobile-storage-card">
                  <div className="storage-text">Root: {networkInfo.rootDirectory}</div>
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="mobile-files">
            <section className="mobile-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2>File Manager</h2>
                <div style={{ position: 'relative' }}>
                  <button className="btn-pro-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? '...' : <><Upload size={14} /> Upload</>}
                  </button>
                  <input type="file" multiple ref={fileInputRef} style={{ display: 'none' }} onChange={handleUpload} />
                </div>
              </div>

              <div className="mobile-file-browser">
                <div className="file-browser-header">
                  {parentPath && (
                    <button className="btn-pro-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', marginRight: '8px' }} onClick={() => fetchDirectory(parentPath)}>
                      Back
                    </button>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-orange)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentPath}
                  </span>
                </div>

                <div className="file-list">
                  {loadingFiles ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
                  ) : (
                    <>
                      {directories.map((dir, idx) => (
                        <div key={`d-${idx}`} className="file-item">
                          <div className="file-info" onClick={() => fetchDirectory(dir.path)}>
                            <Folder size={20} color="var(--accent-orange)" style={{ flexShrink: 0 }} />
                            <span className="file-name">{dir.name}</span>
                          </div>
                          <div className="file-actions">
                            <ChevronRight size={16} color="var(--text-muted)" onClick={() => fetchDirectory(dir.path)} />
                            <Trash2 size={16} color="#ef4444" style={{ marginLeft: '12px' }} onClick={() => handleDelete(dir.path, true)} />
                          </div>
                        </div>
                      ))}
                      {files.map((f, idx) => (
                        <div key={`f-${idx}`} className="file-item">
                          <div className="file-info">
                            {/\.(mp4|mkv|avi|mov|webm|flv|m4v|ts|wmv|3gp|mpg|mpeg|m2ts|vob|ogv|jpg|jpeg|png|webp|gif|bmp)$/i.test(f.name) ? (
                              <div style={{ width: '36px', height: '36px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)' }}>
                                <img 
                                  src={`/api/thumbnail?path=${encodeURIComponent(f.path)}`} 
                                  alt={f.name} 
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                                />
                                <File size={20} color="var(--text-muted)" style={{ display: 'none' }} />
                              </div>
                            ) : (
                              <File size={20} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', marginLeft: '10px' }}>
                              <span className="file-name">{f.name}</span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>{(f.size / (1024*1024)).toFixed(1)} MB</span>
                            </div>
                          </div>
                          <div className="file-actions">
                            <a href={f.downloadUrl} download style={{ color: 'var(--text-main)' }}><Download size={16} /></a>
                            <Trash2 size={16} color="#ef4444" style={{ marginLeft: '12px' }} onClick={() => handleDelete(f.path, false)} />
                          </div>
                        </div>
                      ))}
                      {directories.length === 0 && files.length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Empty directory</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="mobile-clients">
            <section className="mobile-section">
              <h2>Connected Clients ({clients.length})</h2>
              {clients.length === 0 ? (
                <div className="mobile-empty">No active clients.</div>
              ) : (
                clients.map((c, i) => (
                  <div key={i} className="mobile-client-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong>{c.device}</strong>
                      <button onClick={() => handleBlock(c.ip)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                        <Ban size={16} />
                      </button>
                    </div>
                    <div className="client-meta">
                      <span>{c.ip}</span>
                      <span>{c.protocol}</span>
                    </div>
                    <div className="client-activity">{c.activity}</div>
                  </div>
                ))
              )}
            </section>
            
            {blockedClients.length > 0 && (
              <section className="mobile-section" style={{ marginTop: '24px' }}>
                <h2 style={{ color: '#ef4444' }}>Blocked IPs ({blockedClients.length})</h2>
                {blockedClients.map((ip, i) => (
                  <div key={i} className="mobile-client-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <strong>{ip}</strong>
                    <button className="btn-pro-secondary" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => handleUnblock(ip)}>
                      Unblock
                    </button>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}
      </main>

      <nav className="mobile-nav">
        <button 
          className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <Database size={24} />
          <span>Engines</span>
        </button>
        <button 
          className={`nav-btn ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          <FolderOpen size={24} />
          <span>Files</span>
        </button>
        <button 
          className={`nav-btn ${activeTab === 'clients' ? 'active' : ''}`}
          onClick={() => setActiveTab('clients')}
        >
          <Users size={24} />
          <span>Clients</span>
        </button>
      </nav>
    </div>
  );
}
