




/**
 * Custom blocks
 */
//% weight=100 color=#0fbc11 icon="\uf247"
namespace tegneRobot {

    /**
    * Created by BG8 2024 UiT
    * Henrik Mauroy, hmauroy@gmail.com
    * Oliver Sokol
    * Mads Hansen
    * Use this file to define custom functions and blocks.
    * Read more at https://makecode.microbit.org/blocks/custom
    */

    enum MyEnum {
        //% block="one"
        One,
        //% block="two"
        Two,
    }


    const machine = {
        currentPosition: { x: 0, y: 0 },
        direction: { x: 1, y: 1 },
    };

    const pinStates = {
        //% stepper pins: pin13=stepperX, pin15=stepperY, pin14=dirX, pin16=dirY
        stepperX: 0,
        dirX: 0,
        stepperY: 0,
        dirY: 0
    };



    export const draw = {
        pulseInterval: 800,
        penDown: false,
        isDrawing: true,
        targetPoint: { x: 0, y: 0 },
        previousTime: 0,
        pulseHigh: true,
        nextXStep: 0,
        nextYStep: 0,
    };


    export const bresenham = {
        err: 0,
        err2: 0,
        dx: 0,
        dy: 0,
        sx: 0,
        sy: 0
    };

    enum penLifted {
        //% block="lift"
        true,
        //% block="pendown"
        false,
    }

    //% help=HomeHead/draw weight=77
    //% block="Home Head"  icon="\uf204" blockGap=8
    export function homeHead() {
        /*
         * Moves head to 0,0 (upper left corner).
         * Moves steppers too much into negative direction.
         */
        liftPen();
        moveHeadTo(0, 0);
    }

    /**
    * Move head to xoordinate
    * @param xPosition - Coordinate on X axis in pixel coordinates. Float is accepted as input.
    * @param yPosition - Coordinate on y axis in pixel coordinates
    */
    //%help = moveHeadTo / draw weight = 77
    //% block="Move Head To|xCoordinate %xPosition|yCoordinate %yPosition" blockGap=8
    //% xPosition.min=0 yPosition.min=0
    //% xPosition.fieldOptions.precision=1 yPosition.fieldOptions.precision=1 
    export function moveHeadTo(xPosition: number, yPosition: number) {
        draw.targetPoint.x = Math.ceil(xPosition);
        draw.targetPoint.y = Math.ceil(yPosition);
        bresenham.dx = Math.abs(draw.targetPoint.x - machine.currentPosition.x);
        bresenham.dy = -Math.abs(draw.targetPoint.y - machine.currentPosition.y); // NB! Negative value!
        bresenham.err = bresenham.dx + bresenham.dy;
        let realDx = draw.targetPoint.x - machine.currentPosition.x;
        let realDy = draw.targetPoint.y - machine.currentPosition.y;
        //serialLog("target x,y: " + draw.targetPoint.x + "," + draw.targetPoint.y);
        //serialLog("dx, dy: " + realDx + "," + realDy);

        if (machine.currentPosition.x < draw.targetPoint.x) {
            bresenham.sx = 1;
            pinStates.dirX = 0;
        }
        else {
            bresenham.sx = -1;
            pinStates.dirX = 1;
        }
        if (machine.currentPosition.y < draw.targetPoint.y) {
            bresenham.sy = 1;
            pinStates.dirY = 1;
        }
        else {
            bresenham.sy = -1;
            pinStates.dirY = 0;
        }

        //serialLog("dirx: " + bresenham.sx);
        //serialLog("diry: " + bresenham.sy);

        // Initializes the steps.
        draw.isDrawing = runBresenham(); // Updates global variables nextXStep, nextYStep to either +1, -1 or 0 for a step or not.


        while (draw.isDrawing) {
            if (draw.pulseHigh) {
                //draw.previousTime = micros();
                //draw.previousTime = millis();
                draw.pulseHigh = !draw.pulseHigh; // Flips logic.
                pinStates.stepperX = 0;
                pinStates.stepperY = 0;
                stepSteppers();
            }
            else {
                //draw.previousTime = micros();
                //draw.previousTime = millis();

                // Turns puls on or off. NB! Only 1 pulse/pixel.
                pinStates.stepperX = Math.abs(draw.nextXStep); // Absolute value because nextXStep can be +1/-1 or 0.
                pinStates.stepperY = Math.abs(draw.nextYStep);
                draw.pulseHigh = !draw.pulseHigh; // flips logic
                //serialLog("current x,y: " + machine.currentPosition.x + "," + machine.currentPosition.y);
                stepSteppers();

                // Calculate next step while we wait for next update.
                draw.isDrawing = runBresenham();
            }
            control.waitMicros(400);

        } // END while (isDrawing)

        //serialLog("Finished move to.")
        //serialLog("current x,y: " + machine.currentPosition.x + "," + machine.currentPosition.y);
    }

    function runBresenham(): boolean {
        // Calculates steps in x and y directions. 0, -1 or 1
        // Updates global variables dx, dy, and error variable err.
        //serialLog("Bresenham current x,y: " + machine.currentPosition.x + "," + machine.currentPosition.y);
        //serialLog("Target x,y: " + draw.targetPoint.x + "," + draw.targetPoint.y);
        bresenham.err2 = 2 * bresenham.err;
        draw.nextXStep = 0;
        draw.nextYStep = 0;

        if (machine.currentPosition.x === draw.targetPoint.x && machine.currentPosition.y === draw.targetPoint.y) {
            return false;
        }
        if (bresenham.err2 >= bresenham.dy) {
            if (machine.currentPosition.x === draw.targetPoint.x) {
                return false;
            }
            // Update step and error
            bresenham.err = bresenham.err + bresenham.dy;
            machine.currentPosition.x = machine.currentPosition.x + bresenham.sx;
            draw.nextXStep = bresenham.sx;
        }
        if (bresenham.err2 <= bresenham.dx) {
            if (machine.currentPosition.y === draw.targetPoint.y) {
                return false;
            }
            bresenham.err = bresenham.err + bresenham.dx;
            machine.currentPosition.y = machine.currentPosition.y + bresenham.sy;
            draw.nextYStep = bresenham.sy;
        }
        return true;
    }





    /**
     * Logic calculates if x-stepper and y-stepper should run.
     * If so, each function is called individually to update the positions
     * of the drawing head by updating the "pinStates"-object.
     * For each pulse the information about pin states should be 
     * sent over I2C to the PCA9557 chip as one 8-bit number.

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
        //serialLog("stepperX: " + pinStates.stepperX + ", stepperY: " + pinStates.stepperY);
        // Read from pinStates object and write using digitalWrite()
        pins.digitalWritePin(DigitalPin.P13, pinStates.stepperX);
        pins.digitalWritePin(DigitalPin.P14, pinStates.dirX);
        pins.digitalWritePin(DigitalPin.P15, pinStates.stepperY);
        pins.digitalWritePin(DigitalPin.P16, pinStates.dirY);

    }

    //% help=setPinStates/draw weight=77
    //% block="setPinStates|pin8 %pin8|pin9 %pin9|pin15 %pin15|pin16 %pin16" icon="\uf1db" blockGap=8
    export function setPinStates(pin13: DigitalPin, pin14: number, pin15: number, pin16: number): void {
        pinStates.stepperX = pin13;
        pinStates.dirX = pin14;
        pinStates.stepperY = pin15;
        pinStates.dirY = pin16;
    }

    export function serialLog(text: string) {
        serial.writeLine(text);
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
        serialLog("Pen lifted.")
        servos.P0.setAngle(150);
    }

    function lowerPen(): void {
        //% Lowers the pen by moving the servo to middle position.
        serialLog("Pen lowered.")
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


    // Figures definitions
    /**
    * Draws a square
    * @param xPosition - Coordinate on X axis
    * @param yPosition - Coordinate on y axis
    * @param lengthOfSide - length of size in mm. 5000 steps = 62.0 mm Y-axis, 64.6 mm X-axis approximately. Must be set by user after running calibrationX() and calibrationY() blocks once. # TODO: Not implemented yet.
    * @param rotation - rotation of square calculated by rotating around center point calculated by averaging all 4 corners. #TODO: not implemented yet. 
    */
    //% block="Square|x Coordinate %xPosition|y Coordinate %yPosition| length of side %lengthOfSide| rotation %rotation |penLifted %lift" blockGap=8
    //% xPosition.min=0 yPosition.min=0 radius.min=1 lengthOfSide.defl=10
    export function square(xPosition: number, yPosition: number, lengthOfSide: number, rotation: number = 0, lift = false): void {
        lowerPen();
        const stepsPerMM = Math.ceil(5000 / 62.0);
        const origin = { x: xPosition * stepsPerMM, y: yPosition * stepsPerMM };
        const size = lengthOfSide * stepsPerMM;
        moveHeadTo(origin.x, origin.y);
        moveHeadTo(origin.x + size, origin.y);
        moveHeadTo(origin.x + size, origin.y + size);
        moveHeadTo(origin.x, origin.y + size);
        moveHeadTo(origin.x, origin.y);
        if (lift) {
            liftPen();
        }
        serialLog("Finished square");

    }


    /**
     * Draws a circle
     * @param x coordinate
     * @param y coordinate
     * @param r radius
     * @param lift if pen should lift after drawing finished
     */
    //% help=circle/draw weight=77
    //% block="Circle|centerX %x|centerY %y|radius %r|penLifted %lift" icon="\uf1db" blockGap=8
    //% x.min=0 x.max=120 y.min=0 y.max=100 r.min=3 r.max=50
    //% x.fieldOptions.precision=1 y.fieldOptions.precision=1 r.defl=3
    export function circle(centerX: number, centerY: number, r: number, lift = false): void {
        lowerPen();
        const stepsPerMM = Math.ceil(5000 / 62.0);
        const origin = { x: centerX * stepsPerMM, y: centerY * stepsPerMM };
        const segment_length = 2;
        const n_segments = (2 * Math.PI * r) / segment_length;
        const n = Math.ceil(n_segments);
        const d_theta = 2 * Math.PI / n;
        let theta = 0;

        const radius = Math.ceil(r * stepsPerMM);
        let x0 = origin.x + radius;
        let y0 = origin.y

        // Run for loop of n line segments.
        for (let i = 0; i < n; i++) {
            theta = theta + d_theta;
            draw.targetPoint.x = radius * Math.cos(theta) + origin.x;
            draw.targetPoint.y = radius * Math.sin(theta) + origin.y;
            moveHeadTo(draw.targetPoint.x, draw.targetPoint.y);
        }

        if (lift) {
            liftPen();
        }
        serialLog("Finished circle");




    }








}

