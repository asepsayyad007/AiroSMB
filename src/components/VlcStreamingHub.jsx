import React, { useState } from 'react';
import { Tv, Play, Download, Copy, Check, QrCode, Monitor, Server, ShieldCheck, ExternalLink, HelpCircle } from 'lucide-react';

export default function VlcStreamingHub({ networkInfo, currentPath }) {
  const [copiedSmb, setCopiedSmb] = useState(false);
  const [copiedHttp, setCopiedHttp] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const primaryIp = networkInfo?.primaryIp || '192.168.x.x';
  const port = networkInfo?.port || 3000;
  const hostname = networkInfo?.hostname || 'YOUR-PC';
  const serverUrl = networkInfo?.serverUrl || `http://${primaryIp}:${port}`;

  const smbWindowsPath = `\\\\${hostname}\\AiroSMB`;
  const smbVlcPath = `smb://${primaryIp}/AiroSMB`;
  const m3uPlaylistUrl = `/api/vlc/playlist?path=${encodeURIComponent(currentPath || networkInfo?.rootDirectory || '')}`;

  const copyText = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'smb') {
      setCopiedSmb(true);
      setTimeout(() => setCopiedSmb(false), 2000);
    } else {
      setCopiedHttp(true);
      setTimeout(() => setCopiedHttp(false), 2000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header Banner */}
      <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(16, 24, 40, 0.9), rgba(0, 242, 254, 0.08))', border: '1px solid var(--border-glow)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Tv size={28} color="var(--accent-cyan)" />
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>VLC & Smart TV Streaming Center</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '650px' }}>
              Stream your PC files directly to VLC Media Player on TV, Mobile, or iPad using HTTP Streams, M3U Playlists, or Windows SMB Shares.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <a href={m3uPlaylistUrl} className="btn-primary" style={{ textDecoration: 'none' }}>
              <Download size={18} />
              Export VLC .M3U Playlist
            </a>
            <button className="btn-secondary" onClick={() => setShowQrModal(true)}>
              <QrCode size={18} />
              TV Pairing QR
            </button>
          </div>
        </div>
      </div>

      {/* Main Options Grid */}
      <div className="grid-2">
        
        {/* Method 1: VLC HTTP Direct Streaming */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'rgba(0, 242, 254, 0.15)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Play size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>1. Direct HTTP Network Stream</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Best for Instant VLC playback on TV & Mobile</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
                {serverUrl}/playlist.m3u
              </span>
              <button onClick={() => copyText(`${serverUrl}/playlist.m3u`, 'http')} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                {copiedHttp ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
                {copiedHttp ? 'Copied' : 'Copy M3U Link'}
              </button>
            </div>
          </div>
        </div>

        {/* Method 2: High-Speed FTP Server (SMB Fallback) */}
        <div className="glass-card" style={{ border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Server size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>2. High-Speed FTP Server</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>VLC Local Network FTP (100% Reliable SMB Fallback)</p>
              </div>
            </div>
            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)' }}>
              No Password
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.88rem', color: 'var(--accent-emerald)' }}>
                ftp://{primaryIp}:2121
              </span>
              <button onClick={() => copyText(`ftp://${primaryIp}:2121`, 'ftp')} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                <Copy size={14} /> Copy FTP Link
              </button>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              💡 In VLC ➔ Go to <strong>Network / FTP</strong> ➔ Paste <code style={{ color: 'var(--accent-emerald)' }}>ftp://{primaryIp}:2121</code>. Zero login required!
            </p>
          </div>
        </div>

        {/* Method 3: Plex & DLNA Media Engine */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'rgba(255, 183, 3, 0.15)', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Tv size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>3. Plex & DLNA Media Feed</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Plex, Kodi, and Smart TV Media Feed</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', color: 'var(--accent-amber)' }}>
                {serverUrl}/api/plex/feed
              </span>
              <button onClick={() => copyText(`${serverUrl}/api/plex/feed`, 'plex')} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                <Copy size={14} /> Copy Plex Feed
              </button>
            </div>
          </div>
        </div>

        {/* Method 4: AiroSMB Custom SMB Engine */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'rgba(127, 0, 255, 0.15)', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Server size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>4. AiroSMB Native SMB Engine</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TCP Port 4450 / 445 (Zero Auth)</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: 'rgba(0, 0, 0, 0.4)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', color: 'var(--accent-purple)' }}>
                smb://{primaryIp}:4450/AiroSMB
              </span>
              <button onClick={() => copyText(`smb://${primaryIp}:4450/AiroSMB`, 'smb')} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                {copiedSmb ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
                {copiedSmb ? 'Copied' : 'Copy SMB Link'}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Step-by-Step VLC Setup Guide */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <HelpCircle size={22} color="var(--accent-cyan)" />
          How to Setup VLC on Android TV / FireStick / Apple TV / Mobile
        </h3>

        <div className="grid-3">
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <span style={{ background: 'var(--accent-blue)', color: '#090d16', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '0.8rem' }}>STEP 1</span>
            <h4 style={{ margin: '12px 0 6px 0', fontSize: '1rem', fontWeight: 700 }}>Open VLC App</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Install and open VLC Player on your TV or smartphone connected to the same Wi-Fi network.
            </p>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <span style={{ background: 'var(--accent-purple)', color: '#090d16', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '0.8rem' }}>STEP 2</span>
            <h4 style={{ margin: '12px 0 6px 0', fontSize: '1rem', fontWeight: 700 }}>Browse Local Network / SMB</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Go to <strong>Local Network</strong> tab in VLC. Select your host PC name (<strong>{hostname}</strong>) or choose <strong>File Server (SMB)</strong>.
            </p>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <span style={{ background: 'var(--accent-pink)', color: '#090d16', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontWeight: 800, fontSize: '0.8rem' }}>STEP 3</span>
            <h4 style={{ margin: '12px 0 6px 0', fontSize: '1rem', fontWeight: 700 }}>Stream Movies & Playlists</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Enter your PC username/password if prompted by SMB, or simply use the M3U playlist file for instant 1-click playback!
            </p>
          </div>
        </div>
      </div>

      {/* QR Modal */}
      {showQrModal && networkInfo?.qrDataUrl && (
        <div className="modal-overlay" onClick={() => setShowQrModal(false)}>
          <div className="modal-card" style={{ maxWidth: '400px', textCenter: 'center' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>Scan with Smart TV or Mobile</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Scan this QR code with your smartphone or TV browser to open AiroSMB instantly.
            </p>
            <div style={{ background: '#fff', padding: '16px', borderRadius: 'var(--radius-md)', display: 'inline-block', marginBottom: '20px' }}>
              <img src={networkInfo.qrDataUrl} alt="TV Pairing QR Code" style={{ width: '220px', height: '220px', display: 'block' }} />
            </div>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowQrModal(false)}>
              Close QR Code
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
