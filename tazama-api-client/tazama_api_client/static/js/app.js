document.addEventListener('DOMContentLoaded', async () => {
    console.log('[INIT] Page loaded, starting initialization...');

    try {
        console.log('[INIT] Calling checkHealth()...');
        await checkHealth();
        console.log('[INIT] checkHealth() completed');
    } catch (e) {
        console.error('[INIT] checkHealth() error:', e);
    }

    try {
        console.log('[INIT] Calling loadStats()...');
        await loadStats();
        console.log('[INIT] loadStats() completed');
    } catch (e) {
        console.error('[INIT] loadStats() error:', e);
    }

    try {
        console.log('[INIT] Calling setupEventListeners()...');
        setupEventListeners();
        console.log('[INIT] setupEventListeners() completed');
    } catch (e) {
        console.error('[INIT] setupEventListeners() error:', e);
    }

    try {
        console.log('[INIT] Calling startFraudAlertPolling()...');
        startFraudAlertPolling();
        console.log('[INIT] startFraudAlertPolling() completed');
    } catch (e) {
        console.error('[INIT] startFraudAlertPolling() error:', e);
    }

    console.log('[INIT] Initialization complete!');
});

const API = {
    checkHealth: '/api/health',
    stats: '/api/stats',
    pacs008: '/api/test/pacs008',
    fullTx: '/api/test/full-transaction',
    quickStatus: '/api/test/quick-status',
    batch: '/api/test/batch',
    velocity: '/api/test/velocity',
    creditor: '/api/test/velocity-creditor',
    attackScenario: '/api/test/attack-scenario',
    e2eFlow: '/api/test/e2e-flow',
    dbSummary: '/api/test/db-summary',
    logs: (container) => `/api/logs/${container}`,
    fraudAlerts: '/api/fraud-alerts',
    history: '/api/history'
};

function setupEventListeners() {
    // Velocity Test
    const velForm = document.getElementById('velocityTestForm');
    if (velForm) velForm.addEventListener('submit', (e) => handleAttackSimulation(e, API.velocity));

    // Creditor Test
    const credForm = document.getElementById('creditorTestForm');
    if (credForm) credForm.addEventListener('submit', (e) => handleAttackSimulation(e, API.creditor));

    // Advanced Attack
    const advForm = document.getElementById('advancedAttackForm');
    if (advForm) advForm.addEventListener('submit', (e) => {
        // Ensure scenario is set
        const select = document.getElementById('attackScenarioSelect');
        document.getElementById('hiddenScenarioInput').value = select.value;
        // Amount logic
        const amtInput = document.getElementById('adv_amount');
        // If empty, let backend handle it, else use value

        handleAttackSimulation(e, '/api/test/attack-scenario');
    });
}

// --- API Interactions ---

async function checkHealth() {
    console.log('[checkHealth] Starting...');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const statusBar = document.querySelector('.status-bar');

    // Get the button that triggered this (assuming it has onclick="checkHealth()")
    // Note: Since we call this on load too, we need to find it safely.
    const checkBtn = document.querySelector('button[onclick="checkHealth()"]');
    console.log('[checkHealth] Button found:', !!checkBtn);

    // 1. Vibration/Shake Effect (only if button clicked)
    if (checkBtn) {
        console.log('[checkHealth] Adding button animations...');
        checkBtn.classList.remove('btn-shake'); // Reset
        void checkBtn.offsetWidth; // Trigger reflow
        checkBtn.classList.add('btn-shake');

        // 2. Aesthetic Loading State
        const originalContent = checkBtn.innerHTML;
        checkBtn.disabled = true;
        checkBtn.classList.add('btn-loading');
        checkBtn.innerHTML = `<span class="btn-spinner"></span> Checking...`;

        // Artificial delay (min 800ms) to show off the aesthetic loading
        // because sometimes localhost is too fast!
        console.log('[checkHealth] Waiting 800ms...');
        await new Promise(r => setTimeout(r, 800));
    }

    try {
        console.log('[checkHealth] Fetching API.checkHealth:', API.checkHealth);
        const response = await fetch(API.checkHealth);
        console.log('[checkHealth] Response received, status:', response.status);
        const data = await response.json();
        console.log('[checkHealth] Data:', data);

        if (data.status === 'success') {
            statusDot.className = 'status-dot online';
            statusBar.classList.remove('status-error');

            statusText.innerHTML = `
                <div class="status-content">
                    <span class="status-main">System Online</span>
                    <span class="status-sub">TMS Service Active • Response: ${data.response_time_ms.toFixed(0)}ms</span>
                </div>
            `;
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        statusDot.className = 'status-dot offline';
        statusBar.classList.add('status-error');

        statusText.innerHTML = `
            <div class="status-content">
                <span class="status-main">Your Tazama Local Docker Is Offline</span>
                <span class="status-sub">Action Required: Please run <code>tazama local</code> to start services</span>
            </div>
        `;
    } finally {
        // Restore button state (only if button was clicked)
        if (checkBtn) {
            checkBtn.classList.remove('btn-loading');
            checkBtn.disabled = false;
            if (checkBtn.innerHTML.includes('Checking...')) {
                checkBtn.innerHTML = `
                    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Check Connectivity
                `;
            }
        }
    }
}

async function loadDbSummary() {
    const content = document.getElementById('dbSummaryContent');
    const historyContent = document.getElementById('dbHistoryContent');
    const toggleIcon = document.getElementById('dbHistoryToggleIcon');

    // Auto-expand when loading
    if (historyContent) {
        historyContent.style.display = 'block';
        if (toggleIcon) toggleIcon.textContent = '▼';
    }

    content.innerHTML = '<em style="color: #94a3b8;">Loading...</em>';

    try {
        const response = await fetch(API.dbSummary);
        const data = await response.json();

        if (data.status === 'success') {
            let html = `<div style="margin-bottom: 0.75rem; color: #fff;"><strong>Total Transaksi: ${data.total_transactions}</strong></div>`;

            // Debtors table
            html += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">`;
            html += `<div>`;
            html += `<div style="font-weight: 600; margin-bottom: 0.5rem; color: #f87171;">👤 Debtor (Pengirim)</div>`;
            if (data.debtors && data.debtors.length > 0) {
                html += `<table style="width: 100%; font-size: 0.85rem; border-collapse: collapse;">`;
                html += `<tr style="background: rgba(255,255,255,0.1);"><th style="padding: 6px; text-align: left; color: #e2e8f0;">Account</th><th style="padding: 6px; text-align: right; color: #e2e8f0;">Tx</th></tr>`;
                data.debtors.forEach(d => {
                    const bgColor = d.tx_count >= 3 ? 'rgba(239, 68, 68, 0.2)' : 'transparent';
                    html += `<tr style="background: ${bgColor};"><td style="padding: 5px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #cbd5e1;">${d.account}</td><td style="padding: 5px; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; font-weight: ${d.tx_count >= 3 ? '700' : '400'};">${d.tx_count}</td></tr>`;
                });
                html += `</table>`;
            } else {
                html += `<em style="color: #94a3b8;">Tidak ada data</em>`;
            }
            html += `</div>`;

            // Creditors table
            html += `<div>`;
            html += `<div style="font-weight: 600; margin-bottom: 0.5rem; color: #34d399;">🏦 Creditor (Penerima)</div>`;
            if (data.creditors && data.creditors.length > 0) {
                html += `<table style="width: 100%; font-size: 0.85rem; border-collapse: collapse;">`;
                html += `<tr style="background: rgba(255,255,255,0.1);"><th style="padding: 6px; text-align: left; color: #e2e8f0;">Account</th><th style="padding: 6px; text-align: right; color: #e2e8f0;">Tx</th></tr>`;
                data.creditors.forEach(c => {
                    const bgColor = c.tx_count >= 3 ? 'rgba(239, 68, 68, 0.2)' : 'transparent';
                    html += `<tr style="background: ${bgColor};"><td style="padding: 5px; border-bottom: 1px solid rgba(255,255,255,0.1); color: #cbd5e1;">${c.account}</td><td style="padding: 5px; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; font-weight: ${c.tx_count >= 3 ? '700' : '400'};">${c.tx_count}</td></tr>`;
                });
                html += `</table>`;
            } else {
                html += `<em style="color: #94a3b8;">Tidak ada data</em>`;
            }
            html += `</div></div>`;

            // Add hint
            html += `<div style="margin-top: 0.75rem; padding: 0.5rem; background: rgba(251, 191, 36, 0.1); border-radius: 6px; font-size: 0.8rem; color: #fbbf24;">💡 Highlight merah = sudah ≥3 transaksi (potensi trigger Rule 901/902)</div>`;

            content.innerHTML = html;
        } else {
            content.innerHTML = `<span style="color: #f87171;">Error: ${data.message}</span>`;
        }
    } catch (error) {
        content.innerHTML = `<span style="color: #f87171;">Error: ${error.message}</span>`;
    }
}

function toggleDbHistory() {
    const content = document.getElementById('dbHistoryContent');
    const icon = document.getElementById('dbHistoryToggleIcon');

    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '▼';
    } else {
        content.style.display = 'none';
        icon.textContent = '▶';
    }
}

async function testPacs008() {
    const formData = new FormData();
    const debtorName = document.getElementById('debtorName008').value;
    const debtorAccount = document.getElementById('debtorAccount008').value;
    const creditorName = document.getElementById('creditorName008').value;
    const creditorAccount = document.getElementById('creditorAccount008').value;
    const amount = document.getElementById('amount008').value;
    const currency = document.getElementById('currency008').value;

    if (!debtorName || !debtorAccount || !amount) {
        alert('Please fill in all required fields (Debtor Name, Debtor Account, and Amount)');
        return;
    }

    if (debtorName) formData.append('debtor_name', debtorName);
    if (debtorAccount) formData.append('debtor_account', debtorAccount);
    if (creditorName) formData.append('creditor_name', creditorName);
    if (creditorAccount) formData.append('creditor_account', creditorAccount);
    if (amount) formData.append('amount', amount);
    if (currency) formData.append('currency', currency);

    await handleSimpleTest(API.pacs008, formData, 'response008', (data) => {
        if (data.payload_sent?.GrpHdr?.MsgId) {
            document.getElementById('messageId002').value = data.payload_sent.GrpHdr.MsgId;
        }
        updateFraudAlerts(data.fraud_alerts || [], data.request_summary);
    });
}

async function testPacs002() {
    const msgId = document.getElementById('messageId002').value;
    if (!msgId) {
        alert('Please provide a Message ID first (run pacs.008 test)');
        return;
    }

    const formData = new FormData();
    formData.append('message_id', msgId);
    formData.append('status_code', document.getElementById('statusCode002').value);

    await handleSimpleTest(API.pacs002, formData, 'response002');
}

async function testFullTransaction() {
    const formData = new FormData();
    const acc = document.getElementById('debtorAccountFull').value;
    const amt = document.getElementById('amountFull').value;

    if (acc) formData.append('debtor_account', acc);
    if (amt) formData.append('amount', amt);

    await handleSimpleTest(API.fullTx, formData, 'responseFull');
}

async function testQuickStatus(statusCode) {
    const formData = new FormData();
    formData.append('status_code', statusCode);

    const amt = document.getElementById('quickAmount').value;
    if (amt) formData.append('amount', amt);

    await handleSimpleTest(API.quickStatus, formData, 'responseQuick');
}

async function testE2EFlow() {
    const progressBox = document.getElementById('e2eProgressBox');
    const responseBox = document.getElementById('responseE2E');
    const steps = ['step1', 'step2', 'step3', 'step4'];

    // Reset steps
    steps.forEach(stepId => {
        const stepEl = document.getElementById(stepId);
        if (stepEl) stepEl.querySelector('.step-icon').textContent = '⏳';
    });

    progressBox.style.display = 'block';
    responseBox.style.display = 'none';

    const formData = new FormData();
    formData.append('debtor_account', document.getElementById('e2eDebtorAccount').value);
    formData.append('creditor_account', document.getElementById('e2eCreditorAccount').value);
    formData.append('amount', document.getElementById('e2eAmount').value);
    formData.append('final_status', document.getElementById('e2eFinalStatus').value);

    showLoading(true);

    try {
        const response = await fetch(API.e2eFlow, { method: 'POST', body: formData });
        const data = await response.json();

        // Update step indicators based on results
        if (data.steps) {
            data.steps.forEach((step, index) => {
                const stepEl = document.getElementById(`step${index + 1}`);
                if (stepEl) {
                    const icon = stepEl.querySelector('.step-icon');
                    if (step.skipped) {
                        icon.textContent = '⏭️';
                    } else if (step.success) {
                        icon.textContent = '✅';
                    } else {
                        icon.textContent = '❌';
                    }
                }
            });
        }

        responseBox.style.display = 'block';
        responseBox.querySelector('pre').textContent = JSON.stringify(data, null, 2);

        loadStats();

    } catch (error) {
        responseBox.style.display = 'block';
        responseBox.querySelector('pre').textContent = `Error: ${error.message}`;
    } finally {
        showLoading(false);
    }
}

async function runFraudSimulation() {
    const rule = document.getElementById('simRule').value;
    const responseBox = document.getElementById('fraudSimResponse');
    const progressBox = document.getElementById('fraudSimProgress');
    const summaryBox = document.getElementById('fraudSimSummary');
    const summaryContent = document.getElementById('fraudSummaryContent');

    // Show progress box
    progressBox.style.display = 'block';
    summaryBox.style.display = 'none';
    responseBox.style.display = 'none';

    // Reset all steps to pending
    const steps = document.querySelectorAll('.sim-step');
    steps.forEach(step => {
        const icon = step.querySelector('.sim-icon');
        icon.textContent = '⏳';
    });

    showLoading(true);

    try {
        const formData = new FormData();

        // Common fields
        const debtorAccount = document.getElementById('simDebtorAccount').value;
        const amount = document.getElementById('simAmount').value;
        const count = document.getElementById('simCount').value;

        if (rule === 'rule_901') {
            const debtorName = document.getElementById('simDebtorName').value;
            if (!debtorName || !debtorAccount || !amount || !count) {
                alert('Please fill in all required fields');
                showLoading(false);
                return;
            }
            formData.append('debtor_name', debtorName);
            formData.append('debtor_account', debtorAccount);

        } else if (rule === 'rule_902') {
            const creditorName = document.getElementById('simCreditorName').value;
            const creditorAccount = document.getElementById('simCreditorAccount').value;
            if (!creditorName || !creditorAccount || !amount || !count) {
                alert('Please fill in all required fields');
                showLoading(false);
                return;
            }
            formData.append('creditor_name', creditorName);
            formData.append('creditor_account', creditorAccount);

        } else if (rule === 'rule_006' || rule === 'rule_018') {
            if (!debtorAccount || !amount || !count) {
                alert('Please fill in all required fields');
                showLoading(false);
                return;
            }
        } else if (rule === 'rule_903') {
            const accountId = document.getElementById('simDebtorName').value;
            const highRiskCity = document.getElementById('simDebtorAccount').value;
            if (!accountId || !highRiskCity || !count) {
                alert('Please fill in all required fields (Account ID, High Risk City, Transaction Count)');
                showLoading(false);
                return;
            }
            formData.append('account_id', accountId);
            formData.append('high_risk_city', highRiskCity);
            formData.append('transaction_count', count);
        }

        // Call the appropriate endpoint based on rule
        let endpoint = '/api/test/fraud-simulation-flow';
        if (rule === 'rule_903') {
            endpoint = '/api/test/geographic-risk-simulation';
        } else {
            // Common parameters for other rules
            formData.append('rule', rule);
            formData.append('amount', amount);
            formData.append('count', count);
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        // Update progress steps
        if (data.steps && Array.isArray(data.steps)) {
            data.steps.forEach(step => {
                const stepElem = document.querySelector(`.sim-step[data-step="${step.step}"]`);
                if (stepElem) {
                    const icon = stepElem.querySelector('.sim-icon');
                    icon.textContent = step.icon || (step.success ? '✅' : '❌');
                }
            });
        }

        // Show summary
        if (data.summary) {
            summaryBox.style.display = 'block';
            summaryContent.innerHTML = `
                <strong>🎯 Rule:</strong> ${data.summary.rule_triggered} (${data.summary.rule_id})<br>
                <strong>⚠️  Trigger Condition:</strong> ${data.summary.trigger_condition}<br>
                <strong>📊 Attack Transactions:</strong> ${data.summary.total_attack_transactions}<br>
                <strong>🚨 Fraud Detected:</strong> ${data.summary.fraud_detected ? 'YES' : 'NO'}<br>
                <strong>📋 Alerts:</strong> ${data.summary.alerts_count}<br>
                <strong>🛡️  Final Status:</strong> <span style="color: ${data.summary.final_status === 'BLOCKED' ? '#dc2626' : '#f59e0b'}; font-weight: bold;">${data.summary.final_status}</span><br>
                <strong>💡 Recommendation:</strong> ${data.summary.recommendation}
            `;
        }

        // Show full response
        responseBox.style.display = 'block';
        responseBox.querySelector('pre').textContent = JSON.stringify(data, null, 2);

        // Update fraud alerts if any
        if (data.fraud_alerts && data.fraud_alerts.length > 0) {
            updateFraudAlerts(data.fraud_alerts, data.request_summary);
        }

        loadStats();

    } catch (error) {
        responseBox.style.display = 'block';
        responseBox.querySelector('pre').textContent = `Error: ${error.message}\n\nPlease check that Tazama services are running.`;
        
        // Mark all steps as failed
        const steps = document.querySelectorAll('.sim-step');
        steps.forEach(step => {
            const icon = step.querySelector('.sim-icon');
            icon.textContent = '❌';
        });
    } finally {
        showLoading(false);
    }
}

// --- Generic Handlers ---

async function handleSimpleTest(url, formData, responseElemId, onSuccess) {
    showLoading(true);
    try {
        const response = await fetch(url, { method: 'POST', body: formData });
        const data = await response.json();

        displayJson(responseElemId, data);
        if (onSuccess) onSuccess(data);
    } catch (error) {
        displayJson(responseElemId, { error: error.message });
    } finally {
        showLoading(false);
    }
}

async function handleAttackSimulation(e, url) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const responseBox = form.querySelector('.response-box');

    // UI Loading State
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border"></span> Simulating Attack...`;

    responseBox.style.display = 'block';
    responseBox.querySelector('pre').textContent = '🚀 Launching attack simulation... this may take a moment...';

    try {
        const formData = new FormData(form);
        const response = await fetch(url, { method: 'POST', body: formData });
        const data = await response.json();

        // Handle Fraud Alerts with request summary
        updateFraudAlerts(data.fraud_alerts, data.request_summary);

        // Display Summary
        const successCount = data.results ? data.results.filter(r => r.status === 200).length : 0;
        const total = data.total_sent || 0;

        let summary = {
            status: data.status,
            summary: `Sent ${total} transactions. Success: ${successCount}`,
            details: data.results
        };

        responseBox.querySelector('pre').textContent = JSON.stringify(summary, null, 2);

    } catch (error) {
        responseBox.querySelector('pre').textContent = `Error: ${error.message}`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// --- Helper Functions ---

function updateFraudAlerts(alerts, requestSummary) {
    const panel = document.getElementById('fraudAlertsPanel');
    const content = document.getElementById('fraudAlertsContent');

    if (!alerts || alerts.length === 0) {
        panel.style.display = 'none';
        return;
    }

    panel.style.display = 'block';

    // Store alerts globally for modal access
    window.currentFraudAlerts = alerts;
    window.currentRequestSummary = requestSummary;

    content.innerHTML = alerts.map((alert, index) => `
        <div class="fraud-alert-card" style="margin-bottom: 1rem; border: 2px solid #f59e0b; border-radius: 8px; padding: 1rem; background: #fffbeb;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                <div>
                    <div style="font-weight: bold; color: #b45309; font-size: 1.1em; margin-bottom: 0.25rem;">
                        ${alert.rule_id ? 'Rule ' + alert.rule_id : ''} ${alert.title}
                    </div>
                    <div style="color: #92400e; font-size: 0.95em;">${alert.desc}</div>
                </div>
                <span style="background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75em; font-weight: bold;">
                    ALERT
                </span>
            </div>
            
            ${alert.rule_detail ? `
            <div style="background: #fef3c7; padding: 0.75rem; border-radius: 6px; margin-bottom: 0.75rem;">
                <div style="font-weight: 600; color: #92400e; margin-bottom: 0.5rem;">Kenapa Ini Trigger:</div>
                <div style="color: #78350f; font-size: 0.9em;">${alert.rule_detail.why_triggered}</div>
            </div>
            ` : ''}
            
            ${alert.request_context ? `
            <div style="background: #e0f2fe; padding: 0.75rem; border-radius: 6px; margin-bottom: 0.75rem;">
                <div style="font-weight: 600; color: #0369a1; margin-bottom: 0.5rem;">Request Anda:</div>
                <div style="color: #0c4a6e; font-size: 0.9em;">
                    Debtor: ${alert.request_context.debtor_account || alert.request_context.debtor_name || '-'}<br>
                    ${alert.request_context.creditor_account ? 'Creditor: ' + alert.request_context.creditor_account + '<br>' : ''}
                    Amount: Rp ${(alert.request_context.amount_per_transaction || alert.request_context.amount_requested || 0).toLocaleString('id-ID')}<br>
                    Total Transaksi: ${alert.request_context.total_transactions || '-'}
                </div>
            </div>
            ` : ''}
            
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button onclick="showFraudAlertModal(${index})" 
                    style="background: #0891b2; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.85em;">
                    Lihat Detail Lengkap
                </button>
                <button onclick="toggleLogSnippet(${index})" 
                    style="background: #6b7280; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 0.85em;">
                    Lihat Log Container
                </button>
            </div>
            
            <div id="logSnippet${index}" style="display: none; margin-top: 0.75rem; background: #1f2937; color: #10b981; padding: 0.75rem; border-radius: 6px; font-family: monospace; font-size: 0.8em; overflow-x: auto;">
                ${alert.log_snippet || alert.raw}
            </div>
        </div>
    `).join('');
}

function toggleLogSnippet(index) {
    const snippet = document.getElementById('logSnippet' + index);
    snippet.style.display = snippet.style.display === 'none' ? 'block' : 'none';
}

function showFraudAlertModal(index) {
    const alert = window.currentFraudAlerts[index];
    const requestSummary = window.currentRequestSummary || alert.request_context;

    // Create modal if not exists
    let modal = document.getElementById('fraudAlertModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'fraudAlertModal';
        modal.className = 'fraud-modal-overlay';
        document.body.appendChild(modal);
    }

    const ruleDetail = alert.rule_detail || {};
    const config = ruleDetail.config || {};

    modal.innerHTML = `
        <div class="fraud-modal-content">
            <div class="fraud-modal-header">
                <h3 style="margin: 0; color: #dc2626;">Detail Alert: ${alert.title}</h3>
                <button onclick="closeFraudAlertModal()" style="background: none; border: none; font-size: 1.5em; cursor: pointer; color: #6b7280;">&times;</button>
            </div>
            
            <div class="fraud-modal-body">
                <div class="fraud-modal-section">
                    <h4 style="color: #0369a1; margin-bottom: 0.5rem;">Ringkasan</h4>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 6px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Rule ID</td><td style="padding: 6px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${alert.rule_id || '-'}</td></tr>
                        <tr><td style="padding: 6px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Nama Rule</td><td style="padding: 6px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${ruleDetail.name || alert.title}</td></tr>
                        <tr><td style="padding: 6px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Kondisi Trigger</td><td style="padding: 6px 0; border-bottom: 1px solid #e5e7eb;">${ruleDetail.trigger_condition || alert.desc}</td></tr>
                    </table>
                </div>
                
                <div class="fraud-modal-section" style="background: #fef3c7; padding: 1rem; border-radius: 8px;">
                    <h4 style="color: #b45309; margin-bottom: 0.5rem;">Kenapa Request Anda Mentrigger Alert Ini?</h4>
                    <p style="color: #78350f; margin: 0; line-height: 1.6;">${ruleDetail.why_triggered || 'Transaksi Anda sesuai dengan pola yang mencurigakan berdasarkan konfigurasi rule.'}</p>
                </div>
                
                ${requestSummary ? `
                <div class="fraud-modal-section" style="background: #e0f2fe; padding: 1rem; border-radius: 8px;">
                    <h4 style="color: #0369a1; margin-bottom: 0.5rem;">Detail Request Anda</h4>
                    <pre style="background: #0c4a6e; color: #7dd3fc; padding: 1rem; border-radius: 6px; overflow-x: auto; margin: 0; font-size: 0.85em;">${JSON.stringify(requestSummary, null, 2)}</pre>
                </div>
                ` : ''}
                
                <div class="fraud-modal-section" style="background: #f3f4f6; padding: 1rem; border-radius: 8px;">
                    <h4 style="color: #374151; margin-bottom: 0.5rem;">Konfigurasi Rule</h4>
                    <pre style="background: #1f2937; color: #10b981; padding: 1rem; border-radius: 6px; overflow-x: auto; margin: 0; font-size: 0.85em;">${JSON.stringify(config, null, 2)}</pre>
                </div>
                
                <div class="fraud-modal-section" style="background: #1f2937; padding: 1rem; border-radius: 8px;">
                    <h4 style="color: #10b981; margin-bottom: 0.5rem;">Log Container</h4>
                    <pre style="color: #d1d5db; margin: 0; font-size: 0.8em; white-space: pre-wrap; word-break: break-all;">${alert.log_snippet || alert.raw}</pre>
                </div>
                
                ${ruleDetail.recommendation ? `
                <div class="fraud-modal-section" style="background: #fce7f3; padding: 1rem; border-radius: 8px;">
                    <h4 style="color: #be185d; margin-bottom: 0.5rem;">Rekomendasi</h4>
                    <p style="color: #9d174d; margin: 0;">${ruleDetail.recommendation}</p>
                </div>
                ` : ''}
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeFraudAlertModal() {
    const modal = document.getElementById('fraudAlertModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeFraudAlertModal();
});

// loadHistory() and clearHistory() functions removed - Activity Log feature removed

async function checkInternalLogs(container, boxId, textId) {
    const box = document.getElementById(boxId);
    const text = document.getElementById(textId);

    box.style.display = 'block';
    text.textContent = 'Fetching logs...';

    try {
        const response = await fetch(API.logs(container));
        const data = await response.json();

        text.textContent = data.status === 'success' ? data.logs : `Error: ${data.message}`;
    } catch (error) {
        text.textContent = `Failed to fetch logs: ${error.message}`;
    }
}

function displayJson(elemId, data) {
    const box = document.getElementById(elemId);
    box.style.display = 'block';
    box.querySelector('pre').textContent = JSON.stringify(data, null, 2);
}

function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

function updateScenarioDesc() {
    const select = document.getElementById('attackScenarioSelect');
    const desc = document.getElementById('scenarioDescription');
    const amountInput = document.getElementById('adv_amount');
    const amountHint = document.getElementById('amountHint');
    const countInput = document.getElementById('adv_count');
    const val = select.value;

    if (val === 'rule_006') {
        desc.innerHTML = "ℹ️ <strong>Structuring/Smurfing:</strong> Mengirim beberapa transaksi dengan nominal mirip untuk menghindari threshold audit.<br>" +
            "<span style='color:#dc2626;'>⚠️ Konfigurasi saat ini: tolerance 20%, minimal 5 transaksi mirip untuk trigger.</span>";
        amountInput.placeholder = "9500000";
        amountHint.innerHTML = "💡 Recommended: <strong>9,500,000</strong> (nominal sama untuk trigger structuring)";
        countInput.value = "6";
    } else if (val === 'rule_018') {
        desc.innerHTML = "ℹ️ <strong>High Value Transfer:</strong> Mendeteksi transaksi yang melebihi 1.5x rata-rata historical.<br>" +
            "<span style='color:#dc2626;'>⚠️ PENTING: Rule ini MEMBUTUHKAN historical data! Minimal 6 transaksi (5 kecil + 1 besar).</span><br>" +
            "<span style='color:#0369a1;'>📊 Sistem akan menghitung rata-rata dari 5 transaksi pertama, lalu membandingkan dengan transaksi ke-6.</span>";
        amountInput.placeholder = "500000000";
        amountHint.innerHTML = "💡 Recommended: <strong>500,000,000</strong> (500 juta - transaksi besar sebagai trigger)";
        countInput.value = "6";
    } else if (val === 'rule_901') {
        desc.innerHTML = "ℹ️ <strong>Velocity Check (Debtor):</strong> Mendeteksi debtor yang mengirim terlalu banyak transaksi dalam 1 hari.<br>" +
            "<span style='color:#0369a1;'>📊 Threshold: 3 atau lebih transaksi per hari dari debtor yang sama.</span>";
        amountInput.placeholder = "500000";
        amountHint.innerHTML = "💡 Amount bervariasi otomatis untuk menghindari trigger Rule 006";
        countInput.value = "5";
    } else if (val === 'rule_902') {
        desc.innerHTML = "ℹ️ <strong>Money Mule (Creditor):</strong> Mendeteksi creditor yang menerima dana dari banyak pengirim berbeda.<br>" +
            "<span style='color:#0369a1;'>📊 Threshold: 3 atau lebih transaksi dari debtor berbeda ke creditor yang sama.</span>";
        amountInput.placeholder = "500000";
        amountHint.innerHTML = "💡 Amount bervariasi otomatis untuk menghindari trigger Rule 006";
        countInput.value = "5";
    }
}

// Initialize Scenario Desc
document.addEventListener('DOMContentLoaded', updateScenarioDesc);

function updateFraudSimFields() {
    const rule = document.getElementById('simRule').value;
    const debtorNameField = document.getElementById('fieldDebtorName');
    const debtorAccountField = document.getElementById('fieldDebtorAccount');
    const creditorNameField = document.getElementById('fieldCreditorName');
    const creditorAccountField = document.getElementById('fieldCreditorAccount');
    const amountField = document.getElementById('fieldAmount');
    const countField = document.getElementById('fieldCount');

    const debtorNameInput = document.getElementById('simDebtorName');
    const debtorAccountInput = document.getElementById('simDebtorAccount');
    const creditorNameInput = document.getElementById('simCreditorName');
    const creditorAccountInput = document.getElementById('simCreditorAccount');
    const amountInput = document.getElementById('simAmount');
    const countInput = document.getElementById('simCount');

    // Get hint elements
    const amountHint = document.getElementById('simAmountHint');
    const countHint = document.getElementById('simCountHint');

    if (rule === 'rule_901') {
        debtorNameField.style.display = 'block';
        debtorAccountField.style.display = 'block';
        creditorNameField.style.display = 'none';
        creditorAccountField.style.display = 'none';
        amountField.style.display = 'block';
        countField.style.display = 'block';

        debtorNameField.querySelector('label').innerHTML = 'Attacker Name (Nama Penyerang) <span style="color: red;">*</span>';
        debtorAccountField.querySelector('label').innerHTML = 'Attacker Account (Rekening Penyerang) <span style="color: red;">*</span>';
        amountField.querySelector('label').innerHTML = 'Amount per Transaction (IDR) <span style="color: red;">*</span>';

        debtorNameInput.value = 'Evil Hacker';
        debtorAccountInput.value = 'GB_HACKER_001';
        amountInput.value = '500000';
        countInput.value = '5';
        
        if (amountHint) amountHint.innerHTML = '💡 Amount akan bervariasi otomatis untuk menghindari trigger Rule 006';
        if (countHint) countHint.innerHTML = '💡 Minimal 5 transaksi untuk trigger velocity check';

    } else if (rule === 'rule_902') {
        debtorNameField.style.display = 'none';
        debtorAccountField.style.display = 'none';
        creditorNameField.style.display = 'block';
        creditorAccountField.style.display = 'block';
        amountField.style.display = 'block';
        countField.style.display = 'block';

        creditorNameField.querySelector('label').innerHTML = 'Target Creditor Name (Nama Mule) <span style="color: red;">*</span>';
        creditorAccountField.querySelector('label').innerHTML = 'Target Creditor Account (Rekening Mule) <span style="color: red;">*</span>';
        amountField.querySelector('label').innerHTML = 'Amount per Transaction (IDR) <span style="color: red;">*</span>';

        creditorNameInput.value = 'MULE_TARGET_01';
        creditorAccountInput.value = 'ACC_MULE_999';
        amountInput.value = '500000';
        countInput.value = '5';
        
        if (amountHint) amountHint.innerHTML = '💡 Amount akan bervariasi otomatis untuk menghindari trigger Rule 006';
        if (countHint) countHint.innerHTML = '💡 Minimal 5 transaksi dari debtor berbeda ke creditor yang sama';

    } else if (rule === 'rule_006') {
        debtorNameField.style.display = 'block';
        debtorAccountField.style.display = 'block';
        creditorNameField.style.display = 'none';
        creditorAccountField.style.display = 'none';
        amountField.style.display = 'block';
        countField.style.display = 'block';

        debtorNameField.querySelector('label').innerHTML = 'Debtor Name <span style="color: red;">*</span>';
        debtorAccountField.querySelector('label').innerHTML = 'Debtor Account <span style="color: red;">*</span>';
        amountField.querySelector('label').innerHTML = 'Fixed Amount (Same for All) <span style="color: red;">*</span>';

        debtorNameInput.value = 'Structuring Suspect';
        debtorAccountInput.value = 'GB_STRUCT_001';
        amountInput.value = '9500000';
        countInput.value = '6';
        
        if (amountHint) amountHint.innerHTML = '💡 Recommended: <strong>9,500,000 IDR</strong> (sama persis untuk trigger structuring)';
        if (countHint) countHint.innerHTML = '💡 Minimal 6 transaksi dengan nominal SAMA untuk trigger Rule 006';

    } else if (rule === 'rule_018') {
        debtorNameField.style.display = 'block';
        debtorAccountField.style.display = 'block';
        creditorNameField.style.display = 'none';
        creditorAccountField.style.display = 'none';
        amountField.style.display = 'block';
        countField.style.display = 'block';

        debtorNameField.querySelector('label').innerHTML = 'Debtor Name <span style="color: red;">*</span>';
        debtorAccountField.querySelector('label').innerHTML = 'Debtor Account <span style="color: red;">*</span>';
        amountField.querySelector('label').innerHTML = 'Large Amount (for final tx) <span style="color: red;">*</span>';

        debtorNameInput.value = 'High Value Sender';
        debtorAccountInput.value = 'GB_HIGH_001';
        amountInput.value = '500000000';
        countInput.value = '6';

        if (amountHint) amountHint.innerHTML = '💡 Recommended: <strong>500,000,000 IDR</strong> (500 juta untuk trigger)';
        if (countHint) countHint.innerHTML = '💡 6 transaksi: 5 kecil (history) + 1 BESAR (trigger)';

    } else if (rule === 'rule_903') {
        debtorNameField.style.display = 'block';
        debtorAccountField.style.display = 'block';
        creditorNameField.style.display = 'none';
        creditorAccountField.style.display = 'none';
        amountField.style.display = 'block';
        countField.style.display = 'block';

        debtorNameField.querySelector('label').innerHTML = 'Account ID <span style="color: red;">*</span>';
        debtorAccountField.querySelector('label').innerHTML = 'High Risk City <span style="color: red;">*</span>';
        amountField.querySelector('label').innerHTML = 'Amount per Transaction (IDR) <span style="color: red;">*</span>';

        debtorNameInput.value = 'GEO_RISK_001';
        debtorAccountInput.value = 'Jakarta';
        amountInput.value = '1000000';
        countInput.value = '3';

        if (amountHint) amountHint.innerHTML = '💡 Amount akan bervariasi otomatis untuk menghindari trigger Rule 006';
        if (countHint) countHint.innerHTML = '💡 3-5 transaksi dari HIGH RISK zone (Jakarta, Surabaya, Tangerang)';
    }
}

// --- Stats Dashboard ---
async function loadStats() {
    console.log('[loadStats] Starting...');
    try {
        console.log('[loadStats] Fetching API.stats:', API.stats);
        const response = await fetch(API.stats);
        console.log('[loadStats] Response received, status:', response.status);
        const data = await response.json();
        console.log('[loadStats] Data:', data);

        // Update total transactions
        document.getElementById('statTotal').textContent = data.total_tests || 0;

        // Update processed count
        document.getElementById('statSuccess').textContent = data.success_count || 0;

        // Update message type counts from tests_by_type
        const pacs008Count = data.tests_by_type?.['pacs.008']?.count || 0;
        const pacs002Count = data.tests_by_type?.['pacs.002']?.count || 0;

        document.getElementById('statPacs008').textContent = pacs008Count;
        document.getElementById('statPacs002').textContent = pacs002Count;

        // Update average amount (stored in avg_response_time_ms field)
        const avgAmount = data.avg_response_time_ms || 0;
        document.getElementById('statAvgTime').textContent = formatCurrency(avgAmount);
    } catch (e) {
        console.error('Failed to load stats', e);
    }
}

// Helper function to format currency
function formatCurrency(amount) {
    if (amount === 0) return '0 IDR';
    if (amount < 1000) return Math.round(amount) + ' IDR';
    if (amount < 1000000) return (amount / 1000).toFixed(1) + 'K IDR';
    return (amount / 1000000).toFixed(2) + 'M IDR';
}

// --- Batch Testing ---
async function runBatchTest() {
    const scenarios = [];

    if (document.getElementById('batch_quick_accc')?.checked) scenarios.push('quick_accc');
    if (document.getElementById('batch_quick_acsc')?.checked) scenarios.push('quick_acsc');
    if (document.getElementById('batch_quick_rjct')?.checked) scenarios.push('quick_rjct');
    if (document.getElementById('batch_rule_901')?.checked) scenarios.push('rule_901');
    if (document.getElementById('batch_rule_902')?.checked) scenarios.push('rule_902');
    if (document.getElementById('batch_rule_006')?.checked) scenarios.push('rule_006');
    if (document.getElementById('batch_rule_018')?.checked) scenarios.push('rule_018');

    if (scenarios.length === 0) {
        alert('Please select at least one scenario');
        return;
    }

    const resultsBox = document.getElementById('batchResults');
    resultsBox.style.display = 'block';
    resultsBox.querySelector('pre').textContent = '🚀 Running batch test... This may take a moment...';

    showLoading(true);

    try {
        const formData = new FormData();
        formData.append('scenarios', scenarios.join(','));

        const response = await fetch(API.batch, { method: 'POST', body: formData });
        const data = await response.json();

        resultsBox.querySelector('pre').textContent = JSON.stringify(data, null, 2);
        loadStats();
    } catch (e) {
        resultsBox.querySelector('pre').textContent = 'Error: ' + e.message;
    } finally {
        showLoading(false);
    }
}

// --- Auto-refresh Fraud Alerts (DISABLED) ---
// This was overwriting detailed alerts with basic ones from separate endpoint
// Keeping code for reference but not using it

let fraudAlertInterval = null;

function startFraudAlertPolling() {
    // DISABLED: This was causing detailed alerts to be replaced by basic ones
    // The issue is that API.fraudAlerts returns alerts without request_context
    // So the detailed explanation gets lost

    // Original code (disabled):
    // fraudAlertInterval = setInterval(async () => {
    //     try {
    //         const response = await fetch(API.fraudAlerts);
    //         const data = await response.json();
    //         if (data.fraud_alerts && data.fraud_alerts.length > 0) {
    //             updateFraudAlerts(data.fraud_alerts);
    //         }
    //     } catch (e) {
    //         // Silent fail
    //     }
    // }, 10000);
}

function stopFraudAlertPolling() {
    if (fraudAlertInterval) {
        clearInterval(fraudAlertInterval);
        fraudAlertInterval = null;
    }
}

// ============================================================================
// Rule 903: Geographic Risk Testing
// ============================================================================

// Store the last sent message_id for filtering results
let lastGeoTransactionMessageId = null;

// Rule 903: Send transaction with geo-location data
async function sendGeoTransaction() {
    const debtorName = document.getElementById('geoDebtorName').value;
    const debtorAccount = document.getElementById('geoDebtorAccount').value;
    const creditorName = document.getElementById('geoCreditorName').value;
    const creditorAccount = document.getElementById('geoCreditorAccount').value;
    const amount = document.getElementById('geoAmount').value;
    const city = document.getElementById('geoCity').value;
    const region = document.getElementById('geoRegion').value;
    const lat = document.getElementById('geoLat').value;
    const long = document.getElementById('geoLong').value;

    if (!debtorName || !debtorAccount || !creditorName || !creditorAccount || !amount || !city) {
        alert('Please fill in all required fields (including City)');
        return;
    }

    const resultBox = document.getElementById('geoTestResults');
    const resultPre = resultBox.querySelector('pre');
    
    // Show loading state
    resultBox.style.display = 'block';
    resultPre.textContent = '🌍 Sending transaction with geo-location data...\n⏳ Please wait...';

    const msgId = `PACS008-${Date.now()}`;
    const endToEndId = `E2E-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const expiryDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString();
    
    const payload = {
        "TxTp": "pacs.008.001.10",
        "FIToFICstmrCdtTrf": {
            "GrpHdr": {
                "MsgId": msgId,
                "CreDtTm": timestamp,
                "NbOfTxs": 1,
                "SttlmInf": {
                    "SttlmMtd": "CLRG"
                }
            },
            "CdtTrfTxInf": {
                "PmtId": {
                    "InstrId": "5ab4fc7355de4ef8a75b78b00a681ed2",
                    "EndToEndId": endToEndId
                },
                "IntrBkSttlmAmt": {
                    "Amt": {
                        "Amt": amount,
                        "Ccy": "IDR"
                    }
                },
                "InstdAmt": {
                    "Amt": {
                        "Amt": amount,
                        "Ccy": "IDR"
                    }
                },
                "XchgRate": 1.0,
                "ChrgBr": "DEBT",
                "ChrgsInf": {
                    "Amt": {
                        "Amt": 0.00,
                        "Ccy": "IDR"
                    },
                    "Agt": {
                        "FinInstnId": {
                            "ClrSysMmbId": {
                                "MmbId": "dfsp001"
                            }
                        }
                    }
                },
                "InitgPty": {
                    "Nm": debtorName,
                    "Id": {
                        "PrvtId": {
                            "DtAndPlcOfBirth": {
                                "BirthDt": "1968-02-01",
                                "CityOfBirth": "Unknown",
                                "CtryOfBirth": "ZZ"
                            },
                            "Othr": [{
                                "Id": debtorAccount,
                                "SchmeNm": {
                                    "Prtry": "MSISDN"
                                }
                            }]
                        }
                    },
                    "CtctDtls": {
                        "MobNb": debtorAccount
                    }
                },
                "Dbtr": {
                    "Nm": debtorName,
                    "Id": {
                        "PrvtId": {
                            "DtAndPlcOfBirth": {
                                "BirthDt": "1968-02-01",
                                "CityOfBirth": "Unknown",
                                "CtryOfBirth": "ZZ"
                            },
                            "Othr": [{
                                "Id": debtorAccount,
                                "SchmeNm": {
                                    "Prtry": "MSISDN"
                                }
                            }]
                        }
                    },
                    "CtctDtls": {
                        "MobNb": debtorAccount
                    }
                },
                "DbtrAcct": {
                    "Id": {
                        "Othr": [{
                            "Id": debtorAccount,
                            "SchmeNm": {
                                "Prtry": "MSISDN"
                            }
                        }]
                    },
                    "Nm": debtorName
                },
                "DbtrAgt": {
                    "FinInstnId": {
                        "ClrSysMmbId": {
                            "MmbId": "dfsp001"
                        }
                    }
                },
                "CdtrAgt": {
                    "FinInstnId": {
                        "ClrSysMmbId": {
                            "MmbId": "dfsp002"
                        }
                    }
                },
                "Cdtr": {
                    "Nm": creditorName,
                    "Id": {
                        "PrvtId": {
                            "DtAndPlcOfBirth": {
                                "BirthDt": "1935-05-08",
                                "CityOfBirth": "Unknown",
                                "CtryOfBirth": "ZZ"
                            },
                            "Othr": [{
                                "Id": creditorAccount,
                                "SchmeNm": {
                                    "Prtry": "MSISDN"
                                }
                            }]
                        }
                    },
                    "CtctDtls": {
                        "MobNb": creditorAccount
                    }
                },
                "CdtrAcct": {
                    "Id": {
                        "Othr": [{
                            "Id": creditorAccount,
                            "SchmeNm": {
                                "Prtry": "MSISDN"
                            }
                        }]
                    },
                    "Nm": creditorName
                },
                "Purp": {
                    "Cd": "MP2P"
                },
                "SplmtryData": {
                    "Envlp": {
                        "Doc": {
                            "Xprtn": expiryDate,
                            "InitgPty": {
                                "Glctn": {
                                    "Lat": lat || "-6.2088",
                                    "Long": long || "106.8456",
                                    "City": city,
                                    "Region": region || "",
                                    "Ctry": "ID"
                                }
                            }
                        }
                    }
                }
            },
            "RgltryRptg": {
                "Dtls": {
                    "Tp": "BALANCE_OF_PAYMENTS",
                    "Cd": "100"
                }
            },
            "RmtInf": {
                "Ustrd": "Payment Transaction"
            },
            "SplmtryData": {
                "Envlp": {
                    "Doc": {
                        "Xprtn": expiryDate,
                        "InitgPty": {
                            "InitrTp": "CONSUMER",
                            "Glctn": {
                                "Lat": lat || "-6.2088",
                                "Long": long || "106.8456"
                            }
                        }
                    }
                }
            }
        }
    };

    try {
        const response = await fetch('/api/test/send-transaction', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.status === 'success') {
            // Store the message_id for filtering results
            lastGeoTransactionMessageId = data.message_id;

            let output = '✅ Transaction sent successfully!\n\n';
            output += `📍 Location Details:\n`;
            output += `   City: ${city}\n`;
            output += `   Region: ${region || 'N/A'}\n`;
            output += `   Coordinates: ${lat || 'N/A'}, ${long || 'N/A'}\n\n`;
            output += `💰 Transaction Details:\n`;
            output += `   Amount: IDR ${parseInt(amount).toLocaleString('id-ID')}\n`;
            output += `   From: ${debtorName} (${debtorAccount})\n`;
            output += `   To: ${creditorName} (${creditorAccount})\n\n`;
            output += `📨 Message ID: ${data.message_id}\n`;
            output += `📡 Transaction Type: ${data.tx_type || 'pacs.008'}\n`;
            output += `⏱️  Response Time: ${data.tms_response?.response_time_ms?.toFixed(2) || 'N/A'} ms\n`;
            output += `🔢 Status Code: ${data.tms_response?.status_code || 'N/A'}\n\n`;
            output += `🔍 What happens next:\n`;
            output += `   1. Event Director receives transaction\n`;
            output += `   2. Rule 903 extracts geo-location from payload\n`;
            output += `   3. City/Region matched against risk zones\n`;
            output += `   4. Risk score assigned (.01=High, .02=Medium, .03=Low)\n`;
            output += `   5. Combined with other rules for final score\n\n`;
            output += `⏱️  Check Rule 903 processing:\n`;
            output += `   Click "Check Rule 903 Results" button above\n\n`;
            output += `🐛 Debug Info:\n`;
            output += `   TMS Response: ${JSON.stringify(data.tms_response, null, 2)}`;

            resultPre.textContent = output;
            resultPre.style.color = '#d4edda';
        } else {
            resultPre.textContent = '❌ Error: ' + (data.message || 'Unknown error') + '\n\n' + 
                'Debug: ' + JSON.stringify(data, null, 2);
            resultPre.style.color = '#f8d7da';
        }
    } catch (error) {
        resultPre.textContent = '❌ Network Error:\n' + error.message + '\n\n💡 Make sure the API is running:\n   cd tazama-api-client/tazama_api_client\n   python3 main.py';
        resultPre.style.color = '#f8d7da';
    }
}

// Check Rule 903 results from database
async function checkRule903Results() {
    const resultBox = document.getElementById('geoTestResults');
    const resultPre = resultBox.querySelector('pre');

    resultBox.style.display = 'block';
    resultPre.textContent = '🔍 Querying evaluation database for Rule 903 results...\n⏳ Please wait...';

    try {
        // Build URL with message_id filter if available
        let url = '/api/test/rule-903-results';
        if (lastGeoTransactionMessageId) {
            url += `?message_id=${encodeURIComponent(lastGeoTransactionMessageId)}`;
        } else {
            // Default to last 60 seconds if no specific message_id
            url += '?seconds=60';
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'success') {
            let output = `✅ Found ${data.count} Rule 903 result(s) in ${data.database}\n`;
            if (data.filter.message_id) {
                output += `🔍 Filtered by Message ID: ${data.filter.message_id}\n`;
            } else if (data.filter.seconds) {
                output += `🔍 Showing results from last ${data.filter.seconds} seconds\n`;
            }
            output += `\n`;

            data.results.forEach((result, idx) => {
                output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
                output += `Result ${idx + 1}:\n`;
                output += `  Message ID: ${result.message_id || 'N/A'}\n`;
                output += `  Transaction ID: ${result.transaction_id || 'N/A'}\n`;
                output += `  Rule ID: ${result.rule_id}\n`;
                output += `  Rule Result: ${result.rule_result ? '✅ TRUE' : '❌ FALSE'}\n`;
                output += `  Reason: ${result.reason || 'N/A'}\n`;
                output += `  Typology: ${result.typology_id || 'N/A'}\n`;
                output += `  Typology Score: ${result.typology_score || 'N/A'}\n`;
                output += `  Processed: ${result.created_at}\n\n`;
            });

            resultPre.textContent = output;
            resultPre.style.color = '#d4edda';
        } else if (data.status === 'no_results') {
            let output = `ℹ️ ${data.message}\n\n`;
            output += `💡 ${data.tip}\n\n`;
            output += `Database: ${data.database}\n`;
            output += `Table: ${data.table}`;
            if (data.filter.message_id) {
                output += `\n🔍 Filter: message_id = ${data.filter.message_id}`;
            }
            resultPre.textContent = output;
            resultPre.style.color = '#fff3cd';
        } else {
            resultPre.textContent = `❌ Error: ${data.message}\n\n${data.tip || ''}`;
            resultPre.style.color = '#f8d7da';
        }
    } catch (error) {
        resultPre.textContent = `❌ Error checking results:\n${error.message}`;
        resultPre.style.color = '#f8d7da';
    }
}

async function testGeoLocation(city, region, expectedRisk) {
    const resultBox = document.getElementById('geoTestResults');
    const resultPre = resultBox.querySelector('pre');
    
    // Show loading state
    resultBox.style.display = 'block';
    resultPre.textContent = `🌍 Testing Rule 903 with ${city}, ${region}...\n⏳ Sending transaction...`;
    
    try {
        // Generate coordinates based on city (approximate)
        const cityCoords = {
            'Jakarta': { lat: '-6.2088', long: '106.8456' },
            'Tangerang': { lat: '-6.1781', long: '106.6300' },
            'Surabaya': { lat: '-7.2575', long: '112.7521' },
            'Bandung': { lat: '-6.9175', long: '107.6191' },
            'Semarang': { lat: '-6.9667', long: '110.4167' },
            'Denpasar': { lat: '-8.6500', long: '115.2167' },
            'Yogyakarta': { lat: '-7.7956', long: '110.3695' },
            'Padang': { lat: '-0.9500', long: '100.3543' },
            'Manado': { lat: '1.4748', long: '124.8421' }
        };
        
        const coords = cityCoords[city] || { lat: '0.0000', long: '0.0000' };
        
        // Build payload with geo-location
        const payload = {
            TxTp: 'pain.001.001.11',
            TenantId: 'DEFAULT',
            CstmrCdtTrfInitn: {
                GrpHdr: {
                    MsgId: `GEO-TEST-${Date.now()}`,
                    CreDtTm: new Date().toISOString()
                },
                PmtInf: {
                    PmtInfId: `PMT-GEO-${Date.now()}`,
                    DbtrAcct: {
                        Id: {
                            IBAN: `TEST_${city.toUpperCase()}_001`
                        },
                        Nm: `Test Account ${city}`
                    },
                    CdtTrfTxInf: [{
                        Amt: {
                            InstdAmt: {
                                Amt: {
                                    Amt: '1000000',
                                    Ccy: 'IDR'
                                }
                            }
                        },
                        CdtrAcct: {
                            Id: {
                                IBAN: 'RECEIVER_ACC_001'
                            },
                            Nm: 'Test Receiver'
                        }
                    }]
                },
                SplmtryData: {
                    Envlp: {
                        Doc: {
                            InitgPty: {
                                InitrTp: 'CONSUMER',
                                Glctn: {
                                    Lat: coords.lat,
                                    Long: coords.long,
                                    City: city,
                                    Region: region,
                                    Country: 'ID'
                                }
                            }
                        }
                    }
                }
            }
        };
        
        // Send transaction
        const response = await fetch('/api/send-transaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Display results
        let output = `✅ Transaction sent successfully!\n\n`;
        output += `📍 Location Details:\n`;
        output += `   City: ${city}\n`;
        output += `   Region: ${region}\n`;
        output += `   Coordinates: ${coords.lat}, ${coords.long}\n`;
        output += `   Expected Risk: ${expectedRisk}\n\n`;
        output += `📨 Message ID: ${payload.CstmrCdtTrfInitn.GrpHdr.MsgId}\n`;
        output += `💰 Amount: IDR 1,000,000\n\n`;
        output += `🔍 What happens next:\n`;
        output += `   1. Transaction enters Tazama Event Director\n`;
        output += `   2. Rule 903 extracts geo-location data\n`;
        output += `   3. Risk level determined based on city/region\n`;
        output += `   4. Result combined with other rules (901, 902, 006, 018)\n`;
        output += `   5. Final fraud score calculated\n\n`;
        
        if (expectedRisk === 'HIGH') {
            output += `🔴 Expected: Rule 903 returns .01 (HIGH RISK)\n`;
            output += `   → Strict monitoring triggered\n`;
        } else if (expectedRisk === 'MEDIUM') {
            output += `🟡 Expected: Rule 903 returns .02 (MEDIUM RISK)\n`;
            output += `   → Warning level monitoring\n`;
        } else {
            output += `🟢 Expected: Rule 903 returns .03 (LOW RISK)\n`;
            output += `   → Normal monitoring\n`;
        }
        
        output += `\n⏱️  Check Rule 903 logs:\n`;
        output += `   docker logs tazama-rule-903 --tail 20\n\n`;
        output += `📊 Check final typology result:\n`;
        output += `   docker logs tazama-typology-processor --tail 30 | grep -A10 "999@1.0.0"`;
        
        resultPre.textContent = output;
        resultPre.style.color = '#d4edda';
        
    } catch (error) {
        resultPre.textContent = `❌ Error testing Rule 903:\n\n${error.message}\n\n`;
        resultPre.textContent += `💡 Make sure:\n`;
        resultPre.textContent += `   1. Rule 903 container is running: docker ps | grep rule-903\n`;
        resultPre.textContent += `   2. Database has Rule 903 config\n`;
        resultPre.textContent += `   3. Network map includes Rule 903\n`;
        resultPre.style.color = '#f8d7da';
    }
}

// Geographic Risk E2E Flow Test
async function runGeoRiskE2E() {
    const progressDiv = document.getElementById('geoE2EProgress');
    const summaryDiv = document.getElementById('geoE2ESummary');
    const resultsDiv = document.getElementById('geoTestResults');
    const summaryContent = document.getElementById('geoSummaryContent');
    const resultsPre = resultsDiv.querySelector('pre');

    // Get form values
    const account_id = document.getElementById('geoDebtorAccount').value || 'GEO_RISK_001';
    const high_risk_city = document.getElementById('geoCity').value || 'Jakarta';
    const transaction_count = 3;

    // Show progress
    progressDiv.style.display = 'block';
    summaryDiv.style.display = 'none';
    resultsDiv.style.display = 'none';

    // Reset all steps
    const steps = progressDiv.querySelectorAll('.geo-step');
    steps.forEach(step => {
        const icon = step.querySelector('.geo-icon');
        icon.textContent = '⏳';
    });

    try {
        // Call the GEOGRAPHIC RISK E2E endpoint
        const formData = new FormData();
        formData.append('account_id', account_id);
        formData.append('high_risk_city', high_risk_city);
        formData.append('transaction_count', transaction_count);

        const response = await fetch('/api/test/geographic-risk-simulation', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        // Debug logging
        console.log('Geographic Risk E2E Response:', data);
        console.log('Fraud Detected:', data.fraud_detected);
        console.log('Fraud Alerts Count:', data.fraud_alerts ? data.fraud_alerts.length : 0);

        // Update progress for each step
        if (data.steps && Array.isArray(data.steps)) {
            data.steps.forEach((step) => {
                const stepDiv = progressDiv.querySelector(`.geo-step[data-step="${step.step}"]`);
                if (stepDiv) {
                    const icon = stepDiv.querySelector('.geo-icon');
                    icon.textContent = step.icon || (step.success ? '✅' : '❌');
                }
            });
        }

        // Show summary if fraud detected
        if (data.fraud_detected && data.fraud_alerts && data.fraud_alerts.length > 0) {
            summaryDiv.style.display = 'block';
            let summaryHTML = `<strong>🎯 Rule 903 Triggered!</strong><br><br>`;
            summaryHTML += `<strong>High Risk Location:</strong> ${data.summary.high_risk_city}<br>`;
            summaryHTML += `<strong>Coordinates:</strong> ${data.summary.coordinates}<br>`;
            summaryHTML += `<strong>Transactions Sent:</strong> ${data.summary.transactions_sent}<br>`;
            summaryHTML += `<strong>HIGH RISK Detected:</strong> ${data.summary.high_risk_detected} alerts<br><br>`;

            summaryHTML += `<strong>📊 Fraud Alerts:</strong><br>`;
            data.fraud_alerts.forEach((alert, idx) => {
                summaryHTML += `&nbsp;&nbsp;${idx + 1}. Rule ${alert.rule_id} - ${alert.risk_level} (Weight: ${alert.weight})<br>`;
            });

            summaryHTML += `<br><strong>🔴 Risk Zones:</strong><br>`;
            summaryHTML += `&nbsp;&nbsp;HIGH: ${data.summary.risk_zones.HIGH.join(', ')}<br>`;
            summaryHTML += `&nbsp;&nbsp;MEDIUM: ${data.summary.risk_zones.MEDIUM.join(', ')}<br>`;
            summaryHTML += `&nbsp;&nbsp;LOW: ${data.summary.risk_zones.LOW.join(', ')}`;

            summaryContent.innerHTML = summaryHTML;
        } else {
            // Show why fraud wasn't detected
            summaryDiv.style.display = 'block';
            let debugHTML = `<strong>ℹ️ No High Risk Alerts Detected</strong><br><br>`;
            debugHTML += `<strong>Fraud Detected:</strong> ${data.fraud_detected}<br>`;
            debugHTML += `<strong>Alerts Count:</strong> ${data.fraud_alerts ? data.fraud_alerts.length : 0}<br>`;

            if (data.fraud_alerts && data.fraud_alerts.length > 0) {
                debugHTML += `<br><strong>Alerts Found:</strong><br>`;
                data.fraud_alerts.forEach((alert, idx) => {
                    debugHTML += `&nbsp;&nbsp;${idx + 1}. ${JSON.stringify(alert)}<br>`;
                });
            } else {
                debugHTML += `<br><strong>Possible Reasons:</strong><br>`;
                debugHTML += `&nbsp;&nbsp;• Rule 903 might not have processed transactions yet (wait 3-5 seconds)<br>`;
                debugHTML += `&nbsp;&nbsp;• Transactions might be detected as MEDIUM or LOW risk<br>`;
                debugHTML += `&nbsp;&nbsp;• Check database query returned no .01 (HIGH RISK) results<br>`;
                debugHTML += `&nbsp;&nbsp;• Check browser console for detailed response<br>`;
            }

            summaryContent.innerHTML = debugHTML;
        }

        // Show full response
        resultsDiv.style.display = 'block';
        resultsPre.textContent = JSON.stringify(data, null, 2);
        resultsPre.style.color = '#10b981';

    } catch (error) {
        console.error('Geographic E2E Test Error:', error);
        resultsDiv.style.display = 'block';
        resultsPre.textContent = `❌ Error running Geographic Risk E2E:\n\n${error.message}`;
        resultsPre.style.color = '#ef4444';
    }
}

