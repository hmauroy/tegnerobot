// Function to compute a point on a cubic Bézier curve
function bezierPoint(t, p0, p1, p2, p3) {
  let x =
    Math.pow(1 - t, 3) * p0[0] +
    3 * Math.pow(1 - t, 2) * t * p1[0] +
    3 * (1 - t) * Math.pow(t, 2) * p2[0] +
    Math.pow(t, 3) * p3[0];

  let y =
    Math.pow(1 - t, 3) * p0[1] +
    3 * Math.pow(1 - t, 2) * t * p1[1] +
    3 * (1 - t) * Math.pow(t, 2) * p2[1] +
    Math.pow(t, 3) * p3[1];

  return [x, y];
}

// Function to generate points along a cubic Bézier curve
function generateBezierPoints(p0, p1, p2, p3, numPoints = 20) {
  let points = [];
  for (let i = 0; i <= numPoints; i++) {
    let t = i / numPoints;
    points.push(bezierPoint(t, p0, p1, p2, p3));
  }
  return points;
}

// Function to parse the SVG path data
function parseSvgPath(data) {
  let points = [];
  let currentPoint = null;

  data.forEach((segment) => {
    console.log(segment);
    let type = segment[0];
    if (type === "M") {
      currentPoint = [segment[1], segment[2]];
    } else if (type === "C") {
      let p0 = currentPoint;
      let p1 = [segment[1], segment[2]];
      let p2 = [segment[3], segment[4]];
      let p3 = [segment[5], segment[6]];
      points.push(...generateBezierPoints(p0, p1, p2, p3));
      currentPoint = p3;
    }
  });

  return points;
}

// Function to compute the centerline by pairing opposing points
function computeCenterline(points) {
  let centerline = [];

  while (points.length > 1) {
    let minDist = Infinity;
    let pair = [];

    // Find the closest pair of points
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        let dx = points[i][0] - points[j][0];
        let dy = points[i][1] - points[j][1];
        let dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDist) {
          minDist = dist;
          pair = [i, j];
        }
      }
    }

    // Compute midpoint and add to centerline
    let midpoint = [
      (points[pair[0]][0] + points[pair[1]][0]) / 2,
      (points[pair[0]][1] + points[pair[1]][1]) / 2,
    ];
    centerline.push(midpoint);

    // Remove paired points
    points.splice(Math.max(pair[0], pair[1]), 1);
    points.splice(Math.min(pair[0], pair[1]), 1);
  }

  return centerline;
}

// Example SVG path data
let svgData = [
  [
    "M",
    46,
    2.8,
    "C",
    41.1,
    3,
    36,
    4.2,
    31.2,
    6.2,
    "C",
    31,
    6.2,
    30.1,
    6.6,
    29.2,
    7.1,
    "C",
    23.2,
    9.9,
    18.4,
    13.6,
    13.8,
    18.8,
    "C",
    11.4,
    21.5,
    8.3,
    26.6,
    6.8,
    30,
    "C",
    6.5,
    30.7,
    6.2,
    31.5,
    6.1,
    31.8,
    "C",
    5.5,
    33.2,
    4.5,
    36.5,
    4,
    38.8,
    "C",
    3.3,
    42.6,
    3.1,
    44.5,
    3.1,
    48.3,
    "C",
    3.1,
    53.3,
    3.7,
    57.2,
    5.1,
    61.9,
    "C",
    6.7,
    67.3,
    10,
    73.3,
    13.5,
    77.5,
    "C",
    14.1,
    78.1,
    17.1,
    81.3,
    17.3,
    81.5,
    "C",
    17.4,
    81.5,
    18,
    82.1,
    18.7,
    82.7,
    "C",
    25.5,
    88.7,
    33.8,
    92.4,
    43.1,
    93.5,
    "C",
    48.7,
    94.3,
    55.7,
    93.7,
    60.8,
    92.2,
    "C",
    61.5,
    92,
    62.3,
    91.8,
    62.5,
    91.7,
    "C",
    63,
    91.6,
    63.4,
    91.4,
    63.9,
    91.2,
    "C",
    64.1,
    91.2,
    64.8,
    90.9,
    65.5,
    90.6,
    "C",
    67.2,
    90,
    70.7,
    88.2,
    72.4,
    87.2,
    "C",
    75.5,
    85.2,
    77.9,
    83.3,
    80.8,
    80.5,
    "C",
    83.4,
    77.8,
    84.6,
    76.4,
    86.5,
    73.5,
    "C",
    88.4,
    70.6,
    89.3,
    68.9,
    90.9,
    65.2,
    "C",
    91.5,
    63.7,
    92,
    62.1,
    92.7,
    59.6,
    "C",
    95.1,
    50.6,
    94.5,
    41,
    91.2,
    32.1,
    "C",
    90.9,
    31.5,
    90.7,
    30.8,
    90.6,
    30.5,
    "C",
    89.8,
    28.3,
    86.8,
    23.2,
    84.9,
    20.7,
    "C",
    81.8,
    16.7,
    76.4,
    11.7,
    73.2,
    9.9,
    "C",
    73,
    9.8,
    72.4,
    9.5,
    71.8,
    9.1,
    "C",
    64.4,
    4.6,
    55.1,
    2.3,
    46,
    2.8,
  ],
  [
    "M",
    54.8,
    7,
    "C",
    59.9,
    8,
    63.6,
    9.1,
    66.1,
    10.3,
    "C",
    67.4,
    11,
    69.8,
    12.3,
    70.5,
    12.7,
    "C",
    73,
    14.3,
    73,
    14.3,
    75.9,
    16.8,
    "C",
    76.7,
    17.4,
    77.6,
    18.2,
    78,
    18.6,
    "C",
    79.9,
    20.6,
    82.5,
    23.8,
    83.5,
    25.3,
    "C",
    83.7,
    25.7,
    84.1,
    26.5,
    84.4,
    26.9,
    "C",
    87.1,
    31.2,
    89,
    36.5,
    89.9,
    42.2,
    "C",
    90.3,
    44.7,
    90.4,
    50,
    90.2,
    52.1,
    "C",
    89.7,
    55.5,
    89.4,
    57.4,
    88.6,
    60.1,
    "C",
    87.5,
    64,
    85.9,
    67.6,
    83.3,
    71.5,
    "C",
    82.2,
    73.2,
    81.9,
    73.5,
    80.3,
    75.4,
    "C",
    78.2,
    77.9,
    75.9,
    80,
    73.2,
    82.1,
    "C",
    70.9,
    83.8,
    66.9,
    86,
    64.4,
    87,
    "C",
    63.8,
    87.2,
    63.2,
    87.5,
    63,
    87.5,
    "C",
    62.5,
    87.7,
    62.1,
    87.9,
    61.6,
    88,
    "C",
    61.4,
    88.1,
    60.6,
    88.3,
    60,
    88.5,
    "C",
    58.6,
    88.8,
    55.7,
    89.5,
    53.8,
    89.8,
    "C",
    51.9,
    90.1,
    47.3,
    90.2,
    45,
    90,
    "C",
    36.9,
    89.3,
    29.7,
    86.5,
    23.5,
    81.8,
    "C",
    15.3,
    75.7,
    9.5,
    66.6,
    7.6,
    56.8,
    "C",
    5.9,
    48.1,
    6.8,
    39.3,
    10.2,
    31.7,
    "C",
    14,
    22.9,
    20.1,
    16.2,
    28.5,
    11.5,
    "C",
    32.4,
    9.4,
    35.7,
    8.2,
    40.5,
    7.2,
    "C",
    43.8,
    6.6,
    45,
    6.5,
    49.2,
    6.5,
    "C",
    52.4,
    6.6,
    53.1,
    6.6,
    54.8,
    7,
  ],
];

// Process the data
let boundaryPoints = parseSvgPath(svgData);
console.log(boundaryPoints);
let centerline = computeCenterline(boundaryPoints);

console.log("Centerline Points:", centerline);
