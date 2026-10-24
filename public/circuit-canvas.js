/**
 * circuit-canvas.js — Lightweight 2D Circuit Editor with Wokwi-style Wire Bending
 * ==============================================================================
 * ใช้ @wokwi/elements (Custom Elements) สำหรับวาดอุปกรณ์
 * รองรับ:
 * - อุปกรณ์พื้นฐาน: ESP32, Breadboard (Half 400 pts), LED (แดง/เขียว), Resistor,
 *   DHT11, DHT22, Driver Motor (L9110S), DC Motor (มีใบพัดหมุน), Slide Switch, Servo, Ultrasonic, Buzzer
 * - การหมุนอุปกรณ์ 90° (ปุ่มลอย + คีย์บอร์ด R + เมนูบาร์)
 * - การลบอุปกรณ์ (ปุ่มลอย '🗑️ ลบอุปกรณ์' บนตัวชิ้นส่วน + เมนูบาร์ + คีย์บอร์ด Delete)
 * - เดินสายไฟแบบงอสาย (Wokwi-style):
 *   1) คลิกขาต้นทาง -> คลิกบนพื้นที่ว่างเพื่อเพิ่มมุมหัก/ดัดมุมได้หลายมุม -> คลิกขาปลายทาง
 *   2) สำหรับสายไฟที่มีอยู่แล้ว: คลิกที่เส้นสายไฟ จะมีจุดจับ (Handle) ให้ลากดัดมุมได้ทันที
 *   3) ดับเบิลคลิกที่จุดดัดเพื่อลบมุมนั้นออก
 *   4) มุมสายไฟถูกคำนวณโค้งมนแบบนุ่มนวล (Smooth Rounded Corners) สวยงามสมจริง
 */

// Keyframes สำหรับหมุนใบพัด DC Motor
if (typeof document !== 'undefined' && !document.getElementById('cc-motor-keyframes')) {
    const style = document.createElement('style');
    style.id = 'cc-motor-keyframes';
    style.textContent = `
        @keyframes cc-spin-cw {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        @keyframes cc-spin-ccw {
            from { transform: rotate(0deg); }
            to { transform: rotate(-360deg); }
        }
        .cc-part-toolbar button:hover {
            filter: brightness(1.15);
            transform: scale(1.05);
        }
        .cc-wire-handle:hover {
            transform: scale(1.3);
            filter: drop-shadow(0 0 3px rgba(255,255,255,0.8));
        }
    `;
    document.head.appendChild(style);
}

/* =========================================================================
 * Custom Components
 * ========================================================================= */

// 1. Breadboard Half (400 tie-points)
class CircuitBreadboardHalf extends HTMLElement {
    constructor() {
        super();
        this._rendered = false;
        this._pins = [];
        this._initPinInfo();
    }

    connectedCallback() {
        if (!this._rendered) {
            this._rendered = true;
            this._render();
        }
    }

    get pinInfo() { return this._pins; }

    _initPinInfo() {
        const cols = 30;
        const colStartX = 34;
        const colStepX = 14;

        const yTopP = 22;
        const yTopN = 36;
        const upperRows = ['a', 'b', 'c', 'd', 'e'];
        const yUpper = [58, 72, 86, 100, 114];
        const lowerRows = ['f', 'g', 'h', 'i', 'j'];
        const yLower = [142, 156, 170, 184, 198];
        const yBotP = 216;
        const yBotN = 230;

        for (let c = 1; c <= cols; c++) {
            const x = colStartX + (c - 1) * colStepX;
            this._pins.push({ name: `tp.${c}`, x, y: yTopP });
            this._pins.push({ name: `tn.${c}`, x, y: yTopN });
            this._pins.push({ name: `bp.${c}`, x, y: yBotP });
            this._pins.push({ name: `bn.${c}`, x, y: yBotN });

            for (let r = 0; r < 5; r++) {
                this._pins.push({ name: `${c}.${upperRows[r]}`, x, y: yUpper[r] });
                this._pins.push({ name: `${c}.${lowerRows[r]}`, x, y: yLower[r] });
            }
        }
    }

    _render() {
        this.style.display = 'inline-block';
        this.style.userSelect = 'none';

        const cols = 30;
        const colStartX = 34;
        const colStepX = 14;
        const width = 472;
        const height = 246;

        const yTopP = 22;
        const yTopN = 36;
        const upperRows = ['a', 'b', 'c', 'd', 'e'];
        const yUpper = [58, 72, 86, 100, 114];
        const lowerRows = ['f', 'g', 'h', 'i', 'j'];
        const yLower = [142, 156, 170, 184, 198];
        const yBotP = 216;
        const yBotN = 230;

        let holesSvg = '';
        const addHoleSvg = (x, y) => `
            <rect x="${x - 3.5}" y="${y - 3.5}" width="7" height="7" rx="1.2" fill="#1b1c1d" stroke="#c8c9cc" stroke-width="0.75"/>
            <circle cx="${x}" cy="${y}" r="1.3" fill="#444"/>
        `;

        for (let c = 1; c <= cols; c++) {
            const x = colStartX + (c - 1) * colStepX;
            holesSvg += addHoleSvg(x, yTopP);
            holesSvg += addHoleSvg(x, yTopN);
            holesSvg += addHoleSvg(x, yBotP);
            holesSvg += addHoleSvg(x, yBotN);

            for (let r = 0; r < 5; r++) {
                holesSvg += addHoleSvg(x, yUpper[r]);
                holesSvg += addHoleSvg(x, yLower[r]);
            }
        }

        let numbersSvg = '';
        for (let c = 1; c <= cols; c++) {
            if (c === 1 || c % 5 === 0) {
                const x = colStartX + (c - 1) * colStepX;
                numbersSvg += `<text x="${x}" y="50" font-size="8" font-family="Arial, sans-serif" fill="#777" text-anchor="middle">${c}</text>`;
                numbersSvg += `<text x="${x}" y="209" font-size="8" font-family="Arial, sans-serif" fill="#777" text-anchor="middle">${c}</text>`;
            }
        }

        let lettersSvg = '';
        upperRows.forEach((r, idx) => {
            const y = yUpper[idx] + 3;
            lettersSvg += `<text x="18" y="${y}" font-size="8" font-family="Arial, sans-serif" fill="#777" text-anchor="middle">${r}</text>`;
            lettersSvg += `<text x="454" y="${y}" font-size="8" font-family="Arial, sans-serif" fill="#777" text-anchor="middle">${r}</text>`;
        });
        lowerRows.forEach((r, idx) => {
            const y = yLower[idx] + 3;
            lettersSvg += `<text x="18" y="${y}" font-size="8" font-family="Arial, sans-serif" fill="#777" text-anchor="middle">${r}</text>`;
            lettersSvg += `<text x="454" y="${y}" font-size="8" font-family="Arial, sans-serif" fill="#777" text-anchor="middle">${r}</text>`;
        });

        this.innerHTML = `
            <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="display:block; filter:drop-shadow(0 3px 6px rgba(0,0,0,0.18));">
                <rect x="0" y="0" width="${width}" height="${height}" rx="10" fill="#f6f6f4" stroke="#d5d5d0" stroke-width="2"/>
                <rect x="4" y="4" width="${width - 8}" height="${height - 8}" rx="8" fill="#fafaf8"/>

                <line x1="28" y1="14" x2="${width - 28}" y2="14" stroke="#e74c3c" stroke-width="1.5" stroke-linecap="round"/>
                <text x="14" y="25" font-size="12" font-weight="bold" font-family="Arial" fill="#e74c3c" text-anchor="middle">+</text>
                <text x="${width - 14}" y="25" font-size="12" font-weight="bold" font-family="Arial" fill="#e74c3c" text-anchor="middle">+</text>

                <line x1="28" y1="44" x2="${width - 28}" y2="44" stroke="#2980b9" stroke-width="1.5" stroke-linecap="round"/>
                <text x="14" y="40" font-size="14" font-weight="bold" font-family="Arial" fill="#2980b9" text-anchor="middle">-</text>
                <text x="${width - 14}" y="40" font-size="14" font-weight="bold" font-family="Arial" fill="#2980b9" text-anchor="middle">-</text>

                <rect x="10" y="125" width="${width - 20}" height="7" rx="3" fill="#e2e2dc"/>
                <line x1="12" y1="128.5" x2="${width - 12}" y2="128.5" stroke="#ccc" stroke-width="1"/>

                <line x1="28" y1="209" x2="${width - 28}" y2="209" stroke="#e74c3c" stroke-width="1.5" stroke-linecap="round"/>
                <text x="14" y="219" font-size="12" font-weight="bold" font-family="Arial" fill="#e74c3c" text-anchor="middle">+</text>
                <text x="${width - 14}" y="219" font-size="12" font-weight="bold" font-family="Arial" fill="#e74c3c" text-anchor="middle">+</text>

                <line x1="28" y1="239" x2="${width - 28}" y2="239" stroke="#2980b9" stroke-width="1.5" stroke-linecap="round"/>
                <text x="14" y="235" font-size="14" font-weight="bold" font-family="Arial" fill="#2980b9" text-anchor="middle">-</text>
                <text x="${width - 14}" y="235" font-size="14" font-weight="bold" font-family="Arial" fill="#2980b9" text-anchor="middle">-</text>

                ${holesSvg}
                ${numbersSvg}
                ${lettersSvg}
            </svg>
        `;
    }
}

// 2. DC Motor with Propeller
class CircuitDcMotor extends HTMLElement {
    constructor() {
        super();
        this._speed = 0;
        this._rendered = false;
    }

    connectedCallback() {
        if (!this._rendered) {
            this._rendered = true;
            this._render();
        }
    }

    get pinInfo() {
        return [
            { name: '+', x: 12, y: 26 },
            { name: '-', x: 12, y: 64 }
        ];
    }

    get speed() { return this._speed; }
    set speed(val) {
        this._speed = val;
        const rotor = this.querySelector('.dc-rotor');
        if (!rotor) return;
        const num = Number(val);
        if (num > 0) {
            const dur = Math.max(0.08, 0.4 / Math.abs(num));
            rotor.style.animation = `cc-spin-cw ${dur.toFixed(3)}s linear infinite`;
        } else if (num < 0) {
            const dur = Math.max(0.08, 0.4 / Math.abs(num));
            rotor.style.animation = `cc-spin-ccw ${dur.toFixed(3)}s linear infinite`;
        } else {
            rotor.style.animation = 'none';
        }
    }

    _render() {
        this.style.display = 'inline-block';
        this.style.userSelect = 'none';
        const width = 125, height = 90;

        this.innerHTML = `
            <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="display:block; filter:drop-shadow(0 3px 5px rgba(0,0,0,0.25));">
                <!-- ขั้วต่อสายไฟ (+) สีแดง -->
                <rect x="4" y="21" width="16" height="10" rx="2" fill="#e74c3c" stroke="#c0392b" stroke-width="1.5"/>
                <circle cx="12" cy="26" r="3" fill="#ffffff"/>
                <text x="12" y="16" font-size="10" font-weight="bold" fill="#e74c3c" text-anchor="middle">+</text>

                <!-- ขั้วต่อสายไฟ (-) สีดำ -->
                <rect x="4" y="59" width="16" height="10" rx="2" fill="#2c3e50" stroke="#1a252f" stroke-width="1.5"/>
                <circle cx="12" cy="64" r="3" fill="#ffffff"/>
                <text x="12" y="80" font-size="12" font-weight="bold" fill="#2c3e50" text-anchor="middle">-</text>

                <!-- ตัวถังมอเตอร์ (ทรงกระบอกโลหะ) -->
                <rect x="20" y="15" width="56" height="60" rx="10" fill="#95a5a6" stroke="#7f8c8d" stroke-width="2"/>
                <rect x="24" y="19" width="48" height="52" rx="8" fill="#bdc3c7"/>
                <line x1="28" y1="30" x2="68" y2="30" stroke="#ecf0f1" stroke-width="1.5"/>
                <text x="48" y="46" font-size="8.5" font-family="Arial, sans-serif" font-weight="bold" fill="#2c3e50" text-anchor="middle">DC MOTOR</text>
                <text x="48" y="58" font-size="7.5" font-family="Arial, sans-serif" fill="#7f8c8d" text-anchor="middle">3-6V</text>

                <!-- เพลาขับ (Shaft) -->
                <rect x="76" y="41" width="14" height="8" fill="#7f8c8d" stroke="#5d6d7e"/>

                <!-- ใบพัด / Rotor (หมุนได้) -->
                <g class="dc-rotor" style="transform-origin: 98px 45px;">
                    <circle cx="98" cy="45" r="7" fill="#d35400"/>
                    <path d="M 98 45 Q 86 20 98 14 Q 110 20 98 45" fill="#e67e22" stroke="#d35400" stroke-width="0.8"/>
                    <path d="M 98 45 Q 123 39 125 54 Q 112 65 98 45" fill="#e67e22" stroke="#d35400" stroke-width="0.8"/>
                    <path d="M 98 45 Q 81 67 73 54 Q 77 40 98 45" fill="#e67e22" stroke="#d35400" stroke-width="0.8"/>
                    <circle cx="98" cy="45" r="3" fill="#2c3e50"/>
                </g>
            </svg>
        `;
    }
}

// 3. Motor Driver Module (L9110S)
class CircuitMotorDriver extends HTMLElement {
    constructor() {
        super();
        this._rendered = false;
    }

    connectedCallback() {
        if (!this._rendered) {
            this._rendered = true;
            this._render();
        }
    }

    get pinInfo() {
        return [
            { name: 'VCC', x: 14, y: 18 },
            { name: 'GND', x: 14, y: 36 },
            { name: 'IN1', x: 14, y: 54 },
            { name: 'IN2', x: 14, y: 72 },
            { name: 'OUT1', x: 114, y: 34 },
            { name: 'OUT2', x: 114, y: 56 }
        ];
    }

    _render() {
        this.style.display = 'inline-block';
        this.style.userSelect = 'none';
        const width = 130, height = 95;

        this.innerHTML = `
            <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="display:block; filter:drop-shadow(0 3px 5px rgba(0,0,0,0.3));">
                <rect x="4" y="4" width="122" height="87" rx="6" fill="#1b4f72" stroke="#154360" stroke-width="2"/>

                <!-- Header Pins Logic ด้านซ้าย (VCC, GND, IN1, IN2) -->
                <rect x="8" y="10" width="12" height="75" rx="2" fill="#17202a"/>
                <circle cx="14" cy="18" r="3.5" fill="#f1c40f" stroke="#b7950b"/>
                <text x="24" y="21" font-size="8" font-family="Arial, sans-serif" font-weight="bold" fill="#f5b041">VCC</text>
                <circle cx="14" cy="36" r="3.5" fill="#bdc3c7" stroke="#7f8c8d"/>
                <text x="24" y="39" font-size="8" font-family="Arial, sans-serif" font-weight="bold" fill="#ecf0f1">GND</text>
                <circle cx="14" cy="54" r="3.5" fill="#5dade2" stroke="#2980b9"/>
                <text x="24" y="57" font-size="8" font-family="Arial, sans-serif" font-weight="bold" fill="#aed6f1">IN1</text>
                <circle cx="14" cy="72" r="3.5" fill="#5dade2" stroke="#2980b9"/>
                <text x="24" y="75" font-size="8" font-family="Arial, sans-serif" font-weight="bold" fill="#aed6f1">IN2</text>

                <!-- ชิปไดรเวอร์ L9110S (IC) ตรงกลาง -->
                <rect x="46" y="28" width="34" height="38" rx="3" fill="#17202a" stroke="#2c3e50" stroke-width="1"/>
                <circle cx="50" cy="33" r="1.5" fill="#7f8c8d"/>
                <text x="63" y="46" font-size="8" font-family="Arial, sans-serif" font-weight="bold" fill="#ecf0f1" text-anchor="middle">L9110S</text>
                <text x="63" y="56" font-size="6.5" font-family="Arial, sans-serif" fill="#bdc3c7" text-anchor="middle">H-BRIDGE</text>

                <!-- เทอร์มินอลบล็อกสีเขียวด้านขวา (MOTOR OUT1, OUT2) -->
                <rect x="94" y="22" width="28" height="50" rx="3" fill="#1e8449" stroke="#145a32" stroke-width="1.5"/>
                <circle cx="114" cy="34" r="4.5" fill="#145a32"/>
                <circle cx="114" cy="34" r="2.5" fill="#f1c40f"/>
                <circle cx="114" cy="56" r="4.5" fill="#145a32"/>
                <circle cx="114" cy="56" r="2.5" fill="#f1c40f"/>

                <text x="100" y="37" font-size="7" font-family="Arial, sans-serif" font-weight="bold" fill="#ffffff" text-anchor="end">OUT1</text>
                <text x="100" y="59" font-size="7" font-family="Arial, sans-serif" font-weight="bold" fill="#ffffff" text-anchor="end">OUT2</text>
                <text x="63" y="16" font-size="7.5" font-family="Arial, sans-serif" font-weight="bold" fill="#85c1e9" text-anchor="middle">MOTOR DRIVER</text>
            </svg>
        `;
    }
}

// 4. DHT11 Sensor
class CircuitDht11 extends HTMLElement {
    constructor() {
        super();
        this._rendered = false;
    }

    connectedCallback() {
        if (!this._rendered) {
            this._rendered = true;
            this._render();
        }
    }

    get pinInfo() {
        return [
            { name: 'VCC', x: 16, y: 74 },
            { name: 'DATA', x: 30, y: 74 },
            { name: 'GND', x: 44, y: 74 }
        ];
    }

    _render() {
        this.style.display = 'inline-block';
        this.style.userSelect = 'none';
        const width = 60, height = 85;

        this.innerHTML = `
            <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="display:block; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.25));">
                <rect x="8" y="6" width="44" height="54" rx="4" fill="#2980b9" stroke="#1f618d" stroke-width="1.5"/>
                <rect x="14" y="12" width="32" height="24" rx="2" fill="#1f618d"/>
                <line x1="18" y1="14" x2="18" y2="34" stroke="#2980b9" stroke-width="1.5"/>
                <line x1="24" y1="14" x2="24" y2="34" stroke="#2980b9" stroke-width="1.5"/>
                <line x1="30" y1="14" x2="30" y2="34" stroke="#2980b9" stroke-width="1.5"/>
                <line x1="36" y1="14" x2="36" y2="34" stroke="#2980b9" stroke-width="1.5"/>
                <line x1="42" y1="14" x2="42" y2="34" stroke="#2980b9" stroke-width="1.5"/>

                <text x="30" y="48" font-size="8.5" font-family="Arial, sans-serif" font-weight="bold" fill="#ffffff" text-anchor="middle">DHT11</text>

                <!-- ขาเชื่อมต่อด้านล่าง 3 ขา (ระยะห่างขา 14px ให้ตรงกับช่องของ Breadboard) -->
                <rect x="14" y="60" width="4" height="15" fill="#bdc3c7" stroke="#7f8c8d" stroke-width="0.8"/>
                <rect x="28" y="60" width="4" height="15" fill="#bdc3c7" stroke="#7f8c8d" stroke-width="0.8"/>
                <rect x="42" y="60" width="4" height="15" fill="#bdc3c7" stroke="#7f8c8d" stroke-width="0.8"/>

                <text x="16" y="58" font-size="7" font-weight="bold" fill="#f9e79f" text-anchor="middle">+</text>
                <text x="30" y="58" font-size="7" font-weight="bold" fill="#ffffff" text-anchor="middle">S</text>
                <text x="44" y="58" font-size="7" font-weight="bold" fill="#aed6f1" text-anchor="middle">-</text>
            </svg>
        `;
    }
}

// ลงทะเบียน Custom Elements
if (typeof customElements !== 'undefined') {
    if (!customElements.get('circuit-breadboard-half')) {
        customElements.define('circuit-breadboard-half', CircuitBreadboardHalf);
    }
    if (!customElements.get('circuit-dc-motor')) {
        customElements.define('circuit-dc-motor', CircuitDcMotor);
    }
    if (!customElements.get('circuit-motor-driver')) {
        customElements.define('circuit-motor-driver', CircuitMotorDriver);
    }
    if (!customElements.get('circuit-dht11')) {
        customElements.define('circuit-dht11', CircuitDht11);
    }
}

/* =========================================================================
 * Parts Catalog & Colors
 * ========================================================================= */
const CIRCUIT_PARTS_CATALOG = [
    { type: 'wokwi-esp32-devkit-v1', label: 'ESP32', icon: '🎛️' },
    { type: 'circuit-breadboard-half', label: 'Breadboard', icon: '🍞' },
    { type: 'wokwi-led', label: 'LED (แดง)', icon: '🔴', attrs: { color: 'red' } },
    { type: 'wokwi-led', label: 'LED (เขียว)', icon: '🟢', attrs: { color: 'green' } },
    { type: 'wokwi-resistor', label: 'Resistor', icon: '〰️', attrs: { value: '220' } },
    { type: 'circuit-dht11', label: 'DHT11', icon: '🌡️' },
    { type: 'wokwi-dht22', label: 'DHT22', icon: '❄️' },
    { type: 'circuit-motor-driver', label: 'Driver Motor', icon: '⚡' },
    { type: 'circuit-dc-motor', label: 'Motor DC', icon: '🔄' },
    { type: 'wokwi-slide-switch', label: 'Slide Switch', icon: '🔀' },
    { type: 'wokwi-servo', label: 'Servo', icon: '⚙️' },
    { type: 'wokwi-hc-sr04', label: 'Ultrasonic', icon: '📏' },
    { type: 'wokwi-buzzer', label: 'Buzzer', icon: '🔊' },
];

const WIRE_COLORS = ['#e74c3c', '#2ecc71', '#3498db', '#f39c12', '#9b59b6', '#16a085', '#e67e22', '#34495e'];

/* ขนาดมาตรฐานของอุปกรณ์ (สำหรับคำนวณตำแหน่งขา และการขยายสัดส่วนให้ตรงกับระยะ 14px ของ Breadboard) */
const COMPONENT_BASE_SIZES = {
    'wokwi-led': { w: 40, h: 50 },
    'wokwi-dht22': { w: 57, h: 117 },
    'wokwi-buzzer': { w: 64, h: 76 },
    'wokwi-slide-switch': { w: 32, h: 35 },
    'wokwi-esp32-devkit-v1': { w: 107, h: 204 },
    'wokwi-resistor': { w: 58.8, h: 11.3 },
    'wokwi-hc-sr04': { w: 170, h: 95 },
    'wokwi-servo': { w: 80, h: 80 },
    'circuit-dht11': { w: 60, h: 85 },
    'circuit-dc-motor': { w: 140, h: 90 },
    'circuit-motor-driver': { w: 130, h: 95 },
    'circuit-breadboard-half': { w: 472, h: 246 }
};

function getPartScaleFactor(type) {
    if (type === 'circuit-breadboard-half') return 1.0;
    if (type === 'wokwi-resistor') return 84.0 / 58.8; // 1.4285714... = ระยะขา 6 ช่อง Breadboard พอดี (84px)
    if (type === 'wokwi-led' || type === 'wokwi-buzzer') return 1.4;
    if (typeof type === 'string' && type.startsWith('wokwi-')) return 1.458;
    return 1.0;
}

/* =========================================================================
 * Smooth Rounded Polyline Helper (Wokwi-style corner rounding)
 * ========================================================================= */
function buildRoundedPolyline(points, radius = 10) {
    if (!points || points.length < 2) return '';
    if (points.length === 2) {
        return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
    }
    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length - 1; i++) {
        const pPrev = points[i - 1];
        const pCur = points[i];
        const pNext = points[i + 1];

        const v1 = { x: pPrev.x - pCur.x, y: pPrev.y - pCur.y };
        const v2 = { x: pNext.x - pCur.x, y: pNext.y - pCur.y };
        const len1 = Math.hypot(v1.x, v1.y);
        const len2 = Math.hypot(v2.x, v2.y);

        if (len1 < 1e-4 || len2 < 1e-4) {
            d += ` L ${pCur.x.toFixed(1)} ${pCur.y.toFixed(1)}`;
            continue;
        }

        const r = Math.min(radius, len1 / 2, len2 / 2);
        const c1 = {
            x: pCur.x + (v1.x / len1) * r,
            y: pCur.y + (v1.y / len1) * r
        };
        const c2 = {
            x: pCur.x + (v2.x / len2) * r,
            y: pCur.y + (v2.y / len2) * r
        };

        d += ` L ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}`;
        d += ` Q ${pCur.x.toFixed(1)} ${pCur.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}`;
    }
    const pLast = points[points.length - 1];
    d += ` L ${pLast.x.toFixed(1)} ${pLast.y.toFixed(1)}`;
    return d;
}

/* =========================================================================
 * CircuitCanvas Class
 * ========================================================================= */

/* =========================================================================
 * Breadboard Snap & Direct Plug-in Helper
 * ========================================================================= */
function findNearestBreadboardHole(bb, absX, absY, maxDist = 20) {
    const rx = absX - bb.x;
    const ry = absY - bb.y;
    if (rx < 15 || rx > 455 || ry < 10 || ry > 240) return null;

    const col = Math.round((rx - 34) / 14) + 1;
    if (col < 1 || col > 30) return null;
    const holeX = 34 + (col - 1) * 14;

    const rows = [
        { name: `tp.${col}`, y: 22 },
        { name: `tn.${col}`, y: 36 },
        { name: `${col}.a`, y: 58 },
        { name: `${col}.b`, y: 72 },
        { name: `${col}.c`, y: 86 },
        { name: `${col}.d`, y: 100 },
        { name: `${col}.e`, y: 114 },
        { name: `${col}.f`, y: 142 },
        { name: `${col}.g`, y: 156 },
        { name: `${col}.h`, y: 170 },
        { name: `${col}.i`, y: 184 },
        { name: `${col}.j`, y: 198 },
        { name: `bp.${col}`, y: 216 },
        { name: `bn.${col}`, y: 230 },
    ];

    let closest = null;
    let minDist = maxDist;
    for (const r of rows) {
        const d = Math.hypot(rx - holeX, ry - r.y);
        if (d < minDist) {
            minDist = d;
            closest = {
                name: r.name,
                col,
                absX: bb.x + holeX,
                absY: bb.y + r.y,
                dist: d
            };
        }
    }
    return closest;
}

class CircuitCanvas {
    constructor(container, opts) {
        this.container = container;
        this.opts = opts || {};
        this.parts = [];             // {id, type, x, y, rotate, attrs, el, comp, pinDots, toolbar}
        this.wires = [];             // {id, from:{part,pin}, to:{part,pin}, color, waypoints:[], path, handlesGroup}
        this.nextPartId = 1;
        this.nextWireId = 1;
        this.pendingWire = null;     // {part, pin, x, y, waypoints:[]}
        this._tempWaypoints = [];    // Visual dots placed while drawing a wire
        this.selectedWireId = null;
        this.selectedPartId = null;
        this.onChange = this.opts.onChange || null;
        this.onSelectionChange = null;

        container.style.position = 'relative';
        container.style.overflow = 'hidden';
        if (!container.style.background) container.style.background = '#081c15';

        // Zoom & Pan State
        this.scale = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this._panMoved = false;
        this._isSpaceDown = false;

        // World Layer: รวมทุกชิ้นส่วนและ SVG เพื่อให้ Zoom & Pan ไปพร้อมกันอย่างสมบูรณ์
        this.world = document.createElement('div');
        this.world.className = 'cc-world';
        this.world.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; transform-origin:0 0; will-change:transform; pointer-events:auto;';
        container.appendChild(this.world);

        // ชั้นสายไฟ (SVG ทับทั้ง world)
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.style.cssText = 'position:absolute; top:0; left:0; width:6000px; height:6000px; pointer-events:none; z-index:5;';
        this.world.appendChild(this.svg);

        // เส้นชั่วคราวตอนกำลังลากสาย
        this.tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.tempLine.setAttribute('stroke-dasharray', '6 4');
        this.tempLine.setAttribute('stroke-width', '3');
        this.tempLine.setAttribute('fill', 'none');
        this.tempLine.setAttribute('stroke', '#f1c40f');
        this.tempLine.setAttribute('stroke-linecap', 'round');
        this.tempLine.setAttribute('stroke-linejoin', 'round');
        this.tempLine.style.display = 'none';
        this.svg.appendChild(this.tempLine);

        this._buildZoomControls();
        this._bindGlobalEvents();
        this.ready = CircuitCanvas.ensureElementsLoaded();
    }

    /* โหลด @wokwi/elements จาก CDN ครั้งเดียว */
    static ensureElementsLoaded() {
        if (CircuitCanvas._loadPromise) return CircuitCanvas._loadPromise;
        CircuitCanvas._loadPromise = new Promise((resolve, reject) => {
            if (window.customElements && customElements.get('wokwi-led')) return resolve();
            const s = document.createElement('script');
            s.src = 'https://unpkg.com/@wokwi/elements@1.9.2/dist/wokwi-elements.bundle.js';
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('โหลด wokwi-elements ไม่สำเร็จ'));
            document.head.appendChild(s);
        });
        return CircuitCanvas._loadPromise;
    }

    _emitChange() {
        if (this.onChange) { try { this.onChange(); } catch (e) {} }
    }

    _emitSelectionChange(type, id) {
        if (this.onSelectionChange) {
            try { this.onSelectionChange(type ? { type, id } : null); } catch (e) {}
        }
    }

    /* ----------------------------------------------------- zoom & pan --- */

    clientToWorld(clientX, clientY) {
        const rect = this.container.getBoundingClientRect();
        const cx = clientX - rect.left;
        const cy = clientY - rect.top;
        return {
            x: (cx - this.panX) / this.scale,
            y: (cy - this.panY) / this.scale
        };
    }

    worldToClient(wx, wy) {
        const rect = this.container.getBoundingClientRect();
        return {
            x: rect.left + this.panX + wx * this.scale,
            y: rect.top + this.panY + wy * this.scale
        };
    }

    _applyWorldTransform() {
        this.world.style.transform = `translate(${this.panX.toFixed(1)}px, ${this.panY.toFixed(1)}px) scale(${this.scale.toFixed(3)})`;
        this._updateZoomUI();
    }

    zoomAt(cx, cy, factor) {
        const oldScale = this.scale;
        const newScale = Math.max(0.35, Math.min(3.0, oldScale * factor));
        if (Math.abs(newScale - oldScale) < 0.001) return;

        // จุด World ใต้เมาส์เดิม
        const wx = (cx - this.panX) / oldScale;
        const wy = (cy - this.panY) / oldScale;

        // คำนวณ pan ใหม่ให้จุดเดิมอยู่ตรงตำแหน่งเดิม
        this.panX = cx - wx * newScale;
        this.panY = cy - wy * newScale;
        this.scale = newScale;

        this._applyWorldTransform();
    }

    zoomIn() {
        const rect = this.container.getBoundingClientRect();
        this.zoomAt((rect.width || 800) / 2, (rect.height || 460) / 2, 1.2);
    }

    zoomOut() {
        const rect = this.container.getBoundingClientRect();
        this.zoomAt((rect.width || 800) / 2, (rect.height || 460) / 2, 1 / 1.2);
    }

    resetZoom() {
        this.scale = 1.0;
        this.panX = 0;
        this.panY = 0;
        this._applyWorldTransform();
    }

    fitToScreen() {
        if (this.parts.length === 0) {
            this.resetZoom();
            return;
        }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        this.parts.forEach(p => {
            const w = p._baseWidth || 100;
            const h = p._baseHeight || 80;
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x + w);
            maxY = Math.max(maxY, p.y + h);
        });

        const rect = this.container.getBoundingClientRect();
        const cw = rect.width || 800;
        const ch = rect.height || 460;
        const pad = 40;
        const boundW = Math.max(maxX - minX + pad * 2, 150);
        const boundH = Math.max(maxY - minY + pad * 2, 120);

        const targetScale = Math.max(0.35, Math.min(1.8, Math.min(cw / boundW, ch / boundH)));
        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;

        this.scale = targetScale;
        this.panX = (cw / 2) - midX * targetScale;
        this.panY = (ch / 2) - midY * targetScale;
        this._applyWorldTransform();
    }

    _buildZoomControls() {
        const bar = document.createElement('div');
        bar.className = 'cc-zoom-bar';
        bar.style.cssText = 'position:absolute; bottom:12px; right:12px; z-index:25; display:flex; align-items:center; gap:4px;' +
            'background:rgba(15,23,42,0.92); backdrop-filter:blur(6px); padding:4px 8px; border-radius:10px;' +
            'border:1px solid #334155; box-shadow:0 4px 12px rgba(0,0,0,0.45); user-select:none; pointer-events:auto; font-family:Sarabun,sans-serif;';

        const makeBtn = (text, title, onClick) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.innerHTML = text;
            btn.title = title;
            btn.style.cssText = 'background:#1e293b; color:#f1f5f9; border:1px solid #475569; border-radius:6px; padding:4px 8px;' +
                'font-size:12px; font-weight:bold; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;' +
                'transition:all 0.15s ease; line-height:1; min-width:28px; height:26px;';
            btn.addEventListener('mouseenter', () => { btn.style.background = '#334155'; btn.style.borderColor = '#94a3b8'; });
            btn.addEventListener('mouseleave', () => { btn.style.background = '#1e293b'; btn.style.borderColor = '#475569'; });
            btn.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
            return btn;
        };

        const inBtn = makeBtn('➕', 'ซูมเข้า (Zoom In หรือหมุนลูกกลิ้งเมาส์)', () => this.zoomIn());
        const outBtn = makeBtn('➖', 'ซูมออก (Zoom Out หรือหมุนลูกกลิ้งเมาส์)', () => this.zoomOut());
        const resetBtn = makeBtn('100%', 'รีเซ็ตขนาดเป็น 100%', () => this.resetZoom());
        resetBtn.style.minWidth = '48px';
        const fitBtn = makeBtn('⛶', 'จัดมุมมองพอดีหน้าจอ (Fit to Screen)', () => this.fitToScreen());

        bar.appendChild(inBtn);
        bar.appendChild(outBtn);
        bar.appendChild(resetBtn);
        bar.appendChild(fitBtn);
        this.container.appendChild(bar);
        this.zoomBadge = resetBtn;
    }

    _updateZoomUI() {
        if (this.zoomBadge) {
            this.zoomBadge.innerHTML = Math.round(this.scale * 100) + '%';
        }
    }


    /* ---------------------------------------------------------- parts --- */

    async addPart(type, x, y, attrs, fixedId, rotate = 0) {
        await this.ready;
        const id = fixedId || ('p' + (this.nextPartId++));
        if (fixedId) {
            const num = parseInt(String(fixedId).replace(/\D/g, ''), 10);
            if (!isNaN(num) && num >= this.nextPartId) this.nextPartId = num + 1;
        }

        const isBreadboard = type === 'circuit-breadboard-half';
        const wrap = document.createElement('div');
        wrap.className = 'cc-part';
        wrap.dataset.partId = id;
        wrap.style.cssText = 'position:absolute; cursor:grab; z-index:' + (isBreadboard ? '1' : '2') + '; left:' + x + 'px; top:' + y + 'px;';

        const comp = document.createElement(type);
        if (attrs) {
            Object.entries(attrs).forEach(([k, v]) => comp.setAttribute(k, v));
        }
        wrap.appendChild(comp);
        this.world.appendChild(wrap);

        const initRotate = (typeof rotate === 'number') ? (rotate % 360) : 0;
        const part = {
            id,
            type,
            x,
            y,
            rotate: initRotate,
            attrs: attrs || {},
            el: wrap,
            comp,
            pinDots: [],
            pluggedPins: {},
            toolbar: null,
            _baseWidth: 0,
            _baseHeight: 0
        };
        this.parts.push(part);

        this._bindPartEvents(part);

        try { await customElements.whenDefined(type); } catch (e) {}
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        part._baseWidth = comp.offsetWidth || (comp.getBoundingClientRect ? comp.getBoundingClientRect().width : 0);
        part._baseHeight = comp.offsetHeight || (comp.getBoundingClientRect ? comp.getBoundingClientRect().height : 0);
        const baseDef = COMPONENT_BASE_SIZES[part.type];
        if (part.type === 'wokwi-resistor') {
            part._baseWidth = 58.8;
            part._baseHeight = 11.3;
        } else {
            if (!part._baseWidth && baseDef) part._baseWidth = baseDef.w;
            if (!part._baseHeight && baseDef) part._baseHeight = baseDef.h;
        }
        part.scaleFactor = getPartScaleFactor(part.type);

        this._applyPartTransform(part);
        this._buildPartActionButtons(part);
        this._buildPinDots(part);
        this._updatePluggedPins(part);
        this._emitChange();
        return part;
    }

    _applyPartTransform(part) {
        if (part.type === 'circuit-breadboard-half') {
            part.scaleFactor = 1.0;
            part.comp.style.transform = '';
            part.comp.style.display = 'block';
            return;
        }

        const deg = part.rotate || 0;
        const scale = getPartScaleFactor(part.type);
        part.scaleFactor = scale;

        // สำหรับ Resistor ต้องคงค่า display เป็น flex ตาม LitElement host style ไม่ให้เกิด line-height ช่องว่างด้านบน
        if (part.type === 'wokwi-resistor') {
            part._baseWidth = 58.8;
            part._baseHeight = 11.3;
            part.comp.style.display = 'flex';
        } else {
            part.comp.style.display = 'block';
        }

        part.comp.style.transformOrigin = 'center center';
        part.comp.style.transition = 'transform 0.15s ease';
        part.comp.style.transform = `rotate(${deg}deg) scale(${scale})`;
    }

    
    /* ------------------------------------------------- direct plug-in --- */

    _updatePluggedPins(part) {
        if (part.type === 'circuit-breadboard-half') return;
        part.pluggedPins = {};

        const bbs = this.parts.filter(p => p.type === 'circuit-breadboard-half');
        if (bbs.length === 0) {
            this._renderPluggedIndicators(part);
            return;
        }

        const pins = this._getPinInfo(part);
        pins.forEach(pin => {
            const abs = this._pinAbs(part.id, pin.name);
            if (!abs) return;

            for (const bb of bbs) {
                const hole = findNearestBreadboardHole(bb, abs.x, abs.y, 16);
                if (hole) {
                    part.pluggedPins[pin.name] = {
                        bbId: bb.id,
                        hole: hole.name,
                        col: hole.col,
                        absX: hole.absX,
                        absY: hole.absY
                    };
                    break;
                }
            }
        });

        this._renderPluggedIndicators(part);
    }

    _renderPluggedIndicators(part) {
        const plugged = part.pluggedPins || {};
        part.pinDots.forEach(dot => {
            const plug = plugged[dot.name];
            if (plug) {
                // เมื่อต่อ/เสียบลง Breadboard แล้ว ให้ซ่อนสัญลักษณ์กลมๆ ออก เพื่อให้มองเห็นขาอุปกรณ์ชัดเจน
                dot.el.style.display = 'none';
            } else {
                dot.el.style.display = 'block';
                if (part.type === 'circuit-breadboard-half') {
                    dot.el.style.background = 'transparent';
                    dot.el.style.border = 'none';
                    dot.el.style.opacity = '0';
                    dot.el.style.boxShadow = 'none';
                } else {
                    dot.el.style.background = '#3498db';
                    dot.el.style.border = '1.5px solid #ffffff';
                    dot.el.style.opacity = '0.85';
                    dot.el.style.boxShadow = 'none';
                }
                dot.el.title = dot.name;
            }
        });

        if (part.toolbar) {
            let badge = part.toolbar.querySelector('.cc-plug-badge');
            const entries = Object.entries(plugged);
            if (entries.length > 0) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'cc-plug-badge';
                    badge.style.cssText = 'background:#27ae60; color:#ffffff; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:bold; display:inline-flex; align-items:center; gap:3px;';
                    part.toolbar.insertBefore(badge, part.toolbar.firstChild);
                }
                const holesStr = entries.map(([pName, pl]) => `${pName}->${pl.hole}`).join(', ');
                badge.innerHTML = `🔌 เสียบตรง (${holesStr})`;
                badge.title = 'อุปกรณ์นี้เสียบตรงลง Breadboard ครบวงจรผ่านรูเสียบ';
            } else if (badge) {
                badge.remove();
            }
        }
    }

    _updateAllPluggedPins() {
        this.parts.filter(p => p.type !== 'circuit-breadboard-half')
            .forEach(p => this._updatePluggedPins(p));
    }

    _buildPartActionButtons(part) {
        if (this.opts.readonly) return;
        if (part.toolbar) part.toolbar.remove();

        // แถบปุ่มลอยติดเหนือตัวอุปกรณ์ [ 🗑️ ลบอุปกรณ์ | 🔄 หมุน 90° ]
        const bar = document.createElement('div');
        bar.className = 'cc-part-toolbar';
        bar.style.cssText = 'position:absolute; top:-36px; left:50%; transform:translateX(-50%); display:none;' +
            'gap:6px; z-index:40; background:rgba(20,24,33,0.96); padding:4px 8px; border-radius:18px;' +
            'border:1.5px solid #2ecc71; box-shadow:0 4px 12px rgba(0,0,0,0.5); white-space:nowrap; pointer-events:auto;';

        // 1. ปุ่มลบอุปกรณ์
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.innerHTML = '🗑️ ลบอุปกรณ์';
        delBtn.title = 'ลบอุปกรณ์นี้ (หรือกดคีย์บอร์ด Delete)';
        delBtn.style.cssText = 'background:#c0392b; color:#ffffff; border:none; border-radius:12px; padding:4px 10px; font-size:11.5px; font-weight:bold; cursor:pointer; display:inline-flex; align-items:center; gap:4px; box-shadow:0 1px 3px rgba(0,0,0,0.3); transition:background 0.15s ease; font-family:Sarabun,sans-serif;';
        delBtn.addEventListener('mouseenter', () => delBtn.style.background = '#e74c3c');
        delBtn.addEventListener('mouseleave', () => delBtn.style.background = '#c0392b');
        delBtn.addEventListener('mousedown', (e) => e.stopPropagation());
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removePart(part.id);
        });

        // 2. ปุ่มหมุน 90°
        const rotBtn = document.createElement('button');
        rotBtn.type = 'button';
        rotBtn.innerHTML = '🔄 หมุน 90°';
        rotBtn.title = 'หมุนอุปกรณ์ 90 องศา (หรือกดคีย์บอร์ด R)';
        rotBtn.style.cssText = 'background:#1e8449; color:#ffffff; border:none; border-radius:12px; padding:4px 10px; font-size:11.5px; font-weight:bold; cursor:pointer; display:inline-flex; align-items:center; gap:4px; box-shadow:0 1px 3px rgba(0,0,0,0.3); transition:background 0.15s ease; font-family:Sarabun,sans-serif;';
        rotBtn.addEventListener('mouseenter', () => rotBtn.style.background = '#27ae60');
        rotBtn.addEventListener('mouseleave', () => rotBtn.style.background = '#1e8449');
        rotBtn.addEventListener('mousedown', (e) => e.stopPropagation());
        rotBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.rotatePart(part.id, 90);
        });

        bar.appendChild(delBtn);
        bar.appendChild(rotBtn);
        part.el.appendChild(bar);
        part.toolbar = bar;
    }

    /** หมุนอุปกรณ์ทีละ delta องศา (ค่าเริ่มต้น +90) */
    rotatePart(partId, delta = 90) {
        const part = this.parts.find(p => p.id === partId);
        if (!part || this.opts.readonly) return;
        part.rotate = ((part.rotate || 0) + delta) % 360;
        if (part.rotate < 0) part.rotate += 360;

        this._applyPartTransform(part);
        this._updatePinDots(part);
        this._updatePluggedPins(part);
        this._redrawWiresOf(part.id);
        this._emitChange();
    }

    removePart(partId) {
        const idx = this.parts.findIndex(p => p.id === partId);
        if (idx < 0) return;
        const part = this.parts[idx];
        if (this.selectedPartId === partId) this.deselectPart();
        // ลบสายไฟทั้งหมดที่ต่อกับอุปกรณ์นี้
        const attached = this.wires.filter(w => w.from.part === partId || w.to.part === partId);
        attached.forEach(w => this.removeWire(w.id));
        part.el.remove();
        this.parts.splice(idx, 1);
        this._emitChange();
    }

    selectPart(partId) {
        if (this.selectedWireId) this._selectWire(null);
        this.parts.forEach(p => {
            if (p.id === partId) {
                p.el.style.outline = '2px dashed #2ecc71';
                p.el.style.outlineOffset = '4px';
                if (p.toolbar) p.toolbar.style.display = 'flex';
            } else {
                p.el.style.outline = 'none';
                if (p.toolbar && !p._hovered) p.toolbar.style.display = 'none';
            }
        });
        this.selectedPartId = partId;
        this._emitSelectionChange('part', partId);
    }

    deselectPart() {
        this.parts.forEach(p => {
            p.el.style.outline = 'none';
            if (p.toolbar && !p._hovered) p.toolbar.style.display = 'none';
        });
        this.selectedPartId = null;
        this._emitSelectionChange(null);
    }

    _bindPartEvents(part) {
        const wrap = part.el;
        const isBreadboard = part.type === 'circuit-breadboard-half';

        wrap.addEventListener('mouseenter', () => {
            part._hovered = true;
            if (part.toolbar) part.toolbar.style.display = 'flex';
        });
        wrap.addEventListener('mouseleave', () => {
            part._hovered = false;
            if (this.selectedPartId !== part.id && part.toolbar) {
                part.toolbar.style.display = 'none';
            }
        });

        wrap.addEventListener('mousedown', (e) => {
            if (e.target.classList && e.target.classList.contains('cc-pin')) return;
            if (e.target.closest && e.target.closest('.cc-part-toolbar')) return;
            if (this.opts.readonly) return;
            e.preventDefault();
            this.selectPart(part.id);

            const startX = e.clientX, startY = e.clientY;
            const origX = part.x, origY = part.y;
            wrap.style.cursor = 'grabbing';
            wrap.style.zIndex = '10';

            const onMove = (moveEv) => {
                const dx = (moveEv.clientX - startX) / this.scale;
                const dy = (moveEv.clientY - startY) / this.scale;
                part.x = Math.max(0, origX + dx);
                part.y = Math.max(0, origY + dy);
                wrap.style.left = part.x + 'px';
                wrap.style.top = part.y + 'px';
                this._redrawWiresOf(part.id);
            };

            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                wrap.style.cursor = 'grab';
                wrap.style.zIndex = isBreadboard ? '1' : '2';

                // หากเป็นอุปกรณ์ทั่วไป ปล่อยลงบน Breadboard ให้ Snap อัตโนมัติ
                if (!isBreadboard) {
                    const bbs = this.parts.filter(p => p.type === 'circuit-breadboard-half');
                    if (bbs.length > 0) {
                        const pins = this._getPinInfo(part);
                        if (pins.length > 0) {
                            const abs0 = this._pinAbs(part.id, pins[0].name);
                            if (abs0) {
                                for (const bb of bbs) {
                                    const hole = findNearestBreadboardHole(bb, abs0.x, abs0.y, 24);
                                    if (hole) {
                                        const dx = hole.absX - abs0.x;
                                        const dy = hole.absY - abs0.y;
                                        part.x += dx;
                                        part.y += dy;
                                        wrap.style.left = part.x + 'px';
                                        wrap.style.top = part.y + 'px';
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    this._updatePluggedPins(part);
                } else {
                    // หากย้าย Breadboard ให้อัปเดตอุปกรณ์ทั้งหมดที่เสียบอยู่
                    this._updateAllPluggedPins();
                }

                this._redrawWiresOf(part.id);
                this._emitChange();
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });

        // ดับเบิลคลิกลบอุปกรณ์ได้ทันที
        wrap.addEventListener('dblclick', (e) => {
            if (this.opts.readonly) return;
            if (e.target.classList && e.target.classList.contains('cc-pin')) return;
            e.preventDefault();
            this.removePart(part.id);
        });
    }

    /* ------------------------------------------------------- pin dots --- */

    _getPinInfo(part) {
        try {
            const info = part.comp.pinInfo;
            if (info && info.length) return info;
        } catch (e) {}
        return [];
    }

    _computeRotatedPin(part, pin) {
        const deg = part.rotate || 0;
        const s = part.scaleFactor || getPartScaleFactor(part.type);

        const baseDef = COMPONENT_BASE_SIZES[part.type];
        const w = part._baseWidth || (baseDef ? baseDef.w : (part.comp.offsetWidth || 80));
        const h = part._baseHeight || (baseDef ? baseDef.h : (part.comp.offsetHeight || 80));
        const cx = w / 2;
        const cy = h / 2;

        const dx = (pin.x - cx) * s;
        const dy = (pin.y - cy) * s;

        if (!deg) return { x: cx + dx, y: cy + dy };

        const rad = (deg * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const rx = cx + (dx * cos - dy * sin);
        const ry = cy + (dx * sin + dy * cos);
        return { x: rx, y: ry };
    }

    _buildPinDots(part) {
        part.pinDots.forEach(d => d.el.remove());
        part.pinDots = [];

        const isBreadboard = part.type === 'circuit-breadboard-half';
        const pins = this._getPinInfo(part);

        pins.forEach(p => {
            const dot = document.createElement('div');
            dot.className = 'cc-pin' + (isBreadboard ? ' cc-pin-bb' : '');
            dot.dataset.partId = part.id;
            dot.dataset.pinName = p.name;
            dot.title = p.name;

            const size = isBreadboard ? 12 : 11;
            if (isBreadboard) {
                // สำหรับ Breadboard ให้ซ่อนเป็นโปร่งใส เพื่อมองเห็นรูกราฟิก Breadboard ชัดเจน ไม่ลายตา
                dot.style.cssText =
                    'position:absolute; width:' + size + 'px; height:' + size + 'px; border-radius:50%;' +
                    'background:transparent; border:none; cursor:crosshair; z-index:3;' +
                    'transform:translate(-50%, -50%); opacity:0; transition:opacity 0.12s ease, transform 0.12s ease;';

                dot.addEventListener('mouseenter', () => {
                    dot.style.opacity = '1';
                    dot.style.background = '#e74c3c';
                    dot.style.border = '1.5px solid #ffffff';
                    dot.style.transform = 'translate(-50%, -50%) scale(1.3)';
                });
                dot.addEventListener('mouseleave', () => {
                    dot.style.opacity = '0';
                    dot.style.background = 'transparent';
                    dot.style.border = 'none';
                    dot.style.transform = 'translate(-50%, -50%) scale(1)';
                });
            } else {
                dot.style.cssText =
                    'position:absolute; width:' + size + 'px; height:' + size + 'px; border-radius:50%;' +
                    'background:#3498db; border:1.5px solid #ffffff; cursor:crosshair; z-index:3;' +
                    'transform:translate(-50%, -50%); opacity:0.85; transition:transform 0.1s ease, opacity 0.1s ease;';

                dot.addEventListener('mouseenter', () => {
                    dot.style.opacity = '1';
                    dot.style.transform = 'translate(-50%, -50%) scale(1.5)';
                    dot.style.background = '#e74c3c';
                });
                dot.addEventListener('mouseleave', () => {
                    dot.style.opacity = '0.85';
                    dot.style.transform = 'translate(-50%, -50%) scale(1)';
                    dot.style.background = '#3498db';
                });
            }

            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.opts.readonly) return;
                this._onPinClick(part, p.name);
            });

            const rPos = this._computeRotatedPin(part, p);
            dot.style.left = rPos.x + 'px';
            dot.style.top = rPos.y + 'px';

            part.el.appendChild(dot);
            part.pinDots.push({ name: p.name, origX: p.x, origY: p.y, el: dot });
        });
    }

    _updatePinDots(part) {
        part.pinDots.forEach(dot => {
            const rPos = this._computeRotatedPin(part, { x: dot.origX, y: dot.origY });
            dot.el.style.left = rPos.x + 'px';
            dot.el.style.top = rPos.y + 'px';
        });
    }

    _pinAbs(partId, pinName) {
        const part = this.parts.find(p => p.id === partId);
        if (!part) return null;
        const dot = part.pinDots.find(d => d.name === pinName);
        if (!dot) return null;
        const rPos = this._computeRotatedPin(part, { x: dot.origX, y: dot.origY });
        return {
            x: part.x + rPos.x,
            y: part.y + rPos.y
        };
    }

    /* ---------------------------------------------------------- wires --- */

    _onPinClick(part, pinName) {
        const abs = this._pinAbs(part.id, pinName);
        if (!abs) return;
        if (!this.pendingWire) {
            this.pendingWire = {
                part: part.id,
                pin: pinName,
                x: abs.x,
                y: abs.y,
                waypoints: []
            };
            this.tempLine.style.display = 'block';
            this._updateTempLine(abs.x, abs.y);
        } else {
            // คลิกที่ขาเดิมโดยไม่มีจุดหักมุม = ยกเลิก
            if (this.pendingWire.part === part.id && this.pendingWire.pin === pinName && this.pendingWire.waypoints.length === 0) {
                this._cancelPendingWire();
                return;
            }
            // เชื่อมสายพร้อมจุดหักมุมทั้งหมดที่ผู้ใช้คลิกไว้
            const wps = [...this.pendingWire.waypoints];
            this.addWire(this.pendingWire.part, this.pendingWire.pin, part.id, pinName, null, wps);
            this._cancelPendingWire();
        }
    }

    _calcWirePath(pts) {
        if (!pts || pts.length < 2) return '';
        if (pts.length === 2) {
            const p0 = pts[0], p1 = pts[1];
            const dx = p1.x - p0.x, dy = p1.y - p0.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 40) {
                return `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} L ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
            }
            const bend = Math.min(30, Math.abs(dx) * 0.25 + 5);
            return `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} C ${(p0.x + bend).toFixed(1)} ${p0.y.toFixed(1)}, ${(p1.x - bend).toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
        }
        return buildRoundedPolyline(pts, 10);
    }

    addWire(fromPart, fromPin, toPart, toPin, color, waypoints = []) {
        const dup = this.wires.some(w =>
            (w.from.part === fromPart && w.from.pin === fromPin && w.to.part === toPart && w.to.pin === toPin) ||
            (w.from.part === toPart && w.from.pin === toPin && w.to.part === fromPart && w.to.pin === fromPin));
        if (dup) return null;

        const wire = {
            id: 'w' + (this.nextWireId++),
            from: { part: fromPart, pin: fromPin },
            to: { part: toPart, pin: toPin },
            color: color || WIRE_COLORS[(this.wires.length) % WIRE_COLORS.length],
            waypoints: (waypoints || []).map(p => ({ x: Number(p.x), y: Number(p.y) })),
            path: null,
            handlesGroup: null
        };

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('stroke', wire.color);
        path.setAttribute('stroke-width', '3.5');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.style.pointerEvents = 'stroke';
        path.style.cursor = 'pointer';

        path.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.opts.readonly) return;
            this.deselectPart();
            this._selectWire(wire.id);
        });

        path.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            if (this.opts.readonly) return;
            this.removeWire(wire.id);
        });

        this.svg.appendChild(path);
        wire.path = path;
        this.wires.push(wire);
        this._drawWire(wire);
        this._emitChange();
        return wire;
    }

    removeWire(wireId) {
        const idx = this.wires.findIndex(w => w.id === wireId);
        if (idx < 0) return;
        const wire = this.wires[idx];
        this._hideWireHandles(wire);
        this._removeWireEl(wire);
        this.wires.splice(idx, 1);
        if (this.selectedWireId === wireId) {
            this.selectedWireId = null;
            this._emitSelectionChange(null);
        }
        this._emitChange();
    }

    _removeWireEl(wire) {
        if (wire.path) wire.path.remove();
        this._hideWireHandles(wire);
    }

    _selectWire(wireId) {
        if (this.selectedWireId && this.selectedWireId !== wireId) {
            const oldWire = this.wires.find(w => w.id === this.selectedWireId);
            if (oldWire) {
                oldWire.path.setAttribute('stroke-width', '3.5');
                oldWire.path.setAttribute('stroke-opacity', '0.9');
                oldWire.path.style.filter = '';
                this._hideWireHandles(oldWire);
            }
        }

        this.selectedWireId = (this.selectedWireId === wireId) ? null : wireId;
        const wire = this.wires.find(w => w.id === this.selectedWireId);
        if (wire) {
            wire.path.setAttribute('stroke-width', '5');
            wire.path.setAttribute('stroke-opacity', '1');
            wire.path.style.filter = 'drop-shadow(0 0 5px ' + wire.color + ')';
            this._showWireHandles(wire);
            this._emitSelectionChange('wire', wire.id);
        } else {
            this._emitSelectionChange(null);
        }
    }

    _hideWireHandles(wire) {
        if (wire && wire.handlesGroup) {
            wire.handlesGroup.remove();
            wire.handlesGroup = null;
        }
    }

    _showWireHandles(wire) {
        this._hideWireHandles(wire);
        if (this.opts.readonly) return;

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'cc-wire-handles');
        this.svg.appendChild(g);
        wire.handlesGroup = g;

        this._renderWireHandlesContent(wire);
    }

    _renderWireHandlesContent(wire) {
        const g = wire.handlesGroup;
        if (!g) return;
        g.innerHTML = '';

        const a = this._pinAbs(wire.from.part, wire.from.pin);
        const b = this._pinAbs(wire.to.part, wire.to.pin);
        if (!a || !b) return;

        const allPts = [a, ...wire.waypoints, b];

        // 1. Waypoint handles (จุดมุมที่ลากย้ายได้ หรือดับเบิลคลิกลบ)
        wire.waypoints.forEach((pt, idx) => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', pt.x);
            circle.setAttribute('cy', pt.y);
            circle.setAttribute('r', '6');
            circle.setAttribute('fill', '#ffffff');
            circle.setAttribute('stroke', wire.color);
            circle.setAttribute('stroke-width', '2.5');
            circle.style.cursor = 'move';
            circle.style.pointerEvents = 'all';
            circle.setAttribute('class', 'cc-wire-handle');
            circle.innerHTML = '<title>ลากเพื่อย้ายมุม (ดับเบิลคลิกเพื่อลบมุมนี้)</title>';

            circle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const onMove = (moveEv) => {
                    const wPos = this.clientToWorld(moveEv.clientX, moveEv.clientY);
                    pt.x = Math.round(wPos.x);
                    pt.y = Math.round(wPos.y);
                    this._drawWire(wire);
                    this._renderWireHandlesContent(wire);
                };
                const onUp = () => {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    this._emitChange();
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });

            circle.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                wire.waypoints.splice(idx, 1);
                this._drawWire(wire);
                this._renderWireHandlesContent(wire);
                this._emitChange();
            });

            g.appendChild(circle);
        });

        // 2. Segment midpoints (จุดกึ่งกลางเส้น คลิกหรือลากเพื่อเพิ่มมุมหัก)
        for (let i = 0; i < allPts.length - 1; i++) {
            const p1 = allPts[i];
            const p2 = allPts[i + 1];
            const mx = (p1.x + p2.x) / 2;
            const my = (p1.y + p2.y) / 2;

            const mid = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            mid.setAttribute('cx', mx);
            mid.setAttribute('cy', my);
            mid.setAttribute('r', '4.5');
            mid.setAttribute('fill', wire.color);
            mid.setAttribute('fill-opacity', '0.7');
            mid.setAttribute('stroke', '#ffffff');
            mid.setAttribute('stroke-width', '1.5');
            mid.style.cursor = 'pointer';
            mid.style.pointerEvents = 'all';
            mid.setAttribute('class', 'cc-wire-handle');
            mid.innerHTML = '<title>ลากเพื่อดัดมุมสายไฟ</title>';

            mid.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const newPt = { x: Math.round(mx), y: Math.round(my) };
                wire.waypoints.splice(i, 0, newPt);
                this._drawWire(wire);
                this._renderWireHandlesContent(wire);

                const onMove = (moveEv) => {
                    const wPos = this.clientToWorld(moveEv.clientX, moveEv.clientY);
                    newPt.x = Math.round(wPos.x);
                    newPt.y = Math.round(wPos.y);
                    this._drawWire(wire);
                    this._renderWireHandlesContent(wire);
                };
                const onUp = () => {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    this._emitChange();
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });

            g.appendChild(mid);
        }
    }

    _drawWire(wire) {
        const a = this._pinAbs(wire.from.part, wire.from.pin);
        const b = this._pinAbs(wire.to.part, wire.to.pin);
        if (!a || !b || !wire.path) return;
        const pts = [a, ...(wire.waypoints || []), b];
        wire.path.setAttribute('d', this._calcWirePath(pts));
        if (wire.id === this.selectedWireId && wire.handlesGroup) {
            this._renderWireHandlesContent(wire);
        }
    }

    _redrawWiresOf(partId) {
        this.wires.filter(w => w.from.part === partId || w.to.part === partId)
            .forEach(w => this._drawWire(w));
    }

    redrawAll() {
        this.wires.forEach(w => this._drawWire(w));
    }

    _updateTempLine(mx, my) {
        if (!this.pendingWire) return;
        const pts = [
            { x: this.pendingWire.x, y: this.pendingWire.y },
            ...this.pendingWire.waypoints,
            { x: mx, y: my }
        ];
        this.tempLine.setAttribute('d', this._calcWirePath(pts));
    }

    _cancelPendingWire() {
        this.pendingWire = null;
        this.tempLine.style.display = 'none';
        if (this._tempWaypoints) {
            this._tempWaypoints.forEach(dot => dot.remove());
            this._tempWaypoints = [];
        }
    }

    _bindGlobalEvents() {
        // Wheel Zoom: หมุนลูกกลิ้งเมาส์เพื่อซูมเข้า/ออก ณ ตำแหน่งเคอร์เซอร์
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = this.container.getBoundingClientRect();
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;
            const factor = e.deltaY < 0 ? 1.12 : 0.89;
            this.zoomAt(cx, cy, factor);
        }, { passive: false });

        // Spacebar detection for Pan
        this._keyHandlerSpace = (e) => {
            if (e.code === 'Space' && !this._isSpaceDown) {
                const tag = (document.activeElement && document.activeElement.tagName) || '';
                if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
                    this._isSpaceDown = true;
                    this.container.style.cursor = 'grab';
                }
            }
        };
        this._keyUpSpace = (e) => {
            if (e.code === 'Space') {
                this._isSpaceDown = false;
                this.container.style.cursor = 'default';
            }
        };
        document.addEventListener('keydown', this._keyHandlerSpace);
        document.addEventListener('keyup', this._keyUpSpace);

        // Mousedown for Pan (Middle mouse button, Space+Drag, or background drag)
        this.container.addEventListener('mousedown', (e) => {
            const isMiddle = e.button === 1;
            const isSpacePan = (this._isSpaceDown && e.button === 0);
            const isBgPan = (e.button === 0 && !this.pendingWire && (e.target === this.container || e.target === this.svg || e.target === this.world));

            if (isMiddle || isSpacePan || isBgPan) {
                this.isPanning = true;
                this._panMoved = false;
                const startX = e.clientX;
                const startY = e.clientY;
                const origPanX = this.panX;
                const origPanY = this.panY;
                this.container.style.cursor = 'grabbing';

                const onPanMove = (moveEv) => {
                    const dx = moveEv.clientX - startX;
                    const dy = moveEv.clientY - startY;
                    if (Math.hypot(dx, dy) > 3) {
                        this._panMoved = true;
                        this.panX = origPanX + dx;
                        this.panY = origPanY + dy;
                        this._applyWorldTransform();
                    }
                };

                const onPanUp = () => {
                    document.removeEventListener('mousemove', onPanMove);
                    document.removeEventListener('mouseup', onPanUp);
                    this.isPanning = false;
                    this.container.style.cursor = this._isSpaceDown ? 'grab' : 'default';
                };

                document.addEventListener('mousemove', onPanMove);
                document.addEventListener('mouseup', onPanUp);
            }
        });

        this.container.addEventListener('mousemove', (e) => {
            if (!this.pendingWire) return;
            const wPos = this.clientToWorld(e.clientX, e.clientY);
            this._updateTempLine(wPos.x, wPos.y);
        });

        this.container.addEventListener('click', (e) => {
            // หากเป็นการลาก Pan หน้าจอ ไม่ให้ถือเป็นการคลิก
            if (this._panMoved) {
                this._panMoved = false;
                return;
            }
            // หากคลิกที่ pin ให้ _onPinClick จัดการ
            if (e.target && e.target.classList && e.target.classList.contains('cc-pin')) return;
            // หากคลิกที่แถบเครื่องมือลอย ให้ปุ่มจัดการเอง
            if (e.target.closest && (e.target.closest('.cc-part-toolbar') || e.target.closest('.cc-wire-handle') || e.target.closest('.cc-zoom-bar'))) return;

            if (this.pendingWire) {
                // ผู้ใช้คลิกบนพื้นที่ว่าง = เพิ่มจุดหักมุมสายไฟ (Wokwi-style waypoint) ในพิกัด World
                const wPos = this.clientToWorld(e.clientX, e.clientY);
                const clickX = Math.round(wPos.x);
                const clickY = Math.round(wPos.y);

                this.pendingWire.waypoints.push({ x: clickX, y: clickY });

                const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                dot.setAttribute('cx', clickX);
                dot.setAttribute('cy', clickY);
                dot.setAttribute('r', '4.5');
                dot.setAttribute('fill', '#f1c40f');
                dot.setAttribute('stroke', '#b7950b');
                dot.setAttribute('stroke-width', '1.5');
                dot.style.pointerEvents = 'none';
                dot.setAttribute('class', 'cc-temp-wp');
                this.svg.appendChild(dot);
                this._tempWaypoints.push(dot);

                this._updateTempLine(clickX, clickY);
                return;
            }

            // คลิกพื้นที่ว่างปกติ = ยกเลิกการเลือก
            if (e.target === this.container || e.target === this.svg || e.target === this.world) {
                if (this.selectedWireId) this._selectWire(null);
                this.deselectPart();
            }
        });

        // คลิกขวาเพื่อยกเลิกการเดินสายไฟ
        this.container.addEventListener('contextmenu', (e) => {
            if (this.pendingWire) {
                e.preventDefault();
                this._cancelPendingWire();
            }
        });

        this._keyHandler = (e) => {
            const tag = (document.activeElement && document.activeElement.tagName) || '';
            const isEditing = tag === 'INPUT' || tag === 'TEXTAREA';

            if (e.key === 'Escape') {
                this._cancelPendingWire();
                if (this.selectedWireId) this._selectWire(null);
                this.deselectPart();
            }
            if (!isEditing && (e.key === 'r' || e.key === 'R') && this.selectedPartId) {
                e.preventDefault();
                this.rotatePart(this.selectedPartId, 90);
            }
            if (!isEditing && (e.key === 'Delete' || e.key === 'Backspace')) {
                if (this.selectedWireId) {
                    e.preventDefault();
                    this.removeWire(this.selectedWireId);
                } else if (this.selectedPartId) {
                    e.preventDefault();
                    this.removePart(this.selectedPartId);
                }
            }
        };
        document.addEventListener('keydown', this._keyHandler);
    }

    /* ----------------------------------------------------- save / load --- */

    toJSON() {
        return {
            version: 1,
            parts: this.parts.map(p => ({
                id: p.id,
                type: p.type,
                x: Math.round(p.x),
                y: Math.round(p.y),
                rotate: p.rotate || 0,
                attrs: p.attrs || {},
                pluggedPins: p.pluggedPins || {}
            })),
            wires: this.wires.map(w => ({
                from: { part: w.from.part, pin: w.from.pin },
                to: { part: w.to.part, pin: w.to.pin },
                color: w.color,
                waypoints: (w.waypoints || []).map(pt => ({ x: Math.round(pt.x), y: Math.round(pt.y) }))
            }))
        };
    }

    fromJSON(data) {
        if (!data) return;
        this.clear();
        for (const p of (data.parts || [])) {
            this.addPart(p.type, p.x, p.y, p.attrs, p.id, p.rotate || 0);
        }
        (data.wires || []).forEach(w => {
            this.addWire(w.from.part, w.from.pin, w.to.part, w.to.pin, w.color, w.waypoints || []);
        });
        this._updateAllPluggedPins();
        this.redrawAll();
    }

    clear() {
        this.wires.forEach(w => this._removeWireEl(w));
        this.wires = [];
        this.parts.forEach(p => p.el.remove());
        this.parts = [];
        this.nextPartId = 1;
        this.nextWireId = 1;
        this._cancelPendingWire();
        this.selectedWireId = null;
        this.selectedPartId = null;
        this._emitSelectionChange(null);
    }

    destroy() {
        document.removeEventListener('keydown', this._keyHandler);
        document.removeEventListener('keydown', this._keyHandlerSpace);
        document.removeEventListener('keyup', this._keyUpSpace);
        this.clear();
        this.svg.remove();
    }
}

/** สร้างแถบ palette ปุ่มอุปกรณ์ให้ container ที่กำหนด แล้วผูกกับ canvas */
function buildCircuitPalette(paletteEl, canvas) {
    paletteEl.innerHTML = '';
    paletteEl.style.cssText += ';display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px; align-items:center;';

    CIRCUIT_PARTS_CATALOG.forEach(item => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = item.icon + ' ' + item.label;
        btn.style.cssText = 'padding:7px 12px; border:1px solid #1c4d33; border-radius:7px; background:#0b2518; color:#e8f5e9; cursor:pointer; font-size:0.85rem; font-weight:600; box-shadow:0 2px 4px rgba(0,0,0,0.25); transition:all 0.15s ease;';
        btn.addEventListener('mouseenter', () => {
            btn.style.background = '#16482e';
            btn.style.borderColor = '#2d6a4f';
            btn.style.color = '#ffffff';
            btn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.35)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.background = '#0b2518';
            btn.style.borderColor = '#1c4d33';
            btn.style.color = '#e8f5e9';
            btn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.25)';
        });
        btn.addEventListener('click', async () => {
            const n = canvas.parts.length;
            const isBb = item.type === 'circuit-breadboard-half';
            const defaultX = isBb ? 15 : (30 + (n % 5) * 80);
            const defaultY = isBb ? 180 : (20 + Math.floor(n / 5) * 80);
            await canvas.addPart(item.type, defaultX, defaultY, item.attrs ? { ...item.attrs } : {});
        });
        paletteEl.appendChild(btn);
    });

    // กลุ่มปุ่มจัดการ (หมุน + ลบ) จัดอยู่ชิดขวาของเมนู
    const actionGroup = document.createElement('div');
    actionGroup.style.cssText = 'display:flex; gap:6px; margin-left:auto;';

    // 1. ปุ่มหมุน 90° บนแถบเมนู (หมุนอุปกรณ์ที่กำลังเลือก)
    const rotateToolbarBtn = document.createElement('button');
    rotateToolbarBtn.type = 'button';
    rotateToolbarBtn.textContent = '🔄 หมุน 90° (R)';
    rotateToolbarBtn.title = 'หมุนอุปกรณ์ที่เลือกอยู่ 90 องศา (หรือกดคีย์บอร์ด R)';
    rotateToolbarBtn.style.cssText = 'padding:7px 12px; border:1px solid #1e8449; border-radius:7px; background:#145a32; color:#ffffff; cursor:pointer; font-size:0.85rem; font-weight:600; box-shadow:0 2px 4px rgba(0,0,0,0.25); transition:all 0.15s ease;';
    rotateToolbarBtn.addEventListener('mouseenter', () => {
        rotateToolbarBtn.style.background = '#1e8449';
        rotateToolbarBtn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.35)';
    });
    rotateToolbarBtn.addEventListener('mouseleave', () => {
        rotateToolbarBtn.style.background = '#145a32';
        rotateToolbarBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.25)';
    });
    rotateToolbarBtn.addEventListener('click', () => {
        if (canvas.selectedPartId) {
            canvas.rotatePart(canvas.selectedPartId, 90);
        } else if (canvas.parts.length > 0) {
            const lastPart = canvas.parts[canvas.parts.length - 1];
            canvas.selectPart(lastPart.id);
            canvas.rotatePart(lastPart.id, 90);
        } else {
            alert('กรุณาคลิกเลือกอุปกรณ์บน Canvas ก่อนหมุน');
        }
    });
    actionGroup.appendChild(rotateToolbarBtn);

    // 2. ปุ่มลบ บนแถบเมนู (ลบอุปกรณ์หรือสายไฟที่กำลังเลือก)
    const deleteToolbarBtn = document.createElement('button');
    deleteToolbarBtn.type = 'button';
    deleteToolbarBtn.textContent = '🗑️ ลบ (Del)';
    deleteToolbarBtn.title = 'ลบอุปกรณ์หรือสายไฟที่เลือกอยู่ (หรือกดคีย์บอร์ด Delete)';
    deleteToolbarBtn.style.cssText = 'padding:7px 12px; border:1px solid #922b21; border-radius:7px; background:#78281f; color:#ffffff; cursor:pointer; font-size:0.85rem; font-weight:600; box-shadow:0 2px 4px rgba(0,0,0,0.25); transition:all 0.15s ease;';
    deleteToolbarBtn.addEventListener('mouseenter', () => {
        deleteToolbarBtn.style.background = '#922b21';
        deleteToolbarBtn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.35)';
    });
    deleteToolbarBtn.addEventListener('mouseleave', () => {
        deleteToolbarBtn.style.background = '#78281f';
        deleteToolbarBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.25)';
    });
    deleteToolbarBtn.addEventListener('click', () => {
        if (canvas.selectedWireId) {
            canvas.removeWire(canvas.selectedWireId);
        } else if (canvas.selectedPartId) {
            canvas.removePart(canvas.selectedPartId);
        } else if (canvas.parts.length > 0) {
            const lastPart = canvas.parts[canvas.parts.length - 1];
            canvas.removePart(lastPart.id);
        } else {
            alert('กรุณาคลิกเลือกอุปกรณ์หรือสายไฟที่ต้องการลบก่อนครับ (หรือคลิกปุ่ม 🗑️ บนตัวอุปกรณ์)');
        }
    });
    actionGroup.appendChild(deleteToolbarBtn);

    // อัปเดตข้อความปุ่มลบเมื่อมีการเลือกอุปกรณ์หรือสายไฟ
    canvas.onSelectionChange = (sel) => {
        if (sel && sel.type === 'part') {
            const p = canvas.parts.find(x => x.id === sel.id);
            const name = p ? p.type.replace('wokwi-', '').replace('circuit-', '') : 'อุปกรณ์';
            deleteToolbarBtn.innerHTML = `🗑️ ลบ ${name} (Del)`;
            deleteToolbarBtn.style.background = '#c0392b';
            deleteToolbarBtn.style.borderColor = '#e74c3c';
            rotateToolbarBtn.style.display = 'inline-block';
        } else if (sel && sel.type === 'wire') {
            deleteToolbarBtn.innerHTML = `🗑️ ลบสายไฟ (Del)`;
            deleteToolbarBtn.style.background = '#c0392b';
            deleteToolbarBtn.style.borderColor = '#e74c3c';
            rotateToolbarBtn.style.display = 'none';
        } else {
            deleteToolbarBtn.innerHTML = `🗑️ ลบ (Del)`;
            deleteToolbarBtn.style.background = '#78281f';
            deleteToolbarBtn.style.borderColor = '#922b21';
            rotateToolbarBtn.style.display = 'inline-block';
        }
    };

    paletteEl.appendChild(actionGroup);
}

if (typeof window !== 'undefined') {
    window.CircuitCanvas = CircuitCanvas;
    window.buildCircuitPalette = buildCircuitPalette;
    window.CIRCUIT_PARTS_CATALOG = CIRCUIT_PARTS_CATALOG;
}
