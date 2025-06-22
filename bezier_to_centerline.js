
const drawCanvas = document.getElementById("drawCanvas");
const ctx = drawCanvas.getContext("2d");
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
const btnApplySmoothing = document.getElementById("btnApplySmoothing");
const follower = document.getElementById("mouse-follower");

// Get references to all the input elements
const enableSmoothingElement = document.getElementById('enableSmoothing');
const minDistanceElement = document.getElementById('minDistance');
const angleThresholdElement = document.getElementById('angleThreshold');
const douglasEpsilonElement = document.getElementById('douglasEpsilon');
const movingAverageWindowElement = document.getElementById('movingAverageWindow');

const createFill = fillCheckbox.checked;
const createScanlines = scanlinesCheckbox.checked;
const createOutline = outlineCheckbox.checked;
const createCenterLine = centerlineCheckbox.checked;
const createStartpoints = startpointsCheckbox.checked;
const maxDistanceThreshold = Number(
  document.getElementById("centerLineSeparation").value
);

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
btnApplySmoothing.addEventListener("click", () => {
    // Apply smoothing to the bezier curves.
});
minDistanceElement.addEventListener('input', () => {
  smoothingSettings.minDistance = parseFloat(minDistanceElement.value);
  d("minDistanceDisplay").innerText = smoothingSettings.minDistance;
});

angleThresholdElement.addEventListener('input', () => {
    smoothingSettings.angleThreshold = parseFloat(angleThresholdElement.value);
    d("angleThresholdDisplay").innerText = smoothingSettings.angleThreshold;
});

douglasEpsilonElement.addEventListener('input', () => {
    smoothingSettings.douglasEpsilon = parseFloat(douglasEpsilonElement.value);
    d("douglasEpsilonDisplay").innerText = smoothingSettings.douglasEpsilon;
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

function drawSvgPath(svgData) {
    console.log(typeof svgData);


  ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

  let isEditing = false; // Used for editing with pupil insertions.
  // Handle click when inserting pupils.
  const pupils = []; // [[x1,y1,radius1],[x2,y2,radius2],...]
  function handlePupilClick(evt) {
    console.log(evt.offsetX, evt.offsetY);
    const rect = drawCanvas.getBoundingClientRect();
    if (isOverCanvas) {
      const x = evt.clientX - rect.x - 2;
      const y = evt.clientY - rect.y - 2;
      pupils.push(drawPupil(x, y, getDiameter(), ctx));
      //console.log(pupils);
      console.log(JSON.stringify(pupils));
    }
  }
  function isOverCanvas(evt) {
    const rect = drawCanvas.getBoundingClientRect();
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
        drawCanvas.style.cursor = "default";
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
        drawCanvas.style.cursor = "none";
        document.getElementById("btnPupilInsert").innerText = "Finish";
        document.addEventListener("click", handlePupilClick);
        // Black circle as a mouse follower.
        drawCanvas.addEventListener("mousemove", updateMouseFollowerPosition);
        drawCanvas.addEventListener("mouseenter", showMouseFollower);
        drawCanvas.addEventListener("mouseleave", hideMouseFollower);
      }
    });

  function getDiameter() {
    return Number(document.getElementById("pupilDiameter").value);
  }

  try {
    // (I)) Automatic scaling of the data to visualize on a similar scale for all svg drawings.
    const boundingBox = calcBoundingBox(svgData); // Returns [x1,y1,x2,y2]
    const x1 = boundingBox[0];
    const x2 = boundingBox[2];
    const y1 = boundingBox[1];
    const y2 = boundingBox[3];
    const svgWidth = x2 - x1;
    const svgHeight = y2 - y1;
    const paddingFactor = 1.02;

    // Scalefactor divides the canvas width on the svg width some padding.
    let scaleFactorX = drawCanvas.width / (svgWidth * paddingFactor);
    if (scaleFactorX * (y1 + svgHeight) * paddingFactor > drawCanvas.height) {
      while (
        scaleFactorX * (y1 + svgHeight) * paddingFactor >
        drawCanvas.height
      ) {
        scaleFactorX = scaleFactorX * 0.995;
      }
    }
    // (II) Parse the svg data format applying scaling for better viewing by the user.
    const pathArrays = parseSvgPath(svgData, scaleFactorX);

    // 1a) Calculates intersections and fills the scanlines with lines or dense lines (fill).
    // Return value is an array of the mid points of intersections of scan lines.
    const midpoints = scanlineFillCopilot(
      ctx,
      pathArrays,
      createScanlines,
      createFill
    );

    // 1b) Find the paths through the mid points.
    let path = [];
    if (createCenterLine) {
      path = findNearestNeighborPathImproved(
        midpoints,
        maxDistanceThreshold
      );
      // Draw lines between points.
      drawLines(path);
    }

    // 2) Sort the curves for minimizing travel distance.
    const sortedLines = sortPathCurves(path, calcBoundingBox(path), ctx);

    // 3) Draw the start points of the sorted curves
    if (createStartpoints) {
      drawStartingPoints(sortedLines, ctx);
    }

    // 4) Reverse the scale down to original size using the scaleFactorX.
    const pathScaledDown = [];
    let indx = 0;
    sortedLines.forEach((curve) => {
      pathScaledDown.push([]);
      curve.forEach((point) => {
        pathScaledDown[indx].push([
          point[0] / scaleFactorX,
          point[1] / scaleFactorX,
        ]);
      });
      indx++;
    });

    // 4) Smooth the curves to remove jagged artefacts from the mid point algorithms.
    //return;
      // 5) Create bezier curves of the pathArrays.
    const svgOutputData = generateBezierCurves(pathScaledDown); // No smoothing
    

    // Fill texarea.
    let rows = Math.ceil(svgOutputData.length * 25);
    svgTextOutput.rows = rows;
    svgTextOutput.cols = 50;
    svgTextOutput.value = svgOutputData;

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

function applySmoothing() {
    const svgOutputData = generateBezierCurvesWithSmoothing(pathScaledDown,smoothingSettings); // Smoothing
    // Compare sizes
    const comparison = compareArraySizes(pathScaledDown, svgOutputData);
    // Print detailed analysis
    printComparison(comparison);
    // Draw smoothed svg data.
    
}

function updateMouseFollowerPosition(evt) {
  const follower = document.getElementById("mouse-follower");

  if (follower) {
    const diameter = Number(
      document.getElementById("pupilDiameter").value
    );
    const rect = document
      .getElementById("drawCanvas")
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