// Array of 7 distinct colors
const colors = [
  "#FF5733", // Red-Orange
  "#33FF57", // Green
  "#3357FF", // Blue
  "#F733FF", // Purple
  "#FFDD33", // Yellow
  "#33FFF9", // Cyan
  "#FF33A8", // Pink
];

// Function to get the next color in the cycle
function getNextColor(currentIndex) {
  // Increment the index
  const nextIndex = currentIndex + 1;

  // If we've reached the end, cycle back to the beginning
  if (nextIndex >= colors.length) {
    return {
      color: colors[0],
      index: 0,
    };
  } else {
    return {
      color: colors[nextIndex],
      index: nextIndex,
    };
  }
}

// Example usage:
// Initialize with -1 to get the first color (index 0) on first call
let colorIndex = -1;

function getColorForElement() {
  const result = getNextColor(colorIndex);
  colorIndex = result.index;
  return result.color;
}
