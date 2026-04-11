"""
Alert Service — Redis Pub/Sub with in-memory fallback.
Pushes alerts to a Redis channel; any connected SSE client receives them instantly.
Falls back to an asyncio.Queue if Redis is not available.
"""
import asyncio
import json
import os
import random
from datetime import datetime, timedelta
from typing import AsyncGenerator, List, Dict, Any

try:
    import redis.asyncio as aioredis
    REDIS_AVAILABLE = True
except Exception:
    REDIS_AVAILABLE = False

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
CHANNEL   = "shelfiq:alerts"

# Global in-memory fallback queue
_in_memory_queue: asyncio.Queue = asyncio.Queue(maxsize=500)
_redis_client = None


async def init_redis():
    global _redis_client
    if not REDIS_AVAILABLE:
        print("⚠️  redis package not installed — using in-memory alert queue")
        return
    try:
        _redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)
        await _redis_client.ping()
        print("✅ Redis connected — alert pub/sub active")
    except Exception as e:
        print(f"⚠️  Redis unavailable ({e}) — using in-memory fallback")
        _redis_client = None


import smtplib
import ssl
from email.message import EmailMessage

ALERT_EMAIL = os.getenv("ALERT_EMAIL", "")
ALERT_EMAIL_PASSWORD = os.getenv("ALERT_EMAIL_PASSWORD", "")

def _send_email_sync(alert: Dict[str, Any]):
    if not ALERT_EMAIL or not ALERT_EMAIL_PASSWORD:
        return
    try:
        msg = EmailMessage()
        msg.set_content(f"{alert.get('detail', '')}\n\nSuggested Action: {alert.get('suggested_action', 'N/A')}")
        msg["Subject"] = alert.get("title", "OmniVision AI Alert")
        msg["From"] = ALERT_EMAIL
        msg["To"] = ALERT_EMAIL  # Sending to self for demo purposes
        
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(ALERT_EMAIL, ALERT_EMAIL_PASSWORD)
            server.send_message(msg)
    except Exception as e:
        print(f"Failed to send email alert: {e}")

async def publish_alert(alert: Dict[str, Any]):
    """Push an alert dict to Redis channel or in-memory queue, and trigger external channels."""
    if "email" in alert.get("channels", []):
        asyncio.create_task(asyncio.to_thread(_send_email_sync, alert))
        
    payload = json.dumps(alert, default=str)
    if _redis_client:
        try:
            await _redis_client.publish(CHANNEL, payload)
            return
        except Exception:
            pass
    # Fallback
    if not _in_memory_queue.full():
        await _in_memory_queue.put(payload)


async def alert_stream() -> AsyncGenerator[str, None]:
    """
    SSE generator — yields alerts as 'data: ...\n\n' strings.
    Uses Redis subscribe if available, else polls in-memory queue.
    """
    if _redis_client:
        async with _redis_client.pubsub() as pubsub:
            await pubsub.subscribe(CHANNEL)
            async for message in pubsub.listen():
                if message["type"] == "message":
                    yield f"data: {message['data']}\n\n"
    else:
        # In-memory queue polling
        while True:
            try:
                payload = _in_memory_queue.get_nowait()
                yield f"data: {payload}\n\n"
            except asyncio.QueueEmpty:
                await asyncio.sleep(0.5)


# ─── Alert factory helpers ────────────────────────────────────────────────────

def make_stockout_alert(product: Dict, aisle_id: str) -> Dict:
    revenue = round(product.get("price", 50) * product.get("reorder_point", 20), 2)
    detected_at = datetime.utcnow()
    alerted_at  = detected_at + timedelta(seconds=random.randint(45, 115))  # 45s-115s latency
    return {
        "alert_type": "stockout",
        "priority": "critical",
        "title": f"\U0001f6a8 Stockout: {product['name']}",
        "detail": f"Zero units detected on shelf. Estimated revenue loss: \u20b9{revenue}",
        "aisle_id": aisle_id,
        "sku": product["sku"],
        "product_name": product["name"],
        "revenue_at_risk": revenue,
        "suggested_action": f"Dispatch {product.get('reorder_point', 20)} units from warehouse immediately",
        "channels": ["push", "email", "sms", "dashboard"],
        "is_resolved": False,
        "detected_at": detected_at.isoformat(),
        "alerted_at":  alerted_at.isoformat(),
        "latency_seconds": (alerted_at - detected_at).seconds,
        "created_at": detected_at.isoformat(),
    }


def make_low_stock_alert(product: Dict, qty: int, aisle_id: str) -> Dict:
    needed  = product.get("reorder_point", 20) - qty
    revenue = round(needed * product.get("price", 50), 2)
    detected_at = datetime.utcnow()
    alerted_at  = detected_at + timedelta(seconds=random.randint(60, 180))
    return {
        "alert_type": "stockout",
        "priority": "high",
        "title": f"\u26a0\ufe0f Low Stock: {product['name']}",
        "detail": f"Only {qty} units remaining. Reorder point: {product.get('reorder_point', 20)}",
        "aisle_id": aisle_id,
        "sku": product["sku"],
        "product_name": product["name"],
        "revenue_at_risk": revenue,
        "suggested_action": f"Replenish {needed} units within next shift",
        "channels": ["push", "dashboard"],
        "is_resolved": False,
        "detected_at": detected_at.isoformat(),
        "alerted_at":  alerted_at.isoformat(),
        "latency_seconds": (alerted_at - detected_at).seconds,
        "created_at": detected_at.isoformat(),
    }


def make_planogram_alert(violation: Dict) -> Dict:
    detected_at = datetime.utcnow()
    alerted_at  = detected_at + timedelta(seconds=random.randint(30, 90))
    
    # Calculate revenue impact based on violation type
    revenue_impact = 0.0
    if violation["violation_type"] == "wrong_facings":
        revenue_impact = round(random.uniform(5.0, 15.0) * 2, 2) # Simulate missing facings cost
    elif violation["violation_type"] == "missing":
        revenue_impact = round(random.uniform(20.0, 50.0) * 3, 2)
    elif violation["violation_type"] == "wrong_price":
        revenue_impact = round(random.uniform(10.0, 30.0), 2)
        
    return {
        "alert_type": "planogram",
        "priority": "high" if violation["severity"] == "high" else "medium",
        "title": f"\U0001f4cb {violation['label']}: {violation['product_name']}",
        "detail": f"Shelf: {violation['shelf_id']} \u2014 {violation['detail']}",
        "aisle_id": violation.get("aisle_id", ""),
        "sku": violation["sku"],
        "product_name": violation["product_name"],
        "revenue_at_risk": revenue_impact,
        "suggested_action": f"Immediate planogram correction required to prevent \u20b9{revenue_impact} daily loss",
        "channels": ["push", "dashboard"],
        "is_resolved": False,
        "detected_at": detected_at.isoformat(),
        "alerted_at":  alerted_at.isoformat(),
        "latency_seconds": (alerted_at - detected_at).seconds,
        "created_at": detected_at.isoformat(),
    }


def make_demand_alert(product: Dict, forecast_spike: float) -> Dict:
    detected_at = datetime.utcnow()
    alerted_at  = detected_at + timedelta(seconds=random.randint(20, 60))
    return {
        "alert_type": "demand",
        "priority": "medium",
        "title": f"\U0001f4c8 Demand Spike Forecast: {product['name']}",
        "detail": f"Predicted {round(forecast_spike)}% demand increase in next 3 days",
        "aisle_id": product.get("aisle_id", ""),
        "sku": product["sku"],
        "product_name": product["name"],
        "revenue_at_risk": 0.0,
        "suggested_action": "Pre-order 20% additional stock before the spike",
        "channels": ["email", "dashboard"],
        "is_resolved": False,
        "detected_at": detected_at.isoformat(),
        "alerted_at":  alerted_at.isoformat(),
        "latency_seconds": (alerted_at - detected_at).seconds,
        "created_at": detected_at.isoformat(),
    }


async def generate_demo_alerts(db, products: List[Dict]):
    """Seed some initial alerts into MongoDB + push to alert stream on startup."""
    if not products:
        return
    sample = random.sample(products, min(6, len(products)))
    alerts_to_insert = []
    for p in sample:
        r = random.random()
        if r < 0.3:
            alert = make_stockout_alert(p, p.get("aisle_id", "A1"))
        elif r < 0.6:
            alert = make_low_stock_alert(p, random.randint(1, 5), p.get("aisle_id", "A1"))
        else:
            alert = make_demand_alert(p, random.uniform(20, 60))
        alerts_to_insert.append(alert)
        await publish_alert(alert)

    if db is not None and alerts_to_insert:
        await db.alerts.insert_many(alerts_to_insert)
