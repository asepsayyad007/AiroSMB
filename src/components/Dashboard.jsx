import React, { useState, useEffect } from 'react';
import { 
  HardDrive, Wifi, QrCode, Tv, Folder, File, Film, Music, Image as ImageIcon, FileText, Archive,
  Copy, Check, Server, Settings, Search, Upload, ArrowLeft, Play, ExternalLink, 
  Download, RefreshCw, ChevronRight, Power
} from 'lucide-react';

export default function Dashboard({ networkInfo, onRefreshNetwork }) {
  // Shared Directory Config State
  const [customPath, setCustomPath] = useState(networkInfo?.rootDirectory || '');
  const [savingPath, setSavingPath] = useState(false);
  const [pathMessage, setPathMessage] = useState('');

  // Live Service Toggles State (3 Active Services)
  const [services, setServices] = useState({ http: true, ftp: true, dlna: true });

  // Integrated File Browser State
  const [currentPath, setCurrentPath] = useState('');
  const [parentPath, setParentPath] = useState(null);
  const [directories, setDirectories] = useState([]);
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Upload modal & player state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedUploadFiles, setSelectedUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [activeMediaFile, setActiveMediaFile] = useState(null);

  // Network variables
  const primaryIp = networkInfo?.primaryIp || '192.168.x.x';
  const port = networkInfo?.port || 3000;
  const hostname = networkInfo?.hostname || 'PC';
  const serverUrl = networkInfo?.serverUrl || `http://${primaryIp}:${port}`;
  const ftpUrl = `ftp://${primaryIp}:2121`;
  const m3uUrl = `${serverUrl}/playlist.m3u`;
  const storage = networkInfo?.storage || { total: 0, free: 0, used: 0, percentUsed: 0 };

  const formatGb = (bytes) => (bytes / (1024 * 1024 * 1024)).toFixed(1);

  // Fetch Services Status
  const fetchServicesStatus = async () => {
    try {
      const res = await fetch('/api/services/status');
      const data = await res.json();
      if (res.ok) {
        setServices({
          http: data.http?.enabled ?? true,
          ftp: data.ftp?.enabled ?? true,
          dlna: data.dlna?.enabled ?? true
        });
      }
    } catch (err) {
      console.error('Error fetching services status:', err);
    }
  };

  // Toggle live service ON or OFF
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

  // Fetch directory files
  const fetchDirectory = async (pathUrl = '') => {
    try {
      setLoadingFiles(true);
      const res = await fetch(`/api/files/browse?path=${encodeURIComponent(pathUrl)}`);
      const data = await res.json();
      if (res.ok) {
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

  useEffect(() => {
    fetchServicesStatus();
    fetchDirectory(networkInfo?.rootDirectory || '');
    if (networkInfo?.rootDirectory) setCustomPath(networkInfo.rootDirectory);
  }, [networkInfo]);

  // Update Shared Root Directory
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
        setPathMessage('Directory updated successfully.');
        if (onRefreshNetwork) onRefreshNetwork();
        fetchDirectory(customPath.trim());
      } else {
        setPathMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setPathMessage('Failed to update directory path.');
    } finally {
      setSavingPath(false);
    }
  };

  // Upload handler
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedUploadFiles || selectedUploadFiles.length === 0) return;
    try {
      setUploading(true);
      const formData = new FormData();
      for (let i = 0; i < selectedUploadFiles.length; i++) {
        formData.append('files', selectedUploadFiles[i]);
      }
      const res = await fetch(`/api/files/upload?path=${encodeURIComponent(currentPath)}`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        setShowUploadModal(false);
        setSelectedUploadFiles([]);
        fetchDirectory(currentPath);
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (category) => {
    switch (category) {
      case 'video': return <Film size={16} />;
      case 'audio': return <Music size={16} />;
      case 'image': return <ImageIcon size={16} />;
      case 'document': return <FileText size={16} />;
      case 'archive': return <Archive size={16} />;
      default: return <File size={16} />;
    }
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || file.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const pathParts = currentPath ? currentPath.split(/[/\\]/).filter(Boolean) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* 1. Metric Overview Bar */}
      <div className="pro-card" style={{ padding: '16px 20px' }}>
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
            <span className="metric-label">DLNA Engine</span>
            <span className="metric-value" style={{ color: services.dlna ? 'var(--accent-emerald)' : '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="status-dot" style={{ background: services.dlna ? 'var(--accent-emerald)' : '#f87171' }}></span> 
              {services.dlna ? 'Active' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. 3 Active Services Cards with Live Start/Stop Toggles */}
      <div className="grid-3">
        
        {/* HTTP Web Server */}
        <div className="pro-card">
          <div className="card-header-clean">
            <span className="card-title-text">HTTP Web Engine</span>
            <Wifi size={15} color="var(--accent-orange)" />
          </div>
          <div className="card-mono-value">
            {serverUrl}
          </div>
          <button 
            onClick={() => toggleService('http', !services.http)} 
            className="btn-pro-secondary w-full"
            style={{ justifyContent: 'center', background: services.http ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)', color: services.http ? '#f87171' : 'var(--accent-emerald)' }}
          >
            <Power size={13} /> {services.http ? 'Stop Service' : 'Start Service'}
          </button>
        </div>

        {/* FTP Streaming */}
        <div className="pro-card">
          <div className="card-header-clean">
            <span className="card-title-text">FTP Streaming</span>
            <Tv size={15} color="var(--accent-emerald)" />
          </div>
          <div className="card-mono-value">
            {ftpUrl}
          </div>
          <button 
            onClick={() => toggleService('ftp', !services.ftp)} 
            className="btn-pro-secondary w-full"
            style={{ justifyContent: 'center', background: services.ftp ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)', color: services.ftp ? '#f87171' : 'var(--accent-emerald)' }}
          >
            <Power size={13} /> {services.ftp ? 'Stop Service' : 'Start Service'}
          </button>
        </div>

        {/* DLNA Broadcaster */}
        <div className="pro-card">
          <div className="card-header-clean">
            <span className="card-title-text">DLNA Broadcaster</span>
            <Film size={15} color="var(--accent-amber)" />
          </div>
          <div className="card-mono-value">
            UDP Port 1900
          </div>
          <button 
            onClick={() => toggleService('dlna', !services.dlna)} 
            className="btn-pro-secondary w-full"
            style={{ justifyContent: 'center', background: services.dlna ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)', color: services.dlna ? '#f87171' : 'var(--accent-emerald)' }}
          >
            <Power size={13} /> {services.dlna ? 'Stop Service' : 'Start Service'}
          </button>
        </div>

      </div>

      {/* 3. Core Shared Directory & Integrated File Browser Section (Strict List View Only) */}
      <div className="pro-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Directory Switcher Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <Folder size={18} color="var(--accent-orange)" />
            <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Shared Directory:</span>
            <form onSubmit={handleUpdateRoot} style={{ display: 'flex', gap: '8px', flex: 1 }}>
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
          </div>
          {pathMessage && (
            <span style={{ fontSize: '0.82rem', color: pathMessage.startsWith('Directory') ? 'var(--accent-emerald)' : '#f87171' }}>
              {pathMessage}
            </span>
          )}
        </div>

        {/* File Browser Controls Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Breadcrumb Trail */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-input)', padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
            {parentPath && (
              <button onClick={() => fetchDirectory(parentPath)} className="btn-pro-secondary" style={{ padding: '3px 8px', fontSize: '0.78rem', marginRight: '6px' }}>
                <ArrowLeft size={13} /> Back
              </button>
            )}
            <HardDrive size={14} color="var(--accent-orange)" />
            <span 
              style={{ fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600, color: 'var(--accent-orange)' }}
              onClick={() => fetchDirectory(networkInfo?.rootDirectory)}
            >
              Shared Root
            </span>
            {pathParts.map((part, index) => (
              <React.Fragment key={index}>
                <ChevronRight size={12} color="var(--text-muted)" />
                <span style={{ fontSize: '0.82rem', color: index === pathParts.length - 1 ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: index === pathParts.length - 1 ? 600 : 400 }}>
                  {part}
                </span>
              </React.Fragment>
            ))}
          </div>

          {/* Search, Categories & Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            
            {/* Search Box */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '5px 10px', width: '200px' }}>
              <Search size={14} color="var(--text-muted)" />
              <input 
                type="text" 
                placeholder="Search files..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-main)', fontSize: '0.82rem', width: '100%' }}
              />
            </div>

            {/* Category Pills */}
            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-input)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              {['all', 'video', 'audio', 'image', 'document'].map(cat => (
                <button 
                  key={cat}
                  style={{ 
                    background: selectedCategory === cat ? 'rgba(255, 93, 11, 0.15)' : 'transparent',
                    color: selectedCategory === cat ? 'var(--accent-orange)' : 'var(--text-muted)',
                    border: 'none', padding: '4px 8px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500 
                  }}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            <button className="btn-pro-secondary" onClick={() => fetchDirectory(currentPath)} style={{ padding: '6px 10px' }}>
              <RefreshCw size={14} className={loadingFiles ? 'spin' : ''} />
            </button>

            <button className="btn-pro-primary" onClick={() => setShowUploadModal(true)} style={{ padding: '6px 12px' }}>
              <Upload size={14} /> Upload
            </button>

          </div>

        </div>

        {/* Directory Files Output (Strict List View Only) */}
        {loadingFiles ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <RefreshCw size={24} className="spin" style={{ marginBottom: '8px', color: 'var(--accent-orange)' }} />
            <p>Loading directory content...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
            
            {/* Subfolders List */}
            {directories.length > 0 && selectedCategory === 'all' && !searchQuery && (
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '8px' }}>
                  Folders ({directories.length})
                </span>
                <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  {directories.map((dir, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => fetchDirectory(dir.path)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '10px 14px', 
                        borderBottom: idx < directories.length - 1 ? '1px solid var(--border-color)' : 'none',
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                      className="list-row-hover"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Folder size={18} color="var(--accent-orange)" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-main)' }}>{dir.name}</span>
                      </div>
                      <ChevronRight size={14} color="var(--text-muted)" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Files List View */}
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '8px' }}>
                Files ({filteredFiles.length})
              </span>

              {filteredFiles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                  No matching files in this directory.
                </div>
              ) : (
                <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  {filteredFiles.map((file, idx) => {
                    const absoluteStreamUrl = `http://${primaryIp}:${port}${file.streamUrl}`;
                    const vlcUrl = `vlc://${absoluteStreamUrl}`;

                    return (
                      <div 
                        key={idx} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          padding: '10px 14px', 
                          borderBottom: idx < filteredFiles.length - 1 ? '1px solid var(--border-color)' : 'none',
                          gap: '12px'
                        }}
                        className="list-row-hover"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, overflow: 'hidden' }}>
                          <div style={{ color: 'var(--accent-orange)' }}>{getFileIcon(file.category)}</div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
                        </div>

                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', width: '100px' }}>
                          {(file.size / (1024 * 1024)).toFixed(1)} MB
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          {(file.category === 'video' || file.category === 'audio') && (
                            <button className="btn-pro-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setActiveMediaFile(file)}>
                              <Play size={12} /> Play
                            </button>
                          )}
                          <a href={vlcUrl} className="btn-pro-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', textDecoration: 'none' }}>
                            <ExternalLink size={12} /> VLC
                          </a>
                          <a href={file.downloadUrl} className="btn-pro-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', textDecoration: 'none' }}>
                            <Download size={12} />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Upload File Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '6px' }}>Upload File to PC</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Target Folder: <code style={{ color: 'var(--accent-orange)' }}>{currentPath}</code>
            </p>

            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input 
                type="file" 
                multiple 
                onChange={(e) => setSelectedUploadFiles(e.target.files)}
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: 'var(--radius-md)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              />

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn-pro-secondary" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-pro-primary" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-Browser Media Player Modal */}
      {activeMediaFile && (
        <div className="modal-overlay" onClick={() => setActiveMediaFile(null)}>
          <div className="modal-card" style={{ maxWidth: '720px', padding: '16px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '600px' }}>
                {activeMediaFile.name}
              </span>
              <button className="btn-pro-secondary" style={{ padding: '2px 8px', fontSize: '0.78rem' }} onClick={() => setActiveMediaFile(null)}>
                Close
              </button>
            </div>

            {activeMediaFile.category === 'video' ? (
              <video 
                controls 
                autoPlay 
                style={{ width: '100%', maxHeight: '420px', borderRadius: 'var(--radius-md)', background: '#000' }}
                src={`http://${primaryIp}:${port}${activeMediaFile.streamUrl}`}
              />
            ) : (
              <audio 
                controls 
                autoPlay 
                style={{ width: '100%', marginTop: '20px' }}
                src={`http://${primaryIp}:${port}${activeMediaFile.streamUrl}`}
              />
            )}
          </div>
        </div>
      )}

    </div>
  );
}
