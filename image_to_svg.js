// Listeners
/*
document.getElementById("btnUpdate").addEventListener("click", (e) => {
  applyFilters();
});
*/

let width, height;
const imgSource = document.getElementById("img-src");
const fileInputEl = document.getElementById("fileInput");
const canvasWindow = document.getElementById("canvasWindow");
const canvas = document.getElementById("canvas");
const canvasSvgWindow = document.getElementById("canvas-svg-window");
const svgOutput = document.getElementById("svgOutput");
let beziers = []; // Center line beziers are stored in this variable.
let src, gray, medianBlurred, thresholded,grayScaled,edgeScaled;
let moduleInitialized = false;
let firstRun = true;
let imgData; // Set later when filters are applied.
let teller = 1;
let userOutput = [];

// Catch any errors.
window.addEventListener('error', function(event) {
    alert("OpenVC error occurred. Please refresh page.");
    // Or display in a custom error div
});


fileInputEl.addEventListener(
  "change",
  (e) => {
      imgSource.src = URL.createObjectURL(e.target.files[0]);
  },
  false
);
imgSource.onload = function () {
  if (moduleInitialized) {
    clearSvgWindow();
    [src, gray] = readImageFromSource();
    //c(gray.cols);
    opencv2image(gray);
  }
};

let Module = {
  // https://emscripten.org/docs/api_reference/module.html#Module.onRuntimeInitialized
  onRuntimeInitialized() {
    moduleInitialized = true;
    [src, gray] = readImageFromSource();
    document.getElementById("opencv-status").innerHTML = "OpenCV.js is ready.";

    //applyFilters();
    //gray.delete();
    //medianBlurred.delete();
    //thresholded.delete();
    
  },
};

function readImageFromSource() {
  // Create the matrices if deleted.
  gray = new cv.Mat();
  medianBlurred = new cv.Mat();
  thresholded = new cv.Mat();
  grayScaled = new cv.Mat();
  edgeScaled = new cv.Mat();
  // Originally image data was read from the displayed pixels.
  // This leads sometimes to poor resolution.
  //src = cv.imread(imgSource);
  // As of Oct 2025 we use the raw image as source.
  src = readImageFullSize("img-src");
  // 1) color to gray
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  //console.log("gray image width, height:");
  //console.log(gray.cols,gray.rows);
  return [src,gray];
}

function readImageFullSize(imageId) {
  // Draws the image fullsize 
  let img = document.getElementById(imageId);

  // Create a temporary canvas with the image's natural (full) size
  let tempCanvas = document.createElement('canvas');
  tempCanvas.width = img.naturalWidth;   // Full image width
  tempCanvas.height = img.naturalHeight; // Full image height

  let tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(img, 0, 0);

  // Now read from the canvas using OpenCV
  let mat = cv.imread(tempCanvas);

  console.log('Full image size:', mat.cols, 'x', mat.rows);
  return mat;
}

function resizeImage(opencvImage, width, height) {
    // Claude 4.5 created 01.11.2025
    let blurred = new cv.Mat();
    let dst = new cv.Mat();

    let scaleX = width / opencvImage.cols;
    let scaleY = height / opencvImage.rows;
    // Finds scaling from smallest dimension.
    let scale = Math.min(scaleX, scaleY);

    // More aggressive downsampling = more blur needed
    let sigma = 1.0 / scale; // Adjust this multiplier as needed
    //let kernelSize = Math.max(3, Math.floor(sigma * 2) * 2 + 1); // Ensure odd
    let kernelSize = 5;
    console.log("Resize using kernel size " + kernelSize);

    let ksize = new cv.Size(kernelSize, kernelSize);
    cv.GaussianBlur(opencvImage, blurred, ksize, sigma, sigma, cv.BORDER_DEFAULT);

    let dsize = new cv.Size(width, height);
    cv.resize(blurred, dst, dsize, 0, 0, cv.INTER_AREA);
    return dst;
}

// Functions to apply image trickery + convert to svg.
function applyFilters() {
  // Originally we worked on a scaled image. We lose resolution! 
  // Recrate the gray image to be the same size as scaled img-source.
  //src = cv.imread(imgSource);
  //gray = new cv.Mat();
  // 1) color to gray
  //cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  // As of Oct 25 2025 we now use full resolution for image processing and
  // scale images for viewing.
  [src, gray] = readImageFromSource();
  // Empty svg-window before doing anything else.
  document.getElementById("svgOutput").innerHTML = "";
  let threshold_lower = parseFloat(document.getElementById("rngBlur").value);
  let threshold_upper = parseFloat(document.getElementById("rngThresh").value);
  let turd_factor = document.getElementById("rngTurdsize").value;

  width = gray.cols;
  height = gray.rows;

  // Not certain that turd size should be normalized.
  let turd_value = parseInt(Math.round(turd_factor * width * 0.01)); // blur value is around 1-2 % of image width
  if (turd_value <= 1) {
    turd_value = 1;
  }
  medianBlurred = new cv.Mat();
  thresholded = new cv.Mat();
  // 2) median blur, adjusted with slider
  //cv.medianBlur(gray, medianBlurred, blur_value); // The second parameter is the kernel size

  // Apply thresholding to create a binary image
  // 3) Canny Edge detector
  // Only do thresholding to find edges if checkbox is checked.
    let lineDrawingMode = document.getElementById("lineDrawingMode");
    let img = document.getElementById("img-src");
    if (lineDrawingMode.checked) {
        console.log("No edge detection if line drawing.");
        edgeScaled = resizeImage(gray, img.width, img.height);
        opencv2image(edgeScaled);
        //opencv2image(gray);
    } else {
        // August 2025: Canny edge detector
        // Blur image a little bit for less sharp edges in images.
        // odd numbers 3,5,7,9,... 3 (light blur), 5 (moderate blur), 7-9 (strong blur)
        let blurred = new cv.Mat();
        cv.medianBlur(gray, blurred, 7);
        // Canny() fyller array thresholded med innhold.
        cv.Canny(blurred, thresholded, threshold_lower, threshold_upper);
        //cv.Canny(gray, thresholded, threshold_lower, threshold_upper);
        // Invert image because canny colors edges white and background black.
        cv.bitwise_not(thresholded, thresholded);
        edgeScaled = resizeImage(thresholded, img.width, img.height);
        opencv2image(edgeScaled);
        //opencv2image(thresholded);

    /*
    // Original edge detection from spring 2024 bachelor thesis.
    cv.adaptiveThreshold(
      medianBlurred,
      thresholded,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY,
      (blockSize = thresh_value),
      (C = 2)
    );
    opencv2image(thresholded);
    */
  }
  
}

function opencv2image(opencvData) {
    // Ensure the canvas size matches the image
    canvas.width = imgSource.width;
    canvas.height = imgSource.height;
    let ctx = canvas.getContext("2d", [{ willReadFrequently: true }]);
    // Convert OpenCV matrix to ImageData
    imgData = ctx.createImageData(canvas.width, canvas.height);
    for (let i = 0, j = 0; i < opencvData.data.length; i++, j += 4) {
        imgData.data[j] =
        imgData.data[j + 1] =
        imgData.data[j + 2] =
        opencvData.data[i];
        imgData.data[j + 3] = 255; // Alpha channel
    }
        ctx.putImageData(imgData, 0, 0);
        showOverlay("img-overlay","img-window",imgSource.width, imgSource.height);
}

function createSvg(ri) {
  applyFilters(ri); // Run filters if not run already.

  // 4) potrace, turd-size
  // Clear previous SVG content
  clearSvgWindow();

  let url = null; // Destroys the reference.

  url = canvas.toDataURL();

  if (mauroyLab_detection.checked) {
    // 1) Use Potrace to trace around edges.
    // 2) Use mauroyLab line detection algorithm.
    // Load image to Potrace
    Potrace.img.src = url;
    PotraceBG8.img.src = url;
    firstRun = false;

    // Set parameters if needed
    let turd_factor = document.getElementById("rngTurdsize").value * 2;
    // SVG-output
    Potrace.setParameter({
      turdsize: turd_factor,
      optcurve: true,
      alphamax: 1,
      opttolerance: 0.2,
      turnpolicy: "minority",
    });
    // Bezier-output
    PotraceBG8.setParameter({
      turdsize: turd_factor,
      optcurve: true,
      alphamax: 1,
      opttolerance: 0.2,
      turnpolicy: "minority",
    });

    // Process the image and show SVG
    //TODO: If line drawing Zhang - Zuen thinning should be used.
    //If image use potrace algorithm. 

    let drawingWidth = document.getElementById("rngDrawingWidth").value;
    let scaleFactor = drawingWidth / width; // E.g. 100mm / 650px = 0,153 mm/px
    // Check if SVG should be curve or filled path.
    const fillPath = document.getElementById("chkFillPath");
    const mauroyLab_detection = document.getElementById("mauroyLab_detection");
    const zhang_suen_detection = document.getElementById("zhang_suen_detection");
    let svg;
    Potrace.process(function () {
      
      if (fillPath.checked) {
        svg = Potrace.getSVG(1); // scale=1, We want the same size as the image displayed.
      } else {
        svg = Potrace.getSVG(1, "curve"); // scale=1, We want the same size as the image displayed.
      }
      document.getElementById("svgOutput").innerHTML = svg;
      document.getElementById("svgWindow").style.visibility = "visible";
    });
    // Create array with bezier curves
    PotraceBG8.process(() => {
      let svg_beziers = PotraceBG8.getSVG(scaleFactor, "curve"); // Scaling to fit drawing robot.
      //c(svg_beziers);
      try {
        // Set value to the global variable 'beziers'
        beziers = JSON.parse(svg_beziers);
        //c(beziers);
        // Start centerLine-function in different JS-script.
        drawSvgPath();
      } catch (error) {
        c("Error parsing JSON!", error);
      }
    });
  }
  else {
    // Use Zhang-Suen thinning for edge detection. Gets one pixel width lines!
    let inverted = new cv.Mat();
    let lineDrawingMode = document.getElementById("lineDrawingMode");
    if (lineDrawingMode.checked) {
      // Do not perform canny edge. Use gray image
      // Invert the gray image.
      //cv.bitwise_not(gray, inverted); // Treat the original as binary
      cv.threshold(gray, inverted, 128, 255, cv.THRESH_BINARY_INV);
      c("Original gray image of line drawing:")
      c(inverted.data)
    }
    else {
      // Invert the thresholded image.
      //cv.bitwise_not(thresholded, inverted); // Treat the original as binary
      cv.threshold(thresholded, inverted, 128, 255, cv.THRESH_BINARY_INV);
      c("Canny Edge detected imagedata:")
      c(inverted.data)
      // Display the inverted image
      //opencv2image(thresholded);
    }

    // Apply Zhang-Suen thinning
    // Convert Mat to binary array for Zhang-Suen
    const binaryData = matToBinaryArray(inverted);

    console.log("Inverted cols,rows:")
    console.log(inverted.cols,inverted.rows);

    // Apply Zhang-Suen thinning
      const thinnedData = zhangSuenThinning(binaryData, inverted.cols, inverted.rows);
      console.log("thinnedData:")
      console.log(thinnedData.length);
      console.log(thinnedData);

    let ctx = canvasSvgWindow.getContext("2d", [{ willReadFrequently: true }]);
    ctx.clearRect(0, 0, inverted.cols, inverted.rows);
    canvasSvgWindow.width = inverted.cols;
    canvasSvgWindow.height = inverted.rows;
      showOverlay("img-overlay-svg-window", "svgWindow")
      let img = document.getElementById("img-src");
      let mat = cv.matFromArray(inverted.cols, inverted.rows, cv.CV_8UC4, thinnedData);
      console.log("thinnedData as Mat:")
      console.log(mat);
      let [min, max] = arrayMinMax(thinnedData);
      console.log("min,max: " + min, max)
      let remapped = new cv.Mat();
      mat.convertTo(remapped, cv.CV_8U, 255, 0);
      edgeScaled = resizeImage(remapped, img.width, img.height);
      [min, max] = arrayMinMax(edgeScaled.data);
      console.log("edgeScaled: min,max: " + min, max)
    displayResult(edgeScaled.data, ctx, img.width, img.height);
    //displayResult(thinnedData, ctx, inverted.cols, inverted.rows);

    // vectorize the pixel skeleton. It is now just a binary image with 1px width lines and curves.
    const curves = vectorizeSkeleton(thinnedData, inverted.cols, inverted.rows, true, true);
    //displayVectorizedCurves(curves, binary.cols, binary.rows, true);

    const pointArrays = curvesToPointArrays(curves);

    // 1) Approximates into points arrays
    // 2) Then into bezier curves
    // maxError = 3 Less accurate, maxError = 2 (Balanced,default), maxError = 1 high accuracy.
    const bezierPaths = pointArraysToCubicBeziers(pointArrays, 2.0);

    console.log('Bezier paths:', JSON.stringify(bezierPaths));
  }
}

// Converted python code to javascript from Rosetta Code:
// https://rosettacode.org/wiki/Bitmap/B%C3%A9zier_curves/Cubic#Python
function cubicBezier(pointsList, n) {
  let [x0, y0, x1, y1, x2, y2, x3, y3] = pointsList;
  let pts = [];
  for (let i = 0; i <= n; i++) {
    let t = i / n;
    let a = Math.pow(1.0 - t, 3);
    let b = 3.0 * t * Math.pow(1.0 - t, 2);
    let c = 3.0 * Math.pow(t, 2) * (1.0 - t);
    let d = Math.pow(t, 3);

    let x = a * x0 + b * x1 + c * x2 + d * x3;
    let y = a * y0 + b * y1 + c * y2 + d * y3;
    pts.push([x, y]);
  }
  return pts;
}

function clearSvgWindow() {
  //console.log("Clears potrace memory.");
  let svgDiv = document.getElementById("svgOutput");
  svgDiv.innerHTML = "";
  //while (svgDiv.firstChild) {
  //svgDiv.removeChild(svgDiv.firstChild);
  //}
  // Clear data inside potrace
  Potrace.clear();
  PotraceBG8.clear();
}

function c(text) {
  console.log(text);
}

function arrayMinMax(arr) {
    let min = arr.reduce((a, b) => Math.min(a, b));
    let max = arr.reduce((a, b) => Math.max(a, b));
    return [min, max];
}

// ==================== ZHANG-SUEN FUNCTIONS ====================
function toBinary(imageData, threshold) {
    const data = imageData.data;
    const binary = new Array(data.length / 4);
    for (let i = 0; i < data.length; i += 4) {
        const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
        binary[i / 4] = gray < threshold ? 1 : 0; // 1 for black (foreground)
    }
    return binary;
}

function matToBinary(mat, threshold) {
    const data = mat.data; // Uint8Array with one value per pixel
    const binary = new Array(data.length);
    
    for (let i = 0; i < data.length; i++) {
        binary[i] = data[i] < threshold ? 1 : 0; // 1 for black (foreground)
    }
    
    return binary;
}


// ========== Helper functions  ===========



function matToBinaryArray(mat) {
    const data = mat.data;
    const binary = new Array(data.length);
    for (let i = 0; i < data.length; i++) {
        binary[i] = data[i] > 0 ? 1 : 0;
    }
    return binary;
}

function displayResult(binaryData, ctx, width, height) {
  const imageData = ctx.createImageData(width, height);
  console.log("Created image data:");
  console.log(imageData);
    const data = imageData.data;
    for (let i = 0; i < binaryData.length; i++) {
        const value = binaryData[i] === 1 ? 0 : 255;
        data[i*4] = value; data[i*4+1] = value; data[i*4+2] = value; data[i*4+3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
}


// Show overlay on different panels in main page.
function showOverlay(id, id_behind) {
    const overlay = document.getElementById(id);
    const parent = document.getElementById(id_behind);
    overlay.classList.remove('hidden');
}



// ========== Zhang-Suen thinning ================
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
        data[(y-1) * width + x], data[(y-1) * width + (x+1)],
        data[y * width + (x+1)], data[(y+1) * width + (x+1)],
        data[(y+1) * width + x], data[(y+1) * width + (x-1)],
        data[y * width + (x-1)], data[(y-1) * width + (x-1)]
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
    const [p1,p2,p3,p4,p5,p6,p7] = n;
    const bn = countBlackNeighbors(n), t = countTransitions(n);
    return (bn >= 2 && bn <= 6 && t === 1 && (p1 * p3 * p5) === 0 && (p3 * p5 * p7) === 0);
}

function shouldDelete2(data, x, y, width) {
    const n = getNeighbors(data, x, y, width);
    const [p1,,p3,,p5,,p7] = n;
    const bn = countBlackNeighbors(n), t = countTransitions(n);
    return (bn >= 2 && bn <= 6 && t === 1 && (p1 * p3 * p7) === 0 && (p1 * p5 * p7) === 0);
}


function reset() {
    originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
    vectorCtx.clearRect(0, 0, vectorCanvas.width, vectorCanvas.height);
    imageInput.value = ''; currentImage = null; processBtn.disabled = true; processBtn.textContent = 'Process Image';
}

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

    // NEW: Remove curves that are too short to matter (< 3 pixels total length)
    allCurves = allCurves.filter(curve => {
        if (curve.points.length < 2) return false;

        // Calculate total path length
        let totalLength = 0;
        for (let i = 1; i < curve.points.length; i++) {
            totalLength += distance(curve.points[i-1], curve.points[i]);
        }

        return totalLength >= 3;  // Keep curves at least 3 pixels long
    });

    allCurves = removeRedundantCurves(allCurves, 8);

    if (shouldOptimize && allCurves.length > 1) {
        allCurves = optimizeDrawingOrder(allCurves);
        allCurves = mergeCloseCurves4(allCurves, 10);
    }

    return allCurves;
}

function createSingleCurveFromPath(points) {
    if (points.length < 2) return null;
    return { type: 'polyline', points, id: Math.random().toString(36).slice(2, 11) };
}

function tracePaths(binaryData, width, height) {
    const visited = new Array(width * height).fill(false);
    const paths = [];

    function neighborCount(x, y) {
        let c = 0;
        for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++) {
            if (dx===0 && dy===0) continue;
            const nx=x+dx, ny=y+dy;
            if (nx<0||ny<0||nx>=width||ny>=height) continue;
            if (binaryData[ny*width+nx]===1) c++;
        }
        return c;
    }

    const endpoints = [];
    for (let y=0; y<height; y++) for (let x=0; x<width; x++) {
        const idx = y*width + x;
        if (binaryData[idx]!==1) continue;
        if (neighborCount(x,y)===1) endpoints.push({x,y});
    }

    function nextSeed() {
        for (const p of endpoints) { const idx=p.y*width+p.x; if (!visited[idx]) return p; }
        for (let y=0; y<height; y++) for (let x=0; x<width; x++) {
            const idx=y*width+x;
            if (binaryData[idx]===1 && !visited[idx]) return {x,y};
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

    function idx(x, y) { return y * width + x; }
    function inBounds(x, y) { return x >= 0 && y >= 0 && x < width && y < height; }

    function unvisitedNeighbors(x, y) {
        const n = [];
        for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++) {
            if (dx===0 && dy===0) continue;
            const nx=x+dx, ny=y+dy;
            if (!inBounds(nx,ny)) continue;
            const i=idx(nx,ny);
            if (binaryData[i]===1 && !visited[i]) n.push({x:nx,y:ny, dx, dy});
        }
        return n;
    }

    function angleScore(dir) {
        if (!prevDir) return 0;
        return -(prevDir.dx*dir.dx + prevDir.dy*dir.dy);
    }

    function findNearestUnvisitedWithin(rMax) {
        let best = null, bestD2 = Infinity;
        for (let r=1; r<=rMax; r++) {
            for (let dy=-r; dy<=r; dy++) for (let dx=-r; dx<=r; dx++) {
                const nx=current.x+dx, ny=current.y+dy;
                if (!inBounds(nx,ny)) continue;
                const i=idx(nx,ny);
                if (binaryData[i]===1 && !visited[i]) {
                    const d2 = dx*dx + dy*dy;
                    if (d2 < bestD2) { bestD2 = d2; best = {x:nx,y:ny}; }
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
            points.push({x:x0, y:y0});
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
            neigh.sort((a, b) => angleScore(a) - angleScore(b) || (a.dx*a.dx + a.dy*a.dy) - (b.dx*b.dx + b.dy*b.dy));
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
                if (path.length === 0 || (p.x !== path[path.length-1].x || p.y !== path[path.length-1].y)) path.push({ x: p.x, y: p.y });
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

// ======== Helper functions for vectorizeSkeleton() ===============
function douglasPeucker(points, epsilon) {
    if (points.length <= 2) return points;
    let maxDist = 0, index = 0;
    const start = points[0], end = points[points.length - 1];
    for (let i = 1; i < points.length - 1; i++) {
        const dist = pointToLineDistance(points[i], start, end);
        if (dist > maxDist) { maxDist = dist; index = i; }
    }
    if (maxDist > epsilon) {
        const left = douglasPeucker(points.slice(0, index + 1), epsilon);
        const right = douglasPeucker(points.slice(index), epsilon);
        return [...left.slice(0, -1), ...right];
    }
    return [start, end];
}

function pointToLineDistance(point, a, b) {
    const A = point.x - a.x, B = point.y - a.y, C = b.x - a.x, D = b.y - a.y;
    const dot = A*C + B*D, lenSq = C*C + D*D;
    if (lenSq === 0) return Math.sqrt(A*A + B*B);
    const t = dot / lenSq;
    const xx = a.x + Math.max(0, Math.min(1, t)) * C;
    const yy = a.y + Math.max(0, Math.min(1, t)) * D;
    return Math.sqrt((point.x - xx)*(point.x - xx) + (point.y - yy)*(point.y - yy));
}

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

    let merged = [...curves];
    let didMerge = true;

    // Pre-compute bounding info for each curve
    function getCurveBounds(curve) {
        const start = getCurveStartPoint(curve);
        const end = getCurveEndPoint(curve);
        return {
            start,
            end,
            minX: Math.min(start.x, end.x) - tolerance,
            maxX: Math.max(start.x, end.x) + tolerance,
            minY: Math.min(start.y, end.y) - tolerance,
            maxY: Math.max(start.y, end.y) + tolerance
        };
    }

    // Check if two curves could possibly be within tolerance
    function couldBeClose(bounds1, bounds2) {
        // Bounding box overlap test
        return !(bounds1.maxX < bounds2.minX || 
                 bounds2.maxX < bounds1.minX ||
                 bounds1.maxY < bounds2.minY || 
                 bounds2.maxY < bounds1.minY);
    }

    while (didMerge) {
        didMerge = false;
        const bounds = merged.map(c => getCurveBounds(c));

        // Key change: When we merge, restart from the beginning
        outerLoop:
        for (let i = 0; i < merged.length; i++) {
            const currentBounds = bounds[i];

            for (let j = i + 1; j < merged.length; j++) {
                if (!couldBeClose(currentBounds, bounds[j])) {
                    continue;
                }

                const otherBounds = bounds[j];

                const distEndToStart = distance(currentBounds.end, otherBounds.start);
                const distEndToEnd = distance(currentBounds.end, otherBounds.end);
                const distStartToStart = distance(currentBounds.start, otherBounds.start);
                const distStartToEnd = distance(currentBounds.start, otherBounds.end);

                let shouldMerge = false;
                let mergedCurve = null;

                if (distEndToStart <= tolerance) {
                    mergedCurve = {
                        type: 'polyline',
                        points: [...merged[i].points, ...merged[j].points],
                        id: Math.random().toString(36).slice(2, 11)
                    };
                    shouldMerge = true;
                }
                else if (distEndToEnd <= tolerance) {
                    mergedCurve = {
                        type: 'polyline',
                        points: [...merged[i].points, ...merged[j].points.slice().reverse()],
                        id: Math.random().toString(36).slice(2, 11)
                    };
                    shouldMerge = true;
                }
                else if (distStartToEnd <= tolerance) {
                    mergedCurve = {
                        type: 'polyline',
                        points: [...merged[j].points, ...merged[i].points],
                        id: Math.random().toString(36).slice(2, 11)
                    };
                    shouldMerge = true;
                }
                else if (distStartToStart <= tolerance) {
                    mergedCurve = {
                        type: 'polyline',
                        points: [...merged[j].points.slice().reverse(), ...merged[i].points],
                        id: Math.random().toString(36).slice(2, 11)
                    };
                    shouldMerge = true;
                }

                if (shouldMerge) {
                    // Remove in correct order
                    merged.splice(j, 1);
                    merged.splice(i, 1);

                    // Add at the BEGINNING so it gets checked immediately
                    merged.unshift(mergedCurve);

                    didMerge = true;
                    break outerLoop;  // ← Restart from i=0
                }
            }
        }
    }

    return merged;
}

// ========= Helper functions for different tasks =======================
function getCurveStartPoint(curve) { return curve.type === 'polyline' ? curve.points[0] : {x:0,y:0}; }
function getCurveEndPoint(curve) { return curve.type === 'polyline' ? curve.points[curve.points.length-1] : {x:0,y:0}; }
function distance(a, b) { return Math.sqrt((a.x-b.x)*(a.x-b.x) + (a.y-b.y)*(a.y-b.y)); }
function reverseCurve(curve) { return curve.type === 'polyline' ? { ...curve, points: [...curve.points].reverse() } : curve; }


// =========== Display vectorized curves (arrays of subarrays of points) =========================
function displayVectorizedCurves(curves, width, height, showOptimization = false) {
    vectorCanvas.width = width; vectorCanvas.height = height;
    vectorCtx.fillStyle = 'white'; vectorCtx.fillRect(0, 0, width, height);
    vectorCtx.lineWidth = 2; vectorCtx.lineCap = 'round'; vectorCtx.lineJoin = 'round';

    for (let i = 0; i < curves.length; i++) {
        const curve = curves[i];
        vectorCtx.strokeStyle = showOptimization ? `hsl(${(i / Math.max(1, curves.length)) * 270}, 70%, 50%)` : '#2196F3';
        vectorCtx.beginPath();
        if (curve.type === 'polyline') {
            const pts = curve.points;
            if (pts.length > 1) {
                vectorCtx.moveTo(pts[0].x, pts[0].y);
                for (let k=1; k<pts.length; k++) vectorCtx.lineTo(pts[k].x, pts[k].y);
            }
        }
        vectorCtx.stroke();

        if (showOptimization) {
            const s = getCurveStartPoint(curve), e = getCurveEndPoint(curve);
            vectorCtx.fillStyle = '#4CAF50'; vectorCtx.beginPath(); vectorCtx.arc(s.x, s.y, 3, 0, Math.PI*2); vectorCtx.fill();
            vectorCtx.fillStyle = '#F44336'; vectorCtx.beginPath(); vectorCtx.arc(e.x, e.y, 3, 0, Math.PI*2); vectorCtx.fill();
            vectorCtx.fillStyle = 'black'; vectorCtx.font = '12px Arial'; vectorCtx.textAlign = 'center';
            vectorCtx.fillText(i+1, s.x, s.y - 8);
        }
    }
}

// ========== Remove redundant curves ===========

function removeRedundantCurves(curves, tolerance = 3) {
    if (curves.length === 0) return curves;

    const filtered = [];

    for (let i = 0; i < curves.length; i++) {
        const curve = curves[i];
        let isRedundant = false;

        // Only check against curves we've already kept
        for (let j = 0; j < filtered.length; j++) {
            if (isCurveRedundant(curve, filtered[j], tolerance)) {
                isRedundant = true;
                break;
            }
        }

        if (!isRedundant) {
            filtered.push(curve);
        }
    }

    return filtered;
}

function isCurveRedundant(curve, existingCurve, tolerance) {
    const curvePoints = curve.points;
    const existingPoints = existingCurve.points;

    // Always remove single-point curves
    if (curvePoints.length < 2) return true;

    // Check if this is a short curve (regardless of what it's compared to)
    if (curvePoints.length <= 5) {
        // For short curves, check if ALL points are near the existing curve
        return isMostPointsNearby(curvePoints, existingPoints, tolerance);
    }

    // For longer curves, be more conservative
    if (curvePoints.length < existingPoints.length * 0.3) {
        // This curve is much shorter than existing - check overlap
        return isMostPointsNearby(curvePoints, existingPoints, tolerance);
    }

    return false;
}

function isMostPointsNearby(shortCurvePoints, longCurvePoints, tolerance) {
    // For very short curves (<=3 points), ALL points must be nearby
    // For longer short curves, 80% must be nearby
    const requiredPercentage = shortCurvePoints.length <= 3 ? 1.0 : 0.8;
    const threshold = Math.ceil(shortCurvePoints.length * requiredPercentage);

    let nearbyCount = 0;

    for (const point of shortCurvePoints) {
        if (isPointNearCurve(point, longCurvePoints, tolerance)) {
            nearbyCount++;
            if (nearbyCount >= threshold) {
                return true;
            }
        }
    }

    return false;
}

function isPointNearCurve(point, curvePoints, tolerance) {
    // Check if point is within tolerance of any point on the curve
    const toleranceSq = tolerance * tolerance;

    for (const curvePoint of curvePoints) {
        const dx = point.x - curvePoint.x;
        const dy = point.y - curvePoint.y;
        const distSq = dx * dx + dy * dy;

        if (distSq <= toleranceSq) {
            return true;
        }
    }

    return false;
}

