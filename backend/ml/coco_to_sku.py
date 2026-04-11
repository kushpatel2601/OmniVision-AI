"""
SKU-110k Inference Mapping for yolov8m_sku_full.pt
====================================================

The model is trained on the full SKU-110k retail-shelf dataset.
Unlike COCO, SKU-110k uses a SINGLE generic class for every shelf
product: class-0 → "object".

Because all boxes share the same class name, we infer retail
metadata (category, SKU prefix, aisle, display colour) from the
bounding-box's **spatial position** on the shelf grid — an approach
that is standard for generic shelf-detection pipelines.

Grid layout assumed (can be overridden via environment variables):
  • SHELF_ROWS  = 4   (horizontal shelf bands, top → bottom)
  • SHELF_COLS  = 8   (vertical slot groups, left → right)

Row 0 (top shelf)    → Beverages
Row 1                → Snacks / Packaged food
Row 2                → Dairy / Grocery
Row 3 (bottom shelf) → Household / Personal Care
"""

import os
import random
from typing import Optional

# ── Grid config (tunable via env) ────────────────────────────────────────────
SHELF_ROWS = int(os.getenv("SHELF_ROWS", "4"))
SHELF_COLS = int(os.getenv("SHELF_COLS", "8"))

# ── Row → retail category (top-shelf to bottom-shelf) ─────────────────────────
_ROW_CATEGORIES = [
    "Beverages",       # row 0
    "Snacks",          # row 1
    "Dairy",           # row 2
    "Household",       # row 3
    "Personal Care",   # row 4+  (fallback)
]

# ── Column-band → sub-category modifier (fine-grained naming) ─────────────────
_COL_SUBCATEGORY = [
    ["Juice", "Water", "Soda", "Energy Drink", "Smoothie", "Iced Tea", "Sports Drink", "Sparkling Water"],
    ["Chips", "Cookies", "Crackers", "Nuts", "Popcorn", "Granola Bar", "Rice Cakes", "Pretzels"],
    ["Milk", "Cheese", "Yogurt", "Butter", "Cream", "Ice Cream", "Sour Cream", "Kefir"],
    ["Detergent", "Cleaner", "Soap", "Paper Towel", "Trash Bag", "Disinfectant", "Sponge", "Brush"],
    ["Shampoo", "Conditioner", "Face Wash", "Deodorant", "Toothpaste", "Lotion", "Razor", "Body Wash"],
]

# ── Aisle → category (used when aisle_id is known from the upload) ─────────────
AISLE_TO_CATEGORY: dict[str, str] = {
    "A1": "Beverages",
    "A2": "Snacks",
    "A3": "Dairy",
    "A4": "Grocery",
    "A5": "Household",
    "A6": "Personal Care",
    "A7": "Fresh Produce",
}

# ── Category display colours ───────────────────────────────────────────────────
_CATEGORY_COLORS = {
    "Beverages":     "#00d4ff",
    "Snacks":        "#f59e0b",
    "Dairy":         "#a78bfa",
    "Grocery":       "#34d399",
    "Fresh Produce": "#6ee7b7",
    "Household":     "#f87171",
    "Personal Care": "#fb7185",
}

# ── Category → aisle mapping ───────────────────────────────────────────────────
CATEGORY_TO_AISLE = {
    "Beverages":     "A1",
    "Snacks":        "A2",
    "Dairy":         "A3",
    "Grocery":       "A4",
    "Fresh Produce": "A4",
    "Household":     "A5",
    "Personal Care": "A6",
}

# ── SKU prefix per category ────────────────────────────────────────────────────
_SKU_PREFIX = {
    "Beverages":     "BEV",
    "Snacks":        "SNK",
    "Dairy":         "DAI",
    "Grocery":       "GRC",
    "Fresh Produce": "PRD",
    "Household":     "HSH",
    "Personal Care": "PRC",
}

# ═════════════════════════════════════════════════════════════════════════════
# Public API  (same interface as the old coco_to_sku.py)
# ═════════════════════════════════════════════════════════════════════════════

# Keep COCO_TO_CATEGORY as an alias so old imports don't break
COCO_TO_CATEGORY: dict[str, str] = {}   # unused for SKU-110k; kept for compat


def get_category_from_aisle(aisle_id: str) -> str:
    """
    Derive retail category directly from the aisle tag.
    This is the preferred method when aisle_id is known (real scan).
    A1 → Beverages, A2 → Snacks, A3 → Dairy, etc.
    """
    return AISLE_TO_CATEGORY.get(aisle_id, "Grocery")


def get_category_from_position(
    row: int,
    col: int,
    img_rows: int = SHELF_ROWS,
) -> str:
    """
    Fallback: derive retail category from shelf-grid row index.
    Only used when aisle_id is unknown.
    """
    clipped = min(row, len(_ROW_CATEGORIES) - 1)
    return _ROW_CATEGORIES[clipped]


def get_product_name_from_position(row: int, col: int) -> str:
    """Derive a plausible product name from the shelf grid cell."""
    row_idx = min(row, len(_COL_SUBCATEGORY) - 1)
    col_idx = min(col, len(_COL_SUBCATEGORY[row_idx]) - 1)
    return _COL_SUBCATEGORY[row_idx][col_idx]


def make_sku_from_position(row: int, col: int, instance_idx: int = 0) -> str:
    """Generate a deterministic SKU from grid position + instance index."""
    category = get_category_from_position(row, col)
    prefix   = _SKU_PREFIX.get(category, "SKU")
    # deterministic but looks like a real SKU
    suffix   = abs(hash(f"r{row}c{col}i{instance_idx}")) % 9000 + 1000
    return f"{prefix}-{suffix}"


def get_category_color(category: str) -> str:
    return _CATEGORY_COLORS.get(category, "#60a5fa")


def get_aisle(category: str) -> str:
    return CATEGORY_TO_AISLE.get(category, "A4")


# ── Legacy shims (used by cv_service.py → keep compatible) ───────────────────

def get_category(class_name: str) -> str:
    """Legacy shim: 'object' (SKU-110k) → default to 'Grocery'."""
    return COCO_TO_CATEGORY.get(class_name, "Grocery")


def make_sku_from_class(class_name: str, instance_idx: int = 0) -> str:
    """Legacy shim kept for synthetic mode; real mode uses make_sku_from_position."""
    return f"GRC-{abs(hash(class_name + str(instance_idx))) % 9000 + 1000}"
