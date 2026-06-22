import { FontData, Glyph } from '../core/types';

export class Emulator {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private lcdWidth = 128;
    private lcdHeight = 64;
    private pixelSize = 3;
    private pixelGap = 1;
    private activeColor = '#00FF00';

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    }

    public setDisplayDimensions(width: number, height: number, color: string) {
        this.lcdWidth = width;
        this.lcdHeight = height;
        this.activeColor = color;
        
        const isHighRes = this.lcdWidth >= 240;
        this.pixelSize = isHighRes ? 2 : 3;
        this.pixelGap = isHighRes ? 0 : 1;

        this.canvas.width = this.lcdWidth * this.pixelSize;
        this.canvas.height = this.lcdHeight * this.pixelSize;
        
        this.clearLCD();
    }

    public clearLCD() {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = 'rgba(255,255,255,0.03)';
        for (let y = 0; y < this.lcdHeight; y++) {
            for (let x = 0; x < this.lcdWidth; x++) {
                this.ctx.fillRect(
                    x * this.pixelSize + this.pixelGap, 
                    y * this.pixelSize + this.pixelGap, 
                    this.pixelSize - this.pixelGap * 2, 
                    this.pixelSize - this.pixelGap * 2
                );
            }
        }
    }

    private drawPixelAA(x: number, y: number, intensity: number) {
        if (x >= this.lcdWidth || y >= this.lcdHeight) return;
        
        if (intensity === 0) {
            this.ctx.fillStyle = 'rgba(255,255,255,0.03)';
            this.ctx.shadowBlur = 0;
        } else {
            this.ctx.fillStyle = this.activeColor;
            this.ctx.globalAlpha = intensity;
            this.ctx.shadowBlur = intensity > 0.5 ? 4 : 0;
            this.ctx.shadowColor = this.activeColor;
        }
        
        this.ctx.fillRect(
            x * this.pixelSize + this.pixelGap, 
            y * this.pixelSize + this.pixelGap, 
            this.pixelSize - this.pixelGap * 2, 
            this.pixelSize - this.pixelGap * 2
        );
        
        this.ctx.globalAlpha = 1.0;
    }

    private drawGlyph(glyph: Glyph, startX: number, startY: number, height: number) {
        if (glyph.formatCode) {
            const { width, stride, formatCode, data } = glyph;
            if (!stride) return;
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const byteOffset = y * stride;
                    let intensity = 0;
                    
                    if (formatCode === 1) {
                        const byte = data[byteOffset + Math.floor(x / 8)] || 0;
                        intensity = ((byte >> (7 - (x % 8))) & 1) ? 1.0 : 0.0;
                    } else if (formatCode === 2) {
                        const byte = data[byteOffset + Math.floor(x / 4)] || 0;
                        intensity = ((byte >> (6 - (x % 4) * 2)) & 0b11) / 3.0;
                    } else if (formatCode === 3) {
                        const byte = data[byteOffset + Math.floor(x / 2)] || 0;
                        intensity = ((byte >> (4 - (x % 2) * 4)) & 0b1111) / 15.0;
                    } else if (formatCode === 4) {
                        const byte = data[byteOffset + x] || 0;
                        intensity = byte / 255.0;
                    }
                    
                    if (intensity > 0) this.drawPixelAA(startX + x, startY + y, intensity);
                }
            }
        } else if (glyph.is3Bit) {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < glyph.width; x++) {
                    const byte = glyph.data[y * glyph.width + x] || 0;
                    if (byte > 0) {
                        this.drawPixelAA(startX + x, startY + y, byte / 7.0);
                    }
                }
            }
        } else {
            const pages = Math.ceil(height / 8);
            for (let page = 0; page < pages; page++) {
                for (let x = 0; x < glyph.width; x++) {
                    const byte = glyph.data[page * glyph.width + x] || 0;
                    for (let yBit = 0; yBit < 8; yBit++) {
                        const y = page * 8 + yBit;
                        if (y < height && (byte & (1 << yBit))) {
                            this.drawPixelAA(startX + x, startY + y, 1.0);
                        }
                    }
                }
            }
        }
    }

    public renderText(text: string, font: FontData | null) {
        this.clearLCD();
        if (!font) return;
        
        let cursorX = 2;
        let cursorY = 2;
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '\n') {
                cursorX = 2; 
                cursorY += font.height + 2;
                continue;
            }
            const glyph = font.glyphs[char];
            if (!glyph) {
                cursorX += 6; 
                continue;
            }
            if (cursorX + glyph.width > this.lcdWidth) {
                cursorX = 2; 
                cursorY += font.height + 2;
            }
            this.drawGlyph(glyph, cursorX, cursorY, font.height);
            cursorX += glyph.width + 1;
        }
    }
}
