
namespace figures {

  export interface ISquare {
    origin: tegneRobot.IXY;
    size: number;
    rotation: number;
    numberOfIndexes: number;
    halfSize: number;
    calculatePointFromIndex: (index: number) => tegneRobot.IXY;
  }

  interface ISquareProps {
    xPosition: number; yPosition: number; lengthOfSide: number; rotation?: number
  }

  /**
   * Draws a circle
   * @param xPosition - Coordinate on X axis
   * @param yPosition - Coordinate on y axis
   * @param size - length of size
   * @param rotation - rotation of square #TODO: not implemented yet.
   */
  //% block
  export function drawSquare({ xPosition, yPosition, lengthOfSide: size, rotation = 1 }: ISquareProps) {

    const numberOfIndexes = 5;

    tegneRobot.draw.figureStack.push({
      origin: { x: xPosition, y: yPosition },
      size: size,
      rotation: rotation,
      numberOfIndexes: numberOfIndexes,
      halfSize: size * 0.5,
      calculatePointFromIndex: function (index: number): tegneRobot.IXY {
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
    });
  }


  interface ICircleProps {
    xPosition: number,
    yPosition: number,
    radius: number,
    fidelity?: number
  }

  export interface ICircle {
    origin: tegneRobot.IXY;
    radius: number;
    numberOfIndexes: number;
    stepSize: number;
    step: () => number;
    calculatePointFromIndex: (index: number) => tegneRobot.IXY;
  }

  export function drawCircle({ xPosition, yPosition, radius, fidelity = 36 }: ICircleProps) {

    tegneRobot.draw.figureStack.push({
      origin: { x: xPosition, y: yPosition },
      radius: radius,
      numberOfIndexes: fidelity + 1,
      stepSize: 360 / fidelity,
      step: function () { return (Math.PI / 180) * this.stepSize },
      calculatePointFromIndex: function (index: number) {
        return {
          x: Math.round(Math.cos(index * this.step) * this.radius) + this.origin.x,
          y: Math.round(Math.sin(index * this.step) * this.radius) + this.origin.y,
        };
      }
    })
  }
}

namespace tegneRobot {
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
    figureStack: (figures.ISquare | figures.ICircle)[],
    targetPoint: { x: number, y: number },
    previousTime: number
  }

  export const draw: IDraw = {
    pulseInterval: 500,
    penDown: false,
    targetPointIndex: 0,
    running: true,
    figureIndex: 0,
    figureNumberOfIndexes: 0,
    figureStack: [],
    targetPoint: { x: 0, y: 0 },
    previousTime: 0,

  };


  interface IBresenham {
    err: number;
    dx: number;
    dy: number;
  }
  export const bresenham: IBresenham = {
    err: 0,
    dx: 0,
    dy: 0,
  };

  export interface IXY {
    x: number; y: number;
  }


  checkFigureStack();
  setNewTargetPoint();
  setupBresenhamForPoint();


  export function checkFigureStack() {
    draw.running = draw.figureStack.length > 0;
  }


  function timeDifference() {
    return input.runningTime() - draw.previousTime;
  }

  export function mainLoop() {
    if (
      machine.currentPosition.x === draw.targetPoint.x &&
      machine.currentPosition.y === draw.targetPoint.y && draw.running
    ) {
      updateParameters();
    }


    if (draw.running) {
      if (timeDifference() >= draw.pulseInterval) {

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

      draw.previousTime = input.runningTime();
    }
  }

  export function updateParameters() {
    if (draw.targetPointIndex < draw.figureNumberOfIndexes - 1) {
      draw.targetPointIndex += 1;

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
        draw.figureIndex += 1;
        draw.figureNumberOfIndexes = draw.figureStack[draw.figureIndex].numberOfIndexes;


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

}