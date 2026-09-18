import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Server, LogOut } from 'lucide-react';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [backendHealth, setBackendHealth] = useState<any>(null);

  useEffect(() => {
    api.health.check()
      .then((data) => setBackendHealth(data))
      .catch((err) => setBackendHealth({ success: false, status: 'offline', message: err.message }));
  }, []);

  return (
    <div className="container" style={{ padding: '2.5rem 1rem', maxWidth: '800px' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div className="badge badge-accent" style={{ marginBottom: '0.5rem' }}>User Configuration</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 700 }}>
          Profile & System Settings
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
          Manage your account profile, preferences, and backend connection.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* User Identity Card */}
        <div className="card-glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-accent), var(--color-cyan))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>
                {user?.name || 'Anonymous User'}
              </h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
                {user?.email || 'test@fintwin.ai'}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-glass-border)' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Digital Twin ID</span>
              <div style={{ fontFamily: 'monospace', fontSize: '0.88rem', color: 'var(--color-text)' }}>
                {user?._id || 'user_demo_sandbox'}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Display Currency</span>
              <div style={{ fontWeight: 600 }}>{user?.currency || 'INR'} (₹)</div>
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Security Mode</span>
              <div style={{ color: 'var(--color-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Shield size={14} /> JWT Authenticated
              </div>
            </div>
          </div>
        </div>

        {/* Backend & Services Connection Status */}
        <div className="card-glass">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Server size={18} color="var(--color-accent-bright)" />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700 }}>
              Backend Health & Architecture Status
            </h3>
          </div>

          {backendHealth ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>API Status:</span>
                <span style={{ color: backendHealth.status === 'operational' ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
                  {backendHealth.status?.toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Database Layer:</span>
                <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>
                  {backendHealth.database || 'Active'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>API Version:</span>
                <span>{backendHealth.version || '1.0.0'}</span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
              Checking backend server health...
            </div>
          )}
        </div>

        {/* Logout button */}
        <div>
          <button
            onClick={logout}
            className="btn btn-secondary"
            style={{ color: 'var(--color-danger)', borderColor: 'rgba(244,63,94,0.3)' }}
          >
            <LogOut size={16} />
            Sign Out of Account
          </button>
        </div>
      </div>
    </div>
  );
};
