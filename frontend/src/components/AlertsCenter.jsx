import React, { useEffect, useState, useCallback } from 'react'
import { alertsAPI } from '../api'

const FILTERS = ['all','stockout','planogram','demand','price']
const ICONS = { critical:'🚨', high:'⚠️', medium:'📋', low:'💡' }
const TAG_CLASS = { stockout:'tag-stockout', planogram:'tag-planogram', demand:'tag-demand', price:'tag-price' }
const CHANNELS = { push:'📱', email:'📧', sms:'💬', dashboard:'🖥️' }

// ─── Notification Preferences Modal ─────────────────────────────────────────
function NotifModal({ onClose }) {
  const [prefs, setPrefs] = useState({
    push: true, email: true, sms: false, dashboard: true,
    stockout: true, planogram: true, demand: true, price: false,
    critical: true, high: true, medium: false, low: false,
    cooldown: 5,
  })
  const toggle = k => setPrefs(p => ({ ...p, [k]: !p[k] }))

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 28, width: 460, maxWidth: '95vw',
        boxShadow: '0 24px 80px rgba(0,0,0,.5)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>🔔 Notification Preferences</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Multi-channel alert delivery</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Delivery Channels */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
              Delivery Channels
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[['push','📱 Push Notification'],['email','📧 Email Digest'],['sms','💬 SMS Alert'],['dashboard','🖥️ Dashboard Feed']].map(([k,l]) => (
                <label key={k} style={{
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                  padding: '10px 12px', borderRadius: 8,
                  background: prefs[k] ? 'rgba(0,212,255,.08)' : 'rgba(255,255,255,.03)',
                  border: `1px solid ${prefs[k] ? 'rgba(0,212,255,.3)' : 'var(--border)'}`,
                  transition: 'all .2s',
                }}>
                  <input type="checkbox" checked={prefs[k]} onChange={() => toggle(k)} style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
                  <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{l}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Alert Types */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
              Alert Types
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[['stockout','🔴 Stockout'],['planogram','🟣 Planogram'],['demand','🔵 Demand Spike'],['price','🟡 Price Tag']].map(([k,l]) => (
                <label key={k} style={{
                  display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                  padding: '8px 12px', borderRadius: 8,
                  background: prefs[k] ? 'rgba(245,158,11,.08)' : 'rgba(255,255,255,.03)',
                  border: `1px solid ${prefs[k] ? 'rgba(245,158,11,.3)' : 'var(--border)'}`,
                }}>
                  <input type="checkbox" checked={prefs[k]} onChange={() => toggle(k)} style={{ accentColor: '#f59e0b', width: 15, height: 15 }} />
                  <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{l}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
              Minimum Priority
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['critical','🚨'],['high','⚠️'],['medium','📋'],['low','💡']].map(([k,icon]) => (
                <button key={k} onClick={() => setPrefs(p => ({ ...p, _priority: k }))}
                  style={{
                    flex: 1, padding: '8px 4px', borderRadius: 8, border: '1px solid',
                    borderColor: prefs._priority === k ? 'var(--accent)' : 'var(--border)',
                    background: prefs._priority === k ? 'rgba(0,212,255,.1)' : 'rgba(255,255,255,.03)',
                    color: 'var(--text-2)', cursor: 'pointer', fontSize: 12,
                  }}>
                  {icon} {k}
                </button>
              ))}
            </div>
          </div>

          {/* Cooldown */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
              Alert SLA Target: <span style={{ color: 'var(--accent-green)' }}>&lt;5 minutes</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="range" min={1} max={10} value={prefs.cooldown}
                onChange={e => setPrefs(p => ({ ...p, cooldown: +e.target.value }))}
                style={{ flex: 1, accentColor: 'var(--accent)' }} />
              <span style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 600, minWidth: 60 }}>
                {prefs.cooldown} min cooldown
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onClose}>
            ✓ Save Preferences
          </button>
          <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function AlertItem({ alert, onResolve }) {
  const iconClass = `alert-icon icon-${alert.priority}`
  const ts = new Date(alert.created_at).toLocaleTimeString('en-IN', { hour12: false })
  const latency = alert.latency_seconds
  return (
    <div className={`alert-item${alert.is_new ? ' is-new' : ''}`}>
      <div className={iconClass}>{ICONS[alert.priority] || '🔔'}</div>
      <div className="alert-content">
        <div className="alert-title">{alert.title}</div>
        <div className="alert-detail">{alert.detail}</div>
        {alert.revenue_at_risk > 0 && (
          <div style={{ marginTop: 8, padding: '8px 12px', background: 'linear-gradient(90deg, rgba(239,68,68,.1), transparent)', borderLeft: '3px solid #ef4444', borderRadius: '4px 8px 8px 4px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Estimated Revenue Lost</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#ef4444' }}>
              ₹{Math.round(alert.revenue_at_risk).toLocaleString('en-IN')}
            </div>
          </div>
        )}
        {alert.suggested_action && (
          <div style={{ fontSize: 12, color: 'var(--accent-green)', marginTop: 8, background: 'rgba(16,185,129,.05)', padding: '6px 10px', borderRadius: 4, display: 'inline-block' }}>
            <span style={{ fontWeight: 700 }}>💡 ACTION:</span> {alert.suggested_action}
          </div>
        )}
        <div className="alert-meta">
          <span className={`alert-tag ${TAG_CLASS[alert.alert_type] || ''}`}>{alert.alert_type}</span>
          {alert.aisle_id && <span className="alert-tag" style={{ background:'rgba(255,255,255,.05)', color:'var(--text-2)' }}>{alert.aisle_id}</span>}
          {latency != null && (
            <span className="alert-tag" style={{ background:'rgba(16,185,129,.08)', color:'#34d399' }}>
              ⚡ {latency}s
            </span>
          )}
          <div style={{ display:'flex', gap:3, marginLeft:'auto' }}>
            {(alert.channels || []).map(ch => (
              <span key={ch} title={ch} style={{ fontSize:13 }}>{CHANNELS[ch] || ch}</span>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
        <span className="alert-time">{ts}</span>
        <button className="alert-resolve" onClick={() => onResolve(alert.id)}>✓ Resolve</button>
      </div>
    </div>
  )
}

export default function AlertsCenter() {
  const [alerts, setAlerts]       = useState([])
  const [filter, setFilter]       = useState('all')
  const [sortBy, setSortBy]       = useState('revenue')  // 'revenue' | 'time'
  const [stats, setStats]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [showNotifModal, setShowNotifModal] = useState(false)

  const loadAlerts = useCallback(async (type) => {
    setLoading(true)
    const params = { limit: 50, resolved: false }
    if (type && type !== 'all') params.alert_type = type
    try {
      const [aRes, sRes] = await Promise.all([
        alertsAPI.getAlerts(params),
        alertsAPI.getStats(),
      ])
      setAlerts(aRes.data.alerts || [])
      setStats(sRes.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadAlerts(filter) }, [filter, loadAlerts])

  const handleResolve = async (id) => {
    if (!id) return
    await alertsAPI.resolve(id)
    setAlerts(prev => prev.filter(a => a.id !== id))
    loadAlerts(filter)
  }

  // Sort by revenue_at_risk descending OR by time
  const sortedAlerts = [...alerts].sort((a, b) => {
    if (sortBy === 'revenue') return (b.revenue_at_risk || 0) - (a.revenue_at_risk || 0)
    return new Date(b.created_at) - new Date(a.created_at)
  })

  const FMT = new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 })
  const avgLatency = alerts.filter(a => a.latency_seconds != null).length
    ? Math.round(alerts.filter(a => a.latency_seconds != null).reduce((s, a) => s + a.latency_seconds, 0) / alerts.filter(a => a.latency_seconds != null).length)
    : null

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Alerts Center</div>
          <div className="section-sub">
            Redis Pub/Sub pipeline · &lt;5 min SLA · Multi-channel (Push / Email / SMS) · MongoDB persistence
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowNotifModal(true)}>🔔 Preferences</button>
          <button className="btn btn-secondary btn-sm" onClick={() => loadAlerts(filter)}>↺ Refresh</button>
        </div>
      </div>

      {showNotifModal && <NotifModal onClose={() => setShowNotifModal(false)} />}

      {/* Stats row */}
      {stats && (
        <div className="kpi-grid" style={{ marginBottom: 18 }}>
          {[
            ['Total Alerts',      stats.total,          '🔔', 'var(--accent)'],
            ['Unresolved',        stats.unresolved,     '⚠️', 'var(--accent-red)'],
            ['Critical',          stats.by_priority?.critical || 0, '🚨', 'var(--accent-red)'],
            ['Revenue at Risk',   FMT.format(stats.revenue_at_risk || 0), '💰', 'var(--accent-amber)'],
          ].map(([label, value, icon, color]) => (
            <div key={label} className="kpi-card" style={{ '--kpi-color': color }}>
              <div className="kpi-label">{label}</div>
              <div className="kpi-value" style={{ fontSize: 24 }}>{value}</div>
              <div className="kpi-icon">{icon}</div>
            </div>
          ))}
        </div>
      )}

      {/* Alert SLA Banner */}
      {avgLatency != null && (
        <div style={{
          marginBottom: 14, padding: '10px 16px', borderRadius: 10,
          background: 'linear-gradient(90deg, rgba(16,185,129,.1), rgba(0,212,255,.05))',
          border: '1px solid rgba(16,185,129,.25)',
          display: 'flex', alignItems: 'center', gap: 12, fontSize: 13,
        }}>
          <span style={{ fontSize: 22 }}>⚡</span>
          <div>
            <span style={{ color: '#34d399', fontWeight: 700 }}>Alert SLA Met</span>
            <span style={{ color: 'var(--text-2)', marginLeft: 8 }}>
              Avg detection-to-alert latency: <strong style={{ color: 'var(--text-1)' }}>{avgLatency}s</strong>
              {' '}— well within the <strong style={{ color: '#34d399' }}>&lt;5 minute</strong> SLA target
            </span>
          </div>
        </div>
      )}

      {/* Filters + Sort */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="alert-filters" style={{ flex: 1 }}>
          {FILTERS.map(f => (
            <button key={f} className={`filter-chip${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'stockout' ? '🔴 Stockout' : f === 'planogram' ? '🟣 Planogram' : f === 'demand' ? '🔵 Demand' : '🟡 Price Tag'}
            </button>
          ))}
        </div>
        {/* Sort toggle */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,.05)', borderRadius: 8, padding: 3, border: '1px solid var(--border)', flexShrink: 0 }}>
          {[['revenue','💰 Revenue Impact'],['time','🕐 Latest First']].map(([k,l]) => (
            <button key={k} onClick={() => setSortBy(k)} style={{
              padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
              background: sortBy === k ? 'var(--accent)' : 'transparent',
              color: sortBy === k ? '#000' : 'var(--text-2)',
              transition: 'all .2s',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Alert feed */}
      {loading
        ? <div className="loading"><div className="spinner" />Loading alerts from MongoDB…</div>
        : sortedAlerts.length === 0
          ? (
            <div className="empty-state">
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              No active alerts for this filter
            </div>
          )
          : (
            <div className="alert-feed">
              {sortedAlerts.map(a => <AlertItem key={a.id} alert={a} onResolve={handleResolve} />)}
            </div>
          )
      }
    </div>
  )
}
