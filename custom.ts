


namespace figures {

    export interface ISquare {
        numberOfIndexes: number;
        calculatePointFromIndex: (index: number) => tegneRobot.IXY;
        figureType: string;
        x: number;
        y: number;
    }

    /**
     * Draws a square
     * @param xPosition - Coordinate on X axis
     * @param yPosition - Coordinate on y axis
     * @param lengthOfSide - length of size in mm. 5000 steps = 62.0 mm Y-axis, 64.6 mm X-axis approximately. Must be set by user after running calibrationX() and calibrationY() blocks once. # TODO: Not implemented yet.
     * @param rotation - rotation of square calculated by rotating around center point calculated by averaging all 4 corners. #TODO: not implemented yet. 
     */
    //% block="Draw Square|x Coordinate %xPosition|y Coordinate %yPosition| length of side %lengthOfSide| rotation %rotation" blockGap=8
    //% xPosition.min=0 yPosition.min=0 radius.min=1 lengthOfSide.defl=1
    export function drawSquare(xPosition: number, yPosition: number, lengthOfSide: number, rotation: number = 0) {

        const numberOfIndexes = 5;

        tegneRobot.draw.figureStack.push({
            numberOfIndexes: numberOfIndexes,
            figureType: "square",
            x: xPosition,
            y: yPosition,
            calculatePointFromIndex: function (index: number): tegneRobot.IXY {
                const stepsPerMM = Math.ceil(5000 / 62.0);
                const origin = { x: xPosition*stepsPerMM, y: yPosition*stepsPerMM };
                const size = lengthOfSide * stepsPerMM;
                const rotate = rotation;
                const halfSize = Math.ceil(size * 0.5);

                /*
                switch (index) {
                    case 1:
                        return { x: origin.x  + halfSize, y: origin.y - halfSize };
                    case 2:
                        return { x: origin.x + halfSize, y: origin.y + halfSize };
                    case 3:
                        return { x: origin.x - halfSize, y: origin.y + halfSize };
                    default:
                        return { x: origin.x - halfSize, y: origin.y - halfSize };
                }
                */

                switch (index) {
                    case 1:
                        return { x: origin.x + size, y: origin.y };
                    case 2:
                        return { x: origin.x + size, y: origin.y + size };
                    case 3:
                        return { x: origin.x, y: origin.y + size };
                    default:
                        return { x: origin.x, y: origin.y };
                }
            }
        });
    }

    export interface ICircle {
        numberOfIndexes: number;
        calculatePointFromIndex: (index: number) => tegneRobot.IXY;
        figureType: string;
        x: number;
        y: number;
    }

    /**
     * Draws a square
     * @param xPosition - Coordinate on X axis in mm.
     * @param yPosition - Coordinate on y axis in mm.
     * @param radius - length of radius in mm.
     * @param precision - number of line segments for circle.
     */
    //% block="Draw Circle|x Coordinate %xPosition|y Coordinate %yPosition| radius %radius| precision %precision" blockGap=8
    //% xPosition.min=0 yPosition.min=0 radius.min=2 radius.defl=1 precision.defl=36
    export function drawCircle(xPosition: number, yPosition: number, radius: number, precision: number = 36) {
        tegneRobot.draw.figureStack.push({
            numberOfIndexes: precision + 1,
            figureType: "circle",
            x: xPosition,
            y: yPosition,
            calculatePointFromIndex: function (index: number) {
                const stepsPerMM = Math.ceil(5000 / 62.0);
                const origin = { x: xPosition * stepsPerMM, y: yPosition * stepsPerMM };
                const r = radius * stepsPerMM;
                const stepSize = 360 / precision;
                const step = (Math.PI / 180) * stepSize ;

                return {
                    x: Math.ceil(Math.cos(index * step) * r) + origin.x,
                    y: Math.ceil(Math.sin(index * step) * r) + origin.y,
                };
            }
        })
    }
}




/**
 * Custom blocks
 */
//% weight=100 color=#0fbc11 icon="\uf247"
namespace tegneRobot {

    /**
    * Use this file to define custom functions and blocks.
    * Read more at https://makecode.microbit.org/blocks/custom
    */

    enum MyEnum {
        //% block="one"
        One,
        //% block="two"
        Two,
    }


    interface IMachine {
        currentPosition: IXY;
        direction: IXY;
    }

    // x: 1 = CW, -1 = CCW
    // y: 1 = CW, -1 = CCW
    interface IDirection {
        x: 1 | -1;
        y: 1 | -1;
    }

    const machine: IMachine = {
        currentPosition: { x: 0, y: 0 },
        direction: { x: 1, y: 1 },
    };

    const pinStates = {
        //% stepper pins: pin13=stepperX, pin15=stepperY, pin14=dirX, pin16=dirY
        pin13: 0,
        pin14: 0,
        pin15: 0,
        pin16: 1
    };

    let coordinateString = "";



    interface IDraw {
        pulseInterval: number,
        penDown: boolean,
        running: boolean,
        targetPointIndex: number,
        figureIndex: number,
        figureNumberOfIndexes: number,
        figureStack: (figures.ISquare | figures.ICircle)[],
        targetPoint: { x: number, y: number },
        previousTime: number,
        pulseHigh: number
    }

    export const draw: IDraw = {
        pulseInterval: 400,
        penDown: false,
        targetPointIndex: 0,
        running: true,
        figureIndex: 0,
        figureNumberOfIndexes: 0,
        figureStack: [],
        targetPoint: { x: 0, y: 0 },
        previousTime: 0,
        pulseHigh: 1

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


    export function initiateDrawingParameters() {
        serialLog("---- Initiate drawing ----");
        checkFigureStack();
        setNewTargetPoint();
        setupBresenhamForPoint();
        draw.pulseHigh = 1;
    }



    export function checkFigureStack() {
        draw.running = draw.figureStack.length > 0;
        draw.figureNumberOfIndexes = draw.figureStack[draw.figureIndex].numberOfIndexes;
        serialLog("new " + draw.figureStack[draw.figureIndex].figureType);
        serialLog("position " + draw.figureStack[draw.figureIndex].x + "," + draw.figureStack[draw.figureIndex].y);
    }


    function timeDifference(currentTime: number) {
        return currentTime - draw.previousTime;
    }

    /**
     * Runs the main loop with microsecond timing.
     */
    //% block="Start drawing all figures" blockGap=8
    export function startDrawing() {
        initiateDrawingParameters();
        while(true) {
            drawFigureStack();
            control.waitMicros(10);
        }
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

        let currentTime = micros();
        //let currentTime = millis();


        if (draw.running) {

            if (timeDifference(currentTime) >= draw.pulseInterval) {
                stepSteppers();

                // If pulse is LOW, we do all the calculations needed for the next HIGH pulse.
                if (draw.pulseHigh === 0) {
                    //serialLog("target: " + draw.targetPoint.x + "," + draw.targetPoint.y);
                    //serialLog("machine.x: " + machine.currentPosition.x);
                    //serialLog("machine.y: " + machine.currentPosition.y);
                    
                    
                    const err2 = 2 * bresenham.err;

                    if (err2 >= bresenham.dy) {
                        bresenham.err = bresenham.err + bresenham.dy;

                        if (machine.currentPosition.x !== draw.targetPoint.x) {
                            machine.currentPosition.x += machine.direction.x
                            //serialLog("X");
                            pinStates.pin13 = 1;
                        }
                    }
                    if (err2 <= bresenham.dx) {
                        bresenham.err = bresenham.err + bresenham.dx;

                        if (machine.currentPosition.y !== draw.targetPoint.y) {
                            machine.currentPosition.y += machine.direction.y
                            //serialLog("Y");
                            pinStates.pin15 = 1;
                        }
                    }
                    draw.pulseHigh = 1;
                    
                }
                else {
                    pinStates.pin13 = 0;
                    pinStates.pin15 = 0;
                    draw.pulseHigh = 0;
                }
                //serialLog("machine.x: " + machine.currentPosition.x);
                //serialLog("machine.y: " + machine.currentPosition.y);
                draw.previousTime = currentTime;
                //serialLog("t: " + draw.previousTime);
            }

            
        }
    }

    export function updateParameters() {
        //serialLog("updateParameters()");
        //serialLog("draw.figureNumberOfIndexes= " + draw.figureNumberOfIndexes);
        //serialLog("draw.targetPointIndex= " + draw.targetPointIndex);
        if (draw.targetPointIndex < draw.figureNumberOfIndexes - 1) {
            draw.targetPointIndex += 1;

            setNewTargetPoint();
            setupBresenhamForPoint();
            changeDirection();

            if (draw.targetPointIndex > 0 && !draw.penDown) {
                lowerPen();
            }

        } else {
            //serialLog("Updates figureNumberOfIndexes");

            liftPen();

            if (draw.figureIndex < draw.figureStack.length - 1) {

                draw.targetPointIndex = -1;
                draw.figureIndex += 1;
                draw.figureNumberOfIndexes = draw.figureStack[draw.figureIndex].numberOfIndexes;
                serialLog("new " + draw.figureStack[draw.figureIndex].figureType);
                serialLog("position " + draw.figureStack[draw.figureIndex].x + "," + draw.figureStack[draw.figureIndex].y);
                //coordinateString += "" + draw.figureStack[draw.figureIndex].figureType + "\r\n";


            } else {
                serialLog("Finished all drawings :)");
                serialLog(coordinateString);

                draw.running = false;

            }
        }
    }

    function setNewTargetPoint() {
        if (draw.figureStack.length > 0) {
            draw.targetPoint = draw.figureStack[
                draw.figureIndex
            ].calculatePointFromIndex(draw.targetPointIndex);
            //coordinateString += "" + draw.targetPoint.x + "," + draw.targetPoint.y + "\r\n";
            //serialLog("" + draw.targetPoint.x + "," + draw.targetPoint.y);
            //serialLog("current: " + machine.currentPosition.x + "," + machine.currentPosition.y);
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
            pinStates.pin14 = 0;
            machine.direction.x = 1;
        }
        else if (!xDifference && machine.direction.x === 1) {
            pinStates.pin14 = 1;
            machine.direction.x = -1;
        }

        const yDifference = draw.targetPoint.y >= machine.currentPosition.y;

        // Y-axis has inverted direction for stepper motor.
        if (yDifference && machine.direction.y === -1) {
            pinStates.pin16 = 1;
            machine.direction.y = 1;
        }
        else if (!yDifference && machine.direction.y === 1) {
            pinStates.pin16 = 0;
            machine.direction.y = -1;
        }
        //serialLog("dirx, diry: " + machine.direction.x + "," + machine.direction.y);
    }

    function activatePin(pin: DigitalPin, value: number) {
        pins.digitalWritePin(pin, value);
    }



    enum penLifted {
        //% block="lift"
        true,
        //% block="pendown"
        false,
    }

    

    /**
     * TODO: describe your function here
     * Logic calculates if x-stepper and y-stepper should run.
     * If so, each function is called individually to update the positions
     * of the drawing head by updating the "pinStates"-object.
     * For each pulse the information about pin states should be 
     * sent over I2C to the PCA9557 chip as one 8-bit number.
     * This means that global variables about pin states are
     * updated when turnStepperX() and turnStepperY() is called.
     * function turnStepperX() {
            machine.currentPosition.x += machine.direction.x * animation.stepSize;
        }
        function turnStepperY() {
            machine.currentPosition.y += machine.direction.y * animation.stepSize;
        }

        Using function inside pins.cpp
        void digitalWritePin(DigitalPin name, int value) {
            PINOP(setDigitalValue(value));
        }
        HIGH = Mot Klokka
        LOW = Med Klokka
     */
    //% help=stepSteppers/draw weight=77
    //% block="Step steppers"  icon="\uf204" blockGap=8
    export function stepSteppers() {
        // Read from pinStates object and write using digitalWrite()
        pins.digitalWritePin(DigitalPin.P13, pinStates.pin13);
        pins.digitalWritePin(DigitalPin.P14, pinStates.pin14);
        pins.digitalWritePin(DigitalPin.P15, pinStates.pin15);
        pins.digitalWritePin(DigitalPin.P16, pinStates.pin16);

    }

    //% help=setPinStates/draw weight=77
    //% block="setPinStates|pin8 %pin8|pin9 %pin9|pin15 %pin15|pin16 %pin16" icon="\uf1db" blockGap=8
    export function setPinStates(pin13: DigitalPin, pin14: number, pin15: number, pin16: number): void {
        pinStates.pin13 = draw.pulseHigh;
        pinStates.pin14 = pin14;
        pinStates.pin15 = pin15;
        pinStates.pin16 = pin16;
    }

    export function serialLog(text : string) {
        serial.writeString(text);
        serial.writeString("\r\n")
    }

    //% blockId="setI2CPins" block="set i2c data to %sdaPin and clock to %sclPin|"
    //% shim=i2crr::setI2CPins
    //% sdaPin.defl=DigitalPin.P1 sclPin.defl=DigitalPin.P2
    //% group="micro:bit (V2)"
    export function setI2CPins(sdaPin: DigitalPin, sclPin: DigitalPin): void {
        // Per https://github.com/microsoft/pxt-microbit/issues/4292
        0;
    }

    function liftPen(): void {
        //% Lifts the pen by moving the servo "upwards"
        servos.P0.setAngle(150);
    }

    function lowerPen(): void {
        //% Lowers the pen by moving the servo to middle position.
        servos.P0.setAngle(90);
    }

    function micros() {
        // Get time ellapsed since app start in microseconds.
        return input.runningTimeMicros();
    }

    function millis() {
        // Get time ellapsed since app start in milliseconds.
        return input.runningTime();
    }

    let PCA9557_ADDR = 24
    let CONFIGURATION_MODE = 3
    let PIN_CONFIGURATION = 219
    let OUTPUT_REGISTER = 1
    let INPUT_REGISTER = 0
    let pca_buffer = pins.createBuffer(2);


    // Set registers: first write config byte, then sequential write PIN CONFIG.
    //% block
    export function setreg(): void {
        pca_buffer[0] = 3;
        pca_buffer[1] = PIN_CONFIGURATION;
        pins.i2cWriteBuffer(PCA9557_ADDR, pca_buffer);
    }

    // Read register. Write config byte, then read register
    //% block
    export function getreg(): number {
        pins.i2cWriteNumber(PCA9557_ADDR, INPUT_REGISTER, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(PCA9557_ADDR, NumberFormat.UInt8BE);
    }

    // Write to register. Write config byte, then sequential write PIN CONFIG. IO5 LOW IO2 HIGH
    //% block
    export function ledON(): void {
        pca_buffer[0] = OUTPUT_REGISTER;
        pca_buffer[1] = 4;
        pins.i2cWriteBuffer(PCA9557_ADDR, pca_buffer);
    }

    // Read register. Write config byte, then sequential write PIN CONFIG. IO5 HIGH IO2 LOW
    //% block
    export function ledOff(): void {
        pca_buffer[0] = OUTPUT_REGISTER;
        pca_buffer[1] = 32;
        pins.i2cWriteBuffer(PCA9557_ADDR, pca_buffer);
    }








}

