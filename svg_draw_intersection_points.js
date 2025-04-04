/**
 * Draws points at the intersections on the canvas
 * @param {Array} intersections - Array of intersection points [x, y]
 * @param {number} radius - Radius of the points to draw
 * @param {string} color - Color of the points
 */
function drawIntersectionPoints(intersections, radius = 3, color = "purple") {
  // Get the canvas and context
  const canvas = document.getElementById("drawCanvas");
  const ctx = canvas.getContext("2d");

  // Save current context state
  ctx.save();

  // Set drawing styles
  ctx.fillStyle = color;

  // Draw each intersection point as a circle
  intersections.forEach((point) => {
    const x = point[0];
    const y = point[1];

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  // Restore context state
  ctx.restore();
}

/**
 * Add this function to visualize both vertical and horizontal intersection points
 * Call this from your scanlineFill function when you want to show the intersections
 */
function visualizeAllIntersections(
  verticalIntersections,
  horizontalIntersections
) {
  // Draw vertical scan intersections in one color
  drawIntersectionPoints(verticalIntersections, 3, "purple");

  // Draw horizontal scan intersections in a different color
  drawIntersectionPoints(horizontalIntersections, 3, "orange");
}
