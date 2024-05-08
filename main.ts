input.onButtonPressed(Button.B, function () {
    isWaiting = false
})
let isWaiting = false
serial.writeLine("Initiated drawing robot!")
isWaiting = true
serial.writeLine("RAM size: " + control.ramSize() + " bits = " + control.ramSize() / 1024000 + " kB")
while (isWaiting) {
    // Do nothing
    control.waitMicros(10000)
}
basic.showIcon(IconNames.Heart)
