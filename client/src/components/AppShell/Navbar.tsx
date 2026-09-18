import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { GlobalSearchModal } from '../GlobalSearchModal';
import { NotificationDrawer } from '../NotificationDrawer';
import type { FinTwinNotificationItem } from '../NotificationDrawer';
import {
  Menu,
  X,
  Activity,
  Layers,
  Share2,
  Sliders,
  Sparkles,
  LogOut,
  User as UserIcon,
  Database,
  Building2,
  Target,
  CreditCard,
  Search,
  Bell,
  ChevronDown,
  Repeat,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  History,
  MessageSquare,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<FinTwinNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Dropdown states for desktop
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.notifications.list();
      if (res.success && res.notifications) {
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleMarkRead = async (id: string) => {
    await api.notifications.markRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    await api.notifications.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileOpen(false);
  };

  // Close dropdown on route change
  useEffect(() => {
    setOpenDropdown(null);
    setMobileOpen(false);
  }, [location.pathname]);

  const navGroups = [
    {
      id: 'financial',
      label: 'Financial',
      items: [
        { label: 'Accounts', path: '/accounts', icon: Building2, desc: 'Balances & Institutions' },
        { label: 'Transactions', path: '/transactions', icon: Database, desc: 'Ledger & Ingestion' },
        { label: 'Entities', path: '/entities', icon: Share2, desc: 'Counterparty Directory' },
        { label: 'Goals', path: '/goals', icon: Target, desc: 'Targets & Milestones' },
        { label: 'Debt & Loans', path: '/debt-loans', icon: CreditCard, desc: 'Liabilities & EMIs' },
        { label: 'Recurring Outflows', path: '/recurring', icon: Repeat, desc: 'Subscriptions & Burn' },
        { label: 'Financial Calendar', path: '/calendar', icon: Calendar, desc: 'Upcoming Schedule' },
      ],
    },
    {
      id: 'twin',
      label: 'Digital Twin',
      items: [
        { label: 'Financial Twin', path: '/financial-twin', icon: Layers, desc: 'Complete System Model' },
        { label: 'Network Explorer', path: '/network', icon: Share2, desc: 'Directed Graph & Hubs' },
      ],
    },
    {
      id: 'intelligence',
      label: 'Intelligence',
      items: [
        { label: 'Analysis & Cash Flow', path: '/analysis', icon: Sparkles, desc: 'Spending, Income & Savings' },
        { label: 'Risk Signals', path: '/risk-signals', icon: ShieldAlert, desc: 'Active Sentinel Alerts' },
        { label: 'Ask FinTwin', path: '/ask', icon: MessageSquare, desc: 'Grounded Natural Language Q&A' },
        { label: 'Data Quality Center', path: '/data-quality', icon: ShieldCheck, desc: 'Completeness & Hygiene' },
      ],
    },
    {
      id: 'simulation',
      label: 'Simulation',
      items: [
        { label: 'What-If Simulator', path: '/simulation', icon: Sliders, desc: 'Prospective Decision Lab' },
        { label: 'Scenario History', path: '/history', icon: History, desc: 'Archived Projections' },
      ],
    },
  ];

  return (
    <>
      <header className="navbar" style={{ position: 'sticky', top: 0, zIndex: 900, backdropFilter: 'blur(12px)', background: 'rgba(10, 15, 29, 0.88)' }}>
        <div className="container navbar-inner" style={{ maxWidth: '1440px' }}>
          {/* Brand Logo */}
          <Link to="/" className="brand-logo" onClick={() => setMobileOpen(false)}>
            <div className="brand-mark">
              <Activity size={18} strokeWidth={2.5} />
            </div>
            <div>
              Fin<span>Twin</span> AI
            </div>
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated ? (
            <nav className="nav-links-desktop" aria-label="Main Navigation" style={{ gap: '0.5rem', alignItems: 'center' }}>
              {/* Command Center direct link */}
              <Link
                to="/dashboard"
                className={`nav-link${location.pathname === '/dashboard' ? ' active' : ''}`}
                style={{ fontSize: '0.85rem', fontWeight: 600 }}
              >
                Command Center
              </Link>

              {/* Grouped Dropdowns */}
              {navGroups.map((group) => {
                const isGroupActive = group.items.some((i) => location.pathname === i.path);
                const isOpen = openDropdown === group.id;

                return (
                  <div
                    key={group.id}
                    style={{ position: 'relative' }}
                    onMouseEnter={() => setOpenDropdown(group.id)}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    <button
                      className={`nav-link${isGroupActive ? ' active' : ''}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.4rem 0.6rem',
                      }}
                    >
                      <span>{group.label}</span>
                      <ChevronDown size={13} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
                    </button>

                    {isOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          minWidth: '240px',
                          background: 'rgba(15, 23, 42, 0.98)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: '12px',
                          padding: '0.5rem',
                          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.2rem',
                          zIndex: 950,
                        }}
                      >
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const isItemActive = location.pathname === item.path;

                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={() => setOpenDropdown(null)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.65rem',
                                padding: '0.55rem 0.75rem',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                background: isItemActive ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                                color: isItemActive ? 'var(--color-accent-bright)' : 'var(--color-text-primary)',
                                transition: 'background 0.15s ease',
                              }}
                              onMouseEnter={(e) => {
                                if (!isItemActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                              }}
                              onMouseLeave={(e) => {
                                if (!isItemActive) e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <Icon size={16} color={isItemActive ? 'var(--color-accent-bright)' : 'var(--color-text-muted)'} />
                              <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{item.label}</div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{item.desc}</div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Intelligence Report direct link */}
              <Link
                to="/intelligence-report"
                className={`nav-link${location.pathname === '/intelligence-report' ? ' active' : ''}`}
                style={{ fontSize: '0.85rem', fontWeight: 600 }}
              >
                Report
              </Link>
            </nav>
          ) : (
            <nav className="nav-links-desktop" style={{ gap: '1rem' }}>
              <Link to="/" className="nav-link">Home</Link>
              <Link to="/simulation" className="nav-link">Simulation Lab</Link>
            </nav>
          )}

          {/* Action Controls */}
          <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {isAuthenticated && (
              <>
                {/* Global Search Button */}
                <button
                  onClick={() => setSearchOpen(true)}
                  className="btn btn-ghost"
                  title="Global Search (Ctrl+K)"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.4rem 0.65rem',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <Search size={15} />
                  <span style={{ display: 'inline-block' }}>Search...</span>
                  <span style={{ padding: '0.1rem 0.35rem', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', fontSize: '0.68rem', fontFamily: 'monospace' }}>
                    ⌘K
                  </span>
                </button>

                {/* Notifications Bell */}
                <button
                  onClick={() => setNotifOpen(true)}
                  className="btn btn-ghost"
                  title="Notifications"
                  style={{ position: 'relative', padding: '0.45rem', borderRadius: '50%' }}
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: 'var(--color-primary)',
                      }}
                    />
                  )}
                </button>
              </>
            )}

            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Link
                  to="/settings"
                  className="btn btn-ghost"
                  title={`Logged in as ${user?.name}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', padding: '0.4rem 0.65rem' }}
                >
                  <UserIcon size={15} />
                  <span style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.name?.split(' ')[0]}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="btn btn-secondary"
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                  aria-label="Log out"
                >
                  <LogOut size={13} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Link to="/login" className="btn btn-ghost">
                  Sign In
                </Link>
                <Link to="/register" className="btn btn-primary">
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              className="mobile-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle Navigation"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <>
            <div className="mobile-drawer-backdrop" onClick={() => setMobileOpen(false)} />
            <div className="mobile-drawer" role="dialog" aria-modal="true" style={{ overflowY: 'auto' }}>
              <div className="drawer-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div className="brand-logo">
                  <div className="brand-mark"><Activity size={18} /></div>
                  <div>Fin<span>Twin</span> AI</div>
                </div>
                <button onClick={() => setMobileOpen(false)} className="btn btn-ghost" style={{ padding: '0.35rem' }}>
                  <X size={20} />
                </button>
              </div>

              {isAuthenticated ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-accent-bright)', textDecoration: 'none' }}
                  >
                    Command Center
                  </Link>

                  {navGroups.map((grp) => (
                    <div key={grp.id}>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: '0.5rem' }}>
                        {grp.label}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingLeft: '0.5rem' }}>
                        {grp.items.map((it) => (
                          <Link
                            key={it.path}
                            to={it.path}
                            onClick={() => setMobileOpen(false)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              fontSize: '0.88rem',
                              color: 'var(--color-text-primary)',
                              textDecoration: 'none',
                              padding: '0.35rem 0',
                            }}
                          >
                            <it.icon size={15} color="var(--color-text-muted)" />
                            <span>{it.label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}

                  <Link
                    to="/intelligence-report"
                    onClick={() => setMobileOpen(false)}
                    style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary)', textDecoration: 'none' }}
                  >
                    Intelligence Report
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setMobileOpen(false)}
                    style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text-primary)', textDecoration: 'none' }}
                  >
                    Settings & Profile
                  </Link>

                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%' }}>
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="btn btn-secondary" style={{ width: '100%' }}>
                    Sign In
                  </Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="btn btn-primary" style={{ width: '100%' }}>
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
      />
    </>
  );
};
