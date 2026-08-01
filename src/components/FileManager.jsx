import React, { useState, useEffect } from 'react';
import { 
  Folder, File, Film, Music, Image as ImageIcon, FileText, Archive, 
  Search, Upload, ArrowLeft, Grid, List, Play, ExternalLink, Download, 
  Copy, Check, HardDrive, RefreshCw, ChevronRight, Filter
} from 'lucide-react';

export default function FileManager({ networkInfo, onPlayMedia }) {
  const [currentPath, setCurrentPath] = useState('');
  const [parentPath, setParentPath] = useState(null);
  const [directories, setDirectories] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  
  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedUploadFiles, setSelectedUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [copiedPath, setCopiedPath] = useState(null);

  // Fetch directory contents
  const fetchDirectory = async (pathUrl = '') => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory(networkInfo?.rootDirectory || '');
  }, [networkInfo]);

  // Handle File Upload
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

  // Filter files based on search & category
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || file.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getFileIcon = (category) => {
    switch (category) {
      case 'video': return <Film size={22} />;
      case 'audio': return <Music size={22} />;
      case 'image': return <ImageIcon size={22} />;
      case 'document': return <FileText size={22} />;
      case 'archive': return <Archive size={22} />;
      default: return <File size={22} />;
    }
  };

  const primaryIp = networkInfo?.primaryIp || window.location.hostname;
  const port = networkInfo?.port || 3000;

  const copyFileStreamUrl = (filePath) => {
    const streamUrl = `http://${primaryIp}:${port}/api/files/stream?path=${encodeURIComponent(filePath)}`;
    navigator.clipboard.writeText(streamUrl);
    setCopiedPath(filePath);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  // Format file path breadcrumbs
  const pathParts = currentPath ? currentPath.split(/[/\\]/).filter(Boolean) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Header & Navigation Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1 }}>
          {parentPath && (
            <button onClick={() => fetchDirectory(parentPath)} className="btn-secondary" style={{ padding: '8px 12px' }}>
              <ArrowLeft size={18} />
              Back
            </button>
          )}

          {/* Breadcrumb trail */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0, 0, 0, 0.4)', padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
            <HardDrive size={16} color="var(--accent-cyan)" />
            <span 
              style={{ fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600, color: 'var(--accent-cyan)' }}
              onClick={() => fetchDirectory(networkInfo?.rootDirectory)}
            >
              Root Shared Folder
            </span>
            {pathParts.map((part, index) => (
              <React.Fragment key={index}>
                <ChevronRight size={14} color="var(--text-muted)" />
                <span style={{ fontSize: '0.85rem', color: index === pathParts.length - 1 ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: index === pathParts.length - 1 ? 700 : 400 }}>
                  {part}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={() => fetchDirectory(currentPath)}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
            <Upload size={18} />
            Upload File to PC
          </button>
        </div>
      </div>

      {/* Explorer Filter Bar */}
      <div className="glass-card" style={{ padding: '16px 20px' }}>
        <div className="explorer-controls" style={{ margin: 0 }}>
          
          {/* Search box */}
          <div className="search-box">
            <Search size={18} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Search shared files & folders..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category Filter Tabs */}
          <div className="category-tabs">
            {['all', 'video', 'audio', 'image', 'document', 'archive'].map(cat => (
              <button 
                key={cat}
                className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {/* View Mode Switcher */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <button 
              style={{ background: viewMode === 'grid' ? 'var(--accent-blue)' : 'transparent', color: viewMode === 'grid' ? '#090d16' : 'var(--text-muted)', border: 'none', padding: '6px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
              onClick={() => setViewMode('grid')}
            >
              <Grid size={16} />
            </button>
            <button 
              style={{ background: viewMode === 'list' ? 'var(--accent-blue)' : 'transparent', color: viewMode === 'list' ? '#090d16' : 'var(--text-muted)', border: 'none', padding: '6px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
              onClick={() => setViewMode('list')}
            >
              <List size={16} />
            </button>
          </div>

        </div>
      </div>

      {/* Content Section */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={32} className="spin" style={{ marginBottom: '12px', color: 'var(--accent-cyan)' }} />
          <p>Loading directory contents...</p>
        </div>
      ) : (
        <>
          {/* Folders List */}
          {directories.length > 0 && selectedCategory === 'all' && !searchQuery && (
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Folders ({directories.length})
              </h3>
              <div className="grid-4">
                {directories.map((dir, idx) => (
                  <div 
                    key={idx} 
                    className="file-card"
                    onClick={() => fetchDirectory(dir.path)}
                  >
                    <div className="file-card-top">
                      <div className="file-icon folder">
                        <Folder size={24} />
                      </div>
                      <ChevronRight size={18} color="var(--text-dim)" />
                    </div>
                    <div className="file-name">{dir.name}</div>
                    <div className="file-meta">
                      <span>Folder</span>
                      <span>{new Date(dir.modified).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files Grid */}
          <div style={{ marginTop: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Shared Files ({filteredFiles.length})
            </h3>

            {filteredFiles.length === 0 ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <Folder size={40} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <p>No matching files found in this folder.</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid-4">
                {filteredFiles.map((file, idx) => {
                  const absoluteStreamUrl = `http://${primaryIp}:${port}${file.streamUrl}`;
                  const vlcUrl = `vlc://${absoluteStreamUrl}`;

                  return (
                    <div key={idx} className="file-card">
                      <div className="file-card-top">
                        <div className={`file-icon ${file.category}`}>
                          {getFileIcon(file.category)}
                        </div>
                        <span className="badge" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                          {file.ext ? file.ext.toUpperCase().replace('.', '') : 'FILE'}
                        </span>
                      </div>

                      <div className="file-name" title={file.name}>{file.name}</div>
                      <div className="file-meta">
                        <span>{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                        <span>{new Date(file.modified).toLocaleDateString()}</span>
                      </div>

                      {/* Action buttons */}
                      <div className="file-actions">
                        {(file.category === 'video' || file.category === 'audio') && (
                          <button 
                            className="action-btn-sm" 
                            style={{ background: 'rgba(0, 242, 254, 0.15)', color: 'var(--accent-cyan)', borderColor: 'var(--accent-cyan)' }}
                            onClick={() => onPlayMedia(file)}
                            title="Play in Web Player"
                          >
                            <Play size={16} />
                          </button>
                        )}

                        <a 
                          href={vlcUrl}
                          className="action-btn-sm" 
                          title="Open in VLC"
                          style={{ textDecoration: 'none' }}
                        >
                          <ExternalLink size={16} />
                        </a>

                        <button 
                          className="action-btn-sm"
                          onClick={() => copyFileStreamUrl(file.path)}
                          title="Copy VLC Stream URL"
                        >
                          {copiedPath === file.path ? <Check size={16} color="var(--accent-emerald)" /> : <Copy size={16} />}
                        </button>

                        <a 
                          href={file.downloadUrl}
                          className="action-btn-sm"
                          title="Download"
                          style={{ textDecoration: 'none' }}
                        >
                          <Download size={16} />
                        </a>
                      </div>

                    </div>
                  );
                })}
              </div>
            ) : (
              /* List View */
              <div className="glass-card" style={{ padding: '8px' }}>
                {filteredFiles.map((file, idx) => {
                  const absoluteStreamUrl = `http://${primaryIp}:${port}${file.streamUrl}`;
                  const vlcUrl = `vlc://${absoluteStreamUrl}`;

                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifySpace: 'between', 
                        padding: '12px 16px', 
                        borderBottom: idx < filteredFiles.length - 1 ? '1px solid var(--border-color)' : 'none',
                        gap: '16px'
                      }}
                    >
                      <div className={`file-icon ${file.category}`} style={{ width: '36px', height: '36px' }}>
                        {getFileIcon(file.category)}
                      </div>

                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div className="file-name" style={{ fontSize: '0.9rem' }}>{file.name}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {(file.size / (1024 * 1024)).toFixed(1)} MB • {new Date(file.modified).toLocaleString()}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {(file.category === 'video' || file.category === 'audio') && (
                          <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => onPlayMedia(file)}>
                            <Play size={14} /> Stream
                          </button>
                        )}
                        <a href={vlcUrl} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', textDecoration: 'none' }}>
                          <ExternalLink size={14} /> VLC
                        </a>
                        <a href={file.downloadUrl} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', textDecoration: 'none' }}>
                          <Download size={14} /> Download
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Upload File to Host PC</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Target Folder: <code style={{ color: 'var(--accent-cyan)' }}>{currentPath}</code>
            </p>

            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input 
                type="file" 
                multiple 
                onChange={(e) => setSelectedUploadFiles(e.target.files)}
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: 'var(--radius-md)', color: 'var(--text-main)' }}
              />

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
