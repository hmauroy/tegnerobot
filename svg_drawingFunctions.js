/*
Draws all starting points utilizing helper function which draws a single point.
*/
function drawStartingPointsOld(sortedLines, ctx) {
  let radius = 6;
  let cnt = 0;
  sortedLines.forEach((curve) => {
    cnt++;
    drawSinglePoint(curve[0], radius, ctx, "black", cnt);
  });
  // Draws the first starting point in red on top of eventual other points nearby.
  drawSinglePoint(sortedLines[0][0], radius, ctx, "red", 1);
}

function drawSinglePoint(point, radius, ctx, color = "black", number = -1) {
  let offsetX = radius / 2;
  if (number >= 10) {
    offsetX = radius / 1.3;
  }
  ctx.beginPath();
  console.log("Begin path");
  ctx.fillStyle = color;
  ctx.arc(point[0], point[1], radius, 0, 2 * Math.PI);
  ctx.fill();
  if (number != -1) {
    // Set font properties
    ctx.font = "8px Arial";
    ctx.fillStyle = "white"; // Text color
    ctx.fillText(number, point[0] - offsetX, point[1] + radius / 2); // (text, x, y)
  }
}

function drawStartingPoints(sortedLines, ctx) {
  let radius = 6;
  
  // Clear any existing clickable elements
  clearClickableElements();

  let color = "black";
  
  // Draws starting points, starting with the second line.
  for (let i = 1; i < sortedLines.length; i++) {
    const curve = sortedLines[i];
    
    
    // Create clickable HTML element for this point
    createClickableCircle(curve[0], radius, i, color);
    
    // Still draw on canvas for visual feedback if needed
    //drawSinglePoint(curve[0], radius, ctx, color, i + 1);
  }

  // Draws the starting point of the first line.
  // Create clickable HTML element for this point
  createClickableCircle(sortedLines, sortedLines[0][0], radius, 0, color);

  // Still draw on canvas for visual feedback if needed
  //drawSinglePoint(sortedLines[0][0], radius, ctx, color, 1);
}

function createClickableCircle(sortedLines, point, radius, index, color) {
  console.log("circle " + index);
  const circle = document.createElement('div');
  circle.className = 'clickable-circle';
  circle.index = index; // Store the array index
  
  // Position and style the circle
  circle.style.position = 'absolute';
  circle.style.left = (point.x - radius) + 'px';
  circle.style.top = (point.y - radius) + 'px';
  circle.style.width = (radius * 2) + 'px';
  circle.style.height = (radius * 2) + 'px';
  circle.style.borderRadius = '50%';
  circle.style.backgroundColor = color;
  circle.style.border = '1px solid ' + color;
  circle.style.cursor = 'pointer';
  circle.style.zIndex = '1000';
  
  // Add click event handler
  circle.addEventListener('click', function(e) {
    e.stopPropagation();
    deleteCurve(sortedLines, this);
  });
  
  // Add to canvas container (assumes canvas has a positioned parent)
  const canvasContainer = document.getElementById('canvas-centerLine'); // or wherever your canvas is
  canvasContainer.appendChild(circle);
}

function clearClickableElements() {
  const container = document.getElementById('canvas-centerLine');
  const circles = container.querySelectorAll('.clickable-circle');
  circles.forEach(circle => circle.remove());
}

function deleteCurve(sortedLines, element) {
  if (sortedLines.length === 1) {
    console.log("Need to have at least one curve left!");
    return;
  }
  const index =  parseInt(element.index)
  console.log('Deleting circle at index:', index);
  sortedLines.splice(index, 1);
  // Removes the circle
  element.remove();
  // Redraws the canvas.
  const centerLineCanvas = document.getElementById("centerLineCanvas");
  drawCenterLine(sortedLines, centerLineCanvas);
}

function drawCenterLine(path, centerLineCanvas) {
  // Remove all lines present
  // Get the canvas element and its 2D context
  let ctx = centerLineCanvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Draw lines
  drawLines(path, centerLineCanvas, 3);
  // Draw the starting point markers
  drawStartingPoints(path, ctx);
}
  

function drawLines(pointsArray, canvas, lineWidth=1) {
  /*
    Claude 3.7 edit.
    */
  // Get the canvas element and its 2D context
  let ctx = canvas.getContext("2d");

  // Iterate over each line (each subarray of points)
  for (let lineIndex = 0; lineIndex < pointsArray.length; lineIndex++) {
    const points = pointsArray[lineIndex];
    drawCurve(points, ctx, lineWidth);
  }
}

function drawCurve(curve, ctx, lineWidth=1) {
  // Begin a new path for each line
  ctx.beginPath();
  ctx.strokeStyle = getColorForElement();
  ctx.lineWidth = lineWidth;

  // Move to the first point of this line
  ctx.moveTo(curve[0][0], curve[0][1]);

  // Draw lines to each subsequent point in this line
  for (let i = 1; i < curve.length; i++) {
    ctx.lineTo(curve[i][0], curve[i][1]);
  }
  // Stroke the path for this line
  ctx.stroke();
}

function drawPupil(x, y, diameter, ctx) {
  const radius = diameter / 2;
  console.log(x + "," + y + ", radius: " + radius);
  drawSinglePoint([x, y], radius, ctx, "black");
  return [x, y, radius];
}

function generatePupilPath(pupil) {
  const x = pupil[0];
  const y = pupil[1];
  const radius = pupil[2];
  let pupilPath = [];
  console.log(x, y, radius);
  // TODO: Finish it!
  // 1) Generate outline
  // 2) Generate scan lines for each 2nd pixel. Need testing to see which resolution is sane.
  return pupilPath;
}

function drawBezierCurves(pathsArray, canvas, color) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Normalizes the paths to the size of the canvas.
  let paths = normalizePaths(pathsArray, canvas.width, canvas.height);


  paths.forEach((path) => {
    ctx.strokeStyle = color;
    ctx.beginPath();
    for (let i = 0; i < path.length; i++) {
      const cmd = path[i];
      if (cmd === "M") {
        ctx.moveTo(path[i + 1], path[i + 2]);
        i += 2;
      } else if (cmd === "C") {
        ctx.bezierCurveTo(
          path[i + 1],
          path[i + 2],
          path[i + 3],
          path[i + 4],
          path[i + 5],
          path[i + 6]
        );
        i += 6;
      } else if (cmd === "L") {
        ctx.lineTo(path[i + 1], path[i + 2]);
        i += 2;
      }
    }
    ctx.stroke();
  });
}


function normalizePaths(paths, width, height) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  paths.forEach((path) => {
    for (let i = 1; i < path.length; i++) {
      if (
        typeof path[i] === "number" &&
        typeof path[i + 1] === "number"
      ) {
        minX = Math.min(minX, path[i]);
        minY = Math.min(minY, path[i + 1]);
        maxX = Math.max(maxX, path[i]);
        maxY = Math.max(maxY, path[i + 1]);
      }
    }
  });

  const scaleX = width / (maxX - minX);
  const scaleY = height / (maxY - minY);
  const scale = Math.min(scaleX, scaleY);

  return paths.map((path) => {
    let newPath = [];
    for (let i = 0; i < path.length; i++) {
      if (typeof path[i] === "string") {
        newPath.push(path[i]);
      } else {
        newPath.push((path[i] - minX) * scale);
      }
    }
    return newPath;
  });
}