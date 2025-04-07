/**
 * Finds an approximate middle path through a grid of points using a grid-based approach.
 * @param {Array} points - Array of [x, y] points.
 * @param {number} gridSize - Size of the grid cells to group points (default: 30).
 * @returns {Array} Array of [x, y] points representing the middle path.
 */
function findMiddlePath(points, gridSize = 30) {
  if (!points || points.length === 0) {
    return [];
  }

  // Create a map to group points into grid cells
  const grid = new Map();

  points.forEach(([x, y]) => {
    const gridX = Math.floor(x / gridSize);
    const gridY = Math.floor(y / gridSize);
    const key = `${gridX},${gridY}`;

    if (!grid.has(key)) {
      grid.set(key, []);
    }
    grid.get(key).push([x, y]);
  });

  // Calculate the centroid (average point) of each grid cell
  const centroids = [];
  grid.forEach((group) => {
    const sumX = group.reduce((sum, [x]) => sum + x, 0);
    const sumY = group.reduce((sum, [, y]) => sum + y, 0);
    centroids.push([sumX / group.length, sumY / group.length]);
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

/*
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
*/
