/**
 * Converts arrays of points into SVG-style bezier curve commands
 * @param {Array<Array<Array<number>>>} pointArrays - Array of arrays where each sub-array contains points [[x,y], [x,y], ...]
 * @returns {Array<Array<any>>} - Array of command arrays in the format ["M",x,y,"C",cp1x,cp1y,cp2x,cp2y,x,y,...]
 */
function generateBezierCurves(pointArrays) {
  // Result will hold all curve command arrays
  const result = [];

  // Process each array of points (each curve)
  for (const points of pointArrays) {
    // We need at least 2 points to create a curve
    if (points.length < 2) {
      continue;
    }

    // Start with a move command to the first point
    const commandArray = [
      "M",
      points[0][0].toFixed(1),
      points[0][1].toFixed(1),
    ];

    // If we have only 2 points, we'll create a simple curve with control points
    // calculated as a midpoint with some offset
    if (points.length === 2) {
      const [x1, y1] = points[0];
      const [x2, y2] = points[1];

      // Create control points by adding an offset perpendicular to the line
      const dx = x2 - x1;
      const dy = y2 - y1;
      const distance = Math.sqrt(dx * dx + dy * dy) / 3;

      // Add a bezier curve command
      commandArray.push(
        "C",
        (x1 + dx / 3).toFixed(1),
        (y1 + dy / 3).toFixed(1),
        (x2 - dx / 3).toFixed(1),
        (y2 - dy / 3).toFixed(1),
        x2.toFixed(1),
        y2.toFixed(1)
      );
    } else {
      // For 3 or more points, calculate control points using the algorithm
      for (let i = 0; i < points.length - 1; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[i + 1];

        // Calculate control points
        let cp1x, cp1y, cp2x, cp2y;

        if (i === 0) {
          // First segment
          const [x3, y3] = points[i + 2] || [x2 + (x2 - x1), y2 + (y2 - y1)];

          // First control point: 1/3 of the way from current to next
          cp1x = x1 + (x2 - x1) / 3;
          cp1y = y1 + (y2 - y1) / 3;

          // Second control point: based on the next segment's tangent
          cp2x = x2 - (x3 - x1) / 6;
          cp2y = y2 - (y3 - y1) / 6;
        } else if (i === points.length - 2) {
          // Last segment
          const [x0, y0] = points[i - 1];

          // First control point: based on the previous segment's tangent
          cp1x = x1 + (x2 - x0) / 6;
          cp1y = y1 + (y2 - y0) / 6;

          // Second control point: 2/3 of the way from current to next
          cp2x = x1 + (2 * (x2 - x1)) / 3;
          cp2y = y1 + (2 * (y2 - y1)) / 3;
        } else {
          // Middle segments
          const [x0, y0] = points[i - 1];
          const [x3, y3] = points[i + 2];

          // First control point: based on the previous and next points
          cp1x = x1 + (x2 - x0) / 6;
          cp1y = y1 + (y2 - y0) / 6;

          // Second control point: based on the current and after-next points
          cp2x = x2 - (x3 - x1) / 6;
          cp2y = y2 - (y3 - y1) / 6;
        }

        // Add a bezier curve command
        commandArray.push(
          "C",
          cp1x.toFixed(1),
          cp1y.toFixed(1),
          cp2x.toFixed(1),
          cp2y.toFixed(1),
          x2.toFixed(1),
          y2.toFixed(1)
        );
      }
    }

    result.push(commandArray);
  }

  return result;
}

// Example usage:
const pointArrays = [
  [
    [1, 2],
    [2, 4],
    [5, 6],
  ],
  [
    [10, 20],
    [20, 40],
    [50, 60],
  ],
];

//const bezierCommands = generateBezierCurves(pointArrays);
//console.log(bezierCommands);
// Output will be in the format:
// [["M",1,2,"C",...],["M",10,20,"C",...]]
