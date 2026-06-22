import { CharItem, ExportFormat } from './types';

export function generateFontBytes(
    charsList: CharItem[],
    exportFormat: ExportFormat,
    fontFamily: string,
    size: number,
    isBold: boolean,
    isItalic: boolean,
    invert: boolean
): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error("Could not get 2d context");
    
    const fontStr = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}${size}px "${fontFamily}", monospace`;
    ctx.font = fontStr;
    
    const metricsM = ctx.measureText('M|g_'); 
    const ascent = Math.ceil(metricsM.actualBoundingBoxAscent || size);
    const descent = Math.ceil(metricsM.actualBoundingBoxDescent || (size * 0.2));
    const totalHeight = ascent + descent;
    
    let maxWidth = 0;
    if (exportFormat === 'standard' || exportFormat === 'fpga-3bit') {
        charsList.filter(item => item.render).forEach(item => {
            ctx.font = fontStr;
            const m = ctx.measureText(item.char);
            let width = Math.ceil((m.actualBoundingBoxRight || m.width) + (m.actualBoundingBoxLeft || 0));
            if (width <= 0) width = Math.ceil(size * 0.4); 
            const rw = width + 1 + (isItalic ? Math.ceil(totalHeight * 0.2) : 0);
            if (rw > maxWidth) maxWidth = rw;
        });
    }
    
    const glyphs: Array<{
        char: string, 
        width: number, 
        data: Uint8Array, 
        offset: number, 
        charCode: number, 
        skipped: boolean
    }> = [];
    
    let offset = 0;
    
    charsList.forEach(item => {
        const char = item.char;
        if (!item.render) {
            glyphs.push({ char, width: 0, data: new Uint8Array(0), offset, charCode: char.charCodeAt(0), skipped: true });
            return;
        }

        ctx.font = fontStr;
        const m = ctx.measureText(char);
        let width = Math.ceil((m.actualBoundingBoxRight || m.width) + (m.actualBoundingBoxLeft || 0));
        if (width <= 0) width = Math.ceil(size * 0.4); 
        
        let renderWidth = width + 1 + (isItalic ? Math.ceil(totalHeight * 0.2) : 0);
        if (exportFormat === 'standard' || exportFormat === 'fpga-3bit') renderWidth = maxWidth;
        
        canvas.width = renderWidth;
        canvas.height = totalHeight;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = fontStr;
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = 'black';
        let xPos = (m.actualBoundingBoxLeft || 0);
        if (exportFormat === 'standard' || exportFormat === 'fpga-3bit') xPos += Math.floor((renderWidth - width) / 2);
        ctx.fillText(char, xPos, ascent);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const coverage = new Uint8Array(renderWidth * totalHeight);
        for(let i = 0; i < coverage.length; i++) coverage[i] = imgData[i * 4 + 3];
        
        let rawBytes = new Uint8Array(0);
        
        if (exportFormat === 'fpga-3bit') {
            const stride = renderWidth; 
            rawBytes = new Uint8Array(stride * totalHeight);
            for (let y = 0; y < totalHeight; y++) {
                for (let x = 0; x < renderWidth; x++) {
                    let val = coverage[y * renderWidth + x];
                    if (invert) val = 255 - val;
                    rawBytes[y * stride + x] = Math.round((val * 7) / 255);
                }
            }
        } else if (exportFormat === 'standard' || exportFormat === 'visual-tft') {
            const pages = Math.ceil(totalHeight / 8);
            rawBytes = new Uint8Array(renderWidth * pages);
            for (let page = 0; page < pages; page++) {
                for (let x = 0; x < renderWidth; x++) {
                    let byte = 0;
                    for (let yBit = 0; yBit < 8; yBit++) {
                        const y = page * 8 + yBit;
                        if (y < totalHeight) {
                            const isSolid = coverage[y * renderWidth + x] > 127;
                            if (invert ? !isSolid : isSolid) {
                                byte |= (1 << yBit);
                            }
                        } else if (invert) {
                            byte |= (1 << yBit);
                        }
                    }
                    rawBytes[page * renderWidth + x] = byte;
                }
            }
        } else if (exportFormat.startsWith('ft800')) {
            const aaLevel = exportFormat.split('-')[1];
            let stride = 0;
            if (aaLevel === 'l1') stride = Math.ceil(renderWidth / 8);
            if (aaLevel === 'l2') stride = Math.ceil((renderWidth * 2) / 8);
            if (aaLevel === 'l4') stride = Math.ceil((renderWidth * 4) / 8);
            if (aaLevel === 'l8') stride = renderWidth;
            
            rawBytes = new Uint8Array(stride * totalHeight);
            for (let y = 0; y < totalHeight; y++) {
                for (let x = 0; x < renderWidth; x++) {
                    let val = coverage[y * renderWidth + x];
                    if (invert) val = 255 - val;
                    const outIdx = y * stride;
                    if (aaLevel === 'l1' && val > 127) {
                        rawBytes[outIdx + Math.floor(x / 8)] |= (1 << (7 - (x % 8)));
                    } else if (aaLevel === 'l2') {
                        const q = Math.floor((val * 3) / 255);
                        rawBytes[outIdx + Math.floor(x / 4)] |= (q << (6 - (x % 4) * 2));
                    } else if (aaLevel === 'l4') {
                        const q = Math.floor((val * 15) / 255);
                        rawBytes[outIdx + Math.floor(x / 2)] |= (q << (4 - (x % 2) * 4));
                    } else if (aaLevel === 'l8') {
                        rawBytes[outIdx + x] = val;
                    }
                }
            }
        }
        
        glyphs.push({ char, width: renderWidth, data: rawBytes, offset, charCode: char.charCodeAt(0), skipped: false });
        offset += rawBytes.length;
    });
    
    let out = `// Generated by TypeScript GLCD Font Creator Engine\n`;
    out += `// Font Family: ${fontFamily}, Format: ${exportFormat}\n`;
    
    if (exportFormat === 'standard' || exportFormat === 'fpga-3bit') {
        const activeGlyphs = glyphs.filter(g => !g.skipped);
        const charCodesList = activeGlyphs.map(g => g.charCode).join(',');
        const totalBytes = activeGlyphs.reduce((acc, g) => acc + g.data.length, 0);
        const formatLabel = exportFormat === 'fpga-3bit' ? '3-bit AA' : '1-bit';
        
        out += `// Height: ${totalHeight}, Width: ${maxWidth}, Chars: ${charCodesList} Format: ${formatLabel}\n`;
        out += `const unsigned char font_array[${totalBytes}] = {\n`;
        activeGlyphs.forEach(g => {
            out += `    // '${g.char}'\n    `;
            Array.from(g.data).forEach(b => out += `0x${b.toString(16).padStart(2,'0').toUpperCase()}, `);
            out += `\n`;
        });
        out += `};\n`;
    } else if (exportFormat === 'visual-tft') {
        out += `const unsigned char myFont[] = {\n`;
        const firstChar = glyphs[0].charCode;
        const lastChar = glyphs[glyphs.length-1].charCode;
        out += `    0x${firstChar.toString(16).padStart(2,'0').toUpperCase()}, 0x${lastChar.toString(16).padStart(2,'0').toUpperCase()}, // First, Last Char\n`;
        out += `    0x${(totalHeight & 0xFF).toString(16).padStart(2,'0').toUpperCase()}, 0x${((totalHeight>>8) & 0xFF).toString(16).padStart(2,'0').toUpperCase()}, // Height\n`;
        
        let cOffset = 0;
        glyphs.forEach(g => {
            out += `    0x${(cOffset & 0xFF).toString(16).padStart(2,'0').toUpperCase()}, 0x${((cOffset>>8) & 0xFF).toString(16).padStart(2,'0').toUpperCase()}, // Offset '${g.char}'\n`;
            cOffset += g.data.length;
        });
        
        glyphs.forEach(g => {
            out += `    0x${g.width.toString(16).padStart(2,'0').toUpperCase()}, // Width '${g.char}'\n`;
        });
        
        glyphs.forEach(g => {
            out += `    // '${g.char}' data\n    `;
            Array.from(g.data).forEach(b => out += `0x${b.toString(16).padStart(2,'0').toUpperCase()}, `);
            out += `\n`;
        });
        out += `};\n`;
    } else if (exportFormat.startsWith('ft800')) {
        out += `const unsigned char myFont_metrics[] = {\n`;
        for (let i = 0; i < 128; i++) {
            const g = glyphs.find(gl => gl.charCode === i);
            const w = g && !g.skipped ? g.width : 0;
            out += `0x${w.toString(16).padStart(2,'0').toUpperCase()}, `;
            if ((i + 1) % 16 === 0) out += `\n    `;
        }
        let fByte = 1;
        if (exportFormat === 'ft800-l2') fByte = 2;
        if (exportFormat === 'ft800-l4') fByte = 3;
        if (exportFormat === 'ft800-l8') fByte = 4;
        
        out += `// Format (${exportFormat}), stride, width, height, PTR\n`;
        out += `    0x${fByte.toString(16).padStart(2,'0').toUpperCase()}, 0x00, 0x00, 0x00, // Format\n`;
        out += `    0x00, 0x00, 0x00, 0x00, // Stride (0 = variable)\n`;
        out += `    0x00, 0x00, 0x00, 0x00, // Max Width\n`;
        out += `    0x${(totalHeight & 0xFF).toString(16).padStart(2,'0').toUpperCase()}, 0x${((totalHeight>>8) & 0xFF).toString(16).padStart(2,'0').toUpperCase()}, 0x00, 0x00, // Height\n`;
        out += `    0x00, 0x00, 0x00, 0x00 // PTR\n};\n\n`;
        
        out += `const unsigned char myFont_data[] = {\n`;
        glyphs.forEach(g => {
            if (g.skipped) return;
            out += `    // '${g.char}'\n    `;
            Array.from(g.data).forEach(b => out += `0x${b.toString(16).padStart(2,'0').toUpperCase()}, `);
            out += `\n`;
        });
        out += `};\n`;
    }
    
    return out;
}

export function parseCharRange(input: string): CharItem[] {
    const list: CharItem[] = [];

    if (input.includes('-') && !input.includes(',')) {
        const parts = input.split('-');
        if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
            const start = parseInt(parts[0], 10);
            const end = parseInt(parts[1], 10);
            for (let i = 32; i <= 126; i++) {
                list.push({
                    char: String.fromCharCode(i),
                    render: (i >= start && i <= end),
                    charCode: i
                });
            }
            return list;
        }
    }
    
    if (input.includes(',')) {
        const requested = new Set(input.split(',').map(s => s.trim().charCodeAt(0)));
        for (let i = 32; i <= 126; i++) {
            list.push({
                char: String.fromCharCode(i),
                render: requested.has(i),
                charCode: i
            });
        }
        return list;
    }
    
    for (let i = 32; i <= 126; i++) {
        list.push({ char: String.fromCharCode(i), render: true, charCode: i });
    }
    return list;
}
