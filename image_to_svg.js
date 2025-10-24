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
const svgOutput = document.getElementById("svgOutput");
let beziers = []; // Center line beziers are stored in this variable.
let src, gray, medianBlurred, thresholded;
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
      //imgSource.style.width = "38.7vw";
  },
  false
);
imgSource.onload = function () {
  if (moduleInitialized) {
    clearSvgWindow();
    // Create the matrices if deleted.
    gray = new cv.Mat();
    medianBlurred = new cv.Mat();
    thresholded = new cv.Mat();
    src = cv.imread(imgSource);
    // 1) color to gray
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    //c(gray.cols);
    opencv2image(gray);
  }
};

let Module = {
  // https://emscripten.org/docs/api_reference/module.html#Module.onRuntimeInitialized
  onRuntimeInitialized() {
    moduleInitialized = true;
    // Create the matrices first time running.
    gray = new cv.Mat();
    medianBlurred = new cv.Mat();
    thresholded = new cv.Mat();
    src = cv.imread(imgSource);
    // 1) color to gray
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    document.getElementById("opencv-status").innerHTML = "OpenCV.js is ready.";

    //applyFilters();
    //gray.delete();
    //medianBlurred.delete();
    //thresholded.delete();
    
  },
};

// Functions to apply image trickery + convert to svg.
function applyFilters() {
    // Recrate the gray image to be the same size as scaled img-source.
    src = cv.imread(imgSource);
    // 1) color to gray
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
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
  let checkbox = document.getElementById("lineDrawingMode");
  if (checkbox.checked) {
    console.log("No edge detection if line drawing.");
    opencv2image(gray);
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
    opencv2image(thresholded);

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
        showOverlay();
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
    const threshold = 128;  // Use lower and upper threshold average.
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let binaryData = toBinary(imageData, threshold);
    const thinnedBinary = zhangSuenThinning(binaryData, canvas.width, canvas.height);
    const thinnedMat = binaryToMat(thinnedBinary, canvas.width, canvas.height);
    c("Zhang-suen thinning!");
    c(binaryData);
    opencv2image(thinnedMat);
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
        data[(y-1) * width + x],
        data[(y-1) * width + (x+1)],
        data[y * width + (x+1)],
        data[(y+1) * width + (x+1)],
        data[(y+1) * width + x],
        data[(y+1) * width + (x-1)],
        data[y * width + (x-1)],
        data[(y-1) * width + (x-1)],
    ];
}
function countTransitions(neighbors) {
    let count = 0; for (let i = 0; i < 8; i++) if (neighbors[i] === 0 && neighbors[(i + 1) % 8] === 1) count++; return count;
}
function countBlackNeighbors(neighbors) { return neighbors.reduce((s, v) => s + v, 0); }
function shouldDelete1(data, x, y, width) {
    const n = getNeighbors(data, x, y, width); const [p1,p2,p3,p4,p5,p6,p7] = n; const bn = countBlackNeighbors(n); const t = countTransitions(n);
    return (bn >= 2 && bn <= 6 && t === 1 && (p1 * p3 * p5) === 0 && (p3 * p5 * p7) === 0);
}
function shouldDelete2(data, x, y, width) {
    const n = getNeighbors(data, x, y, width); const [p1,,p3,,p5,,p7] = n; const bn = countBlackNeighbors(n); const t = countTransitions(n);
    return (bn >= 2 && bn <= 6 && t === 1 && (p1 * p3 * p7) === 0 && (p1 * p5 * p7) === 0);
}

function displayResult(binaryData, width, height) {
    resultCanvas.width = width; resultCanvas.height = height;
    const imageData = resultCtx.createImageData(width, height); const data = imageData.data;
    for (let i = 0; i < binaryData.length; i++) { const value = binaryData[i] === 1 ? 0 : 255; data[i*4] = value; data[i*4+1] = value; data[i*4+2] = value; data[i*4+3] = 255; }
    resultCtx.putImageData(imageData, 0, 0);
}

function reset() {
    originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
    vectorCtx.clearRect(0, 0, vectorCanvas.width, vectorCanvas.height);
    imageInput.value = ''; currentImage = null; processBtn.disabled = true; processBtn.textContent = 'Process Image';
}

// ========== Helper function converts from array into Mat-object ===========
function binaryToMat(binaryData, width, height) {
    // Create a new single-channel Mat (grayscale)
    const mat = new cv.Mat(height, width, cv.CV_8UC1);
    
    // Convert binary (0s and 1s) to grayscale values (0 and 255)
    for (let i = 0; i < binaryData.length; i++) {
        mat.data[i] = binaryData[i] === 1 ? 255 : 0;  // 1 -> white (255), 0 -> black (0)
    }
    
    return mat;
}