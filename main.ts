input.onButtonPressed(Button.A, function () {
    waitTime += 50
})
input.onButtonPressed(Button.B, function () {
    waitTime += -50
})
// Initialize serial comms.
serial.writeString("Serial initialized")
serial.writeString("" + ("\r\n"))
let radius = 0.5
let high = 1
high = 1
let waitTime = 400
figures.drawSquare(
10,
10,
1,
0
)
tegneRobot.startDrawing()
