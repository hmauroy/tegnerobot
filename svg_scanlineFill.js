function scanlineFillCopilot(ctx, pathArrays, createScanlines, createFill) {
  let minY = Infinity,
    maxY = -Infinity,
    minX = Infinity,
    maxX = -Infinity;

  // Determine the bounding box of the path
  pathArrays.forEach((points) => {
    points.forEach(([x, y]) => {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    });
  });

  ctx.lineWidth = 1;
  ctx.strokeStyle = "green";
  let stepSize = Number(document.getElementById("scanLineSeparation").value);

  if (createFill) {
    ctx.strokeStyle = "darkslategrey";
    stepSize = 0.1;
  }

  // Creates a new 2D-array of subarrays with points which run in the middle of the scanlines
  let lineArray = [];

  // 1) Y-axis scanning
  for (let y = minY; y <= maxY; y += stepSize) {
    let intersections = [];

    // 2) Searches for intersections among all the SVG path-arrays.
    pathArrays.forEach((points) => {
      for (let i = 0; i < points.length - 1; i++) {
        let [x1, y1] = points[i];
        let [x2, y2] = points[i + 1];

        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
          let x = x1 + ((y - y1) * (x2 - x1)) / (y2 - y1);
          intersections.push(x);
        }
      }
    });

    // 3) Sorts the intersections in the x-axis.
    intersections.sort((a, b) => a - b);

    // 4) Draws lines between the intersection points.
    for (let i = 0; i < intersections.length; i += 2) {
      let xStart = intersections[i];
      let xEnd = intersections[i + 1];
      lineArray.push([(xEnd + xStart) / 2, y]);
      ctx.beginPath();
      ctx.moveTo(xStart, y);
      ctx.lineTo(xEnd, y);
      if (createScanlines || createFill) {
        ctx.stroke();
      }
    }
  }

  // 5) X-axis scanning
  for (let x = minX; x <= maxX; x += stepSize) {
    let intersections = [];

    // Searches for intersections among all the SVG path-arrays.
    pathArrays.forEach((points) => {
      for (let i = 0; i < points.length - 1; i++) {
        let [x1, y1] = points[i];
        let [x2, y2] = points[i + 1];

        if ((x1 <= x && x2 > x) || (x2 <= x && x1 > x)) {
          let y = y1 + ((x - x1) * (y2 - y1)) / (x2 - x1);
          intersections.push(y);
        }
      }
    });

    // Sorts the intersections in the y-axis.
    intersections.sort((a, b) => a - b);

    // Draws lines between the intersection points.
    for (let i = 0; i < intersections.length; i += 2) {
      let yStart = intersections[i];
      let yEnd = intersections[i + 1];
      lineArray.push([x, (yEnd + yStart) / 2]);
      ctx.beginPath();
      ctx.moveTo(x, yStart);
      ctx.lineTo(x, yEnd);
      if (createScanlines || createFill) {
        ctx.stroke();
      }
    }
  }

  return lineArray;
}

// Original scanlineFill by chatGPT. Edit by Henrik.
function scanlineFillYaxis(
  ctx,
  pathArrays,
  createScanlines,
  createFill,
  createCenterLine,
  maxDistanceThreshold
) {
  let minY = Infinity,
    maxY = -Infinity;

  pathArrays.forEach((points) => {
    points.forEach(([x, y]) => {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });
  });

  ctx.lineWidth = 1;
  ctx.strokeStyle = "green";
  let stepSize = Number(document.getElementById("scanLineSeparation").value);

  // Original code iterates through integer y-values.
  //for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {

  if (createFill) {
    ctx.strokeStyle = "darkslategrey";
    stepSize = 0.1;
    createScanlines = false;
    createCenterLine = false;
  }

  // Creates a new 2D-array of subarrays with points which run in the middle of the scanlines
  let lineArray = [];

  // 1) Scans the drawing one line at a time with a fixed stepSize
  for (let y = minY; y <= maxY; y += stepSize) {
    let intersections = [];

    // 2) Searches for intersections among all the SVG path-arrays.
    pathArrays.forEach((points) => {
      for (let i = 0; i < points.length - 1; i++) {
        let [x1, y1] = points[i];
        let [x2, y2] = points[i + 1];

        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
          let x = x1 + ((y - y1) * (x2 - x1)) / (y2 - y1);
          intersections.push(x);
        }
      }
    });

    // 3) Sorts the intersections in the x-axis.
    intersections.sort((a, b) => a - b);
    //console.log(intersections);

    //drawIntersectionPoints(intersections);

    // 4) Draws lines between the intersection points.
    for (let i = 0; i < intersections.length; i += 2) {
      let xStart = intersections[i];
      let xEnd = intersections[i + 1];
      lineArray.push([(xEnd + xStart) / 2, y]);
      ctx.beginPath();
      ctx.moveTo(xStart, y);
      ctx.lineTo(xEnd, y);
      // Only draw scanlines or dense scanlines if selected by user.
      if (createScanlines || createFill) {
        ctx.stroke();
      }
    }
  }
  // Use external function to draw the points onto the canvas
  if (createCenterLine) {
    ctx.strokeStyle = "red";
    const path = findNearestNeighborPathImproved(
      lineArray,
      maxDistanceThreshold
    );
    drawLines(path);
  }
}
