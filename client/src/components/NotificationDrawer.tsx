import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Bell,
  AlertTriangle,
  Info,
  CheckCheck,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export interface FinTwinNotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  actionUrl: string;
  actionText: string;
  isRead: boolean;
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: FinTwinNotificationItem[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
}) => {
  const navigate = useNavigate();
  if (!isOpen) return null;

  const handleAction = (notif: FinTwinNotificationItem) => {
    onMarkRead(notif.id);
    onClose();
    navigate(notif.actionUrl);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ShieldAlert size={18} color="var(--color-critical)" />;
      case 'warning':
        return <AlertTriangle size={18} color="var(--color-warning)" />;
      default:
        return <Info size={18} color="var(--color-accent-bright)" />;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          height: '100%',
          background: 'rgba(15, 23, 42, 0.98)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Bell size={20} color="var(--color-accent-bright)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Notifications</h3>
            {notifications.filter((n) => !n.isRead).length > 0 && (
              <span
                style={{
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                }}
              >
                {notifications.filter((n) => !n.isRead).length}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={onMarkAllRead}
              className="btn btn-ghost"
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              title="Mark all as read"
            >
              <CheckCheck size={14} />
              <span>Mark Read</span>
            </button>
            <button
              onClick={onClose}
              className="btn btn-ghost"
              style={{ padding: '0.35rem', borderRadius: '50%' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {notifications.length === 0 ? (
            <div style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <CheckCheck size={36} style={{ marginBottom: '1rem', opacity: 0.4 }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>All Clear!</div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.35rem' }}>
                No active risk signals or critical alerts detected from your data.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  style={{
                    padding: '1rem',
                    borderRadius: '10px',
                    background: notif.isRead ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.05)',
                    border: notif.isRead
                      ? '1px solid rgba(255, 255, 255, 0.04)'
                      : `1px solid ${
                          notif.severity === 'critical'
                            ? 'rgba(239, 68, 68, 0.3)'
                            : notif.severity === 'warning'
                            ? 'rgba(245, 158, 11, 0.3)'
                            : 'rgba(56, 189, 248, 0.3)'
                        }`,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ marginTop: '0.1rem' }}>{getSeverityIcon(notif.severity)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {notif.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                        {new Date(notif.timestamp).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>

                  <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                    {notif.message}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      onClick={() => handleAction(notif)}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <span>{notif.actionText || 'Take Action'}</span>
                      <ArrowRight size={12} />
                    </button>
                    {!notif.isRead && (
                      <button
                        onClick={() => onMarkRead(notif.id)}
                        className="btn btn-ghost"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
