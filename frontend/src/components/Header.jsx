import React from 'react'

export default function Header({ title, sub, time, theme, toggleTheme, sseConnected }) {
  const ts = time.toLocaleTimeString('en-IN', { hour12: false })
  return (
    <header className="header">
      <div className="header-title">
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      <div className="header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div className={`header-pill ${sseConnected ? 'online' : 'offline'}`} style={sseConnected ? { borderColor: 'rgba(16,185,129,.4)', background: 'rgba(16,185,129,.1)', color: '#34d399' } : {}}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: sseConnected ? '#34d399' : '#f87171',
            boxShadow: sseConnected ? '0 0 6px #34d399' : 'none',
          }} />
          {sseConnected ? 'LIVE' : 'OFFLINE'}
        </div>

        <div className={`header-toggle ${theme === 'dark' ? 'is-dark' : 'is-light'}`} onClick={toggleTheme}>
          <div className="icon-wrap icon-sun-wrap">
            <svg className="icon-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          </div>
          <div className="icon-wrap icon-moon-wrap">
            <svg className="icon-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
          </div>
        </div>

        <div className="header-pill clock-pill">
          {ts}
        </div>

        <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
           <div className="header-pill api-pill">
             <span style={{ fontSize: 14 }}>📖</span> API Docs
           </div>
        </a>

        <a href="http://localhost:8000/api/forecast/metrics" target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
           <div className="header-pill eval-pill">
             <span style={{ fontSize: 14 }}>📊</span> Eval Metrics
           </div>
        </a>
      </div>
    </header>
  )
}
