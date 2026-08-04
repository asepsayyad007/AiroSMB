import React, { useState, useEffect } from 'react';
import { 
  HardDrive, Wifi, QrCode, Tv, Folder, File, Film, Music, Image as ImageIcon, FileText, Archive,
  Copy, Check, Server, Settings, Search, Upload, ArrowLeft, Play, ExternalLink, 
  Download, RefreshCw, ChevronRight, Power, Smartphone, CheckSquare, Square
} from 'lucide-react';

const detectBrowserIp = () => {
  const host = window.location.hostname;
  if (host && host !== 'localhost' && host !== '127.0.0.1' && /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return host;
  }
  return '';
};

const detectBrowserHostname = () => {
  const host = window.location.hostname;
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return host.replace(/\.local$/i, '');
  }
  return 'Home Server';
};

export default function Dashboard({ networkInfo, onRefreshNetwork, services: propServices, onToggleService }) {
  // Shared Directory Config State
  const [customPath, setCustomPath] = useState(networkInfo?.rootDirectory || '');
  const [savingPath, setSavingPath] = useState(false);
  const [pathMessage, setPathMessage] = useState('');

  // Live Service Toggles State (3 Active Services)
  const [localServices, setLocalServices] = useState({ http: true, ftp: true, dlna: true });
  const activeServices = propServices || localServices;

  const handleToggle = (serviceName, state) => {
    if (onToggleService) {
      onToggleService(serviceName, state);
    } else {
      toggleService(serviceName, state);
    }
  };

  // Integrated File Browser State
  const [currentPath, setCurrentPath] = useState('');
  const [parentPath, setParentPath] = useState(null);
  const [directories, setDirectories] = useState([]);
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Multi-File Selection & Share to Phone State
  const [selectedFilePaths, setSelectedFilePaths] = useState([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareQrUrl, setShareQrUrl] = useState('');
  const [shareWebUrl, setShareWebUrl] = useState('');
  const [sharedFilesList, setSharedFilesList] = useState([]);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // upload state removed
  const [activeMediaFile, setActiveMediaFile] = useState(null);

  // Network variables (Physical LAN IP, zero 127.0.0.1 fallbacks)
  const primaryIp = networkInfo?.primaryIp || detectBrowserIp();
  const port = networkInfo?.port || window.location.port || 3000;
  const ftpPort = networkInfo?.ftpPort || 2121;
  const hostname = networkInfo?.hostname || detectBrowserHostname();
  const connectionType = networkInfo?.connectionType || 'Wi-Fi / Ethernet';
  const serverUrl = primaryIp ? `http://${primaryIp}:${port}` : 'Loading URL...';
  const ftpUrl = primaryIp ? `ftp://${primaryIp}:${ftpPort}` : 'Loading FTP...';
  const storage = networkInfo?.storage || { total: 0, free: 0, used: 0, percentUsed: 0 };

  const formatGb = (bytes) => (bytes / (1024 * 1024 * 1024)).toFixed(1);

  // Fetch Services Status
  const fetchServicesStatus = async () => {
    try {
      const res = await fetch('/api/services/status');
      const data = await res.json();
      if (res.ok) {
        setLocalServices({
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
        setLocalServices(prev => ({ ...prev, [serviceName]: targetState }));
      }
    } catch (err) {
      console.error(`Error toggling service ${serviceName}:`, err);
    }
  };

  // Fetch directory files
  const fetchDirectory = async (pathUrl = '') => {
    try {
      setLoadingFiles(true);
      setSelectedFilePaths([]);
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

  // Handle Updating Shared Root Directory
  const handleUpdateRoot = async (e, pathOverride) => {
    if (e && e.preventDefault) e.preventDefault();
    const rawPath = (pathOverride || customPath).trim();
    if (!rawPath) return;
    const normalizedPath = rawPath.replace(/\\/g, '/');
    try {
      setSavingPath(true);
      setPathMessage('');
      const res = await fetch('/api/network/set-root', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPath: normalizedPath })
      });
      const data = await res.json();
      if (res.ok && data.rootDirectory) {
        setPathMessage('Directory updated successfully.');
        setCustomPath(data.rootDirectory);
        if (onRefreshNetwork) await onRefreshNetwork();
        await fetchDirectory(data.rootDirectory);
      } else {
        setPathMessage(`Error: ${data.error || 'Failed to update directory'}`);
      }
    } catch (err) {
      setPathMessage('Failed to update directory path.');
    } finally {
      setSavingPath(false);
    }
  };

  const isElectron = !!(window.electronAPI && window.electronAPI.isElectron);

  const handleBrowseFolder = async () => {
    if (isElectron) {
      try {
        const selected = await window.electronAPI.selectFolder();
        if (selected) {
          setCustomPath(selected);
          handleUpdateRoot(null, selected);
        }
      } catch (err) {
        console.error('Error browsing folder:', err);
      }
    }
  };

  // Toggle file selection checkbox
  const toggleSelectFile = (filePath) => {
    setSelectedFilePaths(prev => 
      prev.includes(filePath) ? prev.filter(p => p !== filePath) : [...prev, filePath]
    );
  };

  // Select all or clear selection
  const toggleSelectAll = () => {
    if (selectedFilePaths.length === filteredFiles.length) {
      setSelectedFilePaths([]);
    } else {
      setSelectedFilePaths(filteredFiles.map(f => f.path));
    }
  };

  // Open Multi-File "Send to Phone" QR Modal
  const openShareModal = async (targetFilePaths = selectedFilePaths) => {
    if (!targetFilePaths || targetFilePaths.length === 0) return;

    const selectedFilesObj = files.filter(f => targetFilePaths.includes(f.path));
    setSharedFilesList(selectedFilesObj);

    const encodedPaths = targetFilePaths.map(p => btoa(p)).join(',');
    const shareHostIp = primaryIp || window.location.hostname;
    const fullShareUrl = `http://${shareHostIp}:${port}/share?files=${encodedPaths}`;
    setShareWebUrl(fullShareUrl);

    try {
      const qrRes = await fetch(`/api/qrcode?url=${encodeURIComponent(fullShareUrl)}`);
      if (qrRes.ok) {
        const blob = await qrRes.blob();
        setShareQrUrl(URL.createObjectURL(blob));
      }
    } catch (err) {
      console.error('Error generating QR code:', err);
    }

    setShowShareModal(true);
  };

  // Robust Clipboard Copy Helper (Handles both HTTPS & HTTP local IP)
  const copyToClipboard = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    } catch (err) {
      console.error('Fallback copy failed:', err);
    }
  };

  // Upload handler removed

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1280px', margin: '0 auto' }}>
      


      {/* Core Shared Directory & Integrated File Browser Section */}
      <div className="pro-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Directory Switcher Bar (Large & Prominent Controls) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '300px' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Shared Folder:</span>
            <form onSubmit={handleUpdateRoot} style={{ display: 'flex', gap: '8px', flex: 1, alignItems: 'center' }}>
              <input 
                type="text" 
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                onBlur={() => {
                  if (customPath.trim() && customPath.trim() !== (networkInfo?.rootDirectory || '')) {
                    handleUpdateRoot();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleUpdateRoot(e);
                  }
                }}
                placeholder="Path to folder..."
                className="pro-input"
                style={{ fontSize: '0.85rem', padding: '8px 14px', flex: 1 }}
              />
              {isElectron && (
                <button 
                  type="button" 
                  className="btn-pro-secondary" 
                  onClick={handleBrowseFolder} 
                  style={{ fontSize: '0.85rem', fontWeight: 600, padding: '8px 18px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Folder size={15} color="var(--accent-orange)" /> Browse...
                </button>
              )}
            </form>
          </div>
          {pathMessage && (
            <span style={{ fontSize: '0.82rem', color: pathMessage.startsWith('Directory') ? 'var(--accent-emerald)' : '#f87171', fontWeight: 500 }}>
              {pathMessage}
            </span>
          )}
        </div>

        {/* File Browser Controls Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Breadcrumb Trail (Strictly Scoped to Shared Root) */}
          <div className="breadcrumb-container">
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
            {(() => {
              const rootDir = networkInfo?.rootDirectory || '';
              const sep = rootDir.includes('\\') ? '\\' : '/';
              const relPath = (currentPath && rootDir && currentPath.toLowerCase().startsWith(rootDir.toLowerCase()))
                ? currentPath.substring(rootDir.length).replace(/^[/\\]+/, '')
                : '';
              const subParts = relPath ? relPath.split(/[/\\]/).filter(Boolean) : [];

              return subParts.map((part, index) => {
                const subPath = rootDir + sep + subParts.slice(0, index + 1).join(sep);
                return (
                  <React.Fragment key={index}>
                    <ChevronRight size={12} color="var(--text-muted)" />
                    <span 
                      style={{ 
                        fontSize: '0.82rem', 
                        color: index === subParts.length - 1 ? 'var(--text-main)' : 'var(--text-muted)', 
                        fontWeight: index === subParts.length - 1 ? 600 : 400,
                        cursor: index === subParts.length - 1 ? 'default' : 'pointer'
                      }}
                      onClick={() => index < subParts.length - 1 && fetchDirectory(subPath)}
                    >
                      {part}
                    </span>
                  </React.Fragment>
                );
              });
            })()}
          </div>

          {/* Search, Categories & Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            
            {/* Search Box */}
            <div className="search-container">
              <Search size={14} color="var(--text-muted)" />
              <input 
                type="text" 
                placeholder="Search files..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>

            {/* Category Pills */}
            <div className="pills-container">
              {['all', 'video', 'audio', 'image', 'document'].map(cat => (
                <button 
                  key={cat}
                  className={`pill-btn ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            <button 
              className="btn-pro-secondary" 
              onClick={() => {
                fetchDirectory(currentPath);
                if (onRefreshNetwork) onRefreshNetwork();
              }} 
              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Refresh Directory Files & Network Info"
            >
              <RefreshCw size={13} className={loadingFiles ? 'spin' : ''} />
              <span>Refresh</span>
            </button>

          </div>

        </div>

        {/* Multi-Select Floating Action Banner */}
        {selectedFilePaths.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 93, 11, 0.12)', border: '1px solid var(--accent-orange)', padding: '10px 16px', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-orange)' }}>
              {selectedFilePaths.length} file(s) selected
            </span>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-pro-secondary" style={{ padding: '5px 10px', fontSize: '0.78rem' }} onClick={() => setSelectedFilePaths([])}>
                Clear Selection
              </button>

              <button className="btn-pro-primary" style={{ padding: '5px 14px', fontSize: '0.78rem' }} onClick={() => openShareModal(selectedFilePaths)}>
                <Smartphone size={14} /> Send {selectedFilePaths.length} to Phone
              </button>
            </div>
          </div>
        )}

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
                <div className="list-container">
                  {directories.map((dir, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => fetchDirectory(dir.path)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '12px 16px', 
                        cursor: 'pointer'
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Files ({filteredFiles.length})
                </span>

                {filteredFiles.length > 0 && (
                  <button 
                    onClick={toggleSelectAll} 
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-orange)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {selectedFilePaths.length === filteredFiles.length ? <CheckSquare size={13} /> : <Square size={13} />}
                    {selectedFilePaths.length === filteredFiles.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              {filteredFiles.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                  No matching files in this directory.
                </div>
              ) : (
                <div className="list-container">
                  {filteredFiles.map((file, idx) => {
                    const isSelected = selectedFilePaths.includes(file.path);
                    const absoluteStreamUrl = primaryIp ? `http://${primaryIp}:${port}${file.streamUrl}` : file.streamUrl;
                    const vlcUrl = `vlc://${absoluteStreamUrl}`;

                    return (
                      <div 
                        key={idx} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          padding: '12px 16px', 
                          gap: '12px',
                          background: isSelected ? 'rgba(255, 93, 11, 0.06)' : 'transparent'
                        }}
                        className="list-row-hover"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, overflow: 'hidden' }}>
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectFile(file.path)}
                            style={{ cursor: 'pointer', accentColor: 'var(--accent-orange)', width: '16px', height: '16px' }}
                          />

                          {/* Category Icon Box (No Thumbnail Images) */}
                          <div style={{ flexShrink: 0, width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {file.category === 'video' ? <Film size={18} color="var(--accent-orange)" /> :
                             file.category === 'audio' ? <Music size={18} color="var(--accent-emerald)" /> :
                             file.category === 'image' ? <ImageIcon size={18} color="#3b82f6" /> :
                             <FileText size={18} color="var(--text-muted)" />}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {file.displayName || file.name}
                              </span>
                              {file.quality && (
                                <span style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  letterSpacing: '0.5px',
                                  lineHeight: '1.2',
                                  background: file.quality === '4K' ? 'rgba(234, 179, 8, 0.2)' : file.quality === 'FHD' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                                  color: file.quality === '4K' ? '#facc15' : file.quality === 'FHD' ? 'var(--accent-emerald)' : '#818cf8',
                                  border: `1px solid ${file.quality === '4K' ? 'rgba(234, 179, 8, 0.4)' : file.quality === 'FHD' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(99, 102, 241, 0.4)'}`
                                }}>
                                  {file.quality}
                                </span>
                              )}
                            </div>
                            {file.displayName && file.displayName !== file.name && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {file.name}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', width: '100px' }}>
                          {(file.size / (1024 * 1024)).toFixed(1)} MB
                        </div>

                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button 
                            className="btn-pro-secondary" 
                            style={{ padding: '4px 8px', color: 'var(--accent-orange)', borderColor: 'rgba(255, 93, 11, 0.3)' }} 
                            onClick={() => openShareModal([file.path])}
                            title="Send to Phone (Scan QR Code)"
                          >
                            <Smartphone size={14} />
                          </button>

                          {(file.category === 'video' || file.category === 'audio') && (
                            <button className="btn-pro-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => setActiveMediaFile(file)}>
                              <Play size={12} /> Play
                            </button>
                          )}
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

      {/* Multi-File "Send to Phone" QR Modal */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal-card" style={{ maxWidth: '420px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            
            <div style={{ marginBottom: '8px' }}>
              <Smartphone size={36} color="var(--accent-orange)" />
            </div>

            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '4px' }}>
              Send {sharedFilesList.length} File(s) to Phone
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Scan QR code with mobile camera to view & download on Wi-Fi:
            </p>

            {/* QR Code Container */}
            {shareQrUrl && (
              <div style={{ background: '#fff', padding: '10px', borderRadius: 'var(--radius-md)', display: 'inline-block', marginBottom: '14px' }}>
                <img src={shareQrUrl} alt="Multi-File Share QR" style={{ width: '180px', height: '180px', display: 'block' }} />
              </div>
            )}

            {/* List of Files Being Shared */}
            <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '10px', maxHeight: '140px', overflowY: 'auto', textAlign: 'left', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Selected Items ({sharedFilesList.length}):
              </span>
              {sharedFilesList.map((f, i) => (
                <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{f.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{(f.size / (1024 * 1024)).toFixed(1)}MB</span>
                </div>
              ))}
            </div>

            {/* Clickable Mobile Link Display */}
            <div style={{ marginBottom: '14px' }}>
              <input 
                type="text" 
                readOnly 
                value={shareWebUrl}
                onClick={(e) => e.target.select()}
                className="pro-input"
                style={{ width: '100%', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', textAlign: 'center', color: 'var(--accent-orange)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn-pro-secondary" 
                style={{ flex: 1, justifyContent: 'center' }} 
                onClick={() => {
                  copyToClipboard(shareWebUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
              >
                {copiedLink ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
                {copiedLink ? 'Copied to Clipboard!' : 'Copy Mobile Link'}
              </button>

              <button className="btn-pro-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowShareModal(false)}>
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Removed Upload File Modal */}

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
