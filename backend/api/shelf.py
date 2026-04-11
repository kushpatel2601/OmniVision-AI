"""
Shelf scan API routes.
POST /api/shelf/scan/{aisle_id}   — trigger synthetic CV scan, save to MongoDB
POST /api/shelf/upload            — upload a real shelf image → YOLOv8 inference
GET  /api/shelf/scans             — list recent scans
GET  /api/shelf/products          — all products
GET  /api/shelf/dashboard         — aggregated dashboard KPIs
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from datetime import datetime, timedelta
from database.db import get_db
from services.cv_service import run_shelf_scan, run_real_scan
from services.alert_service import publish_alert, make_stockout_alert, make_low_stock_alert

router = APIRouter(prefix="/api/shelf", tags=["shelf"])


@router.get("/products")
async def get_products():
    db = get_db()
    products = await db.products.find({}, {"_id": 0}).to_list(length=100)
    return {"products": products}


@router.post("/scan/{aisle_id}")
async def scan_aisle(aisle_id: str):
    db = get_db()

    # Fetch products in this aisle from MongoDB
    products = await db.products.find({"aisle_id": aisle_id}, {"_id": 0}).to_list(length=50)
    if not products:
        # Fall back to all products if aisle filter returns nothing
        products = await db.products.find({}, {"_id": 0}).to_list(length=20)

    # Run OpenCV + YOLO simulation
    result = run_shelf_scan(products)
    detections = result["detections"]
    summary = result["summary"]

    # Persist scan document to MongoDB
    scan_doc = {
        "aisle_id": aisle_id,
        "camera_id": f"CAM-{aisle_id}-01",
        "scanned_at": datetime.utcnow(),
        **summary,
    }
    scan_insert = await db.shelf_scans.insert_one(scan_doc)
    scan_id = str(scan_insert.inserted_id)

    # Persist each detection
    if detections:
        det_docs = [{"scan_id": scan_id, **d, "detected_at": datetime.utcnow()} for d in detections]
        await db.scan_results.insert_many(det_docs)

    # Generate alerts for empty/low products & push to Redis/queue
    product_map = {p["sku"]: p for p in products}
    for det in detections:
        p = product_map.get(det["sku"], det)
        if det["status"] == "empty":
            alert = make_stockout_alert(p, aisle_id)
            await publish_alert(alert)
            await db.alerts.insert_one({**alert, "created_at": datetime.utcnow()})
        elif det["status"] == "low":
            alert = make_low_stock_alert(p, det["quantity_detected"], aisle_id)
            await publish_alert(alert)
            await db.alerts.insert_one({**alert, "created_at": datetime.utcnow()})

    return {
        "scan_id": scan_id,
        "aisle_id": aisle_id,
        "summary": summary,
        "detections": detections,
    }



# ─── Real YOLOv8 image upload endpoint ───────────────────────────────────────

@router.post("/upload")
async def upload_shelf_image(
    file: UploadFile = File(..., description="Shelf photo — JPEG or PNG"),
    aisle_id: str    = Form(default="A1", description="Aisle ID for this camera (A1–A6)"),
):
    """
    Upload a real shelf image → run YOLOv8 object detection → save to MongoDB.
    Returns detections, summary stats, and annotated image (base64 JPEG).
    """
    # Validate file type
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are accepted (JPEG/PNG).")
    if file.size and file.size > 20 * 1024 * 1024:   # 20 MB cap
        raise HTTPException(status_code=413, detail="Image too large. Maximum size is 20 MB.")

    image_bytes = await file.read()
    db = get_db()

    # Fetch DB products to enrich YOLO detections with known SKU metadata
    products_db = await db.products.find({"aisle_id": aisle_id}, {"_id": 0}).to_list(length=50)
    if not products_db:
        products_db = await db.products.find({}, {"_id": 0}).to_list(length=30)

    # Run real YOLOv8 inference
    result     = run_real_scan(image_bytes, aisle_id=aisle_id, products_from_db=products_db)

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    detections = result["detections"]
    summary    = result["summary"]

    # Persist scan to MongoDB
    scan_doc = {
        "aisle_id":   aisle_id,
        "camera_id":  f"CAM-{aisle_id}-UPLOAD",
        "scan_mode":  "real_yolov8",
        "model":      result.get("model", "yolov8n.pt"),
        "filename":   file.filename,
        "scanned_at": datetime.utcnow(),
        **summary,
    }
    scan_insert = await db.shelf_scans.insert_one(scan_doc)
    scan_id     = str(scan_insert.inserted_id)

    if detections:
        det_docs = [{"scan_id": scan_id, **d, "detected_at": datetime.utcnow()} for d in detections]
        await db.scan_results.insert_many(det_docs)

    # Generate & publish alerts for stockout/low-stock
    product_map = {p["sku"]: p for p in products_db}
    for det in detections:
        p = product_map.get(det["sku"], det)
        if det["status"] == "empty":
            alert = make_stockout_alert(p, aisle_id)
            await publish_alert(alert)
            await db.alerts.insert_one({**alert, "created_at": datetime.utcnow()})
        elif det["status"] == "low":
            alert = make_low_stock_alert(p, det["quantity_detected"], aisle_id)
            await publish_alert(alert)
            await db.alerts.insert_one({**alert, "created_at": datetime.utcnow()})

    return {
        "scan_id":    scan_id,
        "aisle_id":   aisle_id,
        "scan_mode":  "real_yolov8",
        "summary":    summary,
        "detections": detections,
        "image_b64":  result.get("image_b64"),   # annotated image for frontend preview
    }


@router.get("/scans")
async def list_scans(limit: int = 20):
    db = get_db()
    scans = await db.shelf_scans.find(
        {}, {"_id": 0}
    ).sort("scanned_at", -1).limit(limit).to_list(length=limit)
    return {"scans": scans}


@router.get("/dashboard")
async def get_dashboard():
    db = get_db()

    # Latest scan per aisle
    latest_scans = await db.shelf_scans.find(
        {}, {"_id": 0}
    ).sort("scanned_at", -1).limit(50).to_list(length=50)

    # Aggregate stats
    total_empty = sum(s.get("empty_count", 0) for s in latest_scans[:6])
    total_low   = sum(s.get("low_count", 0) for s in latest_scans[:6])
    total_full  = sum(s.get("full_count", 0) for s in latest_scans[:6])
    total       = total_empty + total_low + total_full or 1

    avg_health  = sum(s.get("shelf_health_score", 0) for s in latest_scans[:6]) / max(len(latest_scans[:6]), 1)
    avg_compliance = sum(s.get("compliance_score", 0) for s in latest_scans[:6]) / max(len(latest_scans[:6]), 1)
    oos_rate    = round(total_empty / total * 100, 1)

    # Revenue at risk from unresolved stockout alerts
    pipeline = [
        {"$match": {"is_resolved": False, "alert_type": "stockout"}},
        {"$group": {"_id": None, "total": {"$sum": "$revenue_at_risk"}}}
    ]
    rev_result = await db.alerts.aggregate(pipeline).to_list(length=1)
    revenue_at_risk = rev_result[0]["total"] if rev_result else 0.0

    # Unresolved alert count
    alert_count = await db.alerts.count_documents({"is_resolved": False})

    # Scan history for chart (last 7 days)
    since = datetime.utcnow() - timedelta(days=7)
    history_raw = await db.shelf_scans.find(
        {"scanned_at": {"$gte": since}}, {"_id": 0, "scanned_at": 1, "empty_count": 1, "aisle_id": 1}
    ).sort("scanned_at", 1).to_list(length=200)

    # Calculate aisle scores based on latest scan per aisle
    aisle_scores = {}
    for s in latest_scans:
        aid = s.get("aisle_id")
        if aid and aid not in aisle_scores:
            aisle_scores[aid] = round(s.get("shelf_health_score", 100))
    for aid in ["A1", "A2", "A3", "A4", "A5", "A6"]:
        if aid not in aisle_scores:
            aisle_scores[aid] = 100

    return {
        "kpis": {
            "shelf_health_score": round(avg_health, 1),
            "oos_rate": oos_rate,
            "compliance_score": round(avg_compliance, 1),
            "revenue_at_risk": round(revenue_at_risk, 2),
            "alert_count": alert_count,
            "total_products": total,
            "empty_count": total_empty,
            "low_count": total_low,
            "full_count": total_full,
        },
        "stock_distribution": {
            "full": total_full,
            "low": total_low,
            "empty": total_empty,
        },
        "aisle_scores": aisle_scores,
        "scan_history": [
            {
                "date": s["scanned_at"].strftime("%Y-%m-%d %H:%M") if hasattr(s["scanned_at"], "strftime") else str(s["scanned_at"]),
                "empty_count": s.get("empty_count", 0),
                "aisle": s.get("aisle_id", "?"),
            }
            for s in history_raw
        ],
    }
