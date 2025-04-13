function parseSvgPath(svgArr, scaleFactor) {
  let lastCoordinates = [];
  let pathArrays = [];
  let currentSubarray = [];

  let teller = 0;

  for (let i = 0; i < svgArr.length; i++) {
    for (let j = 0; j < svgArr[i].length; j++) {
      if (svgArr[i][j] === "M") {
        currentSubarray = [
          [svgArr[i][j + 1] * scaleFactor, svgArr[i][j + 2] * scaleFactor],
        ];
        pathArrays.push(currentSubarray);
        lastCoordinates = [
          svgArr[i][j + 1] * scaleFactor,
          svgArr[i][j + 2] * scaleFactor,
        ];
        j += 2;
      } else if (svgArr[i][j] === "C") {
        let x0 = lastCoordinates[0],
          y0 = lastCoordinates[1];
        let x1 = svgArr[i][j + 1] * scaleFactor,
          y1 = svgArr[i][j + 2] * scaleFactor;
        let x2 = svgArr[i][j + 3] * scaleFactor,
          y2 = svgArr[i][j + 4] * scaleFactor;
        let x3 = svgArr[i][j + 5] * scaleFactor,
          y3 = svgArr[i][j + 6] * scaleFactor;
        lastCoordinates = [x3, y3];

        // Calculate approximate length of segment
        const curveLength = Math.sqrt(
          Math.pow(x3 - x0, 2) + Math.pow(y3 - y0, 2)
        );

        // Determine number of segments
        const minimumSegments = 3;
        let segmentLength = 1;
        let segments = Math.ceil(curveLength / segmentLength);
        segments = Math.max(minimumSegments, segments);
        teller++;

        for (let k = 1; k <= segments; k++) {
          let t = k / segments;
          let a = (1 - t) ** 3;
          let b = 3 * t * (1 - t) ** 2;
          let c = 3 * t ** 2 * (1 - t);
          let d = t ** 3;
          let x = a * x0 + b * x1 + c * x2 + d * x3;
          let y = a * y0 + b * y1 + c * y2 + d * y3;
          currentSubarray.push([x, y]);
        }
        j += 6;
      } else if (svgArr[i][j] === "L") {
        // Line:
        // 1) Draw line from the last point to the start point of the line.
        // Fetches the two first coordinates for the line.
        currentSubarray.push([
          svgArr[i][j + 1] * scaleFactor,
          svgArr[i][j + 2] * scaleFactor,
        ]);
        // 2) Draw line to the endpoint of the line.
        currentSubarray.push([
          svgArr[i][j + 3] * scaleFactor,
          svgArr[i][j + 4] * scaleFactor,
        ]);
        lastCoordinates = [
          svgArr[i][j + 3] * scaleFactor,
          svgArr[i][j + 4] * scaleFactor,
        ];
        j += 4;
      }
    }
  }

  return pathArrays;
}

/**
 * Calculates the bounding box of an SVG path array.
 * @param {Array} svgPathArray - The SVG path array (e.g., [["M", x1, y1, "C", x2, y2, ...]]).
 * @returns {Object} An object containing the bounding box { minX, minY, maxX, maxY }.
 */
function calcBoundingBox(svgPathArray) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  svgPathArray.forEach((segment) => {
    for (let i = 1; i < segment.length; i += 2) {
      const x = segment[i];
      const y = segment[i + 1];

      if (typeof x === "number" && typeof y === "number") {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  });

  return [minX, minY, maxX, maxY];
}

/**
 * Sorts the svg curves based on minimizing travel distance from end of a line to start of the next.
 * @param {Array} lineArrays - The path array (e.g., [[[x1,y1],[x2,y2]...],[X1,Y1],[X2,Y2]...]).
 * @param {Array} boundingBox - Array containing the bounding box [x1,y1,x2,y2],
 * @returns {Array} sortedCurves An array containing the sorted curves.
 */
function sortPathCurves(lineArrays, boundingBox) {
  const sortedCurves = [];
  let minX = -Infinity;
  let maxX = Infinity;
  let minY = -Infinity;
  let maxY = Infinity;
  let startPoint = [boundingBox[0], boundingBox[1]];
  // 1) Scan through to find upper most left point
  lineArrays.forEach((curve) => {
    console.log(curve[0], curve[curve.length - 1]);
    if (curve[0][0] < startPoint[0][0]) {
      startPoint[0][0] = curve[0][0];
    }
  });
  // 2) Start from start point and find the natural "path" through the curves by scanning
  // the neighbors from each end point of a curve.
  return sortedCurves;
}
