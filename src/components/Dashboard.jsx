import React, { useState, useEffect } from 'react';
import { 
  HardDrive, Wifi, QrCode, Tv, Folder, File, Film, Music, Image as ImageIcon, FileText, Archive,
  Copy, Check, Server, Settings, Search, Upload, ArrowLeft, Grid, List, Play, ExternalLink, 
  Download, RefreshCw, ChevronRight, Power, Shield
} from 'lucide-react';

export default function Dashboard({ networkInfo, onRefreshNetwork }) {
  // Clipboard copy feedback
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedSmb, setCopiedSmb] = useState(false);
  const [copiedFtp, setCopiedFtp] = useState(false);
  const [copiedM3u, setCopiedM3u] = useState(false);
  const [copiedStreamPath, setCopiedStreamPath] = useState(null);

  // Shared Directory Config State
  const [customPath, setCustomPath] = useState(networkInfo?.rootDirectory || '');
  const [savingPath, setSavingPath] = useState(false);
  const [pathMessage, setPathMessage] = useState('');

  // Integrated File Browser State
  const [currentPath, setCurrentPath] = useState('');
  const [parentPath, setParentPath] = useState(null);
  const [directories, setDirectories] = useState([]);
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  
  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedUploadFiles, setSelectedUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [activeMediaFile, setActiveMediaFile] = useState(null);

  // Network variables
  const primaryIp = networkInfo?.primaryIp || '192.168.x.x';
  const port = networkInfo?.port || 3000;
  const hostname = networkInfo?.hostname || 'PC';
  const serverUrl = networkInfo?.serverUrl || `http://${primaryIp}:${port}`;
  const smbPath = networkInfo?.smbPath || `\\\\${hostname}\\AiroSMB`;
  const ftpUrl = `ftp://${primaryIp}:2121`;
  const m3uUrl = `${serverUrl}/playlist.m3u`;
  const storage = networkInfo?.storage || { total: 0, free: 0, used: 0, percentUsed: 0 };

  const formatGb = (bytes) => (bytes / (1024 * 1024 * 1024)).toFixed(1);

  const copyToClipboard = (text, setFn) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
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
        setPathMessage('✅ Directory updated successfully.');
        if (onRefreshNetwork) onRefreshNetwork();
        fetchDirectory(customPath.trim());
      } else {
        setPathMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setPathMessage('❌ Failed to update directory path.');
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
      case 'video': return <Film size={18} />;
      case 'audio': return <Music size={18} />;
      case 'image': return <ImageIcon size={18} />;
      case 'document': return <FileText size={18} />;
      case 'archive': return <Archive size={18} />;
      default: return <File size={18} />;
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
            <span className="metric-value" style={{ color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="status-dot"></span> Active
            </span>
          </div>
        </div>
      </div>

      {/* 2. Network Addresses Connection Grid */}
      <div className="grid-4">
        
        {/* Web Access */}
        <div className="pro-card">
          <div className="card-header-clean">
            <span className="card-title-text">HTTP Web Server</span>
            <Wifi size={15} color="var(--accent-cyan)" />
          </div>
          <div className="card-mono-value">
            {serverUrl}
          </div>
          <button onClick={() => copyToClipboard(serverUrl, setCopiedUrl)} className="btn-pro-secondary w-full">
            {copiedUrl ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
            {copiedUrl ? 'Copied' : 'Copy Web Link'}
          </button>
        </div>

        {/* Windows SMB */}
        <div className="pro-card">
          <div className="card-header-clean">
            <span className="card-title-text">Windows SMB Share</span>
            <Server size={15} color="var(--accent-blue)" />
          </div>
          <div className="card-mono-value">
            {smbPath}
          </div>
          <button onClick={() => copyToClipboard(smbPath, setCopiedSmb)} className="btn-pro-secondary w-full">
            {copiedSmb ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
            {copiedSmb ? 'Copied' : 'Copy SMB Path'}
          </button>
        </div>

        {/* FTP Endpoint */}
        <div className="pro-card">
          <div className="card-header-clean">
            <span className="card-title-text">FTP Streaming</span>
            <Tv size={15} color="var(--accent-emerald)" />
          </div>
          <div className="card-mono-value">
            {ftpUrl}
          </div>
          <button onClick={() => copyToClipboard(ftpUrl, setCopiedFtp)} className="btn-pro-secondary w-full">
            {copiedFtp ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
            {copiedFtp ? 'Copied' : 'Copy FTP Link'}
          </button>
        </div>

        {/* M3U Stream Feed */}
        <div className="pro-card">
          <div className="card-header-clean">
            <span className="card-title-text">VLC M3U Feed</span>
            <Film size={15} color="var(--accent-purple)" />
          </div>
          <div className="card-mono-value">
            {m3uUrl}
          </div>
          <button onClick={() => copyToClipboard(m3uUrl, setCopiedM3u)} className="btn-pro-secondary w-full">
            {copiedM3u ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
            {copiedM3u ? 'Copied' : 'Copy Playlist Link'}
          </button>
        </div>

      </div>

      {/* 3. Core Shared Directory & Integrated File Browser Section */}
      <div className="pro-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Directory Switcher Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <Folder size={18} color="var(--accent-cyan)" />
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
            <span style={{ fontSize: '0.82rem', color: pathMessage.startsWith('✅') ? 'var(--accent-emerald)' : '#f87171' }}>
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
            <HardDrive size={14} color="var(--accent-cyan)" />
            <span 
              style={{ fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600, color: 'var(--accent-cyan)' }}
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
                    background: selectedCategory === cat ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: selectedCategory === cat ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    border: 'none', padding: '4px 8px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500 
                  }}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            {/* View Switcher */}
            <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-input)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <button 
                style={{ background: viewMode === 'grid' ? 'rgba(255,255,255,0.08)' : 'transparent', color: viewMode === 'grid' ? 'var(--text-main)' : 'var(--text-muted)', border: 'none', padding: '4px 6px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                onClick={() => setViewMode('grid')}
              >
                <Grid size={14} />
              </button>
              <button 
                style={{ background: viewMode === 'list' ? 'rgba(255,255,255,0.08)' : 'transparent', color: viewMode === 'list' ? 'var(--text-main)' : 'var(--text-muted)', border: 'none', padding: '4px 6px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                onClick={() => setViewMode('list')}
              >
                <List size={14} />
              </button>
            </div>

            <button className="btn-pro-secondary" onClick={() => fetchDirectory(currentPath)} style={{ padding: '6px 10px' }}>
              <RefreshCw size={14} className={loadingFiles ? 'spin' : ''} />
            </button>

            <button className="btn-pro-primary" onClick={() => setShowUploadModal(true)} style={{ padding: '6px 12px' }}>
              <Upload size={14} /> Upload
            </button>

          </div>

        </div>

        {/* Directory Files Output */}
        {loadingFiles ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <RefreshCw size={24} className="spin" style={{ marginBottom: '8px', color: 'var(--accent-cyan)' }} />
            <p>Loading directory content...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
            
            {/* Subfolders Grid */}
            {directories.length > 0 && selectedCategory === 'all' && !searchQuery && (
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '8px' }}>
                  Folders ({directories.length})
                </span>
                <div className="grid-4">
                  {directories.map((dir, idx) => (
                    <div 
                      key={idx} 
                      className="file-card"
                      onClick={() => fetchDirectory(dir.path)}
                      style={{ padding: '10px 12px', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <Folder size={18} color="var(--accent-blue)" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dir.name}</span>
                      </div>
                      <ChevronRight size={14} color="var(--text-muted)" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Files Grid / List */}
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '8px' }}>
                Files ({filteredFiles.length})
              </span>

              {filteredFiles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                  No matching files in this directory.
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid-4">
                  {filteredFiles.map((file, idx) => {
                    const absoluteStreamUrl = `http://${primaryIp}:${port}${file.streamUrl}`;
                    const vlcUrl = `vlc://${absoluteStreamUrl}`;

                    return (
                      <div key={idx} className="file-card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)' }}>
                            {getFileIcon(file.category)}
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                              {file.ext ? file.ext.replace('.', '') : 'FILE'}
                            </span>
                          </div>
                        </div>

                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={file.name}>
                          {file.name}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span>{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                          <span>{new Date(file.modified).toLocaleDateString()}</span>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                          {(file.category === 'video' || file.category === 'audio') && (
                            <button 
                              className="btn-pro-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem', flex: 1, justifyContent: 'center' }}
                              onClick={() => setActiveMediaFile(file)}
                              title="Play in Browser"
                            >
                              <Play size={13} /> Play
                            </button>
                          )}

                          <a 
                            href={vlcUrl}
                            className="btn-pro-secondary" 
                            style={{ padding: '4px 8px', fontSize: '0.75rem', textDecoration: 'none' }}
                            title="Open in VLC"
                          >
                            <ExternalLink size={13} /> VLC
                          </a>

                          <a 
                            href={file.downloadUrl}
                            className="btn-pro-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', textDecoration: 'none' }}
                            title="Download"
                          >
                            <Download size={13} />
                          </a>
                        </div>

                      </div>
                    );
                  })}
                </div>
              ) : (
                /* List View */
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
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, overflow: 'hidden' }}>
                          <div style={{ color: 'var(--accent-cyan)' }}>{getFileIcon(file.category)}</div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
                        </div>

                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', width: '120px' }}>
                          {(file.size / (1024 * 1024)).toFixed(1)} MB
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          {(file.category === 'video' || file.category === 'audio') && (
                            <button className="btn-pro-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setActiveMediaFile(file)}>
                              <Play size={12} /> Stream
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

      {/* 4. Active Network Engines Summary & QR Code Grid */}
      <div className="grid-2">
        
        {/* Active Engines List */}
        <div className="pro-card">
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '12px' }}>
            Active Network Engines
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-input)', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wifi size={14} color="var(--accent-cyan)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>DLNA / UPnP Media Broadcaster</span>
              </div>
              <span className="status-pill status-active" style={{ fontSize: '0.72rem' }}>UDP 1900</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-input)', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Server size={14} color="var(--accent-blue)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Windows SMB Engine</span>
              </div>
              <span className="status-pill status-active" style={{ fontSize: '0.72rem' }}>Port 4450</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-input)', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tv size={14} color="var(--accent-emerald)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>FTP High-Speed Streaming</span>
              </div>
              <span className="status-pill status-active" style={{ fontSize: '0.72rem' }}>Port 2121</span>
            </div>
          </div>
        </div>

        {/* Mobile QR Pairing */}
        {networkInfo?.qrDataUrl && (
          <div className="pro-card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ background: '#fff', padding: '6px', borderRadius: '6px', flexShrink: 0 }}>
              <img src={networkInfo.qrDataUrl} alt="Pairing QR" style={{ width: '80px', height: '80px', display: 'block' }} />
            </div>
            <div>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, display: 'block', marginBottom: '2px' }}>Mobile Wi-Fi Pairing</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                Scan to open dashboard directly on phone or tablet.
              </span>
              <button className="btn-pro-secondary" style={{ padding: '3px 8px', fontSize: '0.75rem' }} onClick={() => copyToClipboard(serverUrl, setCopiedUrl)}>
                <QrCode size={12} /> Copy URL
              </button>
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
              Target Folder: <code style={{ color: 'var(--accent-cyan)' }}>{currentPath}</code>
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
                ✕ Close
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
