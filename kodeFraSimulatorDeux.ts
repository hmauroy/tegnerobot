
// ###############MAIN##############

// Machine virtual data
let currentPositionX = 0;
let currentPositionY = 0;
let directionX = 1;
let directionY = 1;
let penDown = false;

function turnStepperX() {
  currentPositionX += directionX;
}

function turnStepperY() {
  machine.currentPosition.y += machine.direction.y;
}


// Drawing settings & logic
let pulseInterval = 500;
let targetPointIndex = 0;
let running = true;
let figureIndex = 0;
let figureNumberOfIndexes = 0;

let figureStack = [];
let targetPointX = 0;
let targetPointY = 0;

// Bresenham Components
let error = 0;
let differenceX = 0;
let differenceY = 0;



// Utility functions
function updateParameters() {
  if (draw.targetPointIndex < draw.figureNumberOfIndexes - 1) {
    draw.targetPointIndex++;
    setNewTargetPoint();
    setupBresenhamForPoint();
    changeDirection();
    if (draw.targetPointIndex > 0 && !draw.penDown) {
      lowerPen();
    }
  } else {
    raisePen();
    if (draw.figureIndex < draw.figureStack.length - 1) {
      draw.targetPointIndex = -1;
      draw.figureIndex++;
    } else {
      draw.running = false;
    }
  }
}

function setNewTargetPoint() {
  draw.targetPoint = draw.figureStack[
    draw.figureIndex
  ].calculatePointFromIndex(draw.targetPointIndex);
}

function setupBresenhamForPoint() {
  bresenham.dx = Math.abs(draw.targetPoint.x - machine.currentPosition.x);
  bresenham.dy = -Math.abs(draw.targetPoint.y - machine.currentPosition.y);
  bresenham.err = bresenham.dx + bresenham.dy;
}

function changeDirection() {
  const xDifference = draw.targetPoint.x >= machine.currentPosition.x;

  if (xDifference && machine.direction.x === -1) {
    machine.direction.x = machine.direction.x * -1;
  }
  else if (!xDifference && machine.direction.x === 1) {
    machine.direction.x = machine.direction.x * -1;
  }

  const yDifference = draw.targetPoint.y >= machine.currentPosition.y;

  if (yDifference && machine.direction.y === -1) {
    machine.direction.y = machine.direction.y * -1;
  }
  else if (!yDifference && machine.direction.y === 1) {
    machine.direction.y = machine.direction.y * -1;
  }
}