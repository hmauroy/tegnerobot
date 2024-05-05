




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
        pin13: 0,
        pin14: 0,
        pin15: 0,
        pin16: 1
    };





    export const draw = {
        pulseInterval: 800,
        penDown: false,
        running: true,
        targetPoint: { x: 0, y: 0 },
        previousTime: 0,
        pulseHigh: 1

    };


     export const bresenham = {
        err: 0,
        dx: 0,
        dy: 0,
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
    }

    /**
    * Move head to
    * @param xPosition - Coordinate on X axis in pixel coordinates
    * @param yPosition - Coordinate on y axis in pixel coordinates
    */
    //% block="Move Head To|x coordinate %xPosition|y coordinate %yPosition" blockGap=8
    //% xPosition.min=0 yPosition.min=0
    export function moveHeadTo(xPosition: number, yPosition: number) {


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


    // Figures definitions
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

        const stepsPerMM = Math.ceil(5000 / 62.0);
        const origin = { x: xPosition * stepsPerMM, y: yPosition * stepsPerMM };
        const size = lengthOfSide * stepsPerMM;
        let index = 1;
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





}

