let yHigh = 0
let xHigh = 0
let radius = 0.5
let high = 1
high = 1
for (let index = 0; index < 100; index++) {
    xHigh = 1
    yHigh = 1
    tegneRobot.stepSteppers()
    tegneRobot.setPinStates(
    xHigh,
    high,
    yHigh,
    high
    )
    tegneRobot.stepSteppers()
    control.waitMicros(500)
    xHigh = 0
    yHigh = 0
    tegneRobot.setPinStates(
    xHigh,
    high,
    yHigh,
    high
    )
    control.waitMicros(500)
}
servos.P0.setAngle(150)
for (let index = 0; index < 100; index++) {
    let low = 0
    xHigh = high
    yHigh = high
    tegneRobot.stepSteppers()
    tegneRobot.setPinStates(
    xHigh,
    high,
    yHigh,
    high
    )
    tegneRobot.stepSteppers()
    control.waitMicros(500)
    xHigh = low
    yHigh = low
    tegneRobot.setPinStates(
    xHigh,
    high,
    low,
    low
    )
    control.waitMicros(500)
}
