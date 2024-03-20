function displayDecimalNumber (num: number) {
    basic.showNumber(num)
}
// Scanning I2C addresses and displaying the first one found as a decimal number on the micro:bit display
function scanI2C () {
    for (let i = 0; i <= 127; i++) {
        pins.i2cReadNumber(i, NumberFormat.UInt8LE, false);
return i
    }
    return 1
}
i2crr.setI2CPins(DigitalPin.P2, DigitalPin.P1)
basic.showIcon(IconNames.Heart)
let address = 1
address = scanI2C()
if (address != null) {
    displayDecimalNumber(address)
} else {
    basic.showString("No I2C")
    basic.showIcon(IconNames.Sad)
}
