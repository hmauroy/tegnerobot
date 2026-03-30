// =====================================================================
// app.js  –  Img2SVG Application
// Merged from: image_to_svg.js, bezier_to_centerline.js,
//   sortPoints_next_neighbour.js, svg_points_to_bezier.js,
//   svg_points_to_bezier_smoothing.js, svg_colorArray.js,
//   svg_scanlineFill.js, svg_parseSvg.js, svg_drawingFunctions.js,
//   svg_points_to_bezier_v3.js, and the inline <script> from the HTML.
// Unused functions are in archive/legacy.js.
// =====================================================================


// === GLOBALS & DOM REFERENCES ===

// --- From image_to_svg.js ---
const imgSource   = document.getElementById("img-src");
const fileInputEl = document.getElementById("fileInput");
const canvas          = document.getElementById("canvas");
const canvasSvgWindow = document.getElementById("canvas-svg-window");
const ctx1 = canvas.getContext("2d", [{ willReadFrequently: true }]);
const svgOutput   = document.getElementById("svgOutput");

let beziers = [];           // Center line beziers stored here.
let src, gray, medianBlurred, thresholded, grayScaled, edgeScaled;
let moduleInitialized = false;
let firstRun = true;
let imgData;

// --- From bezier_to_centerline.js ---
const imgSrc      = document.getElementById("img-src");   // same element as imgSource
const ctx         = document.getElementById("centerLineCanvas").getContext("2d");
const smoothedCanvas   = document.getElementById("smoothedCanvas");
const centerlineCheckbox     = document.getElementById("centerlineCheckbox");
const startpointsCheckbox    = document.getElementById("startpointsCheckbox");
const centerLineSeparationEl = document.getElementById("centerLineSeparation");
const btnUpdateCenterline = document.getElementById("btnUpdateCenterline");
const btnApplySmoothing   = document.getElementById("btnApplySmoothing");
const enableSmoothingElement     = document.getElementById('enableSmoothing');
const minDistanceElement         = document.getElementById('minDistance');
const angleThresholdElement      = document.getElementById('angleThreshold');
const douglasEpsilonElement      = document.getElementById('douglasEpsilon');
const movingAverageWindowElement = document.getElementById('movingAverageWindow');
const compressionInfoEl = document.getElementById('compressionInfo');

let smoothingSettings = {
    enableSmoothing: true,
    minDistance: 1.5,
    angleThreshold: 0.1,
    douglasEpsilon: 0.1,
    movingAverageWindow: 3,
    applyMovingAverage: true
};

// --- From svg_colorArray.js ---
const colors = [
    "#FF5733",  // Red-Orange
    "#33FF57",  // Green
    "#3357FF",  // Blue
    "#F733FF",  // Purple
    "#FFDD33",  // Yellow
    "#33FFF9",  // Cyan
    "#FF33A8",  // Pink
];
let colorIndex = -1;

// --- Global state object (was inline in HTML) ---
const ri = {
    width: 1,
    height: 1,
    sortedLines: [],
    centerLineCanvas: document.getElementById("centerLineCanvas"),
    createStartpoints: false,
    pathScaledDown: [],
    paddingFactor: 1.0,
    scaleFactorX: 1,
    svgOutputData: [],
    svgTextOutput: document.getElementById("svgTextOutput"),
};

// Catch OpenCV runtime errors.
window.addEventListener('error', function(event) {
    alert("OpenCV error occurred. Please refresh page.");
});


// === COLOR HELPERS ===
// (from svg_colorArray.js)

function getNextColor(currentIndex) {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= colors.length) {
        return { color: colors[0], index: 0 };
    }
    return { color: colors[nextIndex], index: nextIndex };
}

function getColorForElement() {
    const result = getNextColor(colorIndex);
    colorIndex = result.index;
    return result.color;
}


// === OPENCV / IMAGE PROCESSING ===
// (from image_to_svg.js)

let Module = {
    // https://emscripten.org/docs/api_reference/module.html#Module.onRuntimeInitialized
    onRuntimeInitialized() {
        moduleInitialized = true;
        [src, gray] = readImageFromSource();
        document.getElementById("opencv-status").innerHTML = "OpenCV.js is ready.";
    },
};

function readImageFromSource() {
    gray          = new cv.Mat();
    medianBlurred = new cv.Mat();
    thresholded   = new cv.Mat();
    grayScaled    = new cv.Mat();
    edgeScaled    = new cv.Mat();
    src = readImageHighDef("img-src", false);
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    return [src, gray];
}

function readImageHighDef(imageId, highDef = false) {
    let img = document.getElementById(imageId);
    console.log("img naturalsize: " + img.naturalWidth + "x" + img.naturalHeight);
    let tempCanvas = document.createElement('canvas');
    if (highDef) {
        if (img.naturalWidth >= 1000 || img.naturalHeight >= 1000) {
            if (img.naturalWidth < img.naturalHeight) {
                tempCanvas.height = 1000;
                let scaleX = 1000 / img.naturalHeight;
                tempCanvas.width = img.naturalWidth * scaleX;
            } else {
                tempCanvas.width = 1000;
                let scaleY = 1000 / img.naturalWidth;
                tempCanvas.height = img.naturalHeight * scaleY;
            }
        } else {
            tempCanvas.width  = img.naturalWidth;
            tempCanvas.height = img.naturalHeight;
        }
        let tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0);
        let mat = cv.imread(tempCanvas);
        console.log('High def image size:', mat.cols, 'x', mat.rows);
        return mat;
    } else {
        return cv.imread(img);
    }
}

function resizeImage(opencvImage, width, height) {
    let blurred = new cv.Mat();
    let dst     = new cv.Mat();
    let scaleX  = width  / opencvImage.cols;
    let scaleY  = height / opencvImage.rows;
    let scale   = Math.min(scaleX, scaleY);
    let sigma      = 1.0 / scale;
    let kernelSize = 5;
    console.log("Resize using kernel size " + kernelSize);
    let ksize = new cv.Size(kernelSize, kernelSize);
    cv.GaussianBlur(opencvImage, blurred, ksize, sigma, sigma, cv.BORDER_DEFAULT);
    let dsize = new cv.Size(width, height);
    cv.resize(blurred, dst, dsize, 0, 0, cv.INTER_LINEAR);
    return dst;
}


// Slider configurations per detection mode.
const filterSliderConfigs = {
    'mauroy-lab': {
        blur:   { label: 'Blur factor',      min: 1, max: 99,  value: 3,   step: 1 },
        thresh: { label: 'Threshold factor', min: 2, max: 99,  value: 2,   step: 1 },
    },
    'zhang-suen': {
        blur:   { label: 'Lower threshold',  min: 1, max: 255, value: 50,  step: 1 },
        thresh: { label: 'Upper threshold',  min: 1, max: 255, value: 180, step: 1 },
    },
};

function updateFilterSliders() {
    const mode = document.querySelector('input[name="processMethod"]:checked').value;
    const cfg  = filterSliderConfigs[mode];
    const blurSlider   = document.getElementById("rngBlur");
    const threshSlider = document.getElementById("rngThresh");
    blurSlider.min   = cfg.blur.min;
    blurSlider.max   = cfg.blur.max;
    blurSlider.step  = cfg.blur.step;
    blurSlider.value = cfg.blur.value;
    threshSlider.min   = cfg.thresh.min;
    threshSlider.max   = cfg.thresh.max;
    threshSlider.step  = cfg.thresh.step;
    threshSlider.value = cfg.thresh.value;
    document.getElementById("rngBlur-value").textContent   = cfg.blur.value;
    document.getElementById("rngThresh-value").textContent = cfg.thresh.value;
    // Update visible labels
    const labels = document.querySelectorAll('.slider-label span:first-child');
    labels.forEach(el => {
        if (el.nextElementSibling && el.nextElementSibling.id === 'rngBlur-value')
            el.textContent = cfg.blur.label;
        if (el.nextElementSibling && el.nextElementSibling.id === 'rngThresh-value')
            el.textContent = cfg.thresh.label;
    });
}

function applyFilters() {
    [src, gray] = readImageFromSource();
    document.getElementById("svgOutput").innerHTML = "";
    let val1       = parseFloat(document.getElementById("rngBlur").value);
    let val2       = parseFloat(document.getElementById("rngThresh").value);
    let turd_factor = document.getElementById("rngTurdsize").value;
    let img         = document.getElementById("img-src");

    ri.width  = gray.cols;
    ri.height = gray.rows;

    let turd_value = parseInt(Math.round(turd_factor * ri.width * 0.01));
    if (turd_value <= 1) turd_value = 1;

    medianBlurred = new cv.Mat();
    thresholded   = new cv.Mat();

    const useMauroy = document.getElementById("mauroyLab_detection").checked;
    let lineDrawingMode = document.getElementById("lineDrawingMode");
    if (lineDrawingMode.checked) {
        console.log("No edge detection if line drawing.");
        edgeScaled = resizeImage(gray, img.width, img.height);
        opencv2image(edgeScaled);
        showOverlay("img-overlay", "img-window");
    } else if (useMauroy) {
        // Adaptive threshold — blur and block size normalized to image width
        let blur_value = parseInt(Math.round(val1 * ri.width * 0.002));
        if (blur_value % 2 === 0) blur_value -= 1;
        if (blur_value < 3) blur_value = 3;
        let thresh_value = parseInt(Math.round(val2 * ri.width * 0.005));
        if (thresh_value % 2 === 0) thresh_value -= 1;
        if (thresh_value < 3) thresh_value = 3;
        cv.medianBlur(gray, medianBlurred, blur_value);
        cv.adaptiveThreshold(medianBlurred, thresholded, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, thresh_value, 2);
        showOverlay("img-overlay", "img-window");
        edgeScaled = resizeImage(thresholded, img.width, img.height);
        opencv2image(edgeScaled);
    } else {
        // Canny edge detection for Zhang-Suen
        let blurred = new cv.Mat();
        cv.medianBlur(gray, blurred, 7);
        cv.Canny(blurred, thresholded, val1, val2);
        cv.bitwise_not(thresholded, thresholded);
        showOverlay("img-overlay", "img-window");
        edgeScaled = resizeImage(thresholded, img.width, img.height);
        opencv2image(edgeScaled);
    }
}

function opencv2image(opencvData, ctx = ctx1) {
    canvas.width  = imgSource.width;
    canvas.height = imgSource.height;
    imgData = ctx.createImageData(canvas.width, canvas.height);
    for (let i = 0, j = 0; i < opencvData.data.length; i++, j += 4) {
        imgData.data[j] = imgData.data[j + 1] = imgData.data[j + 2] = opencvData.data[i];
        imgData.data[j + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
}

function arrayMinMax(arr) {
    let min = arr.reduce((a, b) => Math.min(a, b));
    let max = arr.reduce((a, b) => Math.max(a, b));
    return [min, max];
}

function matToBinaryArray(mat) {
    const data   = mat.data;
    const binary = new Array(data.length);
    for (let i = 0; i < data.length; i++) {
        binary[i] = data[i] > 0 ? 1 : 0;
    }
    return binary;
}


// === ZHANG-SUEN THINNING ===
// (from image_to_svg.js)

function zhangSuenThinning(binary, width, height) {
    let current = [...binary];
    let changed = true;
    while (changed) {
        changed = false;
        const toDelete1 = [];
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                if (current[idx] === 1 && shouldDelete1(current, x, y, width)) toDelete1.push(idx);
            }
        }
        for (const idx of toDelete1) { current[idx] = 0; changed = true; }
        const toDelete2 = [];
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = y * width + x;
                if (current[idx] === 1 && shouldDelete2(current, x, y, width)) toDelete2.push(idx);
            }
        }
        for (const idx of toDelete2) { current[idx] = 0; changed = true; }
    }
    return current;
}

function getNeighbors(data, x, y, width) {
    return [
        data[(y - 1) * width + x],       data[(y - 1) * width + (x + 1)],
        data[y       * width + (x + 1)], data[(y + 1) * width + (x + 1)],
        data[(y + 1) * width + x],       data[(y + 1) * width + (x - 1)],
        data[y       * width + (x - 1)], data[(y - 1) * width + (x - 1)]
    ];
}

function countTransitions(neighbors) {
    let count = 0;
    for (let i = 0; i < 8; i++) if (neighbors[i] === 0 && neighbors[(i + 1) % 8] === 1) count++;
    return count;
}

function countBlackNeighbors(neighbors) { return neighbors.reduce((s, v) => s + v, 0); }

function shouldDelete1(data, x, y, width) {
    const n = getNeighbors(data, x, y, width);
    const [p1, p2, p3, p4, p5, p6, p7] = n;
    const bn = countBlackNeighbors(n), t = countTransitions(n);
    return (bn >= 2 && bn <= 6 && t === 1 && (p1 * p3 * p5) === 0 && (p3 * p5 * p7) === 0);
}

function shouldDelete2(data, x, y, width) {
    const n = getNeighbors(data, x, y, width);
    const [p1,, p3,, p5,, p7] = n;
    const bn = countBlackNeighbors(n), t = countTransitions(n);
    return (bn >= 2 && bn <= 6 && t === 1 && (p1 * p3 * p7) === 0 && (p1 * p5 * p7) === 0);
}


// === PATH TRACING & VECTORIZATION ===
// (from image_to_svg.js)

function vectorizeSkeleton(binaryData, width, height, shouldSimplify = true, shouldOptimize = true) {
    const paths = tracePaths(binaryData, width, height);
    let allCurves = [];

    for (const path of paths) {
        if (path.length < 2) continue;
        let processedPath = path;
        if (shouldSimplify && path.length > 3) processedPath = douglasPeucker(path, 1.5);
        const pathCurve = createSingleCurveFromPath(processedPath);
        if (pathCurve) allCurves.push(pathCurve);
    }

    // Remove curves that are too short (< 3 pixels total length).
    allCurves = allCurves.filter(curve => {
        if (curve.points.length < 2) return false;
        let totalLength = 0;
        for (let i = 1; i < curve.points.length; i++) {
            totalLength += distance(curve.points[i - 1], curve.points[i]);
        }
        return totalLength >= 3;
    });

    allCurves = removeRedundantCurves(allCurves, 8);

    if (shouldOptimize && allCurves.length > 1) {
        allCurves = optimizeDrawingOrder(allCurves);
        allCurves = mergeCloseCurves4(allCurves, 10);
    }

    return allCurves;
}

function createSingleCurveFromPath(points) {
    /* Claude 4.5 Sonnet added smoothing via Chaikin corner cutting. */
    if (points.length < 2) return null;
    const smoothedPoints = smoothCurveChaikin(points, 2);
    return {
        type: 'polyline',
        points: smoothedPoints,
        id: Math.random().toString(36).slice(2, 11)
    };
}

function tracePaths(binaryData, width, height) {
    const visited = new Array(width * height).fill(false);
    const paths   = [];

    function neighborCount(x, y) {
        let c = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            if (binaryData[ny * width + nx] === 1) c++;
        }
        return c;
    }

    const endpoints = [];
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (binaryData[idx] !== 1) continue;
        if (neighborCount(x, y) === 1) endpoints.push({ x, y });
    }

    function nextSeed() {
        for (const p of endpoints) { const idx = p.y * width + p.x; if (!visited[idx]) return p; }
        for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (binaryData[idx] === 1 && !visited[idx]) return { x, y };
        }
        return null;
    }

    let seed;
    while ((seed = nextSeed())) {
        const path = traceSinglePathContinuous(binaryData, visited, seed.x, seed.y, width, height, 2);
        if (path.length > 1) paths.push(path);
    }
    return paths;
}

function traceSinglePathContinuous(binaryData, visited, startX, startY, width, height, bridgeTolerance = 2) {
    const path = [];
    let current = { x: startX, y: startY };
    let prevDir = null;

    function idx(x, y)      { return y * width + x; }
    function inBounds(x, y) { return x >= 0 && y >= 0 && x < width && y < height; }

    function unvisitedNeighbors(x, y) {
        const n = [];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (!inBounds(nx, ny)) continue;
            const i = idx(nx, ny);
            if (binaryData[i] === 1 && !visited[i]) n.push({ x: nx, y: ny, dx, dy });
        }
        return n;
    }

    function angleScore(dir) {
        if (!prevDir) return 0;
        return -(prevDir.dx * dir.dx + prevDir.dy * dir.dy);
    }

    function findNearestUnvisitedWithin(rMax) {
        let best = null, bestD2 = Infinity;
        for (let r = 1; r <= rMax; r++) {
            for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
                const nx = current.x + dx, ny = current.y + dy;
                if (!inBounds(nx, ny)) continue;
                const i = idx(nx, ny);
                if (binaryData[i] === 1 && !visited[i]) {
                    const d2 = dx * dx + dy * dy;
                    if (d2 < bestD2) { bestD2 = d2; best = { x: nx, y: ny }; }
                }
            }
            if (best) break;
        }
        return best;
    }

    function bresenham(x0, y0, x1, y1) {
        const points = [];
        let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
        let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        while (true) {
            points.push({ x: x0, y: y0 });
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 >= dy) { err += dy; x0 += sx; }
            if (e2 <= dx) { err += dx; y0 += sy; }
        }
        return points;
    }

    while (true) {
        if (!visited[idx(current.x, current.y)]) {
            visited[idx(current.x, current.y)] = true;
            path.push({ x: current.x, y: current.y });
        }

        const neigh = unvisitedNeighbors(current.x, current.y);
        if (neigh.length > 0) {
            neigh.sort((a, b) => angleScore(a) - angleScore(b) || (a.dx * a.dx + a.dy * a.dy) - (b.dx * b.dx + b.dy * b.dy));
            const n = neigh[0];
            prevDir = { dx: n.dx, dy: n.dy };
            current = { x: n.x, y: n.y };
            continue;
        }

        const jump = findNearestUnvisitedWithin(bridgeTolerance);
        if (jump) {
            const line = bresenham(current.x, current.y, jump.x, jump.y);
            for (let k = 1; k < line.length; k++) {
                const p = line[k];
                if (path.length === 0 || (p.x !== path[path.length - 1].x || p.y !== path[path.length - 1].y)) {
                    path.push({ x: p.x, y: p.y });
                }
                const ind = idx(p.x, p.y);
                if (binaryData[ind] === 1 && !visited[ind]) visited[ind] = true;
            }
            prevDir = { dx: Math.sign(jump.x - current.x), dy: Math.sign(jump.y - current.y) };
            current = { x: jump.x, y: jump.y };
            continue;
        }
        break;
    }
    return path;
}

function smoothCurveChaikin(points, iterations = 2) {
    /* Claude 4.5 Sonnet: Chaikin corner cutting algorithm. */
    if (points.length < 3) return points;
    let smoothed = [...points];
    for (let iter = 0; iter < iterations; iter++) {
        const newPoints = [smoothed[0]];
        for (let i = 0; i < smoothed.length - 1; i++) {
            const p0 = smoothed[i], p1 = smoothed[i + 1];
            newPoints.push({ x: 0.75 * p0.x + 0.25 * p1.x, y: 0.75 * p0.y + 0.25 * p1.y });
            newPoints.push({ x: 0.25 * p0.x + 0.75 * p1.x, y: 0.25 * p0.y + 0.75 * p1.y });
        }
        newPoints.push(smoothed[smoothed.length - 1]);
        smoothed = newPoints;
    }
    return smoothed;
}

// Douglas-Peucker for {x,y} point objects (used by vectorizeSkeleton).
function douglasPeucker(points, epsilon) {
    if (points.length <= 2) return points;
    let maxDist = 0, index = 0;
    const start = points[0], end = points[points.length - 1];
    for (let i = 1; i < points.length - 1; i++) {
        const dist = pointToLineDistance(points[i], start, end);
        if (dist > maxDist) { maxDist = dist; index = i; }
    }
    if (maxDist > epsilon) {
        const left  = douglasPeucker(points.slice(0, index + 1), epsilon);
        const right = douglasPeucker(points.slice(index), epsilon);
        return [...left.slice(0, -1), ...right];
    }
    return [start, end];
}

function pointToLineDistance(point, a, b) {
    const A = point.x - a.x, B = point.y - a.y, C = b.x - a.x, D = b.y - a.y;
    const dot = A * C + B * D, lenSq = C * C + D * D;
    if (lenSq === 0) return Math.sqrt(A * A + B * B);
    const t  = dot / lenSq;
    const xx = a.x + Math.max(0, Math.min(1, t)) * C;
    const yy = a.y + Math.max(0, Math.min(1, t)) * D;
    return Math.sqrt((point.x - xx) * (point.x - xx) + (point.y - yy) * (point.y - yy));
}

// Curve helpers
function getCurveStartPoint(curve) { return curve.type === 'polyline' ? curve.points[0]                        : { x: 0, y: 0 }; }
function getCurveEndPoint(curve)   { return curve.type === 'polyline' ? curve.points[curve.points.length - 1] : { x: 0, y: 0 }; }
function distance(a, b) { return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)); }
function reverseCurve(curve) { return curve.type === 'polyline' ? { ...curve, points: [...curve.points].reverse() } : curve; }

function optimizeDrawingOrder(curves) {
    if (curves.length <= 1) return curves;
    const optimized = [], remaining = [...curves];
    let current = remaining.shift();
    optimized.push(current);
    while (remaining.length > 0) {
        const currentEnd = getCurveEndPoint(current);
        let minDist = Infinity, nextIndex = 0, shouldReverse = false;
        for (let i = 0; i < remaining.length; i++) {
            const c = remaining[i], s = getCurveStartPoint(c), e = getCurveEndPoint(c);
            const dS = distance(currentEnd, s), dE = distance(currentEnd, e);
            if (dS < minDist) { minDist = dS; nextIndex = i; shouldReverse = false; }
            if (dE < minDist) { minDist = dE; nextIndex = i; shouldReverse = true; }
        }
        let next = remaining.splice(nextIndex, 1)[0];
        if (shouldReverse) next = reverseCurve(next);
        optimized.push(next); current = next;
    }
    return optimized;
}

function mergeCloseCurves4(curves, tolerance = 2) {
    if (curves.length === 0) return curves;
    let merged   = [...curves];
    let didMerge = true;

    function getCurveBounds(curve) {
        const start = getCurveStartPoint(curve), end = getCurveEndPoint(curve);
        return {
            start, end,
            minX: Math.min(start.x, end.x) - tolerance,
            maxX: Math.max(start.x, end.x) + tolerance,
            minY: Math.min(start.y, end.y) - tolerance,
            maxY: Math.max(start.y, end.y) + tolerance
        };
    }

    function couldBeClose(b1, b2) {
        return !(b1.maxX < b2.minX || b2.maxX < b1.minX || b1.maxY < b2.minY || b2.maxY < b1.minY);
    }

    while (didMerge) {
        didMerge = false;
        const bounds = merged.map(c => getCurveBounds(c));
        outerLoop:
        for (let i = 0; i < merged.length; i++) {
            const currentBounds = bounds[i];
            for (let j = i + 1; j < merged.length; j++) {
                if (!couldBeClose(currentBounds, bounds[j])) continue;
                const ob = bounds[j];
                const dES = distance(currentBounds.end,   ob.start);
                const dEE = distance(currentBounds.end,   ob.end);
                const dSS = distance(currentBounds.start, ob.start);
                const dSE = distance(currentBounds.start, ob.end);
                let mergedCurve = null;
                if (dES <= tolerance) {
                    mergedCurve = { type: 'polyline', points: [...merged[i].points, ...merged[j].points], id: Math.random().toString(36).slice(2, 11) };
                } else if (dEE <= tolerance) {
                    mergedCurve = { type: 'polyline', points: [...merged[i].points, ...merged[j].points.slice().reverse()], id: Math.random().toString(36).slice(2, 11) };
                } else if (dSE <= tolerance) {
                    mergedCurve = { type: 'polyline', points: [...merged[j].points, ...merged[i].points], id: Math.random().toString(36).slice(2, 11) };
                } else if (dSS <= tolerance) {
                    mergedCurve = { type: 'polyline', points: [...merged[j].points.slice().reverse(), ...merged[i].points], id: Math.random().toString(36).slice(2, 11) };
                }
                if (mergedCurve) {
                    merged.splice(j, 1);
                    merged.splice(i, 1);
                    merged.unshift(mergedCurve);
                    didMerge = true;
                    break outerLoop;
                }
            }
        }
    }
    return merged;
}

function removeRedundantCurves(curves, tolerance = 3) {
    if (curves.length === 0) return curves;
    const filtered = [];
    for (let i = 0; i < curves.length; i++) {
        const curve = curves[i];
        let isRedundant = false;
        for (let j = 0; j < filtered.length; j++) {
            if (isCurveRedundant(curve, filtered[j], tolerance)) { isRedundant = true; break; }
        }
        if (!isRedundant) filtered.push(curve);
    }
    return filtered;
}

function isCurveRedundant(curve, existingCurve, tolerance) {
    const curvePoints    = curve.points;
    const existingPoints = existingCurve.points;
    if (curvePoints.length < 2) return true;
    if (curvePoints.length <= 5) return isMostPointsNearby(curvePoints, existingPoints, tolerance);
    if (curvePoints.length < existingPoints.length * 0.3) return isMostPointsNearby(curvePoints, existingPoints, tolerance);
    return false;
}

function isMostPointsNearby(shortCurvePoints, longCurvePoints, tolerance) {
    const requiredPercentage = shortCurvePoints.length <= 3 ? 1.0 : 0.8;
    const threshold          = Math.ceil(shortCurvePoints.length * requiredPercentage);
    let nearbyCount = 0;
    for (const point of shortCurvePoints) {
        if (isPointNearCurve(point, longCurvePoints, tolerance)) {
            nearbyCount++;
            if (nearbyCount >= threshold) return true;
        }
    }
    return false;
}

function isPointNearCurve(point, curvePoints, tolerance) {
    const toleranceSq = tolerance * tolerance;
    for (const curvePoint of curvePoints) {
        const dx = point.x - curvePoint.x, dy = point.y - curvePoint.y;
        if (dx * dx + dy * dy <= toleranceSq) return true;
    }
    return false;
}



// === PATH SORTING & OPTIMIZATION ===
// (from sortPoints_next_neighbour.js)
// Author: Claude 3.7 + Henrik Mauroy

function findNearestNeighborPathImproved(points, maxDistanceThreshold = 30) {
    if (!points || points.length === 0) return [];
    const result  = [];
    const visited = new Set();
    let currentLine  = [];
    let currentPoint = points[0];
    currentLine.push(currentPoint);
    visited.add(currentPoint);

    while (visited.size < points.length) {
        let nearestNeighbor = null, minDistance = Infinity;
        for (let j = 0; j < points.length; j++) {
            const candidatePoint = points[j];
            if (visited.has(candidatePoint)) continue;
            const distanceToNext = Math.sqrt(
                Math.pow(candidatePoint[0] - currentPoint[0], 2) +
                Math.pow(candidatePoint[1] - currentPoint[1], 2)
            );
            if (distanceToNext < minDistance) { nearestNeighbor = candidatePoint; minDistance = distanceToNext; }
        }
        if (nearestNeighbor) {
            if (minDistance > maxDistanceThreshold && currentLine.length > 0) {
                if (calcLength(currentLine) > 5) result.push([...currentLine]);
                currentLine = [nearestNeighbor];
            } else {
                currentLine.push(nearestNeighbor);
            }
            visited.add(nearestNeighbor);
            currentPoint = nearestNeighbor;
        } else {
            break;
        }
    }
    if (currentLine.length > 0 && calcLength(currentLine) > 5) result.push(currentLine);
    return result;
}

function calcLength(line) {
    let length = 0, currentPoint = line[0];
    function dist(a, b) { return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2); }
    line.forEach(point => { length += dist(currentPoint, point); currentPoint = point; });
    return length;
}

/**
 * Sorts svg curves to minimize travel distance.
 * Author: Henrik C. Mauroy
 */
function sortPathCurves(lineArrays, boundingBox) {
    const sortedCurves = [];
    let minDist    = calcDistance([boundingBox[2], boundingBox[3]]);
    let startIndex = 0;
    let curve;
    let nextCandidate = 0;

    for (let i = 0; i < lineArrays.length; i++) {
        curve = lineArrays[i];
        if (calcDistance(curve[0]) <= minDist) {
            minDist    = calcDistance(curve[0]);
            startIndex = i;
        }
    }

    sortedCurves.push(...lineArrays.splice(startIndex, 1));
    while (lineArrays.length > 0) {
        curve        = sortedCurves[sortedCurves.length - 1];
        minDist      = calcDistance([boundingBox[2], boundingBox[3]]);
        nextCandidate = 0;
        for (let i = 0; i < lineArrays.length; i++) {
            if (calcDistancePoints(curve[curve.length - 1], lineArrays[i][0]) <= minDist) {
                minDist       = calcDistancePoints(curve[curve.length - 1], lineArrays[i][0]);
                nextCandidate = i;
            }
        }
        sortedCurves.push(...lineArrays.splice(nextCandidate, 1));
    }
    return sortedCurves;
}

function calcDistance(point) {
    return Math.sqrt(point[0] * point[0] + point[1] * point[1]);
}

function calcDistancePoints(a, b) {
    return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
}


// === BEZIER CURVE GENERATION ===
// (from svg_points_to_bezier.js and svg_points_to_bezier_v3.js)

/**
 * Converts arrays of [x,y] points into SVG cubic bezier command arrays.
 * Returns a JSON string: [["M",x,y,"C",cp1x,cp1y,cp2x,cp2y,x,y,...],...]
 */
function generateBezierCurves(pointArrays) {
    const result = [];
    for (const points of pointArrays) {
        if (points.length < 2) continue;
        const commandArray = ["M", Number(points[0][0].toFixed(1)), Number(points[0][1].toFixed(1))];
        if (points.length === 2) {
            const [x1, y1] = points[0], [x2, y2] = points[1];
            const dx = x2 - x1, dy = y2 - y1;
            commandArray.push("C",
                Number((x1 + dx / 3).toFixed(1)), Number((y1 + dy / 3).toFixed(1)),
                Number((x2 - dx / 3).toFixed(1)), Number((y2 - dy / 3).toFixed(1)),
                Number(x2.toFixed(1)),             Number(y2.toFixed(1)));
        } else {
            for (let i = 0; i < points.length - 1; i++) {
                const [x1, y1] = points[i], [x2, y2] = points[i + 1];
                let cp1x, cp1y, cp2x, cp2y;
                if (i === 0) {
                    const [x3, y3] = points[i + 2] || [x2 + (x2 - x1), y2 + (y2 - y1)];
                    cp1x = x1 + (x2 - x1) / 3;   cp1y = y1 + (y2 - y1) / 3;
                    cp2x = x2 - (x3 - x1) / 6;   cp2y = y2 - (y3 - y1) / 6;
                } else if (i === points.length - 2) {
                    const [x0, y0] = points[i - 1];
                    cp1x = x1 + (x2 - x0) / 6;           cp1y = y1 + (y2 - y0) / 6;
                    cp2x = x1 + (2 * (x2 - x1)) / 3;     cp2y = y1 + (2 * (y2 - y1)) / 3;
                } else {
                    const [x0, y0] = points[i - 1], [x3, y3] = points[i + 2];
                    cp1x = x1 + (x2 - x0) / 6;   cp1y = y1 + (y2 - y0) / 6;
                    cp2x = x2 - (x3 - x1) / 6;   cp2y = y2 - (y3 - y1) / 6;
                }
                commandArray.push("C",
                    Number(cp1x.toFixed(1)), Number(cp1y.toFixed(1)),
                    Number(cp2x.toFixed(1)), Number(cp2y.toFixed(1)),
                    Number(x2.toFixed(1)),   Number(y2.toFixed(1)));
            }
        }
        result.push(commandArray);
    }
    return JSON.stringify(result);
}

// Convert polyline curve objects to arrays of [x, y] points.
// (from svg_points_to_bezier_v3.js — used by createSvg for Zhang-Suen path)
function curvesToPointArrays(curves) {
    const result = [];
    for (const curve of curves) {
        if (curve.type === 'polyline' && curve.points && curve.points.length > 0) {
            result.push(curve.points.map(p => [p.x, p.y]));
        }
    }
    return result;
}


// === BEZIER SMOOTHING ===
// (from svg_points_to_bezier_smoothing.js)

class PointSmoother {
    static douglasPeucker(points, epsilon = 1.0) {
        if (points.length <= 2) return points;
        let maxDistance = 0, maxIndex = 0;
        const start = points[0], end = points[points.length - 1];
        for (let i = 1; i < points.length - 1; i++) {
            const distance = this.perpendicularDistance(points[i], start, end);
            if (distance > maxDistance) { maxDistance = distance; maxIndex = i; }
        }
        if (maxDistance > epsilon) {
            const leftPart  = this.douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
            const rightPart = this.douglasPeucker(points.slice(maxIndex), epsilon);
            return leftPart.slice(0, -1).concat(rightPart);
        }
        return [start, end];
    }

    static perpendicularDistance(point, lineStart, lineEnd) {
        const [x, y]   = point;
        const [x1, y1] = lineStart;
        const [x2, y2] = lineEnd;
        const A = x - x1, B = y - y1, C = x2 - x1, D = y2 - y1;
        const dot = A * C + B * D, lenSq = C * C + D * D;
        if (lenSq === 0) return Math.sqrt(A * A + B * B);
        const param = dot / lenSq;
        let xx, yy;
        if      (param < 0) { xx = x1; yy = y1; }
        else if (param > 1) { xx = x2; yy = y2; }
        else                { xx = x1 + param * C; yy = y1 + param * D; }
        return Math.sqrt((x - xx) ** 2 + (y - yy) ** 2);
    }

    static reduceByDistance(points, minDistance = 2.0) {
        if (points.length <= 2) return points;
        const result = [points[0]];
        for (let i = 1; i < points.length; i++) {
            const last = result[result.length - 1], curr = points[i];
            const d = Math.sqrt((curr[0] - last[0]) ** 2 + (curr[1] - last[1]) ** 2);
            if (d >= minDistance || i === points.length - 1) result.push(curr);
        }
        return result;
    }

    static movingAverageSmooth(points, windowSize = 3) {
        if (points.length <= windowSize) return points;
        const result = [], half = Math.floor(windowSize / 2);
        for (let i = 0; i < points.length; i++) {
            if (i < half || i >= points.length - half) {
                result.push([...points[i]]);
            } else {
                let sumX = 0, sumY = 0;
                for (let j = i - half; j <= i + half; j++) { sumX += points[j][0]; sumY += points[j][1]; }
                result.push([sumX / windowSize, sumY / windowSize]);
            }
        }
        return result;
    }

    static reduceByAngle(points, angleThreshold = 0.1) {
        if (points.length <= 2) return points;
        const result = [points[0]];
        for (let i = 1; i < points.length - 1; i++) {
            const prev = points[i - 1], curr = points[i], next = points[i + 1];
            const v1 = [curr[0] - prev[0], curr[1] - prev[1]];
            const v2 = [next[0] - curr[0], next[1] - curr[1]];
            const dot  = v1[0] * v2[0] + v1[1] * v2[1];
            const mag1 = Math.sqrt(v1[0] ** 2 + v1[1] ** 2);
            const mag2 = Math.sqrt(v2[0] ** 2 + v2[1] ** 2);
            if (mag1 === 0 || mag2 === 0) continue;
            const angle = Math.abs(Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2)))));
            if (angle > angleThreshold) result.push(curr);
        }
        result.push(points[points.length - 1]);
        return result;
    }

    static smartSmooth(points, options = {}) {
        const {
            minDistance         = 1.5,
            angleThreshold      = 0.1,
            douglasEpsilon      = 1.5,
            movingAverageWindow = 3,
            applyMovingAverage  = true
        } = options;
        let result = [...points];
        if (applyMovingAverage && result.length > movingAverageWindow) {
            result = this.movingAverageSmooth(result, movingAverageWindow);
        }
        result = this.reduceByDistance(result, minDistance);
        if (result.length > 2) result = this.douglasPeucker(result, douglasEpsilon);
        if (result.length > 2) result = this.reduceByAngle(result, angleThreshold);
        return result;
    }
}

function generateBezierCurvesWithSmoothing(pointArrays, smoothingOptions = {}) {
    const options = {
        enableSmoothing: true, minDistance: 1.5, angleThreshold: 0.1,
        douglasEpsilon: 0.1, movingAverageWindow: 3, applyMovingAverage: true,
        ...smoothingOptions
    };
    const result = [];
    for (const originalPoints of pointArrays) {
        const points = options.enableSmoothing ? PointSmoother.smartSmooth(originalPoints, options) : originalPoints;
        if (points.length < 2) continue;
        const commandArray = ["M", Number(points[0][0].toFixed(1)), Number(points[0][1].toFixed(1))];
        if (points.length === 2) {
            const [x1, y1] = points[0], [x2, y2] = points[1];
            const dx = x2 - x1, dy = y2 - y1;
            commandArray.push("C",
                Number((x1 + dx / 3).toFixed(1)), Number((y1 + dy / 3).toFixed(1)),
                Number((x2 - dx / 3).toFixed(1)), Number((y2 - dy / 3).toFixed(1)),
                Number(x2.toFixed(1)),             Number(y2.toFixed(1)));
        } else {
            for (let i = 0; i < points.length - 1; i++) {
                const [x1, y1] = points[i], [x2, y2] = points[i + 1];
                let cp1x, cp1y, cp2x, cp2y;
                if (i === 0) {
                    const [x3, y3] = points[i + 2] || [x2 + (x2 - x1), y2 + (y2 - y1)];
                    cp1x = x1 + (x2 - x1) / 3;   cp1y = y1 + (y2 - y1) / 3;
                    cp2x = x2 - (x3 - x1) / 6;   cp2y = y2 - (y3 - y1) / 6;
                } else if (i === points.length - 2) {
                    const [x0, y0] = points[i - 1];
                    cp1x = x1 + (x2 - x0) / 6;         cp1y = y1 + (y2 - y0) / 6;
                    cp2x = x1 + (2 * (x2 - x1)) / 3;   cp2y = y1 + (2 * (y2 - y1)) / 3;
                } else {
                    const [x0, y0] = points[i - 1], [x3, y3] = points[i + 2];
                    cp1x = x1 + (x2 - x0) / 6;   cp1y = y1 + (y2 - y0) / 6;
                    cp2x = x2 - (x3 - x1) / 6;   cp2y = y2 - (y3 - y1) / 6;
                }
                commandArray.push("C",
                    Number(cp1x.toFixed(1)), Number(cp1y.toFixed(1)),
                    Number(cp2x.toFixed(1)), Number(cp2y.toFixed(1)),
                    Number(x2.toFixed(1)),   Number(y2.toFixed(1)));
            }
        }
        result.push(commandArray);
    }
    return JSON.stringify(result);
}

function compareArraySizes(inputPointArrays, outputBezierString) {
    const inputString  = JSON.stringify(inputPointArrays);
    const inputSize    = inputString.length, outputSize = outputBezierString.length;
    const compressionRatio   = outputSize / inputSize;
    const compressionPercent = (inputSize - outputSize) / inputSize * 100;
    const totalInputPoints   = inputPointArrays.reduce((total, arr) => total + arr.length, 0);
    const bezierCommands     = JSON.parse(outputBezierString);
    const totalBezierSegments = bezierCommands.reduce((total, arr) => total + arr.filter(item => item === "C").length, 0);
    return {
        input:      { stringSize: inputSize, totalPoints: totalInputPoints },
        output:     { stringSize: outputSize, totalBezierSegments },
        comparison: { compressionRatio, compressionPercent, isSmaller: outputSize < inputSize,
                      sizeDifference: inputSize - outputSize,
                      pointReduction: (totalInputPoints - totalBezierSegments) / totalInputPoints * 100 }
    };
}

function printComparison(comparison) {
    console.log("SIZE COMPARISON: ratio=" + comparison.comparison.compressionRatio.toFixed(3) +
                ", " + comparison.comparison.compressionPercent.toFixed(1) + "% smaller, " +
                comparison.comparison.pointReduction.toFixed(1) + "% point reduction");
}


// === SVG PARSING & BOUNDING BOX ===
// (from svg_parseSvg.js)

function parseSvgPath(svgArr, scaleFactor) {
    let lastCoordinates = [], pathArrays = [], currentSubarray = [];
    for (let i = 0; i < svgArr.length; i++) {
        for (let j = 0; j < svgArr[i].length; j++) {
            if (svgArr[i][j] === "M") {
                currentSubarray = [[svgArr[i][j + 1] * scaleFactor, svgArr[i][j + 2] * scaleFactor]];
                pathArrays.push(currentSubarray);
                lastCoordinates = [svgArr[i][j + 1] * scaleFactor, svgArr[i][j + 2] * scaleFactor];
                j += 2;
            } else if (svgArr[i][j] === "C") {
                let x0 = lastCoordinates[0], y0 = lastCoordinates[1];
                let x1 = svgArr[i][j + 1] * scaleFactor, y1 = svgArr[i][j + 2] * scaleFactor;
                let x2 = svgArr[i][j + 3] * scaleFactor, y2 = svgArr[i][j + 4] * scaleFactor;
                let x3 = svgArr[i][j + 5] * scaleFactor, y3 = svgArr[i][j + 6] * scaleFactor;
                lastCoordinates = [x3, y3];
                const curveLength = Math.sqrt((x3 - x0) ** 2 + (y3 - y0) ** 2);
                let segments = Math.max(3, Math.ceil(curveLength / 1));
                for (let k = 1; k <= segments; k++) {
                    let t = k / segments;
                    let a = (1 - t) ** 3, b = 3 * t * (1 - t) ** 2, c = 3 * t ** 2 * (1 - t), d = t ** 3;
                    currentSubarray.push([a * x0 + b * x1 + c * x2 + d * x3, a * y0 + b * y1 + c * y2 + d * y3]);
                }
                j += 6;
            } else if (svgArr[i][j] === "L") {
                currentSubarray.push([svgArr[i][j + 1] * scaleFactor, svgArr[i][j + 2] * scaleFactor]);
                currentSubarray.push([svgArr[i][j + 3] * scaleFactor, svgArr[i][j + 4] * scaleFactor]);
                lastCoordinates = [svgArr[i][j + 3] * scaleFactor, svgArr[i][j + 4] * scaleFactor];
                j += 4;
            }
        }
    }
    return pathArrays;
}

// Bounding box of an SVG path array (M/C/L format).
function calcBoundingBox(svgPathArray) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    svgPathArray.forEach(segment => {
        for (let i = 1; i < segment.length; i += 2) {
            const x = segment[i], y = segment[i + 1];
            if (typeof x === "number" && typeof y === "number") {
                minX = Math.min(minX, x); minY = Math.min(minY, y);
                maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
            }
        }
    });
    return [minX, minY, maxX, maxY];
}

// Bounding box of point arrays ([x,y] format).
function calculateBoundingBoxPointArray(curves) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const curve of curves) {
        for (const point of curve) {
            const [x, y] = point;
            minX = Math.min(minX, x); minY = Math.min(minY, y);
            maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
    }
    return [minX, minY, maxX, maxY];
}


// === SCANLINE FILL ===
// (from svg_scanlineFill.js)

function scanlineFillCopilot(ctx, pathArrays, stepSize, createScanlines, createFill) {
    let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
    pathArrays.forEach(points => {
        points.forEach(([x, y]) => {
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        });
    });
    ctx.lineWidth = 1;
    ctx.strokeStyle = "green";
    if (createFill) { ctx.strokeStyle = "darkslategrey"; stepSize = 0.1; }
    let lineArray = [];

    for (let y = minY; y <= maxY; y += stepSize) {
        let intersections = [];
        pathArrays.forEach(points => {
            for (let i = 0; i < points.length - 1; i++) {
                let [x1, y1] = points[i], [x2, y2] = points[i + 1];
                if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
                    intersections.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
                }
            }
        });
        intersections.sort((a, b) => a - b);
        for (let i = 0; i < intersections.length; i += 2) {
            let xStart = intersections[i], xEnd = intersections[i + 1];
            lineArray.push([(xEnd + xStart) / 2, y]);
            ctx.beginPath(); ctx.moveTo(xStart, y); ctx.lineTo(xEnd, y);
            if (createScanlines || createFill) ctx.stroke();
        }
    }

    for (let x = minX; x <= maxX; x += stepSize) {
        let intersections = [];
        pathArrays.forEach(points => {
            for (let i = 0; i < points.length - 1; i++) {
                let [x1, y1] = points[i], [x2, y2] = points[i + 1];
                if ((x1 <= x && x2 > x) || (x2 <= x && x1 > x)) {
                    intersections.push(y1 + ((x - x1) * (y2 - y1)) / (x2 - x1));
                }
            }
        });
        intersections.sort((a, b) => a - b);
        for (let i = 0; i < intersections.length; i += 2) {
            let yStart = intersections[i], yEnd = intersections[i + 1];
            lineArray.push([x, (yEnd + yStart) / 2]);
            ctx.beginPath(); ctx.moveTo(x, yStart); ctx.lineTo(x, yEnd);
            if (createScanlines || createFill) ctx.stroke();
        }
    }
    return lineArray;
}

function scanlineFillYaxis(ctx, pathArrays, createScanlines, createFill, createCenterLine, maxDistanceThreshold) {
    let minY = Infinity, maxY = -Infinity;
    pathArrays.forEach(points => { points.forEach(([x, y]) => { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }); });
    ctx.lineWidth   = 1;
    ctx.strokeStyle = "green";
    let stepSize = Number(document.getElementById("scanLineSeparation").value);
    if (createFill) { ctx.strokeStyle = "darkslategrey"; stepSize = 0.1; createScanlines = false; createCenterLine = false; }
    let lineArray = [];
    for (let y = minY; y <= maxY; y += stepSize) {
        let intersections = [];
        pathArrays.forEach(points => {
            for (let i = 0; i < points.length - 1; i++) {
                let [x1, y1] = points[i], [x2, y2] = points[i + 1];
                if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
                    intersections.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
                }
            }
        });
        intersections.sort((a, b) => a - b);
        for (let i = 0; i < intersections.length; i += 2) {
            let xStart = intersections[i], xEnd = intersections[i + 1];
            lineArray.push([(xEnd + xStart) / 2, y]);
            ctx.beginPath(); ctx.moveTo(xStart, y); ctx.lineTo(xEnd, y);
            if (createScanlines || createFill) ctx.stroke();
        }
    }
    if (createCenterLine) {
        ctx.strokeStyle = "red";
        const path = findNearestNeighborPathImproved(lineArray, maxDistanceThreshold);
        drawLines(path);
    }
}


// === DRAWING & CANVAS OUTPUT ===
// (from svg_drawingFunctions.js)

function drawSinglePoint(point, radius, ctx, color = "black", number = -1) {
    let offsetX = radius / 2;
    if (number >= 10) offsetX = radius / 1.3;
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(point[0], point[1], radius, 0, 2 * Math.PI);
    ctx.fill();
    if (number !== -1) {
        ctx.font      = "8px Arial";
        ctx.fillStyle = "white";
        ctx.fillText(number, point[0] - offsetX, point[1] + radius / 2);
    }
}

function drawStartingPoints(ri) {
    if (!ri.sortedLines || ri.sortedLines.length === 0) return;
    clearClickableElements();
    for (let i = 1; i < ri.sortedLines.length; i++) {
        if (ri.sortedLines[i] && ri.sortedLines[i].length > 0)
            createClickableCircle(ri, 6, i, "black");
    }
    if (ri.sortedLines[0] && ri.sortedLines[0].length > 0)
        createClickableCircle(ri, 6, 0, "red");
}

function createClickableCircle(ri, radius, index, color) {
    const point  = ri.sortedLines[index][0];
    const circle = document.createElement('div');
    circle.className   = 'clickable-circle flexbox-centered';
    circle.index       = index;
    circle.style.position    = 'absolute';
    circle.style.left        = (point[0] - radius) + 'px';
    circle.style.top         = (point[1] - radius) + 'px';
    circle.style.width       = (radius * 2) + 'px';
    circle.style.height      = (radius * 2) + 'px';
    circle.style.borderRadius = '50%';
    circle.innerText         = index + 1;
    circle.style.fontFamily  = "Arial";
    circle.style.fontSize    = "8px";
    circle.style.backgroundColor = color;
    circle.style.border      = '1px solid ' + color;
    circle.style.cursor      = 'pointer';
    circle.style.zIndex      = '1000';
    circle.ri = ri;
    circle.addEventListener('click', function(e) {
        e.stopPropagation();
        if (this.ri.sortedLines.length <= 1) { console.log("Can't delete the last line!"); return; }
        this.ri.sortedLines.splice(this.index, 1);
        this.ri.pathScaledDown.splice(this.index, 1);
        this.remove();
        drawCenterLine(this.ri);
    });
    document.getElementById('canvas-centerLine').appendChild(circle);
}

function clearClickableElements() {
    const container = document.getElementById('canvas-centerLine');
    container.querySelectorAll('.clickable-circle').forEach(circle => circle.remove());
}

function drawCenterLine(ri, continueDrawings = true) {
    let ctx = ri.centerLineCanvas.getContext("2d");
    ri.centerLineCanvas.width  = ri.width;
    ri.centerLineCanvas.height = ri.height;
    ctx.clearRect(0, 0, ri.centerLineCanvas.width, ri.centerLineCanvas.height);
    drawLines(ri.sortedLines, ri.centerLineCanvas, 3);
    if (ri.createStartpoints === true) drawStartingPoints(ri);
    if (continueDrawings) {
        scaleSvgOutputToRobot(ri);
    } else {
        console.log("DrawCenterline stops here.");
    }
}

function drawLines(pointsArray, canvas, lineWidth = 1) {
    let ctx = canvas.getContext("2d");
    for (let lineIndex = 0; lineIndex < pointsArray.length; lineIndex++) {
        drawCurve(pointsArray[lineIndex], ctx, lineWidth);
    }
}

function drawCurve(curve, ctx, lineWidth = 1) {
    ctx.beginPath();
    ctx.strokeStyle = getColorForElement();
    ctx.lineWidth   = lineWidth;
    ctx.moveTo(curve[0][0], curve[0][1]);
    for (let i = 1; i < curve.length; i++) ctx.lineTo(curve[i][0], curve[i][1]);
    ctx.stroke();
}

function drawPupil(x, y, diameter, ctx) {
    const radius = diameter / 2;
    console.log(x + "," + y + ", radius: " + radius);
    drawSinglePoint([x, y], radius, ctx, "black");
    return [x, y, radius];
}

function generatePupilPath(pupil) {
    // TODO: Generate outline and scan lines for pupil fill.
    return [];
}

function drawBezierCurves(pathsArray, canvas, color, normFactor = 1) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let paths = normalizePaths(pathsArray, canvas.width, canvas.height);
    paths.forEach(path => {
        ctx.strokeStyle = color;
        ctx.beginPath();
        for (let i = 0; i < path.length; i++) {
            const cmd = path[i];
            if      (cmd === "M") { ctx.moveTo(path[i + 1], path[i + 2]); i += 2; }
            else if (cmd === "C") { ctx.bezierCurveTo(path[i+1], path[i+2], path[i+3], path[i+4], path[i+5], path[i+6]); i += 6; }
            else if (cmd === "L") { ctx.lineTo(path[i + 1], path[i + 2]); i += 2; }
        }
        ctx.stroke();
    });
}

function normalizePaths(paths, width, height) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    paths.forEach(path => {
        for (let i = 1; i < path.length; i++) {
            if (typeof path[i] === "number" && typeof path[i + 1] === "number") {
                minX = Math.min(minX, path[i]);   minY = Math.min(minY, path[i + 1]);
                maxX = Math.max(maxX, path[i]);   maxY = Math.max(maxY, path[i + 1]);
            }
        }
    });
    const scaleX = width  / (maxX - minX);
    const scaleY = height / (maxY - minY);
    const scale  = Math.min(scaleX, scaleY);
    return paths.map(path => {
        let newPath = [];
        for (let i = 0; i < path.length; i++) {
            newPath.push(typeof path[i] === "string" ? path[i] : (path[i] - minX) * scale);
        }
        return newPath;
    });
}


// === SVG OUTPUT & ROBOT SCALING ===
// (from bezier_to_centerline.js and image_to_svg.js)

function setScaleFactorX(array) {
    const boundingBox = calcBoundingBox(array);
    const x1 = boundingBox[0], x2 = boundingBox[2];
    const y1 = boundingBox[1], y2 = boundingBox[3];
    const svgWidth  = x2 - x1, svgHeight = y2 - y1;
    let scaleFactorX = ri.centerLineCanvas.width / (svgWidth * ri.paddingFactor);
    return [scaleFactorX, svgWidth, svgHeight, [x1, y1, x2, y2]];
}

function setScaleFactorPointArray(array) {
    const boundingBox = calculateBoundingBoxPointArray(array);
    const x1 = boundingBox[0], x2 = boundingBox[2];
    const y1 = boundingBox[1], y2 = boundingBox[3];
    const svgWidth  = x2 - x1, svgHeight = y2 - y1;
    console.log(svgWidth, svgHeight);
    let scaleFactorX = ri.centerLineCanvas.width / (svgWidth * ri.paddingFactor);
    return [scaleFactorX, svgWidth, svgHeight, [x1, y1, x2, y2]];
}

function drawPotraceSvgPath() {
    ri.pathScaledDown = [];
    let createCenterLine        = centerlineCheckbox.checked;
    ri.createStartpoints        = startpointsCheckbox.checked;
    const centerLineSeparation  = Number(centerLineSeparationEl.value);

    ri.centerLineCanvas.width = imgSrc.width;
    ri.centerLineCanvas.height = imgSrc.height;
    smoothedCanvas.width  = imgSrc.width;
    smoothedCanvas.height = imgSrc.height;
    ctx.clearRect(0, 0, ri.centerLineCanvas.width, ri.centerLineCanvas.height);

    let isEditing = false;
    const pupils = [];

    function handlePupilClick(evt) {
        const rect = ri.centerLineCanvas.getBoundingClientRect();
        if (isOverCanvas(evt)) {
            const x = evt.clientX - rect.x - 2, y = evt.clientY - rect.y - 2;
            pupils.push(drawPupil(x, y, getDiameter(), ctx));
            console.log(JSON.stringify(pupils));
        }
    }
    function isOverCanvas(evt) {
        const rect = ri.centerLineCanvas.getBoundingClientRect();
        return evt.clientX > rect.x && evt.clientX < rect.x + rect.width &&
               evt.clientY > rect.y && evt.clientY < rect.y + rect.height;
    }
    function getDiameter() {
        return Number(document.getElementById("pupilDiameter").value);
    }
    function scaleSVG(beziers) {
        let dimensions = setScaleFactorX(beziers);
        ri.scaleFactorX = dimensions[0];
        let svgHeight   = dimensions[2];
        let boundingBox = dimensions[3];
        let y1 = boundingBox[1];
        if (ri.scaleFactorX * (y1 + svgHeight) * ri.paddingFactor > ri.centerLineCanvas.height) {
            c("Too tall drawing! Rescaling to fit window.");
            while (ri.scaleFactorX * (y1 + svgHeight) * ri.paddingFactor > ri.centerLineCanvas.height) {
                ri.scaleFactorX = ri.scaleFactorX * 0.995;
            }
        }
    }

    document.getElementById("btnPupilInsert").addEventListener("click", function(evt) {
        if (isEditing) {
            isEditing = false;
            ri.centerLineCanvas.style.cursor = "default";
            document.getElementById("btnPupilInsert").innerText = "Draw pupil";
            document.removeEventListener("click", handlePupilClick);
            const pupilPaths = [];
            pupils.forEach(pupil => { pupilPaths.push(generatePupilPath(pupil)); });
        } else {
            isEditing = true;
            ri.centerLineCanvas.style.cursor = "none";
            document.getElementById("btnPupilInsert").innerText = "Finish";
            document.addEventListener("click", handlePupilClick);
            ri.centerLineCanvas.addEventListener("mousemove", updateMouseFollowerPosition);
            ri.centerLineCanvas.addEventListener("mouseenter", showMouseFollower);
            ri.centerLineCanvas.addEventListener("mouseleave", hideMouseFollower);
        }
    });

    try {
        scaleSVG(beziers);
        const pathArrays = parseSvgPath(beziers, ri.scaleFactorX);
        const midpoints  = scanlineFillCopilot(ctx, pathArrays, 2, false, false);
        let path = [];
        if (createCenterLine) path = findNearestNeighborPathImproved(midpoints, centerLineSeparation);
        ri.sortedLines = sortPathCurves(path, calcBoundingBox(path), ctx);
        drawCenterLine(ri);
    } catch (error) {
        console.error("Error:", error);
        alert("Error with something...");
    }
}

function scaleSvgOutputToRobot(ri) {
    ri.pathScaledDown = [];
    let indx = 0;
    ri.sortedLines.forEach(curve => {
        ri.pathScaledDown.push([]);
        curve.forEach(point => {
            ri.pathScaledDown[indx].push([point[0] / ri.scaleFactorX, point[1] / ri.scaleFactorX]);
        });
        indx++;
    });
    ri.svgOutputData = generateBezierCurves(ri.pathScaledDown);
    console.log("ri.svgOutputData: ");
    console.log(JSON.stringify(ri.svgOutputData));
    drawBezierCurves(JSON.parse(ri.svgOutputData), smoothedCanvas, "black");
    let rows = Math.ceil(ri.svgOutputData.length * 25);
    ri.svgTextOutput.rows = rows;
    ri.svgTextOutput.cols = 50;
    ri.svgOutputData = addLineEnding(ri.svgOutputData);
    ri.svgTextOutput.value = ri.svgOutputData;
}

function applySmoothing(ri) {
    ri.svgOutputData = generateBezierCurvesWithSmoothing(ri.pathScaledDown, smoothingSettings);
    const comparison = compareArraySizes(ri.pathScaledDown, ri.svgOutputData);
    printComparison(comparison);
    compressionInfoEl.innerText = "Bezier compression: " + comparison.comparison.compressionPercent.toFixed(1) + " %";
    drawBezierCurves(JSON.parse(ri.svgOutputData), smoothedCanvas, "black");
    ri.svgOutputData = addLineEnding(ri.svgOutputData);
    let rows = Math.ceil(ri.svgOutputData.length * 25);
    ri.svgTextOutput.rows = rows;
    ri.svgTextOutput.cols = 50;
    ri.svgTextOutput.value = ri.svgOutputData;
}

function addLineEnding(text) {
    text = text.slice(0, text.length - 2);
    text += ',"EOF",492"]]';
    return text;
}

function clearSvgWindow() {
    document.getElementById("svgOutput").innerHTML = "";
    Potrace.clear();
    PotraceBG8.clear();
}

function showOverlay(id, id_behind) {
    document.getElementById(id).classList.remove('hidden');
}

function createSvg(ri) {
    applyFilters(ri);
    clearSvgWindow();
    let url = canvas.toDataURL();

    if (mauroyLab_detection.checked) {
        Potrace.img.src    = url;
        PotraceBG8.img.src = url;
        firstRun = false;
        let turd_factor = document.getElementById("rngTurdsize").value * 2;
        const potraceParams = { turdsize: turd_factor, optcurve: true, alphamax: 1, opttolerance: 0.2, turnpolicy: "minority" };
        Potrace.setParameter(potraceParams);
        PotraceBG8.setParameter(potraceParams);
        let drawingWidth = document.getElementById("rngDrawingWidth").value;
        let scaleFactor  = drawingWidth / canvas.width;
        const fillPath = document.getElementById("chkFillPath");
        Potrace.process(function() {
            let svg = fillPath.checked ? Potrace.getSVG(1) : Potrace.getSVG(1, "curve");
            c("Potrace SVG: "); c(svg);
            document.getElementById("svgOutput").innerHTML = svg;
            document.getElementById("svgWindow").style.visibility = "visible";
        });
        PotraceBG8.process(() => {
            let svg_beziers = PotraceBG8.getSVG(scaleFactor, "curve");
            try {
                beziers = JSON.parse(svg_beziers);
                c("Potrace beziers:"); c(beziers);
                drawPotraceSvgPath();
            } catch (error) {
                c("Error parsing JSON!", error);
            }
        });
    } else {
        // Zhang-Suen thinning path
        let inverted = new cv.Mat();
        let lineDrawingMode = document.getElementById("lineDrawingMode");
        if (lineDrawingMode.checked) {
            cv.threshold(gray, inverted, 128, 255, cv.THRESH_BINARY_INV);
            c("Original gray image of line drawing:"); c(inverted.data);
        } else {
            cv.threshold(thresholded, inverted, 128, 255, cv.THRESH_BINARY_INV);
            c("Canny Edge detected imagedata:"); c(inverted.data);
        }
        const binaryData  = matToBinaryArray(inverted);
        console.log("Inverted cols,rows:"); console.log(inverted.cols, inverted.rows);
        const thinnedData = zhangSuenThinning(binaryData, inverted.cols, inverted.rows);
        console.log("thinnedData:", thinnedData.length);

        const curves      = vectorizeSkeleton(thinnedData, inverted.cols, inverted.rows, true, true);
        const pointArrays = curvesToPointArrays(curves);
        ri.sortedLines    = sortPathCurves(pointArrays, calculateBoundingBoxPointArray(pointArrays));

        let dimensions = setScaleFactorPointArray(ri.sortedLines);
        ri.scaleFactorX  = dimensions[0];
        let svgWidth     = dimensions[1];
        let svgHeight    = dimensions[2];
        console.log("zhang suen scaleFactorX:"); console.log(dimensions);

        let robotWidth = parseFloat(document.getElementById("rngDrawingWidth").value);
        let scaleFactorZS = svgWidth / robotWidth;
        ri.pathScaledDown = [];
        let indx = 0;
        ri.sortedLines.forEach(curve => {
            ri.pathScaledDown.push([]);
            curve.forEach(point => {
                ri.pathScaledDown[indx].push([point[0] / scaleFactorZS, point[1] / scaleFactorZS]);
            });
            console.log(ri.pathScaledDown[indx]);
            indx++;
        });

        ri.svgOutputData = generateBezierCurves(ri.pathScaledDown);
        console.log('Bezier paths: '); console.log(ri.svgOutputData);

        ri.createStartpoints = startpointsCheckbox.checked;
        drawCenterLine(ri, false);

        smoothedCanvas.width  = imgSrc.width;
        smoothedCanvas.height = imgSrc.height;
        drawBezierCurves(JSON.parse(ri.svgOutputData), smoothedCanvas, "black");

        canvasSvgWindow.width  = inverted.cols;
        canvasSvgWindow.height = inverted.rows;
        const svgOut = document.getElementById("svgOutput");
        svgOut.innerHTML = "";
        svgOut.appendChild(canvasSvgWindow);
        drawBezierCurves(JSON.parse(ri.svgOutputData), canvasSvgWindow, "black");

        let rows = Math.ceil(ri.svgOutputData.length * 25);
        ri.svgTextOutput.rows = rows;
        ri.svgTextOutput.cols = 50;
        ri.svgOutputData = addLineEnding(ri.svgOutputData);
        ri.svgTextOutput.value = ri.svgOutputData;
    }
}

function c(text) { console.log(text); }


// === UI / EVENT WIRING ===

// File input: update image source when user picks a file.
fileInputEl.addEventListener("change", (e) => {
    imgSource.src = URL.createObjectURL(e.target.files[0]);
}, false);

// Reload OpenCV processing when a new image loads.
imgSource.onload = function() {
    if (moduleInitialized) {
        clearSvgWindow();
        [src, gray] = readImageFromSource();
        opencv2image(gray);
    }
};

// Bezier centerline controls
btnUpdateCenterline.addEventListener("click", () => {
    ri.createStartpoints = startpointsCheckbox.checked;
    if (document.getElementById("mauroyLab_detection").checked) {
        drawPotraceSvgPath();
    } else {
        drawCenterLine(ri, false);
    }
});
btnApplySmoothing.addEventListener("click",   () => { applySmoothing(ri); });

minDistanceElement.addEventListener('input', () => {
    smoothingSettings.minDistance = parseFloat(minDistanceElement.value);
    d("minDistance-value").innerText = smoothingSettings.minDistance;
});
angleThresholdElement.addEventListener('input', () => {
    smoothingSettings.angleThreshold = parseFloat(angleThresholdElement.value);
    d("angleThreshold-value").innerText = smoothingSettings.angleThreshold;
});
douglasEpsilonElement.addEventListener('input', () => {
    smoothingSettings.douglasEpsilon = parseFloat(douglasEpsilonElement.value);
    d("douglasEpsilon-value").innerText = smoothingSettings.douglasEpsilon;
});
movingAverageWindowElement.addEventListener('input', () => {
    smoothingSettings.movingAverageWindow = parseInt(movingAverageWindowElement.value);
    d("movingAverageWindow-value").innerText = smoothingSettings.movingAverageWindow;
});
enableSmoothingElement.addEventListener('change', () => {
    smoothingSettings.enableSmoothing = enableSmoothingElement.checked;
});

document.getElementById("btnCopy").addEventListener("click", () => { copySVG(); });

// Main "Create SVG" button
document.getElementById("btnCreateSvg").addEventListener("click", () => { createSvg(ri); });

// Radio buttons: swap slider config when detection method changes.
document.querySelectorAll('input[name="processMethod"]').forEach(radio => {
    radio.addEventListener('change', () => { updateFilterSliders(); applyFilters(); });
});

// Sliders: update displayed value and trigger filters/smoothing.
document.querySelectorAll('.slider').forEach(slider => {
    slider.addEventListener('input', function() {
        if (slider.classList.contains("filterSlider"))   applyFilters();
        if (slider.classList.contains("smoothingSlider")) applySmoothing(ri);
        const valueDisplay = document.getElementById(this.id + '-value');
        if (valueDisplay) valueDisplay.textContent = this.value;
    });
});

// Close overlay — called from HTML onclick attributes.
function closeOverlay(button) {
    button.closest('.overlay').classList.add('hidden');
}

function updateMouseFollowerPosition(evt) {
    const follower = document.getElementById("mouse-follower");
    if (follower) {
        const diameter = Number(document.getElementById("pupilDiameter").value);
        const rect = document.getElementById("centerLineCanvas").getBoundingClientRect();
        follower.style.width  = diameter + "px";
        follower.style.height = diameter + "px";
        let x = rect.x + evt.offsetX - diameter / 2;
        let y = rect.y + evt.offsetY - diameter / 2;
        follower.style.top  = y + "px";
        follower.style.left = x + "px";
    }
}

function showMouseFollower() {
    const el = document.querySelector("#mouse-follower");
    if (el) el.style.visibility = "visible";
}

function hideMouseFollower() {
    const el = document.querySelector("#mouse-follower");
    if (el) el.style.visibility = "hidden";
}

function copySVG() {
    const svgTextOutput = document.getElementById("svgTextOutput");
    svgTextOutput.select();
    navigator.clipboard.writeText(svgTextOutput.value);
}

function d(id) { return document.getElementById(id); }
