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
0,
0,
50,
0
)
figures.drawSquare(
0,
0,
30,
0
)
figures.drawSquare(
0,
0,
10,
0
)
figures.drawSquare(
25,
25,
25,
0
)
tegneRobot.startDrawing()
