function configureOutput () {
    pins.i2cWriteNumber(
    PCA9577_ADDR,
    CONFIGURATION_MODE,
    NumberFormat.UInt8BE,
    false
    )
    // Decimal 219. Set IO2 and IO5 as outputs, all other pins as inputs. 0=output, 1=input
    pins.i2cWriteNumber(
    PCA9577_ADDR,
    219,
    NumberFormat.UInt8BE,
    true
    )
}
function turnOffLEDs () {
    pins.i2cWriteNumber(
    PCA9577_ADDR,
    OUTPUT_REGISTER,
    NumberFormat.UInt8BE,
    false
    )
    // Decimal 32. Set io2 low and io5 high
    pins.i2cWriteNumber(
    PCA9577_ADDR,
    32,
    NumberFormat.UInt8BE,
    true
    )
}
function turnOnLEDs () {
    pins.i2cWriteNumber(
    PCA9577_ADDR,
    OUTPUT_REGISTER,
    NumberFormat.UInt8BE,
    false
    )
    // Decimal 4. Set IO2 high and IO5 low, all other pins unchanged, (io7 io6 io5 io4 io3 io2 io1 io0)
    pins.i2cWriteNumber(
    PCA9577_ADDR,
    4,
    NumberFormat.UInt8BE,
    true
    )
}
let OUTPUT_REGISTER = 0
let CONFIGURATION_MODE = 0
let PCA9577_ADDR = 0
let led2_state = false
i2crr.setI2CPins(DigitalPin.P2, DigitalPin.P1)
// Address of PCA9577 chip
PCA9577_ADDR = 24
// Configuration register: which mode is pins operated at?
CONFIGURATION_MODE = 3
OUTPUT_REGISTER = 1
let led1_state = true
// Setup
configureOutput()
// Loop
basic.forever(function () {
    if (led1_state == true) {
        // Turn off LEDs connected to IO2 and IO5
        turnOffLEDs()
    } else {
        // Turn on LEDs connected to IO2 and IO5
        turnOnLEDs()
    }
    // delay
    basic.pause(500)
    // Toggle state
    led1_state = !(led1_state)
})
