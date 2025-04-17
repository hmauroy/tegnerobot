/*
Draws all starting points utilizing helper function which draws a single point.
*/
function drawStartingPoints(sortedLines, ctx) {
  let radius = 6;
  let offsetX = radius / 2;
  // Set font properties
  ctx.font = "8px Arial";
  let cnt = 0;
  sortedLines.forEach((curve) => {
    cnt++;
    if (cnt >= 10) {
      offsetX = radius / 1.3;
    }
    ctx.beginPath();
    ctx.fillStyle = "black";
    ctx.arc(curve[0][0], curve[0][1], radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "white"; // Text color
    ctx.fillText(cnt, curve[0][0] - offsetX, curve[0][1] + radius / 2); // (text, x, y)
  });
  // Draws the first starting point in red on top of eventual other points nearby.
  ctx.fillStyle = "red";
  const point = [sortedLines[0][0][0], sortedLines[0][0][1]];
  ctx.beginPath();
  ctx.arc(point[0], point[1], radius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.fillText(1, point[0] - radius / 2, point[1] + radius / 2); // (text, x, y)
}

function drawSinglePoint(point, number = -1) {}
