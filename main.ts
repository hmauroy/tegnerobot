// will store last time LED was updated.
function configureOutput () {
    pins.i2cWriteNumber(
    PCA9557_ADDR,
    CONFIGURATION_MODE,
    NumberFormat.UInt8BE,
    true
    )
    // Decimal 219. Set IO2 and IO5 as outputs, all other pins as inputs. 0=output, 1=input
    pins.i2cWriteNumber(
    PCA9557_ADDR,
    219,
    NumberFormat.UInt8BE,
    true
    )
}
function turnOffLEDs () {
    flipTime = input.runningTimeMicros()
    pins.i2cWriteNumber(
    PCA9557_ADDR,
    OUTPUT_REGISTER,
    NumberFormat.UInt8BE,
    true
    )
    // Decimal 32. Set IO2 low and IO5 high, all other pins unchanged, (io7 io6 io5 io4 io3 io2 io1 io0)
    pins.i2cWriteNumber(
    PCA9557_ADDR,
    32,
    NumberFormat.UInt8BE,
    true
    )
}
function turnOnLEDs () {
    flipTime = input.runningTimeMicros()
    pins.i2cWriteNumber(
    PCA9557_ADDR,
    OUTPUT_REGISTER,
    NumberFormat.UInt8BE,
    true
    )
    // Decimal 4. Set IO2 high and IO5 low, all other pins unchanged, (io7 io6 io5 io4 io3 io2 io1 io0)
    pins.i2cWriteNumber(
    PCA9557_ADDR,
    4,
    NumberFormat.UInt8BE,
    true
    )
}
let ledOnTime = 0
let led2_state = false
let previousMillis = 0
let currentMillis = 0
let flipTime = 0
let OUTPUT_REGISTER = 0
let CONFIGURATION_MODE = 0
let PCA9557_ADDR = 0
// Measuring delay of transmissions.
let delayTime = 0
basic.showIcon(IconNames.Heart)
i2crr.setI2CPins(DigitalPin.P2, DigitalPin.P1)
// Address of PCA9557 chip
PCA9557_ADDR = 24
// Configuration register: which mode is pins operated at?
CONFIGURATION_MODE = 3
OUTPUT_REGISTER = 1
// constants won't change:
// interval at which to blink alternatingly (milliseconds)
let interval = 500
let led1_state = true
configureOutput()
// Loop: Alternates IO2 and IO5 on and off.
basic.forever(function () {
    currentMillis = input.runningTime()
    if (currentMillis - previousMillis >= interval) {
        // save the last time you blinked the LED
        previousMillis = currentMillis
        // Flip led states
        led1_state = !(led1_state)
        led2_state = !(led2_state)
        // Turn off LEDs connected to IO2 and IO5
        if (led1_state == true) {
            turnOffLEDs()
        } else {
            // Record the time when LED turns ON
            ledOnTime = input.runningTime()
            // Turn on LEDs connected to IO2 and IO5
            turnOnLEDs()
        }
    }
})
