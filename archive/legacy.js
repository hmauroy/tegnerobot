// =====================================================================
// legacy.js — Unused / replaced functions
// Not loaded by image_to_svg_prototype.html.
// Kept here for reference in case any of these are needed again.
// =====================================================================


// --- Replaced by createSingleCurveFromPath() (which adds Chaikin smoothing) ---
function createSingleCurveFromPath_orig(points) {
    if (points.length < 2) return null;
    return { type: 'polyline', points, id: Math.random().toString(36).slice(2, 11) };
}


// --- Replaced by drawStartingPoints() which uses HTML div elements ---
function drawStartingPointsOld(sortedLines, ctx) {
    let radius = 6, cnt = 0;
    sortedLines.forEach(curve => {
        cnt++;
        drawSinglePoint(curve[0], radius, ctx, "black", cnt);
    });
    drawSinglePoint(sortedLines[0][0], radius, ctx, "red", 1);
}


// --- References undefined variables (originalCtx, resultCtx, imageInput etc.) ---
// --- Was part of an older standalone prototype, not wired up in current app. ---
function reset() {
    originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
    ctx2.clearRect(0, 0, canvasSvgWindow.width, canvasSvgWindow.height);
    imageInput.value = ''; currentImage = null; processBtn.disabled = true; processBtn.textContent = 'Process Image';
}


// --- Converts imageData (RGBA) to binary. Not called in current pipeline. ---
function toBinary(imageData, threshold) {
    const data   = imageData.data;
    const binary = new Array(data.length / 4);
    for (let i = 0; i < data.length; i += 4) {
        const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
        binary[i / 4] = gray < threshold ? 1 : 0;
    }
    return binary;
}


// --- Converts OpenCV Mat to binary using a threshold value.
// --- matToBinaryArray() (threshold > 0) is used instead. ---
function matToBinary(mat, threshold) {
    const data   = mat.data;
    const binary = new Array(data.length);
    for (let i = 0; i < data.length; i++) {
        binary[i] = data[i] < threshold ? 1 : 0;
    }
    return binary;
}


// --- Renders binary pixel data to a canvas. Used for debugging but commented out in pipeline. ---
function displayResult(binaryData, ctx, width, height) {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    for (let i = 0; i < binaryData.length; i++) {
        const value = binaryData[i] === 1 ? 0 : 255;
        data[i * 4] = value; data[i * 4 + 1] = value; data[i * 4 + 2] = value; data[i * 4 + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
}


// --- Rosetta Code cubic bezier point sampler. Defined but never called in prototype. ---
function cubicBezier(pointsList, n) {
    let [x0, y0, x1, y1, x2, y2, x3, y3] = pointsList;
    let pts = [];
    for (let i = 0; i <= n; i++) {
        let t = i / n;
        let a = Math.pow(1.0 - t, 3), b = 3.0 * t * Math.pow(1.0 - t, 2);
        let c = 3.0 * Math.pow(t, 2) * (1.0 - t), d = Math.pow(t, 3);
        pts.push([a * x0 + b * x1 + c * x2 + d * x3, a * y0 + b * y1 + c * y2 + d * y3]);
    }
    return pts;
}


// --- v3 bezier fitting functions (svg_points_to_bezier_v3.js).
// --- curvesToPointArrays() from this file IS used in app.js.
// --- The fitting functions below are not called in the current pipeline. ---

function pointArraysToCubicBeziers(pointArrays, maxError = 2.0) {
    const allPaths = [];
    for (const points of pointArrays) {
        if (points.length < 2) continue;
        allPaths.push(fitCubicBeziersToPath(points, maxError));
    }
    return allPaths;
}

function fitCubicBeziersToPath(points, maxError = 2.0) {
    if (points.length < 2) return [];
    const path = [];
    const [x0, y0] = points[0];
    path.push("M", x0, y0);
    if (points.length === 2) {
        const [x3, y3] = points[1];
        path.push("C", x0 + (x3 - x0) / 3, y0 + (y3 - y0) / 3, x0 + 2 * (x3 - x0) / 3, y0 + 2 * (y3 - y0) / 3, x3, y3);
        return path;
    }
    let i = 0;
    while (i < points.length - 1) {
        const result = fitMaximalBezier(points, i, maxError);
        const [cp1x, cp1y, cp2x, cp2y, endX, endY] = result.bezier;
        path.push("C", cp1x, cp1y, cp2x, cp2y, endX, endY);
        i = result.endIndex;
    }
    return path;
}

function fitMaximalBezier(points, startIdx, maxError) {
    let bestEndIdx = startIdx + 1, bestBezier = null;
    for (let endIdx = startIdx + 1; endIdx < points.length; endIdx++) {
        const segment = points.slice(startIdx, endIdx + 1);
        const bezier  = fitBezierToSegment(segment);
        const error   = calculateBezierError(segment, bezier);
        if (error <= maxError) { bestEndIdx = endIdx; bestBezier = bezier; }
        else break;
    }
    if (bestBezier === null) {
        bestBezier = fitBezierToSegment(points.slice(startIdx, startIdx + 2));
        bestEndIdx = startIdx + 1;
    }
    return { bezier: bestBezier, endIndex: bestEndIdx };
}

function calculateBezierError(points, bezier) {
    const [x0, y0] = points[0];
    const [cp1x, cp1y, cp2x, cp2y, x3, y3] = bezier;
    let maxError = 0;
    for (let i = 1; i < points.length - 1; i++) {
        const [px, py] = points[i];
        let minDist = Infinity;
        for (let t = 0; t <= 1; t += 0.05) {
            const [bx, by] = evaluateBezier(x0, y0, cp1x, cp1y, cp2x, cp2y, x3, y3, t);
            minDist = Math.min(minDist, Math.sqrt((px - bx) ** 2 + (py - by) ** 2));
        }
        maxError = Math.max(maxError, minDist);
    }
    return maxError;
}

function evaluateBezier(x0, y0, x1, y1, x2, y2, x3, y3, t) {
    const mt = 1 - t, mt2 = mt * mt, mt3 = mt2 * mt, t2 = t * t, t3 = t2 * t;
    return [mt3 * x0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t3 * x3,
            mt3 * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * y3];
}

function fitBezierToSegment(points) {
    const [x0, y0] = points[0], [x3, y3] = points[points.length - 1];
    if (points.length === 2) {
        return [x0 + (x3 - x0) / 3, y0 + (y3 - y0) / 3, x0 + 2 * (x3 - x0) / 3, y0 + 2 * (y3 - y0) / 3, x3, y3];
    }
    const [x0_next, y0_next] = points[1];
    const x1 = x0 + (x0_next - x0) * 0.4, y1 = y0 + (y0_next - y0) * 0.4;
    const [x3_prev, y3_prev] = points[points.length - 2];
    const x2 = x3 - (x3 - x3_prev) * 0.4, y2 = y3 - (y3 - y3_prev) * 0.4;
    return [x1, y1, x2, y2, x3, y3];
}
