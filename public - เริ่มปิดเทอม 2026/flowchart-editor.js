let flowchartState = {
    symbols: [],           // เก็บข้อมูล symbols ทั้งหมด
    connections: [],       // เก็บข้อมูลเส้นเชื่อม
    selectedElement: null, // element ที่กำลังเลือก
    isDragging: false,     // สถานะการลาก
    isConnecting: false,   // สถานะการวาดเส้นเชื่อม
    startPoint: null,      // จุดเริ่มต้นของเส้นเชื่อม
    bendPoints: [],         // จุดดัดของเส้นเชื่อม
    arrowBendPoints: [],      // เปลี่ยนจาก bendPoints เป็น arrowBendPoints
    isDraggingBendPoint: false,
    activeBendPoint: null
};

class FlowchartEditor {
    #state;  // private state
    #tempBendPoints = [];  // เพิ่มตัวแปรใหม่ในระดับ class

    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

        // เพิ่มส่วนนี้เพื่อให้ SVG ขยายเต็มพื้นที่ container
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', '100%');
        this.svg.style.position = 'absolute';
        this.svg.style.top = '0';
        this.svg.style.left = '0';
        this.svg.style.right = '0';
        this.svg.style.bottom = '0';

        // ตั้งค่า container
        this.container.style.position = 'relative';
        this.container.style.width = '100%';
        this.container.style.height = '600px'; // หรือขนาดที่ต้องการ
        this.container.style.border = '1px solid #ccc';
        this.container.style.overflow = 'hidden';

        // เพิ่มพื้นหลังให้กับ SVG
        const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        background.setAttribute('width', '100%');
        background.setAttribute('height', '100%');
        background.setAttribute('fill', 'white');
        this.svg.appendChild(background);

        this.container.appendChild(this.svg);
        this.createConnectionPointStyles();

        // กำหนดค่าเริ่มต้นของ state
        this.#state = {
            symbols: [],
            connections: [],
            isConnecting: false,
            isDragging: false,
            currentTool: null,
            selectedElement: null,
            isDrawingArrow: false,
            arrowPath: [],    // เก็บจุดทั้งหมดของ arrow
            tempArrow: null,   // element ชั่วคราวสำหรับแสดง arrow
            arrowBendPoints: [],
        };
        this.updateState = (newState) => {
            this.#state = {
                ...this.#state,
                ...newState
            };
            console.log('State updated:++', this.#state);
        };

        // Initialize
        this.createArrowMarker();
        this.initEventListeners();
        this.initDragAndDrop();
    }
    setState(newState) {
        // สร้าง state ใหม่
        const nextState = { ...this.#state };
    
        // ถ้ามีการส่ง connections มาเป็น array ว่าง ให้ล้าง bendPoints ด้วย
        if (newState.connections && newState.connections.length === 0) {
            nextState.arrowBendPoints = [];
            nextState.tempBendPoints = [];
            nextState.bendPoints = [];
            nextState.activeBendPoint = null;
            nextState.isDrawingArrow = false;
            nextState.arrowPath = [];
            nextState.arrowStartPoint = null;
        }
    
        // อัพเดต state ด้วยค่าใหม่
        this.#state = {
            ...nextState,
            ...newState
        };
    
        console.log('State updated:+', this.#state);
    }

    get isConnecting() {
        return this.#state.isConnecting;
    }
    get currentTool() {
        return this.#state.currentTool;
    }



    cancelArrowDrawing() {
        if (this.tempArrow) {
            this.tempArrow.remove();
            this.tempArrow = null;
        }

        // ลบ class drawing-arrow
        this.svg.classList.remove('drawing-arrow');

        this.setState({
            isDrawingArrow: false,
            arrowPath: [],
            arrowStartPoint: null,
            arrowBendPoints: []
        });
    }

    createConnectionPointStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .connection-point {
                opacity: 0;
                transition: all 0.2s ease;
                cursor: default;
            }
            
            /* เพิ่ม hit area ให้กับจุดเชื่อมต่อ */
            .connection-point-area {
                fill: transparent;
                stroke: transparent;
                r: 12;  /* พื้นที่สำหรับ hit area ใหญ่กว่าจุดที่มองเห็น */
                cursor: pointer;
            }
    
            .drawing-arrow .connection-point-area {
                pointer-events: all;
            }
    
            /* จุดที่มองเห็น */
            .connection-point-visible {
                r: 5;
                fill: #4CAF50;
                transition: all 0.2s ease;
            }
    
            .drawing-arrow .connection-point-visible {
                opacity: 1;
            }
    
            /* hover effects */
            .connection-point-area:hover + .connection-point-visible {
                r: 8;
                fill: #2196F3;
                filter: drop-shadow(0 0 3px rgba(33, 150, 243, 0.6));
                opacity: 1;
            }
    
            /* สถานะ active */
            .drawing-arrow .connection-point-area:hover + .connection-point-visible {
                r: 8;
                fill: #2196F3;
                stroke: white;
                stroke-width: 2;
                opacity: 1;
            }
            .arrow-bend-point {
                transition: opacity 0.3s ease;
                opacity: 1;
            }

            .arrow-bend-point.fade-out {
                opacity: 0;
            }    
            /* เมื่อใช้ delete tool และ hover ที่ bendpoint */
            .using-delete-tool .arrow-bend-point:hover {
                fill: #dc3545;  /* สีแดง */
                cursor: pointer;
                r: 6;  /* ขยายขนาดเล็กน้อย */
            }
        `;
        document.head.appendChild(style);
    }
    initDragAndDrop() {
        const toolButtons = document.querySelectorAll('.tool-btn[draggable="true"]');
        toolButtons.forEach(btn => {
            btn.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('symbol-type', btn.dataset.type);
                e.dataTransfer.effectAllowed = 'copy';
            });
        });

        this.svg.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        this.svg.addEventListener('drop', (e) => {
            e.preventDefault();
            const symbolType = e.dataTransfer.getData('symbol-type');
            if (symbolType) {
                const rect = this.svg.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                this.createSymbol(symbolType, x, y);
            }
        });
    }


    addConnectionPoints(symbol) {
        const points = [
            { x: 0, y: -25, position: 'top' },
            { x: 50, y: 0, position: 'right' },
            { x: 0, y: 25, position: 'bottom' },
            { x: -50, y: 0, position: 'left' }
        ];

        const pointsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        pointsGroup.setAttribute('class', 'connection-points');

        points.forEach(point => {
            // สร้าง group สำหรับแต่ละจุดเชื่อมต่อ
            const pointGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
            pointGroup.setAttribute('class', `connection-point-group ${point.position}`);

            // สร้าง hit area (พื้นที่สำหรับ interaction)
            const hitArea = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            hitArea.setAttribute('class', 'connection-point-area');
            hitArea.setAttribute('cx', point.x.toString());
            hitArea.setAttribute('cy', point.y.toString());

            // สร้างจุดที่มองเห็น
            const visiblePoint = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            visiblePoint.setAttribute('class', 'connection-point connection-point-visible');
            visiblePoint.setAttribute('cx', point.x.toString());
            visiblePoint.setAttribute('cy', point.y.toString());

            // Event handlers
            pointGroup.addEventListener('mousedown', (e) => {
                if (this.currentTool === 'arrow') {
                    e.stopPropagation();
                    this.startConnection(symbol, point, visiblePoint);
                }
            });

            // ลด throttle การเปลี่ยน cursor
            let cursorTimeout;
            pointGroup.addEventListener('mouseover', () => {
                if (this.currentTool === 'arrow' || this.isConnecting) {
                    clearTimeout(cursorTimeout);
                    cursorTimeout = setTimeout(() => {
                        hitArea.style.cursor = 'pointer';
                    }, 50);
                }
            });

            pointGroup.addEventListener('mouseout', () => {
                clearTimeout(cursorTimeout);
                hitArea.style.cursor = 'default';
            });

            // เพิ่ม elements เข้าไปใน group
            pointGroup.appendChild(hitArea);
            pointGroup.appendChild(visiblePoint);
            pointsGroup.appendChild(pointGroup);
        });

        symbol.appendChild(pointsGroup);
    }
    // Symbol creation and management
    createSymbol(type, x, y, existingId = null) {  // เพิ่ม parameter existingId
        const symbolId = existingId || `symbol-${Date.now()}`; // ใช้ ID เดิมถ้ามี
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute('class', 'flowchart-symbol');
        g.setAttribute('transform', `translate(${x},${y})`);
        g.setAttribute('data-type', type);
        g.setAttribute('id', symbolId);

        // Create shape
        const shape = this.createShape(type);
        if (shape) {
            g.appendChild(shape);

            // Add text element
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.textContent = 'คลิกเพื่อแก้ไข';
            g.appendChild(text);

            // เก็บข้อมูลใน state
            const symbolData = {
                id: symbolId,
                type: type,
                x: x,
                y: y,
                text: ''  // เริ่มต้นด้วยค่าว่าง เพราะ 'คลิกเพื่อแก้ไข' เป็นแค่ placeholder
            };

            // Add connection points และ event handlers
            this.addConnectionPoints(g);
            this.makeSymbolDraggable(g);
            g.addEventListener('dblclick', () => this.editSymbolText(g));

            this.svg.appendChild(g);

            // อัพเดท state
            this.setState({
                symbols: [...this.#state.symbols, symbolData]
            });

            console.log('Symbol created:', {
                id: symbolId,
                existingId: existingId,
                state: this.#state.symbols
            });

            return g;
        }
        return null;
    }

    createShape(type) {
        let shape;
        switch (type) {
            case 'start-end':
                shape = this.createTerminator(100, 50);
                break;
            case 'process':
                shape = this.createRect(100, 50);
                break;
            case 'decision':
                shape = this.createDiamond(80);
                break;
            case 'input-output':
                shape = this.createParallelogram(100, 50);
                break;
            case 'manual-input':  // เพิ่มกรณีนี้
                shape = this.createManualInput(100, 50);
                break;
            case 'display':
                shape = this.createDisplay(100, 50);
                break;
            case 'document':    // เพิ่ม case สำหรับ document
                shape = this.createDocument(100, 50);
                break;
            case 'data-storage':
                shape = this.createDataStorage(100, 50);
                break;
            case 'connector':
                shape = this.createCircle(15);
                break;
            default:
                console.warn(`Unknown shape type: ${type}`);
                return null;
        }

        if (shape) {
            this.setBasicShapeAttributes(shape);
        }
        return shape;
    }

    // Shape creation methods
    createTerminator(width, height) {
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute('x', -width / 2);
        rect.setAttribute('y', -height / 2);
        rect.setAttribute('width', width);
        rect.setAttribute('height', height);
        rect.setAttribute('rx', height / 2);
        this.setBasicShapeAttributes(rect);
        return rect;
    }
    createManualInput(width, height) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const skewTop = height * 0.3;  // ความเอียงด้านบน

        // สร้างเส้นทางสำหรับ manual input
        const d = `M ${-width / 2},${-height / 2 + skewTop}  
                   L ${width / 2},${-height / 2}  
                   L ${width / 2},${height / 2}  
                   L ${-width / 2},${height / 2} 
                   Z`;

        path.setAttribute('d', d);
        return path;
    }
    createDocument(width, height) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const curveHeight = height * 0.15; // ความสูงของคลื่นด้านล่าง

        // สร้างเส้นทางสำหรับเอกสาร:
        // - เริ่มจากมุมบนซ้าย
        // - วาดสี่เหลี่ยมปกติ แต่ด้านล่างเป็นเส้นโค้ง
        const d = `M ${-width / 2},${-height / 2}  
                   L ${width / 2},${-height / 2}   
                   L ${width / 2},${height / 2 - curveHeight}
                   C ${width / 4},${height / 2 + curveHeight},
                     ${-width / 4},${height / 2 + curveHeight},
                     ${-width / 2},${height / 2 - curveHeight}
                   Z`;

        path.setAttribute('d', d);
        return path;
    }
    createRect(width, height) {
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute('x', -width / 2);
        rect.setAttribute('y', -height / 2);
        rect.setAttribute('width', width);
        rect.setAttribute('height', height);
        this.setBasicShapeAttributes(rect);
        return rect;
    }

    createDiamond(size) {
        const diamond = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        const points = `0,-${size / 2} ${size / 2},0 0,${size / 2} -${size / 2},0`;
        diamond.setAttribute('points', points);
        this.setBasicShapeAttributes(diamond);
        return diamond;
    }

    createParallelogram(width, height) {
        const parallelogram = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        const skew = width * 0.2;  // ระยะเอียงของ parallelogram

        // กำหนดจุดทั้ง 4 มุมของ parallelogram
        const points = [
            [-width / 2 + skew, -height / 2],  // บนซ้าย
            [width / 2 + skew, -height / 2],   // บนขวา
            [width / 2 - skew, height / 2],    // ล่างขวา
            [-width / 2 - skew, height / 2]    // ล่างซ้าย
        ].map(point => point.join(',')).join(' ');

        parallelogram.setAttribute('points', points);
        return parallelogram;
    }

    createDisplay(width, height) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const curveDepth = width * 0.15; // ความลึกของส่วนโค้ง

        // สร้างเส้นทางใหม่ที่ถูกต้อง:
        // - เริ่มจากมุมบนซ้าย
        // - ไปมุมบนขวาโดยมีส่วนโค้ง
        // - ลงมาด้านล่างตรง
        // - ไปซ้ายตรง
        // - ขึ้นไปจุดเริ่มต้น
        const d = `M ${-width / 2},${-height / 2}          
               L ${width / 2 - curveDepth},${-height / 2}
               Q ${width / 2},${-height / 2} ${width / 2},0
               Q ${width / 2},${height / 2} ${width / 2 - curveDepth},${height / 2}
               L ${-width / 2},${height / 2} 
               Z`;

        path.setAttribute('d', d);
        return path;
    }

    createDataStorage(width, height) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const arcWidth = width * 0.15;
        const d = `M ${-width / 2} ${-height / 2}
                   Q ${-width / 2 + arcWidth} ${-height / 2} ${-width / 2 + arcWidth} 0
                   Q ${-width / 2 + arcWidth} ${height / 2} ${-width / 2} ${height / 2}
                   L ${width / 2} ${height / 2}
                   Q ${width / 2 + arcWidth} ${height / 2} ${width / 2 + arcWidth} 0
                   Q ${width / 2 + arcWidth} ${-height / 2} ${width / 2} ${-height / 2}
                   L ${-width / 2} ${-height / 2}`;
        path.setAttribute('d', d);
        return path;
    }

    createDocument(width, height) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const curve = height * 0.2;
        const d = `M${-width / 2},-${height / 2} h${width} v${height - curve} c${-width / 4},${curve} ${-width * 3 / 4},${curve} ${-width},0 z`;
        path.setAttribute('d', d);
        this.setBasicShapeAttributes(path);
        return path;
    }

    createCircle(radius) {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute('r', radius);
        this.setBasicShapeAttributes(circle);
        return circle;
    }

    setBasicShapeAttributes(shape) {
        shape.setAttribute('fill', 'white');
        shape.setAttribute('stroke', 'black');
        shape.setAttribute('stroke-width', '2');
        shape.setAttribute('pointer-events', 'all');
    }




    // Helper method สำหรับเริ่มต้นการเชื่อมต่อ
    startConnection(sourcePoint) {
        if (!sourcePoint) return;

        const sourceBounds = sourcePoint.getBoundingClientRect();
        const svgBounds = document.querySelector('#flowchartCanvas svg').getBoundingClientRect();

        // จำลองการคลิกที่จุดเริ่มต้น
        const clickEvent = new MouseEvent('mousedown', {
            bubbles: true,
            clientX: sourceBounds.left + sourceBounds.width / 2 - svgBounds.left,
            clientY: sourceBounds.top + sourceBounds.height / 2 - svgBounds.top
        });

        sourcePoint.dispatchEvent(clickEvent);
    }


    handleConnectionClick = (e) => {
        if (!this.isConnecting) return;

        // ไม่สร้างจุดดัดถ้าคลิกที่จุดเชื่อมต่อ
        const targetElement = document.elementFromPoint(e.clientX, e.clientY);
        if (targetElement.classList.contains('connection-point')) return;

        const rect = this.svg.getBoundingClientRect();
        const point = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        // ใช้ชื่อตัวแปรใหม่
        this.setState({
            arrowBendPoints: [...this.#state.arrowBendPoints, point]
        });

        this.createBendPoint(point);
    }
    createBendPoint(point) {
        const bendPoint = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        bendPoint.setAttribute('class', 'arrow-bend-point');
        bendPoint.setAttribute('cx', point.x);
        bendPoint.setAttribute('cy', point.y);
        bendPoint.setAttribute('r', '4');
        
        // กำหนด style ให้ชัดเจน
        bendPoint.style.fill = '#4CAF50';
        bendPoint.style.stroke = '#fff';
        bendPoint.style.strokeWidth = '2';
        bendPoint.style.opacity = '1';
        bendPoint.style.transition = 'opacity 0.3s ease';
    
        this.makeBendPointDraggable(bendPoint);
        this.svg.appendChild(bendPoint);
        return bendPoint;
    }
    makeBendPointDraggable(bendPoint) {
        let isDragging = false;

        bendPoint.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            isDragging = true;
            this.setState({
                isDraggingBendPoint: true,
                activeBendPoint: bendPoint // ใช้ชื่อใหม่
            });

            const moveHandler = (moveEvent) => {
                if (!isDragging) return;

                const rect = this.svg.getBoundingClientRect();
                const x = moveEvent.clientX - rect.left;
                const y = moveEvent.clientY - rect.top;

                bendPoint.setAttribute('cx', x);
                bendPoint.setAttribute('cy', y);

                // อัพเดตตำแหน่งในรายการจุดดัด
                const index = Array.from(this.svg.querySelectorAll('.arrow-bend-point'))
                    .indexOf(bendPoint);
                if (index !== -1) {
                    const newBendPoints = [...this.#state.arrowBendPoints];
                    newBendPoints[index] = { x, y };
                    this.setState({ arrowBendPoints: newBendPoints });
                }

                this.updateConnectionPath();
            };

            const upHandler = () => {
                isDragging = false;
                this.setState({
                    isDraggingBendPoint: false,
                    activeBendPoint: null
                });
                document.removeEventListener('mousemove', moveHandler);
                document.removeEventListener('mouseup', upHandler);
            };

            document.addEventListener('mousemove', moveHandler);
            document.addEventListener('mouseup', upHandler);
        });
    }
    createPathWithBendPoints(points) {

        if (!points || points.length < 2) return '';

        // กรองจุดที่ valid เท่านั้น
        const validPoints = points.filter(point =>
            point && typeof point.x === 'number' && typeof point.y === 'number'
        );

        if (validPoints.length < 2) return '';

        let pathData = `M ${validPoints[0].x},${validPoints[0].y}`;

        // สร้างเส้นตรงผ่านทุกจุด
        for (let i = 1; i < validPoints.length; i++) {
            pathData += ` L ${validPoints[i].x},${validPoints[i].y}`;
        }

        return pathData;
    }
    handlePathClick = (e) => {
        if (!this.isConnecting) return;

        const targetElement = document.elementFromPoint(e.clientX, e.clientY);
        if (targetElement.classList.contains('connection-point')) {
            // ถ้าคลิกที่จุดเชื่อมต่อปลายทาง
            this.createConnection(targetElement);
        } else {
            // เพิ่มจุดดัด
            const rect = this.svg.getBoundingClientRect();
            const point = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            this.setState({
                arrowBendPoints: [...this.#state.arrowBendPoints, point]
            });
        }
    }

    handleMouseMove = (e) => {
        if (!this.isConnecting || !this.tempLine) return;

        const rect = this.svg.getBoundingClientRect();
        const currentPoint = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };

        const startPos = this.getConnectionPointPosition(this.#state.sourcePoint.circle);
        const points = [startPos, ...this.#state.arrowBendPoints, currentPoint];
        const pathData = this.createPathWithBendPoints(points);
        this.tempLine.setAttribute('d', pathData);
    }

    handleMouseUp = (e) => {
        if (this.isConnecting) {
            const targetElement = document.elementFromPoint(e.clientX, e.clientY);
            const connectionPoint = targetElement?.closest('.connection-point');

            if (connectionPoint && connectionPoint.parentElement !== this.#state.sourceSymbol) {
                this.createConnection(connectionPoint);
            }

            this.cancelConnection();
        }
    }
    // Initialize methods
    initEventListeners() {
        // จัดการ tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                document.querySelectorAll('.tool-btn').forEach(b => {
                    b.classList.remove('active');
                });

                e.currentTarget.classList.add('active');
                this.setState({ currentTool: type });

                
                // จัดการ cursor และ class ตาม tool
                switch (type) {
                    case 'move':
                        this.svg.style.cursor = 'move';
                        this.svg.classList.remove('using-arrow-tool');
                        this.svg.classList.remove('using-delete-tool');
                        this.svg.classList.remove('drawing-arrow');
                        break;
                    case 'arrow':
                        this.svg.style.cursor = 'default';
                        this.svg.classList.add('using-arrow-tool');
                        this.svg.classList.remove('using-delete-tool');
                        break;
                    case 'delete':
                        this.svg.style.cursor = 'pointer';
                        this.svg.classList.remove('using-arrow-tool');
                        this.svg.classList.add('using-delete-tool');
                        this.svg.classList.remove('drawing-arrow');
                        break;
                    default:
                        this.svg.style.cursor = 'default';
                        this.svg.classList.remove('using-arrow-tool');
                        this.svg.classList.remove('using-delete-tool');
                        this.svg.classList.remove('drawing-arrow');
                }
            });
        });

        // จัดการการคลิกบน SVG
        this.svg.addEventListener('click', (e) => {
            if (this.currentTool === 'arrow') {
                const targetElement = document.elementFromPoint(e.clientX, e.clientY);
                const connectionPointGroup = targetElement?.closest('.connection-point-group');
                const isConnectionPoint = !!connectionPointGroup;

                if (!this.#state.isDrawingArrow) {
                    // เริ่มวาด arrow
                    if (isConnectionPoint) {
                        const symbol = connectionPointGroup.closest('.flowchart-symbol');
                        if (!symbol) return;

                        // หาจุดที่มองเห็นจาก group
                        const visiblePoint = connectionPointGroup.querySelector('.connection-point-visible');
                        if (!visiblePoint) return;

                        // คำนวณตำแหน่งจริงของจุดเริ่มต้น
                        const startPoint = {
                            x: parseFloat(visiblePoint.getAttribute('cx')),
                            y: parseFloat(visiblePoint.getAttribute('cy'))
                        };

                        // คำนวณ offset จาก transform ของ symbol
                        const symbolTransform = symbol.getAttribute('transform');
                        const match = symbolTransform.match(/translate\(([^,]+),([^)]+)\)/);
                        if (match) {
                            startPoint.x += parseFloat(match[1]);
                            startPoint.y += parseFloat(match[2]);
                        }

                        this.setState({
                            isDrawingArrow: true,
                            arrowStartPoint: {
                                symbolId: symbol.id,
                                position: startPoint,
                                pointType: connectionPointGroup.classList[1],
                                element: visiblePoint
                            },
                            arrowBendPoints: []
                        });

                        // สร้างเส้น preview
                        this.tempArrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
                        this.tempArrow.setAttribute('class', 'temp-connection');
                        this.tempArrow.setAttribute('stroke', '#666');
                        this.tempArrow.setAttribute('stroke-width', '2');
                        this.tempArrow.setAttribute('fill', 'none');
                        this.tempArrow.setAttribute('marker-end', 'url(#arrowhead)');

                        this.svg.appendChild(this.tempArrow);
                        this.svg.classList.add('drawing-arrow');
                    }
                } else {
                    if (isConnectionPoint) {
                        const startPoint = this.#state.arrowStartPoint;

                        if (startPoint && targetElement !== startPoint.element) {
                            console.log('Stored bend points before connection:', this.#tempBendPoints);

                            const connection = this.createConnection(targetElement, this.#tempBendPoints);

                            if (connection) {
                                this.promptConnectionText(connection);
                            }

                            if (this.tempArrow) {
                                this.tempArrow.remove();
                                this.tempArrow = null;
                            }

                            this.setState({
                                isDrawingArrow: false,
                                arrowPath: [],
                                arrowStartPoint: null,
                                arrowBendPoints: this.#tempBendPoints
                            });

                            // รีเซ็ต temp points หลังใช้งาน
                            this.#tempBendPoints = [];
                            this.svg.classList.remove('drawing-arrow');
                        }
                    } else {
                        // เพิ่มจุดดัด
                        const rect = this.svg.getBoundingClientRect();
                        const point = {
                            x: e.clientX - rect.left,
                            y: e.clientY - rect.top
                        };

                        // เพิ่มจุดใหม่เข้าไปใน tempBendPoints
                        this.#tempBendPoints.push(point);
                        console.log('Updated temp bend points:', this.#tempBendPoints);

                        // สร้างจุดดัดที่มองเห็นได้
                        this.createBendPoint(point);
                    }
                }
                return;
            }

            // จัดการ delete tool
            // จัดการ delete tool
if (this.currentTool === 'delete') {
    const clickedElement = e.target;
    
    // เพิ่มเช็ค bendpoint
    if (clickedElement.classList.contains('arrow-bend-point')) {
        if (confirm('คุณต้องการลบจุดหักเลี้ยวนี้หรือไม่?')) {
            clickedElement.remove();
            // อัพเดต state หรือ path ถ้าจำเป็น
            this.updateConnectionPath();
        }
        return;
    }

    const connectionGroup = clickedElement.closest('.connection-group');
    if (connectionGroup &&
        (clickedElement.classList.contains('connection') ||
            clickedElement.classList.contains('connection-hitbox'))) {
        if (confirm('คุณต้องการลบเส้นเชื่อมต่อนี้หรือไม่?')) {
            connectionGroup.remove();
            this.setState({
                connections: this.#state.connections.filter(conn =>
                    conn.id !== connectionGroup.id
                )
            });
        }
        return;
    }

    const symbol = clickedElement.closest('.flowchart-symbol');
    if (symbol) {
        if (confirm('คุณต้องการลบสัญลักษณ์นี้หรือไม่? (เส้นเชื่อมต่อที่เกี่ยวข้องจะถูกลบด้วย)')) {
            this.deleteSymbolWithConnections(symbol);
        }
    }
}
        });

        // จัดการ mousemove สำหรับ preview arrow
        let mouseMoveThrottle;
        this.svg.addEventListener('mousemove', (e) => {
            if (!this.#state.isDrawingArrow || !this.tempArrow) return;

            const rect = this.svg.getBoundingClientRect();
            const currentPoint = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };

            // อัพเดต preview
            const points = [
                this.#state.arrowStartPoint.position,
                ...this.#state.arrowBendPoints,
                currentPoint
            ];
            const pathData = this.createPathWithBendPoints(points);
            this.tempArrow.setAttribute('d', pathData);

            // ลด throttle การเปลี่ยน cursor
            if (mouseMoveThrottle) {
                clearTimeout(mouseMoveThrottle);
            }

            mouseMoveThrottle = setTimeout(() => {
                const targetElement = document.elementFromPoint(e.clientX, e.clientY);
                const isConnectionPoint = targetElement?.closest('.connection-point-group');

                if (isConnectionPoint) {
                    this.svg.style.cursor = 'pointer';
                } else {
                    this.svg.style.cursor = 'default';
                }
            }, 50);
        });

        // จัดการการกด ESC เพื่อยกเลิกการวาด
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.#state.isDrawingArrow) {
                this.cancelArrowDrawing();
                this.svg.classList.remove('drawing-arrow');
            }
        });
    }

    createConnection(targetElement, providedBendPoints = []) {
        console.log('createConnection received bendPoints:', providedBendPoints);
    
        // STEP 1: Validation checks and initialization
        if (!targetElement || !this.#state.arrowStartPoint) {
            console.error('Missing required data for connection');
            return null;
        }
    
        // STEP 2: Find required DOM elements
        const targetGroup = targetElement.closest('.connection-point-group');
        const targetSymbol = targetElement.closest('.flowchart-symbol');
        const sourceSymbol = document.getElementById(this.#state.arrowStartPoint.symbolId);
    
        if (!targetGroup || !targetSymbol || !sourceSymbol) {
            console.error('Missing required elements for connection');
            return null;
        }
    
        // STEP 3: Create SVG group for connection
        const connectionId = `conn-${Date.now()}`;
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute('class', 'connection-group');
        g.setAttribute('id', connectionId);
        g.setAttribute('data-source', this.#state.arrowStartPoint.symbolId);
        g.setAttribute('data-target', targetSymbol.id);
        g.setAttribute('data-source-point', this.#state.arrowStartPoint.pointType);
        g.setAttribute('data-target-point', targetGroup.classList[1]);
        
        // เพิ่ม data attribute สำหรับ bendPoints
        g.setAttribute('data-bend-points', JSON.stringify(providedBendPoints));
    
        // STEP 4: Create main connection path
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute('class', 'connection');
        path.setAttribute('stroke', '#333');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        path.setAttribute('marker-end', 'url(#arrowhead)');
    
        // STEP 5: Create invisible hitbox for better interaction
        const hitbox = document.createElementNS("http://www.w3.org/2000/svg", "path");
        hitbox.setAttribute('class', 'connection-hitbox');
        hitbox.setAttribute('stroke', 'transparent');
        hitbox.setAttribute('stroke-width', '10');
        hitbox.setAttribute('fill', 'none');
    
        // STEP 6: Calculate connection points
        const sourcePoint = this.#state.arrowStartPoint.element;
        const startPos = this.getConnectionPointPosition(sourcePoint);
        const endPos = this.getConnectionPointPosition(targetElement);
    
        if (!startPos || !endPos) {
            console.error('Invalid connection points');
            return null;
        }
    
        // STEP 7: Create path with bend points
        const points = [startPos, ...providedBendPoints, endPos];
        console.log('Points for creating path:', points);
        const pathData = this.createPathWithBendPoints(points);
        path.setAttribute('d', pathData);
        hitbox.setAttribute('d', pathData);
    
        // STEP 8: Create visible bend points
        const bendPointElements = providedBendPoints.map(point => {
            const bendPoint = this.createBendPoint(point);
            // เก็บ reference ไว้ใน bendPoint
            bendPoint.setAttribute('data-connection-id', connectionId);
            this.makeBendPointDraggable(bendPoint);
            g.appendChild(bendPoint);
            return bendPoint;
        });
    
        // STEP 9: Create text label components
        const midPoint = this.calculateMidPoint(points);
        const textGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        textGroup.setAttribute('class', 'text-group');
    
        // Create text background
        const textBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        textBackground.setAttribute('class', 'text-background');
        textBackground.setAttribute('fill', 'white');
        textBackground.setAttribute('width', '60');
        textBackground.setAttribute('height', '20');
        textBackground.setAttribute('rx', '5');
        textBackground.setAttribute('x', midPoint.x - 30);
        textBackground.setAttribute('y', midPoint.y - 20);
        textBackground.style.display = 'none';
    
        // Create text element
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute('class', 'connection-text');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('x', midPoint.x);
        text.setAttribute('y', midPoint.y - 10);
        text.textContent = '';
    
        // Add double-click handler for text editing
        text.addEventListener('dblclick', (e) => {
            if (this.currentTool !== 'delete') {
                e.stopPropagation();
                this.editConnectionText(text, textBackground);
            }
        });
    
        // STEP 10: Assemble all SVG elements
        textGroup.appendChild(textBackground);
        textGroup.appendChild(text);
        g.appendChild(hitbox);
        g.appendChild(path);
        g.appendChild(textGroup);
    
        // Add to SVG
        this.svg.appendChild(g);
    
        // STEP 11: Create connection data for state
        const connectionData = {
            id: connectionId,
            sourceSymbol: this.#state.arrowStartPoint.symbolId,
            targetSymbol: targetSymbol.id,
            sourcePoint: this.#state.arrowStartPoint.pointType,
            targetPoint: targetGroup.classList[1],
            bendPoints: providedBendPoints,
            text: ''
        };
    
        // STEP 12: Update state
        this.setState({
            connections: [...this.#state.connections, connectionData],
            isDrawingArrow: false,
            arrowPath: [],
            arrowStartPoint: null,
            arrowBendPoints: []
        });
    
        return {
            g,
            text,
            textBackground,
            connectionData,
            bendPointElements,
            path,
            hitbox
        };
    }

    calculateMidPoint(points) {
        if (!points || points.length < 2) return { x: 0, y: 0 };

        const middleIndex = Math.floor(points.length / 2);

        if (points.length % 2 === 0) {
            // สำหรับจำนวนจุดคู่
            const point1 = points[middleIndex - 1];
            const point2 = points[middleIndex];
            return {
                x: (point1.x + point2.x) / 2,
                y: (point1.y + point2.y) / 2
            };
        } else {
            // สำหรับจำนวนจุดคี่
            return { ...points[middleIndex] };
        }
    }

    createConnectionText(startPos, endPos, points) {
        const textBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        textBackground.setAttribute('class', 'text-background');
        textBackground.setAttribute('fill', 'white');
        textBackground.setAttribute('width', '60');
        textBackground.setAttribute('height', '20');
        textBackground.setAttribute('rx', '5');
        textBackground.style.display = 'none';

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute('class', 'connection-text');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.textContent = 'ดับเบิลคลิกเพื่อพิมพ์';

        // คำนวณตำแหน่งข้อความ
        const midPoint = points.length > 2 ?
            this.calculateTextPosition(points) :
            this.calculateTextPosition(startPos, endPos);

        text.setAttribute('x', midPoint.x);
        text.setAttribute('y', midPoint.y - 10);
        textBackground.setAttribute('x', midPoint.x - 30);
        textBackground.setAttribute('y', midPoint.y - 20);

        // เพิ่ม event listener
        text.addEventListener('dblclick', (e) => {
            if (this.currentTool !== 'delete') {
                e.stopPropagation();
                this.editConnectionText(text, textBackground);
            }
        });

        return { text, textBackground };
    }

    // Helper function สำหรับคำนวณตำแหน่งข้อความที่อยู่กลางระหว่างจุดดัด
    calculateTextPosition(points) {
        // ตรวจสอบว่ามี points หรือไม่
        if (!points || !Array.isArray(points) || points.length < 2) {
            // ถ้าไม่มี points ให้ใช้การคำนวณแบบเดิม
            if (arguments.length === 2) {
                const [start, end] = arguments;
                return {
                    x: start.x + (end.x - start.x) / 2,
                    y: start.y + (end.y - start.y) / 2
                };
            }
            return { x: 0, y: 0 };
        }

        // ถ้ามีจุดดัด ให้คำนวณจุดกึ่งกลางของเส้นทาง
        const middleIndex = Math.floor(points.length / 2);

        if (points.length % 2 === 0) {
            // กรณีจำนวนจุดเป็นเลขคู่
            const point1 = points[middleIndex - 1];
            const point2 = points[middleIndex];
            return {
                x: (point1.x + point2.x) / 2,
                y: (point1.y + point2.y) / 2
            };
        } else {
            // กรณีจำนวนจุดเป็นเลขคี่
            const midPoint = points[middleIndex];
            return {
                x: midPoint.x,
                y: midPoint.y
            };
        }
    }



    getState() {
        // ส่งคืนก็อปปี้ของ state เพื่อป้องกันการแก้ไขโดยตรง
        return JSON.parse(JSON.stringify(this.#state));
    }
    editConnectionText(text, textBackground) {
        const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
        const input = document.createElement('input');
        let isEditing = true;

        // ตั้งค่า input
        input.type = 'text';
        input.value = text.textContent || '';
        input.style.width = '100px';
        input.style.height = '20px';
        input.style.border = '1px solid #ccc';
        input.style.borderRadius = '3px';
        input.style.padding = '0 5px';
        input.style.fontSize = '12px';
        input.style.textAlign = 'center';

        // ตั้งค่า foreignObject
        foreignObject.setAttribute('width', '120');
        foreignObject.setAttribute('height', '25');
        foreignObject.setAttribute('x', text.getAttribute('x') - 60);
        foreignObject.setAttribute('y', text.getAttribute('y') - 12);
        foreignObject.appendChild(input);

        // ซ่อนข้อความเดิม
        text.style.display = 'none';
        if (textBackground) textBackground.style.display = 'none';

        text.parentNode.appendChild(foreignObject);
        input.focus();

        const finishEditing = () => {
            if (!isEditing) return;
            isEditing = false;

            const newText = input.value.trim();
            if (newText) {
                text.textContent = newText;
                if (textBackground) {
                    textBackground.style.display = 'block';
                    const bbox = text.getBBox();
                    textBackground.setAttribute('width', bbox.width + 10);
                    textBackground.setAttribute('x', bbox.x - 5);
                }
            }

            text.style.display = '';
            foreignObject.remove();

            // อัพเดต connection state
            const connectionGroup = text.closest('.connection-group');
            if (connectionGroup) {
                const connectionId = connectionGroup.id;
                this.setState({
                    connections: this.#state.connections.map(conn => {
                        if (conn.id === connectionId) {
                            return { ...conn, text: newText };
                        }
                        return conn;
                    })
                });
            }
        };

        input.addEventListener('blur', finishEditing);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finishEditing();
            }
        });
    }

    calculateTextPosition(start, end) {
        return {
            x: start.x + (end.x - start.x) / 2,
            y: start.y + (end.y - start.y) / 2
        };
    }
    cancelConnection() {
        if (this.tempLine) {
            this.tempLine.remove();
            this.tempLine = null;
        }

        // ลบ class เมื่อยกเลิก
        this.svg.classList.remove('drawing-arrow');

        this.setState({
            isConnecting: false,
            sourceSymbol: null,
            sourcePoint: null
        });
    }

    // เพิ่ม helper method สำหรับเช็คสถานะการเชื่อมต่อ
    get isConnectingLine() {
        return this.#state.isConnecting && this.tempLine !== null;
    }

    createCurvedPath(start, end, sourcePosition, targetPosition) {
        // คำนวณระยะห่างระหว่างจุด
        const dx = end.x - start.x;
        const dy = end.y - start.y;

        // กำหนดจุดควบคุมตามทิศทางของการเชื่อมต่อ
        let path;

        if (sourcePosition === 'top' && targetPosition === 'bottom' ||
            sourcePosition === 'bottom' && targetPosition === 'top') {
            // เชื่อมแนวตั้ง (บน-ล่าง หรือ ล่าง-บน)
            const midY = start.y + dy / 2;
            path = `M ${start.x},${start.y} 
                   C ${start.x},${midY} ${end.x},${midY} ${end.x},${end.y}`;
        } else if (sourcePosition === 'left' && targetPosition === 'right' ||
            sourcePosition === 'right' && targetPosition === 'left') {
            // เชื่อมแนวนอน (ซ้าย-ขวา หรือ ขวา-ซ้าย)
            const midX = start.x + dx / 2;
            path = `M ${start.x},${start.y} 
                   C ${midX},${start.y} ${midX},${end.y} ${end.x},${end.y}`;
        } else {
            // เชื่อมแบบทแยงมุม หรือ กรณีอื่นๆ
            const midX = start.x + dx / 2;
            const midY = start.y + dy / 2;
            path = `M ${start.x},${start.y} 
                   C ${midX},${start.y} ${midX},${end.y} ${end.x},${end.y}`;
        }

        return path;
    }

    createArrowMarker() {
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('viewBox', '0 0 10 10');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '5');
        marker.setAttribute('markerWidth', '6');
        marker.setAttribute('markerHeight', '6');
        marker.setAttribute('orient', 'auto-start-reverse');

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
        path.setAttribute('fill', '#333');

        marker.appendChild(path);
        defs.appendChild(marker);

        // ลบ defs เก่าถ้ามี
        const oldDefs = this.svg.querySelector('defs');
        if (oldDefs) {
            oldDefs.remove();
        }

        this.svg.appendChild(defs);
    }

    startDrawingArrow(position, startPoint) {
        this.setState({
            isDrawingArrow: true,
            arrowPath: [position],
            arrowStartPoint: {
                position,
                symbolId: startPoint.symbolId,
                pointType: startPoint.pointType,
                element: startPoint.element
            },
            arrowBendPoints: []
        });

        // สร้าง arrow ชั่วคราว
        this.tempArrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
        this.tempArrow.setAttribute('class', 'temp-arrow');
        this.tempArrow.setAttribute('stroke', '#666');
        this.tempArrow.setAttribute('stroke-width', '2');
        this.tempArrow.setAttribute('fill', 'none');
        this.tempArrow.setAttribute('marker-end', 'url(#arrowhead)');

        this.svg.appendChild(this.tempArrow);
    }

    addArrowBendPoint(point) {
        // เก็บค่าปัจจุบัน
        const currentBendPoints = [...(this.#state.arrowBendPoints || [])];

        console.log('Adding bend point:', point);
        console.log('Current bendPoints:', currentBendPoints);

        // สร้าง array ใหม่และเพิ่มจุด
        const newBendPoints = [...currentBendPoints, point];

        // บันทึกลง state โดยตรงก่อน
        this.#state = {
            ...this.#state,
            arrowBendPoints: newBendPoints
        };

        console.log('After adding:', this.#state.arrowBendPoints);

        // จากนั้นค่อยเรียก setState
        this.setState({
            arrowBendPoints: this.#state.arrowBendPoints
        });
    }

    updateTempArrow(currentPoint) {
        if (!this.tempArrow) return;

        const points = [...this.#state.arrowPath, currentPoint];
        const pathData = this.createPathWithBendPoints(points);
        this.tempArrow.setAttribute('d', pathData);
    }

    finishArrowWithConnection(targetPoint, connectionPointGroup) {
        if (!targetPoint || !this.#state.sourceSymbol) {
            console.error('Invalid connection attempt');
            this.cancelArrowDrawing();
            return;
        }

        const startPoint = this.#state.arrowStartPoint;
        const targetSymbol = connectionPointGroup.closest('.flowchart-symbol');

        if (startPoint && targetSymbol) {
            // สร้าง connection data
            const connectionData = {
                id: `conn-${Date.now()}`,
                sourceSymbol: startPoint.symbolId,
                targetSymbol: targetSymbol.id,
                bendPoints: this.#state.arrowBendPoints,
                text: ''
            };

            const connection = this.createConnection(targetElement);
            if (connection) {
                this.promptConnectionText(connection);
            }

            // เคลียร์สถานะ
            if (this.tempArrow) {
                this.tempArrow.remove();
                this.tempArrow = null;
            }

            this.setState({
                isDrawingArrow: false,
                arrowPath: [],
                arrowStartPoint: null,
                arrowBendPoints: []
            });

            this.svg.classList.remove('drawing-arrow');
        }
    }

    // เพิ่มฟังก์ชันใหม่สำหรับการพิมพ์ข้อความ
    promptConnectionText(connection) {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'ใส่ข้อความ';
        input.style.position = 'fixed';
        input.style.zIndex = '1000';

        // คำนวณตำแหน่งของ input
        const svgRect = this.svg.getBoundingClientRect();
        const x = parseFloat(connection.text.getAttribute('x'));
        const y = parseFloat(connection.text.getAttribute('y'));

        input.style.left = (svgRect.left + x - 50) + 'px';
        input.style.top = (svgRect.top + y - 10) + 'px';
        input.style.width = '100px';
        input.style.textAlign = 'center';

        document.body.appendChild(input);
        input.focus();

        // ใช้ flag เพื่อป้องกันการทำงานซ้ำ
        let isFinished = false;

        const finishInput = () => {
            if (isFinished) return; // ป้องกันการทำงานซ้ำ
            isFinished = true;

            const value = input.value.trim();
            if (value) {
                // อัพเดตทั้ง DOM และ state
                connection.text.textContent = value;
                connection.textBackground.style.display = 'block';

                // อัพเดต state
                this.setState({
                    connections: this.#state.connections.map(conn => {
                        if (conn.id === connection.connectionData.id) {
                            return { ...conn, text: value };
                        }
                        return conn;
                    })
                });
            }

            // ทำให้แน่ใจว่า input ยังอยู่ใน DOM ก่อนที่จะลบ
            if (input.parentNode) {
                input.parentNode.removeChild(input);
            }
        };

        // แยก event handlers
        const handleBlur = () => {
            finishInput();
            input.removeEventListener('keypress', handleKeyPress);
        };

        const handleKeyPress = (e) => {
            if (e.key === 'Enter') {
                finishInput();
                input.removeEventListener('blur', handleBlur);
            }
        };

        input.addEventListener('blur', handleBlur);
        input.addEventListener('keypress', handleKeyPress);
    }


    updateConnectionPath(connection) {
        // เพิ่มการเช็คว่า connection มีค่าหรือไม่
        if (!connection) {
            console.error('No connection data provided to updateConnectionPath');
            return;
        }
    
        console.log('Updating connection path with data:', connection);
        const sourceSymbol = document.getElementById(connection.sourceSymbol);
        const targetSymbol = document.getElementById(connection.targetSymbol);
    
        // เช็คว่ามี source และ target symbols หรือไม่
        if (!sourceSymbol || !targetSymbol) {
            console.error('Source or target symbol not found:', {
                sourceId: connection?.sourceSymbol,
                targetId: connection?.targetSymbol
            });
            return;
        }
    
        const sourcePoint = sourceSymbol.querySelector(`.${connection.sourcePoint}`);
        const targetPoint = targetSymbol.querySelector(`.${connection.targetPoint}`);
    
        if (!sourcePoint || !targetPoint) {
            console.error('Source or target point not found');
            return;
        }
    
        const startPos = this.getConnectionPointPosition(sourcePoint);
        const endPos = this.getConnectionPointPosition(targetPoint);
    
        // ดึงข้อมูลจุดดัดจาก connection ถ้ามี
        const bendPoints = connection.bendPoints || [];
        const points = [startPos, ...bendPoints, endPos];
    
        // ใช้ createPathWithBendPoints แทน createCurvedPath
        const pathData = this.createPathWithBendPoints(points);
    
        // อัพเดททั้ง path หลักและ hitbox
        const connectionGroup = document.getElementById(connection.id);
        if (connectionGroup) {
            const path = connectionGroup.querySelector('.connection');
            const hitbox = connectionGroup.querySelector('.connection-hitbox');
            if (path) path.setAttribute('d', pathData);
            if (hitbox) hitbox.setAttribute('d', pathData);
    
            // อัพเดทตำแหน่งข้อความ
            const text = connectionGroup.querySelector('.connection-text');
            const textBackground = connectionGroup.querySelector('.text-background');
            if (text && textBackground) {
                const midPoint = this.calculateTextPosition(points);
                text.setAttribute('x', midPoint.x);
                text.setAttribute('y', midPoint.y - 10);
                textBackground.setAttribute('x', midPoint.x - 30);
                textBackground.setAttribute('y', midPoint.y - 20);
            }
        }
    }

    // เพิ่มฟังก์ชันใหม่สำหรับลบ symbol และ connections ที่เกี่ยวข้อง
    deleteSymbolWithConnections(symbol) {
        if (!confirm('คุณแน่ใจหรือไม่ที่จะลบสัญลักษณ์นี้? การลบจะรวมถึงเส้นเชื่อมต่อทั้งหมดที่เกี่ยวข้อง')) {
            return;
        }

        const symbolId = symbol.id;

        // ลบ connections ที่เกี่ยวข้องทั้งหมด
        const connectionsToRemove = [];
        const connGroups = this.svg.querySelectorAll('.connection-group');

        connGroups.forEach(conn => {
            const sourceId = conn.getAttribute('data-source');
            const targetId = conn.getAttribute('data-target');

            if (sourceId === symbolId || targetId === symbolId) {
                connectionsToRemove.push(conn);
            }
        });

        // ลบ connections จาก DOM และ state
        connectionsToRemove.forEach(conn => {
            conn.remove();
            this.setState({
                connections: this.#state.connections.filter(c =>
                    c.id !== conn.id
                )
            });
        });

        // ลบ symbol จาก DOM และ state
        symbol.remove();
        this.setState({
            symbols: this.#state.symbols.filter(s => s.id !== symbolId)
        });
    }


    makeSymbolDraggable(symbol) {
        let isDragging = false;
        let currentX = 0;
        let currentY = 0;
        let initialX = 0;
        let initialY = 0;

        symbol.addEventListener('mousedown', (e) => {
            // อนุญาตให้ลากได้เฉพาะเมื่อใช้ move tool หรือไม่ได้เลือก tool ใดๆ
            if (e.button !== 0 || this.currentTool === 'arrow' || this.currentTool === 'delete') {
                return;
            }

            isDragging = true;
            const transform = symbol.getAttribute('transform');
            const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
            initialX = parseFloat(match[1]);
            initialY = parseFloat(match[2]);

            const startX = e.clientX;
            const startY = e.clientY;

            const mouseMoveHandler = (moveEvent) => {
                if (!isDragging) return;

                const dx = moveEvent.clientX - startX;
                const dy = moveEvent.clientY - startY;

                currentX = initialX + dx;
                currentY = initialY + dy;

                // อัพเดทตำแหน่ง symbol
                symbol.setAttribute('transform', `translate(${currentX},${currentY})`);

                // อัพเดท state ตำแหน่งของ symbol
                const symbolId = symbol.id;
                this.setState({
                    symbols: this.#state.symbols.map(s => {
                        if (s.id === symbolId) {
                            return { ...s, x: currentX, y: currentY };
                        }
                        return s;
                    })
                });

                // อัพเดท connections ทั้งหมดที่เชื่อมต่อกับ symbol นี้
                const connGroups = this.svg.querySelectorAll('.connection-group');
                connGroups.forEach(connGroup => {
                    const sourceId = connGroup.getAttribute('data-source');
                    const targetId = connGroup.getAttribute('data-target');

                    if (sourceId === symbol.id || targetId === symbol.id) {
                        // ดึง elements ที่ต้องอัพเดต
                        const path = connGroup.querySelector('.connection');
                        const hitbox = connGroup.querySelector('.connection-hitbox');
                        const text = connGroup.querySelector('.connection-text');
                        const background = connGroup.querySelector('.text-background');

                        // ดึง source และ target symbols
                        const sourceSymbol = document.getElementById(sourceId);
                        const targetSymbol = document.getElementById(targetId);

                        if (sourceSymbol && targetSymbol && path) {
                            // ดึงจุดเชื่อมต่อ
                            const sourcePoint = sourceSymbol.querySelector(
                                `.${connGroup.getAttribute('data-source-point')}`
                            );
                            const targetPoint = targetSymbol.querySelector(
                                `.${connGroup.getAttribute('data-target-point')}`
                            );

                            if (sourcePoint && targetPoint) {
                                // คำนวณตำแหน่งใหม่ของจุดเชื่อมต่อ
                                const startPos = this.getConnectionPointPosition(sourcePoint);
                                const endPos = this.getConnectionPointPosition(targetPoint);

                                // อัพเดตเส้น connection และ hitbox
                                const pathData = this.createCurvedPath(
                                    startPos,
                                    endPos,
                                    connGroup.getAttribute('data-source-point'),
                                    connGroup.getAttribute('data-target-point')
                                );

                                // อัพเดต path และ hitbox ด้วย pathData เดียวกัน
                                path.setAttribute('d', pathData);
                                if (hitbox) {
                                    hitbox.setAttribute('d', pathData);
                                }

                                // อัพเดตตำแหน่งข้อความ
                                if (text) {
                                    const midPoint = this.calculateTextPosition(startPos, endPos);
                                    text.setAttribute('x', midPoint.x);
                                    text.setAttribute('y', midPoint.y - 10);

                                    // อัพเดต background ของข้อความ
                                    if (background) {
                                        const bbox = text.getBBox();
                                        background.setAttribute('x', bbox.x - 5);
                                        background.setAttribute('y', bbox.y - 5);
                                        background.setAttribute('width', bbox.width + 10);
                                        background.setAttribute('height', bbox.height + 10);
                                    }
                                }

                                // อัพเดต arrowhead
                                path.setAttribute('marker-end', 'url(#arrowhead)');
                            }
                        }
                    }
                });
            };

            const mouseUpHandler = () => {
                isDragging = false;
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
            };

            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        });

        // ป้องกันการลากแบบ default
        symbol.addEventListener('dragstart', (e) => {
            e.preventDefault();
        });
    }

    updateConnections(symbol) {
        this.#state.connections.forEach(conn => {
            if (conn.sourceSymbol === symbol.id || conn.targetSymbol === symbol.id) {
                const sourceSymbol = document.getElementById(conn.sourceSymbol);
                const targetSymbol = document.getElementById(conn.targetSymbol);

                if (sourceSymbol && targetSymbol) {
                    const sourcePoint = sourceSymbol.querySelector(`.${conn.sourcePoint}`);
                    const targetPoint = targetSymbol.querySelector(`.${conn.targetPoint}`);

                    if (sourcePoint && targetPoint) {
                        const startPos = this.getConnectionPointPosition(sourcePoint);
                        const endPos = this.getConnectionPointPosition(targetPoint);

                        // อัพเดทเส้น
                        const pathData = this.createCurvedPath(startPos, endPos, conn.sourcePoint, conn.targetPoint);
                        conn.path.setAttribute('d', pathData);

                        // อัพเดทตำแหน่งข้อความ
                        const midPoint = this.calculateTextPosition(startPos, endPos);
                        conn.text.setAttribute('x', midPoint.x);
                        conn.text.setAttribute('y', midPoint.y - 10);

                        // อัพเดทตำแหน่ง background
                        const bbox = conn.text.getBBox();
                        conn.textBackground.setAttribute('x', bbox.x - 5);
                        conn.textBackground.setAttribute('y', bbox.y - 5);
                    }
                }
            }
        });
    }

    getConnectionPointPosition(point) {
        if (!point) return null;

        // หา transform ของ symbol ที่เป็น parent
        const symbol = point.closest('.flowchart-symbol');
        if (!symbol) return null;

        const transform = symbol.getAttribute('transform');
        const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
        if (!match) return null;

        const symbolX = parseFloat(match[1]);
        const symbolY = parseFloat(match[2]);

        // คำนวณตำแหน่งจริงของจุดเชื่อมต่อ
        return {
            x: symbolX + parseFloat(point.getAttribute('cx')),
            y: symbolY + parseFloat(point.getAttribute('cy'))
        };
    }

    deleteConnection(connectionGroup) {
        if (!confirm('คุณแน่ใจหรือไม่ที่จะลบเส้นเชื่อมต่อนี้?')) {
            return;
        }
    
        const connectionId = connectionGroup.id;
    
        // ลบ connection group ก่อน
        connectionGroup.remove();
    
        // ลบ bendPoints ทั้งหมดที่อยู่บน SVG
        const allBendPoints = Array.from(this.svg.getElementsByClassName('arrow-bend-point'));
        allBendPoints.forEach(point => {
            if (point && point.parentNode) {
                point.parentNode.removeChild(point);
            }
        });
    
        // อัพเดต state
        this.setState({
            connections: this.#state.connections.filter(conn => conn.id !== connectionId),
            arrowBendPoints: [],
            isDrawingArrow: false,
            arrowPath: [],
            arrowStartPoint: null,
            activeBendPoint: null
        });
    
        // เคลียร์ tempBendPoints
        this.#tempBendPoints = [];
    }

    editSymbolText(symbol) {
        console.log('Editing symbol:', {
            symbolId: symbol.id,
            stateSymbols: this.#state.symbols
        });
        const text = symbol.querySelector('text');
        if (!text) return;

        const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
        const input = document.createElement('textarea');
        let isEditing = true;
        console.log('Start editing symbol:', {
            id: symbol.id,
            currentText: text.textContent
        });

        // ดึงข้อความปัจจุบัน
        const symbolId = symbol.id;
        const existingSymbol = this.#state.symbols.find(s => s.id === symbolId);
        const currentText = existingSymbol?.text || text.textContent;


        // ตั้งค่า input value
        input.value = currentText === 'คลิกเพื่อแก้ไข' ? '' : currentText;

        // ตั้งค่า input
        input.value = text.textContent;
        input.style.width = '100%';
        input.style.height = '100%';
        input.style.border = 'none';
        input.style.padding = '5px';
        input.style.background = 'white';
        input.style.outline = 'none';
        input.style.resize = 'none';
        input.style.fontFamily = 'inherit';
        input.style.fontSize = 'inherit';
        input.style.textAlign = 'center';
        input.style.overflow = 'hidden';

        // ตั้งค่า foreignObject
        foreignObject.setAttribute('width', '120');
        foreignObject.setAttribute('height', '60');
        foreignObject.setAttribute('x', '-60');
        foreignObject.setAttribute('y', '-30');
        foreignObject.appendChild(input);

        // ซ่อนข้อความเดิม
        text.style.display = 'none';
        symbol.appendChild(foreignObject);
        input.focus();

        // จัดการเมื่อแก้ไขเสร็จ
        const finishEditing = () => {
            if (!isEditing) return;
            isEditing = false;

            const newText = input.value.trim();
            const symbolId = symbol.id;

            // อัพเดต state ทันที
            const updatedSymbols = this.#state.symbols.map(s => {
                if (s.id === symbolId) {
                    console.log('Found matching symbol:', {
                        stateId: s.id,
                        domId: symbolId,
                        newText: newText
                    });
                    return { ...s, text: newText };
                }
                return s;
            });

            this.setState({ symbols: updatedSymbols });
            text.textContent = newText || 'คลิกเพื่อแก้ไข';
            text.style.display = '';

            // เพิ่ม log หลังอัพเดต
            console.log('After text update:', {
                id: symbol.id,
                newText: newText,
                state: this.#state.symbols
            });

            if (foreignObject.parentNode) {
                foreignObject.parentNode.removeChild(foreignObject);
            }
        };
        input.addEventListener('blur', finishEditing);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                finishEditing();
            }
        });

        // แยก event handlers สำหรับ blur และ keypress
        input.addEventListener('blur', () => {
            requestAnimationFrame(() => {
                if (isEditing) {
                    finishEditing();
                }
            });
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (isEditing) {
                    finishEditing();
                }
            }
        });

        // เพิ่ม event listener สำหรับ auto-resize
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (isEditing) {
                    finishEditing();
                }
            }
        });
    }


    deleteSymbol(symbol) {
        if (!confirm('คุณแน่ใจหรือไม่ที่จะลบสัญลักษณ์นี้?')) return;

        // เปลี่ยนจาก this.state เป็น setState
        this.setState({
            connections: this.#state.connections.filter(conn => {
                if (conn.sourceSymbol === symbol.id || conn.targetSymbol === symbol.id) {
                    conn.element.remove();
                    return false;
                }
                return true;
            }),
            symbols: this.#state.symbols.filter(s => s.id !== symbol.id)
        });

        symbol.remove();
    }

    highlightSelectedTool(selectedBtn) {
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        selectedBtn.classList.add('active');
    }
    getData() {
        try {
            // ดึงข้อมูล symbols จาก state
            const symbols = this.#state.symbols.map(symbol => {
                console.log('Symbol state:', symbol);
                return {
                    id: symbol.id,
                    type: symbol.type,
                    x: symbol.x || 0,
                    y: symbol.y || 0,
                    text: symbol.text || ''
                };
            });

            console.log('Symbols data processed:', symbols);

            // ดึงข้อมูล connections จาก DOM
            const connections = [];
            const connectionGroups = this.svg.querySelectorAll('.connection-group');

            connectionGroups.forEach(group => {
                const existingConnection = connections.find(conn =>
                    conn.sourceSymbol === group.getAttribute('data-source') &&
                    conn.targetSymbol === group.getAttribute('data-target')
                );

                if (!existingConnection) {
                    const textElement = group.querySelector('.connection-text');
                    const sourceSymbol = group.getAttribute('data-source');
                    const targetSymbol = group.getAttribute('data-target');
                    const sourcePoint = group.getAttribute('data-source-point');
                    const targetPoint = group.getAttribute('data-target-point');

                    if (sourceSymbol && targetSymbol && sourcePoint && targetPoint) {
                        const stateConnection = this.#state.connections.find(c => c.id === group.id);
                        const connectionData = {
                            id: group.id,
                            sourceSymbol: sourceSymbol,
                            targetSymbol: targetSymbol,
                            sourcePoint: sourcePoint,
                            targetPoint: targetPoint,
                            text: textElement?.textContent || 'พิมพ์ valua',
                            bendPoints: stateConnection?.bendPoints || []
                        };
                        connections.push(connectionData);
                    }
                }
            });

            console.log('Connections data processed:', connections);

            // เตรียมข้อมูลสำหรับส่งคืน
            const returnData = {
                symbols: symbols,
                connections: connections
            };

            console.log('Final data to be saved:', returnData);

            // ส่งคืนข้อมูลที่สมบูรณ์
            return returnData;

        } catch (error) {
            console.error('Error in getData:', error);
            return {
                symbols: [],
                connections: []
            };
        }
    }

    // เพิ่มเมธอดสำหรับล้าง canvas
    clearCanvas() {
        const defs = this.svg.querySelector('defs');
        this.svg.innerHTML = '';
        if (defs) this.svg.appendChild(defs);

        // รีเซ็ต state
        this.#state = {
            symbols: [],
            connections: [],
            isConnecting: false,
            isDragging: false,
            currentTool: null,
            selectedElement: null
        };
        console.log('Canvas cleared, state reset:', this.getState());
    }



    loadStudentData(data) {
        if (!data) return;

        console.log('Loading student data:', data);

        // เคลียร์ canvas ก่อน
        this.clearCanvas();

        try {
            // 1. วาด symbols ก่อน
            if (data.symbols && Array.isArray(data.symbols)) {
                console.log('Creating symbols:', data.symbols);
                data.symbols.forEach(symbol => {
                    // สร้าง symbol
                    const el = this.createSymbol(
                        symbol.type,
                        symbol.x,
                        symbol.y,
                        symbol.id
                    );

                    // ใส่ข้อความ
                    if (el) {
                        const text = el.querySelector('text');
                        if (text) {
                            text.textContent = symbol.text || '';
                        }
                    }
                });
            }

            // 2. จากนั้นสร้าง connections
            if (data.connections && Array.isArray(data.connections)) {
                console.log('Creating connections:', data.connections);
                data.connections.forEach(conn => {
                    // หา source และ target elements
                    const sourceEl = document.getElementById(conn.sourceSymbol);
                    const targetEl = document.getElementById(conn.targetSymbol);

                    if (sourceEl && targetEl) {
                        // หาจุดเชื่อมต่อ
                        const sourcePoint = sourceEl.querySelector(`.${conn.sourcePoint} .connection-point-visible`);
                        const targetPoint = targetEl.querySelector(`.${conn.targetPoint} .connection-point-visible`);

                        if (sourcePoint && targetPoint) {
                            // เตรียม state สำหรับสร้าง connection
                            this.#state = {
                                ...this.#state,
                                arrowStartPoint: {
                                    symbolId: conn.sourceSymbol,
                                    pointType: conn.sourcePoint,
                                    element: sourcePoint,
                                    position: this.getConnectionPointPosition(sourcePoint)
                                },
                                isDrawingArrow: true
                            };

                            // สร้าง connection
                            const connection = this.createConnection(targetPoint);
                            if (connection) {
                                // ใส่ข้อความบนเส้น
                                const textEl = connection.g.querySelector('.connection-text');
                                if (textEl && conn.text) {
                                    textEl.textContent = conn.text;
                                    const bgEl = connection.g.querySelector('.text-background');
                                    if (bgEl) bgEl.style.display = 'block';
                                }
                            }
                        }
                    }
                });
            }

            // 3. อัพเดต state
            this.setState({
                symbols: data.symbols || [],
                connections: data.connections || [],
                isConnecting: false,
                isDrawingArrow: false,
                isDragging: false
            });

            console.log('Student data loaded successfully');

        } catch (error) {
            console.error('Error loading student data:', error);
            throw error;
        }
    }

    // เพิ่มเมธอดสำหรับโหลดข้อมูลของครู (มี solution)
    loadTeacherData(data) {
        if (!data) return;

        console.log('Loading teacher data with solution...');
        this.clearCanvas();

        try {
            // โหลดข้อมูลทั้งหมดรวมถึง solution
            const newSymbols = [];
            const newConnections = [];

            if (data.symbols && Array.isArray(data.symbols)) {
                console.log(`Loading ${data.symbols.length} symbols with solution...`);
                data.symbols.forEach(symbolData => {
                    const symbol = this.createSymbol(
                        symbolData.type,
                        symbolData.x || 0,
                        symbolData.y || 0,
                        symbolData.id
                    );
                    if (symbol && symbolData.text) {
                        const text = symbol.querySelector('text');
                        if (text) {
                            text.textContent = symbolData.text || 'คลิกเพื่อแก้ไข';
                        }
                    }
                    newSymbols.push({
                        ...symbolData,
                        id: symbolData.id,
                        text: symbolData.text || ''
                    });
                });
            }

            // โหลด connections พร้อม solution
            setTimeout(() => {
                if (data.connections && Array.isArray(data.connections)) {
                    console.log(`Loading ${data.connections.length} connections with solution...`);
                    data.connections.forEach(connData => {
                        const sourceSymbol = document.getElementById(connData.sourceSymbol);
                        const targetSymbol = document.getElementById(connData.targetSymbol);

                        if (!sourceSymbol || !targetSymbol) {
                            console.warn('Invalid symbols for connection:', {
                                sourceId: connData.sourceSymbol,
                                targetId: connData.targetSymbol
                            });
                            return;
                        }

                        const sourcePoint = sourceSymbol.querySelector(
                            `.${connData.sourcePoint} .connection-point-visible`
                        );
                        const targetPoint = targetSymbol.querySelector(
                            `.${connData.targetPoint} .connection-point-visible`
                        );

                        if (!sourcePoint || !targetPoint) {
                            console.warn('Invalid connection points:', {
                                sourcePoint: connData.sourcePoint,
                                targetPoint: connData.targetPoint
                            });
                            return;
                        }

                        this.#state.arrowStartPoint = {
                            symbolId: connData.sourceSymbol,
                            pointType: connData.sourcePoint,
                            element: sourcePoint,
                            position: this.getConnectionPointPosition(sourcePoint)
                        };

                        this.#state.isDrawingArrow = true;

                        const connection = this.createConnection(
                            targetPoint,
                            connData.bendPoints || []
                        );

                        if (connection) {
                            const textElement = connection.g.querySelector('.connection-text');
                            if (textElement && connData.text) {
                                textElement.textContent = connData.text;
                                const textBackground = connection.g.querySelector('.text-background');
                                if (textBackground) {
                                    textBackground.style.display = 'block';
                                }
                            }

                            newConnections.push({
                                ...connData,
                                id: connection.g.id,
                                bendPoints: connData.bendPoints || []
                            });
                        }
                    });
                }

                this.setState({
                    symbols: newSymbols,
                    connections: newConnections,
                    isConnecting: false,
                    isDrawingArrow: false,
                    isDragging: false
                });

                console.log('Teacher data loading completed:', {
                    symbolsLoaded: newSymbols.length,
                    connectionsLoaded: newConnections.length
                });
            }, 100);

        } catch (error) {
            console.error('Error loading teacher data:', error);
            throw error;
        }
    }

    // แก้ไข loadSubmissionData method ใหม่
    loadSubmissionData(data) {
        if (!data) return;

        console.log('Loading submission data:', data);

        try {
            // เคลียร์ canvas ก่อน
            this.clearCanvas();

            // 1. วาด symbols ก่อน
            const symbolPromises = data.symbols.map(symbol => {
                return new Promise((resolve) => {
                    const el = this.createSymbol(
                        symbol.type,
                        symbol.x || 100,
                        symbol.y || 100,
                        symbol.id
                    );

                    if (el) {
                        const text = el.querySelector('text');
                        if (text) {
                            text.textContent = symbol.text || '';
                        }
                    }
                    resolve(el);
                });
            });

            // 2. รอให้ symbols สร้างเสร็จก่อนสร้าง connections
            Promise.all(symbolPromises).then(() => {
                // เพิ่ม delay เล็กน้อยเพื่อให้แน่ใจว่า DOM อัพเดตเสร็จ
                setTimeout(() => {
                    // วาด connections
                    data.connections.forEach(conn => {
                        const sourceSymbol = document.getElementById(conn.sourceSymbol);
                        const targetSymbol = document.getElementById(conn.targetSymbol);

                        if (sourceSymbol && targetSymbol) {
                            const sourcePoint = sourceSymbol.querySelector(
                                `.${conn.sourcePoint} .connection-point-visible`
                            );
                            const targetPoint = targetSymbol.querySelector(
                                `.${conn.targetPoint} .connection-point-visible`
                            );

                            if (sourcePoint && targetPoint) {
                                // Setup source point for connection
                                this.#state = {
                                    ...this.#state,
                                    arrowStartPoint: {
                                        symbolId: conn.sourceSymbol,
                                        pointType: conn.sourcePoint,
                                        element: sourcePoint
                                    },
                                    isDrawingArrow: true
                                };

                                // Create connection group
                                const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
                                g.setAttribute('class', 'connection-group');
                                g.setAttribute('id', `conn-${Date.now()}`);
                                g.setAttribute('data-source', conn.sourceSymbol);
                                g.setAttribute('data-target', conn.targetSymbol);
                                g.setAttribute('data-source-point', conn.sourcePoint);
                                g.setAttribute('data-target-point', conn.targetPoint);

                                // Create connection path
                                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                                path.setAttribute('class', 'connection');
                                path.setAttribute('stroke', '#333');
                                path.setAttribute('stroke-width', '2');
                                path.setAttribute('fill', 'none');
                                path.setAttribute('marker-end', 'url(#arrowhead)');

                                // Calculate positions
                                const sourcePos = this.getConnectionPointPosition(sourcePoint);
                                const targetPos = this.getConnectionPointPosition(targetPoint);

                                // Create path data
                                const pathData = `M ${sourcePos.x},${sourcePos.y} L ${targetPos.x},${targetPos.y}`;
                                path.setAttribute('d', pathData);

                                // Add text if exists
                                if (conn.text) {
                                    const textGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
                                    textGroup.setAttribute('class', 'text-group');

                                    const textBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                                    textBg.setAttribute('class', 'text-background');
                                    textBg.setAttribute('fill', 'white');

                                    const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
                                    textEl.setAttribute('class', 'connection-text');
                                    textEl.textContent = conn.text;

                                    // Calculate text position
                                    const midX = (sourcePos.x + targetPos.x) / 2;
                                    const midY = (sourcePos.y + targetPos.y) / 2;

                                    textEl.setAttribute('x', midX);
                                    textEl.setAttribute('y', midY - 10);
                                    textBg.setAttribute('x', midX - 30);
                                    textBg.setAttribute('y', midY - 20);
                                    textBg.setAttribute('width', '60');
                                    textBg.setAttribute('height', '20');
                                    textBg.setAttribute('rx', '5');
                                    textBg.style.display = 'block';

                                    textGroup.appendChild(textBg);
                                    textGroup.appendChild(textEl);
                                    g.appendChild(textGroup);
                                }

                                // Add path to group
                                g.appendChild(path);

                                // Add to SVG
                                this.svg.appendChild(g);
                            }
                        }
                    });

                    // Update state
                    this.setState({
                        symbols: data.symbols,
                        connections: data.connections,
                        isConnecting: false,
                        isDrawingArrow: false,
                        isDragging: false,
                        currentTool: null
                    });
                }, 100);
            });

            console.log('Started loading submission data with:', {
                symbols: data.symbols.length,
                connections: data.connections.length
            });

        } catch (error) {
            console.error('Error in loadSubmissionData:', error);
            throw error;
        }
    }
    loadData(data) {
        if (!data) return;

        console.log('Starting load data process...');

        // Clear canvas แค่ครั้งเดียว
        this.clearCanvas();
        console.log('Canvas cleared, loading data:', data);

        // สร้าง array เพื่อเก็บ symbols และ connections ที่จะสร้างใหม่
        const newSymbols = [];
        const newConnections = [];

        // โหลด symbols ก่อน
        if (data.symbols && Array.isArray(data.symbols)) {
            console.log(`Loading ${data.symbols.length} symbols...`);
            data.symbols.forEach(symbolData => {
                const symbol = this.createSymbol(
                    symbolData.type,
                    symbolData.x || 0,
                    symbolData.y || 0,
                    symbolData.id  // ส่ง ID เดิมไป
                );
                if (symbol && symbolData.text) {
                    const text = symbol.querySelector('text');
                    if (text) {
                        text.textContent = symbolData.text || 'คลิกเพื่อแก้ไข';
                    }
                }
                newSymbols.push({
                    ...symbolData,
                    id: symbolData.id,
                    text: symbolData.text || ''
                });
            });
        }

        // รอให้ symbols สร้างเสร็จก่อนสร้าง connections
        setTimeout(() => {
            // โหลด connections
            if (data.connections && Array.isArray(data.connections)) {
                console.log(`Loading ${data.connections.length} connections...`);
                data.connections.forEach(connData => {
                    const sourceSymbol = document.getElementById(connData.sourceSymbol);
                    const targetSymbol = document.getElementById(connData.targetSymbol);

                    if (!sourceSymbol || !targetSymbol) {
                        console.warn('Invalid symbols for connection:', {
                            sourceId: connData.sourceSymbol,
                            targetId: connData.targetSymbol
                        });
                        return;
                    }

                    // หา visible point ภายใน connection point group
                    const sourcePoint = sourceSymbol.querySelector(`.${connData.sourcePoint} .connection-point-visible`);
                    const targetPoint = targetSymbol.querySelector(`.${connData.targetPoint} .connection-point-visible`);

                    if (!sourcePoint || !targetPoint) {
                        console.warn('Invalid connection points:', {
                            sourcePoint: connData.sourcePoint,
                            targetPoint: connData.targetPoint
                        });
                        return;
                    }

                    // Set up state for connection creation
                    this.#state.arrowStartPoint = {
                        symbolId: connData.sourceSymbol,
                        pointType: connData.sourcePoint,
                        element: sourcePoint,
                        position: this.getConnectionPointPosition(sourcePoint)
                    };

                    // Set drawing state
                    this.#state.isDrawingArrow = true;

                    // สร้าง connection ใหม่พร้อม bendPoints 
                    const connection = this.createConnection(
                        targetPoint,
                        connData.bendPoints || []  // ส่ง bendPoints ไปด้วย
                    );

                    if (connection) {
                        // จัดการข้อความ
                        const textElement = connection.g.querySelector('.connection-text');
                        if (textElement && connData.text) {
                            textElement.textContent = connData.text;
                            const textBackground = connection.g.querySelector('.text-background');
                            if (textBackground) {
                                textBackground.style.display = 'block';
                            }
                        }

                        // เก็บข้อมูล connection พร้อม bendPoints
                        newConnections.push({
                            ...connData,
                            id: connection.g.id,
                            bendPoints: connData.bendPoints || []
                        });
                    }
                });
            }

            // อัพเดต state ครั้งเดียว
            this.setState({
                symbols: newSymbols,
                connections: newConnections,
                isConnecting: false,
                isDrawingArrow: false,
                isDragging: false
            });

            console.log('Data loading completed:', {
                symbolsLoaded: newSymbols.length,
                connectionsLoaded: newConnections.length,
                finalState: {
                    symbols: newSymbols,
                    connections: newConnections
                }
            });
        }, 100);
    }
    loadReadOnlyData(data) {
        if (!data) return;

        console.log('Loading data in read-only mode...');

        // เคลียร์ canvas ก่อน
        this.clearCanvas();

        // สร้างฟังก์ชันที่จะปิดการใช้งานทุก event listeners
        const disableInteractions = (element) => {
            if (element instanceof SVGElement) {
                element.style.pointerEvents = 'none';
            }
            // ปิดการใช้งาน event listeners สำหรับทุก child elements
            Array.from(element.children).forEach(child => {
                disableInteractions(child);
            });
        };

        try {
            // 1. วาด symbols ก่อน
            if (data.symbols && Array.isArray(data.symbols)) {
                data.symbols.forEach(symbol => {
                    const el = this.createSymbol(
                        symbol.type,
                        symbol.x || 0,
                        symbol.y || 0,
                        symbol.id
                    );

                    if (el) {
                        // ใส่ข้อความ
                        const text = el.querySelector('text');
                        if (text) {
                            text.textContent = symbol.text || '';
                        }
                        // ปิดการใช้งาน drag และ edit
                        disableInteractions(el);
                    }
                });
            }

            // 2. วาด connections
            setTimeout(() => {
                if (data.connections && Array.isArray(data.connections)) {
                    data.connections.forEach(conn => {
                        const sourceSymbol = document.getElementById(conn.sourceSymbol);
                        const targetSymbol = document.getElementById(conn.targetSymbol);

                        if (!sourceSymbol || !targetSymbol) return;

                        const sourcePoint = sourceSymbol.querySelector(`.${conn.sourcePoint} .connection-point-visible`);
                        const targetPoint = targetSymbol.querySelector(`.${conn.targetPoint} .connection-point-visible`);

                        if (sourcePoint && targetPoint) {
                            // Setup source point
                            this.#state = {
                                ...this.#state,
                                arrowStartPoint: {
                                    symbolId: conn.sourceSymbol,
                                    pointType: conn.sourcePoint,
                                    element: sourcePoint,
                                    position: this.getConnectionPointPosition(sourcePoint)
                                },
                                isDrawingArrow: true
                            };

                            // สร้าง connection
                            const connection = this.createConnection(
                                targetPoint,
                                conn.bendPoints || []
                            );

                            if (connection) {
                                // ใส่ข้อความ
                                const textEl = connection.g.querySelector('.connection-text');
                                if (textEl && conn.text) {
                                    textEl.textContent = conn.text;
                                    const bgEl = connection.g.querySelector('.text-background');
                                    if (bgEl) bgEl.style.display = 'block';
                                }
                                // ปิดการใช้งานการแก้ไข
                                disableInteractions(connection.g);
                            }
                        }
                    });
                }

                // ปิดการใช้งานทุกเครื่องมือ
                this.svg.style.pointerEvents = 'none';
                document.querySelectorAll('.tool-btn').forEach(btn => {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                });

                // อัพเดต state
                this.setState({
                    symbols: data.symbols || [],
                    connections: data.connections || [],
                    isConnecting: false,
                    isDrawingArrow: false,
                    isDragging: false
                });

                console.log('Read-only data loaded successfully');
            }, 100);

        } catch (error) {
            console.error('Error loading read-only data:', error);
            throw error;
        }
    }
    // Helper method สำหรับสร้าง connection
    completeConnection(targetPoint) {
        if (!targetPoint) return null;

        const targetBounds = targetPoint.getBoundingClientRect();
        const svgBounds = document.querySelector('#flowchartCanvas svg').getBoundingClientRect();

        // จำลองการคลิกที่จุดสิ้นสุด
        const clickEvent = new MouseEvent('mouseup', {
            bubbles: true,
            clientX: targetBounds.left + targetBounds.width / 2 - svgBounds.left,
            clientY: targetBounds.top + targetBounds.height / 2 - svgBounds.top
        });

        targetPoint.dispatchEvent(clickEvent);

        // หา connection ที่เพิ่งสร้าง
        const connections = document.querySelectorAll('.connection');
        return connections[connections.length - 1];
    }
    // Helper method สำหรับเพิ่มข้อความบนเส้น connection
    addTextToConnection(connection, text) {
        if (!connection || !text) return;

        const textElement = connection.querySelector('.connection-text');
        const bgElement = connection.querySelector('.text-background');

        if (textElement) {
            textElement.textContent = text;
            if (bgElement) {
                bgElement.style.display = 'block';
            }
        }
    }

    createSubmissionConnection(sourcePoint, targetPoint, text = '') {
        try {
            const svg = document.querySelector('#flowchartCanvas svg');
            if (!svg) return null;

            // สร้าง group element
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute('class', 'connection');

            // สร้างเส้น path
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute('class', 'connection-line');

            // สร้างหัวลูกศร
            const arrowHead = document.createElementNS("http://www.w3.org/2000/svg", "path");
            arrowHead.setAttribute('class', 'arrow-head');

            // สร้าง elements สำหรับข้อความ
            const textBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            textBg.setAttribute('class', 'text-background');
            textBg.style.display = text ? 'block' : 'none';

            const textElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
            textElement.setAttribute('class', 'connection-text');
            textElement.textContent = text;

            // รวม elements
            g.appendChild(path);
            g.appendChild(arrowHead);
            g.appendChild(textBg);
            g.appendChild(textElement);

            // เพิ่มลงใน SVG
            svg.appendChild(g);

            // คำนวณตำแหน่งเส้นและอัพเดต path
            const sourcePos = this.getPointPosition(sourcePoint);
            const targetPos = this.getPointPosition(targetPoint);

            const dx = targetPos.x - sourcePos.x;
            const dy = targetPos.y - sourcePos.y;

            const pathD = `M ${sourcePos.x} ${sourcePos.y} L ${targetPos.x} ${targetPos.y}`;
            path.setAttribute('d', pathD);

            // คำนวณตำแหน่งหัวลูกศร
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            const arrowTransform = `translate(${targetPos.x},${targetPos.y}) rotate(${angle})`;
            arrowHead.setAttribute('transform', arrowTransform);
            arrowHead.setAttribute('d', 'M -10 -5 L 0 0 L -10 5 Z');

            // จัดตำแหน่งข้อความ
            if (text) {
                const midX = (sourcePos.x + targetPos.x) / 2;
                const midY = (sourcePos.y + targetPos.y) / 2;
                textElement.setAttribute('x', midX);
                textElement.setAttribute('y', midY);
                textBg.setAttribute('x', midX - 20);
                textBg.setAttribute('y', midY - 10);
                textBg.setAttribute('width', '40');
                textBg.setAttribute('height', '20');
            }

            return g;
        } catch (error) {
            console.error('Error creating submission connection:', error);
            return null;
        }
    }

    etPointPosition(point) {
        const rect = point.getBoundingClientRect();
        const svg = document.querySelector('#flowchartCanvas svg');
        const pt = svg.createSVGPoint();

        pt.x = rect.x + rect.width / 2;
        pt.y = rect.y + rect.height / 2;

        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
        return { x: svgP.x, y: svgP.y };
    }
    // เพิ่ม method สำหรับสร้าง connection โดยตรง
    createConnectionDirect(sourcePoint, targetPoint, connectionId) {
        const svgElement = document.querySelector('#flowchartCanvas svg');
        if (!svgElement) return null;

        const sourcePos = this.getConnectionPointPosition(sourcePoint);
        const targetPos = this.getConnectionPointPosition(targetPoint);

        // สร้าง group element สำหรับ connection
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute('class', 'connection');
        g.setAttribute('id', connectionId || `connection-${Date.now()}`);

        // สร้างเส้น
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute('class', 'connection-line');

        // สร้างหัวลูกศร
        const arrowHead = document.createElementNS("http://www.w3.org/2000/svg", "path");
        arrowHead.setAttribute('class', 'arrow-head');

        // สร้าง elements สำหรับข้อความ
        const textBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        textBackground.setAttribute('class', 'text-background');
        textBackground.style.display = 'none';

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute('class', 'connection-text');

        // เพิ่ม elements เข้า group
        g.appendChild(path);
        g.appendChild(arrowHead);
        g.appendChild(textBackground);
        g.appendChild(text);

        // เพิ่ม connection ลงใน SVG
        svgElement.appendChild(g);

        // อัพเดตตำแหน่งของ connection
        this.updateConnectionPosition(g, sourcePos, targetPos);

        return g;
    }
}



window.flowchartEditor = null;

// เมื่อโหลดเพจเสร็จให้สร้าง FlowchartEditor
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('flowchartCanvas')) {
        window.flowchartEditor = new FlowchartEditor('flowchartCanvas');
    }
});

