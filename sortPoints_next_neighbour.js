function findNearestNeighborPath(points) {
  const output = [];
  let currentPoint = points[0];

  for (let i = 1; i < points.length; i++) {
    let nearestNeighbor = null;
    let minDistance = Infinity;

    for (let j = 0; j < points.length; j++) {
      if (points[j] === currentPoint || output.includes(points[j])) continue;

      const distance = Math.sqrt(
        Math.pow(points[j][0] - currentPoint[0], 2) +
          Math.pow(points[j][1] - currentPoint[1], 2)
      );

      if (distance < minDistance) {
        nearestNeighbor = points[j];
        minDistance = distance;
      }
    }

    output.push(nearestNeighbor);
    currentPoint = nearestNeighbor;
  }

  return output;
}

function findNearestNeighborPathImproved(points, maxDistanceThreshold = 30) {
  if (!points || points.length === 0) return [];

  const result = [];
  const visited = new Set();
  let currentLine = [];

  // Start with the first point
  let currentPoint = points[0];
  currentLine.push(currentPoint);
  visited.add(currentPoint);

  while (visited.size < points.length) {
    let nearestNeighbor = null;
    let minDistance = Infinity;

    // Find the nearest unvisited point
    for (let j = 0; j < points.length; j++) {
      const candidatePoint = points[j];

      // Skip if we've already visited this point
      if (visited.has(candidatePoint)) continue;

      const distanceToNext = Math.sqrt(
        Math.pow(candidatePoint[0] - currentPoint[0], 2) +
          Math.pow(candidatePoint[1] - currentPoint[1], 2)
      );

      if (distanceToNext < minDistance) {
        nearestNeighbor = candidatePoint;
        minDistance = distanceToNext;
      }
    }

    // If we found a nearest neighbor
    if (nearestNeighbor) {
      // Check if distance exceeds threshold - if so, start a new line
      if (minDistance > maxDistanceThreshold && currentLine.length > 0) {
        result.push([...currentLine]); // Add the current line to the result
        currentLine = [nearestNeighbor]; // Start a new line with this point
      } else {
        // Add to the current line
        currentLine.push(nearestNeighbor);
      }

      visited.add(nearestNeighbor);
      currentPoint = nearestNeighbor;
    } else {
      // All points have been visited
      break;
    }
  }

  // Don't forget to add the last line if it has points
  if (currentLine.length > 0) {
    result.push(currentLine);
  }

  return result;
}

function drawPoints(points, thresholdDistance = 10) {
  // Get the canvas element and its 2D context
  let canvas = document.getElementById("drawCanvas");
  let ctx = canvas.getContext("2d");

  // Begin a new path
  ctx.beginPath();

  // Move to the first point
  ctx.moveTo(points[0][0], points[0][1]);

  // Draw lines to each subsequent point, skipping those farther than the threshold
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= thresholdDistance) {
      ctx.lineTo(points[i][0], points[i][1]);
    } else {
      ctx.moveTo(points[i][0], points[i][1]);
    }
  }

  // Stroke the path, filling in the lines that were drawn
  ctx.stroke();
}

function drawPointsClaude(pointsArray) {
  /*
    Claude 3.7 edit.
    */
  // Get the canvas element and its 2D context
  let canvas = document.getElementById("drawCanvas");
  let ctx = canvas.getContext("2d");

  // Iterate over each line (each subarray of points)
  for (let lineIndex = 0; lineIndex < pointsArray.length; lineIndex++) {
    const points = pointsArray[lineIndex];

    // Skip empty lines
    if (!points || points.length === 0) continue;

    // Begin a new path for each line
    ctx.beginPath();
    ctx.strokeStyle = getColorForElement();

    // Move to the first point of this line
    ctx.moveTo(points[0][0], points[0][1]);
    //console.log(points[0][0], points[0][1]);

    // Draw lines to each subsequent point in this line
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }

    // Stroke the path for this line
    ctx.stroke();
  }
}

/*
const points = [
  [625.7748, 121.931],
  [626.6905, 129.5534],
  [626.8742, 137.1759],
  [586.3753, 144.7983],
  [667.3258, 144.7983],
  [577.6887, 152.4208],
  [675.4904, 152.4208],
  [571.4327, 160.0432],
  [681.3557, 160.0432],
  [566.7408, 167.6657],
  [685.5355, 167.6657],
  [563.2481, 175.2881],
  [688.6023, 175.2881],
  [560.9092, 182.9105],
  [690.7527, 182.9105],
  [559.9982, 190.533],
  [692.0473, 190.533],
  [559.8814, 198.1554],
  [692.3633, 198.1554],
  [560.3459, 205.7779],
  [691.666, 205.7779],
  [562.156, 213.4003],
  [689.864, 213.4003],
  [565.3688, 221.0228],
  [686.9788, 221.0228],
  [569.4206, 228.6452],
  [682.6889, 228.6452],
  [574.8784, 236.2677],
  [676.8968, 236.2677],
  [582.2841, 243.8901],
  [669.2376, 243.8901],
  [593.2609, 251.5126],
  [658.263, 251.5126],
  [625.5252, 259.135],
  [625.0353, 266.7575],
];

//const sortedPoints = findNearestNeighborPath(points);
//console.log(sortedPoints);

*/
