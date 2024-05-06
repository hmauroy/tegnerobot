input.onButtonPressed(Button.A, function () {
    tegneRobot.draw.pulseInterval = 400;
})
input.onButtonPressed(Button.B, function () {
    tegneRobot.draw.pulseInterval = 150;
})
serial.writeLine("Initiated drawing robot!")
tegneRobot.triangle(
0,
0,
50,
10,
10,
30,
0,
true
)
tegneRobot.moveHeadTo(10, 0)
tegneRobot.moveHeadTo(0, 0)
tegneRobot.triangle(
10,
70,
60,
70,
10,
40,
0,
true
)
tegneRobot.homeHead()
