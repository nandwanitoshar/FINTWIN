import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  CreditCard,
  Repeat,
  Target,
  Loader2,
  Filter,
  Clock,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

export const CalendarPage: React.FC = () => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1-indexed
  const [viewMode, setViewMode] = useState<'month' | 'upcoming_7' | 'upcoming_30'>('month');
  const [eventTypeFilter, setEventTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'EMI' | 'GOAL' | 'RECURRING'>('ALL');

  const [events, setEvents] = useState<any[]>([]);
  const [upcoming7Days, setUpcoming7Days] = useState<any[]>([]);
  const [upcoming30Days, setUpcoming30Days] = useState<any[]>([]);
  const [totalOutflow, setTotalOutflow] = useState<number>(0);
  const [totalInflow, setTotalInflow] = useState<number>(0);
  const [eventCount, setEventCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Add event modal
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('EXPENSE');
  const [eventDate, setEventDate] = useState(todayStr);
  const [category, setCategory] = useState('General');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const res = await api.calendar.get({ year: currentYear, month: currentMonth });
      if (res.success && res.data) {
        setEvents(res.data.events || []);
        setUpcoming7Days(res.data.upcoming7Days || []);
        setUpcoming30Days(res.data.upcoming30Days || []);
        setTotalOutflow(res.data.totalOutflow || 0);
        setTotalInflow(res.data.totalInflow || 0);
        setEventCount(res.data.eventCount || 0);
      }
    } catch (err) {
      console.error('Failed to load calendar events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !eventDate) {
      setFormError('Title, amount, and date are required.');
      return;
    }
    setFormError(null);
    try {
      await api.calendar.createEvent({
        title,
        amount: parseFloat(amount),
        type,
        date: eventDate,
        category,
      });
      setIsAddOpen(false);
      setTitle('');
      setAmount('');
      fetchEvents();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create calendar event.');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('Remove this calendar event?')) return;
    try {
      await api.calendar.deleteEvent(id);
      fetchEvents();
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Helper to get styling and label for an event
  const getEventBadge = (ev: any) => {
    const isEst = ev.isEstimated || ev.eventType === 'RECURRING';
    switch (ev.eventType) {
      case 'INCOME':
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          color: 'var(--color-success)',
          border: 'rgba(16, 185, 129, 0.3)',
          label: 'INCOME',
          icon: <TrendingUp size={14} color="var(--color-success)" />,
        };
      case 'EMI':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          color: 'var(--color-warning)',
          border: 'rgba(245, 158, 11, 0.3)',
          label: 'EMI / DEBT',
          icon: <CreditCard size={14} color="var(--color-warning)" />,
        };
      case 'GOAL':
        return {
          bg: 'rgba(56, 189, 248, 0.15)',
          color: 'var(--color-accent-bright)',
          border: 'rgba(56, 189, 248, 0.3)',
          label: isEst ? 'GOAL (EST)' : 'GOAL',
          icon: <Target size={14} color="var(--color-accent-bright)" />,
        };
      case 'RECURRING':
        return {
          bg: 'rgba(168, 85, 247, 0.15)',
          color: '#C084FC',
          border: 'rgba(168, 85, 247, 0.3)',
          label: 'ESTIMATED RECURRING',
          icon: <Repeat size={14} color="#C084FC" />,
        };
      case 'EXPENSE':
      default:
        return {
          bg: 'rgba(255, 255, 255, 0.05)',
          color: 'var(--color-text-primary)',
          border: 'rgba(255, 255, 255, 0.1)',
          label: 'EXPENSE',
          icon: <TrendingDown size={14} color="var(--color-critical)" />,
        };
    }
  };

  // Filter events based on active eventTypeFilter
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (eventTypeFilter === 'ALL') return true;
      if (eventTypeFilter === 'EMI') return ev.eventType === 'EMI' || ev.source === 'LOAN_EMI';
      if (eventTypeFilter === 'GOAL') return ev.eventType === 'GOAL' || ev.source === 'GOAL_MILESTONE';
      if (eventTypeFilter === 'RECURRING') return ev.eventType === 'RECURRING' || ev.source === 'RECURRING_EXPENSE';
      if (eventTypeFilter === 'INCOME') return ev.eventType === 'INCOME' || ev.direction === 'INFLOW';
      if (eventTypeFilter === 'EXPENSE') return ev.eventType === 'EXPENSE';
      return true;
    });
  }, [events, eventTypeFilter]);

  // Group events by day for Month View
  const eventsByDay: Record<number, any[]> = {};
  for (const ev of filteredEvents) {
    const d = new Date(ev.date);
    if (d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(ev);
    }
  }

  // Days in current month
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 = Sun

  return (
    <div className="container" style={{ padding: '2rem 1rem', maxWidth: '1280px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <CalendarIcon size={24} color="var(--color-accent-bright)" />
            <span
              style={{
                fontSize: '0.82rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-accent-bright)',
                fontWeight: 700,
              }}
            >
              Authoritative Financial Schedule
            </span>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>Financial Calendar</h1>
          <p style={{ color: 'var(--color-text-muted)', margin: '0.35rem 0 0', fontSize: '0.9rem' }}>
            Unified schedule of verified income, loan EMIs, estimated recurring debits, and goal contributions.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* View Mode Pills */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '0.2rem', borderRadius: '8px' }}>
            <button
              onClick={() => setViewMode('month')}
              className="btn btn-ghost"
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.78rem',
                background: viewMode === 'month' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'month' ? '#fff' : 'var(--color-text-muted)',
              }}
            >
              Month Grid
            </button>
            <button
              onClick={() => setViewMode('upcoming_7')}
              className="btn btn-ghost"
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.78rem',
                background: viewMode === 'upcoming_7' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'upcoming_7' ? '#fff' : 'var(--color-text-muted)',
              }}
            >
              Next 7 Days ({upcoming7Days.length})
            </button>
            <button
              onClick={() => setViewMode('upcoming_30')}
              className="btn btn-ghost"
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.78rem',
                background: viewMode === 'upcoming_30' ? 'var(--color-primary)' : 'transparent',
                color: viewMode === 'upcoming_30' ? '#fff' : 'var(--color-text-muted)',
              }}
            >
              Next 30 Days ({upcoming30Days.length})
            </button>
          </div>

          <button
            onClick={() => setIsAddOpen(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <Plus size={16} />
            <span>Schedule Event</span>
          </button>
        </div>
      </div>

      {/* Month Navigator & Summary Strip */}
      <div
        className="card"
        style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={handlePrevMonth} className="btn btn-ghost" style={{ padding: '0.4rem' }} aria-label="Previous Month">
            <ChevronLeft size={20} />
          </button>
          <div
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              minWidth: '200px',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <span>
              {monthNames[currentMonth - 1]} {currentYear}
            </span>
            {isLoading && <Loader2 size={16} className="animate-spin" color="var(--color-accent-bright)" />}
          </div>
          <button onClick={handleNextMonth} className="btn btn-ghost" style={{ padding: '0.4rem' }} aria-label="Next Month">
            <ChevronRight size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Committed Outflow</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-warning)' }}>
              ₹{totalOutflow.toLocaleString('en-IN')}
            </div>
          </div>
          {totalInflow > 0 && (
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Expected Inflow</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-success)' }}>
                ₹{totalInflow.toLocaleString('en-IN')}
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Month Events</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              {eventCount}
            </div>
          </div>
        </div>
      </div>

      {/* Event Type Filter Tabs (Feature 9, 19) */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginRight: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Filter size={14} /> Filter:
        </span>
        {(['ALL', 'INCOME', 'EXPENSE', 'EMI', 'GOAL', 'RECURRING'] as const).map((filterVal) => {
          const isActive = eventTypeFilter === filterVal;
          return (
            <button
              key={filterVal}
              onClick={() => setEventTypeFilter(filterVal)}
              className="btn btn-ghost"
              style={{
                padding: '0.3rem 0.75rem',
                fontSize: '0.75rem',
                borderRadius: '20px',
                fontWeight: 600,
                background: isActive ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                color: isActive ? 'var(--color-accent-bright)' : 'var(--color-text-muted)',
                border: isActive ? '1px solid var(--color-accent-bright)' : '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {filterVal === 'EMI' ? 'EMI / DEBT' : filterVal}
            </button>
          );
        })}
      </div>

      {/* View Mode: Month Grid */}
      {viewMode === 'month' && (
        <div className="card" style={{ padding: '1rem', overflowX: 'auto' }}>
          <div style={{ minWidth: '700px' }}>
            {/* Day Names */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px', textAlign: 'center' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} style={{ padding: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  {day}
                </div>
              ))}
            </div>

            {/* Grid Cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty_${i}`} style={{ minHeight: '95px', background: 'rgba(255,255,255,0.01)', borderRadius: '6px' }} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayEvents = eventsByDay[day] || [];
                const isToday =
                  today.getDate() === day &&
                  today.getMonth() + 1 === currentMonth &&
                  today.getFullYear() === currentYear;

                return (
                  <div
                    key={`day_${day}`}
                    style={{
                      minHeight: '100px',
                      padding: '0.4rem',
                      borderRadius: '6px',
                      background: isToday ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: isToday ? '1px solid var(--color-accent-bright)' : '1px solid rgba(255, 255, 255, 0.04)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: isToday ? 800 : 600,
                          color: isToday ? 'var(--color-accent-bright)' : 'var(--color-text-muted)',
                        }}
                      >
                        {day}
                      </span>
                      {dayEvents.length > 0 && (
                        <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem', borderRadius: '4px', background: 'rgba(255,255,255,0.08)' }}>
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, overflowY: 'auto' }}>
                      {dayEvents.slice(0, 3).map((ev) => {
                        const badge = getEventBadge(ev);
                        return (
                          <div
                            key={ev.id}
                            title={`${ev.title} (₹${ev.amount.toLocaleString('en-IN')}) - ${badge.label}`}
                            style={{
                              fontSize: '0.68rem',
                              padding: '0.2rem 0.35rem',
                              borderRadius: '4px',
                              background: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <span>₹{ev.amount.toLocaleString('en-IN')}</span>
                            <span style={{ opacity: 0.85 }}>{ev.title.split(' ')[0]}</span>
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* View Mode: Upcoming Timeline (Next 7 Days / Next 30 Days) (Feature 10) */}
      {(viewMode === 'upcoming_7' || viewMode === 'upcoming_30') && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} color="var(--color-accent-bright)" />
              <span>
                {viewMode === 'upcoming_7' ? 'Upcoming Financial Events — Next 7 Days' : 'Upcoming Financial Events — Next 30 Days'}
              </span>
            </h3>
          </div>

          {(() => {
            const listToDisplay = (viewMode === 'upcoming_7' ? upcoming7Days : upcoming30Days).filter((ev) => {
              if (eventTypeFilter === 'ALL') return true;
              if (eventTypeFilter === 'EMI') return ev.eventType === 'EMI' || ev.source === 'LOAN_EMI';
              if (eventTypeFilter === 'GOAL') return ev.eventType === 'GOAL' || ev.source === 'GOAL_MILESTONE';
              if (eventTypeFilter === 'RECURRING') return ev.eventType === 'RECURRING' || ev.source === 'RECURRING_EXPENSE';
              if (eventTypeFilter === 'INCOME') return ev.eventType === 'INCOME' || ev.direction === 'INFLOW';
              if (eventTypeFilter === 'EXPENSE') return ev.eventType === 'EXPENSE';
              return true;
            });

            if (listToDisplay.length === 0) {
              return (
                <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No financial events scheduled in this period matching the selected filter.
                </div>
              );
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {listToDisplay.map((ev) => {
                  const badge = getEventBadge(ev);
                  return (
                    <div
                      key={ev.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem 1.5rem',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div
                          style={{
                            padding: '0.6rem',
                            borderRadius: '10px',
                            background: badge.bg,
                            border: `1px solid ${badge.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {badge.icon}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                              {ev.title}
                            </span>
                            <span
                              style={{
                                fontSize: '0.65rem',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '4px',
                                background: badge.bg,
                                color: badge.color,
                                border: `1px solid ${badge.border}`,
                                fontWeight: 700,
                              }}
                            >
                              {badge.label}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                            <span>{ev.date}</span>
                            <span style={{ margin: '0 0.35rem' }}>•</span>
                            <span>{ev.category}</span>
                            {ev.notes && (
                              <>
                                <span style={{ margin: '0 0.35rem' }}>•</span>
                                <span>{ev.notes}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <span
                          style={{
                            fontSize: '1.05rem',
                            fontWeight: 800,
                            color: ev.direction === 'INFLOW' ? 'var(--color-success)' : 'var(--color-text-primary)',
                          }}
                        >
                          {ev.direction === 'INFLOW' ? '+' : '-'}₹{ev.amount.toLocaleString('en-IN')}
                        </span>
                        {ev.source === 'SCHEDULED_EVENT' && (
                          <button
                            onClick={() => handleDeleteEvent(ev.referenceId)}
                            className="btn btn-ghost"
                            style={{ padding: '0.35rem', color: 'var(--color-critical)' }}
                            title="Remove scheduled event"
                            aria-label={`Remove event ${ev.title}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Add Custom Event Modal */}
      {isAddOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '480px',
              background: 'rgba(15, 23, 42, 0.98)',
              padding: '1.75rem',
              borderRadius: '16px',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 1.25rem' }}>Schedule Custom Event</h3>
            {formError && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: 'var(--color-critical)',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  fontSize: '0.82rem',
                }}
              >
                {formError}
              </div>
            )}
            <form onSubmit={handleCreateEvent}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                  Event Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Quarterly Bonus, Annual Insurance"
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    required
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                    Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(15,23,42,1)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                    }}
                  >
                    <option value="EXPENSE">Expense Outflow</option>
                    <option value="INCOME">Income Inflow</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Insurance, Tax, etc."
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setIsAddOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
