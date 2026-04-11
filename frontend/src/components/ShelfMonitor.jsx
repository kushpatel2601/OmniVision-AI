import React, { useState, useEffect, useRef, useCallback } from 'react'
import { shelfAPI } from '../api'

const AISLES = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6']
const AISLE_NAMES = { A1: 'Beverages', A2: 'Snacks', A3: 'Dairy', A4: 'Grocery', A5: 'Household', A6: 'Personal Care' }

/* ─── Synthetic shelf visualiser (demo mode) ─────────────────────────────── */
function ShelfVisual({ products, scanning }) {
  const rows = 4, cols = Math.ceil(products.length / rows)
  const shelves = Array.from({ length: rows }, (_, r) => products.slice(r * cols, (r + 1) * cols))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '28px 6px 6px', height: '100%', background: 'linear-gradient(to bottom, #1a1a2e, #16213e)' }}>
      {scanning && <div className="scan-overlay" />}
      {shelves.map((row, ri) => (
        <div key={ri} style={{ flex: 1, display: 'flex', gap: 3, alignItems: 'flex-end', borderBottom: '2px solid rgba(139,116,93,.5)', paddingBottom: 2 }}>
          {row.map((p, ci) => (
            <div key={ci} style={{
              flex: 1, height: p.status === 'empty' ? '80%' : p.status === 'low' ? '40%' : '85%',
              borderRadius: 2, background: p.status === 'empty' ? 'rgba(239,68,68,.1)' : p.color_hex || '#00d4ff',
              border: p.status === 'empty' ? '1px dashed rgba(239,68,68,.4)' : 'none',
              opacity: p.status === 'low' ? 0.6 : 1,
              outline: scanning ? '1.5px solid rgba(0,212,255,.6)' : 'none',
              transition: 'all .3s',
            }} title={p.product_name} />
          ))}
        </div>
      ))}
    </div>
  )
}

/* ─── Drag & Drop upload zone ────────────────────────────────────────────── */
function UploadZone({ onFile, uploading, disabled }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  const handleDrop = useCallback(e => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f && f.type.startsWith('image/')) onFile(f)
  }, [onFile])

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragging ? 'var(--accent)' : 'rgba(0,212,255,.3)'}`,
        borderRadius: 'var(--r)',
        padding: '28px 20px',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: dragging ? 'rgba(0,212,255,.06)' : 'rgba(0,212,255,.02)',
        transition: 'all .2s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
      <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
      <div style={{ color: 'var(--text-1)', fontWeight: 600, marginBottom: 4 }}>
        {uploading ? 'Running YOLOv8 inference…' : 'Drop a shelf photo here'}
      </div>
      <div style={{ color: 'var(--text-3)', fontSize: 12 }}>
        or click to browse · JPEG / PNG · max 20 MB
      </div>
    </div>
  )
}

/* ─── Annotated image preview with bbox overlay ──────────────────────────── */
function AnnotatedPreview({ imageB64, detections, originalFile }) {
  const canvasRef = useRef()

  useEffect(() => {
    // The backend already drew bboxes — just show the returned image
    if (!imageB64) return
  }, [imageB64, detections])

  if (!imageB64 && !originalFile) return null

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <div className="card-title">🎯 YOLOv8 Annotated Result</div>
        <span style={{
          fontSize: 11, padding: '2px 8px', borderRadius: 20,
          background: 'rgba(52,211,153,.15)', color: '#34d399', fontWeight: 600
        }}>REAL MODE</span>
      </div>
      <div style={{ padding: 12 }}>
        {imageB64 ? (
          <img
            src={`data:image/jpeg;base64,${imageB64}`}
            alt="YOLOv8 annotated shelf"
            style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }}
          />
        ) : (
          <img
            src={URL.createObjectURL(originalFile)}
            alt="uploaded shelf"
            style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)', opacity: 0.5 }}
          />
        )}
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, textAlign: 'center' }}>
          Bounding boxes drawn by YOLOv8 · Green = Full · Amber = Low · Red = Empty
        </div>
      </div>
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function ShelfMonitor() {
  /* Shared state */
  const [detections, setDetections]   = useState([])
  const [summary, setSummary]         = useState(null)
  const [scanAisle, setScanAisle]     = useState('A1')
  const [products, setProducts]       = useState([])
  const [scanMode, setScanMode]       = useState('demo')   // 'demo' | 'upload'

  /* Demo scan state */
  const [scanning, setScanning]       = useState(false)
  const [loading, setLoading]         = useState(false)

  /* Upload scan state */
  const [uploadFile, setUploadFile]   = useState(null)
  const [uploading, setUploading]     = useState(false)
  const [imageB64, setImageB64]       = useState(null)
  const [uploadError, setUploadError] = useState(null)

  useEffect(() => {
    shelfAPI.getProducts().then(r => setProducts(r.data.products || []))
  }, [])

  /* Demo mode scan */
  const handleDemoScan = async () => {
    setScanning(true); setLoading(true)
    setDetections([]); setSummary(null); setImageB64(null)
    try {
      const res = await shelfAPI.scanAisle(scanAisle)
      setDetections(res.data.detections || [])
      setSummary(res.data.summary)
    } catch (e) { console.error(e) }
    finally { setScanning(false); setLoading(false) }
  }

  /* Real YOLOv8 upload scan */
  const handleUpload = async (file) => {
    setUploadFile(file)
    setUploading(true)
    setUploadError(null)
    setDetections([]); setSummary(null); setImageB64(null)
    try {
      const res = await shelfAPI.uploadShelfImage(file, scanAisle)
      setDetections(res.data.detections || [])
      setSummary(res.data.summary)
      setImageB64(res.data.image_b64 || null)
    } catch (e) {
      const msg = e.response?.data?.detail || 'Upload failed. Is the backend running?'
      setUploadError(msg)
    } finally { setUploading(false) }
  }

  const empty = detections.filter(d => d.status === 'empty').length
  const low   = detections.filter(d => d.status === 'low').length
  const full  = detections.filter(d => d.status === 'full').length

  return (
    <div>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="section-header">
        <div>
          <div className="section-title">Shelf Monitor — Computer Vision</div>
          <div className="section-sub">
            {scanMode === 'upload'
              ? '🟢 Real YOLOv8 mode — upload a shelf photo for actual object detection'
              : '🔵 Demo mode — OpenCV synthetic shelf + simulated detection'}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {/* Mode toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,.05)', borderRadius: 8, padding: 3, border: '1px solid var(--border)' }}>
            {['demo', 'upload'].map(m => (
              <button key={m} onClick={() => { setScanMode(m); setDetections([]); setSummary(null); setImageB64(null) }}
                style={{
                  padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  background: scanMode === m ? (m === 'upload' ? 'var(--accent-green)' : 'var(--accent)') : 'transparent',
                  color: scanMode === m ? '#000' : 'var(--text-2)',
                  transition: 'all .2s',
                }}>
                {m === 'demo' ? '🔵 Demo' : '🟢 Real YOLOv8'}
              </button>
            ))}
          </div>

          {/* Aisle selector */}
          <select value={scanAisle} onChange={e => setScanAisle(e.target.value)}
            style={{ background: 'rgba(255,255,255,.05)', color: 'var(--text-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '7px 13px', fontFamily: 'Inter,sans-serif', fontSize: 13, cursor: 'pointer' }}>
            {AISLES.map(a => <option key={a} value={a}>{a} — {AISLE_NAMES[a]}</option>)}
          </select>

          {/* Demo scan button (demo mode only) */}
          {scanMode === 'demo' && (
            <button className="btn btn-primary" onClick={handleDemoScan} disabled={loading}>
              {loading ? 'Scanning…' : '🔍 Run CV Scan'}
            </button>
          )}
        </div>
      </div>

      {/* ── Upload zone (real mode) ────────────────────────────────────────── */}
      {scanMode === 'upload' && (
        <div style={{ marginBottom: 20 }}>
          <UploadZone onFile={handleUpload} uploading={uploading} disabled={uploading} />
          {uploadError && (
            <div style={{ marginTop: 10, padding: '10px 16px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, color: '#f87171', fontSize: 13 }}>
              ⚠️ {uploadError}
            </div>
          )}
          {uploading && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-2)', fontSize: 13 }}>
              <div className="spinner" /> Running YOLOv8 inference on your image… (first run downloads ~6MB weights)
            </div>
          )}
        </div>
      )}

      {/* ── Camera feeds (demo mode) ───────────────────────────────────────── */}
      {scanMode === 'demo' && (
        <div className="camera-grid">
          {AISLES.map(a => {
            const aisleProds = products.filter(p => p.aisle_id === a).slice(0, 12)
            const simProds   = aisleProds.length ? aisleProds : products.slice(0, 8)
            const withStatus = simProds.map(p => ({
              ...p, status: Math.random() < 0.14 ? 'empty' : Math.random() < 0.25 ? 'low' : 'full',
            }))
            return (
              <div key={a} className="camera-feed" onClick={() => { setScanAisle(a); handleDemoScan() }}>
                <div className="feed-header">
                  <span className="feed-label">CAM-{a}</span>
                  <span className="feed-live">LIVE</span>
                </div>
                <ShelfVisual products={withStatus} scanning={scanning && scanAisle === a} />
              </div>
            )
          })}
        </div>
      )}

      {/* ── Annotated YOLOv8 preview (real mode) ──────────────────────────── */}
      {scanMode === 'upload' && (imageB64 || uploadFile) && (
        <AnnotatedPreview imageB64={imageB64} detections={detections} originalFile={uploadFile} />
      )}

      {/* ── Summary badges ─────────────────────────────────────────────────── */}
      {summary && (
        <div className="flex gap-3 mb-3" style={{ flexWrap: 'wrap' }}>
          <div className="scan-status">
            📊 Health: <strong style={{ color: 'var(--accent-green)' }}>{summary.shelf_health_score}%</strong>
          </div>
          <div className="scan-status">
            🎯 Confidence: <strong style={{ color: 'var(--accent)' }}>{(summary.avg_confidence * 100).toFixed(1)}%</strong>
          </div>
          <div className="scan-status">
            ✅ Compliance: <strong style={{ color: 'var(--accent-cyan)' }}>{summary.compliance_score}%</strong>
          </div>
          {scanMode === 'upload' && (
            <div className="scan-status">
              🤖 Mode: <strong style={{ color: '#34d399' }}>Real YOLOv8</strong>
            </div>
          )}
        </div>
      )}

      {/* ── Status badges ─────────────────────────────────────────────────── */}
      {detections.length > 0 && (
        <div className="flex gap-2 mb-3">
          <span className="badge badge-empty">● {empty} Empty</span>
          <span className="badge badge-low">● {low} Low</span>
          <span className="badge badge-full">● {full} Full</span>
          <span style={{ fontSize: 12, color: 'var(--text-3)', alignSelf: 'center', marginLeft: 4 }}>
            {detections.length} objects detected
          </span>
        </div>
      )}

      {/* ── Detection results table ────────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            {scanMode === 'upload' ? '🤖 YOLOv8 Detections (real inference)' : '🎯 Detection Results (demo)'}
          </div>
          <span className="text-muted text-xs">{detections.length} objects · saved to MongoDB</span>
        </div>
        {detections.length === 0
          ? (
            <div className="empty-state">
              {scanMode === 'upload'
                ? 'Upload a shelf photo above to run real YOLOv8 detection'
                : 'Click "Run CV Scan" or click any camera feed to trigger analysis'}
            </div>
          )
          : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>SKU</th><th>Product / Class</th><th>Category</th>
                    <th>Status</th><th>Qty</th><th>Confidence</th>
                    <th>Price Tag</th><th>Planogram</th>
                    {scanMode === 'upload' && <th>Bbox (x,y,w,h)</th>}
                  </tr>
                </thead>
                <tbody>
                  {detections.map((d, i) => (
                    <tr key={i}>
                      <td><span className="font-mono text-accent">{d.sku}</span></td>
                      <td style={{ fontWeight: 500 }}>
                        {d.product_name}
                        {d.coco_class && <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 4 }}>({d.coco_class})</span>}
                      </td>
                      <td className="text-muted">{d.category}</td>
                      <td><span className={`badge badge-${d.status}`}>
                        {d.status === 'empty' ? '⬜' : d.status === 'low' ? '🟡' : '🟢'} {d.status}
                      </span></td>
                      <td>{d.quantity_detected}</td>
                      <td>
                        <div className="conf-bar"><div className="conf-fill" style={{ width: `${d.confidence * 100}%` }} /></div>
                        <span className="font-mono text-xs text-muted">{(d.confidence * 100).toFixed(1)}%</span>
                      </td>
                      <td>{d.price_tag_detected ? '✅' : '❌'}</td>
                      <td>{d.planogram_compliant ? '✅' : '⚠️'}</td>
                      {scanMode === 'upload' && (
                        <td style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-3)' }}>
                          {d.bbox ? `${d.bbox.x},${d.bbox.y} ${d.bbox.w}×${d.bbox.h}` : '—'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>

      {/* ── How it works info card (real mode, no scan yet) ───────────────── */}
      {scanMode === 'upload' && detections.length === 0 && !uploading && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header"><div className="card-title">ℹ️ How Real YOLOv8 Mode Works</div></div>
          <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['1️⃣ Upload', 'Take a photo of any real store shelf and upload it'],
              ['2️⃣ YOLOv8 Inference', 'YOLOv8n runs object detection — detects bottles, cups, boxes, produce etc.'],
              ['3️⃣ SKU Mapping', 'COCO class names are mapped to retail SKU categories (Beverages, Snacks…)'],
              ['4️⃣ Stock Classify', 'ROI pixel brightness classifies each slot as Full / Low / Empty'],
              ['5️⃣ Annotated Preview', 'The server returns the image with bounding boxes drawn in colour'],
              ['6️⃣ MongoDB Save', 'All detections + alerts are saved to your Atlas database'],
            ].map(([title, desc]) => (
              <div key={title} style={{ padding: '10px 12px', background: 'rgba(255,255,255,.03)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
