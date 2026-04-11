"""
Alerts API routes.
GET  /api/alerts             — paginated alert list from MongoDB
GET  /api/alerts/stream      — SSE endpoint for live alert push
POST /api/alerts/{id}/resolve — mark alert as resolved
GET  /api/alerts/stats       — alert counts by type/priority
"""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from database.db import get_db
from services.alert_service import alert_stream, publish_alert
from bson import ObjectId
from datetime import datetime
import json

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


def _serialize(doc):
    """Convert MongoDB document to JSON-serializable dict."""
    doc["id"] = str(doc.pop("_id", ""))
    if isinstance(doc.get("created_at"), datetime):
        doc["created_at"] = doc["created_at"].isoformat()
    if isinstance(doc.get("resolved_at"), datetime):
        doc["resolved_at"] = doc["resolved_at"].isoformat()
    return doc


@router.get("")
async def get_alerts(
    limit: int = 50,
    alert_type: str = None,
    priority: str = None,
    resolved: bool = False,
):
    db = get_db()
    query = {"is_resolved": resolved}
    if alert_type:
        query["alert_type"] = alert_type
    if priority:
        query["priority"] = priority

    docs = await db.alerts.find(query).sort("created_at", -1).limit(limit).to_list(length=limit)
    return {"alerts": [_serialize(d) for d in docs]}


@router.get("/stream")
async def stream_alerts():
    """Server-Sent Events endpoint — frontend connects once, receives live alerts."""
    return StreamingResponse(
        alert_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )


@router.post("/{alert_id}/resolve")
async def resolve_alert(alert_id: str):
    db = get_db()
    result = await db.alerts.update_one(
        {"_id": ObjectId(alert_id)},
        {"$set": {"is_resolved": True, "resolved_at": datetime.utcnow()}}
    )
    return {"success": result.modified_count > 0}


@router.get("/stats")
async def alert_stats():
    db = get_db()
    total = await db.alerts.count_documents({})
    unresolved = await db.alerts.count_documents({"is_resolved": False})

    pipeline = [
        {"$match": {"is_resolved": False}},
        {"$group": {"_id": "$alert_type", "count": {"$sum": 1}}}
    ]
    by_type_raw = await db.alerts.aggregate(pipeline).to_list(length=20)
    by_type = {r["_id"]: r["count"] for r in by_type_raw}

    pipeline2 = [
        {"$match": {"is_resolved": False}},
        {"$group": {"_id": "$priority", "count": {"$sum": 1}}}
    ]
    by_priority_raw = await db.alerts.aggregate(pipeline2).to_list(length=10)
    by_priority = {r["_id"]: r["count"] for r in by_priority_raw}

    rev_pipeline = [
        {"$match": {"is_resolved": False}},
        {"$group": {"_id": None, "total": {"$sum": "$revenue_at_risk"}}}
    ]
    rev_result = await db.alerts.aggregate(rev_pipeline).to_list(length=1)
    revenue_at_risk = rev_result[0]["total"] if rev_result else 0.0

    return {
        "total": total,
        "unresolved": unresolved,
        "by_type": by_type,
        "by_priority": by_priority,
        "revenue_at_risk": round(revenue_at_risk, 2),
    }
