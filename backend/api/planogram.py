"""
Planogram compliance API routes.
GET  /api/planogram/aisles              — available aisles with planogram data
POST /api/planogram/check/{aisle_id}    — run compliance check against latest scan
GET  /api/planogram/layout/{aisle_id}  — raw planogram layout from MongoDB
"""
from fastapi import APIRouter, HTTPException
from database.db import get_db
from services.planogram_service import check_planogram_compliance
from services.alert_service import publish_alert, make_planogram_alert
from datetime import datetime

router = APIRouter(prefix="/api/planogram", tags=["planogram"])


@router.get("/aisles")
async def get_aisles():
    db = get_db()
    aisles = await db.planogram_layouts.distinct("aisle_id")
    result = []
    for aid in aisles:
        doc = await db.planogram_layouts.find_one({"aisle_id": aid})
        result.append({"aisle_id": aid, "aisle_name": doc.get("aisle_name", aid) if doc else aid})
    return {"aisles": result}


@router.get("/layout/{aisle_id}")
async def get_layout(aisle_id: str):
    db = get_db()
    entries = await db.planogram_layouts.find(
        {"aisle_id": aisle_id}, {"_id": 0}
    ).to_list(length=100)
    if not entries:
        raise HTTPException(status_code=404, detail=f"No planogram data for aisle {aisle_id}")
    return {"aisle_id": aisle_id, "layout": entries}


@router.post("/check/{aisle_id}")
async def run_compliance_check(aisle_id: str):
    db = get_db()

    # Fetch planogram reference from MongoDB
    planogram_entries = await db.planogram_layouts.find(
        {"aisle_id": aisle_id}, {"_id": 0}
    ).to_list(length=100)
    if not planogram_entries:
        raise HTTPException(status_code=404, detail=f"No planogram for aisle {aisle_id}")

    # Fetch latest scan detections for this aisle
    latest_scan = await db.shelf_scans.find_one(
        {"aisle_id": aisle_id}, sort=[("scanned_at", -1)]
    )
    if latest_scan:
        scan_id = str(latest_scan["_id"])
        detections = await db.scan_results.find(
            {"scan_id": scan_id}, {"_id": 0}
        ).to_list(length=200)
    else:
        detections = []

    # Run compliance engine
    report = check_planogram_compliance(planogram_entries, detections)

    # Push planogram alerts for high-severity violations
    for violation in report["violations"]:
        if violation["severity"] in ("high", "medium"):
            alert = make_planogram_alert({**violation, "aisle_id": aisle_id})
            await publish_alert(alert)
            await db.alerts.insert_one({**alert, "created_at": datetime.utcnow()})

    return report


@router.get("/scores")
async def get_all_scores():
    """Get compliance score per aisle from recent scans."""
    db = get_db()
    aisles = await db.planogram_layouts.distinct("aisle_id")
    scores = []
    for aid in aisles:
        scan = await db.shelf_scans.find_one(
            {"aisle_id": aid}, sort=[("scanned_at", -1)]
        )
        scores.append({
            "aisle_id": aid,
            "compliance_score": scan.get("compliance_score", 0) if scan else 0,
            "shelf_health_score": scan.get("shelf_health_score", 0) if scan else 0,
            "scanned_at": scan["scanned_at"].isoformat() if scan else None,
        })
    return {"scores": scores}
