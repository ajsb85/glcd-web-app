export interface Glyph {
    width: number;
    data: Uint8Array | number[];
    is3Bit?: boolean;
    formatCode?: number;
    stride?: number;
}

export interface FontData {
    height: number;
    glyphs: Record<string, Glyph>;
    isAA?: boolean;
}

export type ExportFormat = 
    | 'standard'
    | 'visual-tft'
    | 'ft800-l1'
    | 'ft800-l2'
    | 'ft800-l4'
    | 'ft800-l8'
    | 'fpga-3bit';

export interface CharItem {
    char: string;
    render: boolean;
    charCode?: number;
}
