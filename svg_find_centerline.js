/**
 * Finds an approximate middle path through a grid of points.
 * @param {Array} points - Array of [x, y] points.
 * @param {number} proximityThreshold - Maximum distance to group points together (default: 30).
 * @returns {Array} Array of [x, y] points representing the middle path.
 */
function findMiddlePath(points, proximityThreshold = 30) {
  if (!points || points.length === 0) {
    return [];
  }

  // Sort points by x-coordinate for horizontal grouping
  const sortedByX = [...points].sort((a, b) => a[0] - b[0]);

  // Group points by proximity along the x-axis
  const groupedPoints = [];
  let currentGroup = [sortedByX[0]];

  for (let i = 1; i < sortedByX.length; i++) {
    const [prevX, prevY] = sortedByX[i - 1];
    const [currX, currY] = sortedByX[i];

    if (
      Math.sqrt(Math.pow(currX - prevX, 2) + Math.pow(currY - prevY, 2)) <=
      proximityThreshold
    ) {
      currentGroup.push([currX, currY]);
    } else {
      groupedPoints.push(currentGroup);
      currentGroup = [[currX, currY]];
    }
  }
  groupedPoints.push(currentGroup);

  // Calculate the centroid (average point) of each group
  const centroids = groupedPoints.map((group) => {
    const sumX = group.reduce((sum, [x]) => sum + x, 0);
    const sumY = group.reduce((sum, [, y]) => sum + y, 0);
    return [sumX / group.length, sumY / group.length];
  });

  // Sort centroids to create a continuous path
  return orderPointsForPath(centroids);
}

/**
 * Orders points to create a more continuous path.
 * @param {Array} points - Array of [x, y] points to order.
 * @returns {Array} Ordered array of points.
 */
function orderPointsForPath(points) {
  if (points.length <= 1) return points;

  const result = [points[0]];
  const remaining = new Set(points.slice(1));

  while (remaining.size > 0) {
    const current = result[result.length - 1];
    let nearest = null;
    let minDist = Infinity;

    // Find the nearest unvisited point
    for (const point of remaining) {
      const dist = Math.sqrt(
        Math.pow(point[0] - current[0], 2) + Math.pow(point[1] - current[1], 2)
      );
      if (dist < minDist) {
        minDist = dist;
        nearest = point;
      }
    }

    if (nearest) {
      result.push(nearest);
      remaining.delete(nearest);
    } else {
      break;
    }
  }

  return result;
}

// Example usage:
const points = [
  [10, 10],
  [12, 12],
  [15, 15],
  [50, 50],
  [52, 52],
  [55, 55],
  [100, 100],
  [102, 102],
  [105, 105],
];
const middlePath = findMiddlePath(points, 20);
console.log(middlePath);
