import sys
import io
import cv2
sys.path.append('d:/OmniVision AI/backend')
from services.cv_service import _get_real_model

model = _get_real_model()
img = cv2.imread('d:/OmniVision AI/sample_shelf_run_1.jpg')

# 1. Default (imgsz=640)
res1 = model(img, conf=0.30, iou=0.45, verbose=False)[0]
print(f"Default imgsz detections: {len(res1.boxes)}")

# 2. Higher imgsz=1280
res2 = model(img, conf=0.30, iou=0.45, imgsz=1280, verbose=False)[0]
print(f"imgsz=1280 detections: {len(res2.boxes)}")

# 3. Higher imgsz=1920
res3 = model(img, conf=0.30, iou=0.45, imgsz=1920, verbose=False)[0]
print(f"imgsz=1920 detections: {len(res3.boxes)}")

# 4. IoU effect
res4 = model(img, conf=0.30, iou=0.65, imgsz=1280, verbose=False)[0]
print(f"imgsz=1280 iou=0.65 detections: {len(res4.boxes)}")

