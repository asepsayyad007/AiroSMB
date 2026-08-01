import React, { useState, useEffect } from 'react';
import { Users, RefreshCw, Monitor, Wifi, Tv, Server, Radio } from 'lucide-react';

export default function ActiveClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      if (res.ok) {
        setClients(data.clients || []);
      }
    } catch (err) {
      console.error('Error fetching connected clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    // Auto-poll every 3 seconds for real-time client discovery
    const interval = setInterval(fetchClients, 3000);
    return () => clearInterval(interval);
  }, []);

  const getProtocolIcon = (protocol) => {
    if (!protocol) return <Wifi size={14} color="var(--accent-cyan)" />;
    if (protocol.includes('DLNA')) return <Radio size={14} color="var(--accent-cyan)" />;
    if (protocol.includes('SMB')) return <Server size={14} color="var(--accent-blue)" />;
    if (protocol.includes('FTP')) return <Tv size={14} color="var(--accent-emerald)" />;
    return <Wifi size={14} color="var(--accent-purple)" />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* Header Banner */}
      <div className="pro-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={20} color="var(--accent-cyan)" />
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Active Connected Clients
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Real-time tracking of devices connected via DLNA, HTTP Streaming, SMB Shares, and FTP.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="status-pill status-active" style={{ fontSize: '0.78rem' }}>
              <span className="status-dot"></span> {clients.length} Client{clients.length === 1 ? '' : 's'} Tracked
            </span>

            <button className="btn-pro-secondary" onClick={fetchClients} style={{ padding: '5px 10px', fontSize: '0.78rem' }}>
              <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Connected Clients Table */}
      <div className="pro-card" style={{ padding: 0, overflow: 'hidden' }}>
        {clients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <Monitor size={32} style={{ marginBottom: '10px', opacity: 0.4, color: 'var(--accent-cyan)' }} />
            <p style={{ fontWeight: 500 }}>No external clients connected yet.</p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              Connect VLC on Smart TV/Mobile or access files via SMB/FTP to see live devices here.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.4px' }}>
                <th style={{ padding: '12px 16px' }}>Device IP</th>
                <th style={{ padding: '12px 16px' }}>App / Device Name</th>
                <th style={{ padding: '12px 16px' }}>Protocol</th>
                <th style={{ padding: '12px 16px' }}>Current Activity</th>
                <th style={{ padding: '12px 16px' }}>Last Seen</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client, idx) => (
                <tr key={idx} style={{ borderBottom: idx < clients.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                  <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                    {client.ip}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-main)' }}>
                    {client.device}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      {getProtocolIcon(client.protocol)}
                      <span>{client.protocol}</span>
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-muted)', maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={client.activity}>
                    {client.activity}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                    {client.secondsAgo < 60 ? `${client.secondsAgo}s ago` : `${Math.floor(client.secondsAgo / 60)}m ago`}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <span className={`status-pill ${client.isOnline ? 'status-active' : ''}`} style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                      {client.isOnline ? 'ONLINE' : 'IDLE'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
