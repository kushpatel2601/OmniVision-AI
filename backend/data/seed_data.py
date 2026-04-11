"""
Seed MongoDB Atlas with products, planogram layouts, and 90-day synthetic sales history.
Run once: python data/seed_data.py
"""
import asyncio
import os
import sys
import random
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME     = os.getenv("MONGODB_DB_NAME", "shelfiq")

# ─── Product Catalog ────────────────────────────────────────────────────────
PRODUCTS = [
    {"sku": "SKU-001", "name": "Coca-Cola 500ml",        "category": "Beverages",     "price": 45,  "min_stock": 12, "reorder_point": 20, "color_hex": "#e53935", "aisle_id": "A1", "shelf_position": 1, "facings": 4},
    {"sku": "SKU-002", "name": "Pepsi 500ml",             "category": "Beverages",     "price": 42,  "min_stock": 12, "reorder_point": 20, "color_hex": "#1565C0", "aisle_id": "A1", "shelf_position": 2, "facings": 3},
    {"sku": "SKU-003", "name": "Sprite 500ml",            "category": "Beverages",     "price": 40,  "min_stock": 10, "reorder_point": 18, "color_hex": "#43a047", "aisle_id": "A1", "shelf_position": 3, "facings": 3},
    {"sku": "SKU-004", "name": "Lays Classic Chips",      "category": "Snacks",        "price": 30,  "min_stock": 15, "reorder_point": 25, "color_hex": "#f9a825", "aisle_id": "A2", "shelf_position": 1, "facings": 5},
    {"sku": "SKU-005", "name": "Kurkure Masala",          "category": "Snacks",        "price": 20,  "min_stock": 20, "reorder_point": 35, "color_hex": "#ff6f00", "aisle_id": "A2", "shelf_position": 2, "facings": 6},
    {"sku": "SKU-006", "name": "Britannia Biscuits",      "category": "Bakery",        "price": 25,  "min_stock": 18, "reorder_point": 30, "color_hex": "#6d4c41", "aisle_id": "A4", "shelf_position": 1, "facings": 4},
    {"sku": "SKU-007", "name": "Amul Butter 500g",        "category": "Dairy",         "price": 55,  "min_stock": 8,  "reorder_point": 15, "color_hex": "#ffd54f", "aisle_id": "A3", "shelf_position": 1, "facings": 6},
    {"sku": "SKU-008", "name": "Amul Milk 1L",            "category": "Dairy",         "price": 60,  "min_stock": 10, "reorder_point": 20, "color_hex": "#90caf9", "aisle_id": "A3", "shelf_position": 2, "facings": 8},
    {"sku": "SKU-009", "name": "Parle-G Biscuits",        "category": "Bakery",        "price": 10,  "min_stock": 30, "reorder_point": 50, "color_hex": "#bcaaa4", "aisle_id": "A2", "shelf_position": 3, "facings": 5},
    {"sku": "SKU-010", "name": "Maggi Noodles 70g",       "category": "Instant Food",  "price": 14,  "min_stock": 25, "reorder_point": 40, "color_hex": "#ffcc02", "aisle_id": "A4", "shelf_position": 2, "facings": 5},
    {"sku": "SKU-011", "name": "Sunfeast Dark Fantasy",   "category": "Bakery",        "price": 35,  "min_stock": 12, "reorder_point": 22, "color_hex": "#4e342e", "aisle_id": "A2", "shelf_position": 4, "facings": 4},
    {"sku": "SKU-012", "name": "Real Juice 1L",           "category": "Beverages",     "price": 85,  "min_stock": 8,  "reorder_point": 15, "color_hex": "#e65100", "aisle_id": "A1", "shelf_position": 4, "facings": 4},
    {"sku": "SKU-013", "name": "Surf Excel 1kg",          "category": "Household",     "price": 120, "min_stock": 6,  "reorder_point": 12, "color_hex": "#1a237e", "aisle_id": "A5", "shelf_position": 1, "facings": 3},
    {"sku": "SKU-014", "name": "Vim Dishwash Bar",        "category": "Household",     "price": 35,  "min_stock": 10, "reorder_point": 18, "color_hex": "#33691e", "aisle_id": "A5", "shelf_position": 2, "facings": 4},
    {"sku": "SKU-015", "name": "Colgate Toothpaste",      "category": "Personal Care", "price": 65,  "min_stock": 8,  "reorder_point": 15, "color_hex": "#e53935", "aisle_id": "A6", "shelf_position": 1, "facings": 3},
    {"sku": "SKU-016", "name": "Dettol Soap",             "category": "Personal Care", "price": 45,  "min_stock": 10, "reorder_point": 18, "color_hex": "#00838f", "aisle_id": "A6", "shelf_position": 2, "facings": 4},
    {"sku": "SKU-017", "name": "Head & Shoulders 340ml",  "category": "Personal Care", "price": 199, "min_stock": 6,  "reorder_point": 12, "color_hex": "#0097a7", "aisle_id": "A6", "shelf_position": 3, "facings": 3},
    {"sku": "SKU-018", "name": "Rin Detergent 1kg",       "category": "Household",     "price": 95,  "min_stock": 6,  "reorder_point": 12, "color_hex": "#1565C0", "aisle_id": "A5", "shelf_position": 3, "facings": 3},
    {"sku": "SKU-019", "name": "Tata Salt 1kg",           "category": "Grocery",       "price": 28,  "min_stock": 15, "reorder_point": 25, "color_hex": "#78909c", "aisle_id": "A4", "shelf_position": 3, "facings": 5},
    {"sku": "SKU-020", "name": "Fortune Cooking Oil 1L",  "category": "Grocery",       "price": 165, "min_stock": 5,  "reorder_point": 10, "color_hex": "#f9a825", "aisle_id": "A4", "shelf_position": 4, "facings": 3},
]

# ─── Planogram Layouts ───────────────────────────────────────────────────────
PLANOGRAMS = [
    # Aisle A1 – Beverages
    {"aisle_id": "A1", "aisle_name": "Aisle A – Beverages", "shelf_id": "A1-S1", "shelf_level": "Top",       "sku": "SKU-001", "product_name": "Coca-Cola 500ml",   "expected_facings": 4, "position_order": 1},
    {"aisle_id": "A1", "aisle_name": "Aisle A – Beverages", "shelf_id": "A1-S1", "shelf_level": "Top",       "sku": "SKU-002", "product_name": "Pepsi 500ml",        "expected_facings": 3, "position_order": 2},
    {"aisle_id": "A1", "aisle_name": "Aisle A – Beverages", "shelf_id": "A1-S1", "shelf_level": "Top",       "sku": "SKU-003", "product_name": "Sprite 500ml",       "expected_facings": 3, "position_order": 3},
    {"aisle_id": "A1", "aisle_name": "Aisle A – Beverages", "shelf_id": "A1-S2", "shelf_level": "Eye Level", "sku": "SKU-001", "product_name": "Coca-Cola 500ml",   "expected_facings": 6, "position_order": 1},
    {"aisle_id": "A1", "aisle_name": "Aisle A – Beverages", "shelf_id": "A1-S2", "shelf_level": "Eye Level", "sku": "SKU-012", "product_name": "Real Juice 1L",     "expected_facings": 4, "position_order": 2},
    {"aisle_id": "A1", "aisle_name": "Aisle A – Beverages", "shelf_id": "A1-S2", "shelf_level": "Eye Level", "sku": "SKU-002", "product_name": "Pepsi 500ml",        "expected_facings": 4, "position_order": 3},
    {"aisle_id": "A1", "aisle_name": "Aisle A – Beverages", "shelf_id": "A1-S3", "shelf_level": "Middle",    "sku": "SKU-003", "product_name": "Sprite 500ml",       "expected_facings": 5, "position_order": 1},
    {"aisle_id": "A1", "aisle_name": "Aisle A – Beverages", "shelf_id": "A1-S3", "shelf_level": "Middle",    "sku": "SKU-002", "product_name": "Pepsi 500ml",        "expected_facings": 5, "position_order": 2},
    {"aisle_id": "A1", "aisle_name": "Aisle A – Beverages", "shelf_id": "A1-S4", "shelf_level": "Bottom",    "sku": "SKU-001", "product_name": "Coca-Cola 500ml",   "expected_facings": 8, "position_order": 1},
    {"aisle_id": "A1", "aisle_name": "Aisle A – Beverages", "shelf_id": "A1-S4", "shelf_level": "Bottom",    "sku": "SKU-003", "product_name": "Sprite 500ml",       "expected_facings": 6, "position_order": 2},
    # Aisle A2 – Snacks
    {"aisle_id": "A2", "aisle_name": "Aisle B – Snacks",    "shelf_id": "A2-S1", "shelf_level": "Top",       "sku": "SKU-004", "product_name": "Lays Classic Chips", "expected_facings": 5, "position_order": 1},
    {"aisle_id": "A2", "aisle_name": "Aisle B – Snacks",    "shelf_id": "A2-S1", "shelf_level": "Top",       "sku": "SKU-005", "product_name": "Kurkure Masala",     "expected_facings": 6, "position_order": 2},
    {"aisle_id": "A2", "aisle_name": "Aisle B – Snacks",    "shelf_id": "A2-S2", "shelf_level": "Eye Level", "sku": "SKU-004", "product_name": "Lays Classic Chips", "expected_facings": 4, "position_order": 1},
    {"aisle_id": "A2", "aisle_name": "Aisle B – Snacks",    "shelf_id": "A2-S2", "shelf_level": "Eye Level", "sku": "SKU-011", "product_name": "Sunfeast Dark Fantasy","expected_facings": 4, "position_order": 2},
    {"aisle_id": "A2", "aisle_name": "Aisle B – Snacks",    "shelf_id": "A2-S2", "shelf_level": "Eye Level", "sku": "SKU-009", "product_name": "Parle-G Biscuits",   "expected_facings": 5, "position_order": 3},
    {"aisle_id": "A2", "aisle_name": "Aisle B – Snacks",    "shelf_id": "A2-S3", "shelf_level": "Bottom",    "sku": "SKU-005", "product_name": "Kurkure Masala",     "expected_facings": 8, "position_order": 1},
    {"aisle_id": "A2", "aisle_name": "Aisle B – Snacks",    "shelf_id": "A2-S3", "shelf_level": "Bottom",    "sku": "SKU-009", "product_name": "Parle-G Biscuits",   "expected_facings": 8, "position_order": 2},
    # Aisle A3 – Dairy
    {"aisle_id": "A3", "aisle_name": "Aisle C – Dairy",     "shelf_id": "A3-S1", "shelf_level": "Top",       "sku": "SKU-007", "product_name": "Amul Butter 500g",   "expected_facings": 6, "position_order": 1},
    {"aisle_id": "A3", "aisle_name": "Aisle C – Dairy",     "shelf_id": "A3-S1", "shelf_level": "Top",       "sku": "SKU-008", "product_name": "Amul Milk 1L",       "expected_facings": 4, "position_order": 2},
    {"aisle_id": "A3", "aisle_name": "Aisle C – Dairy",     "shelf_id": "A3-S2", "shelf_level": "Eye Level", "sku": "SKU-008", "product_name": "Amul Milk 1L",       "expected_facings": 8, "position_order": 1},
    {"aisle_id": "A3", "aisle_name": "Aisle C – Dairy",     "shelf_id": "A3-S2", "shelf_level": "Eye Level", "sku": "SKU-007", "product_name": "Amul Butter 500g",   "expected_facings": 6, "position_order": 2},
    {"aisle_id": "A3", "aisle_name": "Aisle C – Dairy",     "shelf_id": "A3-S3", "shelf_level": "Bottom",    "sku": "SKU-008", "product_name": "Amul Milk 1L",       "expected_facings": 10,"position_order": 1},
]


def generate_sales_history(sku: str, price: float, days: int = 90):
    records = []
    base = 40 + (abs(hash(sku)) % 80)
    seasonal = [0.82,0.85,0.91,1.00,1.08,1.22,1.30,1.25,1.10,0.98,0.92,1.15]
    weekday  = [0.82,1.00,1.02,1.04,1.12,1.35,1.28]
    today = datetime.utcnow().date()
    for i in range(days, -1, -1):
        date = today - timedelta(days=i)
        qty = max(0, round(
            base * seasonal[date.month - 1] * weekday[date.weekday()]
            * random.gauss(1.0, 0.10)
            * (1.55 if random.random() < 0.08 else 1.0)
        ))
        records.append({
            "sku": sku,
            "sale_date": date.isoformat(),
            "quantity_sold": qty,
            "revenue": round(qty * price, 2),
            "is_promo_day": random.random() < 0.08,
            "day_of_week": date.weekday(),
            "temperature": round(25 + random.gauss(0, 4), 1),
            "local_event": random.random() < 0.04,
        })
    return records


async def seed():
    client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=8000)
    db = client[DB_NAME]

    print("🌱 Seeding MongoDB Atlas...")

    # Products
    await db.products.drop()
    now = datetime.utcnow()
    for p in PRODUCTS:
        p["created_at"] = now
    await db.products.insert_many(PRODUCTS)
    await db.products.create_index("sku", unique=True)
    print(f"  ✅ Inserted {len(PRODUCTS)} products")

    # Planogram layouts
    await db.planogram_layouts.drop()
    plano_docs = [{**p, "updated_at": now} for p in PLANOGRAMS]
    await db.planogram_layouts.insert_many(plano_docs)
    await db.planogram_layouts.create_index([("aisle_id", 1), ("shelf_id", 1)])
    print(f"  ✅ Inserted {len(PLANOGRAMS)} planogram slots")

    # Sales history
    await db.sales_history.drop()
    all_sales = []
    for p in PRODUCTS:
        all_sales.extend(generate_sales_history(p["sku"], p["price"]))
    await db.sales_history.insert_many(all_sales)
    await db.sales_history.create_index([("sku", 1), ("sale_date", 1)])
    print(f"  ✅ Inserted {len(all_sales)} sales history records")

    # Clear old scans/alerts
    await db.shelf_scans.drop()
    await db.scan_results.drop()
    await db.alerts.drop()
    print("  ✅ Cleared old scan and alert data")

    client.close()
    print("\n🎉 Seeding complete! You can now start the backend.")


if __name__ == "__main__":
    asyncio.run(seed())
