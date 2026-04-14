<div align="center">

# 👁️ OmniVision AI (ShelfIQ)
**Next-Generation Retail Shelf Intelligence & Inventory Optimization**

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-FF1493?style=for-the-badge&logo=yolo&logoColor=white)](https://github.com/ultralytics/ultralytics)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)

*Tackling the $1 Trillion out-of-stock retail problem through real-time Computer Vision and Predictive Time-Series Forecasting.*

</div>

---

## 📖 Overview

**OmniVision AI** is an end-to-end retail execution platform that gives supermarkets and FMCG brands complete visibility into their physical shelves. It pairs sub-second **YOLOv8** computer vision with rigorous **Holt-Winters statistical forecasting** to dynamically manage inventory, detect anomalies, and recover lost revenue before shelves go completely empty.

<img width="1919" height="969" alt="image" src="https://github.com/user-attachments/assets/f6f1caff-3786-4901-85d6-0ddb4935e66a" />


---

## ⚡ Key Features

### 🔍 Real-Time Shelf Image Analysis
* **High-Density Detection:** Utilizes `yolov8m_sku_full.pt` trained on the specialized SKU-110K dataset for highly dense, occluded object detection.
* **Deterministic SKU Matching:** Translates single-class bounding boxes to multi-class SKUs using real-time HSV color-space feature hashing.
* **Price Tag OCR:** Edge-density algorithms detect shelf tags to parse physical pricing.

### 📊 Automated Planogram Compliance
Cross-references detected bounding boxes with expected JSON aisle layouts to trigger immediate violations for:
- ❌ **Out-of-Stock / Missing Products**
- ❌ **Insufficient Facings** (Detected < Expected)
- ❌ **Misplaced Products** (Wrong Shelf/Aisle)
- ❌ **Unauthorized Products** (Competitor intrusion)
- ❌ **Price Irregularities** (Detected OCR Price != Expected System Price)

### 📈 Demand Forecasting & Replenishment
* **Holt-Winters Exponential Smoothing:** Natively parses weekly seasonality, local event schedules, promotional calendars, and temperature fluctuations.
* **Intelligent Replenishment Engine:** Calculates **Economic Order Quantity (EOQ)** and Dynamic Reorder Points based on classical Safety Stock math to minimize holding costs.

### 🚨 Revenue-Driven Alert Pipeline
* **Real-time SSE Stream:** Redis Pub/Sub architecture feeding into FastAPI Server-Sent Events (SSE).
* **Smart Prioritization:** Alerts are generated in under 120 seconds and heavily sorted explicitly by **₹ Revenue At Risk**, focusing floor workers on the most financially impactful tasks first.

### 🌟 Advanced Retail UX (Hackathon Winning Features)
* **🤖 GenAI Retail Assistant:** Chat widget grounded in real-time store data.
* **🥽 AR Worker View:** Augmented Reality overlay for stockroom workers.
* **📉 Markdown Pricing Analytics:** Dynamic repricing models for aging inventory.
* **🏆 Brand Share Analytics:** Competitor shelf-share tracking built directly into the UI.

---

## 🛠️ Tech Stack & Architecture

We crafted the platform to strictly guarantee high-speed, real-time latency on edge hardware without sacrificing algorithmic rigor.

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **CV Engine** | Python, OpenCV, YOLOv8 (`ultralytics`) | Hyper-fast single-stage detection optimized for edge hardware, perfectly suited for dense retail environments. |
| **Forecasting** | `statsmodels` (Holt-Winters) | Eliminates heavy C++ build requirements (like Prophet) while delivering mathematically identical WMAPE for 14-day horizons. |
| **Database** | MongoDB Atlas (`motor` async) | Flexible NoSQL schema easily adapts to multi-faceted SKU metadata. |
| **Event Stream** | Redis Pub/Sub + FastAPI SSE | Instantly pushes actionable, low-latency DOM updates to exactly the clients that need them. |
| **Frontend** | React, Vite, Recharts | Breathtaking dark-mode dashboard tailored specifically for data-dense, real-time visualizations. |

---

## 🚀 Quick Start Instructions

> **Note:** Python 3.11+ and Node.js 18+ are required. A free MongoDB Atlas cluster URI must be configured.

### 1. Backend API & CV Engine

```bash
# Clone the repository
git clone https://github.com/kushpatel2601/OmniVision-AI.git
cd OmniVision-AI/backend

# Set up Python Virtual Environment
python -m venv venv
# Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate

# Install Dependencies
pip install -r requirements.txt

# Optional: Seed the database with mock SKUs and 365-day POS history
python data/seed_data.py

# Start the CV/Forecasting API server
uvicorn main:app --reload
```
API documentation automatically generated at: `http://localhost:8000/docs`

### 2. Frontend Presentational Dashboard

```bash
# Open a new terminal session
cd OmniVision-AI/frontend

# Install dependencies via npm
npm install

# Start the Vite development server
npm run dev     
```
Access the application dashboard at: `http://localhost:5173`

---

<div align="center">
  <i>Built with passion for transforming the retail edge.</i>
</div>
