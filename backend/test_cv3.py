import sys
import io
import random
sys.path.append('d:/OmniVision AI/backend')
from services.cv_service import run_real_scan

fake_db = [
    {"sku": f"SKU-{i}", "category": "Beverages", "name": f"Product {i}"} for i in range(50)
]
with open('d:/OmniVision AI/sample_shelf_run_1.jpg', 'rb') as f:
    b = f.read()
res = run_real_scan(b, 'A1', fake_db)
print(f"Total detections: {len(res['detections'])}")
from collections import Counter
skus = Counter([d['sku'] for d in res['detections']])
print(f"Unique SKUs assigned: {len(skus)}")
print(f"Counts of assigned SKUs: {skus.most_common(10)}")

