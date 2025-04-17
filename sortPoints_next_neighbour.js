/*
Claude 3.7 is main author of this function.
Henrik Mauroy has a few edits.
*/
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
        if (calcLength(currentLine) > 5) {
          result.push([...currentLine]); // Add the current line to the result
        } else {
          // The line is discarded because it is too short.
        }
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
    // Check if the line is very short, then it's a turd and should be discarded.
    if (calcLength(currentLine) > 5) {
      result.push(currentLine);
    }
  }

  return result;
}

function calcLength(line) {
  let length = 0;
  let currentPoint = line[0];
  function distance(a, b) {
    return Math.sqrt(
      (a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1])
    );
  }
  line.forEach((point) => {
    length += distance(currentPoint, point);
    currentPoint = point;
  });
  return length;
}

/**
 * Sorts the svg curves based on minimizing travel distance from end of a line to start of the next.
 * Author: Henrik C. Mauroy
 * @param {Array} lineArrays - The path array (3D-array: [[[x1,y1],[x2,y2]...],[X1,Y1],[X2,Y2]...]).
 * @param {Array} boundingBox - Array containing the bounding box [x1,y1,x2,y2],
 * @param {Object} ctx - Handle to the canvas.
 * @returns {Array} sortedCurves An array containing the sorted curves.
 */
function sortPathCurves(lineArrays, boundingBox, ctx, createStartpoints) {
  const sortedCurves = [];
  let minDist = calcDistance([boundingBox[2], boundingBox[3]]);
  let startPoint = [boundingBox[2], boundingBox[3]]; // Lower right point of boundingbox.
  let radius = 3;
  let startIndex = 0;
  let curve;
  ctx.fillStyle = "purple";
  // 1) Scan through to find point closest to (0,0), shortes distance to travel from the beginning.
  for (let i = 0; i < lineArrays.length; i++) {
    curve = lineArrays[i];
    if (createStartpoints) {
      ctx.beginPath();
      ctx.arc(curve[0][0], curve[0][1], radius, 0, 2 * Math.PI);
      ctx.fill();
    }

    if (calcDistance(curve[0]) <= minDist) {
      minDist = calcDistance(curve[0]);
      startPoint = curve[0];
      startIndex = i;
    }
  }
  if (createStartpoints) {
    ctx.fillStyle = "red";
    radius = 5;
    ctx.beginPath();
    ctx.arc(startPoint[0], startPoint[1], radius, 0, 2 * Math.PI);
    ctx.fill();
  }

  // 2) Start from start point and find the natural "path" through the curves by scanning
  // the neighbors from each end point of a curve.
  // Picks the starting curve
  sortedCurves.push(lineArrays.splice(startIndex, 1));
  // Search for next curve
  let idx = 0;
  minDist = calcDistance([boundingBox[2], boundingBox[3]]);
  while (lineArrays.length > 0) {
    curve = sortedCurves[sortedCurves.length - 1];
    // Checks distance from last point in current curve and start points of the rest of the curves.
    console.log(curve[curve.length - 1][0]);
    console.log(lineArrays[idx][0]);
    if (
      calcDistancePoints(curve[curve.length - 1][0], lineArrays[idx][0]) <=
      minDist
    ) {
      minDist = calcDistancePoints(curve[curve.length - 1], lineArrays[idx][0]);
      sortedCurves.push(lineArrays.splice(idx, 1));
      idx = -1;
    }
    idx++;
  }
  console.log("sortedCurves:", sortedCurves);
  return sortedCurves;
}

/**
 * Calculates length of point vector startin in origo.
 * @param {Array} point - End point
 * @returns {float} returns distance.
 */
function calcDistance(point) {
  return Math.sqrt(point[0] * point[0] + point[1] * point[1]);
}

/**
 * Calculates Euclidian distance between two points.
 * @param {Array} a - First point
 * @param {Array} b - Second point
 * @returns {float} returns distance.
 */
function calcDistancePoints(a, b) {
  return Math.sqrt(
    (a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1]) * (a[1] - b[1])
  );
}

function drawSinglePoint(point, radius = 3, color = "maroon") {
  const x = point[0];
  const y = point[1];
  // Get the canvas and context
  const canvas = document.getElementById("drawCanvas");
  const ctx = canvas.getContext("2d");
  ctx.beginPath();
  ctx.moveTo(point[0], point[1]);
  ctx.fillStyle = color;
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
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
