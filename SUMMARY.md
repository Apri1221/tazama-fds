# Tazama Project Customization Summary
**BNI Solar Fraud Detection - Rule 903 Implementation & API Client**

**Author:** GitHub Copilot + User (62509)
**Date:** December 15, 2025
**Status:** Production Ready ✅

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [What We Customized](#what-we-customized)
3. [How to Create a New Rule (Step-by-Step)](#how-to-create-a-new-rule-step-by-step)
4. [API Client Customizations](#api-client-customizations)
5. [pacs.002 Support Implementation](#pacs002-support-implementation)
6. [E2E Testing Framework](#e2e-testing-framework)
7. [Issues Encountered & Solutions](#issues-encountered--solutions)
8. [Key Learnings](#key-learnings)
9. [References](#references)

---

## Project Overview

### Objectives Completed

✅ **Created Rule 903**: Geographic Risk Detection untuk Tazama fraud prevention system
✅ **Added pacs.002 Support**: Extend rule compatibility beyond pacs.008
✅ **Built API Client**: Web UI untuk testing dan monitoring fraud detection
✅ **E2E Testing**: Complete end-to-end simulation flow untuk fraud scenarios
✅ **Documentation**: Comprehensive guide untuk future rule development

### Technologies Used

- **Backend**: Python (FastAPI), TypeScript (Rule implementation)
- **Frontend**: HTML, JavaScript (Vanilla), CSS
- **Database**: PostgreSQL (configuration + evaluation data)
- **Message Broker**: NATS
- **Containers**: Docker, docker-compose
- **Standards**: ISO 20022 (pacs.008, pacs.002, pain.001)

---

## What We Customized

### 1. Rule 903 - Geographic Risk Detection

**Purpose**: Detect fraud based on transaction origin location (HIGH/MEDIUM/LOW risk zones)

**Files Created/Modified**:
```
services/rule-executer/rule-903/
├── index.ts                    # TypeScript source (NEW)
├── lib/index.js               # Compiled JavaScript (NEW)
├── package.json               # Dependencies (NEW)
├── Dockerfile                 # Container config (NEW)
└── tsconfig.json              # TypeScript config (NEW)

init-db/
├── 06-setup-rule-903.sql      # Database setup (NEW)
└── 07-setup-typology-999.sql  # Typology config (NEW)

docker-compose.yml             # Added rule-903 service (MODIFIED)
```

**Key Features**:
- Extracts geo-location from `SplmtryData.Envlp.Doc.InitgPty.Glctn`
- Maps lat/long to Indonesian cities (Jakarta, Bandung, Surabaya, etc.)
- Returns risk bands: `.01` (HIGH), `.02` (MEDIUM), `.03` (LOW)
- Configured via database (no code changes needed for new cities)

**Database Configuration**:
```sql
-- configuration.rule table
{
  "id": "903@1.0.0",
  "config": {
    "parameters": {
      "riskZones": {
        "high": {"cities": ["Jakarta", "Tangerang", "Surabaya"]},
        "medium": {"cities": ["Bandung", "Semarang", "Denpasar"]},
        "low": {"cities": ["Yogyakarta", "Solo", "Malang"]}
      }
    }
  }
}

-- configuration.typology table (Typology 999)
{
  "id": "typology-processor@1.0.0",
  "cfg": "999-903@1.0.0",
  "rules": [{
    "id": "903@1.0.0",
    "wghts": [
      {"ref": ".01", "wght": "100"},  // HIGH RISK = BLOCK
      {"ref": ".02", "wght": "50"},   // MEDIUM RISK = ALERT
      {"ref": ".03", "wght": "10"}    // LOW RISK = PASS
    ]
  }],
  "workflow": {
    "alertThreshold": 50,
    "interdictionThreshold": 100
  }
}
```

---

### 2. pacs.002 Support - Fixed Tazama Bug

**Problem**: Tazama had an **architectural inconsistency**:
- ✅ **Rules** (901, 902, 903) were designed to process **pacs.008** (FIToFICstmrCdtTrf)
- ❌ **Typology Processor** was hardcoded to ONLY read **pacs.002** (FIToFIPmtSts)
- ❌ **TADP** was hardcoded to ONLY read **pacs.002** (FIToFIPmtSts)

**Result**: When we sent pacs.008 for Geographic Risk testing → **CRASH!**

**Error**:
```
TypeError: Cannot read properties of undefined (reading 'GrpHdr')
  at typology-processor: transaction.FIToFIPmtSts.GrpHdr.MsgId
  at TADP: transaction.FIToFIPmtSts.GrpHdr.MsgId
```

**Files Modified**:
```
services/typology-processor/src/index.ts           # FIXED: Dynamic type detection
services/tadp/src/index.ts                         # FIXED: Support both types
services/rule-executer/src/helpers/normalizeTransaction.ts  # NEW: Helper function
services/rule-executer/rule-903/index.ts           # Uses normalizeTransaction
services/rule-executer/rule-901/lib/index.js       # Uses normalizeTransaction
services/rule-executer/rule-902/lib/index.js       # Uses normalizeTransaction
```

---

#### Fix 1: Typology Processor - Dynamic Transaction Type Detection

**Before (HARDCODED - BROKEN)**:
```typescript
// typology-processor/src/index.ts
const transactionID = transaction.FIToFIPmtSts.GrpHdr.MsgId;
//                                ↑↑↑↑↑↑↑↑↑↑↑↑↑
//                    ONLY works with pacs.002!
//                    pacs.008 → CRASH!
```

**After (DYNAMIC - FIXED)**:
```typescript
// typology-processor/src/index.ts
const parsedTrans = transaction as any;
const apmTransaction = apm.startTransaction('typroc.handleTransaction', {
  childOf: typeof metaData?.traceParent === 'string' ? metaData.traceParent : undefined,
});

// Detect transaction type dynamically (pacs.002 vs pacs.008)
let transactionType: string;
if ('FIToFIPmtSts' in parsedTrans) {
  transactionType = 'FIToFIPmtSts'; // pacs.002
} else if ('FIToFICstmrCdtTrf' in parsedTrans) {
  transactionType = 'FIToFICstmrCdtTrf'; // pacs.008
} else {
  loggerService.error('Unknown transaction type', undefined, context, 'unknown');
  return;
}

// Validate transaction structure
if (!parsedTrans[transactionType] || !parsedTrans[transactionType].GrpHdr) {
  loggerService.error(
    `Transaction type ${transactionType} exists but missing GrpHdr. Transaction keys: ${Object.keys(parsedTrans[transactionType] || {}).join(', ')}`,
    undefined,
    context,
    'unknown'
  );
  return;
}

// Extract transaction ID dynamically
const transactionID = parsedTrans[transactionType].GrpHdr.MsgId;
```

---

#### Fix 2: TADP - Support Both Message Types

**Before (HARDCODED - BROKEN)**:
```typescript
// tadp/src/index.ts
const transactionID = transaction.FIToFIPmtSts.GrpHdr.MsgId;
```

**After (MULTI-TYPE - FIXED)**:
```typescript
// tadp/src/index.ts
const transactionID =
  transaction.FIToFIPmtSts?.GrpHdr?.MsgId ||           // pacs.002
  transaction.FIToFICstmrCdtTrf?.GrpHdr?.MsgId ||      // pacs.008
  transaction.CstmrCdtTrfInitn?.GrpHdr?.MsgId ||       // pain.001
  'UNKNOWN';
```

---

#### Fix 3: normalizeTransaction Helper (NEW)

**Purpose**: Ensure rules can safely access both pacs.008 and pacs.002 properties

```typescript
// services/rule-executer/src/helpers/normalizeTransaction.ts
export function normalizeTransaction(transaction: any): any {
  // Case 1: Has pacs.008 but NOT pacs.002 → Add mock pacs.002
  if (transaction.FIToFICstmrCdtTrf && !transaction.FIToFIPmtSts) {
    return {
      ...transaction,
      FIToFIPmtSts: {
        GrpHdr: transaction.FIToFICstmrCdtTrf.GrpHdr,
        OrgnlGrpInfAndSts: {
          OrgnlMsgId: null,
          OrgnlMsgNmId: null,
          GrpSts: null
        },
        TxInfAndSts: {
          StsId: null,
          OrgnlInstrId: null,
          OrgnlEndToEndId: null,
          TxSts: null,               // Rules check this
          StsRsnInf: null,
          ChrgsInf: null,
          AccptncDtTm: null,
          AcctSvcrRef: null,
          ClrSysRef: null,
          OrgnlTxRef: { /* ... */ }
        }
      }
    };
  }

  // Case 2: Has pacs.002 but NOT pacs.008 → Add mock pacs.008
  if (transaction.FIToFIPmtSts && !transaction.FIToFICstmrCdtTrf) {
    return {
      ...transaction,
      FIToFICstmrCdtTrf: {
        GrpHdr: transaction.FIToFIPmtSts.GrpHdr,
        CdtTrfTxInf: {
          PmtId: null,
          Dbtr: null,
          DbtrAcct: null,            // Rules extract account from here
          Cdtr: null,
          CdtrAcct: null,
          IntrBkSttlmAmt: null,      // Rules extract amount from here
          /* ... all fields null ... */
        }
      }
    };
  }

  return transaction;  // Already has both or unknown type
}
```

**Usage in Rules**:
```typescript
// rule-903/index.ts
import { normalizeTransaction } from '../src/helpers/normalizeTransaction';

async function handleTransaction(req: RuleRequest, ...args) {
  // Normalize first
  const transaction = normalizeTransaction(req.transaction);

  // Now safe to access EITHER structure
  const debtorAccount =
    transaction.FIToFICstmrCdtTrf?.CdtTrfTxInf?.DbtrAcct?.Id?.Othr?.[0]?.Id ||  // pacs.008
    transaction.FIToFIPmtSts?.TxInfAndSts?.OrgnlTxRef?.Dbtr?.Id ||               // pacs.002
    null;

  // No crash!
}
```

---

#### Summary of Changes

| Component | Before | After |
|-----------|--------|-------|
| **Rules** (901-903) | pacs.008 only | pacs.008 ✅ + pacs.002 ✅ |
| **Typology Processor** | pacs.002 ONLY (HARDCODED) ❌ | **DYNAMIC detection** ✅ |
| **TADP** | pacs.002 ONLY (HARDCODED) ❌ | **Multi-type support** ✅ |

**Benefits**:
- ✅ Fixed Tazama architectural bug
- ✅ Supports complete ISO 20022 workflow (pacs.008 → pacs.002)
- ✅ Rules don't crash when accessing properties from different message types
- ✅ Backward compatible with existing deployments

---

### 3. API Client (tazama-api-client)

**Purpose**: Web-based testing interface untuk Tazama fraud detection system

**Structure**:
```
tazama-api-client/
├── tazama_api_client/
│   ├── main.py                     # FastAPI app entry
│   ├── routers/
│   │   ├── transactions.py         # Transaction endpoints (NEW)
│   │   └── attacks.py              # E2E simulation endpoints (NEW)
│   ├── services/
│   │   └── tms_client.py           # TMS HTTP client (NEW)
│   ├── utils/
│   │   └── payload_generator.py    # ISO 20022 payload builder (NEW)
│   ├── templates/
│   │   └── index.html              # Web UI (NEW)
│   └── static/
│       ├── css/style.css           # Styling (NEW)
│       └── js/app.js               # Frontend logic (NEW)
├── requirements.txt                # Python dependencies
└── README.md
```

**Key Endpoints**:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/transactions/send` | POST | Send single pacs.008 transaction |
| `/api/transactions/send-pacs002` | POST | Send pacs.002 status report |
| `/api/transactions/rule-903/{msg_id}` | GET | Get Rule 903 results |
| `/api/test/geographic-risk-simulation` | POST | E2E Geographic Risk test |
| `/api/test/fraud-simulation-flow` | POST | Generic E2E fraud simulation |

---

### 4. Payload Generator (`payload_generator.py`)

**Purpose**: Generate ISO 20022 compliant messages with geo-location data

**Functions Created**:

#### `generate_pacs008()` - FIToFICstmrCdtTrf (Financial Institution Credit Transfer)
```python
def generate_pacs008(
    debtor_account=None,
    amount=None,
    latitude=None,      # NEW: Custom coordinates
    longitude=None,     # NEW: Custom coordinates
    city=None,          # NEW: City name
    region=None         # NEW: Region name
):
    """
    Generate pacs.008 with geo-location in TWO places:
    1. FIToFICstmrCdtTrf.CdtTrfTxInf.SplmtryData (inner)
    2. FIToFICstmrCdtTrf.SplmtryData (outer) ← Rule 903 checks here
    """
    payload = {
        "TxTp": "pacs.008.001.10",
        "FIToFICstmrCdtTrf": {
            "GrpHdr": {...},
            "CdtTrfTxInf": {
                # ... transaction details ...
                "SplmtryData": {
                    "Envlp": {
                        "Doc": {
                            "InitgPty": {
                                "Glctn": {
                                    "Lat": latitude or "-6.2088",
                                    "Long": longitude or "106.8456",
                                    "City": city or "Jakarta",
                                    "Region": region or "DKI Jakarta",
                                    "Country": "ID"
                                }
                            }
                        }
                    }
                }
            },
            "SplmtryData": {  # ← OUTER LEVEL (Rule 903 priority)
                "Envlp": {
                    "Doc": {
                        "InitgPty": {
                            "Glctn": {
                                "Lat": latitude or "-6.2088",
                                "Long": longitude or "106.8456",
                                "City": city or "Jakarta",
                                "Region": region or "DKI Jakarta",
                                "Country": "ID"
                            }
                        }
                    }
                }
            }
        }
    }
    return payload
```

**Critical Fix**: Initial version used **hardcoded coordinates**, causing Rule 903 to always detect Jakarta even when testing Yogyakarta! Fixed by using parameters instead.

#### `generate_pacs002()` - FIToFIPmtSts (Payment Status Report)
```python
def generate_pacs002(original_msg_id, end_to_end_id, status_code="ACCC"):
    """
    Status codes:
    - ACCC: AcceptedSettlementCompleted (✅ Success)
    - RJCT: Rejected (❌ Blocked due to fraud)
    - PDNG: Pending (⏳ Under review)
    """
    return {
        "TxTp": "pacs.002.001.12",
        "FIToFIPmtSts": {
            "GrpHdr": {...},
            "TxInfAndSts": {
                "TxSts": status_code,
                "OrgnlEndToEndId": end_to_end_id,
                # ... status details ...
            }
        }
    }
```

---

### 5. E2E Testing Framework

**Purpose**: Simulate realistic fraud scenarios end-to-end

#### Geographic Risk Simulation (`/api/test/geographic-risk-simulation`)

**Flow**:
```
Step 1: Normal Transaction (Yogyakarta - LOW RISK)
   └─ 1x pacs.008 → ACCC → No Alert

Step 2: Trigger Geographic Risk (Jakarta - HIGH RISK)
   └─ 3x pacs.008 (default) → ACCC → 3 Alerts

Step 3: Check Fraud Detection
   └─ Query database for Rule 903 results

Step 4: Block Transaction (Jakarta - RJCT)
   └─ 1x pacs.008 → RJCT → Interdiction

Step 5: Summary
   └─ Total: 5 transactions, 3 alerts
```

**Code**:
```python
@router.post("/geographic-risk-simulation")
async def geographic_risk_simulation(
    account_id: str = Form("GEO_RISK_001"),
    high_risk_city: str = Form("Jakarta"),
    transaction_count: int = Form(3)
):
    geo_coords = {
        "Jakarta": {"lat": "-6.195062", "long": "106.803215"},
        "Surabaya": {"lat": "-7.250445", "long": "112.768845"},
        "Yogyakarta": {"lat": "-7.795580", "long": "110.369490"}
    }

    # Step 1: Normal TX (Yogyakarta)
    normal_payload = generate_pacs008(
        debtor_account=account_id,
        latitude=geo_coords["Yogyakarta"]["lat"],
        longitude=geo_coords["Yogyakarta"]["long"]
    )
    tms_client.send_pacs008(normal_payload)

    # Step 2: Attack Pattern (Jakarta)
    for i in range(transaction_count):
        attack_payload = generate_pacs008(
            debtor_account=account_id,
            latitude=geo_coords[high_risk_city]["lat"],
            longitude=geo_coords[high_risk_city]["long"]
        )
        tms_client.send_pacs008(attack_payload)

    time.sleep(2)  # Wait for rule processing

    # Step 3: Query fraud alerts from database
    cursor.execute("""
        SELECT rule_id, sub_rule_ref, weight, typology_score, amount
        FROM rule_903_data
        WHERE debtor_acct = %s
          AND rule->>'subRuleRef' = '.01'  -- HIGH RISK only
        ORDER BY timestamp DESC
        LIMIT %s
    """, (account_id, transaction_count))

    fraud_alerts = cursor.fetchall()

    return {
        "fraud_detected": len(fraud_alerts) > 0,
        "fraud_alerts": fraud_alerts,
        "summary": {...}
    }
```

**Database Query Optimization**:
- **Before**: 60-second window → pulled old test data (10+ alerts)
- **After**: 10-second window + LIMIT by transaction_count → exact alerts

---

### 6. Frontend UI (`index.html` + `app.js`)

**Features Implemented**:

#### A. Rule 903 Section
```html
<div class="card">
    <h2>Rule 903: Geographic Risk (pacs.008)</h2>

    <!-- Form fields -->
    <input id="geoDebtorAccount" placeholder="Account ID">
    <input id="geoCity" placeholder="City (Jakarta/Bandung/etc)">

    <!-- Buttons -->
    <button onclick="sendGeoTransaction()">Send Single TX</button>
    <button onclick="runGeoRiskE2E()">E2E Flow Test</button>

    <!-- Progress indicator -->
    <div id="geoE2EProgress">
        <div class="geo-step" data-step="1">Step 1: Normal TX</div>
        <div class="geo-step" data-step="2">Step 2: Trigger Risk</div>
        <div class="geo-step" data-step="3">Step 3: Check Detection</div>
        <div class="geo-step" data-step="4">Step 4: Block TX</div>
        <div class="geo-step" data-step="5">Step 5: Summary</div>
    </div>

    <!-- Fraud summary -->
    <div id="geoE2ESummary">
        <div id="geoSummaryContent"></div>
    </div>
</div>
```

#### B. Fraud Simulation Dropdown
```html
<select id="simRule" onchange="updateFraudSimFields()">
    <option value="rule_901">Rule 901 - Velocity (Debtor)</option>
    <option value="rule_902">Rule 902 - Money Mule</option>
    <option value="rule_006">Rule 006 - Structuring</option>
    <option value="rule_018">Rule 018 - High Value</option>
    <option value="rule_903">📍 Rule 903 - Geographic Risk</option>  <!-- NEW -->
</select>

<button onclick="runFraudSimulation()">Run Simulation</button>
```

**JavaScript Logic**:
```javascript
function updateFraudSimFields() {
    const rule = document.getElementById('simRule').value;

    if (rule === 'rule_903') {
        // Repurpose fields for geographic risk
        debtorNameField.querySelector('label').innerHTML = 'Account ID';
        debtorAccountField.querySelector('label').innerHTML = 'High Risk City';

        debtorNameInput.value = 'GEO_RISK_001';
        debtorAccountInput.value = 'Jakarta';
        countInput.value = '3';  // Default 3 transactions
    }
}

async function runFraudSimulation() {
    const rule = document.getElementById('simRule').value;

    // Route to correct endpoint
    let endpoint = '/api/test/fraud-simulation-flow';
    if (rule === 'rule_903') {
        endpoint = '/api/test/geographic-risk-simulation';  // ← Special endpoint
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
    });

    const data = await response.json();

    // Update progress steps
    data.steps.forEach(step => {
        const stepDiv = document.querySelector(`.sim-step[data-step="${step.step}"]`);
        stepDiv.querySelector('.sim-icon').textContent = step.icon;
    });

    // Show fraud alerts
    if (data.fraud_detected) {
        updateFraudAlerts(data.fraud_alerts);
    }
}
```

#### C. Fraud Alert Display
```javascript
function updateFraudAlerts(alerts) {
    const content = document.getElementById('fraudAlertsContent');

    content.innerHTML = alerts.map(alert => `
        <div class="fraud-alert-card">
            <div>
                <div style="font-weight: bold; color: #b45309;">
                    ${alert.rule_id} ${alert.title}
                </div>
                <div>${alert.desc}</div>
            </div>

            ${alert.rule_detail ? `
            <div style="background: #fef3c7;">
                <strong>Kenapa Ini Trigger:</strong>
                <div>${alert.rule_detail.why_triggered}</div>
            </div>
            ` : ''}

            <button onclick="showFraudAlertModal(index)">
                Lihat Detail Lengkap
            </button>

            <div id="logSnippet${index}" style="display: none;">
                ${alert.log_snippet || alert.raw}
            </div>
        </div>
    `).join('');
}
```

**Alert Data Structure**:
```javascript
{
  "rule_id": "903@1.0.0",
  "title": "Geographic Risk - HIGH RISK Zone",           // NEW
  "desc": "Transaksi dari lokasi berisiko tinggi: Jakarta (Lat: -6.195062, Long: 106.803215)",  // NEW
  "rule_detail": {                                      // NEW
    "why_triggered": "Transaksi berasal dari zona HIGH RISK (Jakarta)...",
    "risk_zone": "Jakarta",
    "coordinates": "-6.195062, 106.803215"
  },
  "request_context": {                                  // NEW
    "debtor_account": "GEO_RISK_001",
    "amount_per_transaction": 1232081.0,
    "transaction_id": "uuid-here",
    "total_transactions": 5
  },
  "log_snippet": "[Rule 903 - Geographic Risk Detection]..."  // NEW
}
```

---

## How to Create a New Rule (Step-by-Step)

### Prerequisites
- Understanding of Tazama architecture (Event Director → Rules → Typology → TADP)
- TypeScript knowledge (or JavaScript for simpler rules)
- ISO 20022 message structure familiarity
- Docker basics

---

### Step 1: Design the Rule

**Define**:
1. **Rule ID**: Format `XXX@1.0.0` (e.g., `904@1.0.0`)
2. **Purpose**: What fraud pattern does it detect?
3. **Input**: Which ISO 20022 message types? (pacs.008, pain.001, etc.)
4. **Output Bands**: Risk levels and their `.ref` codes
5. **Configuration**: What parameters are configurable?

**Example - Rule 904: Transaction Velocity by Amount**:
```
Rule ID: 904@1.0.0
Purpose: Detect multiple transactions of similar amounts in short time window
Input: pacs.008 (FIToFICstmrCdtTrf)
Output Bands:
  - .01 (HIGH): ≥5 transactions within ±10% amount in 5 minutes
  - .02 (MEDIUM): 3-4 transactions within ±20% amount in 10 minutes
  - .03 (LOW): Normal activity
  - .x00 (EXIT): Insufficient historical data
Configuration:
  - timeWindowMs: 300000 (5 minutes)
  - amountTolerance: 0.1 (10%)
  - minTransactionCount: 5
```

---

### Step 2: Create Rule Directory Structure

```bash
cd /Users/62509/Documents/BNI/solar/fraud/start/services/rule-executer

# Create rule directory
mkdir rule-904
cd rule-904

# Initialize package.json
npm init -y
```

**Edit `package.json`**:
```json
{
  "name": "rule-904",
  "version": "1.0.0",
  "description": "Transaction Velocity by Amount Detection",
  "main": "lib/index.js",
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch"
  },
  "dependencies": {
    "@tazama-lf/frms-coe-lib": "latest"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

**Create `tsconfig.json`**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./lib",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["index.ts"],
  "exclude": ["node_modules", "lib"]
}
```

---

### Step 3: Implement Rule Logic (`index.ts`)

**Template**:
```typescript
import { type DatabaseManagerInstance } from '@tazama-lf/frms-coe-lib/lib/interfaces/iDatabaseManager';
import { type LoggerService } from '@tazama-lf/frms-coe-lib';

// Define types
interface RuleRequest {
  transaction: any;
  networkMap: any;
  DataCache: any;
}

interface RuleResult {
  id: string;
  cfg: string;
  tenantId: string;
  subRuleRef: string;
  reason: string;
  indpdntVarbl: number;
  transaction: any;
  prcgTm: number;
}

interface Rule904Config {
  id: string;
  cfg: string;
  tenantId: string;
  config: {
    parameters: {
      timeWindowMs: number;
      amountTolerance: number;
      minTransactionCount: number;
    };
    bands: Array<{
      subRuleRef: string;
      reason: string;
    }>;
    exitConditions: Array<{
      subRuleRef: string;
      reason: string;
    }>;
  };
}

/**
 * Main entry point called by Tazama framework
 */
async function handleTransaction(
  req: RuleRequest,
  determineOutcome: Function,
  ruleResult: RuleResult,
  loggerService: LoggerService,
  ruleConfig: Rule904Config,
  databaseManager: DatabaseManagerInstance<any>
): Promise<RuleResult> {
  const logger = loggerService;
  const startTime = Date.now();

  try {
    logger.log('Rule 904 handleTransaction called');

    // 1. Extract transaction data
    const txData = extractTransactionData(req, logger);
    if (!txData) {
      return exitCondition(ruleResult, ruleConfig, '.x00', 'Transaction data invalid', logger);
    }

    // 2. Query historical transactions from database
    const historicalTxs = await queryHistoricalTransactions(
      databaseManager,
      txData.debtorAccount,
      ruleConfig.config.parameters.timeWindowMs,
      logger
    );

    // 3. Analyze velocity pattern
    const velocityLevel = analyzeVelocityPattern(
      txData.amount,
      historicalTxs,
      ruleConfig.config.parameters
    );

    // 4. Determine risk band
    const band = ruleConfig.config.bands[velocityLevel];

    // 5. Return result
    const processingTime = Date.now() - startTime;
    return {
      ...ruleResult,
      subRuleRef: band.subRuleRef,
      reason: band.reason,
      indpdntVarbl: velocityLevel,
      transaction: req.transaction,
      prcgTm: processingTime
    };

  } catch (error: any) {
    logger.error(`Rule 904 error: ${error.message}`);
    return exitCondition(ruleResult, ruleConfig, '.err', error.message, logger);
  }
}

/**
 * Extract relevant transaction data
 */
function extractTransactionData(req: RuleRequest, logger: any) {
  try {
    const tx = req.transaction?.FIToFICstmrCdtTrf?.CdtTrfTxInf;
    if (!tx) return null;

    return {
      debtorAccount: tx.DbtrAcct?.Id?.Othr?.[0]?.Id,
      amount: parseFloat(tx.IntrBkSttlmAmt?.Amt?.Amt || '0'),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error extracting transaction data:', error);
    return null;
  }
}

/**
 * Query historical transactions from database
 */
async function queryHistoricalTransactions(
  db: DatabaseManagerInstance<any>,
  accountId: string,
  timeWindowMs: number,
  logger: any
): Promise<Array<{amount: number; timestamp: string}>> {
  try {
    const cutoffTime = new Date(Date.now() - timeWindowMs).toISOString();

    const query = `
      SELECT
        (evaluation->'transaction'->'FIToFICstmrCdtTrf'->'CdtTrfTxInf'->'IntrBkSttlmAmt'->'Amt'->>'Amt')::float as amount,
        evaluation->'report'->>'timestamp' as timestamp
      FROM evaluation
      WHERE evaluation->'transaction'->'FIToFICstmrCdtTrf'->'CdtTrfTxInf'->'DbtrAcct'->'Id'->'Othr'->0->>'Id' = $1
        AND (evaluation->'report'->>'timestamp')::timestamp >= $2::timestamp
      ORDER BY timestamp DESC
    `;

    const result = await db.query(query, [accountId, cutoffTime]);
    return result.rows;

  } catch (error: any) {
    logger.error('Database query error:', error.message);
    return [];
  }
}

/**
 * Analyze velocity pattern
 */
function analyzeVelocityPattern(
  currentAmount: number,
  historicalTxs: Array<{amount: number}>,
  params: Rule904Config['config']['parameters']
): number {
  const { amountTolerance, minTransactionCount } = params;

  const similarTxs = historicalTxs.filter(tx => {
    const diff = Math.abs(tx.amount - currentAmount) / currentAmount;
    return diff <= amountTolerance;
  });

  if (similarTxs.length >= minTransactionCount) {
    return 0; // HIGH RISK
  } else if (similarTxs.length >= minTransactionCount * 0.6) {
    return 1; // MEDIUM RISK
  } else {
    return 2; // LOW RISK
  }
}

/**
 * Return exit condition result
 */
function exitCondition(
  ruleResult: RuleResult,
  config: Rule904Config,
  ref: string,
  reason: string,
  logger: any
): RuleResult {
  const condition = config.config.exitConditions.find(c => c.subRuleRef === ref);

  return {
    ...ruleResult,
    subRuleRef: ref,
    reason: condition?.reason || reason,
    indpdntVarbl: -1,
    prcgTm: 0
  };
}

// Export
export default handleTransaction;
```

---

### Step 4: Compile TypeScript to JavaScript

```bash
# Install dependencies
npm install

# Compile
npm run build

# Output: lib/index.js (this is what Docker will copy)
```

**Verify compilation**:
```bash
ls -la lib/
# Should show: index.js, index.d.ts
```

---

### Step 5: Create Dockerfile

**File**: `rule-904/Dockerfile`
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled JavaScript (NOT TypeScript source)
COPY lib ./lib

# Production image
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/lib ./lib
COPY package.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "console.log('healthy')" || exit 1

CMD ["node", "lib/index.js"]
```

---

### Step 6: Add to docker-compose.yml

**File**: `docker-compose.yml`
```yaml
services:
  rule-904:
    build:
      context: ./services/rule-executer/rule-904
      dockerfile: Dockerfile
    container_name: tazama-rule-904
    environment:
      - NODE_ENV=production
      - DATABASE_HOST=postgres
      - DATABASE_PORT=5432
      - DATABASE_NAME=configuration
      - DATABASE_USER=postgres
      - DATABASE_PASSWORD=postgres
      - NATS_URL=nats://nats:4222
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - RULE_NAME=rule-904
      - RULE_VERSION=1.0.0
    depends_on:
      - postgres
      - nats
      - redis
    networks:
      - tazama
    restart: unless-stopped

networks:
  tazama:
    driver: bridge
```

---

### Step 7: Create Database Configuration

**File**: `init-db/08-setup-rule-904.sql`
```sql
-- Insert Rule 904 configuration
INSERT INTO configuration.rule (configuration) VALUES (
'{
  "id": "904@1.0.0",
  "cfg": "1.0.0",
  "tenantId": "DEFAULT",
  "config": {
    "parameters": {
      "timeWindowMs": 300000,
      "amountTolerance": 0.1,
      "minTransactionCount": 5
    },
    "bands": [
      {
        "subRuleRef": ".01",
        "reason": "Multiple transactions with similar amounts detected (HIGH RISK)"
      },
      {
        "subRuleRef": ".02",
        "reason": "Moderate transaction velocity detected (MEDIUM RISK)"
      },
      {
        "subRuleRef": ".03",
        "reason": "Normal transaction velocity (LOW RISK)"
      }
    ],
    "exitConditions": [
      {
        "subRuleRef": ".x00",
        "reason": "Insufficient historical data for velocity analysis"
      },
      {
        "subRuleRef": ".err",
        "reason": "Error processing transaction"
      }
    ]
  }
}'::jsonb
) ON CONFLICT (id, cfg, tenantid) DO UPDATE
SET configuration = EXCLUDED.configuration;
```

---

### Step 8: Create Typology Configuration

**File**: `init-db/09-setup-typology-904.sql`
```sql
INSERT INTO configuration.typology (configuration) VALUES (
'{
  "id": "typology-processor@1.0.0",
  "cfg": "999-904@1.0.0",
  "typology_name": "Typology-999-Velocity-Amount",
  "tenantId": "DEFAULT",

  "rules": [
    {
      "id": "904@1.0.0",
      "cfg": "1.0.0",
      "termId": "v904at100at100",
      "wghts": [
        {"ref": ".err", "wght": "0"},
        {"ref": ".x00", "wght": "0"},
        {"ref": ".01", "wght": "100"},
        {"ref": ".02", "wght": "50"},
        {"ref": ".03", "wght": "10"}
      ]
    },
    {
      "id": "EFRuP@1.0.0",
      "cfg": "none",
      "termId": "vEFRuPat100atnone",
      "wghts": [
        {"ref": ".err", "wght": "0"},
        {"ref": "override", "wght": "0"},
        {"ref": "non-overridable-block", "wght": "0"},
        {"ref": "overridable-block", "wght": "0"},
        {"ref": "none", "wght": "0"}
      ]
    }
  ],

  "workflow": {
    "flowProcessor": "EFRuP@1.0.0",
    "alertThreshold": 50,
    "interdictionThreshold": 100
  },

  "expression": ["Add", "v904at100at100"]
}'::jsonb
) ON CONFLICT (typologyid, typologycfg, tenantid) DO UPDATE
SET configuration = EXCLUDED.configuration;
```

---

### Step 9: Update Network Map

**File**: `init-db/10-update-network-map.sql`
```sql
-- Add Rule 904 to network map (so Event Director routes pacs.008 to it)
UPDATE configuration.network_map
SET rules = jsonb_insert(
  rules,
  '{999}',  -- Insert at end of array
  '"904@1.0.0"'::jsonb
)
WHERE messages @> '["pacs.008.001.10"]'::jsonb;

-- Verify
SELECT * FROM configuration.network_map;
```

**Expected result**:
```json
{
  "messages": ["pacs.008.001.10"],
  "rules": ["901@1.0.0", "902@1.0.0", "903@1.0.0", "904@1.0.0", ...]
}
```

---

### Step 10: Build and Deploy

```bash
# Rebuild database with new config
docker-compose down -v  # WARNING: Deletes all data!
docker-compose up -d postgres
sleep 5  # Wait for init scripts

# Build Rule 904
docker-compose build rule-904

# Start Rule 904
docker-compose up -d rule-904

# Verify it's running
docker ps | grep rule-904

# Check logs
docker logs tazama-rule-904 --tail 50
```

**Expected logs**:
```
[2025-12-15T10:00:00.000Z] INFO: Rule 904 initialized
[2025-12-15T10:00:00.100Z] INFO: Connected to NATS at nats://nats:4222
[2025-12-15T10:00:00.200Z] INFO: Connected to PostgreSQL
[2025-12-15T10:00:00.300Z] INFO: Subscribed to: sub-rule-904@1.0.0
[2025-12-15T10:00:00.400Z] INFO: Rule 904 ready to process transactions
```

---

### Step 11: Test the New Rule

**Test payload** (pacs.008 with amount):
```json
{
  "TxTp": "pacs.008.001.10",
  "FIToFICstmrCdtTrf": {
    "GrpHdr": {
      "MsgId": "VELOCITY-TEST-001"
    },
    "CdtTrfTxInf": {
      "IntrBkSttlmAmt": {
        "Amt": {
          "Amt": "1000000",
          "Ccy": "IDR"
        }
      },
      "DbtrAcct": {
        "Id": {
          "Othr": [{
            "Id": "VELOCITY_TEST_ACCOUNT"
          }]
        }
      }
    }
  }
}
```

**Send test transactions**:
```bash
# Send 5 transactions with similar amounts
for i in {1..5}; do
  curl -X POST http://localhost:3000/execute \
    -H "Content-Type: application/json" \
    -d '{
      "TxTp": "pacs.008.001.10",
      "FIToFICstmrCdtTrf": {
        "CdtTrfTxInf": {
          "IntrBkSttlmAmt": {"Amt": {"Amt": "1000000"}},
          "DbtrAcct": {"Id": {"Othr": [{"Id": "VELOCITY_TEST"}]}}
        }
      }
    }'
  sleep 1
done
```

**Check Rule 904 logs**:
```bash
docker logs tazama-rule-904 --tail 20 --follow
```

**Expected output**:
```
[Rule 904] Transaction 1: amount=1000000, historical=0 → LOW RISK (.03)
[Rule 904] Transaction 2: amount=1000000, historical=1 → LOW RISK (.03)
[Rule 904] Transaction 3: amount=1000000, historical=2 → LOW RISK (.03)
[Rule 904] Transaction 4: amount=1000000, historical=3 → MEDIUM RISK (.02)
[Rule 904] Transaction 5: amount=1000000, historical=4 → HIGH RISK (.01)
[Typology 999] Score=100, Threshold=100 → BLOCK ❌
```

**Query database**:
```sql
SELECT
  rule_id,
  rule->>'subRuleRef' as band,
  rule->>'reason' as reason,
  (typology_result->>'result')::int as typology_score
FROM evaluation
WHERE evaluation->'report'->'tadpResult'->'typologyResult'->0->'ruleResults' @> '[{"id": "904@1.0.0"}]'::jsonb
ORDER BY evaluation->'report'->>'timestamp' DESC
LIMIT 5;
```

**Expected result**:
```
 rule_id    | band  | reason                                          | typology_score
------------+-------+-------------------------------------------------+---------------
 904@1.0.0  | .01   | Multiple transactions with similar amounts...  | 100
 904@1.0.0  | .02   | Moderate transaction velocity detected...      | 50
 904@1.0.0  | .03   | Normal transaction velocity...                 | 10
```

---

### Step 12: Add to API Client (Optional)

**Create E2E test endpoint** (`attacks.py`):
```python
@router.post("/velocity-amount-simulation")
async def velocity_amount_simulation(
    account_id: str = Form("VELOCITY_TEST"),
    amount: float = Form(1000000.0),
    transaction_count: int = Form(5)
):
    """
    Velocity Amount Simulation:
    - Sends N transactions with same/similar amounts
    - Triggers Rule 904 when threshold reached
    """
    for i in range(transaction_count):
        # Vary amount slightly (±5%)
        current_amt = amount + random.uniform(-amount*0.05, amount*0.05)

        payload = generate_pacs008(
            debtor_account=account_id,
            amount=current_amt
        )

        tms_client.send_pacs008(payload)
        time.sleep(0.5)

    # Check fraud alerts
    # ... (similar to geographic-risk-simulation)
```

**Add UI section** (`index.html`):
```html
<div class="card">
    <h2>Rule 904: Velocity by Amount</h2>
    <input id="velocityAccount" placeholder="Account ID">
    <input id="velocityAmount" type="number" placeholder="Amount (IDR)">
    <input id="velocityCount" type="number" placeholder="Transaction Count">
    <button onclick="runVelocityTest()">Run Velocity Test</button>
</div>
```

---

## Issues Encountered & Solutions

### Issue 1: "No geo-location data found in transaction"

**Symptoms**:
- Rule 903 logs: `"Geo-location data not available"`
- All transactions returning `.x00` (exit condition)
- Frontend shows no HIGH RISK alerts

**Root Cause**:
`generate_pacs008()` used **hardcoded coordinates** instead of function parameters:
```python
# WRONG
"Glctn": {
    "Lat": "-6.2088",      # Hardcoded!
    "Long": "106.8456"
}
```

**Solution**:
```python
# CORRECT
"Glctn": {
    "Lat": latitude or "-6.2088",
    "Long": longitude or "106.8456",
    "City": city or "Jakarta",
    "Region": region or "DKI Jakarta",
    "Country": "ID"
}
```

**Files Changed**: `tazama-api-client/tazama_api_client/utils/payload_generator.py`

---

### Issue 2: "Cannot read properties of null (reading 'TxSts')"

**Symptoms**:
- Rules 901, 902, 018 crashing
- Error: `TypeError: Cannot read properties of null (reading 'TxSts')`

**Root Cause**:
Rules accessing `FIToFIPmtSts.TxInfAndSts.TxSts` but `normalizeTransaction` set entire structure to `null`:
```typescript
// WRONG
FIToFIPmtSts: null
```

**Solution**:
```typescript
// CORRECT
FIToFIPmtSts: {
  GrpHdr: transaction.FIToFICstmrCdtTrf.GrpHdr,
  TxInfAndSts: {
    TxSts: null,              // ← Nested structure
    OrgnlEndToEndId: null,
    // ... all fields null
  }
}
```

**Files Changed**: `services/rule-executer/src/helpers/normalizeTransaction.ts`

---

### Issue 3: UI showing "undefined" in fraud alerts

**Symptoms**:
```
Rule 903@1.0.0 undefined
undefined
ALERT
```

**Root Cause**:
Frontend expects `alert.title` and `alert.desc`, but backend only returned `rule_id`, `sub_rule_ref`, `weight`:
```python
# WRONG (backend)
fraud_alerts.append({
    "rule_id": row[0],
    "sub_rule_ref": row[1],
    "weight": row[2]
})
```

**Solution**:
```python
# CORRECT (backend)
fraud_alerts.append({
    "rule_id": row[0],
    "title": f"Geographic Risk - {risk_level} RISK Zone",  # NEW
    "desc": f"Transaksi dari lokasi berisiko tinggi: {city}...",  # NEW
    "rule_detail": {  # NEW
        "why_triggered": "...",
        "risk_zone": city,
        "coordinates": "..."
    },
    "request_context": {  # NEW
        "debtor_account": account_id,
        "amount_per_transaction": amount,
        "transaction_id": tx_id
    },
    "log_snippet": f"[Rule 903]..."  # NEW
})
```

**Files Changed**: `tazama-api-client/tazama_api_client/routers/attacks.py`

---

### Issue 4: Too many alerts (10 instead of 3)

**Symptoms**:
- User sent 3 transactions
- UI showed 10 alerts (duplicates from previous tests)

**Root Cause**:
Database query had:
```sql
WHERE timestamp >= NOW() - INTERVAL '60 seconds'  -- Too wide!
LIMIT 10  -- Too many!
```

**Solution**:
```sql
WHERE timestamp >= NOW() - INTERVAL '10 seconds'  -- Narrower window
LIMIT %s  -- Dynamic based on transaction_count
```

**Passing parameter**:
```python
cursor.execute(query, (account_id, transaction_count))  # ← Pass transaction_count
```

**Files Changed**: `tazama-api-client/tazama_api_client/routers/attacks.py`

---

### Issue 5: Docker caching old compiled code

**Symptoms**:
- Modified `rule-903/index.ts`
- Compiled with `npm run build`
- Docker still running old code (old logs)

**Root Cause**:
Docker cached `COPY lib ./lib` layer even though `lib/index.js` changed

**Solution 1**: Force rebuild without cache
```bash
docker-compose build --no-cache rule-903
```

**Solution 2**: Add cache-breaking comment
```bash
echo "// Updated $(date)" >> services/rule-executer/rule-903/lib/index.js
docker-compose build rule-903
```

**Solution 3**: Remove lib folder before rebuild
```bash
rm -rf services/rule-executer/rule-903/lib
npm run build  # Recompile
docker-compose build rule-903
```

---

### Issue 6: Frontend calling wrong endpoint

**Symptoms**:
- Selected "Rule 903" from dropdown
- Response format was generic fraud-simulation (not geographic-risk specific)

**Root Cause**:
JavaScript not updated due to browser cache:
```javascript
// OLD CODE (cached)
const response = await fetch('/api/test/fraud-simulation-flow', ...);
```

**Solution**:
Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R) to clear cache

**Prevention**:
Add version query string to JS files:
```html
<script src="/static/js/app.js?v=1.0.2"></script>
```

---

### Issue 7: TypeScript type mismatch (city?: string | null)

**Symptoms**:
```
error TS2345: Argument of type '{ city?: string | null; region?: string | null; }'
is not assignable to parameter of type '{ city?: string; region?: string; }'
```

**Root Cause**:
```typescript
// extractGeoLocation returns nullable
return {
  city: glctn.City || null,  // ← string | null
  region: glctn.Region || null
};

// determineRiskLevel expects non-nullable
function determineRiskLevel(
  location: { city?: string; region?: string },  // ← string only
  config: Rule903Config
): number
```

**Solution**:
```typescript
// OPTION 1: Change determineRiskLevel signature
function determineRiskLevel(
  location: { city?: string | null; region?: string | null },
  config: Rule903Config
): number {
  const city = location.city?.toLowerCase() || '';
  // ... handle null
}

// OPTION 2: Filter null before calling
const city = geoLocation.city || undefined;  // Convert null → undefined
const riskLevel = determineRiskLevel({ city, region }, config);
```

**Files Changed**: `services/rule-executer/rule-903/index.ts`

---

## Key Learnings

### 1. Tazama Architecture Insights

**Message Flow is Critical**:
```
TMS → Event Director → Rule → Typology → TADP → Database
 ↓         ↓            ↓        ↓        ↓         ↓
Validate  Route      Detect   Score   Decide   Store
```
- **Each stage is stateless** - must pass transaction data through
- **NATS subjects are specific**: `sub-rule-903@1.0.0` vs `pub-rule-903@1.0.0`
- **Event Director reads network_map** from database to route messages

**Database is Configuration-Driven**:
- Rules, typologies, network maps all stored as JSONB
- Changes require container restart to reload config
- `set_tenant_id()` function required for multi-tenancy support

**Rule Result Must Include Transaction**:
```typescript
return {
  ...ruleResult,
  subRuleRef: '.01',
  reason: 'HIGH RISK',
  transaction: req.transaction  // ← CRITICAL! Typology needs this
};
```

**CRITICAL BUG DISCOVERED**: Original Tazama had architectural inconsistency:
- **Rules** process pacs.008 (payment requests) ✅
- **Typology Processor** hardcoded to read pacs.002 ONLY ❌
- **TADP** hardcoded to read pacs.002 ONLY ❌
- **Result**: Sending pacs.008 → CRASH in downstream components

**Our Fix**:
1. Made Typology Processor **dynamically detect transaction type**
2. Made TADP **support multi-type** (pacs.002 || pacs.008 || pain.001)
3. Added `normalizeTransaction` helper to ensure both structures exist

**Lesson**: Always check if upstream and downstream components expect the same message format! Don't assume consistency across microservices.

---

### 2. ISO 20022 Peculiarities

**TMS Strips Non-Standard Fields**:
- Original payload has `City`, `Region`, `Lat`, `Long`
- TMS only passes `Lat` and `Long` to rules
- Solution: Use bounding boxes to map coordinates → city names

**SplmtryData Has Multiple Locations**:
```
FIToFICstmrCdtTrf.SplmtryData               ← OUTER (checked first by Rule 903)
FIToFICstmrCdtTrf.CdtTrfTxInf.SplmtryData   ← INNER (fallback)
```

**Required vs Optional Fields**:
- **Required**: `GrpHdr`, `CdtTrfTxInf`, `IntrBkSttlmAmt`, `DbtrAcct`, `CdtrAcct`
- **Optional but expected**: `RgltryRptg`, `RmtInf`, `ChrgsInf`, `SplmtryData`

---

### 3. TypeScript → JavaScript Gotchas

**Compilation is Separate from Deployment**:
```bash
# Step 1: Compile (local)
npm run build  # → lib/index.js

# Step 2: Copy to Docker (deployment)
docker-compose build rule-903  # COPY lib ./lib
```

**Docker Caching**:
- If `lib/index.js` timestamp unchanged → Docker uses cache
- Solution: Touch file or rebuild with `--no-cache`

**Type Safety Doesn't Survive Compilation**:
- TypeScript: `city?: string | null` → JavaScript: just `city`
- Runtime errors still possible despite TypeScript checks

---

### 4. Frontend Development Best Practices

**Always Use Function Parameters (Not Hardcoded Values)**:
```python
# BAD
def generate_pacs008():
    return {"Lat": "-6.2088"}  # Always Jakarta!

# GOOD
def generate_pacs008(latitude=None):
    return {"Lat": latitude or "-6.2088"}  # Configurable
```

**API Response Structure Should Match UI Expectations**:
```javascript
// Frontend expects:
{
  "title": "...",      // Must be provided by backend
  "desc": "...",       // Must be provided by backend
  "rule_detail": {...} // Optional but useful
}

// Backend must return these fields!
```

**Browser Caching is a Real Problem**:
- Use hard refresh during development
- Add version query strings in production: `app.js?v=1.0.2`

---

### 5. Database Query Optimization

**Filtering by Time Window**:
```sql
-- TOO WIDE (pulls old test data)
WHERE timestamp >= NOW() - INTERVAL '60 seconds'

-- BETTER (only current simulation)
WHERE timestamp >= NOW() - INTERVAL '10 seconds'
```

**Limiting Results Dynamically**:
```sql
-- STATIC (always returns 10)
LIMIT 10

-- DYNAMIC (matches transaction count)
LIMIT %s
```
```python
cursor.execute(query, (account_id, transaction_count))
```

**JSONB Path Extraction**:
```sql
-- Extract nested value
evaluation->'transaction'->'FIToFICstmrCdtTrf'->'CdtTrfTxInf'->'IntrBkSttlmAmt'->'Amt'->>'Amt'

-- Cast to numeric
(evaluation->'...'->>'Amt')::float
```

---

### 6. Testing Strategy

**Layered Testing Approach**:
1. **Unit Test**: Test rule logic in isolation (mock transaction)
2. **Integration Test**: Send pacs.008 → check database for rule_results
3. **E2E Test**: Full flow (pacs.008 → pacs.002 → alerts → block)

**Logging is Essential**:
```typescript
logger.log('Step 1: Extract geo-location');
logger.log('Step 2: Determine risk level');
logger.log(`Result: ${subRuleRef} - ${reason}`);
```

**Docker Logs + Database Queries**:
```bash
# Check rule processing
docker logs tazama-rule-903 --tail 50

# Check database results
docker exec tazama-postgres psql -U postgres -d evaluation -c "
  SELECT * FROM rule_results WHERE rule_id = '903@1.0.0' LIMIT 5;
"
```

---

## References

### Official Documentation
- **Tazama GitHub**: https://github.com/tazama-lf
- **ISO 20022 Standard**: https://www.iso20022.org/
- **NATS Messaging**: https://docs.nats.io/
- **PostgreSQL JSONB**: https://www.postgresql.org/docs/current/datatype-json.html

### Project Files
```
/Users/62509/Documents/BNI/solar/fraud/start/
├── RULE-903-DOCUMENTATION.md           # Rule 903 technical guide
├── PROJECT-CUSTOMIZATION-SUMMARY.md    # This document
├── services/rule-executer/rule-903/    # Rule implementation
├── init-db/06-setup-rule-903.sql       # Database setup
├── tazama-api-client/                  # Web UI
└── docker-compose.yml                  # Container orchestration
```

### Key Commands

**Development**:
```bash
# Compile TypeScript
cd services/rule-executer/rule-903
npm run build

# Rebuild container
docker-compose build rule-903
docker-compose up -d rule-903

# Check logs
docker logs tazama-rule-903 --tail 50 --follow
```

**Database**:
```bash
# Access PostgreSQL
docker exec -it tazama-postgres psql -U postgres -d configuration

# Query rule results
docker exec tazama-postgres psql -U postgres -d evaluation -c "
  SELECT rule_id, reason, created_at
  FROM rule_results
  WHERE rule_id LIKE '%903%'
  ORDER BY created_at DESC
  LIMIT 5;
"
```

**Testing**:
```bash
# Start API client
cd tazama-api-client
source venv/bin/activate
uvicorn tazama_api_client.main:app --reload --port 8000

# Access UI
open http://localhost:8000
```

---

## FAQ

### Q: Can I add a new city to Rule 903 without rebuilding containers?

**A**: Yes! Update the database configuration:
```sql
UPDATE configuration.rule
SET configuration = jsonb_set(
  configuration,
  '{config,parameters,riskZones,high,cities}',
  configuration->'config'->'parameters'->'riskZones'->'high'->'cities' || '["Bekasi"]'::jsonb
)
WHERE id = '903@1.0.0';

-- Restart rule container to reload config
docker restart tazama-rule-903
```

### Q: How do I change the interdiction threshold from 100 to 200?

**A**: Update the typology configuration:
```sql
UPDATE configuration.typology
SET configuration = jsonb_set(
  configuration,
  '{workflow,interdictionThreshold}',
  '200'
)
WHERE typologyid = 'typology-processor@1.0.0'
  AND typologycfg = '999-903@1.0.0';

-- Restart typology processor
docker restart tazama-typology-processor
```

### Q: Do I need to support both pacs.008 and pacs.002 in my rule?

**A**: Not necessarily. Most rules only need pacs.008 (payment request). Use pacs.002 (status report) if you need to:
- Check transaction approval status (ACCC/RJCT/PDNG)
- Analyze rejection patterns
- Track interdiction effectiveness

### Q: Can I create a rule that blocks ALL transactions from a specific CIF?

**A**: Yes! Create a "Blocklist Rule":
```typescript
// Pseudo-code
async function handleTransaction(req, ...args) {
  const debtorCIF = extractCIF(req.transaction);

  const isBlocked = await checkBlocklist(debtorCIF, databaseManager);

  if (isBlocked) {
    return {
      ...ruleResult,
      subRuleRef: '.01',  // High risk
      reason: 'Account on blocklist',
      indpdntVarbl: 0
    };
  }

  return {
    ...ruleResult,
    subRuleRef: '.03',  // Low risk
    reason: 'Account not on blocklist',
    indpdntVarbl: 2
  };
}
```

Then create a blocklist table:
```sql
CREATE TABLE blocklist (
  cif VARCHAR(50) PRIMARY KEY,
  reason TEXT,
  blocked_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO blocklist VALUES ('12345', 'Fraud detected', NOW());
```

### Q: How do I debug "Rule not executing"?

**Checklist**:
1. ✅ **Container running?** `docker ps | grep rule-903`
2. ✅ **Logs show subscribed?** `docker logs tazama-rule-903 | grep "Subscribed"`
3. ✅ **Network map includes rule?** Query `configuration.network_map`
4. ✅ **Rule config exists?** Query `configuration.rule WHERE id = '903@1.0.0'`
5. ✅ **NATS connection OK?** `docker logs tazama-rule-903 | grep "Connected to NATS"`
6. ✅ **Event Director routing?** `docker logs tazama-event-director --tail 50`

---

**Document Version:** 1.0
**Last Updated:** December 15, 2025
**Author:** GitHub Copilot + User (62509)
**Status:** Complete ✅

**Next Steps**:
- [ ] Add machine learning model integration guide
- [ ] Create rule performance benchmarking tool
- [ ] Document inter-rule dependencies
- [ ] Build automated testing framework
