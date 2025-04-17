function scanlineFillClaude(
  ctx,
  pathArrays,
  scaleFactor,
  createScanlines,
  createFill,
  createCenterLine,
  maxDistanceThreshold
) {
  function removeDuplicates(arr) {
    if (arr.length === 1) {
      return arr;
    }
    let prevX = arr[0];
    let nextX = 0;
    let outputArr = [prevX];
    for (let i = 1; i < arr.length; i++) {
      nextX = arr[i];
      // Only values distinctive from others are stored.
      if (Math.abs(prevX - nextX) > 0.0001) {
        outputArr.push(nextX);
        prevX = nextX;
      }
    }
    return outputArr;
  }

  let minY = Infinity,
    maxY = -Infinity;
  let minX = Infinity,
    maxX = -Infinity;

  // Find the bounding box of all path points
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
    stepSize = 0.5;
  }

  // Creates a new 2D-array of subarrays with points which run in the middle of the scanlines
  let verticalScanPoints = [];
  let horizontalScanPoints = [];

  // Store vertical scan data for each y level
  let verticalScans = {};

  // Store horizontal scan data for each x level
  let horizontalScans = {};

  // 1) First vertical scanning pass to identify horizontal areas
  console.log("Starts scanning along y direction.");
  for (let y = minY; y <= maxY; y += stepSize) {
    console.log("y: " + y);
    let intersections = [];
    verticalScans[y] = [];

    // 2) Searches for intersections among all the SVG path-arrays.
    pathArrays.forEach((points) => {
      for (let i = 0; i < points.length - 1; i++) {
        let [x1, y1] = points[i];
        let [x2, y2] = points[i + 1];

        if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
          let x = x1 + ((y - y1) * (x2 - x1)) / (y2 - y1);
          intersections.push(x);
          //drawSinglePoint([x, y], (radius = 3), (color = "magenta"));
        }
      }
    });

    // 3) Sorts the intersections in the x-axis.
    intersections.sort((a, b) => a - b);
    // 3b) Removes points that are at vertices or top of curves/circles.
    // These single intersections should only count as one x-value.
    intersections = removeDuplicates(intersections);

    // Store all intersection points for this y level
    verticalScans[y] = intersections;

    // 4) Process and draw lines between intersection points
    for (let i = 0; i < intersections.length; i += 2) {
      if (i + 1 < intersections.length) {
        let xStart = intersections[i];
        let xEnd = intersections[i + 1];
        let midPoint = [(xEnd + xStart) / 2, y];

        // Add the midpoint to verticalScanPoints (for y-direction scan)
        verticalScanPoints.push(midPoint);

        // Draw scanlines if needed
        if (createScanlines || createFill) {
          ctx.beginPath();
          ctx.moveTo(xStart, y);
          ctx.lineTo(xEnd, y);
          ctx.stroke();
        }
      }
    }
  }

  // 5) Perform horizontal scanning
  ctx.strokeStyle = "blue"; // Different color for horizontal scans

  console.log("Starting horizontal scanning.");

  // Scan horizontally with the same step size
  for (let x = minX; x <= maxX; x += stepSize) {
    console.log("x: " + x);
    let intersectionsY = [];
    horizontalScans[x] = [];

    // Find y-intersections for this x coordinate
    pathArrays.forEach((points) => {
      for (let i = 0; i < points.length - 1; i++) {
        let [x1, y1] = points[i];
        let [x2, y2] = points[i + 1];

        // Check if the x value intersects with this path segment
        if ((x1 <= x && x2 > x) || (x2 <= x && x1 > x)) {
          // Calculate y at intersection point
          let y = y1 + ((x - x1) * (y2 - y1)) / (x2 - x1);
          intersectionsY.push(y);
        }
      }
    });

    // Sort y-intersections
    intersectionsY.sort((a, b) => a - b);

    // Store all intersection points for this x level
    horizontalScans[x] = intersectionsY;

    // Process and draw lines between horizontal intersection points
    for (let i = 0; i < intersectionsY.length; i += 2) {
      if (i + 1 < intersectionsY.length) {
        let yStart = intersectionsY[i];
        let yEnd = intersectionsY[i + 1];
        let midPointX = [x, (yEnd + yStart) / 2];

        // Add the midpoint to horizontalScanPoints
        horizontalScanPoints.push(midPointX);

        // Draw horizontal scanlines if needed
        if (createScanlines || createFill) {
          ctx.beginPath();
          ctx.moveTo(x, yStart);
          ctx.lineTo(x, yEnd);
          ctx.stroke();
        }
      }
    }
  }

  // 6) Find intersections between vertical and horizontal scanlines
  let intersectionPoints = [];

  // Process each horizontal scanline (for each x-value)
  for (let x in horizontalScans) {
    x = parseFloat(x);
    let yValues = horizontalScans[x];

    // For each pair of y-values (representing a segment)
    for (let i = 0; i < yValues.length; i += 2) {
      if (i + 1 < yValues.length) {
        let yStart = yValues[i];
        let yEnd = yValues[i + 1];

        // Check each vertical scanline (for each y-value)
        for (let y in verticalScans) {
          y = parseFloat(y);

          // If the vertical scanline intersects with this horizontal segment
          if (y >= yStart && y <= yEnd) {
            let xValues = verticalScans[y];

            // For each pair of x-values in the vertical scan
            for (let j = 0; j < xValues.length; j += 2) {
              if (j + 1 < xValues.length) {
                let xStart = xValues[j];
                let xEnd = xValues[j + 1];

                // If the horizontal scanline intersects with this vertical segment
                if (x >= xStart && x <= xEnd) {
                  // We found an intersection point
                  intersectionPoints.push([x, y]);

                  // Optionally mark the intersection points
                  if (createScanlines) {
                    ctx.fillStyle = "purple";
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, 2 * Math.PI);
                    ctx.fill();
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  console.log("finds center of mass for intersection points.");
  console.log(JSON.stringify(intersectionPoints));
  const proximityThreshold = document.getElementById(
    "maxDistanceThresholdCheckbox"
  ).value;
  const centerPoints = findMiddlePath(intersectionPoints, proximityThreshold);
  console.log(centerPoints);

  //const centerPoints = findMiddlePath(intersectionPoints);

  centerPoints.forEach((point) => {
    console.log(point);
    const x = point[0];
    const y = point[1];
    // Get the canvas and context
    let canvas = document.getElementById("drawCanvas");
    let ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(point[0], point[1]);
    ctx.fillStyle = "red";
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    //ctx.fill();
    //drawSinglePoint(point, (color = "red"), (radius = 50));
  });

  // 7) Use external function to find a path between all center points
  const path = findNearestNeighborPathImproved(
    centerPoints,
    maxDistanceThreshold
  );

  // 8) Draw the points onto the canvas
  if (createCenterLine) {
    ctx.strokeStyle = "blue";
    drawLinesClaude(path);
    //document.getElementById("SVG-output").innerText = JSON.stringify(path);
  }

  return {
    finalPath: path,
  };
}
