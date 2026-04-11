import sys
import io
sys.path.append('d:/OmniVision AI/backend')
from services.cv_service import run_real_scan
with open('d:/OmniVision AI/sample_shelf_run_1.jpg', 'rb') as f:
    b = f.read()
res = run_real_scan(b, 'A1', [])
print(f"Total detections: {len(res['detections'])}")
from collections import Counter
skus = Counter([d['sku'] for d in res['detections']])
print(f"Unique SKUs: {len(skus)}")
