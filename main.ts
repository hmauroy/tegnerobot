i2crr.setI2CPins(DigitalPin.P2, DigitalPin.P1)
basic.showIcon(IconNames.Heart)
// 0x18
// Configuration register for Ports, hex: 0x03.
pins.i2cWriteNumber(
24,
3,
NumberFormat.UInt8BE,
true
)
basic.pause(1)
// Configures io ports: 0=output, 1=input
// 0b11011011, Set IO2 and IO5 as outputs, all other pins as inputs. 0=output, 1=input
pins.i2cWriteNumber(
24,
219,
NumberFormat.UInt8BE,
true
)
basic.pause(1)
let verdi = pins.i2cReadNumber(0, NumberFormat.Int8LE, false)
basic.pause(1)
basic.forever(function () {
    // 0b00000100); // Decimal 4. Set IO2 high and IO5 low, all other pins unchanged, (io7 io6 io5 io4 io3 io2 io1 io0)
    // Turn IO2 LED on, and IO5 LED off
    pins.i2cWriteNumber(
    24,
    4,
    NumberFormat.UInt8BE,
    false
    )
    basic.pause(500)
    // Turn IO2 LED off, and IO5 LED on.
    // 0b00100000
    pins.i2cWriteNumber(
    24,
    32,
    NumberFormat.UInt8BE,
    false
    )
})
