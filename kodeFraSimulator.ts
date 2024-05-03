
namespace figures {

  export interface ISquare {
    numberOfIndexes: number;
    calculatePointFromIndex: (index: number) => tegneRobot.IXY;
  }

  /**
   * Draws a square
   * @param xPosition - Coordinate on X axis
   * @param yPosition - Coordinate on y axis
   * @param lengthOfSide - length of size
   * @param rotation - rotation of square #TODO: not implemented yet.
   */
  //% block="Draw Square|x Coordinate %xPosition|y Coordinate %yPosition| length of side %lengthOfSide| rotation %rotation" blockGap=8
  //% xPosition.min=0 yPosition.min=0 radius.min=1 lengthOfSide.defl=1
  export function drawSquare(xPosition: number, yPosition: number, lengthOfSide: number, rotation = 0) {

    const numberOfIndexes = 5;

    tegneRobot.draw.figureStack.push({
      numberOfIndexes: numberOfIndexes,
      calculatePointFromIndex: function (index: number): tegneRobot.IXY {
        const origin = { x: xPosition, y: yPosition };
        const size = lengthOfSide;
        const rotate = rotation;
        const halfSize = size * 0.5;

        switch (index) {
          case 1:
            return { x: origin.x + halfSize, y: origin.y - halfSize };
          case 2:
            return { x: origin.x + halfSize, y: origin.y + halfSize };
          case 3:
            return { x: origin.x - halfSize, y: origin.y + halfSize };
          default:
            return { x: origin.x - halfSize, y: origin.y - halfSize };
        }
      }
    });
  }

  export interface ICircle {
    numberOfIndexes: number;
    calculatePointFromIndex: (index: number) => tegneRobot.IXY;
  }

  /**
   * Draws a square
   * @param xPosition - Coordinate on X axis
   * @param yPosition - Coordinate on y axis
   * @param radius - length of radius
   * @param percision - level of detail in circle
   */
  //% block="Draw Circle|x Coordinate %xPosition|y Coordinate %yPosition| radius %radius| percision %percision" blockGap=8
  //% xPosition.min=0 yPosition.min=0 radius.min=1 radius.defl=1 percision.defl=36
  export function drawCircle(xPosition: number, yPosition: number, radius: number, percision = 36) {
    tegneRobot.draw.figureStack.push({
      numberOfIndexes: percision + 1,
      calculatePointFromIndex: function (index: number) {
        const origin = { x: xPosition, y: yPosition };
        const r = radius;
        const stepSize = 360 / percision;
        const step = (Math.PI / 180) * stepSize;

        return {
          x: Math.round(Math.cos(index * step) * r) + origin.x,
          y: Math.round(Math.sin(index * step) * r) + origin.y,
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


  function timeDifference(currentTime: number) {
    return currentTime - draw.previousTime;
  }


  /**
   * Draws the figures
   */
  //% block="Draw Figures" blockGap=8
  export function drawFigureStack() {
    if (
      machine.currentPosition.x === draw.targetPoint.x &&
      machine.currentPosition.y === draw.targetPoint.y && draw.running
    ) {
      updateParameters();
    }

    let currentTime = input.runningTime();


    if (draw.running) {
      if (timeDifference(currentTime) >= draw.pulseInterval) {

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
    if (draw.figureStack.length > 0) {
      draw.targetPoint = draw.figureStack[
        draw.figureIndex
      ].calculatePointFromIndex(draw.targetPointIndex);
    }
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