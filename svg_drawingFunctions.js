/*
Draws all starting points utilizing helper function which draws a single point.
*/
function drawStartingPoints(sortedLines, ctx) {
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

function drawLines(pointsArray) {
  /*
    Claude 3.7 edit.
    */
  // Get the canvas element and its 2D context
  let canvas = document.getElementById("drawCanvas");
  let ctx = canvas.getContext("2d");

  // Iterate over each line (each subarray of points)
  for (let lineIndex = 0; lineIndex < pointsArray.length; lineIndex++) {
    const points = pointsArray[lineIndex];
    drawCurve(points, ctx);
  }
}

function drawCurve(curve, ctx) {
  // Begin a new path for each line
  ctx.beginPath();
  ctx.strokeStyle = getColorForElement();

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

function updateMouseFollowerPosition(evt) {
  const follower = document.getElementById('mouse-follower');

  if (follower) {
    console.log(evt.clientX, evt.clientY);
    const diameter = Number(document.getElementById("pupilDiameter").value);
    //follower.style.width = 2*diameter + "px"; // Adjust size as needed
    //follower.style.height = 2*diameter + "px"; // Adjust size as needed
    //follower.style.left = (evt.clientX - diameter/2)  + "px";
    //follower.style.top = (evt.clientY - diameter / 2) + "px"; // Adjust offset as needed
    follower.style.transform = `translate(${evt.clientX - diameter/2}px, ${evt.clientY - diameter/2}px)`;
  }
}

function showMouseFollower() {
    const mouseFollower = document.querySelector('#mouse-follower');
    if (mouseFollower) {
        mouseFollower.style.display = 'block';
    }
}

function hideMouseFollower() {
    const mouseFollower = document.querySelector('#mouse-follower');
    if (mouseFollower) {
        mouseFollower.style.display = 'none';
    }
}
