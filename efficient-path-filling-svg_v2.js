/**
 * Efficient SVG Path Filling Algorithm with Bezier Curve Support
 * Implementation of an optimized scanline algorithm for filling closed paths
 * using techniques similar to those in browser rendering engines
 */

/**
 * Converts SVG path string to point array with support for Bezier curves
 * @param {string} svgString - JSON-encoded SVG path string
 * @returns {Array} Array of points derived from the SVG path
 */
function convertSvgToPoints(svgString) {
  // Parse the JSON string containing SVG path data
  let svgArr = JSON.parse(svgString);
  let pathPoints = [];

  // Run through array
  let lastCoordinates = [];

  for (let i = 0; i < svgArr.length; i++) {
    let segment = svgArr[i];

    for (let j = 0; j < segment.length; j++) {
      if (segment[j] === "M") {
        // Absolute move
        lastCoordinates = [segment[j + 1], segment[j + 2]];
        pathPoints.push({ x: lastCoordinates[0], y: lastCoordinates[1] });
        j += 2;
      }

      if (segment[j] === "C") {
        // Cubic bezier
        let coordinates = [
          lastCoordinates[0],
          lastCoordinates[1],
          segment[j + 1],
          segment[j + 2],
          segment[j + 3],
          segment[j + 4],
          segment[j + 5],
          segment[j + 6],
        ];

        // Calculate approximate length of segment
        const curveLength = Math.sqrt(
          Math.pow(coordinates[6] - coordinates[0], 2) +
            Math.pow(coordinates[7] - coordinates[1], 2)
        );

        // Determine number of segments
        const segment_length = 1;
        let n_segments = Math.ceil(curveLength / segment_length);
        n_segments = Math.max(30, n_segments);

        // Calculate points along the Bezier curve
        for (let k = 0; k < n_segments; k++) {
          const t = k / n_segments;
          const a = Math.pow(1.0 - t, 3);
          const b = 3.0 * t * Math.pow(1.0 - t, 2);
          const c = 3.0 * Math.pow(t, 2) * (1.0 - t);
          const d = Math.pow(t, 3);

          const x =
            a * coordinates[0] +
            b * coordinates[2] +
            c * coordinates[4] +
            d * coordinates[6];
          const y =
            a * coordinates[1] +
            b * coordinates[3] +
            c * coordinates[5] +
            d * coordinates[7];

          pathPoints.push({ x: x, y: y });
        }

        // Update last coordinates
        lastCoordinates = [coordinates[6], coordinates[7]];
        j += 6;
      }

      if (segment[j] === "L") {
        // Line
        lastCoordinates = [segment[j + 3], segment[j + 4]];
        pathPoints.push({ x: lastCoordinates[0], y: lastCoordinates[1] });
        j += 4;
      }
    }
  }

  return pathPoints;
}

class Edge {
  constructor(x1, y1, x2, y2) {
    // Ensure y1 is always the top point (smaller y)
    if (y1 > y2) {
      [x1, y1, x2, y2] = [x2, y2, x1, y1];
    }

    this.yTop = Math.ceil(y1); // Integer y-coordinate where edge starts (ceiling)
    this.yBottom = Math.floor(y2); // Integer y-coordinate where edge ends (floor)
    this.xTop = x1; // x-coordinate at the top point

    // Calculate edge slope (dx/dy) for interpolation
    // Handle horizontal edges by setting slope to 0
    this.slope = y2 !== y1 ? (x2 - x1) / (y2 - y1) : 0;
  }

  // Calculate x-coordinate at a given scanline y
  getXAtScanline(y) {
    return this.xTop + (y - this.yTop + 0.5) * this.slope;
  }
}

class PathFiller {
  constructor(canvas, width, height) {
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    this.ctx = canvas.getContext("2d");

    // Clear the canvas
    this.ctx.clearRect(0, 0, width, height);
  }

  /**
   * Extract edges from a path and organize them into y-buckets
   * @param {Array} pathPoints - Array of {x, y} points defining the path
   * @returns {Object} - Object with y-values as keys and arrays of edges as values
   */
  createEdgeBuckets(pathPoints) {
    // Create a map of y-coordinates to edges starting at that y
    const edgeBuckets = {};
    const edges = [];

    // Process all path segments
    for (let i = 0; i < pathPoints.length; i++) {
      const p1 = pathPoints[i];
      const p2 = pathPoints[(i + 1) % pathPoints.length]; // Connect back to start

      // Skip horizontal edges as they don't contribute to filling
      if (p1.y === p2.y) continue;

      const edge = new Edge(p1.x, p1.y, p2.x, p2.y);
      edges.push(edge);

      // Add edge to the bucket corresponding to its top y-coordinate
      if (!edgeBuckets[edge.yTop]) {
        edgeBuckets[edge.yTop] = [];
      }
      edgeBuckets[edge.yTop].push(edge);
    }

    return { edgeBuckets, edges };
  }

  /**
   * Find the range of y-coordinates that need to be processed
   * @param {Array} edges - All edges in the path
   * @returns {Object} - {yMin, yMax} representing the vertical bounds
   */
  findYRange(edges) {
    if (edges.length === 0) return { yMin: 0, yMax: 0 };

    let yMin = Infinity;
    let yMax = -Infinity;

    for (const edge of edges) {
      yMin = Math.min(yMin, edge.yTop);
      yMax = Math.max(yMax, edge.yBottom);
    }

    return { yMin, yMax };
  }

  /**
   * Fill a path using even-odd rule with an optimized scanline algorithm
   * @param {Array} pathPoints - Array of {x, y} points defining the path
   * @param {string} fillColor - Color to fill the path with
   */
  fillPath(pathPoints, fillColor) {
    // Extract and organize edges
    const { edgeBuckets, edges } = this.createEdgeBuckets(pathPoints);
    const { yMin, yMax } = this.findYRange(edges);

    // Set fill color
    this.ctx.fillStyle = fillColor;

    // Active Edge Table (AET) - edges that intersect current scanline
    let activeEdges = [];

    // Process each scanline from top to bottom
    for (let y = yMin; y <= yMax; y++) {
      // 1. Add new edges that start at this scanline
      if (edgeBuckets[y]) {
        activeEdges = activeEdges.concat(edgeBuckets[y]);
      }

      // 2. Remove edges that end before this scanline
      activeEdges = activeEdges.filter((edge) => edge.yBottom >= y);

      // 3. Calculate x-coordinates where active edges intersect this scanline
      const xIntersections = activeEdges.map((edge) => edge.getXAtScanline(y));

      // 4. Sort intersections from left to right
      xIntersections.sort((a, b) => a - b);

      // 5. Fill between pairs of intersections (even-odd rule)
      for (let i = 0; i < xIntersections.length; i += 2) {
        if (i + 1 < xIntersections.length) {
          const x1 = Math.round(xIntersections[i]);
          const x2 = Math.round(xIntersections[i + 1]);

          // Fill a single-pixel-height rectangle between intersections
          //this.ctx.fillRect(x1, y, x2 - x1, 1);
        }
      }
    }
  }

  /**
   * Draw the filled path with visualization of scanlines and intersections
   * @param {Array} pathPoints - Array of {x, y} points defining the path
   * @param {boolean} showEdges - Whether to draw the path edges
   * @param {boolean} showIntersections - Whether to show intersection points
   */
  visualizeFill(pathPoints, showEdges = true, showIntersections = true) {
    // Extract and organize edges
    const { edgeBuckets, edges } = this.createEdgeBuckets(pathPoints);
    const { yMin, yMax } = this.findYRange(edges);

    // Draw the original path
    if (showEdges) {
      this.ctx.strokeStyle = "black";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
      for (let i = 1; i < pathPoints.length; i++) {
        this.ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
      }
      this.ctx.closePath();
      this.ctx.stroke();
    }

    // Initial fill with transparent green
    this.fillPath(pathPoints, "rgba(0, 255, 0, 0.3)");

    // If we're not showing the process, we're done
    if (!showIntersections) return;

    // Visualization speed
    const delay = 50;
    let activeEdges = [];
    let currentY = yMin;

    const processNextScanline = () => {
      if (currentY > yMax) return;

      // 1. Add new edges that start at this scanline
      if (edgeBuckets[currentY]) {
        activeEdges = activeEdges.concat(edgeBuckets[currentY]);
      }

      // 2. Remove edges that end before this scanline
      activeEdges = activeEdges.filter((edge) => edge.yBottom >= currentY);

      // 3. Calculate x-coordinates where active edges intersect this scanline
      const xIntersections = activeEdges.map((edge) =>
        edge.getXAtScanline(currentY)
      );

      // 4. Sort intersections from left to right
      xIntersections.sort((a, b) => a - b);

      // Draw scanline
      this.ctx.strokeStyle = "rgba(255, 0, 0, 0.6)";
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(0, currentY);
      this.ctx.lineTo(this.width, currentY);
      this.ctx.stroke();

      // Draw intersection points
      this.ctx.fillStyle = "blue";
      for (const x of xIntersections) {
        this.ctx.beginPath();
        this.ctx.arc(x, currentY, 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
      }

      currentY++;
      setTimeout(processNextScanline, delay);
    };

    // Start the visualization
    processNextScanline();
  }
}

/**
 * Example usage
 */
function initDemo() {
  function multiplyArray(arr, factor) {
    return arr.map((subArray) =>
      subArray.map((element) => {
        // If the element is a string (M, C, or L), return it as is
        if (typeof element === "string") {
          return element;
        }
        // If the element is a number, multiply it by the factor
        if (typeof element === "number") {
          return element * factor;
        }
        // For any other type, return the element unchanged
        return element;
      })
    );
  }

  const canvas = document.getElementById("fillCanvas");
  const width = canvas.width;
  const height = canvas.height;

  // Create the filler
  const filler = new PathFiller(canvas, width, height);

  // Example SVG path with Move and Cubic Bezier commands
  let svgPathString1 = JSON.stringify([
    ["M", 250, 50, "C", 450, 150, 400, 350, 100, 350],
    ["M", 150, 280, "C", 330, 180, 170, 180, 250, 120],
    ["M", 100, 30, "C", 120, 120, 170, 180, 200, 20],
  ]);

  let svgPath = [
    [
      "M",
      79.7,
      16.3,
      "C",
      78.1,
      16.7,
      76.9,
      17.4,
      75.6,
      18.7,
      "C",
      71.5,
      22.6,
      71.3,
      28.2,
      75.2,
      32.3,
      "C",
      77,
      34.2,
      79,
      35.2,
      81.5,
      35.3,
      "C",
      86.1,
      35.6,
      90.4,
      32.4,
      91.6,
      27.8,
      "C",
      92.1,
      25.8,
      91.8,
      23.3,
      90.7,
      21.1,
      "C",
      89.9,
      19.6,
      88.2,
      17.8,
      86.8,
      17.1,
      "C",
      84.7,
      16,
      82,
      15.7,
      79.7,
      16.3,
    ],
    [
      "M",
      84.1,
      18.2,
      "C",
      86.9,
      19,
      89,
      21.3,
      89.7,
      24.5,
      "C",
      90,
      26,
      89.8,
      27.4,
      89.1,
      28.9,
      "C",
      88.1,
      30.8,
      85.9,
      32.6,
      83.8,
      33.2,
      "C",
      80.5,
      34.1,
      76.8,
      32.2,
      75.2,
      28.8,
      "C",
      74.5,
      27.5,
      74.5,
      27.4,
      74.5,
      25.7,
      "C",
      74.5,
      24,
      74.6,
      23.9,
      75,
      22.9,
      "C",
      76.1,
      20.6,
      77.8,
      19.1,
      80.1,
      18.3,
      "C",
      81,
      18,
      83,
      17.9,
      84.1,
      18.2,
    ],
  ];

  svgPathString1 = JSON.stringify(svgPath);

  // Convert SVG path to points
  let pathPoints = convertSvgToPoints(svgPathString1);

  // Fill the path with visualization
  document.getElementById("startBtn").addEventListener("click", () => {
    svgPath = multiplyArray(svgPath, 1);
    pathPoints = JSON.stringify(document.getElementById("svgPathInput").value);
    filler.visualizeFill(pathPoints, true, true);
  });

  // Fill the path without visualization (just performance)
  document.getElementById("fillOnlyBtn").addEventListener("click", () => {
    filler.ctx.clearRect(0, 0, width, height);
    svgPath = JSON.parse(document.getElementById("svgPathInput").value);
    svgPath = multiplyArray(svgPath, 5);
    console.log(svgPath);
    pathPoints = JSON.stringify(svgPath);
    pathPoints = convertSvgToPoints(pathPoints);
    filler.fillPath(pathPoints, "rgba(0, 200, 0, 0.8)");

    // Draw the original path
    filler.ctx.strokeStyle = "black";
    filler.ctx.lineWidth = 2;
    filler.ctx.beginPath();
    filler.ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
    for (let i = 1; i < pathPoints.length; i++) {
      filler.ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
    }
    filler.ctx.closePath();
    filler.ctx.stroke();
  });

  // Benchmark button for performance testing
  document.getElementById("benchmarkBtn").addEventListener("click", () => {
    const iterations = 1000;
    const startTime = performance.now();

    // Run many iterations without visualization
    for (let i = 0; i < iterations; i++) {
      filler.ctx.clearRect(0, 0, width, height);
      filler.fillPath(pathPoints, "rgba(0, 200, 0, 0.8)");
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const timePerFill = totalTime / iterations;

    document.getElementById("benchmarkResult").textContent =
      `Filled ${iterations} times in ${totalTime.toFixed(2)}ms. ` +
      `Average: ${timePerFill.toFixed(3)}ms per fill.`;
  });
}

// Initialize when document is loaded
window.addEventListener("DOMContentLoaded", initDemo);
