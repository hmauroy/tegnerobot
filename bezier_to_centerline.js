
const imgSrc = document.getElementById("img-src");
const ctx = document.getElementById("centerLineCanvas").getContext("2d");
const smoothedCanvas = document.getElementById("smoothedCanvas");
const svgInput = document.getElementById("svgInput");
const svgTextOutput = document.getElementById("svgTextOutput");
const fillCheckbox = document.getElementById("fillCheckbox");
const scanlinesCheckbox = document.getElementById("scanlinesCheckbox");
const outlineCheckbox = document.getElementById("outlineCheckbox");
const centerlineCheckbox =
  document.getElementById("centerlineCheckbox");
const startpointsCheckbox = document.getElementById(
  "startpointsCheckbox"
);
const scanLineSeparationEl = document.getElementById("scanLineSeparation");
const centerLineSeparationEl = document.getElementById("centerLineSeparation");
const btnUpdateCenterline = document.getElementById("btnUpdateCenterline");
const btnApplySmoothing = document.getElementById("btnApplySmoothing");
const follower = document.getElementById("mouse-follower");

// Get references to all the input elements
const enableSmoothingElement = document.getElementById('enableSmoothing');
const minDistanceElement = document.getElementById('minDistance');
const angleThresholdElement = document.getElementById('angleThreshold');
const douglasEpsilonElement = document.getElementById('douglasEpsilon');
const movingAverageWindowElement = document.getElementById('movingAverageWindow');
const compressionInfoEl = document.getElementById('compressionInfo');


// Curve smoothing of bezier curves.
let smoothingSettings = {
    enableSmoothing: true,
    minDistance: 1.5,
    angleThreshold: 0.1,
    douglasEpsilon: 0.1,
    movingAverageWindow: 3,
    applyMovingAverage: true
};

// Add event listeners
btnUpdateCenterline.addEventListener("click", () => {
    // Apply smoothing to the bezier curves.
    drawSvgPath();
});
btnApplySmoothing.addEventListener("click", () => {
    // Apply smoothing to the bezier curves.
    applySmoothing(ri); // ri is a global variable created in the html page.
});
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
    d("movingAverageWindowDisplay").innerText = smoothingSettings.movingAverageWindow;
});

// Add event listeners for checkbox inputs
enableSmoothingElement.addEventListener('change', () => {
  console.log(enableSmoothingElement.checked);
  smoothingSettings.enableSmoothing = enableSmoothingElement.checked;
});




const copyButton = document.getElementById("btnCopy");
copyButton.addEventListener("click", () => {
  copySVG();
});

function setScaleFactorX(array) {
  const boundingBox = calcBoundingBox(array); // Returns [x1,y1,x2,y2]
  const x1 = boundingBox[0];
  const x2 = boundingBox[2];
  const y1 = boundingBox[1];
  const y2 = boundingBox[3];
  //console.log("boundingbox: ",boundingBox);
  const svgWidth = x2 - x1;
  const svgHeight = y2 - y1;
  //console.log("width,height: ", svgWidth, svgHeight);

  // Scalefactor divides the canvas width on the svg width plus some padding.
  let scaleFactorX = ri.centerLineCanvas.width / (svgWidth * ri.paddingFactor);

  return scaleFactorX, svgWidth, svgHeight, [x1,y1,x2,y2];
}

function drawSvgPath() {

    // Empties eventual allready filled arrays
    ri.pathScaledDown = [];

    const createFill = fillCheckbox.checked;
    const createScanlines = scanlinesCheckbox.checked;
    const createOutline = outlineCheckbox.checked;
    let createCenterLine = centerlineCheckbox.checked;
    ri.createStartpoints = startpointsCheckbox.checked;
    const centerLineSeparation = Number(centerLineSeparationEl.value);
    const scanLineSeparation = Number(scanLineSeparationEl.value);


    //console.log("centerLineSeparation", centerLineSeparation);
    //console.log("scanLineSeparation", scanLineSeparation);

    // Setting the size of the output canvasesses
    ri.centerLineCanvas.width = imgSrc.width;
    ri.centerLineCanvas.height = imgSrc.height;
    smoothedCanvas.width = imgSrc.width;
    smoothedCanvas.height = imgSrc.height;


  ctx.clearRect(0, 0, ri.centerLineCanvas.width, ri.centerLineCanvas.height);

  let isEditing = false; // Used for editing with pupil insertions.
  // Handle click when inserting pupils.
  const pupils = []; // [[x1,y1,radius1],[x2,y2,radius2],...]
  function handlePupilClick(evt) {
    console.log(evt.offsetX, evt.offsetY);
    const rect = ri.centerLineCanvas.getBoundingClientRect();
    if (isOverCanvas) {
      const x = evt.clientX - rect.x - 2;
      const y = evt.clientY - rect.y - 2;
      pupils.push(drawPupil(x, y, getDiameter(), ctx));
      //console.log(pupils);
      console.log(JSON.stringify(pupils));
    }
  }
  function isOverCanvas(evt) {
    const rect = ri.centerLineCanvas.getBoundingClientRect();
    if (
      evt.clientX > rect.x &&
      evt.clientX < rect.x + rect.width &&
      evt.clientY > rect.y &&
      evt.clientY < rect.y + rect.height
    ) {
      console.log("Over Canvas!");
      return true;
    } else {
      return false;
    }
  }
  // Set listener to drawing pupils onto the canvas.
  document
    .getElementById("btnPupilInsert")
    .addEventListener("click", function (evt) {
      if (isEditing) {
        isEditing = false;
       ri.centerLineCanvas.style.cursor = "default";
        document.getElementById("btnPupilInsert").innerText =
          "Draw pupil";
        document.removeEventListener("click", handlePupilClick);
        // 1) Generate pupil paths
        const pupilPaths = [];
        pupils.forEach((pupil) => {
          pupilPaths.push(generatePupilPath(pupil));
        });
        // 2) Add pupil paths to sortedLines array and sort the curves one more time.
        // TODO!!!
      } else {
        isEditing = true;
       ri.centerLineCanvas.style.cursor = "none";
        document.getElementById("btnPupilInsert").innerText = "Finish";
        document.addEventListener("click", handlePupilClick);
        // Black circle as a mouse follower.
       ri.centerLineCanvas.addEventListener("mousemove", updateMouseFollowerPosition);
       ri.centerLineCanvas.addEventListener("mouseenter", showMouseFollower);
       ri.centerLineCanvas.addEventListener("mouseleave", hideMouseFollower);
      }
    });

  function getDiameter() {
    return Number(document.getElementById("pupilDiameter").value);
  }
  
  

  function scaleSVG(beziers) {
    // Sets a scalefactor for the bezier curves from Potrace.
    let svgWidth, svgHeight, boundingBox;

    ri.scaleFactorX, svgWidth, svgHeight, boundingBox = setScaleFactorX(beziers);
    let y1 = boundingBox[1];

    if (ri.scaleFactorX * (y1 + svgHeight) * ri.paddingFactor > ri.centerLineCanvas.height) {
        c("Too tall drawing! Rescaling to fit window.");
        while (
            ri.scaleFactorX * (y1 + svgHeight) * ri.paddingFactor >
            ri.centerLineCanvas.height
        ) {
            ri.scaleFactorX = ri.scaleFactorX * 0.995;
        }
    }
  }

  try {
    // (I)) Automatic scaling of the data to visualize on a similar scale for all svg drawings.
    scaleSVG(beziers);
    
      
    // (II) Parses the svg data format from potrace into curves of points. Apply scaling for better viewing in web app.
    const pathArrays = parseSvgPath(beziers, ri.scaleFactorX);

    // 1a) Calculates intersections and fills the scanlines with lines or dense lines (fill).
    // Return value is an array of the mid points of intersections of scan lines.
    const midpoints = scanlineFillCopilot(
      ctx,
      pathArrays,
      scanLineSeparation,
      createScanlines,
      createFill
    );

    // 1b) Find the paths through the mid points.
    let path = [];
    if (createCenterLine) {
      path = findNearestNeighborPathImproved(
        midpoints,
        centerLineSeparation
      );
    }

    // 2a) Sort the curves for minimizing travel distance.
    ri.sortedLines = sortPathCurves(path, calcBoundingBox(path), ctx);
    
    // 2b) Draw lines between points. Pass boolean createStartpoints if starting points should be drawn.
    // This functions ends by starting other functions.
    drawCenterLine(ri);
    

    // 6) Draw the outline as the last step to lay the outline on top of the other drawings.
    if (createOutline) {
      ctx.fillStyle = "red";
      ctx.strokeStyle = "black";
      pathArrays.forEach((points) => {
        let lastX = points[0][0];
        let lastY = points[0][1];
        points.forEach(([x, y]) => {
          ctx.beginPath();
          ctx.moveTo(lastX, lastY);
          ctx.lineTo(x, y);
          ctx.stroke();

          lastX = x;
          lastY = y;
        });
      });
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error with something...");
  }
}

function updateSvgOutput(ri) {
    // 3) Reverse the scale down to original size using the scaleFactorX.
  let indx = 0;
  // Empty pathScaledDown before recalculating (this is run every time a line is deleted.)
  ri.pathScaledDown = [];
  ri.sortedLines.forEach((curve) => {
    ri.pathScaledDown.push([]);
    curve.forEach((point) => {
      ri.pathScaledDown[indx].push([
        point[0] / ri.scaleFactorX,
        point[1] / ri.scaleFactorX,
      ]);
    });
    indx++;
  });

    // 4) Maybe a light smoothing the curves to remove jagged artefacts from the mid point algorithms.
    //return;

  // 5) Create bezier curves of the pathArrays.
    //console.log("ri.pathScaledDown: ");
    //console.log(JSON.stringify(ri.pathScaledDown));
    ri.svgOutputData = generateBezierCurves(ri.pathScaledDown); // No smoothing
  console.log("ri.svgOutputData: ");
  console.log(JSON.stringify(ri.svgOutputData));
  drawBezierCurves(JSON.parse(ri.svgOutputData), smoothedCanvas, "black")


    // Fill texarea.
    let rows = Math.ceil(ri.svgOutputData.length * 25);
    ri.svgTextOutput.rows = rows;
    ri.svgTextOutput.cols = 50;
    ri.svgOutputData = addLineEnding(ri.svgOutputData); // Adds the EOF control code for micro:bit as a signal for ending the drawing.
    ri.svgTextOutput.value = ri.svgOutputData;

}

function applySmoothing(ri) {
    ri.svgOutputData = generateBezierCurvesWithSmoothing(ri.pathScaledDown,smoothingSettings); // Smoothing
    // Compare sizes
    const comparison = compareArraySizes(ri.pathScaledDown, ri.svgOutputData);
    // Print detailed analysis
    printComparison(comparison);
    // Put compression analysis into smoothing control window.
    compressionInfoEl.innerText = "Compression ratio: " + comparison.comparison.compressionRatio.toFixed(3) + ":1";
    compressionInfoEl.innerText = "Compression ratio bezier compression: " + comparison.comparison.compressionPercent.toFixed(1) + " %";
    // Draw smoothed svg data.
    drawBezierCurves(JSON.parse(ri.svgOutputData), smoothedCanvas, "black")
    // Output bezier curves as text
    // First need to Apply a custom ending to the text for
    ri.svgOutputData = addLineEnding(ri.svgOutputData);
    let rows = Math.ceil(ri.svgOutputData.length * 25);
    ri.svgTextOutput.rows = rows;
    ri.svgTextOutput.cols = 50;
    ri.svgTextOutput.value = ri.svgOutputData;

}

function addLineEnding(text) {
  text = text.slice(0, text.length - 2);  // Remove last 2 characters
  text += ',"EOF",492"]]';  // Add new ending
  return text
}

function updateMouseFollowerPosition(evt) {
  const follower = document.getElementById("mouse-follower");

  if (follower) {
    const diameter = Number(
      document.getElementById("pupilDiameter").value
    );
    const rect = document
      .getElementById("centerLineCanvas")
      .getBoundingClientRect();
    follower.style.width = diameter + "px"; // Adjust size as needed
    follower.style.height = diameter + "px"; // Adjust size as needed
    let x = rect.x + evt.offsetX;
    let y = rect.y + evt.offsetY;
    x -= diameter / 2;
    y -= diameter / 2;
    follower.style.top = y + "px";
    follower.style.left = x + "px"; // Adjust offset as needed
    //follower.style.transform = `translate(${evt.x - diameter / 2}px, ${evt.y - diameter / 2}px)`;
  }
}

function showMouseFollower() {
  const mouseFollower = document.querySelector("#mouse-follower");
  if (mouseFollower) {
    mouseFollower.style.visibility = "visible";
  }
}

function hideMouseFollower() {
  const mouseFollower = document.querySelector("#mouse-follower");
  if (mouseFollower) {
    mouseFollower.style.visibility = "hidden";
  }
}

function copySVG() {
  svgTextOutput.select();
  //document.execCommand("copy");
  navigator.clipboard.writeText(svgTextOutput.value);
}


function d(id) {
  /* Returns the handle for the DOM object with id*/
  return document.getElementById(id);
}