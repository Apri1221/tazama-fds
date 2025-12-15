# Tazama API Client

REST API testing tool untuk Tazama fraud detection system.

## 🎯 Purpose

Testing tool untuk:
- ✅ Mengirim transaksi test ke Tazama TMS
- ✅ Monitor fraud detection results
- ✅ Debugging rule processing (901, 902, 006, 018)
- ✅ Development & integration testing

**Note:** Ini adalah **testing tool**, bukan bagian dari Tazama production deployment.

## 🚀 Quick Start

```bash
cd tazama_api_client
pip3 install -r requirements.txt
python3 main.py
```

API akan berjalan di: **http://localhost:8095**

Swagger docs: **http://localhost:8095/docs**

## 📁 Structure

```
tazama-api-client/
├── tazama_api_client/      # Main application
│   ├── main.py             # FastAPI entry point
│   ├── config.py           # Configuration
│   ├── routers/            # API endpoints
│   ├── services/           # Business logic
│   ├── models/             # Data models
│   └── _archive/           # Archived deployment files (moved to main repo)
└── README.md               # This file
```

## 🔧 Configuration

Edit `tazama_api_client/config.py`:

```python
TMS_BASE_URL = "http://localhost:3000"  # Tazama TMS endpoint
PG_HOST = "localhost"
PG_PORT = 5433
PG_DATABASE = "configuration"
```

## 📡 API Endpoints

### Send Transaction
```bash
curl -X POST http://localhost:8095/api/transaction \
  -H "Content-Type: application/json" \
  -d @examples/pacs008.json
```

### Health Check
```bash
curl http://localhost:8095/health
```

### View Swagger
```
http://localhost:8095/docs
```

## 🔗 Related Documentation

- **Main Tazama Setup:** `/start/README.md`
- **Rule Configuration:** `/start/init-db/05-setup-extra-rules.sql`
- **Docker Compose:** `/start/docker-compose.yml`
- **Deployment Guide:** `/start/SETUP.md`

## 📝 Notes

- File SQL & shell scripts untuk deployment sudah dipindahkan ke `/start/init-db/`
- Archived files ada di `tazama_api_client/_archive/` untuk referensi
- Fokus project ini sekarang: **Testing & Development Tool**

## 🧪 Testing Fraud Detection

1. Start Tazama services: `cd ../start && ./start.sh`
2. Start API client: `cd tazama_api_client && python3 main.py`
3. Send test transaction via Swagger UI atau curl
4. Monitor logs: `docker logs tazama-rule-006 -f`

---

**Last Updated:** December 12, 2025  
**Status:** Clean & focused on testing functionality
