import { FontData, Glyph } from './types';

export function parseVisualTFT(bytes: number[]): FontData {
    if (bytes.length < 4) throw new Error("Array too short");
    const firstChar = bytes[0];
    const lastChar = bytes[1];
    const height = bytes[2] | (bytes[3] << 8);
    const numChars = lastChar - firstChar + 1;
    
    let pointer = 4;
    const offsets: number[] = [];
    for (let i = 0; i < numChars; i++) {
        offsets.push(bytes[pointer] | (bytes[pointer+1] << 8));
        pointer += 2;
    }
    
    const widths: number[] = [];
    for (let i = 0; i < numChars; i++) {
        widths.push(bytes[pointer++]);
    }
    
    const dataStart = pointer;
    const glyphs: Record<string, Glyph> = {};
    const pages = Math.ceil(height / 8);
    
    for (let i = 0; i < numChars; i++) {
        const w = widths[i];
        const dataLength = w * pages;
        glyphs[String.fromCharCode(firstChar + i)] = {
            width: w, data: bytes.slice(dataStart + offsets[i], dataStart + offsets[i] + dataLength)
        };
    }
    return { height, glyphs };
}

export function parseStandard(bytes: number[], text: string): FontData {
    const heightMatch = text.match(/Height:\s*(\d+)/i);
    const widthMatch = text.match(/Width:\s*(\d+)/i);
    const charsMatch = text.match(/Chars:\s*([0-9,]+)/i);
    const formatMatch = text.match(/Format:\s*(3-bit AA)/i);
    
    if (!heightMatch || !widthMatch || !charsMatch) {
        throw new Error("Standard format requires metadata comments (Height, Width, Chars).");
    }
    
    const is3Bit = !!formatMatch;
    const height = parseInt(heightMatch[1], 10);
    const width = parseInt(widthMatch[1], 10);
    const charCodes = charsMatch[1].split(',').filter(x => x.trim() !== '').map(Number);
    
    const pages = is3Bit ? height : Math.ceil(height / 8);
    const bytesPerChar = pages * width;
    
    if (bytes.length < charCodes.length * bytesPerChar) {
        throw new Error("Not enough data for the parsed characters.");
    }
    
    const glyphs: Record<string, Glyph> = {};
    for (let i = 0; i < charCodes.length; i++) {
        const charCode = charCodes[i];
        glyphs[String.fromCharCode(charCode)] = {
            width: width, data: bytes.slice(i * bytesPerChar, (i + 1) * bytesPerChar), is3Bit: is3Bit
        };
    }
    return { height, glyphs };
}

export function parseFT800(bytes: number[]): FontData {
    if (bytes.length < 148) throw new Error("FT800 array is too short to contain a metric block.");
    const widths = bytes.slice(0, 128);
    const formatCode = bytes[128]; // 1=L1, 2=L2, 3=L4, 4=L8
    const height = bytes[140] | (bytes[141] << 8);
    
    if (height === 0) throw new Error("FT800 height is 0. Check metric block.");
    
    const dataStart = 148;
    const glyphs: Record<string, Glyph> = {};
    let currentOffset = 0;
    
    for (let i = 0; i < 128; i++) {
        const w = widths[i];
        if (w === 0) continue;
        
        let stride = 0;
        if (formatCode === 1) stride = Math.ceil(w / 8);
        if (formatCode === 2) stride = Math.ceil((w * 2) / 8);
        if (formatCode === 3) stride = Math.ceil((w * 4) / 8);
        if (formatCode === 4) stride = w;
        
        const dataLength = stride * height;
        glyphs[String.fromCharCode(i)] = {
            width: w, stride: stride, formatCode: formatCode,
            data: bytes.slice(dataStart + currentOffset, dataStart + currentOffset + dataLength)
        };
        currentOffset += dataLength;
    }
    
    return { height, glyphs, isAA: true };
}
