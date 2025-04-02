// Creates a new 2D-array of subarrays with points which run in the middle of the scanlines
let pathIntersections = [];

// Process each path separately
pathArrays.forEach((points, pathIndex) => {
  let pathLineArray = [];

  // 1) Scans the current path one line at a time with a fixed stepSize
  for (let y = minY; y <= maxY; y += stepSize) {
    let intersections = [];

    // 2) Searches for intersections only in the current path
    for (let i = 0; i < points.length - 1; i++) {
      let [x1, y1] = points[i];
      let [x2, y2] = points[i + 1];

      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
        let x = x1 + ((y - y1) * (x2 - x1)) / (y2 - y1);
        intersections.push(x);
      }
    }

    // 3) Sorts the intersections in the x-axis.
    intersections.sort((a, b) => a - b);

    // 4) Draws lines between the intersection points and collect midpoints
    for (let i = 0; i < intersections.length; i += 2) {
      if (i + 1 < intersections.length) {
        // Make sure we have a pair
        let xStart = intersections[i] * scaleFactor;
        let xEnd = intersections[i + 1] * scaleFactor;
        let yScaled = y * scaleFactor;

        // Store the midpoint of this scanline segment
        pathLineArray.push([(xEnd + xStart) / 2, yScaled]);

        // Draw the scanline if needed
        ctx.beginPath();
        ctx.moveTo(xStart, yScaled);
        ctx.lineTo(xEnd, yScaled);

        // Only draw scanlines or dense scanlines if selected by user.
        if (createScanlines || createFill) {
          ctx.stroke();
        }
      }
    }
  }

  // Add this path's points to the main array
  pathIntersections.push(pathLineArray);
});

// If you still need the flattened array for some reason
let lineArray = pathIntersections.flat();
