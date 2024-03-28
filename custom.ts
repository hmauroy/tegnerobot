
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

enum liftPen {
    //% block="lift"
    true,
    //% block="pendown"
    false,
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
    //% block="circle|centerX %x|centerY %y|radius %r|liftPen %lift" icon="\uf1db" blockGap=8
    //% x.min=0 x.max=16 y.min=0 y.max=12 r.min=0 r.max=8
    //% x.fieldOptions.precision=1 y.fieldOptions.precision=1 
    export function circle(x: number, y: number, r: number, lift = false): void {
        let isDrawing = false;
    }

    /**
     * TODO: describe your function here
     * @param nx: number of steps in x-axis, e.g. 42
     * @param ny: number of steps in y-axis, e.g. 42
     * @param timePerStepX: time in microseconds for one step in x-axis, e.g. 2000
     * @param timePerStepX: time in microseconds for one step in x-axis, e.g. 2000
     */
    //% help=runSteppers/draw weight=77
    //% block="Run steppers | nx %nx| ny %ny| timePerStepX %timePerStepX| timePerStepY %timePerStepY" icon="\uf204" blockGap=8
    
    export function runSteppers(nx: number, ny: number, timePerStepX: number, timePerStepY:number): void {
        let dirX = "CCW"
        let dirY = "CCW"
        let pauseX = Math.round(timePerStepX / 2)  // Divide by 2 because step signal is 2 x delayMicroseconds.
        let pauseY = Math.round(timePerStepY / 2)
        let dirXpin = 1
        let dirYpin = 2
        if (nx > 0) {
            digitalWrite(dirXpin, true) // Set the spinning direction clockwise (x- and y-axis are wired opposite at the moment).
            dirX = "CW"
        }
        else if (nx < 0) {
            digitalWrite(dirXpin, false) // CCW
            dirX = "CCW"
        }
        else {
            dirX = "STILL"
        }
        if (ny > 0) {
            digitalWrite(dirYpin, false) // Set the spinning direction counter clockwise
            dirY = "CCW"
        }
        else if (ny < 0) {
            digitalWrite(dirYpin, true) // CCW
            dirY = "CW"
        }
        else {
            dirY = "STILL"
        }
        // Takes absolute values of both nsteps and pauseTime.
        nx = Math.abs(nx)
        ny = Math.abs(ny)
        pauseX = Math.abs(pauseX)
        pauseY = Math.abs(pauseY)

        let isRunning: boolean = true;
        let sigX: boolean = true;
        let sigY: boolean = true;
        let txLast: number = micros() * 1000; // time in microseconds.
        let tyLast: number = micros() * 1000;
        let delta_tx: number = 0;
        let delta_ty: number = 0;

    }

    /**
     * TODO: describe your function here
     * @param x: x-coordinate, e.g. 60
     * @param x: y-coordinate, e.g. 80
     */
    //% block
    export function moveXY(x: number, y: number): void {
        for (let i = 0; i < 10; i++) {
            runSteppers(42,96,3000,1500);
        }
    }

    //% blockId="setI2CPins" block="set i2c data to %sdaPin and clock to %sclPin|"
    //% shim=i2crr::setI2CPins
    //% sdaPin.defl=DigitalPin.P1 sclPin.defl=DigitalPin.P2
    //% group="micro:bit (V2)"
    export function setI2CPins(sdaPin: DigitalPin, sclPin: DigitalPin): void {
        // Per https://github.com/microsoft/pxt-microbit/issues/4292
        0;
    }

    function digitalWrite(ioPin:number, state: boolean) {
        // Set IO HIGH or LOW using I2C.
        console.log(state)
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

    
    //% block
    export function pauseMicroseconds(microseconds: number) {
        let startTime = input.runningTimeMicros();
        let endTime = startTime + microseconds;

        while (input.runningTimeMicros() < endTime) {
            // Wait until desired time has passed
        }
    }

    function line_bresenham(x0:number, y0:number, x1:number, y1:number) {
        console.log(x0, y0, x1, y1);

        let dx = Math.abs(x1 - x0);
        let dy = -Math.abs(y1 - y0);
        let sx = 0;
        let sy = 0;

        if (x0 < x1) {
            sx = 1;
        } else {
            sx = -1;
        }

        if (y0 < y1) {
            sy = 1;
        } else {
            sy = -1;
        }

        let e = dx + dy;
        let e2 = 2 * e;

        let isDrawing = true;
        let teller = 0;
        while (isDrawing) {
            teller += 1;
            if (teller >= 10000) {
                isDrawing = false;
            }
            //console.log(x0, y0);
            //let p = document.createElement("p");
            //p.innerHTML = x0 + "," + y0;
            //output.appendChild(p);
            // Run steppers one step: x, or y, or both.
            //changeCellColor(x0, y0);
            if (x0 === x1 && y0 === y1) {
                isDrawing = false;
                break;
            }
            // Update error
            e2 = 2 * e;
            if (e2 >= dy) {
                // if reached target x
                if (x0 === x1) {
                    isDrawing = false;
                    break;
                }
                // update y-error when x is changed
                e = e + dy;
                x0 = x0 + sx;
            }
            if (e2 <= dx) {
                // if reached target y
                if (y0 === y1) {
                    isDrawing = false;
                    break;
                }
                // update x-error when y is changed
                e = e + dx;
                y0 = y0 + sy;
            }
        }
    }





    



}

