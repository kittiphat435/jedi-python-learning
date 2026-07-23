/**
 * iot-sim-engine.js
 * ================
 * ESP32 MicroPython simulation engine สำหรับตรวจโจทย์ IoT (ฟรี 100% ไม่พึ่ง Wokwi CI)
 *
 * หลักการ: รันโค้ด MicroPython ของนักเรียนใน Pyodide โดย mock โมดูล
 *   - machine (Pin, PWM, ADC)
 *   - dht (DHT22, DHT11)
 *   - umqtt.simple (MQTTClient)
 *   - time (virtual clock — sleep ไม่รอจริง ทำให้ while True รันจบได้)
 * ทุก action ถูกบันทึกเป็น event log พร้อม virtual timestamp
 * แล้วเอา event log ไปตรวจกับ test case (ไฟกระพริบ, อ่าน DHT22, MQTT publish ฯลฯ)
 *
 * การใช้งาน (browser):
 *   await IotSim.init(pyodideInstance);                       // ครั้งเดียว
 *   const r = await IotSim.run(pyodideInstance, code, cfg);   // r.events, r.error, r.virtualMs
 *   const results = await IotSim.runTestCases(pyodideInstance, code, testCases);
 */

/* =========================================================================
 * PYTHON MOCK CODE (ฉีดเข้า Pyodide — pattern เดียวกับ MOCK_TKINTER/MOCK_MQTT
 * ใน student-iot-gui.js)
 * ========================================================================= */
const IOT_SIM_PY = `
import sys, json, types
import time as _pytime

class SimTimeLimit(Exception):
    """หมดเวลาจำลอง (ไม่ใช่ error ของนักเรียน) — ใช้หยุด while True"""
    pass

class _IotSim:
    def __init__(self):
        self.vclock_ms = 0.0
        self.events = []
        self.ops = 0
        self.config = {}
        self.max_virtual_ms = 15000
        self.max_ops = 50000
        self._orig = {}

    def begin(self, cfg_json):
        try:
            self.config = json.loads(cfg_json) if cfg_json else {}
        except Exception:
            self.config = {}
        self.max_virtual_ms = self.config.get('maxVirtualMs', 15000)
        self.max_ops = self.config.get('maxOps', 50000)
        self.vclock_ms = 0.0
        self.events = []
        self.ops = 0

    def op(self):
        self.ops += 1
        if self.ops > self.max_ops:
            raise SimTimeLimit('op-limit')

    def log(self, ev):
        ev['t'] = round(self.vclock_ms, 3)
        self.events.append(ev)
        self.op()

    def advance(self, ms):
        if ms < 0:
            ms = 0
        self.vclock_ms += ms
        self.op()
        if self.vclock_ms > self.max_virtual_ms:
            raise SimTimeLimit('time-limit')

    def results_json(self):
        return json.dumps({
            'events': self.events,
            'virtualMs': round(self.vclock_ms, 3),
            'ops': self.ops,
        })

_iotsim = _IotSim()

def _s(v):
    if isinstance(v, (bytes, bytearray)):
        try:
            return v.decode('utf-8')
        except Exception:
            return str(v)
    return str(v)

# ---------------------------------------------------------------- machine --
_machine = types.ModuleType('machine')

class Pin:
    IN = 1
    OUT = 3
    OPEN_DRAIN = 7
    PULL_UP = 2
    PULL_DOWN = 1
    IRQ_RISING = 1
    IRQ_FALLING = 2

    def __init__(self, pin_id, mode=-1, pull=None, value=None):
        self.id = pin_id
        self.mode = mode
        self._value = 0
        pins_cfg = _iotsim.config.get('pins', {})
        if str(pin_id) in pins_cfg:
            self._value = int(pins_cfg[str(pin_id)])
        if value is not None:
            self._value = int(bool(value))
        _iotsim.log({'type': 'pin-init', 'pin': pin_id,
                     'mode': 'out' if mode == self.OUT else 'in'})

    def _read(self):
        # pinTimeline: {"4": [[0,1],[3000,0]]} = ขา 4 เป็น 1 ตั้งแต่ 0ms, เป็น 0 ตั้งแต่ 3000ms
        tl = _iotsim.config.get('pinTimeline', {}).get(str(self.id))
        if tl:
            val = self._value
            for t, v in tl:
                if _iotsim.vclock_ms >= t:
                    val = int(v)
            return val
        return self._value

    def value(self, v=None):
        _iotsim.op()
        if v is None:
            return self._read()
        self._value = int(bool(v))
        _iotsim.log({'type': 'pin', 'pin': self.id, 'value': self._value})

    def on(self):
        self.value(1)

    def off(self):
        self.value(0)

    def irq(self, handler=None, trigger=None):
        pass  # v1: ยังไม่จำลอง interrupt

class PWM:
    def __init__(self, pin, freq=5000, duty=None, duty_u16=None):
        self.pin = getattr(pin, 'id', pin)
        self._freq = freq
        self._duty = 0
        _iotsim.log({'type': 'pwm-init', 'pin': self.pin, 'freq': freq})
        if duty is not None:
            self.duty(duty)
        if duty_u16 is not None:
            self.duty_u16(duty_u16)

    def freq(self, f=None):
        _iotsim.op()
        if f is None:
            return self._freq
        self._freq = f
        _iotsim.log({'type': 'pwm-freq', 'pin': self.pin, 'freq': f})

    def duty(self, d=None):
        _iotsim.op()
        if d is None:
            return self._duty
        self._duty = d
        _iotsim.log({'type': 'pwm-duty', 'pin': self.pin, 'duty': d, 'max': 1023})

    def duty_u16(self, d=None):
        _iotsim.op()
        if d is None:
            return self._duty
        self._duty = d
        _iotsim.log({'type': 'pwm-duty', 'pin': self.pin, 'duty': d, 'max': 65535})

    def deinit(self):
        pass

class ADC:
    ATTN_0DB = 0
    ATTN_11DB = 3
    WIDTH_12BIT = 3

    def __init__(self, pin):
        self.pin = getattr(pin, 'id', pin)
        _iotsim.log({'type': 'adc-init', 'pin': self.pin})

    def atten(self, a):
        _iotsim.op()

    def width(self, w):
        _iotsim.op()

    def _cfg_val(self, default):
        adc = _iotsim.config.get('adc', {})
        return adc.get(str(self.pin), default)

    def read(self):
        _iotsim.log({'type': 'adc-read', 'pin': self.pin})
        return int(self._cfg_val(2048))

    def read_u16(self):
        _iotsim.log({'type': 'adc-read', 'pin': self.pin})
        return int(self._cfg_val(2048)) * 16

_machine.Pin = Pin
_machine.PWM = PWM
_machine.ADC = ADC
_machine.reset = lambda: None
_machine.freq = lambda *a: 240000000
_machine.unique_id = lambda: b'esp32-sim'
sys.modules['machine'] = _machine

# -------------------------------------------------------------------- dht --
_dht = types.ModuleType('dht')

class DHT22:
    def __init__(self, pin):
        self.pin = getattr(pin, 'id', pin)
        self._measured = False
        _iotsim.log({'type': 'dht-init', 'pin': self.pin, 'model': 'DHT22'})

    def measure(self):
        self._measured = True
        _iotsim.log({'type': 'dht-measure', 'pin': self.pin})

    def _cfg(self, key, default):
        # dhtTimeline: [[0, {"temp":25,"hum":60}], [5000, {"temp":30,"hum":55}]]
        tl = _iotsim.config.get('dhtTimeline')
        if tl:
            cur = {}
            for t, vals in tl:
                if _iotsim.vclock_ms >= t:
                    cur = vals
            if key in cur:
                return cur[key]
        return _iotsim.config.get('dht', {}).get(key, default)

    def temperature(self):
        _iotsim.op()
        if not self._measured:
            raise OSError('DHT: call measure() before temperature()')
        val = float(self._cfg('temp', 25.0))
        _iotsim.log({'type': 'dht-temp', 'pin': self.pin, 'value': val})
        return val

    def humidity(self):
        _iotsim.op()
        if not self._measured:
            raise OSError('DHT: call measure() before humidity()')
        val = float(self._cfg('hum', 60.0))
        _iotsim.log({'type': 'dht-hum', 'pin': self.pin, 'value': val})
        return val

class DHT11(DHT22):
    def __init__(self, pin):
        super().__init__(pin)
        self.pin = getattr(pin, 'id', pin)

_dht.DHT22 = DHT22
_dht.DHT11 = DHT11
sys.modules['dht'] = _dht

# ------------------------------------------------------------------ umqtt --
_umqtt_pkg = types.ModuleType('umqtt')
_umqtt_simple = types.ModuleType('umqtt.simple')

class MQTTClient:
    def __init__(self, client_id, server, port=0, user=None, password=None,
                 keepalive=0, ssl=None, ssl_params=None):
        self.client_id = _s(client_id)
        self.server = _s(server)
        self._cb = None
        self._incoming = []
        self._connected = False
        _iotsim.log({'type': 'mqtt-init', 'server': self.server})

    def set_callback(self, cb):
        self._cb = cb

    def connect(self, clean_session=True):
        self._connected = True
        # mqttIncoming: [{"atMs":1000, "topic":"esp32/led", "payload":"on"}]
        self._incoming = sorted(
            list(_iotsim.config.get('mqttIncoming', [])),
            key=lambda m: m.get('atMs', 0))
        _iotsim.log({'type': 'mqtt-connect', 'server': self.server})
        return 0

    def disconnect(self):
        self._connected = False
        _iotsim.log({'type': 'mqtt-disconnect'})

    def subscribe(self, topic, qos=0):
        if not self._connected:
            raise OSError('MQTT: not connected')
        _iotsim.log({'type': 'mqtt-subscribe', 'topic': _s(topic)})

    def publish(self, topic, msg, retain=False, qos=0):
        if not self._connected:
            raise OSError('MQTT: not connected')
        _iotsim.log({'type': 'mqtt-publish', 'topic': _s(topic),
                     'payload': _s(msg)})

    def _deliver_due(self):
        due = [m for m in self._incoming if m.get('atMs', 0) <= _iotsim.vclock_ms]
        self._incoming = [m for m in self._incoming
                          if m.get('atMs', 0) > _iotsim.vclock_ms]
        for m in due:
            _iotsim.log({'type': 'mqtt-receive', 'topic': m.get('topic', ''),
                         'payload': m.get('payload', '')})
            if self._cb:
                self._cb(m.get('topic', '').encode('utf-8'),
                         str(m.get('payload', '')).encode('utf-8'))
        return len(due)

    def check_msg(self):
        _iotsim.op()
        self._deliver_due()

    def wait_msg(self):
        # ข้ามเวลาไปยัง message ถัดไป (ถ้าไม่มีแล้ว = จบการจำลอง)
        if self._deliver_due():
            return
        if self._incoming:
            nxt = self._incoming[0].get('atMs', 0)
            _iotsim.advance(max(0, nxt - _iotsim.vclock_ms))
            self._deliver_due()
        else:
            raise SimTimeLimit('mqtt-no-more-messages')

_umqtt_simple.MQTTClient = MQTTClient
_umqtt_pkg.simple = _umqtt_simple
sys.modules['umqtt'] = _umqtt_pkg
sys.modules['umqtt.simple'] = _umqtt_simple
sys.modules['umqtt.robust'] = _umqtt_simple

# ----------------------------------------------------- time (virtual clock) --
def _vsleep(s):
    _iotsim.advance(float(s) * 1000.0)

def _vsleep_ms(ms):
    _iotsim.advance(float(ms))

def _vsleep_us(us):
    _iotsim.advance(float(us) / 1000.0)

def _vticks_ms():
    _iotsim.op()
    return int(_iotsim.vclock_ms)

def _vticks_us():
    _iotsim.op()
    return int(_iotsim.vclock_ms * 1000)

def _vticks_diff(a, b):
    return a - b

def _vtime():
    return _iotsim.vclock_ms / 1000.0

class _PrintCapture:
    def __init__(self, orig):
        self.orig = orig
        self.buf = ''

    def write(self, text):
        # print() เรียก write ทีละชิ้น — buffer ไว้จนครบบรรทัดแล้วค่อย log
        self.buf += text
        while '\\n' in self.buf:
            line, self.buf = self.buf.split('\\n', 1)
            if line:
                _iotsim.log({'type': 'print', 'text': line})
        return len(text)

    def flush(self):
        if self.buf:
            _iotsim.log({'type': 'print', 'text': self.buf})
            self.buf = ''

def _iotsim_begin(cfg_json):
    _iotsim.begin(cfg_json)
    tm = sys.modules['time']
    _iotsim._orig = {
        'sleep': getattr(tm, 'sleep', None),
        'time': getattr(tm, 'time', None),
        'stdout': sys.stdout,
    }
    tm.sleep = _vsleep
    tm.sleep_ms = _vsleep_ms
    tm.sleep_us = _vsleep_us
    tm.ticks_ms = _vticks_ms
    tm.ticks_us = _vticks_us
    tm.ticks_diff = _vticks_diff
    tm.time = _vtime
    sys.stdout = _PrintCapture(sys.stdout)

def _iotsim_end():
    try:
        if isinstance(sys.stdout, _PrintCapture):
            sys.stdout.flush()
    except Exception:
        pass
    tm = sys.modules['time']
    o = _iotsim._orig
    if o:
        if o.get('sleep'):
            tm.sleep = o['sleep']
        if o.get('time'):
            tm.time = o['time']
        for attr in ('sleep_ms', 'sleep_us', 'ticks_ms', 'ticks_us', 'ticks_diff'):
            if hasattr(tm, attr):
                try:
                    delattr(tm, attr)
                except Exception:
                    pass
        if o.get('stdout'):
            sys.stdout = o['stdout']
    _iotsim._orig = {}
    return _iotsim.results_json()

# ลบชื่อ class ออกจาก globals — บังคับให้นักเรียนต้อง import เอง
# (ไม่งั้นโค้ดที่ลืม "from machine import Pin" จะรันผ่านทั้งที่บนบอร์ดจริง error)
del Pin, PWM, ADC, DHT22, DHT11, MQTTClient
`;

/* =========================================================================
 * JS HARNESS
 * ========================================================================= */

async function iotSimInit(pyodide) {
    await pyodide.runPythonAsync(IOT_SIM_PY);
}

/**
 * รันโค้ดนักเรียน 1 รอบ
 * @param {object} config เช่น
 *   { pins: {"4": 1},                          // ค่าเริ่มต้นขา input (เช่น slide switch = ON)
 *     pinTimeline: {"4": [[0,1],[3000,0]]},    // ขา input เปลี่ยนค่าตามเวลา
 *     dht: {temp: 25.5, hum: 60},              // ค่าที่ DHT22 จะอ่านได้
 *     dhtTimeline: [[0,{temp:25,hum:60}],[5000,{temp:32,hum:50}]],
 *     adc: {"34": 2048},
 *     mqttIncoming: [{atMs:1000, topic:"esp32/led", payload:"on"}],
 *     maxVirtualMs: 15000, maxOps: 50000 }
 * @returns {events, virtualMs, ops, error}
 */
async function iotSimRun(pyodide, code, config) {
    pyodide.globals.set('_iot_cfg_json', JSON.stringify(config || {}));
    await pyodide.runPythonAsync('_iotsim_begin(_iot_cfg_json)');
    let error = null;
    try {
        await pyodide.runPythonAsync(code);
    } catch (e) {
        const msg = String(e && e.message ? e.message : e);
        // SimTimeLimit = จบการจำลองตามปกติ (หยุด while True) ไม่ใช่ error
        if (!msg.includes('SimTimeLimit')) {
            error = msg;
        }
    }
    let result = { events: [], virtualMs: 0, ops: 0 };
    try {
        const resJson = await pyodide.runPythonAsync('_iotsim_end()');
        result = JSON.parse(resJson);
    } catch (e) {
        if (!error) error = String(e);
    }
    return { ...result, error };
}

/* =========================================================================
 * CHECKERS — ตรวจ event log กับเงื่อนไข test case
 * ========================================================================= */

/** นับการสลับค่า (toggle) ของขา และตรวจคาบเวลา */
function checkBlink(events, p) {
    const pin = Number(p.pin);
    const pinEvents = events.filter(e => e.type === 'pin' && Number(e.pin) === pin);
    if (pinEvents.length === 0) {
        return { passed: false, detail: 'ไม่พบการสั่งงานขา GPIO' + pin + ' เลย' };
    }
    let toggles = 0;
    const toggleTimes = [];
    for (let i = 1; i < pinEvents.length; i++) {
        if (pinEvents[i].value !== pinEvents[i - 1].value) {
            toggles++;
            toggleTimes.push(pinEvents[i].t);
        }
    }
    const minToggles = p.minToggles || 4;
    if (toggles < minToggles) {
        return {
            passed: false,
            detail: `ขา GPIO${pin} สลับค่าเพียง ${toggles} ครั้ง (ต้องการอย่างน้อย ${minToggles} ครั้ง) — ไฟอาจไม่กระพริบ`
        };
    }
    if (p.periodMs) {
        const tol = p.toleranceMs != null ? p.toleranceMs : p.periodMs * 0.25;
        const intervals = [];
        for (let i = 1; i < toggleTimes.length; i++) {
            intervals.push(toggleTimes[i] - toggleTimes[i - 1]);
        }
        const bad = intervals.filter(iv => Math.abs(iv - p.periodMs) > tol);
        if (intervals.length > 0 && bad.length > intervals.length / 2) {
            const avg = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
            return {
                passed: false,
                detail: `จังหวะกระพริบเฉลี่ย ~${avg}ms ไม่ตรงกับที่กำหนด (${p.periodMs}ms ± ${tol}ms)`
            };
        }
    }
    return { passed: true, detail: `ขา GPIO${pin} กระพริบ ${toggles} ครั้ง ถูกต้อง` };
}

/** ตรวจว่าอ่านค่า DHT22/DHT11 สำเร็จ */
function checkDhtRead(events, p) {
    const measures = events.filter(e => e.type === 'dht-measure');
    const minReads = p.minReads || 1;
    if (measures.length < minReads) {
        return {
            passed: false,
            detail: measures.length === 0
                ? 'ไม่พบการเรียก measure() ของ DHT เลย'
                : `เรียก measure() เพียง ${measures.length} ครั้ง (ต้องการ ${minReads} ครั้ง)`
        };
    }
    if (p.requireTemp) {
        const temps = events.filter(e => e.type === 'dht-temp');
        if (temps.length === 0) {
            return { passed: false, detail: 'มีการ measure() แต่ไม่ได้อ่านค่า temperature()' };
        }
    }
    if (p.requireHum) {
        const hums = events.filter(e => e.type === 'dht-hum');
        if (hums.length === 0) {
            return { passed: false, detail: 'มีการ measure() แต่ไม่ได้อ่านค่า humidity()' };
        }
    }
    return { passed: true, detail: `อ่านค่า DHT สำเร็จ ${measures.length} ครั้ง` };
}

/** ตรวจ MQTT publish (topic / เนื้อหา payload) */
function checkMqttPublish(events, p) {
    let pubs = events.filter(e => e.type === 'mqtt-publish');
    if (pubs.length === 0) {
        return { passed: false, detail: 'ไม่พบการ publish ข้อความ MQTT เลย' };
    }
    if (p.topic) {
        pubs = pubs.filter(e => e.topic === p.topic);
        if (pubs.length === 0) {
            return { passed: false, detail: `ไม่พบการ publish ไปยัง topic "${p.topic}"` };
        }
    }
    if (p.payloadIncludes) {
        pubs = pubs.filter(e => String(e.payload).includes(p.payloadIncludes));
        if (pubs.length === 0) {
            return { passed: false, detail: `payload ที่ publish ไม่มีข้อความ "${p.payloadIncludes}"` };
        }
    }
    const minCount = p.minCount || 1;
    if (pubs.length < minCount) {
        return { passed: false, detail: `publish เพียง ${pubs.length} ครั้ง (ต้องการ ${minCount} ครั้ง)` };
    }
    return { passed: true, detail: `MQTT publish ถูกต้อง (${pubs.length} ครั้ง)` };
}

/** ตรวจค่าขา output ณ ช่วงเวลาหนึ่ง (เช่น switch ON แล้ว LED ต้องติด) */
function checkPinStateAt(events, p) {
    const pin = Number(p.pin);
    const atMs = p.atMs != null ? p.atMs : Infinity;
    let val = null;
    for (const e of events) {
        if (e.type === 'pin' && Number(e.pin) === pin && e.t <= atMs) {
            val = e.value;
        }
    }
    if (val === null) {
        return { passed: false, detail: `ไม่พบการสั่งงานขา GPIO${pin} ก่อนเวลา ${atMs}ms` };
    }
    if (val !== Number(p.expected)) {
        return {
            passed: false,
            detail: `ขา GPIO${pin} ณ เวลา ${atMs === Infinity ? 'สุดท้าย' : atMs + 'ms'} มีค่า ${val} (ต้องการ ${p.expected})`
        };
    }
    return { passed: true, detail: `ขา GPIO${pin} มีค่า ${val} ถูกต้อง` };
}

/** ตรวจข้อความจาก print() */
function checkPrint(events, p) {
    const text = events.filter(e => e.type === 'print').map(e => e.text).join('\n');
    if (p.includes) {
        const wanted = Array.isArray(p.includes) ? p.includes : [p.includes];
        for (const w of wanted) {
            if (!text.includes(w)) {
                return { passed: false, detail: `ไม่พบข้อความ "${w}" ใน output` };
            }
        }
    }
    return { passed: true, detail: 'ข้อความ output ถูกต้อง' };
}

const IOT_CHECKERS = {
    'blink': checkBlink,
    'dht-read': checkDhtRead,
    'mqtt-publish': checkMqttPublish,
    'pin-state': checkPinStateAt,
    'print': checkPrint,
};

/**
 * รัน test cases ทั้งชุด — โครงสร้าง test case:
 * { type: 'blink',                       // ชนิดตัวตรวจ (ดู IOT_CHECKERS)
 *   params: {pin: 2, minToggles: 4, periodMs: 1000},
 *   inputs: {pins: {...}, dht: {...}, mqttIncoming: [...]},  // config การจำลองของข้อนี้
 *   score: 2,
 *   explanation: 'LED GPIO2 ต้องกระพริบทุก 1 วินาที' }
 */
async function iotSimRunTestCases(pyodide, code, testCases) {
    const results = [];
    let totalScore = 0;
    let maxScore = 0;
    for (const tc of testCases) {
        const score = tc.score || 1;
        maxScore += score;
        const checker = IOT_CHECKERS[tc.type];
        if (!checker) {
            results.push({ ...tc, passed: false, earned: 0, detail: 'ไม่รู้จักชนิดตัวตรวจ: ' + tc.type });
            continue;
        }
        const sim = await iotSimRun(pyodide, code, tc.inputs || {});
        if (sim.error) {
            results.push({ ...tc, passed: false, earned: 0, detail: 'โค้ด error: ' + sim.error, events: sim.events });
            continue;
        }
        const check = checker(sim.events, tc.params || {});
        const earned = check.passed ? score : 0;
        totalScore += earned;
        results.push({ ...tc, passed: check.passed, earned, detail: check.detail, events: sim.events });
    }
    return { results, totalScore, maxScore, passed: totalScore >= maxScore };
}

/* =========================================================================
 * EXPORTS
 * ========================================================================= */
const IotSim = {
    init: iotSimInit,
    run: iotSimRun,
    runTestCases: iotSimRunTestCases,
    checkers: IOT_CHECKERS,
    PYTHON_MOCK: IOT_SIM_PY,
};

if (typeof window !== 'undefined') {
    window.IotSim = IotSim;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IotSim;
}
