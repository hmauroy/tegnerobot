/**
 * Convert SVG path-formatted Bézier curves to centerlines
 * @param {Array} pathData - Array of arrays containing path commands and coordinates
 * @return {Array} Array of centerline paths
 */
function convertToCenterlines(pathData) {
  const centerlines = [];

  // Process each path separately
  for (const path of pathData) {
    const centerlinePath = extractCenterline(path);
    centerlines.push(centerlinePath);
  }

  return centerlines;
}

/**
 * Extract centerline from a single path
 * @param {Array} path - Array containing path commands and coordinates
 * @return {Array} Centerline points
 */
function extractCenterline(path) {
  const centerlinePoints = [];
  const segments = [];
  let currentPoint = null;

  // First pass: Parse the path into segments
  for (let i = 0; i < path.length; i++) {
    const cmd = path[i];

    if (cmd === "M") {
      currentPoint = [parseFloat(path[i + 1]), parseFloat(path[i + 2])];
      i += 2;
    } else if (cmd === "L") {
      const endPoint = [parseFloat(path[i + 1]), parseFloat(path[i + 2])];
      segments.push({
        type: "line",
        start: [...currentPoint],
        end: endPoint,
      });
      currentPoint = endPoint;
      i += 2;
    } else if (cmd === "C") {
      const controlPoint1 = [parseFloat(path[i + 1]), parseFloat(path[i + 2])];
      const controlPoint2 = [parseFloat(path[i + 3]), parseFloat(path[i + 4])];
      const endPoint = [parseFloat(path[i + 5]), parseFloat(path[i + 6])];

      segments.push({
        type: "bezier",
        start: [...currentPoint],
        cp1: controlPoint1,
        cp2: controlPoint2,
        end: endPoint,
      });

      currentPoint = endPoint;
      i += 6;
    }
  }

  // If the path has very few segments, it might be too thin to calculate a meaningful centerline
  if (segments.length < 2) {
    return simplifyPath(segments);
  }

  // Group segments into opposite pairs
  const pairs = pairOppositeSegments(segments);

  // Second pass: Calculate centerline points for each pair
  for (const pair of pairs) {
    if (pair.length === 2) {
      // We have a pair of segments, calculate centerline points
      const centerPoints = calculateCenterPoints(pair[0], pair[1]);
      centerlinePoints.push(...centerPoints);
    } else {
      // Single segment, add its midpoint
      const segment = pair[0];
      if (segment.type === "line") {
        centerlinePoints.push(midpoint(segment.start, segment.end));
      } else {
        // For bezier, add a point at t=0.5
        centerlinePoints.push(
          evaluateBezier(
            segment.start,
            segment.cp1,
            segment.cp2,
            segment.end,
            0.5
          )
        );
      }
    }
  }

  // Smooth and simplify the centerline
  return smoothCenterline(centerlinePoints);
}

/**
 * Pair opposite segments based on their orientation and proximity
 * @param {Array} segments - Array of path segments
 * @return {Array} Array of paired segments
 */
function pairOppositeSegments(segments) {
  const pairs = [];
  const used = new Set();

  for (let i = 0; i < segments.length; i++) {
    if (used.has(i)) continue;

    const segment1 = segments[i];
    let bestMatch = -1;
    let bestScore = Infinity;

    // Find the most opposing segment
    for (let j = 0; j < segments.length; j++) {
      if (i === j || used.has(j)) continue;

      const segment2 = segments[j];
      const score = calculateOppositionScore(segment1, segment2);

      if (score < bestScore) {
        bestScore = score;
        bestMatch = j;
      }
    }

    if (bestMatch !== -1 && bestScore < 100) {
      // Found a good match
      pairs.push([segment1, segments[bestMatch]]);
      used.add(i);
      used.add(bestMatch);
    } else {
      // No good match found, use the segment alone
      pairs.push([segment1]);
      used.add(i);
    }
  }

  return pairs;
}

/**
 * Calculate a score indicating how opposing two segments are
 * Lower score means better opposition
 * @param {Object} segment1 - First segment
 * @param {Object} segment2 - Second segment
 * @return {number} Opposition score
 */
function calculateOppositionScore(segment1, segment2) {
  // For simplicity, we'll just use the midpoints and directions of the segments
  let mid1, mid2, dir1, dir2;

  if (segment1.type === "line") {
    mid1 = midpoint(segment1.start, segment1.end);
    dir1 = [
      segment1.end[0] - segment1.start[0],
      segment1.end[1] - segment1.start[1],
    ];
  } else {
    // For bezier, use point at t=0.5 and tangent
    mid1 = evaluateBezier(
      segment1.start,
      segment1.cp1,
      segment1.cp2,
      segment1.end,
      0.5
    );
    const tangent = evaluateBezierTangent(
      segment1.start,
      segment1.cp1,
      segment1.cp2,
      segment1.end,
      0.5
    );
    dir1 = tangent;
  }

  if (segment2.type === "line") {
    mid2 = midpoint(segment2.start, segment2.end);
    dir2 = [
      segment2.end[0] - segment2.start[0],
      segment2.end[1] - segment2.start[1],
    ];
  } else {
    mid2 = evaluateBezier(
      segment2.start,
      segment2.cp1,
      segment2.cp2,
      segment2.end,
      0.5
    );
    const tangent = evaluateBezierTangent(
      segment2.start,
      segment2.cp1,
      segment2.cp2,
      segment2.end,
      0.5
    );
    dir2 = tangent;
  }

  // Normalize directions
  const len1 = Math.sqrt(dir1[0] * dir1[0] + dir1[1] * dir1[1]);
  const len2 = Math.sqrt(dir2[0] * dir2[0] + dir2[1] * dir2[1]);

  if (len1 > 0) {
    dir1[0] /= len1;
    dir1[1] /= len1;
  }

  if (len2 > 0) {
    dir2[0] /= len2;
    dir2[1] /= len2;
  }

  // Calculate dot product - opposite directions will give negative values
  // and similar directions will give positive values
  const dotProduct = dir1[0] * dir2[0] + dir1[1] * dir2[1];

  // Calculate distance between midpoints
  const distance = Math.sqrt(
    Math.pow(mid2[0] - mid1[0], 2) + Math.pow(mid2[1] - mid1[1], 2)
  );

  // Combine direction and distance factors
  // We want opposing directions (dotProduct near -1) and close midpoints
  return (dotProduct + 1) * 50 + distance;
}

/**
 * Calculate centerline points between two segments
 * @param {Object} segment1 - First segment
 * @param {Object} segment2 - Second segment
 * @return {Array} Array of centerline points
 */
function calculateCenterPoints(segment1, segment2) {
  const points = [];
  const steps = 10; // Number of sample points along the segments

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let point1, point2;

    if (segment1.type === "line") {
      point1 = [
        segment1.start[0] + t * (segment1.end[0] - segment1.start[0]),
        segment1.start[1] + t * (segment1.end[1] - segment1.start[1]),
      ];
    } else {
      point1 = evaluateBezier(
        segment1.start,
        segment1.cp1,
        segment1.cp2,
        segment1.end,
        t
      );
    }

    if (segment2.type === "line") {
      point2 = [
        segment2.start[0] + t * (segment2.end[0] - segment2.start[0]),
        segment2.start[1] + t * (segment2.end[1] - segment2.start[1]),
      ];
    } else {
      point2 = evaluateBezier(
        segment2.start,
        segment2.cp1,
        segment2.cp2,
        segment2.end,
        t
      );
    }

    // Calculate midpoint between the two points
    points.push(midpoint(point1, point2));
  }

  return points;
}

/**
 * Calculate midpoint between two points
 * @param {Array} point1 - First point [x, y]
 * @param {Array} point2 - Second point [x, y]
 * @return {Array} Midpoint [x, y]
 */
function midpoint(point1, point2) {
  return [(point1[0] + point2[0]) / 2, (point1[1] + point2[1]) / 2];
}

/**
 * Evaluate cubic Bézier curve at parameter t
 * @param {Array} p0 - Start point [x, y]
 * @param {Array} p1 - Control point 1 [x, y]
 * @param {Array} p2 - Control point 2 [x, y]
 * @param {Array} p3 - End point [x, y]
 * @param {number} t - Parameter value (0 to 1)
 * @return {Array} Point on curve at parameter t
 */
function evaluateBezier(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  return [
    mt3 * p0[0] + 3 * mt2 * t * p1[0] + 3 * mt * t2 * p2[0] + t3 * p3[0],
    mt3 * p0[1] + 3 * mt2 * t * p1[1] + 3 * mt * t2 * p2[1] + t3 * p3[1],
  ];
}

/**
 * Evaluate the tangent vector of cubic Bézier curve at parameter t
 * @param {Array} p0 - Start point [x, y]
 * @param {Array} p1 - Control point 1 [x, y]
 * @param {Array} p2 - Control point 2 [x, y]
 * @param {Array} p3 - End point [x, y]
 * @param {number} t - Parameter value (0 to 1)
 * @return {Array} Tangent vector at parameter t
 */
function evaluateBezierTangent(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  return [
    3 * mt2 * (p1[0] - p0[0]) +
      6 * mt * t * (p2[0] - p1[0]) +
      3 * t2 * (p3[0] - p2[0]),
    3 * mt2 * (p1[1] - p0[1]) +
      6 * mt * t * (p2[1] - p1[1]) +
      3 * t2 * (p3[1] - p2[1]),
  ];
}

/**
 * Simplify a path with just midpoints when we don't have enough data for proper centerline
 * @param {Array} segments - Path segments
 * @return {Array} Array of simplified centerline points
 */
function simplifyPath(segments) {
  const points = [];

  for (const segment of segments) {
    if (segment.type === "line") {
      points.push(midpoint(segment.start, segment.end));
    } else {
      // For bezier, sample a few points
      for (let t = 0; t <= 1; t += 0.25) {
        points.push(
          evaluateBezier(
            segment.start,
            segment.cp1,
            segment.cp2,
            segment.end,
            t
          )
        );
      }
    }
  }

  return points;
}

/**
 * Smooth and simplify centerline by removing redundant points
 * @param {Array} points - Array of centerline points
 * @return {Array} Smoothed centerline points
 */
function smoothCenterline(points) {
  if (points.length <= 2) return points;

  const smoothed = [points[0]];
  const epsilon = 0.5; // Simplification threshold

  for (let i = 1; i < points.length - 1; i++) {
    const prev = smoothed[smoothed.length - 1];
    const curr = points[i];
    const next = points[i + 1];

    // Check if current point is needed or can be skipped
    const d1 = Math.sqrt(
      Math.pow(curr[0] - prev[0], 2) + Math.pow(curr[1] - prev[1], 2)
    );
    const d2 = Math.sqrt(
      Math.pow(next[0] - curr[0], 2) + Math.pow(next[1] - curr[1], 2)
    );

    // If point is too close to previous point or creates a very sharp angle, skip it
    if (d1 > epsilon || d2 > epsilon) {
      smoothed.push(curr);
    }
  }

  smoothed.push(points[points.length - 1]);
  return smoothed;
}

/**
 * Parse SVG path data into a format we can use
 * @param {string} svgPathData - SVG path data string
 * @return {Array} Array of paths, each containing commands and coordinates
 */
function parseSVGPathData(svgPathData) {
  try {
    return JSON.parse(svgPathData);
  } catch (e) {
    console.error("Failed to parse SVG path data:", e);
    return [];
  }
}

/**
 * Convert centerline points to SVG path format
 * @param {Array} centerlines - Array of centerline points
 * @return {Array} Array of SVG path strings
 */
function centerlinesToSVGPaths(centerlines) {
  return centerlines.map((points) => {
    if (points.length === 0) return "";

    let pathString = `M${points[0][0]},${points[0][1]}`;

    for (let i = 1; i < points.length; i++) {
      pathString += ` L${points[i][0]},${points[i][1]}`;
    }

    return pathString;
  });
}

/**
 * Main function to process the data and get centerlines
 * @param {string} inputData - SVG path data string
 * @return {Array} Array of SVG path strings representing centerlines
 */
function processBezierAreas(inputData) {
  const pathData = parseSVGPathData(inputData);
  const centerlines = convertToCenterlines(pathData);
  return centerlinesToSVGPaths(centerlines);
}

// Example usage
const inputData =
  '[["M",18.1,0.3,"C",18.1,0.5,18.2,1.1,18.3,1.6,"C",18.4,2.1,18.5,3,18.6,3.5,"C",18.7,4,18.7,4.5,18.7,4.6,"C",18.6,4.7,18.1,4.9,17.6,5.1,"C",16,5.6,14.8,6.3,13.4,7.6,"C",10.4,10.5,8.4,14.7,7,21.4,"C",6.7,22.8,6.4,24.7,6.3,27,"C",6.2,28.4,6.1,29.7,6.1,29.8,"C",6,30,5.4,30,3.5,30,"C",2.1,30,0.7,30,0.5,30.1,"C",0,30.2,0,30.2,0,31.1,"L",0,32.1,3,32.1,"L",6.1,32.1,6.2,33.8,"C",6.3,35.8,6.7,39.4,6.9,40.2,"C",7,40.6,7.1,41.3,7.2,41.8,"C",8.6,48.6,11.4,54.6,14.8,58.1,"C",16.9,60.2,18.8,61.2,21.4,61.5,"C",22.1,61.7,23.4,61.8,24.2,62,"L",25.8,62.2,27.2,64.9,"C",29.2,68.7,28.9,68.3,30.2,68.3,"C",30.9,68.3,31.4,68.3,31.4,68.2,"C",31.4,68.2,31,67.5,30.5,66.6,"C",29.4,64.9,28.4,62.8,28.5,62.7,"C",28.5,62.7,29.3,62.7,30.2,62.8,"C",32.2,63,33.3,62.9,34.8,62.1,"C",39.1,60.1,42.4,54.9,44.1,47.6,"C",45,43.9,45.3,42.2,45.6,38.1,"C",45.8,34.3,45.4,28.5,44.8,25.2,"C",44.7,24.7,44.5,24,44.4,23.5,"C",43.2,17.5,41,12,38.1,8.2,"C",35.6,4.8,32.7,2.8,29.5,2.4,"C",28.3,2.3,28.1,2.3,26.4,2.7,"C",25.4,2.9,23.9,3.3,23.1,3.5,"C",22.3,3.7,21.7,3.9,21.6,3.8,"C",21.6,3.8,22.1,1.3,22.4,0.3,"C",22.5,0,22.3,0,20.2,0,"L",18,0,18.1,0.3]]';

// Uncomment to run an example
// const centerlinePaths = processBezierAreas(inputData);
// console.log(centerlinePaths);
