import React from 'react'

const NAV = [
  { section: 'Overview' },
  { id: 'dashboard',     icon: '📊', label: 'Dashboard' },
  { section: 'Monitoring' },
  { id: 'shelf-monitor', icon: '📷', label: 'Shelf Monitor' },
  { id: 'planogram',     icon: '🗺️',  label: 'Planogram Compliance' },
  { section: 'Intelligence' },
  { id: 'forecasting',   icon: '📈', label: 'Demand Forecasting' },
  { id: 'alerts',        icon: '🔔', label: 'Alerts Center', badge: true },
  { section: 'Analytics' },
  { id: 'store-map',     icon: '🏪', label: 'Store Map' },
]

export default function Sidebar({ page, setPage, alertCount }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">🛒</div>
        <div className="logo-title">OmniVision AI</div>
        <div className="logo-sub">Retail Intelligence Platform</div>
      </div>

      <div className="sidebar-status">
        <div className="status-pill">
          <div className="status-dot" />
          All Systems Nominal
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map((item, i) =>
          item.section ? (
            <div key={i} className="nav-label">{item.section}</div>
          ) : (
            <div key={item.id}
              className={`nav-item${page === item.id ? ' active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && alertCount > 0 && (
                <span className="nav-badge">{alertCount > 99 ? '99+' : alertCount}</span>
              )}
            </div>
          )
        )}
      </nav>

      {/* Footer removed for presentation */}
    </aside>
  )
}
