function svg(svgString) {
  const svgArr = JSON.parse(svgString);

  let lastCoordinates = [];
  let coordinates = [];
  // drawCoords should be a 2D array filled with subarrays that are created every time the control code "M" appears.
  const drawCoords = [];
  let n_segments = 1;
  let curveLength = 0;

  for (let i = 0; i < svgArr.length; i++) {
    for (let j = 0; j < svgArr[i].length; j++) {
      if (svgArr[i][j] === "M") {
        lastCoordinates = [svgArr[i][j + 1], svgArr[i][j + 2]];
        coordinates = [];
        drawCoords.push(lastCoordinates);
        j += 2;
      } else if (svgArr[i][j] === "C") {
        coordinates = [...lastCoordinates];
        coordinates.push(
          svgArr[i][j + 1],
          svgArr[i][j + 2],
          svgArr[i][j + 3],
          svgArr[i][j + 4],
          svgArr[i][j + 5],
          svgArr[i][j + 6]
        );
        lastCoordinates = [svgArr[i][j + 5], svgArr[i][j + 6]];

        curveLength = Math.sqrt(
          (coordinates[6] - coordinates[0]) *
            (coordinates[6] - coordinates[0]) +
            (coordinates[7] - coordinates[1]) *
              (coordinates[7] - coordinates[1])
        );
        let segment_length = 1;
        n_segments = Math.ceil(curveLength / segment_length);

        for (let k = 0; k <= n_segments; k++) {
          const t = k / n_segments;
          const a = (1 - t) ** 3;
          const b = 3 * t * (1 - t) ** 2;
          const c = 3 * Math.pow(t, 2) * (1 - t);
          const d = Math.pow(t, 3);
          const x =
            a * coordinates[0] +
            b * coordinates[2] +
            c * coordinates[4] +
            d * coordinates[6];
          const y =
            a * coordinates[1] +
            b * coordinates[3] +
            c * coordinates[5] +
            d * coordinates[7];
          drawCoords.push([x, y]);
        }
      } else if (svgArr[i][j] === "L") {
        // Add your line drawing logic here for L command
        // Line
        coordinates = [
          svgArr[i][j + 1],
          svgArr[i][j + 2],
          svgArr[i][j + 3],
          svgArr[i][j + 4],
        ]; // Start and end coordinates are indicated by L segment.
        lastCoordinates = [svgArr[i][j + 3], svgArr[i][j + 4]];
        j += 4;
      }
    }
  }
  return { coordinates: lastCoordinates, drawCoords: drawCoords };
}

function drawSvgPath() {
  const canvas = document.getElementById("drawCanvas");
  const ctx = canvas.getContext("2d");
  const svgInput = document.getElementById("svgInput");

  // Clear previous drawing
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  try {
    const result = svg(svgInput.value);
    const points = result.drawCoords;

    // Scale and translate points to fit canvas
    const scaleFactor =
      Math.min(
        canvas.width / Math.max(...points.map((p) => p[0])),
        canvas.height / Math.max(...points.map((p) => p[1]))
      ) * 0.8;

    ctx.beginPath();
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;

    // Draw lines between consecutive points, skipping long lines
    points.forEach((point, index) => {
      if (index > 0) {
        const prevPoint = points[index - 1];
        const x1 = prevPoint[0] * scaleFactor + 50;
        const y1 = prevPoint[1] * scaleFactor + 50;
        const x2 = point[0] * scaleFactor + 50;
        const y2 = point[1] * scaleFactor + 50;

        // Calculate line length
        const lineLength = Math.sqrt(
          Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)
        );

        // Only draw lines shorter than 10 pixels
        if (lineLength <= 10) {
          if (index === 1) {
            ctx.moveTo(x1, y1);
          }
          ctx.lineTo(x2, y2);
        }
      }
    });
    ctx.stroke();

    // Draw red dots after drawing lines
    ctx.fillStyle = "red";
    points.forEach((point) => {
      const x = point[0] * scaleFactor + 50;
      const y = point[1] * scaleFactor + 50;
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    });
  } catch (error) {
    console.error("Error drawing SVG path:", error);
    alert("Invalid SVG path input. Please check your JSON format.");
  }
}
