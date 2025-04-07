/**
 * Finds a path through the middle of areas defined by grid points
 * @param {Array<Array<number>>} points - Array of [x,y] coordinates
 * @returns {Array<Array<number>>} - Path points through the middle of areas
 */
function findMidBoundaryPath(points) {
  // Step 1: Analyze the grid structure
  const xSet = new Set();
  const ySet = new Set();
  const pointMap = {};

  // Build point map and collect unique x and y values
  points.forEach((point) => {
    const [x, y] = point;
    xSet.add(x);
    ySet.add(y);
    pointMap[`${x},${y}`] = true;
  });

  // Convert to sorted arrays
  const xValues = Array.from(xSet).sort((a, b) => a - b);
  const yValues = Array.from(ySet).sort((a, b) => a - b);

  // Step 2: Identify "inside" and "outside" regions
  // Find regions that are fully surrounded by points and regions that aren't
  const regions = [];

  // For each cell in the grid (space between grid points)
  for (let i = 0; i < xValues.length - 1; i++) {
    for (let j = 0; j < yValues.length - 1; j++) {
      // Calculate the center of this cell
      const centerX = (xValues[i] + xValues[i + 1]) / 2;
      const centerY = (yValues[j] + yValues[j + 1]) / 2;

      // Check if all four corners of this cell exist in the point map
      const topLeft = pointMap[`${xValues[i]},${yValues[j]}`];
      const topRight = pointMap[`${xValues[i + 1]},${yValues[j]}`];
      const bottomLeft = pointMap[`${xValues[i]},${yValues[j + 1]}`];
      const bottomRight = pointMap[`${xValues[i + 1]},${yValues[j + 1]}`];

      // If all four corners exist, this is an inside cell
      if (topLeft && topRight && bottomLeft && bottomRight) {
        regions.push({
          center: [centerX, centerY],
          type: "inside",
          corners: [
            [xValues[i], yValues[j]],
            [xValues[i + 1], yValues[j]],
            [xValues[i], yValues[j + 1]],
            [xValues[i + 1], yValues[j + 1]],
          ],
        });
      }
    }
  }

  // Step 3: Find boundary regions (regions that have both inside and outside neighbors)
  const boundaryRegions = [];

  regions.forEach((region) => {
    // Check neighboring cells in four directions
    const [centerX, centerY] = region.center;
    const cellWidth = xValues[1] - xValues[0]; // Assuming uniform grid
    const cellHeight = yValues[1] - yValues[0]; // Assuming uniform grid

    const neighbors = [
      [centerX + cellWidth, centerY], // Right
      [centerX - cellWidth, centerY], // Left
      [centerX, centerY + cellHeight], // Bottom
      [centerX, centerY - cellHeight], // Top
    ];

    // Check if any neighbor is outside
    let hasOutsideNeighbor = false;
    neighbors.forEach(([nx, ny]) => {
      // Find if this neighbor center corresponds to a region
      const neighborRegion = regions.find(
        (r) =>
          Math.abs(r.center[0] - nx) < 0.001 &&
          Math.abs(r.center[1] - ny) < 0.001
      );

      // If no region found at this neighbor position, it's an outside cell
      if (!neighborRegion) {
        hasOutsideNeighbor = true;
      }
    });

    // If this region has at least one outside neighbor, it's a boundary region
    if (hasOutsideNeighbor) {
      boundaryRegions.push(region);
    }
  });

  // Step 4: Find boundary edges
  const boundaryEdges = [];

  boundaryRegions.forEach((region) => {
    // For each corner point of the region
    region.corners.forEach((corner) => {
      // Check if this corner is part of only one or two regions (boundary point)
      const [x, y] = corner;

      // Count how many regions contain this corner
      let regionCount = 0;
      regions.forEach((r) => {
        if (r.corners.some((c) => c[0] === x && c[1] === y)) {
          regionCount++;
        }
      });

      // If this is a boundary point, add it
      if (regionCount <= 2) {
        if (!boundaryEdges.some((p) => p[0] === x && p[1] === y)) {
          boundaryEdges.push([x, y]);
        }
      }
    });
  });

  // Step 5: Group boundary edges into connected components
  const components = findConnectedComponents(boundaryEdges);

  // Step 6: For each component, find the midline path
  const allMidpoints = [];

  components.forEach((component) => {
    if (component.length < 3) return; // Skip very small components

    // Sort the component points by distance from start
    const sortedComponent = sortComponentPoints(component);

    // For segments of the sorted boundary, find midpoints
    const midpoints = [];
    const segmentSize = Math.max(2, Math.floor(sortedComponent.length / 10)); // Adjust density

    for (let i = 0; i < sortedComponent.length; i += segmentSize) {
      // Take a segment of the boundary
      const segmentEnd = Math.min(i + segmentSize, sortedComponent.length - 1);
      const midpoint = findMidpointForSegment(sortedComponent, i, segmentEnd);
      midpoints.push(midpoint);
    }

    allMidpoints.push(...midpoints);
  });

  // Step 7: Order all midpoints to form a continuous path
  const finalPath = orderMidpointsByProximity(allMidpoints);

  return finalPath;
}

/**
 * Finds connected components (groups of connected boundary edges)
 * @param {Array<Array<number>>} points - Boundary points
 * @returns {Array<Array<Array<number>>>} - Array of connected components
 */
function findConnectedComponents(points) {
  const visited = {};
  const components = [];

  points.forEach(([x, y]) => {
    const key = `${x},${y}`;
    if (!visited[key]) {
      // Start a new component
      const component = [];
      const queue = [[x, y]];
      visited[key] = true;

      while (queue.length > 0) {
        const [cx, cy] = queue.shift();
        component.push([cx, cy]);

        // Check nearby points (using a distance threshold)
        const threshold = 30; // Adjust based on your grid spacing

        points.forEach(([nx, ny]) => {
          const nKey = `${nx},${ny}`;
          if (!visited[nKey]) {
            const dist = Math.sqrt(Math.pow(cx - nx, 2) + Math.pow(cy - ny, 2));
            if (dist <= threshold) {
              visited[nKey] = true;
              queue.push([nx, ny]);
            }
          }
        });
      }

      components.push(component);
    }
  });

  return components;
}

/**
 * Sorts boundary points to form a continuous boundary
 * @param {Array<Array<number>>} points - Boundary points
 * @returns {Array<Array<number>>} - Sorted boundary points
 */
function sortComponentPoints(points) {
  if (points.length <= 1) return points;

  const result = [points[0]];
  const remaining = [...points.slice(1)];

  while (remaining.length > 0) {
    const current = result[result.length - 1];

    // Find closest remaining point
    let closestIdx = 0;
    let closestDist = distance(current, remaining[0]);

    for (let i = 1; i < remaining.length; i++) {
      const dist = distance(current, remaining[i]);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }

    // Add closest point to result and remove from remaining
    result.push(remaining[closestIdx]);
    remaining.splice(closestIdx, 1);
  }

  return result;
}

/**
 * Finds a midpoint for a segment of boundary points
 * @param {Array<Array<number>>} sortedPoints - Sorted boundary points
 * @param {number} startIdx - Start index of segment
 * @param {number} endIdx - End index of segment
 * @returns {Array<number>} - Midpoint
 */
function findMidpointForSegment(sortedPoints, startIdx, endIdx) {
  // Get point in the middle of the segment
  const midIdx = Math.floor((startIdx + endIdx) / 2);
  const point = sortedPoints[midIdx];

  // Calculate "inward" direction (perpendicular to boundary)
  // For simplicity, we'll just take the midpoint of all points in this segment
  const avgX =
    sortedPoints.slice(startIdx, endIdx + 1).reduce((sum, p) => sum + p[0], 0) /
    (endIdx - startIdx + 1);
  const avgY =
    sortedPoints.slice(startIdx, endIdx + 1).reduce((sum, p) => sum + p[1], 0) /
    (endIdx - startIdx + 1);

  // Calculate midpoint (slightly inward from boundary)
  return [(point[0] + avgX) / 2, (point[1] + avgY) / 2];
}

/**
 * Orders midpoints to form a continuous path
 * @param {Array<Array<number>>} midpoints - Unordered midpoints
 * @returns {Array<Array<number>>} - Ordered path
 */
function orderMidpointsByProximity(midpoints) {
  if (midpoints.length <= 1) return midpoints;

  const result = [midpoints[0]];
  const remaining = [...midpoints.slice(1)];

  while (remaining.length > 0) {
    const current = result[result.length - 1];

    // Find closest remaining point
    let closestIdx = 0;
    let closestDist = distance(current, remaining[0]);

    for (let i = 1; i < remaining.length; i++) {
      const dist = distance(current, remaining[i]);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }

    // Add closest point to result and remove from remaining
    result.push(remaining[closestIdx]);
    remaining.splice(closestIdx, 1);
  }

  return result;
}

/**
 * Calculates Euclidean distance between two points
 * @param {Array<number>} p1 - First point [x,y]
 * @param {Array<number>} p2 - Second point [x,y]
 * @returns {number} - Distance
 */
function distance(p1, p2) {
  return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
}

/**
 * Alternative approach: skeleton-based midpath finding
 * This might work better if the above approach fails
 * @param {Array<Array<number>>} points - Array of [x,y] coordinates
 * @returns {Array<Array<number>>} - Path points through the middle
 */
function findMidBoundaryPathAlternative(points) {
  // Extract min/max coordinates to define grid bounds
  const xValues = points.map((p) => p[0]);
  const yValues = points.map((p) => p[1]);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  // Create point lookup map
  const pointMap = {};
  points.forEach(([x, y]) => {
    pointMap[`${x},${y}`] = true;
  });

  // Find all edges (transitions between filled and empty)
  const edges = [];

  points.forEach(([x, y]) => {
    // Check four cardinal directions
    const neighbors = [
      [x + 20, y],
      [x - 20, y],
      [x, y + 20],
      [x, y - 20], // Assuming grid spacing of ~20
    ];

    // If any cardinal neighbor is missing, this is an edge
    const isEdge = neighbors.some(([nx, ny]) => !pointMap[`${nx},${ny}`]);

    if (isEdge) {
      edges.push([x, y]);
    }
  });

  // Calculate convex hull of all points (to help with orientation)
  const hull = calculateConvexHull(points);

  // Calculate the centroid of the shape
  const centroidX = points.reduce((sum, p) => sum + p[0], 0) / points.length;
  const centroidY = points.reduce((sum, p) => sum + p[1], 0) / points.length;
  const centroid = [centroidX, centroidY];

  // Sort edges by angle from centroid
  const sortedEdges = edges.sort((a, b) => {
    const angleA = Math.atan2(a[1] - centroidY, a[0] - centroidX);
    const angleB = Math.atan2(b[1] - centroidY, b[0] - centroidX);
    return angleA - angleB;
  });

  // Group edges into segments by proximity
  const segments = [];
  let currentSegment = [sortedEdges[0]];

  for (let i = 1; i < sortedEdges.length; i++) {
    const prev = sortedEdges[i - 1];
    const curr = sortedEdges[i];
    const dist = distance(prev, curr);

    if (dist < 30) {
      // Adjust threshold based on your grid spacing
      currentSegment.push(curr);
    } else {
      segments.push(currentSegment);
      currentSegment = [curr];
    }
  }

  // Add the last segment
  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  // For each segment, calculate midpoints
  const midpoints = [];

  segments.forEach((segment) => {
    // Skip very small segments
    if (segment.length < 3) return;

    // Calculate segment centroid
    const segCentroidX =
      segment.reduce((sum, p) => sum + p[0], 0) / segment.length;
    const segCentroidY =
      segment.reduce((sum, p) => sum + p[1], 0) / segment.length;

    // Calculate vector from overall centroid to segment centroid
    const vectorX = segCentroidX - centroidX;
    const vectorY = segCentroidY - centroidY;
    const vectorLength = Math.sqrt(vectorX * vectorX + vectorY * vectorY);

    // Calculate midpoint (slightly inward from boundary)
    const midpoint = [
      segCentroidX - (vectorX / vectorLength) * 10, // Move 10 units inward
      segCentroidY - (vectorY / vectorLength) * 10,
    ];

    midpoints.push(midpoint);
  });

  // Order midpoints to form a continuous path
  const path = orderMidpointsByProximity(midpoints);

  return path;
}

/**
 * Calculate convex hull using Graham scan algorithm
 * @param {Array<Array<number>>} points - Input points
 * @returns {Array<Array<number>>} - Convex hull points
 */
function calculateConvexHull(points) {
  // Find lowest point (with lowest y-coordinate)
  let pivot = points[0];
  for (let i = 1; i < points.length; i++) {
    if (
      points[i][1] < pivot[1] ||
      (points[i][1] === pivot[1] && points[i][0] < pivot[0])
    ) {
      pivot = points[i];
    }
  }

  // Sort points by polar angle with respect to pivot
  const sortedPoints = [...points]
    .filter((p) => p !== pivot)
    .sort((a, b) => {
      const angleA = Math.atan2(a[1] - pivot[1], a[0] - pivot[0]);
      const angleB = Math.atan2(b[1] - pivot[1], b[0] - pivot[0]);

      if (angleA === angleB) {
        // If same angle, sort by distance from pivot
        const distA = distance(pivot, a);
        const distB = distance(pivot, b);
        return distA - distB;
      }

      return angleA - angleB;
    });

  // Initialize hull with pivot and first two points
  const hull = [pivot, sortedPoints[0]];

  // Build hull
  for (let i = 1; i < sortedPoints.length; i++) {
    while (
      hull.length > 1 &&
      !isLeftTurn(hull[hull.length - 2], hull[hull.length - 1], sortedPoints[i])
    ) {
      hull.pop();
    }
    hull.push(sortedPoints[i]);
  }

  return hull;
}

/**
 * Determines if three points make a left turn
 * @param {Array<number>} p1 - First point
 * @param {Array<number>} p2 - Second point
 * @param {Array<number>} p3 - Third point
 * @returns {boolean} - True if left turn
 */
function isLeftTurn(p1, p2, p3) {
  return (
    (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p2[1] - p1[1]) * (p3[0] - p1[0]) > 0
  );
}

// Export both implementations
// Try the main one first, fall back to alternative if needed
function findMidpath(points) {
  const result = findMidBoundaryPath(points);
  if (result.length === 0) {
    return findMidBoundaryPathAlternative(points);
  }
  return result;
}
