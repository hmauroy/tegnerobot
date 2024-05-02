
const machine = {
  currentPosition: { x: 0, y: 0 },
  direction: { x: 1, y: 1 },
};


interface IDraw {
  pulseInterval: number,
  penDown: boolean,
  running: boolean,
  targetPointIndex: number,
  figureIndex: number,
  figureNumberOfIndexes: number,
  figureStack: ISquare[],
  targetPoint: { x: number, y: number },
}

const draw: IDraw = {
  pulseInterval: 500,
  penDown: false,
  targetPointIndex: 0,
  running: true,
  figureIndex: 0,
  figureNumberOfIndexes: 0,
  figureStack: [],
  targetPoint: { x: 0, y: 0 },

};

const bresenham = {
  err: 0,
  dx: 0,
  dy: 0,
};

interface IXY {
  x: number; y: number;
}

interface ISquare {
  origin: IXY;
  size: number;
  rotation: number;
  numberOfIndexes: number;
  halfSize: number;
  calculatePointFromIndex: (index: number) => IXY;
}

function drawSquare(xPosition: number, yPosition: number, size: number, rotation = 1) {

  const numberOfIndexes = 5;

  return {
    origin: { x: xPosition, y: yPosition },
    size: size,
    rotation: rotation,
    numberOfIndexes: numberOfIndexes,
    halfSize: size * 0.5,

    calculatePointFromIndex: (index: number): IXY => {
      switch (index) {
        case 1:
          return { x: this.origin.x + this.halfSize, y: this.origin.y - this.halfSize };
        case 2:
          return { x: this.origin.x + this.halfSize, y: this.origin.y + this.halfSize };
        case 3:
          return { x: this.origin.x - this.halfSize, y: this.origin.y + this.halfSize };
        default:
          return { x: this.origin.x - this.halfSize, y: this.origin.y - this.halfSize };
      }
    }
  }
}

draw.figureStack.push(drawSquare(200, 200, 50));
setNewTargetPoint();
checkFigureStack();
setupBresenhamForPoint();


function checkFigureStack() {
  draw.running = draw.figureStack.length > 0;
}

basic.forever(function () {
  if (
    machine.currentPosition.x === draw.targetPoint.x &&
    machine.currentPosition.y === draw.targetPoint.y
  ) {
    updateParameters();
  }

  if (draw.running) {
    if (timeStamp >= draw.pulseInterval) {
      const err2 = 2 * bresenham.err;

      if (err2 >= bresenham.dy) {
        bresenham.err = bresenham.err + bresenham.dy;

        if (machine.currentPosition.x !== draw.targetPoint.x) {
          turnStepperX();
        }
      }
      if (err2 <= bresenham.dx) {
        bresenham.err = bresenham.err + bresenham.dx;

        if (machine.currentPosition.y !== draw.targetPoint.y) {
          turnStepperY();
        }
      }
    }

    window.requestAnimationFrame((t) => mainLoop(t));
  }
})

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

function turnStepperX() {
  machine.currentPosition.x += machine.direction.x;
}

function turnStepperY() {
  machine.currentPosition.y += machine.direction.y;
}

function raisePen() {
  draw.penDown = false;
}

function lowerPen() {
  draw.penDown = true;
}