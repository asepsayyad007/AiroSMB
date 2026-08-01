import React, { useState } from 'react';
import { X, Play, Download, Copy, ExternalLink, Tv, Check, Volume2 } from 'lucide-react';

export default function MediaPlayerModal({ file, networkInfo, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!file) return null;

  const primaryIp = networkInfo?.primaryIp || window.location.hostname;
  const port = networkInfo?.port || 3000;
  
  // Construct absolute network URL for VLC and external devices
  const absoluteStreamUrl = `http://${primaryIp}:${port}${file.streamUrl}`;
  const vlcProtocolUrl = `vlc://${absoluteStreamUrl}`;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isVideo = file.category === 'video';
  const isAudio = file.category === 'audio';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: isVideo ? '850px' : '550px' }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
            <div className={`file-icon ${file.category}`}>
              <Play size={20} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {file.name}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {(file.size / (1024 * 1024)).toFixed(1)} MB • {file.mimeType}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}>
            <X size={24} />
          </button>
        </div>

        {/* Player Container */}
        <div style={{ background: '#000', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: '20px', minHeight: isAudio ? '120px' : '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isVideo && (
            <video 
              controls 
              autoPlay 
              style={{ width: '100%', maxHeight: '480px', outline: 'none' }}
              src={file.streamUrl}
            >
              Your browser does not support video playback.
            </video>
          )}

          {isAudio && (
            <div style={{ padding: '30px', textCenter: 'center', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(127, 0, 255, 0.4)' }}>
                <Volume2 size={32} color="#fff" />
              </div>
              <audio controls autoPlay style={{ width: '100%' }} src={file.streamUrl}>
                Your browser does not support audio playback.
              </audio>
            </div>
          )}
        </div>

        {/* Stream Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Network Stream URL (For VLC / Smart TV)</p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', color: 'var(--accent-cyan)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {absoluteStreamUrl}
              </p>
            </div>
            <button 
              onClick={() => copyToClipboard(absoluteStreamUrl)} 
              className="btn-secondary" 
              style={{ padding: '8px 12px', fontSize: '0.8rem' }}
            >
              {copied ? <Check size={16} color="var(--accent-emerald)" /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <a 
              href={vlcProtocolUrl} 
              className="btn-primary" 
              style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
            >
              <ExternalLink size={18} />
              Open in VLC Player
            </a>

            <a 
              href={file.downloadUrl} 
              className="btn-secondary" 
              style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
            >
              <Download size={18} />
              Download File
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
