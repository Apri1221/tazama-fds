# Tazama API Client

REST API client untuk testing Tazama fraud detection system.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip3 install -r requirements.txt
```

### 2. Configure
File `config.py` sudah dikonfigurasi untuk:
- TMS Service: `http://localhost:3000`
- PostgreSQL: `localhost:5433` (configuration database)

### 3. Start Server
```bash
python3 main.py
# atau
./start.sh
```

API Server akan berjalan di: **http://localhost:8095**

## 📡 Available Endpoints

### Health Check
```bash
curl http://localhost:8095/health
```

### Send Transaction (pacs.008)
```bash
curl -X POST http://localhost:8095/api/transaction \
  -H "Content-Type: application/json" \
  -d @examples/pacs008.json
```

### Check Transaction Status
```bash
curl http://localhost:8095/api/transaction/{messageId}
```

### View Swagger Docs
Open: http://localhost:8095/docs

## 📁 Project Structure

```
tazama_api_client/
├── main.py              # FastAPI application entry point
├── config.py            # Configuration (TMS URL, DB connection)
├── requirements.txt     # Python dependencies
├── routers/            # API route handlers
├── services/           # Business logic & TMS communication
├── models/             # Pydantic data models
├── templates/          # HTML templates (optional UI)
└── static/             # Static assets
```

## 🔧 Configuration

Edit `config.py` jika perlu mengubah:
```python
TMS_BASE_URL = "http://localhost:3000"
PG_HOST = "localhost"
PG_PORT = 5433
PG_DATABASE = "configuration"
```

## 🧪 Testing Fraud Detection

Setelah sistem Tazama berjalan, gunakan API ini untuk:
1. Mengirim transaksi test (pacs.008, pacs.002)
2. Monitor hasil evaluasi fraud
3. Verify rule processing (901, 902, 006, 018)

## 📝 Notes

- API Client ini adalah **testing tool**, bukan bagian dari Tazama core
- Database configuration digunakan untuk query network_map & rules
- Untuk production, gunakan direct NATS messaging

## 🔗 Related

- Main Tazama Setup: `/Users/62509/Documents/BNI/solar/fraud/start/`
- Rule Configurations: `/Users/62509/Documents/BNI/solar/fraud/start/init-db/`
- Docker Compose: `/Users/62509/Documents/BNI/solar/fraud/start/docker-compose.yml`

