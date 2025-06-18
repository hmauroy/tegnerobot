// Listeners
/*
document.getElementById("btnUpdate").addEventListener("click", (e) => {
  applyFilters();
});
*/

let width, height;
const imgElement = document.getElementById("img-src");
const fileInputEl = document.getElementById("fileInput");
const canvasWindow = document.getElementById("canvasWindow");
const canvas = document.getElementById("canvas");
const svgOutput = document.getElementById("svgOutput");
const svgTextOutput = document.getElementById("svgTextOutput");
let src, gray, medianBlurred, thresholded;
let moduleInitialized = false;
let firstRun = true;
let imgData; // Set later when filters are applied.
let teller = 1;
let userOutput = [];
fileInputEl.addEventListener(
  "change",
  (e) => {
    imgElement.src = URL.createObjectURL(e.target.files[0]);
  },
  false
);
imgElement.onload = function () {
  if (moduleInitialized) {
    clearSvgWindow();
    // Create the matrices if deleted.
    gray = new cv.Mat();
    medianBlurred = new cv.Mat();
    thresholded = new cv.Mat();
    src = cv.imread(imgElement);
    // 1) color to gray
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    c(gray.cols);
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
    src = cv.imread(imgElement);
    // 1) color to gray
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    document.getElementById("status").innerHTML = "OpenCV.js is ready.";

    //applyFilters();
    //gray.delete();
    //medianBlurred.delete();
    //thresholded.delete();
    
  },
};

// Functions to apply image trickery + convert to svg.
function applyFilters() {
  // Empty svg-window before doing anything else.
  document.getElementById("svgOutput").innerHTML = "";
  let blur_factor = document.getElementById("rngBlur").value;
  let threshold_factor = document.getElementById("rngThresh").value;
  let turd_factor = document.getElementById("rngTurdsize").value;
  c(
    "Blur: " +
      blur_factor +
      ", Thresh: " +
      threshold_factor +
      ", TurdSize: " +
      turd_factor
  );
  width = gray.cols;
  height = gray.rows;
  let blur_value = parseInt(Math.round(blur_factor * width * 0.002)); // blur value is around 1-2 % of image width
  if (blur_value % 2 == 0) {
    blur_value -= 1;
    if (blur_value <= 3) {
      blur_value = 3;
    }
  }
  let thresh_value = parseInt(
    Math.round(threshold_factor * width * 0.005)
  ); // blur value is around 1-2 % of image width
  if (thresh_value % 2 == 0) {
    thresh_value -= 1;
    if (thresh_value <= 0) {
      thresh_value = 1;
    }
  }
  // Not certain that turd size should be normalized.
  let turd_value = parseInt(Math.round(turd_factor * width * 0.01)); // blur value is around 1-2 % of image width
  if (turd_value <= 1) {
    turd_value = 1;
  }
  medianBlurred = new cv.Mat();
  thresholded = new cv.Mat();
  // 2) median blur, adjusted with slider
  cv.medianBlur(gray, medianBlurred, blur_value); // The second parameter is the kernel size

  // Apply adaptive thresholding to create a binary image
  // 3) adaptive threshold
  // Only do thresholding to find edges if not checkbox is checked.
  let checkbox = document.getElementById("silhouette");
  if (checkbox.checked) {
    console.log("No edge detection if binary image.");
    opencv2image(gray);
  } else {
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
  }
}

function opencv2image(opencvData) {
  // Ensure the canvas size matches the image
  canvas.width = imgElement.width;
  canvas.height = imgElement.height;
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

function createSvg() {
  applyFilters(); // Run filters if not run already.

  // 4) potrace, turd-size
  // Clear previous SVG content
  clearSvgWindow();

  let url = null; // Destroys the reference.

  url = canvas.toDataURL();

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
  let drawingWidth = document.getElementById("rngDrawingWidth").value;
  let scaleFactor = drawingWidth / width; // E.g. 100mm / 650px = 0,153 mm/px
  // Check if SVG should be curve or filled path.
  let fillPath = document.getElementById("chkFillPath");
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
  PotraceBG8.process(function () {
    let svg_beziers = PotraceBG8.getSVG(scaleFactor, "curve"); // Scaling to fit drawing robot.
    //c(svg_beziers);
    let beziers;
    try {
      beziers = JSON.parse(svg_beziers);
      //c(beziers);
    } catch (error) {
      c("Error parsing JSON!", error);
    }

    //c(svg);
    let output = "";
    document.getElementById("svgTextOutput").value = svg_beziers;
    let rows = Math.ceil(beziers.length * 4);
    svgTextOutput.setAttribute("rows", rows);
    //console.log(svg);
    //svg = '<svg id="svg" version="1.1" width="327" height="245" xmlns="http://www.w3.org/2000/svg"><path d="M1.654 0.750 C 1.232 1.432,35.540 1.418,75.000 0.720 C 83.525 0.569,70.614 0.345,46.309 0.223 C 22.004 0.100,1.909 0.337,1.654 0.750 M91.725 3.250 C 90.899 5.038,89.888 7.603,89.480 8.951 C 89.072 10.299,85.515 14.799,81.576 18.951 C 74.278 26.644,63.000 42.557,63.000 45.161 C 63.000 45.953,62.592 47.028,62.093 47.550 C 60.343 49.384,54.155 69.563,53.522 75.500 C 53.051 79.923,53.254 82.003,54.298 83.414 C 55.371 84.866,55.492 86.314,54.797 89.407 C 54.004 92.940,54.151 93.704,55.898 95.118 C 57.007 96.017,57.698 96.968,57.433 97.233 C 57.168 97.498,57.628 98.276,58.455 98.963 C 59.579 99.896,59.701 100.691,58.936 102.119" stroke="none" fill="black" fill-rule="evenodd"/></svg>'
    //parseSvg(svg);
  });
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

function copySVG() {
  svgTextOutput.select();
  //document.execCommand("copy");
  navigator.clipboard.writeText(svgTextOutput.value);
}

function clearSvgWindow() {
  console.log("Clears potrace memory.");
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