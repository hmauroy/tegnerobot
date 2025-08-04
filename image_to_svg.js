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
  let blur_factor = document.getElementById("rngBlur").value;
  let threshold_factor = document.getElementById("rngThresh").value;
  let turd_factor = document.getElementById("rngTurdsize").value;
  /*
  c(
    "Blur: " +
      blur_factor +
      ", Thresh: " +
      threshold_factor +
      ", TurdSize: " +
      turd_factor
  );
  */
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