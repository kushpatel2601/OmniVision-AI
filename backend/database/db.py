"""
MongoDB Atlas connection using Motor (async driver).
Collections used:
  - products
  - shelf_scans
  - scan_results
  - alerts
  - sales_history
  - planogram_layouts
"""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DB_NAME", "shelfiq")

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
    db = client[DB_NAME]
    # Create indexes for fast lookups
    await db.products.create_index("sku", unique=True)
    await db.shelf_scans.create_index("scanned_at")
    await db.alerts.create_index([("created_at", -1)])
    await db.alerts.create_index("is_resolved")
    await db.sales_history.create_index([("sku", 1), ("sale_date", 1)])
    await db.planogram_layouts.create_index([("aisle_id", 1), ("shelf_id", 1)])
    print(f"✅ Connected to MongoDB Atlas — database: {DB_NAME}")


async def disconnect_db():
    global client
    if client:
        client.close()
        print("🔌 MongoDB connection closed")


def get_db():
    return db
