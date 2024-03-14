
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
        let txLast: number = Date.now() * 1000; // time in microseconds.
        let tyLast: number = Date.now() * 1000;
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

    function digitalWrite(ioPin:number, state: boolean) {
        // Set IO HIGH or LOW using I2C.
        console.log(state)
    }

    function micros() {
        // Get time ellapsed since app start in microseconds.
        return 1000
    }


    



}

