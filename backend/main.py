"""
FastAPI application entry point for OmniVision AI backend.
Connects to MongoDB Atlas on startup, registers all API routers,
and exposes a root health-check endpoint.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from dotenv import load_dotenv

from database.db import connect_db, disconnect_db, get_db
from api.shelf import router as shelf_router
from api.planogram import router as planogram_router
from api.forecast import router as forecast_router
from api.alerts import router as alerts_router
from services.alert_service import init_redis, generate_demo_alerts

load_dotenv()

CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
).split(",")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────
    await connect_db()
    await init_redis()

    # Seed a few demo alerts if the alerts collection is empty
    db = get_db()
    count = await db.alerts.count_documents({})
    if count == 0:
        products = await db.products.find({}, {"_id": 0}).to_list(length=20)
        await generate_demo_alerts(db, products)
        print("🔔 Demo alerts seeded")

    # Seed sales history if it is empty
    sales_count = await db.sales_history.count_documents({})
    if sales_count == 0:
        products = await db.products.find({}, {"_id": 0}).to_list(length=50)
        if products:
            from services.forecast_service import generate_historical_sales
            docs = []
            for p in products:
                sku = p.get("sku")
                if not sku: continue
                # generate_historical_sales returns list of dicts with 'date' and 'quantity_sold'
                history = generate_historical_sales(sku, base_demand=40.0)
                for r in history:
                    r_copy = r.copy()
                    r_copy["sku"] = sku
                    r_copy["sale_date"] = r["date"]  # Index expects sale_date
                    docs.append(r_copy)
            if docs:
                await db.sales_history.insert_many(docs)
            print("📈 Sales history seeded")

    print("🚀 OmniVision AI backend is ready")
    yield

    # ── Shutdown ─────────────────────────────
    await disconnect_db()


app = FastAPI(
    title="OmniVision AI — Smart Retail Shelf Intelligence API",
    description=(
        "Computer-vision shelf monitoring, planogram compliance, "
        "demand forecasting, and real-time alert pipeline. "
        "Built for DAIICT Hackathon 2025."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(shelf_router)
app.include_router(planogram_router)
app.include_router(forecast_router)
app.include_router(alerts_router)


@app.get("/", tags=["health"])
async def root():
    db = get_db()
    product_count = await db.products.count_documents({})
    alert_count   = await db.alerts.count_documents({"is_resolved": False})
    return {
        "status": "healthy",
        "service": "OmniVision AI API",
        "version": "1.0.0",
        "db": "MongoDB Atlas",
        "products_in_db": product_count,
        "active_alerts": alert_count,
        "docs": "/docs",
    }


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
