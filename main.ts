i2crr.setI2CPins(DigitalPin.P2, DigitalPin.P1)
while (true) {
    pins.i2cWriteNumber(
    24,
    3,
    NumberFormat.Int8LE,
    false
    )
    pins.i2cWriteNumber(
    24,
    1,
    NumberFormat.Int8LE,
    false
    )
}
