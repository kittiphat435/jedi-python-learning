/* =========================================================================
 * 🔌 IoT SIM TEST CASES (สำหรับโจทย์ iot_gui — ตรวจจากการจำลอง ESP32)
 * เก็บลง problem doc เป็น: iotStarterCode, iotLedPin, iotSwitchPin, iotDht,
 * iotTestCases: [{type, params, inputs, score, explanation}]
 * ========================================================================= */

// นิยามชนิดตัวตรวจ + ฟิลด์พารามิเตอร์ของแต่ละชนิด (ต้องตรงกับ iot-sim-engine.js)
const IOT_SIM_TC_TYPES = {
    'blink': {
        label: '💡 ไฟกระพริบ (LED Blink)',
        fields: [
            { key: 'pin', label: 'ขา GPIO', type: 'number', def: 2 },
            { key: 'minToggles', label: 'สลับค่าขั้นต่ำ (ครั้ง)', type: 'number', def: 4 },
            { key: 'periodMs', label: 'คาบเวลา (ms, เว้นว่าง = ไม่ตรวจจังหวะ)', type: 'number', def: '' },
            { key: 'toleranceMs', label: 'ความคลาดเคลื่อน (ms)', type: 'number', def: '' },
        ]
    },
    'dht-read': {
        label: '🌡 อ่านค่า DHT22/DHT11',
        fields: [
            { key: 'minReads', label: 'จำนวนครั้งขั้นต่ำที่ต้อง measure()', type: 'number', def: 1 },
            { key: 'requireTemp', label: 'ต้องอ่าน temperature()', type: 'checkbox', def: true },
            { key: 'requireHum', label: 'ต้องอ่าน humidity()', type: 'checkbox', def: false },
        ]
    },
    'mqtt-publish': {
        label: '📡 MQTT Publish',
        fields: [
            { key: 'topic', label: 'Topic ที่ต้อง publish (เว้นว่าง = topic ใดก็ได้)', type: 'text', def: '' },
            { key: 'payloadIncludes', label: 'ข้อความที่ต้องมีใน payload', type: 'text', def: '' },
            { key: 'minCount', label: 'จำนวนครั้งขั้นต่ำ', type: 'number', def: 1 },
        ]
    },
    'pin-state': {
        label: '🔀 ค่าขา ณ เวลาที่กำหนด (เช่น สวิตช์ควบคุม LED)',
        fields: [
            { key: 'pin', label: 'ขา GPIO ที่ตรวจ', type: 'number', def: 2 },
            { key: 'expected', label: 'ค่าที่ต้องการ (0 หรือ 1)', type: 'number', def: 1 },
            { key: 'atMs', label: 'ณ เวลา (ms, เว้นว่าง = ค่าสุดท้าย)', type: 'number', def: '' },
        ]
    },
    'print': {
        label: '🖨 ข้อความจาก print()',
        fields: [
            { key: 'includes', label: 'ข้อความที่ต้องปรากฏ', type: 'text', def: '' },
        ]
    },
};

function renderIotSimParams(container, type, params) {
    const spec = IOT_SIM_TC_TYPES[type];
    if (!spec) { container.innerHTML = ''; return; }
    params = params || {};
    container.innerHTML = spec.fields.map(f => {
        const val = params[f.key] !== undefined ? params[f.key] : f.def;
        if (f.type === 'checkbox') {
            return `<label style="display:flex;align-items:center;gap:6px;font-size:0.88rem;margin:4px 0;">
                <input type="checkbox" class="iot-sim-param" data-key="${f.key}" ${val ? 'checked' : ''}> ${f.label}
            </label>`;
        }
        return `<label style="display:flex;align-items:center;gap:6px;font-size:0.88rem;margin:4px 0;">
            <span style="min-width:220px;">${f.label}</span>
            <input type="${f.type}" class="iot-sim-param input-field" data-key="${f.key}" value="${val}" style="width:140px;">
        </label>`;
    }).join('');
}

function addIotSimTestCase(data) {
    const list = document.getElementById('iotSimTestCasesList');
    if (!list) return;
    data = data || {};
    const div = document.createElement('div');
    div.className = 'test-case iot-sim-tc';
    const typeOptions = Object.entries(IOT_SIM_TC_TYPES).map(([k, v]) =>
        `<option value="${k}" ${data.type === k ? 'selected' : ''}>${v.label}</option>`).join('');
    div.innerHTML = `
        <div class="form-group">
            <label>ชนิดการตรวจ</label>
            <select class="iot-sim-type input-field">${typeOptions}</select>
        </div>
        <div class="iot-sim-params" style="padding:6px 10px;background:#f8f9fa;border-radius:6px;"></div>
        <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;align-items:center;">
            <label style="display:flex;align-items:center;gap:6px;font-size:0.88rem;">สถานะสวิตช์ตอนจำลอง
                <select class="iot-sim-swstate input-field" style="width:90px;">
                    <option value="0" ${!data.swState ? 'selected' : ''}>ปิด (0)</option>
                    <option value="1" ${data.swState == 1 ? 'selected' : ''}>เปิด (1)</option>
                </select>
            </label>
            <label style="display:flex;align-items:center;gap:6px;font-size:0.88rem;">คะแนน
                <input type="number" class="iot-sim-score input-field" value="${data.score || 1}" min="1" max="10" style="width:70px;">
            </label>
        </div>
        <div class="form-group" style="margin-top:8px;">
            <label>คำอธิบาย Test Case (นักเรียนเห็น)</label>
            <input type="text" class="iot-sim-explanation input-field" value="${data.explanation || ''}" placeholder="เช่น LED ที่ GPIO2 ต้องกระพริบทุก 1 วินาที">
        </div>
        <button type="button" class="delete-btn" onclick="this.closest('.iot-sim-tc').remove()">ลบ Test Case</button>
    `;
    list.appendChild(div);

    const typeSelect = div.querySelector('.iot-sim-type');
    const paramsBox = div.querySelector('.iot-sim-params');
    renderIotSimParams(paramsBox, typeSelect.value, data.params);
    typeSelect.addEventListener('change', () => renderIotSimParams(paramsBox, typeSelect.value, {}));
}

function collectIotSimTestCases() {
    const ledPin = parseInt(document.getElementById('iotLedPin')?.value) || 2;
    const swPin = parseInt(document.getElementById('iotSwitchPin')?.value) || 4;
    const dhtTemp = parseFloat(document.getElementById('iotDhtTemp')?.value);
    const dhtHum = parseFloat(document.getElementById('iotDhtHum')?.value);
    const dht = {
        temp: isNaN(dhtTemp) ? 25.0 : dhtTemp,
        hum: isNaN(dhtHum) ? 60.0 : dhtHum
    };
    return Array.from(document.querySelectorAll('#iotSimTestCasesList .iot-sim-tc')).map(div => {
        const type = div.querySelector('.iot-sim-type')?.value;
        if (!type || !IOT_SIM_TC_TYPES[type]) return null;
        const params = {};
        div.querySelectorAll('.iot-sim-param').forEach(inp => {
            const key = inp.dataset.key;
            if (inp.type === 'checkbox') {
                if (inp.checked) params[key] = true;
            } else if (inp.value !== '' && inp.value != null) {
                params[key] = inp.type === 'number' ? Number(inp.value) : inp.value;
            }
        });
        const swState = parseInt(div.querySelector('.iot-sim-swstate')?.value) || 0;
        return {
            type,
            params,
            inputs: {
                pins: { [String(swPin)]: swState },
                dht,
                maxVirtualMs: 10000
            },
            score: parseInt(div.querySelector('.iot-sim-score')?.value) || 1,
            explanation: div.querySelector('.iot-sim-explanation')?.value?.trim() || ''
        };
    }).filter(tc => tc);
}

function collectIotSimFields() {
    return {
        iotStarterCode: document.getElementById('iotStarterCode')?.value || '',
        iotLedPin: parseInt(document.getElementById('iotLedPin')?.value) || 2,
        iotSwitchPin: parseInt(document.getElementById('iotSwitchPin')?.value) || 4,
        iotDht: {
            temp: parseFloat(document.getElementById('iotDhtTemp')?.value) || 25.0,
            hum: parseFloat(document.getElementById('iotDhtHum')?.value) || 60.0
        },
        iotTestCases: collectIotSimTestCases()
    };
}

// เติมค่ากลับตอนกดแก้ไขโจทย์ (แก้ gap เดิมของ iot_gui ที่ไม่มี case ใน editProblem ด้วย)
function loadIotSimFields(problemData) {
    const wokwiEl = document.getElementById('iotWokwiId');
    if (wokwiEl) wokwiEl.value = problemData.iotWokwiId || '';
    const solEl = document.getElementById('iotSolution');
    if (solEl) solEl.value = problemData.iotSolution || '';
    const starterEl = document.getElementById('iotStarterCode');
    if (starterEl) starterEl.value = problemData.iotStarterCode || '';
    const ledEl = document.getElementById('iotLedPin');
    if (ledEl) ledEl.value = problemData.iotLedPin || 2;
    const swEl = document.getElementById('iotSwitchPin');
    if (swEl) swEl.value = problemData.iotSwitchPin || 4;
    const tempEl = document.getElementById('iotDhtTemp');
    if (tempEl) tempEl.value = (problemData.iotDht && problemData.iotDht.temp) || 25;
    const humEl = document.getElementById('iotDhtHum');
    if (humEl) humEl.value = (problemData.iotDht && problemData.iotDht.hum) || 60;
    const list = document.getElementById('iotSimTestCasesList');
    if (list) {
        list.innerHTML = '';
        (problemData.iotTestCases || []).forEach(tc => {
            addIotSimTestCase({
                type: tc.type,
                params: tc.params,
                swState: tc.inputs && tc.inputs.pins
                    ? (Object.values(tc.inputs.pins)[0] || 0) : 0,
                score: tc.score,
                explanation: tc.explanation
            });
        });
    }
}

window.addIotSimTestCase = addIotSimTestCase;
window.collectIotSimFields = collectIotSimFields;
window.loadIotSimFields = loadIotSimFields;

/* =========================================================================
 * 🎛️ ESP32+IoT (เฟส 1) — ฟอร์มสร้างโจทย์แบบต่อวงจรเอง (ใช้ circuit-canvas.js)
 * ใช้ร่วมกันทั้ง admin-add-ploblem และ teacher-dashboard
 * เก็บลง problem doc: type='esp32_iot', description, circuitDiagramJson (string),
 * + ฟิลด์การจำลองเดิม (iotStarterCode, iotTestCases, ...) จาก collectIotSimFields()
 * ========================================================================= */
let esp32IotCanvas = null;

async function initEsp32IotSection() {
    const canvasEl = document.getElementById('esp32IotCanvas');
    const paletteEl = document.getElementById('esp32IotPalette');
    if (!canvasEl || typeof CircuitCanvas === 'undefined') return;
    if (!esp32IotCanvas) {
        esp32IotCanvas = new CircuitCanvas(canvasEl);
        try {
            await esp32IotCanvas.ready;
            if (paletteEl) buildCircuitPalette(paletteEl, esp32IotCanvas);
        } catch (e) {
            canvasEl.innerHTML = '<p style="color:#c0392b; padding:10px;">โหลดภาพอุปกรณ์ไม่สำเร็จ (ต้องต่ออินเทอร์เน็ต): ' + e.message + '</p>';
        }
    }
}

function collectEsp32IotFields() {
    const description = document.getElementById('esp32IotDescription')?.value?.trim() || '';
    let circuitDiagramJson = '';
    if (esp32IotCanvas) {
        try { circuitDiagramJson = JSON.stringify(esp32IotCanvas.toJSON()); } catch (e) {}
    }
    return {
        description,
        circuitDiagramJson,
        ...collectIotSimFields()   // โค้ดตั้งต้น MicroPython + IoT Test Cases + ค่า DHT ฯลฯ
    };
}

async function loadEsp32IotFields(problemData) {
    const descEl = document.getElementById('esp32IotDescription');
    if (descEl) descEl.value = problemData.description || '';
    loadIotSimFields(problemData);
    await initEsp32IotSection();
    if (esp32IotCanvas && problemData.circuitDiagramJson) {
        try {
            await esp32IotCanvas.loadJSON(JSON.parse(problemData.circuitDiagramJson));
        } catch (e) {
            console.error('โหลดวงจรไม่สำเร็จ:', e);
        }
    } else if (esp32IotCanvas) {
        esp32IotCanvas.clear();
    }
}

window.initEsp32IotSection = initEsp32IotSection;
window.collectEsp32IotFields = collectEsp32IotFields;
window.loadEsp32IotFields = loadEsp32IotFields;
