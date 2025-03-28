/**
 * Bezier Curve Point Calculation Utility
 * Extracted and modified from original MakeCode implementation
 */
function calculateBezierPoints(coordinates, segmentLength = 1) {
  const x0 = coordinates[0];
  const y0 = coordinates[1];
  const x1 = coordinates[2];
  const y1 = coordinates[3];
  const x2 = coordinates[4];
  const y2 = coordinates[5];
  const x3 = coordinates[6];
  const y3 = coordinates[7];

  // Calculate approximate length of segment
  const curveLength = Math.sqrt(Math.pow(x3 - x0, 2) + Math.pow(y3 - y0, 2));

  const n_segments = Math.ceil(curveLength / segmentLength);
  const points = [];

  // Calculate each point along bezier curve
  for (let k = 0; k < n_segments; k++) {
    const t = k / n_segments;
    const a = Math.pow(1.0 - t, 3);
    const b = 3.0 * t * Math.pow(1.0 - t, 2);
    const c = 3.0 * Math.pow(t, 2) * (1.0 - t);
    const d = Math.pow(t, 3);

    const x = a * x0 + b * x1 + c * x2 + d * x3;
    const y = a * y0 + b * y1 + c * y2 + d * y3;

    points.push({ x, y });
  }

  return points;
}

/**
 * SVG Path Parsing Utility
 * Converts SVG path string to array of points
 */
function parseSVGPath(svgPathString) {
  const pathPoints = [];

  // Regular expression to match SVG path commands and their coordinates
  const pathRegex = /([MLCQ])([^MLCQ]*)/g;
  let match;

  while ((match = pathRegex.exec(svgPathString)) !== null) {
    const command = match[1];
    const coordsStr = match[2].trim();
    const coords = coordsStr.split(/[\s,]+/).map(parseFloat);

    switch (command) {
      case "M": // Move to
        pathPoints.push({ x: coords[0], y: coords[1] });
        break;
      case "L": // Line to
        pathPoints.push({ x: coords[0], y: coords[1] });
        break;
      case "C": // Cubic Bezier
        const bezierCoords = [
          pathPoints[pathPoints.length - 1].x,
          pathPoints[pathPoints.length - 1].y,
          coords[0],
          coords[1],
          coords[2],
          coords[3],
          coords[4],
          coords[5],
        ];
        const bezierPoints = calculateBezierPoints(bezierCoords);
        pathPoints.push(...bezierPoints);
        break;
      case "Q": // Quadratic Bezier (simplified to linear interpolation)
        const quadCoords = [
          pathPoints[pathPoints.length - 1].x,
          pathPoints[pathPoints.length - 1].y,
          coords[0],
          coords[1],
          coords[2],
          coords[3],
        ];
        const quadPoints = calculateBezierPoints(quadCoords);
        pathPoints.push(...quadPoints);
        break;
    }
  }

  return pathPoints;
}

/**
 * Efficient SVG Path Filling Algorithm
 * Implementation of an optimized scanline algorithm for filling closed paths
 * using techniques similar to those in browser rendering engines (without GPU acceleration)
 */
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
          this.ctx.fillRect(x1, y, x2 - x1, 1);
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
  const canvas = document.getElementById("fillCanvas");
  const width = canvas.width;
  const height = canvas.height;

  // Create the filler
  const filler = new PathFiller(canvas, width, height);

  // Support for SVG path input
  document.getElementById("fillSVGPathBtn").addEventListener("click", () => {
    const svgPathInput = document.getElementById("svgPathInput").value;
    const pathPoints = parseSVGPath(svgPathInput);

    // Clear canvas
    filler.ctx.clearRect(0, 0, width, height);

    // Fill with visualization
    filler.visualizeFill(pathPoints, true, true);
  });

  // Define a complex path (a star inside a pentagon)
  const outerPath = [
    { x: 250, y: 50 },
    { x: 450, y: 150 },
    { x: 400, y: 350 },
    { x: 100, y: 350 },
    { x: 50, y: 150 },
  ];

  const innerPath = [
    { x: 250, y: 120 },
    { x: 350, y: 280 },
    { x: 170, y: 180 },
    { x: 330, y: 180 },
    { x: 150, y: 280 },
  ];

  // Combine the paths (draw inner in reverse to create hole with even-odd)
  const combinedPath = [...outerPath, ...innerPath.reverse()];

  // Fill the path with visualization
  document.getElementById("startBtn").addEventListener("click", () => {
    filler.visualizeFill(combinedPath, true, true);
  });

  // Fill the path without visualization (just performance)
  document.getElementById("fillOnlyBtn").addEventListener("click", () => {
    filler.ctx.clearRect(0, 0, width, height);
    filler.fillPath(combinedPath, "rgba(0, 200, 0, 0.8)");

    // Draw the original path
    filler.ctx.strokeStyle = "black";
    filler.ctx.lineWidth = 2;
    filler.ctx.beginPath();
    filler.ctx.moveTo(combinedPath[0].x, combinedPath[0].y);
    for (let i = 1; i < combinedPath.length; i++) {
      filler.ctx.lineTo(combinedPath[i].x, combinedPath[i].y);
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
      filler.fillPath(combinedPath, "rgba(0, 200, 0, 0.8)");
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
