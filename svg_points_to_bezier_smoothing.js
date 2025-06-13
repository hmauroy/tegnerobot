/**
 * Smooths and reduces points using various algorithms
 */
class PointSmoother {
  /**
   * Douglas-Peucker algorithm for line simplification
   * Reduces points while preserving the overall shape
   * @param {Array<Array<number>>} points - Array of [x, y] points
   * @param {number} epsilon - Tolerance value (higher = more simplification)
   * @returns {Array<Array<number>>} - Simplified points
   */
  static douglasPeucker(points, epsilon = 1.0) {
    if (points.length <= 2) return points;

    // Find the point with the maximum distance from the line segment
    let maxDistance = 0;
    let maxIndex = 0;
    const start = points[0];
    const end = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.perpendicularDistance(points[i], start, end);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    // If max distance is greater than epsilon, recursively simplify
    if (maxDistance > epsilon) {
      const leftPart = this.douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
      const rightPart = this.douglasPeucker(points.slice(maxIndex), epsilon);
      
      // Combine results, removing duplicate middle point
      return leftPart.slice(0, -1).concat(rightPart);
    } else {
      // If max distance is less than epsilon, return just the endpoints
      return [start, end];
    }
  }

  /**
   * Calculate perpendicular distance from a point to a line segment
   */
  static perpendicularDistance(point, lineStart, lineEnd) {
    const [x, y] = point;
    const [x1, y1] = lineStart;
    const [x2, y2] = lineEnd;

    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B);

    const param = dot / lenSq;
    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Simple distance-based point reduction
   * Removes points that are too close to each other
   * @param {Array<Array<number>>} points - Array of [x, y] points
   * @param {number} minDistance - Minimum distance between points
   * @returns {Array<Array<number>>} - Filtered points
   */
  static reduceByDistance(points, minDistance = 2.0) {
    if (points.length <= 2) return points;

    const result = [points[0]]; // Always keep first point
    
    for (let i = 1; i < points.length; i++) {
      const lastPoint = result[result.length - 1];
      const currentPoint = points[i];
      
      const dx = currentPoint[0] - lastPoint[0];
      const dy = currentPoint[1] - lastPoint[1];
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance >= minDistance || i === points.length - 1) {
        result.push(currentPoint);
      }
    }

    return result;
  }

  /**
   * Moving average smoothing
   * Applies a moving average to smooth out small variations
   * @param {Array<Array<number>>} points - Array of [x, y] points
   * @param {number} windowSize - Size of the moving average window (odd number recommended)
   * @returns {Array<Array<number>>} - Smoothed points
   */
  static movingAverageSmooth(points, windowSize = 3) {
    if (points.length <= windowSize) return points;
    
    const result = [];
    const halfWindow = Math.floor(windowSize / 2);
    
    for (let i = 0; i < points.length; i++) {
      if (i < halfWindow || i >= points.length - halfWindow) {
        // Keep edge points unchanged
        result.push([...points[i]]);
      } else {
        // Apply moving average
        let sumX = 0, sumY = 0;
        for (let j = i - halfWindow; j <= i + halfWindow; j++) {
          sumX += points[j][0];
          sumY += points[j][1];
        }
        result.push([sumX / windowSize, sumY / windowSize]);
      }
    }
    
    return result;
  }

  /**
   * Adaptive point reduction based on curvature
   * Keeps points where the curve changes direction significantly
   * @param {Array<Array<number>>} points - Array of [x, y] points
   * @param {number} angleThreshold - Minimum angle change to keep a point (in radians)
   * @returns {Array<Array<number>>} - Filtered points
   */
  static reduceByAngle(points, angleThreshold = 0.1) {
    if (points.length <= 2) return points;

    const result = [points[0]]; // Always keep first point
    
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      
      // Calculate vectors
      const v1 = [curr[0] - prev[0], curr[1] - prev[1]];
      const v2 = [next[0] - curr[0], next[1] - curr[1]];
      
      // Calculate angle between vectors
      const dot = v1[0] * v2[0] + v1[1] * v2[1];
      const mag1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
      const mag2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]);
      
      if (mag1 === 0 || mag2 === 0) continue;
      
      const cos = dot / (mag1 * mag2);
      const angle = Math.abs(Math.acos(Math.max(-1, Math.min(1, cos))));
      
      // Keep point if angle change is significant
      if (angle > angleThreshold) {
        result.push(curr);
      }
    }
    
    result.push(points[points.length - 1]); // Always keep last point
    return result;
  }

  /**
   * Combined smoothing approach
   * Applies multiple techniques in sequence for best results
   * @param {Array<Array<number>>} points - Array of [x, y] points
   * @param {Object} options - Smoothing options
   * @returns {Array<Array<number>>} - Smoothed and reduced points
   */
  static smartSmooth(points, options = {}) {
    const {
      minDistance = 1.5,
      angleThreshold = 0.1,
      douglasEpsilon = 1.5,
      movingAverageWindow = 3,
      applyMovingAverage = true
    } = options;

    let result = [...points];

    // Step 1: Apply moving average smoothing if requested
    if (applyMovingAverage && result.length > movingAverageWindow) {
      result = this.movingAverageSmooth(result, movingAverageWindow);
    }

    // Step 2: Remove points that are too close together
    result = this.reduceByDistance(result, minDistance);

    // Step 3: Apply Douglas-Peucker simplification
    if (result.length > 2) {
      result = this.douglasPeucker(result, douglasEpsilon);
    }

    // Step 4: Final pass to remove points with small angle changes
    if (result.length > 2) {
      result = this.reduceByAngle(result, angleThreshold);
    }

    return result;
  }
}

/**
 * Enhanced version of your original function with smoothing capabilities
 * @param {Array<Array<Array<number>>>} pointArrays - Array of arrays where each sub-array contains points [[x,y], [x,y], ...]
 * @param {Object} smoothingOptions - Options for point smoothing
 * @returns {string} - JSON string of command arrays in the format [["M",x,y,"C",cp1x,cp1y,cp2x,cp2y,x,y,...],...]
 */
function generateBezierCurvesWithSmoothing(pointArrays, smoothingOptions = {}) {
  // Default smoothing options
  const defaultOptions = {
    enableSmoothing: true,
    minDistance: 1.5,
    angleThreshold: 0.1,
    douglasEpsilon: 0.1,
    movingAverageWindow: 3,
    applyMovingAverage: true
  };
  
  const options = { ...defaultOptions, ...smoothingOptions };
  const result = [];

  // Process each array of points (each curve)
  for (const originalPoints of pointArrays) {
    // Apply smoothing if enabled
    const points = options.enableSmoothing 
      ? PointSmoother.smartSmooth(originalPoints, options)
      : originalPoints;

    // We need at least 2 points to create a curve
    if (points.length < 2) {
      continue;
    }

    // Start with a move command to the first point
    const commandArray = [
      "M",
      Number(points[0][0].toFixed(1)),
      Number(points[0][1].toFixed(1)),
    ];

    // If we have only 2 points, create a simple curve with control points
    if (points.length === 2) {
      const [x1, y1] = points[0];
      const [x2, y2] = points[1];

      // Create control points by adding an offset perpendicular to the line
      const dx = x2 - x1;
      const dy = y2 - y1;

      // Add a bezier curve command
      commandArray.push(
        "C",
        Number((x1 + dx / 3).toFixed(1)),
        Number((y1 + dy / 3).toFixed(1)),
        Number((x2 - dx / 3).toFixed(1)),
        Number((y2 - dy / 3).toFixed(1)),
        Number(x2.toFixed(1)),
        Number(y2.toFixed(1))
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
          Number(cp1x.toFixed(1)),
          Number(cp1y.toFixed(1)),
          Number(cp2x.toFixed(1)),
          Number(cp2y.toFixed(1)),
          Number(x2.toFixed(1)),
          Number(y2.toFixed(1))
        );
      }
    }

    result.push(commandArray);
  }
    

  return JSON.stringify(result);
}

/**
 * Compares the size of input point arrays vs output bezier curve strings
 * @param {Array<Array<Array<number>>>} inputPointArrays - Original point arrays
 * @param {string} outputBezierString - JSON string of bezier commands
 * @returns {Object} - Comparison statistics including sizes and compression ratio
 */
function compareArraySizes(inputPointArrays, outputBezierString) {
  // Convert input to string for fair comparison
  const inputString = JSON.stringify(inputPointArrays);
  
  // Calculate sizes
  const inputSize = inputString.length;
  const outputSize = outputBezierString.length;
  
  // Calculate compression ratio
  const compressionRatio = outputSize / inputSize;
  const compressionPercent = ((inputSize - outputSize) / inputSize * 100);
  
  // Count total points in input
  const totalInputPoints = inputPointArrays.reduce((total, pointArray) => {
    return total + pointArray.length;
  }, 0);
  
  // Count bezier segments in output (each "C" command represents one segment)
  const bezierCommands = JSON.parse(outputBezierString);
  const totalBezierSegments = bezierCommands.reduce((total, commandArray) => {
    // Count "C" commands in each array
    return total + commandArray.filter(item => item === "C").length;
  }, 0);
  
  // Calculate point reduction
  const pointReduction = ((totalInputPoints - totalBezierSegments) / totalInputPoints * 100);
  
  return {
    input: {
      stringSize: inputSize,
      totalPoints: totalInputPoints,
      string: inputString
    },
    output: {
      stringSize: outputSize,
      totalBezierSegments: totalBezierSegments,
      string: outputBezierString
    },
    comparison: {
      compressionRatio: compressionRatio,
      compressionPercent: compressionPercent.toFixed(1),
      pointReduction: pointReduction.toFixed(1),
      sizeDifference: inputSize - outputSize,
      isSmaller: outputSize < inputSize
    }
  };
}

/**
 * Pretty prints the comparison results
 * @param {Object} comparison - Result from compareArraySizes
 */
function printComparison(comparison) {
  console.log("\n" + "=".repeat(50));
  console.log("         SIZE COMPARISON ANALYSIS");
  console.log("=".repeat(50));
  
  console.log(`\n📥 INPUT:`);
  console.log(`   String size: ${comparison.input.stringSize.toLocaleString()} characters`);
  console.log(`   Total points: ${comparison.input.totalPoints.toLocaleString()}`);
  
  console.log(`\n📤 OUTPUT:`);
  console.log(`   String size: ${comparison.output.stringSize.toLocaleString()} characters`);
  console.log(`   Bezier segments: ${comparison.output.totalBezierSegments.toLocaleString()}`);
  
  console.log(`\n📊 COMPARISON:`);
  console.log(`   ${comparison.comparison.isSmaller ? '✅' : '❌'} Output is ${comparison.comparison.isSmaller ? 'smaller' : 'larger'}`);
  console.log(`   Size difference: ${Math.abs(comparison.comparison.sizeDifference).toLocaleString()} characters`);
  console.log(`   Compression: ${comparison.comparison.compressionPercent}% ${comparison.comparison.compressionPercent > 0 ? 'smaller' : 'larger'}`);
  console.log(`   Point reduction: ${comparison.comparison.pointReduction}%`);
  console.log(`   Compression ratio: ${comparison.comparison.compressionRatio.toFixed(3)}:1`);
  
  if (comparison.comparison.isSmaller) {
    console.log(`\n🎉 The bezier output is more efficient!`);
  } else {
    console.log(`\n⚠️  The bezier output is larger than the input.`);
  }
  
  console.log("=".repeat(50));
}


/*
// Example usage with dense points
const densePointArrays = [
  // A dense curve with many closely spaced points
  [
    [1, 2], [1.1, 2.05], [1.2, 2.1], [1.3, 2.2], [1.4, 2.35],
    [1.5, 2.5], [1.6, 2.7], [1.8, 3.1], [2.0, 3.5], [2.2, 3.9],
    [2.5, 4.5], [3.0, 5.2], [3.5, 5.8], [4.0, 6.2], [4.5, 6.4],
    [5.0, 6.5]
  ],
  // Another dense curve
  [
    [10, 20], [10.2, 20.5], [10.4, 21.0], [10.6, 21.8], [10.8, 22.8],
    [11.0, 24.0], [11.5, 26.0], [12.0, 28.0], [13.0, 32.0], [15.0, 38.0],
    [18.0, 45.0], [22.0, 52.0], [27.0, 58.0], [35.0, 62.0], [45.0, 64.0],
    [50.0, 65.0]
  ]
];

// Test different smoothing approaches
console.log("=== Original (no smoothing) ===");
const originalResult = generateBezierCurvesWithSmoothing(densePointArrays, { enableSmoothing: false });
console.log("Original point count:", densePointArrays[0].length, "->", JSON.parse(originalResult)[0].length);

console.log("\n=== With smart smoothing (default) ===");
const smartResult = generateBezierCurvesWithSmoothing(densePointArrays);
console.log("Smart smoothed result:", smartResult);

console.log("\n=== With aggressive smoothing ===");
const aggressiveResult = generateBezierCurvesWithSmoothing(densePointArrays, {
  minDistance: 4.0,
  douglasEpsilon: 3.0,
  angleThreshold: 0.2
});
console.log("Aggressive smoothed result:", aggressiveResult);

console.log("\n=== Douglas-Peucker only ===");
const douglasOnly = generateBezierCurvesWithSmoothing(densePointArrays, {
  minDistance: 0,
  angleThreshold: 0,
  douglasEpsilon: 2.0,
  applyMovingAverage: false
});
console.log("Douglas-Peucker only result:", douglasOnly);

*/