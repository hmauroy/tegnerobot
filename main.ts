input.onButtonPressed(Button.A, function () {
    tegneRobot.draw.pulseInterval = 200;
})
input.onButtonPressed(Button.B, function () {
    tegneRobot.draw.pulseInterval = 50;
})
serial.writeLine("Initiated drawing robot!")
