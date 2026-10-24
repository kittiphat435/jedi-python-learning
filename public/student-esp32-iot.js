/**
 * student-esp32-iot.js — หน้านักเรียนโจทย์ ESP32+IoT (ต่อวงจรเอง)
 * ======================================================================
 * นักเรียนต่อวงจรบน canvas + เขียน MicroPython แล้วรันจำลอง
 * ⚡ จุดสำคัญ: การจำลอง "อ่านเลขขาจากสายที่ต่อจริง" — ต่อผิดขา โค้ดสั่งถูกก็ไม่ทำงาน
 * ภาพอุปกรณ์ (wokwi-elements / custom elements) ถูก animate จริง:
 * LED ติด/ดับ, servo หมุน, buzzer มีเสียง, DC Motor หมุนใบพัดจริงตามความเร็ว/ทิศทาง
 */

/* ---------------------------------------------------------------- setup --- */
const firebaseConfig = {
    apiKey: "AIzaSyDWiPuk0WP9z5_mjDe1FkqeVZ-vcYClyLs",
    authDomain: "python-learning-platform-596e1.firebaseapp.com",
    projectId: "python-learning-platform-596e1",
    storageBucket: "python-learning-platform-596e1.firebasestorage.app",
    messagingSenderId: "5262153531",
    appId: "1:5262153531:web:55f6246093e1780003491e"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let problemData = {};
let circuit = null;              // CircuitCanvas instance
let pyodideInstance = null;
let replayTimer = null;

const $ = id => document.getElementById(id);

function showErr(msg) {
    const el = $('errBanner');
    if (el) { el.style.display = 'block'; el.textContent = msg; }
}

function setStatus(msg) {
    const el = $('statusMsg');
    if (el) el.textContent = msg;
}

/* ------------------------------------------------------- wiring analysis --- */
/**
 * วิเคราะห์วงจร: รวม net ด้วย union-find (สายไฟ + breadboard + resistor = ตัวนำ)
 * แล้วหาว่าอุปกรณ์แต่ละตัวต่อกับ GPIO ไหนของ ESP32
 */
function analyzeCircuit(diagram) {
    const parent = {};
    const find = (k) => { while (parent[k] !== k) { parent[k] = parent[parent[k]]; k = parent[k]; } return k; };
    const union = (a, b) => {
        if (!(a in parent)) parent[a] = a;
        if (!(b in parent)) parent[b] = b;
        const ra = find(a), rb = find(b);
        if (ra !== rb) parent[rb] = ra;
    };
    const key = (part, pin) => part + ':' + pin;

    // 1. รวมสายไฟ
    (diagram.wires || []).forEach(w => union(key(w.from.part, w.from.pin), key(w.to.part, w.to.pin)));

    // 2. resistor นำไฟฟ้าระหว่างขาทั้งสองของมัน
    (diagram.parts || []).filter(p => p.type === 'wokwi-resistor')
        .forEach(r => union(key(r.id, '1'), key(r.id, '2')));

    // 3. Breadboard ครึ่ง (400 รู) — เชื่อมต่อภายในรางไฟและแนวแถวเสียบอุปกรณ์
    (diagram.parts || []).filter(p => p.type === 'circuit-breadboard-half')
        .forEach(bb => {
            for (let c = 1; c <= 30; c++) {
                ['b', 'c', 'd', 'e'].forEach(r => union(key(bb.id, `${c}.a`), key(bb.id, `${c}.${r}`)));
                ['g', 'h', 'i', 'j'].forEach(r => union(key(bb.id, `${c}.f`), key(bb.id, `${c}.${r}`)));
            }
            for (let c = 2; c <= 30; c++) {
                union(key(bb.id, 'tp.1'), key(bb.id, `tp.${c}`)); // รางไฟบนขั้วบวก (+)
                union(key(bb.id, 'tn.1'), key(bb.id, `tn.${c}`)); // รางไฟบนขั้วลบ (-)
                union(key(bb.id, 'bp.1'), key(bb.id, `bp.${c}`)); // รางไฟล่างขั้วบวก (+)
                union(key(bb.id, 'bn.1'), key(bb.id, `bn.${c}`)); // รางไฟล่างขั้วลบ (-)
            }
        });

    // 4. เชื่อมโยงอุปกรณ์ที่เสียบตรงลงบน Breadboard (Direct plug-in)
    (diagram.parts || []).forEach(p => {
        if (p.type === 'circuit-breadboard-half') return;
        if (p.pluggedPins) {
            Object.entries(p.pluggedPins).forEach(([pinName, plug]) => {
                union(key(p.id, pinName), key(plug.bbId, plug.hole));
            });
        }
    });

    const esp = (diagram.parts || []).find(p => p.type === 'wokwi-esp32-devkit-v1');
    const warnings = [];
    if (!esp) {
        warnings.push('ยังไม่มีบอร์ด ESP32 บน canvas — เพิ่มจากแถบอุปกรณ์ก่อน');
        return { devices: [], warnings, gpioMap: {} };
    }

    // net ของขา ESP32 แต่ละขา
    const espPinNet = {};      // netRoot -> {gpio? , isGnd, isPwr}
    Object.keys(parent).forEach(k => {
        const [pid, pin] = k.split(':');
        if (pid !== esp.id) return;
        const root = find(k);
        if (!espPinNet[root]) espPinNet[root] = {};
        const mGpio = pin.match(/^D(\d+)$/);
        if (mGpio) espPinNet[root].gpio = parseInt(mGpio[1], 10);
        if (/^GND/.test(pin)) espPinNet[root].isGnd = true;
        if (pin === '3V3' || pin === 'VIN') espPinNet[root].isPwr = true;
    });

    const netInfo = (part, pin) => {
        const k = key(part, pin);
        if (!(k in parent)) return {};
        return espPinNet[find(k)] || {};
    };

    // นิยามขาแต่ละอุปกรณ์
    const DEVICE_PINS = {
        'wokwi-led': { role: 'led', signal: ['A'], gnd: ['C'] },
        'wokwi-slide-switch': { role: 'switch', signal: ['2'], gnd: ['1', '3'] },
        'circuit-dht11': { role: 'dht', signal: ['DATA'], gnd: ['GND'], pwr: ['VCC'] },
        'wokwi-dht22': { role: 'dht', signal: ['SDA'], gnd: ['GND'], pwr: ['VCC'] },
        'wokwi-servo': { role: 'servo', signal: ['PWM'], gnd: ['GND'], pwr: ['V+'] },
        'wokwi-hc-sr04': { role: 'ultrasonic', signal: ['TRIG', 'ECHO'], gnd: ['GND'], pwr: ['VCC'] },
        'wokwi-buzzer': { role: 'buzzer', signal: ['1', '2'], gnd: ['1', '2'] },
        'circuit-motor-driver': { role: 'motor-driver', signal: ['IN1', 'IN2'], gnd: ['GND'], pwr: ['VCC'] },
        'circuit-dc-motor': { role: 'dc-motor', signal: ['+', '-'] }
    };
    const THAI_NAME = {
        led: 'LED',
        switch: 'Slide Switch',
        dht: 'DHT Sensor',
        servo: 'Servo',
        ultrasonic: 'Ultrasonic',
        buzzer: 'Buzzer',
        'motor-driver': 'Motor Driver (L9110S)',
        'dc-motor': 'DC Motor'
    };

    const devices = [];
    const gpioMap = {};   // gpio -> [device]

    // หาอุปกรณ์ motor driver และ dc motor เพื่อเชื่อมโยงกัน
    const drivers = (diagram.parts || []).filter(p => p.type === 'circuit-motor-driver');
    const motors = (diagram.parts || []).filter(p => p.type === 'circuit-dc-motor');

    (diagram.parts || []).forEach(p => {
        const def = DEVICE_PINS[p.type];
        if (!def) return;
        const dev = { partId: p.id, type: p.type, role: def.role, gpios: [], gndOk: false, pwrOk: !def.pwr };

        // หา GPIO จากขา signal
        def.signal.forEach(pin => {
            const info = netInfo(p.id, pin);
            if (typeof info.gpio === 'number' && !dev.gpios.includes(info.gpio)) {
                dev.gpios.push(info.gpio);
            }
        });
        (def.gnd || []).forEach(pin => { if (netInfo(p.id, pin).isGnd) dev.gndOk = true; });
        (def.pwr || []).forEach(pin => { if (netInfo(p.id, pin).isPwr) dev.pwrOk = true; });

        const name = THAI_NAME[def.role] || p.type;

        // เชื่อมโยงกรณี Motor Driver กับ DC Motor
        if (def.role === 'dc-motor') {
            const mPlusKey = key(p.id, '+');
            const mMinusKey = key(p.id, '-');
            const motorPlusRoot = (mPlusKey in parent) ? find(mPlusKey) : null;
            const motorMinusRoot = (mMinusKey in parent) ? find(mMinusKey) : null;

            let connectedDriver = null;
            for (const drv of drivers) {
                const k1 = key(drv.id, 'OUT1'), k2 = key(drv.id, 'OUT2');
                const out1Root = (k1 in parent) ? find(k1) : null;
                const out2Root = (k2 in parent) ? find(k2) : null;
                if (out1Root && out2Root && motorPlusRoot && motorMinusRoot) {
                    if ((motorPlusRoot === out1Root && motorMinusRoot === out2Root) ||
                        (motorPlusRoot === out2Root && motorMinusRoot === out1Root)) {
                        connectedDriver = drv;
                        break;
                    }
                }
            }

            if (connectedDriver) {
                dev.driverPartId = connectedDriver.id;
                const in1Gpio = netInfo(connectedDriver.id, 'IN1').gpio;
                const in2Gpio = netInfo(connectedDriver.id, 'IN2').gpio;
                if (typeof in1Gpio === 'number') dev.gpios.push(in1Gpio);
                if (typeof in2Gpio === 'number' && !dev.gpios.includes(in2Gpio)) dev.gpios.push(in2Gpio);
                dev.gndOk = true;
                dev.pwrOk = true;
            } else if (dev.gpios.length > 0) {
                // มอเตอร์ต่อตรงกับ GPIO
                dev.gndOk = (netInfo(p.id, '+').isGnd || netInfo(p.id, '-').isGnd);
                dev.pwrOk = true;
            }
        }

        if (def.role === 'motor-driver') {
            const k1 = key(p.id, 'OUT1'), k2 = key(p.id, 'OUT2');
            const out1Root = (k1 in parent) ? find(k1) : null;
            const out2Root = (k2 in parent) ? find(k2) : null;
            for (const m of motors) {
                const mp = key(m.id, '+'), mm = key(m.id, '-');
                const mPlus = (mp in parent) ? find(mp) : null;
                const mMinus = (mm in parent) ? find(mm) : null;
                if (out1Root && out2Root && mPlus && mMinus) {
                    if ((mPlus === out1Root && mMinus === out2Root) || (mPlus === out2Root && mMinus === out1Root)) {
                        dev.targetMotorId = m.id;
                        break;
                    }
                }
            }
        }

        if (dev.gpios.length === 0 && def.role !== 'dc-motor') {
            warnings.push(name + ' ยังไม่ได้เดินสายจากขาสัญญาณไปยังขา GPIO (D..) ของ ESP32');
        } else if (def.role === 'dc-motor' && dev.gpios.length === 0) {
            warnings.push('DC Motor ยังไม่ได้ต่อกับ Driver Motor (OUT1/OUT2) หรือ GPIO');
        } else {
            if (!dev.gndOk && def.role !== 'switch' && def.role !== 'dc-motor') {
                warnings.push(name + ' (GPIO' + dev.gpios[0] + ') ยังไม่มีเส้นทางลง GND — วงจรจริงจะไม่ครบวงจร');
            }
            if (!dev.pwrOk) {
                warnings.push(name + ' (GPIO' + dev.gpios[0] + ') ยังไม่ได้ต่อไฟเลี้ยง (3V3/VIN)');
            }
            dev.gpios.forEach(g => {
                if (!gpioMap[g]) gpioMap[g] = [];
                gpioMap[g].push(dev);
            });
        }
        devices.push(dev);
    });

    return { devices, warnings, gpioMap, espId: esp.id };
}

function renderWarnings(analysis, extraWarnings) {
    const box = $('wireWarnings');
    if (!box) return;
    const warns = [...analysis.warnings, ...(extraWarnings || [])];
    const connected = analysis.devices.filter(d => d.gpios.length > 0);
    let html = '';

    // แสดงอุปกรณ์ที่เสียบตรงลง Breadboard
    const diagram = (circuit && circuit.toJSON ? circuit.toJSON() : { parts: [] });
    (diagram.parts || []).forEach(p => {
        if (p.type === 'circuit-breadboard-half') return;
        const plugs = p.pluggedPins ? Object.entries(p.pluggedPins) : [];
        if (plugs.length > 0) {
            const name = p.type.replace('wokwi-', '').replace('circuit-', '');
            const detail = plugs.map(([pName, pl]) => `ขา ${pName} เสียบที่รู ${pl.hole}`).join(', ');
            html += '<div class="ok-item" style="border-left-color:#27ae60; background:#eafaf1;">🔌 ' + name + ' เสียบตรงบน Breadboard (' + detail + ')</div>';
        }
    });

    connected.forEach(d => {
        const name = d.type.replace('wokwi-', '').replace('circuit-', '');
        html += '<div class="ok-item">✅ ' + name + ' ต่อที่ GPIO' + d.gpios.join(', GPIO') + '</div>';
    });
    warns.forEach(w => {
        html += '<div class="warn-item">⚠️ ' + w + '</div>';
    });
    box.innerHTML = html;
}

/* ------------------------------------------------------------- run flow --- */
async function ensurePyodide() {
    if (pyodideInstance) return true;
    setStatus('⏳ กำลังโหลดตัวจำลอง Python...');
    try {
        if (typeof loadPyodide === 'undefined') {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js';
            document.head.appendChild(s);
            await new Promise((res, rej) => { s.onload = res; s.onerror = rej; });
        }
        pyodideInstance = await loadPyodide();
        await IotSim.init(pyodideInstance);
        setStatus('✅ พร้อมรันจำลอง');
        $('runBtn').disabled = false;
        return true;
    } catch (e) {
        setStatus('❌ โหลดตัวจำลองไม่สำเร็จ: ' + e.message);
        return false;
    }
}

function findComp(partId) {
    const p = circuit.parts.find(x => x.id === partId);
    return p ? p.comp : null;
}

function stopReplay() {
    if (replayTimer) { clearTimeout(replayTimer); replayTimer = null; }
    // ดับทุกอุปกรณ์
    circuit.parts.forEach(p => {
        try {
            if (p.type === 'wokwi-led') p.comp.value = false;
            if (p.type === 'wokwi-buzzer') p.comp.hasSignal = false;
            if (p.type === 'circuit-dc-motor') p.comp.speed = 0;
        } catch (e) {}
    });
}

function applySimEvent(e, gpioMap) {
    if (e.type === 'pin') {
        (gpioMap[Number(e.pin)] || []).forEach(dev => {
            const comp = findComp(dev.partId);
            try {
                if (dev.role === 'led' && dev.gndOk && comp) comp.value = (e.value === 1);
                if (dev.role === 'buzzer' && comp) comp.hasSignal = (e.value === 1);
                if (dev.role === 'motor-driver') {
                    const motorComp = findComp(dev.targetMotorId);
                    if (motorComp) {
                        if (!dev._state) dev._state = { in1: 0, in2: 0 };
                        const in1Gpio = dev.gpios[0];
                        const in2Gpio = dev.gpios[1];
                        if (Number(e.pin) === in1Gpio) dev._state.in1 = (e.value === 1 ? 1 : 0);
                        if (Number(e.pin) === in2Gpio) dev._state.in2 = (e.value === 1 ? 1 : 0);
                        motorComp.speed = dev._state.in1 - dev._state.in2;
                    }
                }
                if (dev.role === 'dc-motor' && !dev.driverPartId && comp) {
                    comp.speed = (e.value === 1 ? 1 : 0);
                }
            } catch (err) {}
        });
    } else if (e.type === 'pwm-duty') {
        (gpioMap[Number(e.pin)] || []).forEach(dev => {
            const comp = findComp(dev.partId);
            try {
                const ratio = Math.max(0, Math.min(1, e.duty / (e.max || 1023)));
                if (dev.role === 'servo' && comp) comp.angle = Math.round(ratio * 180);
                if (dev.role === 'led' && dev.gndOk && comp) comp.value = ratio > 0.05;
                if (dev.role === 'motor-driver') {
                    const motorComp = findComp(dev.targetMotorId);
                    if (motorComp) {
                        if (!dev._state) dev._state = { in1: 0, in2: 0 };
                        const in1Gpio = dev.gpios[0];
                        const in2Gpio = dev.gpios[1];
                        if (Number(e.pin) === in1Gpio) dev._state.in1 = ratio;
                        if (Number(e.pin) === in2Gpio) dev._state.in2 = ratio;
                        motorComp.speed = dev._state.in1 - dev._state.in2;
                    }
                }
                if (dev.role === 'dc-motor' && !dev.driverPartId && comp) {
                    comp.speed = ratio;
                }
            } catch (err) {}
        });
    } else if (e.type === 'print') {
        const serial = $('serial');
        serial.style.display = 'block';
        serial.textContent += e.text + '\n';
        serial.scrollTop = serial.scrollHeight;
    }
}

function replayEvents(events, gpioMap, speed) {
    speed = speed || 4;
    let i = 0;
    const start = performance.now();
    function step() {
        const now = (performance.now() - start) * speed;
        while (i < events.length && events[i].t <= now) {
            applySimEvent(events[i], gpioMap);
            i++;
        }
        if (i < events.length) {
            replayTimer = setTimeout(step, 30);
        } else {
            setStatus('✅ จำลองจบ');
        }
    }
    step();
}

async function runSimulation() {
    const code = $('codeArea').value;
    if (!code.trim()) { alert('กรุณาเขียนโค้ด MicroPython ก่อนรัน'); return; }
    if (!(await ensurePyodide())) return;

    stopReplay();
    const serial = $('serial');
    serial.textContent = '';
    serial.style.display = 'none';
    $('runBtn').disabled = true;
    setStatus('⚙️ กำลังจำลอง...');

    try {
        // 1) วิเคราะห์วงจรที่นักเรียนต่อจริง
        const diagram = circuit.toJSON();
        const analysis = analyzeCircuit(diagram);

        // 2) ตั้งค่าการจำลองตามวงจรจริง — อ่านสถานะ switch จากตัว element โดยตรง
        const pins = {};
        analysis.devices.filter(d => d.role === 'switch' && d.gpios.length)
            .forEach(d => {
                const comp = findComp(d.partId);
                pins[String(d.gpios[0])] = (comp && Number(comp.value)) ? 1 : 0;
            });
        const config = {
            pins,
            dht: problemData.iotDht || { temp: 25.0, hum: 60.0 },
            maxVirtualMs: 10000
        };

        // 3) รันโค้ดจริง
        const r = await IotSim.run(pyodideInstance, code, config);

        // 4) เทียบโค้ดกับวงจร → คำเตือน
        const extraWarns = [];
        const drivenGpios = new Set(
            r.events.filter(e => e.type === 'pin-init' && e.mode === 'out').map(e => Number(e.pin)));
        drivenGpios.forEach(g => {
            if (!analysis.gpioMap[g]) {
                extraWarns.push('โค้ดสั่งงาน GPIO' + g + ' แต่ไม่มีอุปกรณ์ต่ออยู่ที่ขานั้น');
            }
        });
        const dhtInits = r.events.filter(e => e.type === 'dht-init');
        const dhtDevs = analysis.devices.filter(d => d.role === 'dht' && d.gpios.length);
        dhtInits.forEach(ev => {
            if (!dhtDevs.some(d => d.gpios.includes(Number(ev.pin)))) {
                extraWarns.push('โค้ดอ่าน DHT ที่ GPIO' + ev.pin +
                    (dhtDevs.length ? ' แต่เซนเซอร์ DHT ต่ออยู่ที่ GPIO' + dhtDevs[0].gpios[0] : ' แต่ไม่มีเซนเซอร์ DHT ต่ออยู่'));
            }
        });
        renderWarnings(analysis, extraWarns);

        if (r.error) {
            setStatus('❌ โค้ดมีข้อผิดพลาด');
            serial.style.display = 'block';
            serial.textContent = '❌ ' + r.error;
        } else {
            setStatus('▶ กำลังแสดงผล (' + (r.virtualMs / 1000).toFixed(1) + 's เสมือน)...');
            let events = r.events;
            if (dhtInits.length && dhtDevs.length === 0) {
                events = events.filter(e => !e.type.startsWith('dht-') || e.type === 'dht-init');
            }
            replayEvents(events, analysis.gpioMap);
        }
    } catch (e) {
        setStatus('❌ ' + e.message);
    } finally {
        $('runBtn').disabled = false;
    }
}

/* ---------------------------------------------------- slide switch click --- */
function bindSwitchToggles() {
    $('circuitCanvas').addEventListener('input', (e) => {
        const el = e.target;
        if (el && el.tagName && el.tagName.toLowerCase() === 'wokwi-slide-switch') {
            setStatus('🔀 Switch = ' + (Number(el.value) ? 'ON (1)' : 'OFF (0)') + ' — กดรันจำลองใหม่เพื่อเห็นผล');
        }
    }, true);
}

/* ------------------------------------------------------------ code editor --- */
function setupCodeEditor() {
    const ta = $('codeArea');
    const MONO = "Consolas, 'Courier New', monospace";
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex; height:380px; border:1px solid #444; border-radius:6px; overflow:hidden; background:#2d2d2d;';
    const nums = document.createElement('div');
    nums.style.cssText = 'width:44px; padding:10px 8px 10px 0; text-align:right; color:#858585; background:#1e1e1e; font-family:' + MONO + '; font-size:13px; line-height:1.5; overflow:hidden; user-select:none; white-space:pre; flex-shrink:0;';
    nums.textContent = '1';
    const inner = document.createElement('div');
    inner.style.cssText = 'position:relative; flex:1; min-width:0;';
    const pre = document.createElement('pre');
    pre.setAttribute('aria-hidden', 'true');
    pre.style.cssText = 'position:absolute; top:0; left:0; right:0; bottom:0; margin:0; padding:10px; overflow:hidden; pointer-events:none; background:transparent; font-family:' + MONO + '; font-size:13px; line-height:1.5;';
    const codeEl = document.createElement('code');
    codeEl.className = 'language-python';
    codeEl.style.cssText = 'font-family:inherit; font-size:inherit; line-height:inherit; background:transparent; white-space:pre; display:block; padding:0; margin:0;';
    pre.appendChild(codeEl);
    ta.parentNode.insertBefore(wrap, ta);
    inner.appendChild(pre);
    inner.appendChild(ta);
    wrap.appendChild(nums);
    wrap.appendChild(inner);
    ta.wrap = 'off';
    ta.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; padding:10px; margin:0; border:0; resize:none; outline:none; background:transparent; color:transparent; caret-color:#fff; font-family:' + MONO + '; font-size:13px; line-height:1.5; white-space:pre; overflow:auto; box-sizing:border-box;';
    const ph = document.createElement('style');
    ph.textContent = '#codeArea::placeholder { color:#6a737d; opacity:1; }';
    document.head.appendChild(ph);

    const sync = () => { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; nums.scrollTop = ta.scrollTop; };
    const render = () => {
        const code = ta.value;
        nums.textContent = Array.from({ length: Math.max(code.split('\n').length, 1) }, (_, i) => i + 1).join('\n');
        codeEl.textContent = code.endsWith('\n') ? code + ' ' : code;
        if (window.Prism && Prism.highlightElement) Prism.highlightElement(codeEl);
        sync();
    };
    ta.addEventListener('input', render);
    ta.addEventListener('scroll', sync);
    ta.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const s = ta.selectionStart, ep = ta.selectionEnd;
            ta.value = ta.value.slice(0, s) + '    ' + ta.value.slice(ep);
            ta.selectionStart = ta.selectionEnd = s + 4;
            render();
        }
    });
    ta.addEventListener('paste', () => requestAnimationFrame(render));
    render();
    return { render };
}

/* --------------------------------------------------------------- loading --- */
async function loadProblem(problemId) {
    const doc = await db.collection('problems').doc(problemId).get();
    if (!doc.exists) { showErr('ไม่พบโจทย์ที่ต้องการ'); return; }
    problemData = doc.data();
    if (problemData.type !== 'esp32_iot') {
        showErr('โจทย์นี้ไม่ใช่ประเภท ESP32+IoT');
        return;
    }
    $('problemTitle').textContent = problemData.title || 'ไม่มีชื่อโจทย์';
    $('problemDescription').innerHTML = (problemData.description || '').replace(/\n/g, '<br>');

    const maxScore = (problemData.iotTestCases || []).reduce((s, tc) => s + (tc.score || 1), 0);
    $('maxScore').textContent = maxScore;

    const ta = $('codeArea');
    if (problemData.iotStarterCode && !ta.value.trim()) {
        ta.value = problemData.iotStarterCode;
        ta.dispatchEvent(new Event('input'));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const problemId = params.get('id');
    const classId = params.get('classId');

    $('backBtn').addEventListener('click', () => {
        window.location.href = classId && classId !== 'admin'
            ? 'student-class-detail.html?id=' + classId
            : 'student-dashboard.html';
    });

    auth.onAuthStateChanged(async (user) => {
        if (!user) { window.location.href = 'index.html'; return; }
        if (!problemId) { showErr('ไม่พบรหัสโจทย์'); return; }

        circuit = new CircuitCanvas($('circuitCanvas'), {
            onChange: () => {
                try { renderWarnings(analyzeCircuit(circuit.toJSON()), []); } catch (e) {}
            }
        });
        try {
            await circuit.ready;
            buildCircuitPalette($('circuitPalette'), circuit);
        } catch (e) {
            showErr('โหลดภาพอุปกรณ์ไม่สำเร็จ (ตรวจสอบอินเทอร์เน็ต): ' + e.message);
        }
        bindSwitchToggles();
        setupCodeEditor();
        $('runBtn').addEventListener('click', runSimulation);

        await loadProblem(problemId);
        ensurePyodide();
    });
});
