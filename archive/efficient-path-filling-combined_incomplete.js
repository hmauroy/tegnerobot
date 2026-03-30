/**
 * Combined SVG Path Library
 * Provides both SVG path parsing and efficient path filling functionality
 */

/**
 * Edge class used for the scanline algorithm
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

/**
 * SVG Path Parser with improved Bézier curve flattening
 */
class SVGPathParser {
  /**
   * Parse an SVG path command array into a flattened array of points
   * @param {Array} pathCommands - Array of SVG path commands (e.g. ['M',x,y,'C',x1,y1,x2,y2,x,y,...])
   * @param {number} flatness - Lower values produce smoother curves (default: 0.5)
   * @returns {Array} Array of {x,y} points representing the flattened path
   */
  static parseCommands(pathCommands, flatness = 0.5) {
    const points = [];
    let currentX = 0;
    let currentY = 0;
    let firstX = 0;
    let firstY = 0;
    let i = 0;

    while (i < pathCommands.length) {
      const command = pathCommands[i];

      switch (command) {
        case "M": // MoveTo absolute
          currentX = pathCommands[i + 1];
          currentY = pathCommands[i + 2];
          firstX = currentX; // Remember start point for path closure
          firstY = currentY;
          points.push({ x: currentX, y: currentY });
          i += 3;
          break;

        case "m": // MoveTo relative
          currentX += pathCommands[i + 1];
          currentY += pathCommands[i + 2];
          firstX = currentX;
          firstY = currentY;
          points.push({ x: currentX, y: currentY });
          i += 3;
          break;

        case "L": // LineTo absolute
          currentX = pathCommands[i + 1];
          currentY = pathCommands[i + 2];
          points.push({ x: currentX, y: currentY });
          i += 3;
          break;

        case "l": // LineTo relative
          currentX += pathCommands[i + 1];
          currentY += pathCommands[i + 2];
          points.push({ x: currentX, y: currentY });
          i += 3;
          break;

        case "C": // CurveTo absolute - cubic Bézier
          {
            const x1 = pathCommands[i + 1];
            const y1 = pathCommands[i + 2];
            const x2 = pathCommands[i + 3];
            const y2 = pathCommands[i + 4];
            const x = pathCommands[i + 5];
            const y = pathCommands[i + 6];

            // Flatten the cubic Bézier curve into line segments
            const bezierPoints = this.flattenCubicBezier(
              currentX,
              currentY,
              x1,
              y1,
              x2,
              y2,
              x,
              y,
              flatness
            );

            // Add the points (excluding the first one, which is the current point)
            for (let j = 1; j < bezierPoints.length; j++) {
              points.push(bezierPoints[j]);
            }

            currentX = x;
            currentY = y;
            i += 7;
          }
          break;

        case "c": // CurveTo relative - cubic Bézier
          {
            const x1 = currentX + pathCommands[i + 1];
            const y1 = currentY + pathCommands[i + 2];
            const x2 = currentX + pathCommands[i + 3];
            const y2 = currentY + pathCommands[i + 4];
            const x = currentX + pathCommands[i + 5];
            const y = currentY + pathCommands[i + 6];

            // Flatten the cubic Bézier curve into line segments
            const bezierPoints = this.flattenCubicBezier(
              currentX,
              currentY,
              x1,
              y1,
              x2,
              y2,
              x,
              y,
              flatness
            );

            // Add the points (excluding the first one, which is the current point)
            for (let j = 1; j < bezierPoints.length; j++) {
              points.push(bezierPoints[j]);
            }

            currentX = x;
            currentY = y;
            i += 7;
          }
          break;

        case "Z": // ClosePath
        case "z":
          // If the path isn't already closed, close it
          if (
            points.length > 0 &&
            (points[points.length - 1].x !== firstX ||
              points[points.length - 1].y !== firstY)
          ) {
            points.push({ x: firstX, y: firstY });
          }
          i += 1;
          break;

        default:
          // Skip unknown commands
          console.warn(`Unsupported SVG command: ${command}`);
          i += 1;
          break;
      }
    }

    return points;
  }

  /**
   * Parse a nested array format of SVG path data
   * @param {Array} svgPathArray - Array in the format [["M",x,y,"C",x1,y1,...],...]
   * @param {number} flatness - Lower values produce smoother curves
   * @returns {Array} Array of point arrays, one for each subpath
   */
  static parseNestedPathArray(svgPathArray, flatness = 0.5) {
    const subpaths = [];

    for (const subpathCommands of svgPathArray) {
      // Convert the subpath array to a flattened array of points
      const points = this.parseCommands(subpathCommands, flatness);

      // Add debug logging
      console.log(`Parsed subpath with ${points.length} points:`, points);

      if (points.length > 0) {
        subpaths.push(points);
      } else {
        console.warn("Empty points array for subpath:", subpathCommands);
      }
    }

    return subpaths;
  }

  /**
   * Flatten a cubic Bézier curve using the de Casteljau algorithm
   * @param {number} x0 - Start point x
   * @param {number} y0 - Start point y
   * @param {number} x1 - First control point x
   * @param {number} y1 - First control point y
   * @param {number} x2 - Second control point x
   * @param {number} y2 - Second control point y
   * @param {number} x3 - End point x
   * @param {number} y3 - End point y
   * @param {number} flatness - Flatness threshold for subdivision
   * @returns {Array} Array of points representing the curve
   */
  static flattenCubicBezier(x0, y0, x1, y1, x2, y2, x3, y3, flatness = 0.5) {
    // Recursive function to subdivide the Bézier curve
    const subdivide = (ax0, ay0, ax1, ay1, ax2, ay2, ax3, ay3, depth = 0) => {
      // Check if the curve is flat enough or max recursion depth is reached
      if (
        depth > 10 ||
        this.isFlatEnough(ax0, ay0, ax1, ay1, ax2, ay2, ax3, ay3, flatness)
      ) {
        return [{ x: ax3, y: ay3 }];
      }

      // De Casteljau algorithm: Subdivide the curve into two halves
      const mid = 0.5;
      const bx01 = (ax0 + ax1) * mid;
      const by01 = (ay0 + ay1) * mid;
      const bx12 = (ax1 + ax2) * mid;
      const by12 = (ay1 + ay2) * mid;
      const bx23 = (ax2 + ax3) * mid;
      const by23 = (ay2 + ay3) * mid;

      const bx012 = (bx01 + bx12) * mid;
      const by012 = (by01 + by12) * mid;
      const bx123 = (bx12 + bx23) * mid;
      const by123 = (by12 + by23) * mid;

      const midX = (bx012 + bx123) * mid;
      const midY = (by012 + by123) * mid;

      // Recursively subdivide the left and right parts of the curve
      const leftPart = subdivide(
        ax0,
        ay0,
        bx01,
        by01,
        bx012,
        by012,
        midX,
        midY,
        depth + 1
      );

      const rightPart = subdivide(
        midX,
        midY,
        bx123,
        by123,
        bx23,
        by23,
        ax3,
        ay3,
        depth + 1
      );

      // Combine and remove duplicate last point
      return leftPart.concat(rightPart.slice(1));
    };

    // Start the subdivision process with the first point
    const points = [{ x: x0, y: y0 }].concat(
      subdivide(x0, y0, x1, y1, x2, y2, x3, y3)
    );

    return points;
  }

  /**
   * Check if a cubic Bézier curve segment is flat enough to be represented as a line
   * Improved flatness check using maximum deviation
   * @param {number} x0 - Start point x
   * @param {number} y0 - Start point y
   * @param {number} x1 - First control point x
   * @param {number} y1 - First control point y
   * @param {number} x2 - Second control point x
   * @param {number} y2 - Second control point y
   * @param {number} x3 - End point x
   * @param {number} y3 - End point y
   * @param {number} flatness - Flatness threshold
   * @returns {boolean} True if the curve is flat enough
   */
  static isFlatEnough(x0, y0, x1, y1, x2, y2, x3, y3, flatness) {
    // Compute the convex hull diagonal as a line
    const dx = x3 - x0;
    const dy = y3 - y0;

    // Check distance of control points from the line
    const distanceFromLine = (px, py) => {
      const lineLengthSq = dx * dx + dy * dy;
      if (lineLengthSq === 0) {
        // Line is a point, use distance from point
        return Math.sqrt((px - x0) * (px - x0) + (py - y0) * (py - y0));
      }

      // Project point onto the line
      const t = ((px - x0) * dx + (py - y0) * dy) / lineLengthSq;
      const projX = x0 + t * dx;
      const projY = y0 + t * dy;

      // Compute perpendicular distance
      return Math.sqrt(
        (px - projX) * (px - projX) + (py - projY) * (py - projY)
      );
    };

    // Compute maximum distance of control points from the line
    const maxDistance = Math.max(
      distanceFromLine(x1, y1),
      distanceFromLine(x2, y2)
    );

    // Use flatness as a scaling factor for maximum acceptable deviation
    return maxDistance <= flatness;
  }

  /**
   * Convert a string SVG path to points
   * Example: "M10,10 L20,20 C30,30 40,40 50,50 Z"
   * @param {string} svgPathString - SVG path data string
   * @param {number} flatness - Lower values produce smoother curves
   * @returns {Array} Array of {x,y} points
   */
  static parseSVGPathString(svgPathString, flatness = 0.5) {
    // Simple tokenizer for SVG path commands
    // This is a basic implementation that handles only M, L, C, Z commands
    const tokens = svgPathString.match(/([MLCZmlcz])|(-?\d+(\.\d+)?)/g) || [];
    const commands = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (/[MLCZmlcz]/.test(token)) {
        commands.push(token);
      } else {
        commands.push(parseFloat(token));
      }
    }

    return this.parseCommands(commands, flatness);
  }
}

/**
 * PathFiller class for filling closed paths using scanline algorithm
 */
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
 * Helper function to scale and translate an SVG path
 * @param {Array} pathData - Array of SVG path commands
 * @param {number} scale - Scale factor
 * @param {number} translateX - X translation
 * @param {number} translateY - Y translation
 * @returns {Array} Transformed path data
 */
function scaleAndTranslatePath(pathData, scale, translateX, translateY) {
  return pathData.map((subpath) => {
    const transformed = [];
    for (let i = 0; i < subpath.length; i++) {
      if (typeof subpath[i] === "string") {
        transformed.push(subpath[i]);
      } else {
        // Apply scaling and translation to coordinates
        if (i % 2 === 1) {
          // X coordinate
          transformed.push(subpath[i] * scale + translateX);
        } else {
          // Y coordinate
          transformed.push(subpath[i] * scale + translateY);
        }
      }
    }
    console.log("Transformed subpath:", transformed);
    return transformed;
  });
}

/**
 * Initialize the demo application
 */
function initDemo() {
  const canvas = document.getElementById("fillCanvas");
  const width = canvas.width;
  const height = canvas.height;

  // Create the filler
  const filler = new PathFiller(canvas, width, height);

  // Define a simple path (a star inside a pentagon)
  const simplePaths = [
    // Outer pentagon
    [
      { x: 250, y: 50 },
      { x: 450, y: 150 },
      { x: 400, y: 350 },
      { x: 100, y: 350 },
      { x: 50, y: 150 },
    ],
    // Inner star
    [
      { x: 250, y: 120 },
      { x: 350, y: 280 },
      { x: 170, y: 180 },
      { x: 330, y: 180 },
      { x: 150, y: 280 },
    ],
  ];

  // Combine the paths (draw inner in reverse to create hole with even-odd)
  const combinedSimplePath = [...simplePaths[0], ...simplePaths[1].reverse()];

  // Define the complex SVG path provided
  const complexSVGPath = [
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

  // Scale and translate the complex path to fit the canvas better
  const scaledComplexPath = scaleAndTranslatePath(complexSVGPath, 6, 150, 100);

  // Add this debug code to inspect the path
  console.log("Scaled complex path:", scaledComplexPath);

  // Parse SVG paths to flattened point arrays
  const complexPath = SVGPathParser.parseNestedPathArray(scaledComplexPath)[0];

  // Add this debug code to inspect the parsed path
  console.log("Parsed complex path:", complexPath);

  // Make sure the path select element exists in the DOM
  let pathSelect = document.getElementById("pathSelect");
  if (!pathSelect) {
    // Create the select element if it doesn't exist
    pathSelect = document.createElement("select");
    pathSelect.id = "pathSelect";
    pathSelect.innerHTML = `
            <option value="simple">Simple Star & Pentagon</option>
            <option value="complex">Complex SVG Path</option>
        `;

    // Find the button group and prepend the select element
    const buttonGroup = document.querySelector(".button-group");
    if (buttonGroup) {
      buttonGroup.prepend(pathSelect);
    }
  }

  // Modify the getSelectedPath function to ensure proper handling
  const getSelectedPath = () => {
    const selection = pathSelect.value;
    console.log(`Selected path: ${selection}`);

    if (selection === "simple") {
      return combinedSimplePath;
    } else {
      // Ensure complex path is properly flattened and has points
      if (!complexPath || complexPath.length === 0) {
        console.error("Complex path is empty or not properly parsed!");
        return combinedSimplePath; // Fall back to simple path
      }

      return complexPath;
    }
  };

  // Function to draw the current path
  const drawCurrentPath = () => {
    // Clear the canvas
    filler.ctx.clearRect(0, 0, width, height);

    // Get the current path
    const pathToDraw = getSelectedPath();
    console.log("Path to draw:", pathToDraw);

    // Fill the path
    filler.fillPath(pathToDraw, "rgba(0, 200, 0, 0.3)");

    // Draw the path edges
    filler.ctx.strokeStyle = "black";
    filler.ctx.lineWidth = 2;
    filler.ctx.beginPath();

    if (pathToDraw.length > 0) {
      filler.ctx.moveTo(pathToDraw[0].x, pathToDraw[0].y);
      for (let i = 1; i < pathToDraw.length; i++) {
        filler.ctx.lineTo(pathToDraw[i].x, pathToDraw[i].y);
      }
      filler.ctx.closePath();
      filler.ctx.stroke();
    } else {
      console.error("Path has no points to draw!");
    }
  };

  // Add change event listener to the select menu
  pathSelect.addEventListener("change", () => {
    console.log("Path selection changed to:", pathSelect.value);
    drawCurrentPath();
  });

  // Update the button event handlers to use the drawCurrentPath function
  document.getElementById("fillOnlyBtn").addEventListener("click", () => {
    drawCurrentPath();
  });

  document.getElementById("startBtn").addEventListener("click", () => {
    filler.ctx.clearRect(0, 0, width, height);
    const pathToVisualize = getSelectedPath();

    // Force drawing of the outline first
    filler.ctx.strokeStyle = "black";
    filler.ctx.lineWidth = 2;
    filler.ctx.beginPath();

    if (pathToVisualize.length > 0) {
      filler.ctx.moveTo(pathToVisualize[0].x, pathToVisualize[0].y);
      for (let i = 1; i < pathToVisualize.length; i++) {
        filler.ctx.lineTo(pathToVisualize[i].x, pathToVisualize[i].y);
      }
      filler.ctx.closePath();
      filler.ctx.stroke();
    }

    // Now run the visualization
    filler.visualizeFill(pathToVisualize, true, true);
  });

  // Call drawCurrentPath at initialization instead of the previous code
  drawCurrentPath();

  document.getElementById("fillOnlyBtn").addEventListener("click", () => {
    filler.ctx.clearRect(0, 0, width, height);

    const selectedPath = getSelectedPath();
    filler.fillPath(selectedPath, "rgba(0, 200, 0, 0.8)");

    filler.ctx.clearRect(0, 0, width, height);

    // Draw the path edges on top for better visibility
    filler.ctx.strokeStyle = "black";
    filler.ctx.lineWidth = 2;
    filler.ctx.beginPath();
    filler.ctx.moveTo(selectedPath[0].x, selectedPath[0].y);
    for (let i = 1; i < selectedPath.length; i++) {
      filler.ctx.lineTo(selectedPath[i].x, selectedPath[i].y);
    }
    filler.ctx.closePath();
    filler.ctx.stroke();
  });

  document.getElementById("benchmarkBtn").addEventListener("click", () => {
    const resultElement = document.getElementById("benchmarkResult");
    resultElement.textContent = "Running benchmark...";

    // Clear the canvas
    filler.ctx.clearRect(0, 0, width, height);

    // Get the selected path
    const selectedPath = getSelectedPath();

    // Number of iterations for the benchmark
    const iterations = 1000;

    // Warm-up run
    for (let i = 0; i < 10; i++) {
      filler.fillPath(selectedPath, "rgba(0, 200, 0, 0.8)");
      filler.ctx.clearRect(0, 0, width, height);
    }

    // Run the benchmark
    const startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
      filler.fillPath(selectedPath, "rgba(0, 200, 0, 0.8)");
      filler.ctx.clearRect(0, 0, width, height);
    }
    const endTime = performance.now();

    // Calculate and display the result
    const totalTime = endTime - startTime;
    const timePerIteration = totalTime / iterations;

    resultElement.textContent = `Benchmark result: ${iterations} iterations in ${totalTime.toFixed(
      2
    )}ms (${timePerIteration.toFixed(3)}ms per fill operation)`;

    // Show a final filled path
    filler.fillPath(selectedPath, "rgba(0, 200, 0, 0.8)");

    // Draw the path edges
    filler.ctx.strokeStyle = "black";
    filler.ctx.lineWidth = 2;
    filler.ctx.beginPath();
    filler.ctx.moveTo(selectedPath[0].x, selectedPath[0].y);
    for (let i = 1; i < selectedPath.length; i++) {
      filler.ctx.lineTo(selectedPath[i].x, selectedPath[i].y);
    }
    filler.ctx.closePath();
    filler.ctx.stroke();
  });

  // Initial render
  filler.ctx.clearRect(0, 0, width, height);
  const initialPath = getSelectedPath();
  filler.fillPath(initialPath, "rgba(0, 200, 0, 0.3)");

  // Draw the path edges
  filler.ctx.strokeStyle = "black";
  filler.ctx.lineWidth = 2;
  filler.ctx.beginPath();
  filler.ctx.moveTo(initialPath[0].x, initialPath[0].y);
  for (let i = 1; i < initialPath.length; i++) {
    filler.ctx.lineTo(initialPath[i].x, initialPath[i].y);
  }
  filler.ctx.closePath();
  filler.ctx.stroke();
}
