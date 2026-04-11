import React, { useEffect, useState } from 'react'
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts'
import { forecastAPI } from '../api'

const FMT = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12, boxShadow: 'var(--shadow-card)' }}>
      <p style={{ color: 'var(--text-3)', marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>)}
    </div>
  )
}

// WMAPE color: <10% green, 10-20% amber, >20% red
function wmapeColor(w) {
  if (w == null) return 'var(--text-3)'
  if (w < 10) return 'var(--accent-green)'
  if (w < 20) return 'var(--accent-amber)'
  return 'var(--accent-red)'
}

function wmapeLabel(w) {
  if (w == null) return '—'
  if (w < 10) return 'Excellent'
  if (w < 20) return 'Good'
  if (w < 30) return 'Acceptable'
  return 'Needs Tuning'
}

export default function Forecasting() {
  const [skus, setSkus] = useState([])
  const [selectedSku, setSelectedSku] = useState('')
  const [forecastData, setForecastData] = useState(null)
  const [replenishment, setReplenishment] = useState([])
  const [loading, setLoading] = useState(false)
  const [repLoading, setRepLoading] = useState(false)
  const [promoBoost, setPromoBoost] = useState(false)
  const [wmapeList, setWmapeList] = useState({}) // map sku→wmape from /all

  useEffect(() => {
    forecastAPI.getAll().then(r => {
      const forecasts = r.data.forecasts || []
      setSkus(forecasts.map(f => ({ sku: f.sku, name: f.name })))
      // Collect wmape per sku
      const map = {}
      forecasts.forEach(f => { if (f.wmape != null) map[f.sku] = f.wmape })
      setWmapeList(map)
      if (forecasts.length) setSelectedSku(forecasts[0].sku)
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (!selectedSku) return
    setLoading(true)
    forecastAPI.getForecast(selectedSku)
      .then(r => setForecastData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedSku])

  useEffect(() => {
    setRepLoading(true)
    forecastAPI.getReplenishment()
      .then(r => setReplenishment(r.data.orders || []))
      .catch(console.error)
      .finally(() => setRepLoading(false))
  }, [])

  // Build chart data: last 30 of history + 14 forecast (with optional promo boost)
  const chartData = forecastData ? [
    ...(forecastData.history || []).slice(-30).map(h => ({
      date: h.sale_date || h.date,
      actual: h.quantity_sold,
      isPromo: h.is_promo,
    })),
    ...(forecastData.forecast || []).map(f => ({
      date: f.date,
      forecast: promoBoost ? Math.round(f.value * 1.20) : f.value,
      lower: promoBoost ? Math.round(f.lower * 1.20) : f.lower,
      upper: promoBoost ? Math.round(f.upper * 1.20) : f.upper,
    })),
  ] : []

  const reorder = forecastData?.reorder || {}
  const currentWmape = wmapeList[selectedSku] ?? forecastData?.wmape

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Demand Forecasting &amp; Replenishment</div>
          <div className="section-sub">statsmodels Holt-Winters · Prophet-compatible output · safety stock &amp; EOQ · WMAPE accuracy tracking</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Promotional boost toggle */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            padding: '6px 12px', borderRadius: 8,
            background: promoBoost ? 'rgba(245,158,11,.15)' : 'rgba(255,255,255,.04)',
            border: `1px solid ${promoBoost ? 'rgba(245,158,11,.4)' : 'var(--border)'}`,
            fontSize: 12, fontWeight: 600, color: promoBoost ? '#f59e0b' : 'var(--text-2)',
            transition: 'all .2s',
          }}>
            <input type="checkbox" checked={promoBoost} onChange={e => setPromoBoost(e.target.checked)}
              style={{ accentColor: '#f59e0b', width: 14, height: 14 }} />
            🎉 Promo Event +20%
          </label>
          <select value={selectedSku} onChange={e => setSelectedSku(e.target.value)}
            style={{ background:'rgba(255,255,255,.05)', color:'var(--text-1)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'7px 13px', fontFamily:'Inter,sans-serif', fontSize:13, cursor:'pointer' }}>
            {skus.map(s => <option key={s.sku} value={s.sku}>{s.sku} — {s.name}</option>)}
          </select>
        </div>
      </div>

      {/* WMAPE Accuracy Banner */}
      {currentWmape != null && (
        <div style={{
          marginBottom: 16, padding: '12px 18px', borderRadius: 12,
          background: 'linear-gradient(90deg, rgba(16,185,129,.08), rgba(0,212,255,.05))',
          border: `1px solid ${wmapeColor(currentWmape)}44`,
          display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: wmapeColor(currentWmape), fontFamily: 'JetBrains Mono, monospace' }}>
                {currentWmape}%
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>WMAPE</div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: wmapeColor(currentWmape) }}>
                {wmapeLabel(currentWmape)} Forecast Accuracy
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                Weighted Mean Absolute Percentage Error · Lower is better · Evaluated on 7-day holdout
              </div>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
            {[['<10%','Excellent','#10b981'],['10-20%','Good','#f59e0b'],['>20%','Review','#ef4444']].map(([r,l,c]) => (
              <div key={r} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: c }}>{r}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{l}</div>
              </div>
            ))}
          </div>
          {promoBoost && (
            <div style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(245,158,11,.15)', color: '#f59e0b', fontSize: 11, fontWeight: 700 }}>
              🎉 +20% Promo Boost Applied
            </div>
          )}
        </div>
      )}

      {/* Forecast Chart */}
      <div className="card mb-4">
        <div className="card-header">
          <div className="card-title">📈 14-Day Demand Forecast — Holt-Winters Exponential Smoothing</div>
          <div className="flex gap-2">
            {[['#00d4ff','Historical'],['#f59e0b','Forecast'],['rgba(245,158,11,.2)','Conf. Interval']].map(([c,l]) => (
              <span key={l} className="flex items-center gap-2" style={{ fontSize: 11, color: 'var(--text-2)' }}>
                <span style={{ width: 16, height: 2, background: c, display: 'inline-block', borderRadius: 1 }} />{l}
              </span>
            ))}
          </div>
        </div>
        <div style={{ position: 'relative', height: 300 }}>
          {loading
            ? <div className="loading"><div className="spinner" /> Computing forecast…</div>
            : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="date" stroke="var(--chart-text)" tick={{ fontSize: 10 }} interval={6} />
                  <YAxis stroke="var(--chart-text)" tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area dataKey="upper" name="Upper CI" fill="rgba(245,158,11,.08)" stroke="none" />
                  <Area dataKey="lower" name="Lower CI" fill="rgba(245,158,11,.08)" stroke="none" />
                  <Line dataKey="actual" name="Historical Sales" stroke="#00d4ff" strokeWidth={2} dot={false} />
                  <Line dataKey="forecast" name={promoBoost ? 'Forecast (+Promo)' : 'Forecast'} stroke={promoBoost ? '#f59e0b' : '#f59e0b'} strokeWidth={promoBoost ? 2.5 : 2} strokeDasharray="5 3" dot={false} />
                  {reorder.reorder_point && (
                    <ReferenceLine y={reorder.reorder_point * 0.8} stroke="#ef4444" strokeDasharray="4 4"
                      label={{ value: 'Reorder Point', fill: '#ef4444', fontSize: 10 }} />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* Reorder Metrics */}
        {forecastData && (
          <div className="forecast-metrics">
            {[
              ['Mean Daily Demand', `${reorder.mean_daily_demand} units`, 'Based on last 30 days', 'var(--accent)'],
              ['Safety Stock',      `${reorder.safety_stock} units`,      '95% service level (z=1.65)', 'var(--accent-green)'],
              ['Reorder Point',     `${reorder.reorder_point} units`,     `Lead time: ${reorder.lead_time_days}d`, 'var(--accent-amber)'],
              ['Suggested EOQ',     `${reorder.eoq} units`,               'Economic Order Quantity', 'var(--accent-purple)'],
              ['Days Until Stockout', reorder.days_until_stockout != null ? `${reorder.days_until_stockout}d` : '—',
                reorder.days_until_stockout != null && reorder.days_until_stockout < 3 ? '⚠️ Critical!' : 'Based on current stock',
                reorder.days_until_stockout != null && reorder.days_until_stockout < 3 ? 'var(--accent-red)' : 'var(--accent-cyan)'],
            ].map(([label, value, sub, color]) => (
              <div key={label} className="metric-card">
                <div className="metric-label">{label}</div>
                <div className="metric-value" style={{ color }}>{value}</div>
                <div className="metric-sub">{sub}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Replenishment Orders */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">🚚 Automated Replenishment Orders (MongoDB → Warehouse)</div>
          <span className="badge badge-empty">{replenishment.length} orders pending</span>
        </div>
        {repLoading
          ? <div className="loading"><div className="spinner" />Loading orders…</div>
          : replenishment.length === 0
            ? <div className="empty-state">All products above reorder point ✅</div>
            : (
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Priority</th><th>SKU</th><th>Product</th>
                      <th>Stock</th><th>Reorder Pt.</th><th>Suggest Qty</th>
                      <th>Days Until OOS</th><th>Lead Time</th><th>Revenue Risk</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {replenishment.map((o, i) => (
                      <tr key={i}>
                        <td><span className={`badge urgency-${o.urgency}`}>{o.urgency}</span></td>
                        <td><span className="font-mono text-accent">{o.sku}</span></td>
                        <td style={{ fontWeight: 500 }}>{o.name}</td>
                        <td style={{ color: o.current_stock === 0 ? 'var(--accent-red)' : 'var(--accent-amber)' }}>
                          {o.current_stock}
                        </td>
                        <td className="text-muted">{o.reorder_point}</td>
                        <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{o.suggested_qty}</td>
                        <td>
                          {o.days_until_stockout != null ? (
                            <span style={{ fontWeight: 700, color: o.days_until_stockout < 3 ? 'var(--accent-red)' : o.days_until_stockout < 7 ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
                              {o.days_until_stockout}d
                            </span>
                          ) : '—'}
                        </td>
                        <td className="text-muted">{o.eta}</td>
                        <td style={{ color: 'var(--accent-red)' }}>{FMT.format(o.revenue_at_risk)}</td>
                        <td>
                          <button className="btn btn-sm" style={{ background:'rgba(16,185,129,.1)', color:'var(--accent-green)', border:'1px solid rgba(16,185,129,.25)', fontSize:11, padding:'4px 10px', borderRadius:5 }}>
                            ✓ Approve
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>
    </div>
  )
}
