import { describe, it, expect } from 'vitest';
import { parseStandard, parseVisualTFT } from '../src/core/parser';

describe('Parser Core Logic', () => {
    it('should correctly parse a standard format 1-bit array', () => {
        const metadata = `// Height: 8, Width: 8, Chars: 65 Format: 1-bit`;
        // 8 bytes for 'A' = 8x8 font
        const bytes = [0x7E, 0x11, 0x11, 0x11, 0x7E, 0x00, 0x00, 0x00];
        
        const result = parseStandard(bytes, metadata);
        expect(result.height).toBe(8);
        expect(result.glyphs['A']).toBeDefined();
        expect(result.glyphs['A'].width).toBe(8);
        expect(result.glyphs['A'].data.length).toBe(8);
    });

    it('should throw error when metadata is missing in standard format', () => {
        const metadata = `// Height: 8, Chars: 65`;
        const bytes = [0x00, 0x00];
        expect(() => parseStandard(bytes, metadata)).toThrowError(/metadata comments/);
    });

    it('should throw error when byte array is incomplete', () => {
        const metadata = `// Height: 8, Width: 8, Chars: 65 Format: 1-bit`;
        const bytes = [0x7E, 0x11, 0x11]; // Incomplete data
        expect(() => parseStandard(bytes, metadata)).toThrowError(/Not enough data/);
    });

    it('should successfully parse FPGA 3-bit arrays correctly', () => {
        const metadata = `// Height: 20, Width: 16, Chars: 65 Format: 3-bit AA`;
        const bytes = new Array(320).fill(0x07); // 20 * 16
        
        const result = parseStandard(bytes, metadata);
        expect(result.height).toBe(20);
        expect(result.glyphs['A']).toBeDefined();
        expect(result.glyphs['A'].is3Bit).toBe(true);
        expect(result.glyphs['A'].data.length).toBe(320);
    });

    it('should successfully parse a visual-tft formatted array', () => {
        // Mock a 1-character 'A' visual TFT array
        const bytes = [
            0x41, 0x41, // First char, last char ('A')
            0x08, 0x00, // Height (8)
            0x00, 0x00, // Offset 0
            0x05,       // Width 5
            // Data
            0x7E, 0x11, 0x11, 0x11, 0x7E
        ];
        const result = parseVisualTFT(bytes);
        expect(result.height).toBe(8);
        expect(result.glyphs['A']).toBeDefined();
        expect(result.glyphs['A'].width).toBe(5);
        expect(result.glyphs['A'].data.length).toBe(5);
    });
});
