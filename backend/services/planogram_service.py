"""
Planogram Compliance Service.
Compares expected shelf layout (from MongoDB planogram_layouts collection)
against CV-detected state, producing per-shelf compliance scores and violations.
"""
import random
from typing import List, Dict, Any
from datetime import datetime


VIOLATION_TYPES = {
    "missing":        {"label": "Missing Product",      "severity": "high",   "weight": 1.0},
    "misplaced":      {"label": "Wrong Product Placed",  "severity": "medium", "weight": 0.7},
    "wrong_facings":  {"label": "Insufficient Facings",  "severity": "low",    "weight": 0.4},
    "no_price_tag":   {"label": "Price Tag Missing",     "severity": "medium", "weight": 0.5},
    "wrong_price":    {"label": "Incorrect Price Tag",   "severity": "high",   "weight": 0.8},
    "unauthorized":   {"label": "Unauthorized Product",  "severity": "high",   "weight": 0.9},
}


def check_planogram_compliance(
    planogram_entries: List[Dict],
    scan_detections: List[Dict]
) -> Dict[str, Any]:
    """
    Core compliance engine.
    planogram_entries : documents from planogram_layouts collection for a given aisle
    scan_detections   : detections from cv_service.run_shelf_scan()
    Returns compliance score, violations list, and per-shelf breakdown.
    """
    detected_skus = {d["sku"]: d for d in scan_detections}
    violations = []
    shelf_scores: Dict[str, Dict] = {}
    total_slots = 0
    compliant_slots = 0

    # Group planogram entries by shelf
    shelves_map: Dict[str, List] = {}
    for entry in planogram_entries:
        sid = entry["shelf_id"]
        shelves_map.setdefault(sid, []).append(entry)

    for shelf_id, slots in shelves_map.items():
        shelf_total = len(slots)
        shelf_compliant = 0
        shelf_violations = []

        for slot in slots:
            total_slots += 1
            sku = slot["sku"]
            product_name = slot.get("product_name", sku)
            expected_facings = slot.get("expected_facings", 3)
            detected = detected_skus.get(sku)

            if detected is None:
                # Product completely missing from shelf
                vtype = "missing"
                violations.append(_make_violation(
                    vtype, shelf_id, slot["shelf_level"], sku, product_name,
                    f"Expected {expected_facings} facings — not detected by CV"
                ))
                shelf_violations.append(vtype)
            elif not detected.get("price_tag_detected", True):
                # Price tag missing
                vtype = "no_price_tag"
                violations.append(_make_violation(
                    vtype, shelf_id, slot["shelf_level"], sku, product_name,
                    "Price tag absent or unreadable"
                ))
                shelf_violations.append(vtype)
                shelf_compliant += 0.5   # partial credit
                compliant_slots += 0.5
            elif detected.get("ocr_price_text") and slot.get("price"):
                # Price tag OCR validation
                expected_price_str = f"${float(slot['price']):.2f}"
                if detected["ocr_price_text"] != expected_price_str:
                    vtype = "wrong_price"
                    detail = f"Price mismatch: Expected {expected_price_str}, OCR read {detected['ocr_price_text']}"
                    violations.append(_make_violation(
                        vtype, shelf_id, slot["shelf_level"], sku, product_name, detail
                    ))
                    shelf_violations.append(vtype)
                    shelf_compliant += 0.2
                    compliant_slots += 0.2
                else:
                    is_misplaced = False
                    if "expected_shelf_index" in slot:
                        if detected.get("shelf_index") != slot["expected_shelf_index"]:
                            is_misplaced = True
                    
                    detected_qty = detected.get("quantity_detected", 1)
    
                    if is_misplaced:
                        vtype = "misplaced"
                        detail = f"Product found in wrong shelf position (expected {slot.get('expected_shelf_index')}, found {detected.get('shelf_index')})"
                        violations.append(_make_violation(
                            vtype, shelf_id, slot["shelf_level"], sku, product_name, detail
                        ))
                        shelf_violations.append(vtype)
                    elif detected_qty < expected_facings:
                        vtype = "wrong_facings"
                        detail = f"Expected {expected_facings} facings, detected {detected_qty}"
                        violations.append(_make_violation(
                            vtype, shelf_id, slot["shelf_level"], sku, product_name, detail
                        ))
                        shelf_violations.append(vtype)
                    else:
                        # Fully compliant
                        shelf_compliant += 1
                        compliant_slots += 1
            else:
                # Deterministic check for planogram compliance
                is_misplaced = False
                if "expected_shelf_index" in slot:
                    if detected.get("shelf_index") != slot["expected_shelf_index"]:
                        is_misplaced = True
                
                detected_qty = detected.get("quantity_detected", 1)

                if is_misplaced:
                    vtype = "misplaced"
                    detail = f"Product found in wrong shelf position (expected {slot.get('expected_shelf_index')}, found {detected.get('shelf_index')})"
                    violations.append(_make_violation(
                        vtype, shelf_id, slot["shelf_level"], sku, product_name, detail
                    ))
                    shelf_violations.append(vtype)
                elif detected_qty < expected_facings:
                    vtype = "wrong_facings"
                    detail = f"Expected {expected_facings} facings, detected {detected_qty}"
                    violations.append(_make_violation(
                        vtype, shelf_id, slot["shelf_level"], sku, product_name, detail
                    ))
                    shelf_violations.append(vtype)
                else:
                    # Fully compliant
                    shelf_compliant += 1
                    compliant_slots += 1

        score = round((shelf_compliant / shelf_total) * 100, 1) if shelf_total > 0 else 0
        shelf_scores[shelf_id] = {
            "shelf_id": shelf_id,
            "level": slots[0].get("shelf_level", "Unknown"),
            "total_slots": shelf_total,
            "compliant_slots": int(shelf_compliant),
            "score": score,
            "violation_count": len(shelf_violations),
        }

    # ── Unauthorized Product Detection ──
    # Find any detected products that are completely missing from the planogram JSON
    planogram_skus = {entry["sku"] for entry in planogram_entries}
    for sku, detected in detected_skus.items():
        if sku not in planogram_skus:
            vtype = "unauthorized"
            detail = f"Product detected on shelf but not allowed by planogram"
            violations.append(_make_violation(
                vtype, f"Shelf-{detected.get('shelf_index')}", detected.get("shelf_index", "Unknown"),
                sku, detected.get("product_name", sku), detail
            ))
            # Find the corresponding shelf score and deduct points or just count it
            sid = f"Shelf-{detected.get('shelf_index')}"
            if sid in shelf_scores:
                shelf_scores[sid]["violation_count"] += 1
                shelf_scores[sid]["score"] = max(0, shelf_scores[sid]["score"] - 5.0)

    overall_score = round((compliant_slots / max(total_slots, 1)) * 100, 1)

    return {
        "aisle_id": planogram_entries[0]["aisle_id"] if planogram_entries else "?",
        "aisle_name": planogram_entries[0].get("aisle_name", "") if planogram_entries else "",
        "overall_compliance_score": overall_score,
        "total_slots": total_slots,
        "compliant_slots": int(compliant_slots),
        "violation_count": len(violations),
        "violations": violations,
        "shelf_breakdown": list(shelf_scores.values()),
        "checked_at": datetime.utcnow().isoformat(),
    }


def _make_violation(vtype, shelf_id, level, sku, product_name, detail) -> Dict:
    meta = VIOLATION_TYPES.get(vtype, {"label": vtype, "severity": "medium", "weight": 0.5})
    return {
        "violation_type": vtype,
        "label": meta["label"],
        "severity": meta["severity"],
        "shelf_id": shelf_id,
        "shelf_level": level,
        "sku": sku,
        "product_name": product_name,
        "detail": detail,
        "detected_at": datetime.utcnow().isoformat(),
    }
