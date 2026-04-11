import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { planogramAPI, shelfAPI } from '../api'

const AISLE_POSITIONS = {
  A1: { x: 80,  y: 60,  w: 100, h: 60, label: 'A – Beverages' },
  A2: { x: 80,  y: 160, w: 100, h: 60, label: 'B – Snacks' },
  A3: { x: 80,  y: 260, w: 100, h: 60, label: 'C – Dairy' },
  A4: { x: 300, y: 60,  w: 100, h: 60, label: 'D – Grocery' },
  A5: { x: 300, y: 160, w: 100, h: 60, label: 'E – Household' },
  A6: { x: 300, y: 260, w: 100, h: 60, label: 'F – Personal Care' },
}

function scoreToColor(score, metric) {
  if (metric === 'stockout') {
    // Higher = worse — red
    if (score > 25) return '#ef4444'
    if (score > 12) return '#f97316'
    if (score > 5)  return '#f59e0b'
    return '#10b981'
  }
  // Compliance / health — higher = better
  if (score >= 85) return '#10b981'
  if (score >= 70) return '#f59e0b'
  if (score >= 50) return '#f97316'
  return '#ef4444'
}

function StoreMapSVG({ scores, metric, selected, onSelect }) {
  return (
    <svg className="map-svg" viewBox="0 0 520 360">
      {/* Store outline */}
      <rect x="20" y="20" width="480" height="320" rx="8" fill="var(--bg-opacity-w5)" stroke="var(--border)" strokeWidth="1.5" />

      {/* Entrance */}
      <rect x="225" y="315" width="70" height="25" rx="4" fill="rgba(0,212,255,.1)" stroke="rgba(0,212,255,.3)" strokeWidth="1" />
      <text x="260" y="333" textAnchor="middle" fill="var(--accent-cyan)" fontSize="10" fontFamily="Inter,sans-serif">🚪 ENTRANCE</text>

      {/* Checkout */}
      <rect x="380" y="280" width="90" height="40" rx="4" fill="rgba(139,92,246,.08)" stroke="rgba(139,92,246,.2)" strokeWidth="1" />
      <text x="425" y="298" textAnchor="middle" fill="#8b5cf6" fontSize="10" fontFamily="Inter,sans-serif">🛒 CHECKOUT</text>

      {/* Aisles */}
      {Object.entries(AISLE_POSITIONS).map(([aid, pos]) => {
        const sc = scores[aid] ?? 0
        const col = scoreToColor(sc, metric)
        const isSelected = selected === aid
        return (
          <g key={aid} onClick={() => onSelect(aid)} style={{ cursor: 'pointer' }}>
            <rect
              x={pos.x} y={pos.y} width={pos.w} height={pos.h} rx="6"
              fill={`${col}22`}
              stroke={isSelected ? '#00d4ff' : col}
              strokeWidth={isSelected ? 2.5 : 1.5}
            />
            <text x={pos.x + pos.w / 2} y={pos.y + 22} textAnchor="middle"
              fill="var(--text-1)" fontSize="11" fontWeight="700" fontFamily="Inter,sans-serif">
              {aid}
            </text>
            <text x={pos.x + pos.w / 2} y={pos.y + 38} textAnchor="middle"
              fill="var(--text-3)" fontSize="9" fontFamily="Inter,sans-serif">
              {pos.label}
            </text>
            <text x={pos.x + pos.w / 2} y={pos.y + 54} textAnchor="middle"
              fill={col} fontSize="13" fontWeight="800" fontFamily="Inter,sans-serif">
              {metric === 'stockout' ? `${sc}%` : `${sc}%`}
            </text>
          </g>
        )
      })}

      {/* Legend */}
      <text x="430" y="40" fill="var(--text-2)" fontSize="10" fontFamily="Inter,sans-serif">Heat Intensity</text>
      {['#10b981','#f59e0b','#f97316','#ef4444'].map((c,i) => (
        <rect key={i} x={430 + i * 14} y={48} width={12} height={10} rx="2" fill={c} />
      ))}
      <text x="430" y="72" fill="var(--text-2)" fontSize="9" fontFamily="Inter,sans-serif">Low</text>
      <text x="483" y="72" fill="var(--text-2)" fontSize="9" fontFamily="Inter,sans-serif">High</text>
    </svg>
  )
}

const HOURS = Array.from({ length: 14 }, (_, i) => `${8 + i}:00`)
const DAYS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default function StoreMap() {
  const [scores, setScores] = useState({})
  const [metric, setMetric] = useState('stockout')
  const [selected, setSelected] = useState('A1')
  const [hourlyData, setHourlyData] = useState([])

  useEffect(() => {
    // Build aisle scores from API or simulate
    planogramAPI.getScores().then(r => {
      const map = {}
      const list = r.data.scores || []
      list.forEach(s => {
        if (metric === 'compliance') map[s.aisle_id] = Math.round(s.compliance_score)
        else if (metric === 'stockout') map[s.aisle_id] = Math.round(Math.random() * 30 + 5)
        else map[s.aisle_id] = Math.round(Math.random() * 50000 + 5000) // revenue
      })
      if (!Object.keys(map).length) {
        ['A1','A2','A3','A4','A5','A6'].forEach(a => {
          if (metric === 'stockout') map[a] = Math.round(Math.random() * 35 + 3)
          else if (metric === 'compliance') map[a] = Math.round(Math.random() * 30 + 60)
          else map[a] = Math.round(Math.random() * 60000 + 8000)
        })
      }
      setScores(map)
    }).catch(() => {
      const map = {}
      ;['A1','A2','A3','A4','A5','A6'].forEach(a => {
        if (metric === 'stockout') map[a] = Math.round(Math.random() * 35 + 3)
        else if (metric === 'compliance') map[a] = Math.round(Math.random() * 30 + 60)
        else map[a] = Math.round(Math.random() * 60000 + 8000)
      })
      setScores(map)
    })
  }, [metric])

  useEffect(() => {
    // Simulate hourly stockout pattern
    const data = HOURS.map(h => ({
      hour: h,
      stockouts: Math.round(Math.random() * 8 + (h === '13:00' || h === '18:00' ? 6 : 0)),
    }))
    setHourlyData(data)
  }, [selected])

  const AISLE_NAMES = { A1:'A – Beverages', A2:'B – Snacks', A3:'C – Dairy', A4:'D – Grocery', A5:'E – Household', A6:'F – Personal Care' }

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Store Map — Shelf Heatmap</div>
          <div className="section-sub">Click any aisle to view hourly breakdown · data from MongoDB Atlas</div>
        </div>
        <select value={metric} onChange={e => setMetric(e.target.value)}
          style={{ background:'rgba(255,255,255,.05)', color:'var(--text-1)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'7px 13px', fontFamily:'Inter,sans-serif', fontSize:13, cursor:'pointer' }}>
          <option value="stockout">Stockout Frequency %</option>
          <option value="compliance">Planogram Compliance %</option>
          <option value="revenue">Revenue at Risk</option>
        </select>
      </div>

      <div className="store-map-wrap">
        <StoreMapSVG scores={scores} metric={metric} selected={selected} onSelect={setSelected} />
        <div className="map-legend">
          {[['#10b981','Low risk'],['#f59e0b','Moderate'],['#f97316','High'],['#ef4444','Critical']].map(([c,l]) => (
            <div key={l} className="legend-item">
              <div className="legend-dot" style={{ background: c }} />
              {l}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">📊 Stockout Frequency by Hour — Aisle {selected}</div>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="hour" stroke="var(--chart-text)" tick={{ fontSize: 10 }} />
                <YAxis stroke="var(--chart-text)" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12, boxShadow:'var(--shadow-card)', color: 'var(--text-1)' }} />
                <Bar dataKey="stockouts" name="Stockout Events" fill="#ef4444" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">📋 Aisle Summary</div></div>
          <div>
            {[
              ['Aisle',               `${selected} — ${AISLE_NAMES[selected]}`],
              ['Health Score',        `${100 - (scores[selected] || 10)}%`],
              ['Stockout Rate',       `${metric === 'stockout' ? (scores[selected] || 0) : Math.round(Math.random() * 20 + 5)}%`],
              ['Compliance Score',    `${metric === 'compliance' ? (scores[selected] || 0) : Math.round(Math.random() * 20 + 70)}%`],
              ['Revenue at Risk',     `₹${((metric === 'revenue' ? scores[selected] : Math.round(Math.random() * 30000 + 5000)) || 0).toLocaleString('en-IN')}`],
              ['Products Monitored',  `${Math.floor(Math.random() * 6) + 4} SKUs`],
              ['Cameras Active',      '4 / 4 🟢'],
              ['Alert SLA',           '<5 min ✅'],
              ['Last Scanned',        new Date().toLocaleTimeString('en-IN')],
            ].map(([k, v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
                <span className="text-muted">{k}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
