
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

enum penLifted {
    //% block="lift"
    true,
    //% block="pendown"
    false,
}

const pinStates = {
    //% stepper pins: pin8=stepperX, pin15=stepperY, pin9=dirX, pin16=dirY
    pin8: 0,
    pin9: 0,
    pin15: 0,
    pin16: 0
}

/**
 * Custom blocks
 */
//% weight=100 color=#0fbc11 icon="\uf247"
namespace tegneRobot {
    /**
     * Draws a circle
     * @param x coordinate
     * @param y coordinate
     * @param r radius
     * @param lift if pen should lift after drawing finished
     */
    //% help=circle/draw weight=77
    //% block="circle|centerX %x|centerY %y|radius %r|penLifted %lift" icon="\uf1db" blockGap=8
    //% x.min=0 x.max=16 y.min=0 y.max=12 r.min=0 r.max=8
    //% x.fieldOptions.precision=1 y.fieldOptions.precision=1 
    export function circle(centerX: number, centerY: number, r: number, lift = false): void {
        let isDrawing = false;
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
     */
    //% help=stepSteppers/draw weight=77
    //% block="Step steppers"  icon="\uf204" blockGap=8
    export function stepSteppers() {
        // Read from pinStates object and write using digitalWrite()
        pins.digitalWritePin(DigitalPin.P8, pinStates.pin8);
        pins.digitalWritePin(DigitalPin.P9, pinStates.pin9);
        pins.digitalWritePin(DigitalPin.P15, pinStates.pin15);
        pins.digitalWritePin(DigitalPin.P16, pinStates.pin16);

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
        return input.runningTimeMicros()
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

