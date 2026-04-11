"""
Pydantic models that define the shape of MongoDB documents.
Each class maps to a MongoDB collection.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# ─── Products Collection ─────────────────────────────────────
class Product(BaseModel):
    sku: str
    name: str
    category: str
    price: float
    min_stock: int = 10
    reorder_point: int = 20
    color_hex: str = "#00d4ff"
    aisle_id: str = "A1"
    shelf_position: int = 1
    facings: int = 3
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ─── ShelfScans Collection ────────────────────────────────────
class ShelfScan(BaseModel):
    aisle_id: str
    camera_id: str = "CAM-01"
    scanned_at: datetime = Field(default_factory=datetime.utcnow)
    total_products_detected: int = 0
    empty_count: int = 0
    low_count: int = 0
    full_count: int = 0
    compliance_score: float = 0.0
    shelf_health_score: float = 0.0


# ─── ScanResults Collection ───────────────────────────────────
class ScanResult(BaseModel):
    scan_id: str                        # MongoDB ObjectId string of parent ShelfScan
    sku: str
    product_name: str
    status: str                         # full | low | empty
    quantity_detected: int = 0
    confidence: float = 0.0
    bbox: dict = Field(default_factory=lambda: {"x": 0, "y": 0, "w": 0, "h": 0})
    price_tag_detected: bool = True
    planogram_compliant: bool = True
    detected_at: datetime = Field(default_factory=datetime.utcnow)


# ─── Alerts Collection ────────────────────────────────────────
class Alert(BaseModel):
    alert_type: str                     # stockout | planogram | demand | price
    priority: str                       # critical | high | medium | low
    title: str
    detail: str
    aisle_id: str = ""
    sku: str = ""
    product_name: str = ""
    revenue_at_risk: float = 0.0
    suggested_action: str = ""
    is_resolved: bool = False
    channels: List[str] = ["push", "dashboard"]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None


# ─── SalesHistory Collection ──────────────────────────────────
class SalesHistory(BaseModel):
    sku: str
    product_name: str
    sale_date: str                      # YYYY-MM-DD
    quantity_sold: int
    revenue: float
    is_promo_day: bool = False
    day_of_week: int                    # 0=Mon … 6=Sun
    temperature: float = 28.0
    local_event: bool = False


# ─── PlanogramLayouts Collection ─────────────────────────────
class PlanogramLayout(BaseModel):
    aisle_id: str
    aisle_name: str
    shelf_id: str
    shelf_level: str                    # Top | Eye Level | Middle | Bottom
    sku: str
    product_name: str
    expected_facings: int
    position_order: int
    updated_at: datetime = Field(default_factory=datetime.utcnow)
