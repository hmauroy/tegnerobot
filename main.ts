i2crr.setI2CPins(DigitalPin.P2, DigitalPin.P1)
basic.forever(function () {
    while (true) {
        pins.i2cWriteNumber(
        24,
        3,
        NumberFormat.UInt8BE,
        true
        )
        basic.showIcon(IconNames.Heart)
        basic.pause(100)
        basic.showIcon(IconNames.Rollerskate)
    }
})
