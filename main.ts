let radius = 0.5
for (let index = 0; index < 6; index++) {
    tegneRobot.stepSteppers()
    tegneRobot.setPinStates(
    DigitalPin.P0,
    DigitalPin.P0,
    DigitalPin.P0,
    DigitalPin.P0
    )
    tegneRobot.stepSteppers()
    tegneRobot.setPinStates(
    DigitalPin.P0,
    DigitalPin.P0,
    DigitalPin.P0,
    DigitalPin.P0
    )
}
servos.P0.setAngle(150)
