# GLCD Font Studio & Web Emulator

A complete, 100% native browser-based Graphic LCD font generator and matrix emulator designed specifically for Embedded Software Engineers. 

Instead of relying on archaic desktop utilities, GLCD Font Studio uses modern HTML5 Canvas typography engines to natively measure, anti-alias, and mathematically pack TrueType fonts into raw Hexadecimal C-Arrays, entirely on the client-side.

## Core Features

- **Universal TrueType Support**: Upload any `.ttf` or `.otf` font file to directly render into bitmaps.
- **Native OS Font Access**: Seamlessly scans and accesses your natively installed system fonts without requiring uploads.
- **Custom Character Subsets**: Save microcontroller ROM space by generating sparse arrays that contain *only* the specific letters you type (e.g. `ABCD12`), while keeping standard array indexing intact via dummy-offset generation.
- **Advanced Pixel Inversion**: 1-click support for "Negative" polarized displays (where `0` is ON and `1` is OFF).
- **Live Canvas Emulation**: Instantly visualize the hex arrays you generated on an interactive simulated graphic matrix.
- **Hardware-Accelerated Anti-Aliasing**: For advanced FT800 graphic chips, the studio automatically quantizes font alpha-channels into highly optimized 2-bit, 4-bit, and 8-bit multi-level grayscale byte arrays.

## Supported Export Formats

1. **Standard Raw** (1-bit Monospace, Vertically packed)
2. **Visual TFT** (1-bit Proportional, Vertically packed)
3. **FT800 / EVE - L1** (1-bit, Horizontally packed)
4. **FT800 / EVE - L2** (2-bit Anti-Aliased)
5. **FT800 / EVE - L4** (4-bit Anti-Aliased)
6. **FT800 / EVE - L8** (8-bit Anti-Aliased)
7. **FPGA 2D Accelerator** (3-bit Anti-Aliased, 0-7 Alpha Quantization)

## Compatible Graphic Controllers

The generated arrays and the emulator's internal logic are designed to support the physical rasterization patterns of major commercial LCD controller variants, including:

- **128x64 LCDs**: 
  - *KS0108* (Classic Parallel)
  - *ST7920* (Popular for SPI support & internal fonts)
  - *NT7108 / S6B0108* (Direct KS0108 pin-to-pin equivalents)
  
- **240x128 LCDs**:
  - *T6963C* (Classic Medium-Resolution)
  - *RA6963* (Modern equivalent from Winstar)
  - *SED1335 / S1D13305* (Versatile mid-to-high end controller)

- **320x240 LCDs**:
  - *RA8835* (Classic Graphic LCD)
  - *S1D13700* (High-performance Epson controller for complex graphics)
  - *RA8806 / RA8803* (Advanced RAITEK family controllers)
  - **Note on Technology Limits**: 320x240 (QVGA) represents the historical maximum resolution for traditional monochrome dot-matrix GLCDs in the commercial market. If a larger viewing area is required while maintaining monochrome technology (FSTN, STN Blue, Yellow/Green), the industry standard is to scale the physical size of the 320x240 matrix up to a **5.7-inch diagonal panel** (approx. 160x109mm module size) using the S1D13700 or RA8835 controllers (e.g., Winstar WG320240B, Newhaven Display).

- **Advanced Anti-Aliasing & Alpha Blending Accelerators**:
  - *FTDI / Bridgetek EVE Series (FT800/810/BT817)*: Famous for its "Embedded Video Engine" architecture. It streams graphics line-by-line using an object list (Display List) with native hardware anti-aliasing. Ideal for driving complex UIs from low-end MCUs via SPI/QSPI since it requires practically zero frame-buffer RAM.
  - *RAIO Technology (RA8876 / RA8877)*: Direct TFT competitors to EVE featuring built-in 2D Graphics Engines and hardware-accelerated Alpha Blending (layer mixing with configurable transparency).
  - *STMicroelectronics Chrom-ART (DMA2D)*: A dedicated hardware block inside STM32 MCUs (F4/F7/H7/U5) designed to offload alpha blending from the CPU. It performs automated pixel format conversions (e.g., converting 8-bit Alpha-only bitmaps into anti-aliased 16-bit RGB over backgrounds) in a single clock cycle.
  - *Renesas RX / RA Series (GLCDC & Dave2D)*: Integrates the Dave2D engine to provide full hardware-accelerated vector graphics, sub-pixel precision anti-aliasing, and flawless 8-bit Alpha Blending for industrial UIs.
  - *NXP i.MX RT Series (PXP)*: Crossover MCUs with a dedicated Pixel Processing Pipeline (PXP) bitblit engine that handles on-the-fly scaling, rotation, color-space conversion, and multi-layer blending (acting as an onboard GPU).
  - *Epson S1D13xxx Series (S1D13781/L01)*: Advanced external display controllers featuring dedicated Alpha Blending engines that support multiple LUTs and layer stacking (favored in medical/marine instrumentation).
  - *FPGA 2D Graphics Accelerators*: Based on academic architectures such as *"The Design of a 2D Graphics Accelerator for Embedded Systems"* (Oh et al., Electronics 2021). These custom 180nm CMOS logic engines utilize optimized 3-bit alpha quantification (a 0-7 intensity scale) alongside modified Bresenham line-drawing logic to dramatically reduce silicon area and memory bandwidth while achieving high-quality anti-aliased font rendering natively.

## Quick Start

1. Select a System Font or Upload a TTF file.
2. Select your desired export format and character subset.
3. Click **Generate Array**.
4. Use the **Copy** or **Save .c** button to drop the C-code directly into your embedded IDE.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
