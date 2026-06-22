import { Emulator } from './ui/emulator';
import { parseStandard, parseVisualTFT, parseFT800 } from './core/parser';
import { generateFontBytes, parseCharRange } from './core/generator';
import { FontData, ExportFormat } from './core/types';

const emulator = new Emulator('glcd-canvas');
let currentFont: FontData | null = null;

const displaySelect = document.getElementById('display-type') as HTMLSelectElement;
const colorBtns = document.querySelectorAll('.color-btn');
const arrayInput = document.getElementById('c-array-input') as HTMLTextAreaElement;
const testInput = document.getElementById('test-text') as HTMLInputElement;
const statusMsg = document.getElementById('parse-status') as HTMLDivElement;
const formatSelect = document.getElementById('export-format') as HTMLSelectElement;
const parseBtn = document.getElementById('parse-btn') as HTMLButtonElement;

// Font generation UI
const systemFontSelect = document.getElementById('system-font-select') as HTMLSelectElement;
const ttfUpload = document.getElementById('font-file') as HTMLInputElement;
const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;

function initCanvas() {
    const [w, h] = displaySelect.value.split('x').map(Number);
    const activeColorBtn = document.querySelector('.color-btn.active') as HTMLElement;
    const activeColor = window.getComputedStyle(activeColorBtn).backgroundColor;
    emulator.setDisplayDimensions(w, h, activeColor);
}

function showStatus(msg: string, success: boolean) {
    statusMsg.textContent = msg;
    statusMsg.className = 'status-msg ' + (success ? 'status-success' : 'status-error');
}

function parseArray() {
    const text = arrayInput.value;
    const hexMatches = text.match(/0x[0-9A-Fa-f]{2}/gi);
    if (!hexMatches) {
        showStatus('No valid hex bytes found.', false);
        return;
    }
    
    const bytes = hexMatches.map(h => parseInt(h, 16));
    const format = formatSelect.value as ExportFormat;
    
    try {
        if (format === 'visual-tft') currentFont = parseVisualTFT(bytes);
        else if (format === 'standard' || format === 'fpga-3bit') currentFont = parseStandard(bytes, text);
        else if (format.startsWith('ft800')) currentFont = parseFT800(bytes);
        else {
            showStatus('This format is not supported for rendering preview.', false);
            return;
        }
        showStatus(`Font loaded successfully! Found ${Object.keys(currentFont.glyphs).length} glyphs.`, true);
        testInput.disabled = false;
        emulator.renderText(testInput.value, currentFont);
    } catch (e: unknown) {
        showStatus('Parse error: ' + (e as Error).message, false);
    }
}

function generateArray() {
    try {
        const size = parseInt((document.getElementById('font-size') as HTMLInputElement).value, 10) || 16;
        const isBold = (document.getElementById('font-bold') as HTMLInputElement).checked;
        const isItalic = (document.getElementById('font-italic') as HTMLInputElement).checked;
        const invert = (document.getElementById('invert-pixels') as HTMLInputElement).checked;
        const exportFormat = formatSelect.value as ExportFormat;
        const charsInput = (document.getElementById('render-chars') as HTMLInputElement).value;
        
        let fontFamily = systemFontSelect.value;
        if (ttfUpload.files && ttfUpload.files.length > 0) {
            fontFamily = 'CustomUpload';
        }
        
        const charsList = parseCharRange(charsInput);
        const outString = generateFontBytes(charsList, exportFormat, fontFamily, size, isBold, isItalic, invert);
        
        arrayInput.value = outString;
        showStatus('Array generated successfully!', true);
    } catch (e: unknown) {
        showStatus('Generation error: ' + (e as Error).message, false);
    }
}

// Event Listeners
displaySelect.addEventListener('change', () => { 
    initCanvas(); 
    emulator.renderText(testInput.value, currentFont); 
});

colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        colorBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        initCanvas(); 
        emulator.renderText(testInput.value, currentFont);
    });
});

parseBtn.addEventListener('click', parseArray);
testInput.addEventListener('input', () => emulator.renderText(testInput.value, currentFont));
generateBtn.addEventListener('click', generateArray);

ttfUpload.addEventListener('change', async (e) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
        const file = target.files[0];
        const fontFace = new FontFace('CustomUpload', await file.arrayBuffer());
        await fontFace.load();
        document.fonts.add(fontFace);
        systemFontSelect.disabled = true;
    }
});

// Init
const systemFonts = [
    'Arial', 'Verdana', 'Courier New', 'Times New Roman', 'Georgia', 'Trebuchet MS', 'Impact',
    'Comic Sans MS', 'Consolas', 'Segoe UI', 'Roboto', 'Open Sans', 'Lato'
];
systemFonts.forEach(font => {
    const opt = document.createElement('option');
    opt.value = font;
    opt.textContent = font;
    systemFontSelect.appendChild(opt);
});

initCanvas();
