/**
 * circuit-canvas.js — เฟส 1 ของระบบจำลองวงจร ESP32+IoT
 * =====================================================
 * Canvas ต่อวงจรแบบ Wokwi: วางอุปกรณ์จาก palette, ลากย้าย, ต่อสายไฟขา-ถึง-ขา
 * ภาพอุปกรณ์ใช้ @wokwi/elements (MIT license) โหลดจาก CDN — logic เป็นของเราเอง
 *
 * การใช้งาน:
 *   const cv = new CircuitCanvas(document.getElementById('myCanvas'));
 *   await cv.ready;                    // รอ wokwi-elements โหลด
 *   cv.addPart('wokwi-led', 100, 50, {color:'red'});
 *   const json = cv.toJSON();          // เก็บลง Firebase (เป็น object → stringify เอง)
 *   cv.loadJSON(json);                 // โหลดกลับ
 */

const CIRCUIT_PARTS_CATALOG = [
    { type: 'wokwi-esp32-devkit-v1', label: 'ESP32', icon: '🎛️' },
    { type: 'wokwi-led', label: 'LED', icon: '🔴', attrs: { color: 'red' } },
    { type: 'wokwi-resistor', label: 'Resistor', icon: '〰️', attrs: { value: '220' } },
    { type: 'wokwi-slide-switch', label: 'Slide Switch', icon: '🔀' },
    { type: 'wokwi-dht22', label: 'DHT22', icon: '🌡️' },
    { type: 'wokwi-servo', label: 'Servo', icon: '⚙️' },
    { type: 'wokwi-hc-sr04', label: 'Ultrasonic', icon: '📏' },
    { type: 'wokwi-buzzer', label: 'Buzzer', icon: '🔊' },
];

const WIRE_COLORS = ['#e74c3c', '#2ecc71', '#3498db', '#f39c12', '#9b59b6', '#16a085', '#e67e22', '#34495e'];

class CircuitCanvas {
    constructor(container, opts) {
        this.container = container;
        this.opts = opts || {};
        this.parts = [];        // {id, type, x, y, attrs, el(wrapper), comp(custom element)}
        this.wires = [];        // {id, from:{part,pin}, to:{part,pin}, color, path(el)}
        this.nextPartId = 1;
        this.nextWireId = 1;
        this.pendingWire = null;    // {part, pin, x, y}
        this.selectedWireId = null;
        this.onChange = this.opts.onChange || null;

        container.style.position = 'relative';
        container.style.overflow = 'hidden';
        if (!container.style.background) container.style.background = '#f4f7f6';

        // ชั้นสายไฟ (SVG ทับทั้ง canvas)
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:5;';
        container.appendChild(this.svg);

        // เส้นชั่วคราวตอนกำลังลากสาย
        this.tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.tempLine.setAttribute('stroke-dasharray', '6 4');
        this.tempLine.setAttribute('stroke-width', '2.5');
        this.tempLine.setAttribute('fill', 'none');
        this.tempLine.setAttribute('stroke', '#888');
        this.tempLine.style.display = 'none';
        this.svg.appendChild(this.tempLine);

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

    /* ---------------------------------------------------------- parts --- */

    async addPart(type, x, y, attrs, fixedId) {
        await this.ready;
        const id = fixedId || ('p' + (this.nextPartId++));
        // กัน id ซ้ำตอน load
        if (fixedId) {
            const num = parseInt(String(fixedId).replace(/\D/g, ''), 10);
            if (!isNaN(num) && num >= this.nextPartId) this.nextPartId = num + 1;
        }

        const wrap = document.createElement('div');
        wrap.className = 'cc-part';
        wrap.dataset.partId = id;
        wrap.style.cssText = 'position:absolute; cursor:grab; z-index:2; left:' + x + 'px; top:' + y + 'px;';

        const comp = document.createElement(type);
        if (attrs) {
            Object.entries(attrs).forEach(([k, v]) => comp.setAttribute(k, v));
        }
        wrap.appendChild(comp);
        this.container.appendChild(wrap);

        const part = { id, type, x, y, attrs: attrs || {}, el: wrap, comp, pinDots: [] };
        this.parts.push(part);

        this._bindPartEvents(part);

        // รอ element วาดเสร็จก่อนวางจุดขา
        try { await customElements.whenDefined(type); } catch (e) {}
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        this._buildPinDots(part);
        this._emitChange();
        return part;
    }

    removePart(partId) {
        const idx = this.parts.findIndex(p => p.id === partId);
        if (idx < 0) return;
        const part = this.parts[idx];
        // ลบสายที่เกาะอุปกรณ์นี้
        this.wires.filter(w => w.from.part === partId || w.to.part === partId)
            .forEach(w => this._removeWireEl(w));
        this.wires = this.wires.filter(w => w.from.part !== partId && w.to.part !== partId);
        part.el.remove();
        this.parts.splice(idx, 1);
        this._emitChange();
    }

    _bindPartEvents(part) {
        const wrap = part.el;

        // ลากย้ายอุปกรณ์
        wrap.addEventListener('mousedown', (e) => {
            if (e.target.classList && e.target.classList.contains('cc-pin')) return; // ขา = ต่อสาย ไม่ใช่ลาก
            if (this.opts.readonly) return;
            e.preventDefault();
            const startX = e.clientX, startY = e.clientY;
            const origX = part.x, origY = part.y;
            wrap.style.cursor = 'grabbing';
            wrap.style.zIndex = '3';

            const onMove = (ev) => {
                part.x = Math.max(0, origX + (ev.clientX - startX));
                part.y = Math.max(0, origY + (ev.clientY - startY));
                wrap.style.left = part.x + 'px';
                wrap.style.top = part.y + 'px';
                this._updatePinDots(part);
                this._redrawWiresOf(part.id);
            };
            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                wrap.style.cursor = 'grab';
                wrap.style.zIndex = '2';
                this._emitChange();
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });

        // ดับเบิลคลิก = ลบอุปกรณ์
        wrap.addEventListener('dblclick', (e) => {
            if (this.opts.readonly) return;
            e.preventDefault();
            if (confirm('ลบอุปกรณ์ ' + part.type.replace('wokwi-', '') + ' นี้? (สายไฟที่ต่ออยู่จะถูกลบด้วย)')) {
                this.removePart(part.id);
            }
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

    _buildPinDots(part) {
        part.pinDots.forEach(d => d.remove());
        part.pinDots = [];
        const pins = this._getPinInfo(part);
        pins.forEach(pin => {
            const dot = document.createElement('div');
            dot.className = 'cc-pin';
            dot.title = pin.name;
            dot.dataset.pin = pin.name;
            dot.style.cssText = 'position:absolute; width:11px; height:11px; border-radius:50%;' +
                'background:rgba(41,128,185,0.25); border:1.5px solid rgba(41,128,185,0.6);' +
                'transform:translate(-50%,-50%); cursor:crosshair; z-index:4;' +
                'left:' + pin.x + 'px; top:' + pin.y + 'px;';
            dot.addEventListener('mouseenter', () => { dot.style.background = '#f1c40f'; dot.style.borderColor = '#d4ac0d'; });
            dot.addEventListener('mouseleave', () => { dot.style.background = 'rgba(41,128,185,0.25)'; dot.style.borderColor = 'rgba(41,128,185,0.6)'; });
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.opts.readonly) return;
                this._onPinClick(part, pin.name);
            });
            part.el.appendChild(dot);
            part.pinDots.push(dot);
        });
    }

    _updatePinDots(part) { /* จุดขาอยู่ใน wrapper — ย้ายตามอัตโนมัติ */ }

    /** พิกัดขาเทียบกับ container */
    _pinAbs(partId, pinName) {
        const part = this.parts.find(p => p.id === partId);
        if (!part) return null;
        const pin = this._getPinInfo(part).find(p => p.name === pinName);
        if (!pin) return null;
        return { x: part.x + pin.x, y: part.y + pin.y };
    }

    /* ---------------------------------------------------------- wires --- */

    _onPinClick(part, pinName) {
        const abs = this._pinAbs(part.id, pinName);
        if (!abs) return;
        if (!this.pendingWire) {
            // เริ่มลากสาย
            this.pendingWire = { part: part.id, pin: pinName, x: abs.x, y: abs.y };
            this.tempLine.style.display = 'block';
            this._updateTempLine(abs.x, abs.y);
        } else {
            // จบสาย — กันต่อขาเดียวกัน/อุปกรณ์+ขาเดิม
            if (this.pendingWire.part === part.id && this.pendingWire.pin === pinName) {
                this._cancelPendingWire();
                return;
            }
            this.addWire(this.pendingWire.part, this.pendingWire.pin, part.id, pinName);
            this._cancelPendingWire();
        }
    }

    addWire(fromPart, fromPin, toPart, toPin, color) {
        // กันสายซ้ำ
        const dup = this.wires.some(w =>
            (w.from.part === fromPart && w.from.pin === fromPin && w.to.part === toPart && w.to.pin === toPin) ||
            (w.from.part === toPart && w.from.pin === toPin && w.to.part === fromPart && w.to.pin === fromPin));
        if (dup) return null;

        const wire = {
            id: 'w' + (this.nextWireId++),
            from: { part: fromPart, pin: fromPin },
            to: { part: toPart, pin: toPin },
            color: color || WIRE_COLORS[(this.wires.length) % WIRE_COLORS.length],
            path: null
        };
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('stroke', wire.color);
        path.setAttribute('stroke-width', '3');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        path.style.pointerEvents = 'stroke';
        path.style.cursor = 'pointer';
        path.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.opts.readonly) return;
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
        this._removeWireEl(this.wires[idx]);
        this.wires.splice(idx, 1);
        if (this.selectedWireId === wireId) this.selectedWireId = null;
        this._emitChange();
    }

    _removeWireEl(wire) {
        if (wire.path) wire.path.remove();
    }

    _selectWire(wireId) {
        this.selectedWireId = (this.selectedWireId === wireId) ? null : wireId;
        this.wires.forEach(w => {
            w.path.setAttribute('stroke-width', w.id === this.selectedWireId ? '5' : '3');
            w.path.setAttribute('stroke-opacity', w.id === this.selectedWireId ? '1' : '0.9');
        });
    }

    _drawWire(wire) {
        const a = this._pinAbs(wire.from.part, wire.from.pin);
        const b = this._pinAbs(wire.to.part, wire.to.pin);
        if (!a || !b || !wire.path) return;
        // เส้นโค้งเบซิเยร์เบาๆ อ่านง่ายกว่าเส้นตรง
        const mx = (a.x + b.x) / 2;
        const bend = Math.min(40, Math.abs(b.x - a.x) * 0.3 + 10);
        wire.path.setAttribute('d',
            'M ' + a.x + ' ' + a.y +
            ' C ' + (a.x + bend) + ' ' + a.y + ', ' + (b.x - bend) + ' ' + b.y +
            ', ' + b.x + ' ' + b.y);
    }

    _redrawWiresOf(partId) {
        this.wires.forEach(w => {
            if (w.from.part === partId || w.to.part === partId) this._drawWire(w);
        });
    }

    redrawAll() {
        this.wires.forEach(w => this._drawWire(w));
    }

    _updateTempLine(toX, toY) {
        if (!this.pendingWire) return;
        const a = this.pendingWire;
        this.tempLine.setAttribute('d', 'M ' + a.x + ' ' + a.y + ' L ' + toX + ' ' + toY);
    }

    _cancelPendingWire() {
        this.pendingWire = null;
        this.tempLine.style.display = 'none';
    }

    _bindGlobalEvents() {
        // เส้นชั่วคราวตามเมาส์
        this.container.addEventListener('mousemove', (e) => {
            if (!this.pendingWire) return;
            const rect = this.container.getBoundingClientRect();
            this._updateTempLine(e.clientX - rect.left, e.clientY - rect.top);
        });
        // คลิกพื้นว่าง = ยกเลิกสายค้าง + ยกเลิกเลือกสาย
        this.container.addEventListener('click', (e) => {
            if (e.target === this.container || e.target === this.svg) {
                this._cancelPendingWire();
                if (this.selectedWireId) this._selectWire(this.selectedWireId);
            }
        });
        // ESC ยกเลิกสายค้าง / Delete ลบสายที่เลือก
        this._keyHandler = (e) => {
            if (e.key === 'Escape') this._cancelPendingWire();
            if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedWireId) {
                const tag = (document.activeElement && document.activeElement.tagName) || '';
                if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
                    e.preventDefault();
                    this.removeWire(this.selectedWireId);
                }
            }
        };
        document.addEventListener('keydown', this._keyHandler);
    }

    /* ----------------------------------------------------- save / load --- */

    toJSON() {
        return {
            version: 1,
            parts: this.parts.map(p => ({ id: p.id, type: p.type, x: Math.round(p.x), y: Math.round(p.y), attrs: p.attrs || {} })),
            wires: this.wires.map(w => ({ from: { part: w.from.part, pin: w.from.pin }, to: { part: w.to.part, pin: w.to.pin }, color: w.color }))
        };
    }

    async loadJSON(data) {
        this.clear();
        if (!data || !Array.isArray(data.parts)) return;
        for (const p of data.parts) {
            await this.addPart(p.type, p.x, p.y, p.attrs || {}, p.id);
        }
        (data.wires || []).forEach(w => {
            this.addWire(w.from.part, w.from.pin, w.to.part, w.to.pin, w.color);
        });
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
    }

    destroy() {
        document.removeEventListener('keydown', this._keyHandler);
        this.clear();
        this.svg.remove();
    }
}

/** สร้างแถบ palette ปุ่มอุปกรณ์ให้ container ที่กำหนด แล้วผูกกับ canvas */
function buildCircuitPalette(paletteEl, canvas) {
    paletteEl.innerHTML = '';
    paletteEl.style.cssText += ';display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px;';
    CIRCUIT_PARTS_CATALOG.forEach(item => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = item.icon + ' ' + item.label;
        btn.style.cssText = 'padding:6px 12px; border:1px solid #b0bec5; border-radius:6px; background:#fff; cursor:pointer; font-size:0.85rem;';
        btn.addEventListener('mouseenter', () => btn.style.background = '#e3f2fd');
        btn.addEventListener('mouseleave', () => btn.style.background = '#fff');
        btn.addEventListener('click', async () => {
            // วางเยื้องกันทับกัน
            const n = canvas.parts.length;
            await canvas.addPart(item.type, 30 + (n % 5) * 90, 30 + Math.floor(n / 5) * 90, item.attrs ? { ...item.attrs } : {});
        });
        paletteEl.appendChild(btn);
    });
}

if (typeof window !== 'undefined') {
    window.CircuitCanvas = CircuitCanvas;
    window.buildCircuitPalette = buildCircuitPalette;
    window.CIRCUIT_PARTS_CATALOG = CIRCUIT_PARTS_CATALOG;
}
