# Project Overview: tegnerobot / Img2SVG

## What it is

A web-based image-to-SVG converter designed for a **drawing robot** (tegnerobot). The core idea: take a photo or line drawing, run image processing on it, extract edges or a skeleton, vectorize those into bezier curves, and output SVG path data that the robot can follow with its pen.

The project originated as a MakeCode/micro:bit extension (see README) but has evolved into a standalone web app focused on the image-processing pipeline.

## Folder Structure

```
tegnerobot_claude/
│
├── image_to_svg_prototype.html   ← The active web app
├── app.js                        ← All application JavaScript (1650 lines)
├── app.css                       ← All styles, includes @media mobile layout
├── potrace.js                    ← Third-party: Potrace vectorizer
├── potrace_bg8.js                ← Third-party: Potrace bg8 variant
├── opencv.js                     ← Third-party: OpenCV WASM (~8MB)
│
├── images/                       ← Test images and SVG files
├── data/                         ← Robot drawing data output (.txt files, 56 files)
├── makecode/                     ← micro:bit MakeCode TypeScript project
├── robot/                        ← Robot hardware code (JS, C++, Python, docs)
├── archive/                      ← Old prototypes and pre-modularization source files
│
├── README.md                     ← GitHub/MakeCode extension readme
├── CLAUDE.md                     ← Project instructions for Claude Code
├── Gemfile / Makefile / _config.yml  ← GitHub Pages config (must stay in root)
```

## The Web App: `image_to_svg_prototype.html`

The UI uses a flexbox panel grid that reorders itself for mobile via a `@media (max-width: 768px)` block in `app.css`.

**Desktop layout (2 columns):**

| Panel | Content |
|---|---|
| Image source | Input image; canvas overlay for OpenCV output |
| SVG output | Rendered SVG curves + canvas overlay |
| Image processing controls | Thresholds, turd size, drawing width, mode selection |
| (invisible spacer) | — |
| Centerline canvas | Raw extracted skeleton/centerline |
| Smoothed output canvas | Final bezier curves after smoothing |
| Output options | Scanlines, fill, centerline, outline, start point toggles |
| Smoothing controls | Douglas-Peucker, moving average, angle threshold sliders |

Below the grid: a `<textarea>` that outputs SVG path text for pasting into robot firmware.

## Pipeline / Processing Modes

Two detection methods are selectable via radio buttons:

### 1. mauroyLab line detection
- Uses **OpenCV.js** for Canny edge detection with configurable thresholds
- Edges fed into **Potrace** for vectorization into bezier curves
- Historically the first method implemented

### 2. Zhang-Suen line detection (currently default)
- Uses **OpenCV.js** for grayscale conversion and optional Canny edge detection
- Applies **Zhang-Suen thinning** to reduce edges to a 1-pixel-wide skeleton
- Skeleton vectorized into polylines via nearest-neighbour path tracing
- **Chaikin corner cutting** applied for smoothing
- Bezier curves computed and scaled for robot output

Both methods share a post-processing stage:
- Sorting curves by travel distance (shortest-path ordering for robot pen efficiency)
- Smoothing via Douglas-Peucker, moving average, and angle-threshold reduction
- SVG path text generation with EOF marker for micro:bit firmware

## Active Scripts (`app.js` sections)

All hand-written JavaScript is consolidated into one file with clearly labelled sections:

| Section | Contents |
|---|---|
| GLOBALS & DOM REFERENCES | Element handles, `ri` state object, `smoothingSettings` |
| COLOR HELPERS | 7-colour cycling palette |
| OPENCV / IMAGE PROCESSING | `readImageFromSource`, `applyFilters`, `resizeImage`, `opencv2image` |
| ZHANG-SUEN THINNING | `zhangSuenThinning`, neighbor/transition helpers |
| PATH TRACING & VECTORIZATION | `vectorizeSkeleton`, `tracePaths`, `smoothCurveChaikin`, `douglasPeucker`, curve merging/deduplication |
| PATH SORTING & OPTIMIZATION | `findNearestNeighborPathImproved`, `sortPathCurves` |
| BEZIER CURVE GENERATION | `generateBezierCurves`, `curvesToPointArrays` |
| BEZIER SMOOTHING | `PointSmoother` class, `generateBezierCurvesWithSmoothing`, `compareArraySizes` |
| SVG PARSING & BOUNDING BOX | `parseSvgPath`, `calcBoundingBox`, `calculateBoundingBoxPointArray` |
| SCANLINE FILL | `scanlineFillCopilot`, `scanlineFillYaxis` |
| DRAWING & CANVAS OUTPUT | `drawCenterLine`, `drawBezierCurves`, `drawStartingPoints`, clickable circle deletion UI |
| SVG OUTPUT & ROBOT SCALING | `createSvg`, `drawPotraceSvgPath`, `scaleSvgOutputToRobot`, `applySmoothing`, `addLineEnding` |
| UI / EVENT WIRING | All event listeners, `closeOverlay`, mouse follower, `copySVG` |

## `images/` — Test Assets

PNG/JPG photos and SVG drawings used as input to the web app:

| File | Notes |
|---|---|
| `lillebror_newborn512.png` | Default image loaded on startup (referenced in HTML) |
| `astronaut.jpg` | Standard test photo |
| `owl.png` / `owl.svg` | Line drawing test |
| `victor.svg` / `victor_large.svg` | Portrait SVG test files |
| `einstein_large.svg` | Portrait test |
| `bg8.svg` / `bg8_2.svg` | Group photo SVGs |
| `test_svg.svg` / `test_svg_first_bezier.svg` | Minimal SVG test files |
| `circle.png`, `rectangle.png`, `astronaut_crop.png` etc. | Geometry / crop tests |

## `data/` — Robot Drawing Data (56 files)

`.txt` files containing SVG path arrays and bezier curve output previously sent to the robot. Filenames describe the drawing and parameters (e.g. `victor_3_50mm.txt`, `astronaut_centerline_75mm.txt`).

## `makecode/` — micro:bit MakeCode Extension

The original form of this project — a MakeCode extension that runs on a BBC micro:bit to drive the drawing robot's stepper motors.

| File | Role |
|---|---|
| `main.ts` / `main.blocks` | Main MakeCode program |
| `custom.ts` | Custom block definitions |
| `bme280.ts` | BME280 temperature/humidity sensor driver |
| `bresenham.ts` | Bresenham line/circle algorithm for motor stepping |
| `kodeFraSimulator.ts` | Code extracted from MakeCode simulator |
| `pxt.json` / `tsconfig.json` | MakeCode project config |
| `pathFilling_incomplete.ts`, `svg_to_polygon.ts`, `test.ts` | Experimental/incomplete TS files |

## `robot/` — Hardware & Analysis Code

Low-level code and analysis tools for the physical robot:

| File | Role |
|---|---|
| `bresenham.js` | Bresenham algorithm (JavaScript port) |
| `calibration_axis.js` / `calibration_repetition.js` | Motor axis calibration routines |
| `i2c_functions.js` | I2C communication helpers |
| `efficient-path-filling-bezier.js` | Path fill experiment |
| `tegnealgoritme.cpp` / `pins.cpp` | C++ drawing algorithm and pin definitions |
| `plot_*.py` / `read_svg.py` / `main.py` | Python analysis and plotting scripts |
| `bezier_calculator.xlsx` | Bezier parameter spreadsheet |
| `Astronaut-test.docx` | Test documentation |
| `Glass_TTY_VT220.ttf` | Terminal font (used in UI experiments) |
| `edgeCanvas.tsx` | Experimental React canvas component |
| `bezier_bresenham.html` | Old Bresenham + bezier experiment |
| `demo_programs/` | Standalone demo scripts |

## `archive/` — Pre-Modularization Source (52 files)

All files present before the January 2026 modularization. Includes:
- The 10 original hand-written JS source files (now merged into `app.js`)
- `legacy.js` — unused/replaced functions with explanatory comments
- All old HTML prototype files (zhang_suen_thinning.html, bezier experiments, etc.)
- Old CSS files (`image2svg.css`, `image2svg_v2.css`, `bresenham.css`)
