# Project Overview: tegnerobot / Img2SVG

## What it is

A web-based image-to-SVG converter designed for a **drawing robot** (tegnerobot). The core idea: take a photo or line drawing, run image processing on it, extract edges or a skeleton, vectorize those into bezier curves, and output SVG path data that the robot can follow with its pen.

The project originated as a MakeCode/micro:bit extension (see README) but has evolved into a standalone web app focused on the image-processing pipeline.

## Folder Structure

```
tegnerobot_claude/
│
├── image_to_svg_prototype.html   ← The active web app
├── app.js                        ← All application JavaScript (~1650 lines)
├── app.css                       ← All styles, includes @media mobile layout
├── potrace.js                    ← Third-party: Potrace vectorizer (SVG string output)
├── potrace_bg8.js                ← Third-party: Potrace bg8 variant (JSON bezier array output)
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
├── PROJECT_OVERVIEW.md           ← This file
├── Gemfile / Makefile / _config.yml  ← GitHub Pages config (must stay in root)
```

## The Web App: `image_to_svg_prototype.html`

The UI uses a flexbox panel grid that reorders itself for mobile via a `@media (max-width: 768px)` block in `app.css`.

**Desktop layout (2 columns, 8 panels):**

| Panel | Content |
|---|---|
| Image source (`#img-window`) | Input image; canvas overlay for OpenCV output |
| SVG output (`#svgWindow`) | Rendered SVG/canvas output — shared by both algorithms |
| Image processing controls | Thresholds, turd size, drawing width, mode selection |
| (invisible spacer) | — |
| Centerline canvas | Raw extracted skeleton/centerline with clickable start points |
| Smoothed output canvas | Final bezier curves after smoothing |
| Output options | Centerline toggle, mark start points toggle, Update centerline button, Pupil insert button, centerline separation slider, pupil diameter slider |
| Smoothing controls | Douglas-Peucker, moving average, angle threshold sliders, Apply smoothing button |

Below the grid: a `<textarea>` that outputs SVG path text for pasting into robot firmware.

## Pipeline / Processing Modes

Two detection methods are selectable via radio buttons (**mauroyLab is the default**):

### 1. mauroyLab line detection (default)
- Uses **OpenCV.js**: grayscale → median blur → **adaptive Gaussian threshold** (normalized kernel sizes based on image width)
- Thresholded binary image fed into **Potrace** (two variants in parallel):
  - `potrace.js` → SVG string, set as `innerHTML` of `#svgOutput` for browser preview
  - `potrace_bg8.js` → JSON bezier array stored in `ri.sortedLines` for robot output
- Turd size slider filters out small noise blobs from Potrace output
- Scaling: `drawingWidth / canvas.width` (display-size canvas, not full-res image)

### 2. Zhang-Suen line detection
- Uses **OpenCV.js**: grayscale → median blur → **Canny edge detection** (lower/upper thresholds)
- Applies **Zhang-Suen thinning** to reduce edges to a 1-pixel-wide skeleton
- Skeleton vectorized into polylines via nearest-neighbour path tracing (`vectorizeSkeleton`)
- **Chaikin corner cutting** applied for smoothing
- `curvesToPointArrays` converts polylines to point arrays stored in `ri.rawPointArrays`
- Paths sorted via `sortPathCurves` (nearest-neighbour travel optimization)
- Adjacent paths whose gap ≤ `centerLineSeparation` merged via `mergeCurvesByGap`
- Result stored in `ri.sortedLines`; canvas element appended to `#svgOutput` for preview

### Line Drawing Mode (checkbox)
- Skips edge detection; feeds grayscale image directly into the pipeline
- Intended for input images that are already line drawings

### Dynamic slider configs
When switching algorithms, the image processing sliders update their labels, ranges, and values:

| Slider | mauroyLab | Zhang-Suen |
|---|---|---|
| Blur | "Blur factor" (1–99, default 3) | "Lower threshold" (1–255, default 50) |
| Threshold | "Threshold factor" (2–99, default 2) | "Upper threshold" (1–255, default 180) |

## Post-processing (shared by both algorithms)

- **Center Line Separation slider**: controls the gap threshold for merging adjacent sorted curves into longer strokes
  - mauroyLab: used inside `drawPotraceSvgPath` during path sorting
  - Zhang-Suen: applied via `mergeCurvesByGap` after `sortPathCurves`; re-applied when "Update centerline" is clicked
- **Smoothing**: Douglas-Peucker, moving average, angle-threshold reduction (via `PointSmoother`)
- **Start points**: clickable circles drawn at curve start positions; clicking a circle deletes that curve section from `ri.sortedLines` and redraws
- **SVG path text generation**: with EOF marker (`addLineEnding`) appended last, after all `JSON.parse` calls on `ri.svgOutputData`
- **Sorting**: `sortPathCurves` minimizes pen travel distance between curves (nearest-neighbour)

## Global State Object (`ri`)

```js
const ri = {
    width: 1,              // image width (pixels)
    height: 1,             // image height (pixels)
    sortedLines: [],       // final sorted (and merged) point arrays — drawn to centerline canvas
    rawPointArrays: [],    // Zhang-Suen: unsorted point arrays before sort/merge (used by Update Centerline)
    centerLineCanvas: ..., // <canvas id="centerLineCanvas">
    createStartpoints: false,
    pathScaledDown: [],    // sortedLines scaled to robot drawing dimensions
    paddingFactor: 1.0,
    scaleFactorX: 1,       // pixels-per-mm scale factor
    svgOutputData: [],     // JSON bezier array (string); addLineEnding() appended last
    svgTextOutput: ...,    // <textarea id="svgTextOutput">
};
```

## Active Scripts (`app.js` sections)

| Section | Contents |
|---|---|
| GLOBALS & DOM REFERENCES | Element handles, `ri` state object, `smoothingSettings` |
| COLOR HELPERS | 7-colour cycling palette |
| OPENCV / IMAGE PROCESSING | `readImageFromSource`, `applyFilters`, `resizeImage`, `opencv2image`, dynamic slider config (`filterSliderConfigs`, `updateFilterSliders`) |
| ZHANG-SUEN THINNING | `zhangSuenThinning`, neighbor/transition helpers |
| PATH TRACING & VECTORIZATION | `vectorizeSkeleton`, `tracePaths`, `smoothCurveChaikin`, `douglasPeucker`, curve merging/deduplication |
| PATH SORTING & OPTIMIZATION | `findNearestNeighborPathImproved`, `sortPathCurves`, `mergeCurvesByGap` |
| BEZIER CURVE GENERATION | `generateBezierCurves`, `curvesToPointArrays` |
| BEZIER SMOOTHING | `PointSmoother` class, `generateBezierCurvesWithSmoothing`, `compareArraySizes` |
| SVG PARSING & BOUNDING BOX | `parseSvgPath`, `calcBoundingBox`, `calculateBoundingBoxPointArray` |
| SCANLINE FILL | `scanlineFillCopilot`, `scanlineFillYaxis` (retained but not wired to UI) |
| DRAWING & CANVAS OUTPUT | `drawCenterLine`, `drawBezierCurves`, `drawStartingPoints`, `createClickableCircle`, `clearClickableElements` |
| SVG OUTPUT & ROBOT SCALING | `createSvg`, `drawPotraceSvgPath`, `scaleSvgOutputToRobot`, `applySmoothing`, `addLineEnding` |
| UI / EVENT WIRING | All event listeners, mouse follower, `copySVG` |

## Key Implementation Notes

- **`addLineEnding` must be called last**: it appends an EOF marker that makes `ri.svgOutputData` unparseable by `JSON.parse`. All bezier drawing calls must happen before it.
- **`sortPathCurves` mutates its input**: always pass `[...copy]` to avoid corrupting source data.
- **OpenCV.js async timing**: the 8MB WASM loads after `imgSource.onload` fires, so `moduleInitialized` may be false when the default image loads. Processing is deferred until OpenCV signals ready.
- **Two Potrace variants**: `potrace.js` outputs SVG strings for browser display; `potrace_bg8.js` outputs JSON bezier arrays for robot firmware.
- **`#svgOutput` div is shared**: mauroyLab sets `innerHTML` to the SVG string; Zhang-Suen clears it and appends the `canvasSvgWindow` canvas element.

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
