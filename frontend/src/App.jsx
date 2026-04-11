import React, { useState, useEffect } from 'react'
import './index.css'
import { Toaster, toast } from 'react-hot-toast'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import ShelfMonitor from './components/ShelfMonitor'
import PlanogramView from './components/PlanogramView'
import Forecasting from './components/Forecasting'
import AlertsCenter from './components/AlertsCenter'
import StoreMap from './components/StoreMap'

const PAGES = {
  dashboard:     { title: 'Core Analytics Dashboard',     sub: 'Real-time shelf health · DAIICT Hackathon 2025',        component: Dashboard },
  'shelf-monitor':{ title: 'Shelf Monitor — Computer Vision', sub: 'OpenCV + YOLO-style detection · 28 cameras active',  component: ShelfMonitor },
  planogram:     { title: 'Planogram Compliance Engine',  sub: 'Expected vs detected shelf layout comparison',           component: PlanogramView },
  forecasting:   { title: 'Demand Forecasting & Replenishment', sub: 'Holt-Winters model · automated reorder recommendations', component: Forecasting },
  alerts:        { title: 'Alerts Center',                sub: 'Redis pub/sub pipeline · <5 min SLA',                   component: AlertsCenter },
  'store-map':   { title: 'Store Map — Shelf Heatmap',   sub: 'Stockout frequency by aisle · click for details',        component: StoreMap },
}

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [alertCount, setAlertCount] = useState(0)
  const [time, setTime] = useState(new Date())
  const [theme, setTheme] = useState('dark')
  const [sseConnected, setSseConnected] = useState(false)

  // Theme toggle side-effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // SSE — live alerts
  useEffect(() => {
    const es = new EventSource('/api/alerts/stream')
    es.onopen = () => setSseConnected(true)
    es.onmessage = (e) => {
      setSseConnected(true)
      try {
        const alert = JSON.parse(e.data)
        setAlertCount(c => c + 1)
        const icons = { critical: '🚨', high: '⚠️', medium: '📋', low: '💡' }
        toast(alert.title, {
          icon: icons[alert.priority] || '🔔',
          style: {
            background: '#0d1321',
            color: '#f1f5f9',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: '13px',
          },
          duration: 5000,
        })
      } catch (err) { /* skip */ }
    }
    es.onerror = () => setSseConnected(false)
    return () => es.close()
  }, [])

  const CurPage = PAGES[page]?.component || Dashboard
  const pageInfo = PAGES[page] || PAGES.dashboard

  return (
    <div className="app">
      <Toaster position="top-right" />
      <Sidebar page={page} setPage={setPage} alertCount={alertCount} />
      <div className="main">
        <Header 
          title={pageInfo.title} 
          sub={pageInfo.sub} 
          time={time} 
          theme={theme}
          sseConnected={sseConnected}
          toggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        />
        <main className="page-content">
          <CurPage setPage={setPage} />
        </main>
      </div>
    </div>
  )
}
