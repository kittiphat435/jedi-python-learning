class FlowchartChecker {
    constructor(studentFlowchart, solutionFlowchart) {
        this.student = studentFlowchart;
        this.solution = solutionFlowchart;
        this.symbolMapping = new Map(); // เก็บความสัมพันธ์ระหว่าง symbols
        this.feedbacks = []; // เพิ่ม array สำหรับเก็บ feedbacks
    }

    checkAll() {
        // ตรวจสอบทุกส่วนและคำนวณคะแนน
        const symbolResult = this.checkSymbols();
        const connectionResult = this.checkConnections();
        const flowResult = this.checkFlow();

        const totalScore = this.calculateTotalScore(symbolResult, connectionResult, flowResult);

        return {
            score: totalScore,
            passed: totalScore >= 80,
            details: {
                symbols: symbolResult,
                connections: connectionResult,
                flow: flowResult
            }
        };
    }

    // เพิ่มเมธอดใน FlowchartChecker
    isConnectionMatch(studentConn, solutionConn) {
        // ตรวจสอบการเชื่อมต่อพื้นฐาน
        const basicMatch =
            studentConn.sourceSymbol === solutionConn.sourceSymbol &&
            studentConn.targetSymbol === solutionConn.targetSymbol &&
            studentConn.text === solutionConn.text;

        // ถ้าไม่มี bendPoints ตรวจแค่การเชื่อมต่อพื้นฐาน
        if (!studentConn.bendPoints && !solutionConn.bendPoints) {
            return basicMatch;
        }

        // ถ้ามี bendPoints ตรวจสอบเพิ่มเติม
        if (studentConn.bendPoints && solutionConn.bendPoints) {
            // อนุญาตให้มีจำนวน bendPoints ต่างกันได้
            // แต่ต้องเชื่อมต่อระหว่างจุดเดียวกันและมีข้อความเหมือนกัน
            return basicMatch;
        }

        // กรณีที่ฝั่งหนึ่งมี bendPoints แต่อีกฝั่งไม่มี
        // ให้ผ่านถ้าการเชื่อมต่อพื้นฐานถูกต้อง
        return basicMatch;
    }
    checkSymbols() {
        const studentSymbols = this.student.symbols;
        const solutionSymbols = this.solution.symbols;

        // ตรวจสอบจำนวน symbols
        if (studentSymbols.length !== solutionSymbols.length) {
            return {
                score: 0,
                passed: false,
                feedback: 'จำนวน symbols ไม่ตรงกับเฉลย'
            };
        }

        let matchedCount = 0;
        studentSymbols.forEach(studentSymbol => {
            const match = solutionSymbols.find(solutionSymbol =>
                this.isSymbolMatch(studentSymbol, solutionSymbol));

            if (match) {
                matchedCount++;
                this.symbolMapping.set(studentSymbol.id, match.id);
            }
        });

        const score = (matchedCount / solutionSymbols.length) * 100;
        return {
            score,
            passed: score >= 80,
            feedback: score < 100 ? 'บาง symbols ไม่ตรงกับเฉลย' : ''
        };
    }

    checkConnections() {
        const studentConns = this.student.connections;
        const solutionConns = this.solution.connections;

        let matchedCount = 0;
        const checkedConnections = new Set();
        const connectionFeedbacks = []; // สร้าง array ใหม่เฉพาะสำหรับ connection feedbacks

        studentConns.forEach(studentConn => {
            const mappedSourceId = this.symbolMapping.get(studentConn.sourceSymbol);
            const mappedTargetId = this.symbolMapping.get(studentConn.targetSymbol);

            if (!mappedSourceId || !mappedTargetId) return;

            // หา connection ที่ตรงกันในเฉลย
            const match = solutionConns.find(solutionConn => {
                if (checkedConnections.has(solutionConn.id)) return false;

                // ตรวจสอบการเชื่อมต่อแบบปกติ (ทิศทางต้องตรงกัน) 
                // โดยดูแค่ sourceSymbol, targetSymbol และ text
                const normalMatch =
                    solutionConn.sourceSymbol === mappedSourceId &&
                    solutionConn.targetSymbol === mappedTargetId;

                // อนุญาตให้สลับทิศทางได้เฉพาะในบางกรณีพิเศษเท่านั้น
                const reversedMatch = this.canReverseConnection(studentConn, solutionConn) &&
                    solutionConn.sourceSymbol === mappedTargetId &&
                    solutionConn.targetSymbol === mappedSourceId;

                // ตรวจสอบข้อความบนเส้นเชื่อม
                const textMatch = this.isConnectionTextMatch(studentConn, solutionConn);

                // ถ้าเส้นเชื่อมต่อถูกต้อง จะไม่สนใจ bendPoints
                // แค่ตรวจว่าเชื่อมถูกจุดและมีข้อความถูกต้อง
                return (normalMatch || reversedMatch) && textMatch;
            });

            if (match) {
                matchedCount++;
                checkedConnections.add(match.id);
                connectionFeedbacks.push(`การเชื่อมต่อระหว่าง symbol ถูกต้อง: ${studentConn.text || 'ไม่มีข้อความ'}`);
            } else {
                connectionFeedbacks.push(`พบการเชื่อมต่อที่ไม่ตรงกับเฉลย: ${studentConn.text || 'ไม่มีข้อความ'}`);
            }
        });

        const score = studentConns.length > 0 ?
            (matchedCount / Math.max(studentConns.length, solutionConns.length)) * 100 : 0;

        // รวม feedback จากทั้งสอง array
        const allFeedbacks = [
            ...connectionFeedbacks,
            ...this.generateConnectionFeedback(studentConns, solutionConns)
        ];

        return {
            score,
            passed: score >= 80,
            feedback: allFeedbacks
        };
    }

    checkFlow() {
        const studentFlow = this.generateFlow(this.student);
        const solutionFlow = this.generateFlow(this.solution);

        const matchedSteps = studentFlow.filter((step, index) => {
            const solutionStep = solutionFlow[index];
            return solutionStep && this.isSymbolMatch(step, solutionStep);
        });

        const score = (matchedSteps.length / solutionFlow.length) * 100;

        return {
            score,
            passed: score >= 80,
            feedback: score < 100 ? 'ลำดับการทำงานบางส่วนไม่ตรงกับเฉลย' : ''
        };
    }

    generateConnectionFeedback(studentConns, solutionConns) {
        const feedback = [];

        studentConns.forEach(studentConn => {
            const sourceSymbol = this.student.symbols.find(s => s.id === studentConn.sourceSymbol);
            const targetSymbol = this.student.symbols.find(s => s.id === studentConn.targetSymbol);

            if (sourceSymbol && targetSymbol) {
                const reversedConnection = solutionConns.find(solutionConn => {
                    const mappedSourceId = this.symbolMapping.get(studentConn.sourceSymbol);
                    const mappedTargetId = this.symbolMapping.get(studentConn.targetSymbol);
                    return solutionConn.targetSymbol === mappedSourceId &&
                        solutionConn.sourceSymbol === mappedTargetId;
                });

                if (reversedConnection) {
                    feedback.push(`ทิศทางการเชื่อมต่อระหว่าง ${sourceSymbol.text} และ ${targetSymbol.text} ไม่ถูกต้อง`);
                }
            }
        });

        return feedback;
    }

    // Helper methods
    cleanText(text) {
        if (!text) return '';
        const clean = text.replace(/\s+/g, '').toLowerCase();
        if (clean === 'พิมพ์valua' || clean === 'พิมพ์value' || clean === 'คลิกเพื่อแก้ไข' || clean === 'ดับเบิลคลิกเพื่อพิมพ์') {
            return '';
        }
        return clean;
    }

    isSymbolMatch(symbol1, symbol2) {
        if (symbol1.type !== symbol2.type) return false;
        const text1 = this.cleanText(symbol1.text);
        const text2 = this.cleanText(symbol2.text);
        
        console.log(`Comparing Symbol (${symbol1.type}):`, {
            student: { raw: symbol1.text, clean: text1 },
            solution: { raw: symbol2.text, clean: text2 }
        });

        // ถ้าไม่มีข้อความทั้งคู่ถือว่าผ่าน
        if (!text1 && !text2) return true;
        
        const similarity = this.calculateTextSimilarity(text1, text2);
        console.log(`  => Similarity: ${similarity.toFixed(2)} (Target: >= 0.8)`);
        return similarity >= 0.8;
    }

    isConnectionTextMatch(conn1, conn2) {
        const text1 = this.cleanText(conn1.text);
        const text2 = this.cleanText(conn2.text);
        if (!text1 && !text2) return true;
        if (!text1 || !text2) return false;
        return this.calculateTextSimilarity(text1, text2) >= 0.8;
    }

    canReverseConnection(studentConn, solutionConn) {
        // ดึงข้อมูล symbols ที่เกี่ยวข้อง
        const studentSource = this.student.symbols.find(s => s.id === studentConn.sourceSymbol);
        const studentTarget = this.student.symbols.find(s => s.id === studentConn.targetSymbol);
        const solutionSource = this.solution.symbols.find(s => s.id === solutionConn.sourceSymbol);
        const solutionTarget = this.solution.symbols.find(s => s.id === solutionConn.targetSymbol);

        // ไม่อนุญาตให้สลับทิศทางในกรณีต่อไปนี้:

        // 1. Start/End nodes
        if (studentSource?.type === 'start-end' || studentTarget?.type === 'start-end') {
            return false;
        }

        // 2. Decision nodes
        if (studentSource?.type === 'decision' || studentTarget?.type === 'decision') {
            return false;
        }

        // 3. Input/Output nodes
        if (studentSource?.type === 'input-output' || studentTarget?.type === 'input-output') {
            return false;
        }

        // 4. เมื่อมีข้อความบนเส้นเชื่อมต่อ
        if (studentConn.text || solutionConn.text) {
            return false;
        }

        // 5. กรณีที่เป็นส่วนหนึ่งของ loop
        if (this.isPartOfLoop(studentConn) || this.isPartOfLoop(solutionConn)) {
            return false;
        }

        // อนุญาตให้สลับทิศทางได้เฉพาะใน Process-to-Process connections
        return studentSource?.type === 'process' &&
            studentTarget?.type === 'process' &&
            solutionSource?.type === 'process' &&
            solutionTarget?.type === 'process';
    }

    isPartOfLoop(connection) {
        // ตรวจสอบว่า connection เป็นส่วนหนึ่งของ loop หรือไม่
        const visited = new Set();

        const checkLoop = (currentId, targetId) => {
            if (currentId === targetId) return true;
            if (visited.has(currentId)) return false;

            visited.add(currentId);

            const nextConnections = this.student.connections.filter(
                conn => conn.sourceSymbol === currentId
            );

            return nextConnections.some(conn =>
                checkLoop(conn.targetSymbol, targetId)
            );
        };

        return checkLoop(connection.targetSymbol, connection.sourceSymbol);
    }

    generateFlow(flowchart) {
        const flow = [];
        const visited = new Set();

        const traverse = (symbolId) => {
            if (visited.has(symbolId)) return;
            visited.add(symbolId);

            const symbol = flowchart.symbols.find(s => s.id === symbolId);
            if (!symbol) return;

            flow.push(symbol);

            const outgoingConnections = flowchart.connections
                .filter(conn => conn.sourceSymbol === symbolId)
                .sort((a, b) => {
                    // จัดลำดับ connections ตามข้อความ (ถ้ามี)
                    if (!a.text || !b.text) return 0;
                    return a.text.localeCompare(b.text);
                });

            outgoingConnections.forEach(conn => traverse(conn.targetSymbol));
        };

        const startSymbol = flowchart.symbols.find(s => s.type === 'start-end');
        if (startSymbol) traverse(startSymbol.id);

        return flow;
    }

    calculateTextSimilarity(str1, str2) {
        if (str1 === str2) return 1;
        if (!str1 || !str2) return 0;

        const m = str1.length;
        const n = str2.length;
        const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));

        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(
                        dp[i - 1][j],
                        dp[i][j - 1],
                        dp[i - 1][j - 1]
                    );
                }
            }
        }

        return 1 - (dp[m][n] / Math.max(m, n));
    }

    calculateTotalScore(symbolResult, connectionResult, flowResult) {
        const weights = {
            symbols: 0.4,
            connections: 0.4,
            flow: 0.2
        };

        const score = (
            symbolResult.score * weights.symbols +
            connectionResult.score * weights.connections +
            flowResult.score * weights.flow
        );

        return Math.round(score);
    }
}