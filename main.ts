input.onButtonPressed(Button.A, function () {
    waitTime += 50
})
input.onButtonPressed(Button.B, function () {
    waitTime += -50
})
let yHigh = 0
let xHigh = 0
let radius = 0.5
let high = 1
high = 1
let waitTime = 400
let commands = "M,U1.654,0.75M,D1.654,0.75,1.232,1.432,35.54,1.418,75,0.7275,0.72,83.525,0.569,70.614,0.345,46.309,0.22346.309,0.223,22.004,0.1,1.909,0.337,1.654,0.75M,U91.725,3.25M,D91.725,3.25,90.899,5.038,89.888,7.603,89.48,8.95189.48,8.951,89.072,10.299,85.515,14.799,81.576,18.95181.576,18.951,74.278,26.644,63,42.557,63,45.16163,45.161,63,45.953,62.592,47.028,62.093,47.5562.093,47.55,60.343,49.384,54.155,69.563,53.522,75.553.522,75.5,53.051,79.923,53.254,82.003,54.298,83.41454.298,83.414,55.371,84.866,55.492,86.314,54.797,89.40754.797,89.407,54.004,92.94,54.151,93.704,55.898,95.11855.898,95.118,57.007,96.017,57.698,96.968,57.433,97.23357.433,97.233,57.168,97.498,57.628,98.276,58.455,98.96358.455,98.963,59.579,99.896,59.701,100.691,58.936,102.119";
basic.forever(function () {
    basic.showLeds(`
        . . # . .
        . . . # .
        # # # # #
        . . . # .
        . . # . .
        `)
    for (let index = 0; index < 3000; index++) {
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
        control.waitMicros(waitTime)
        xHigh = 0
        yHigh = 0
        tegneRobot.setPinStates(
        xHigh,
        high,
        yHigh,
        high
        )
        control.waitMicros(waitTime)
    }
    servos.P0.setAngle(150)
    basic.showLeds(`
        . . # . .
        . # . . .
        # # # # #
        . # . . .
        . . # . .
        `)
    for (let index = 0; index < 3000; index++) {
        let low = 0
        xHigh = high
        yHigh = high
        tegneRobot.stepSteppers()
        tegneRobot.setPinStates(
        xHigh,
        low,
        yHigh,
        low
        )
        tegneRobot.stepSteppers()
        control.waitMicros(waitTime)
        xHigh = low
        yHigh = low
        tegneRobot.setPinStates(
        xHigh,
        low,
        yHigh,
        low
        )
        control.waitMicros(waitTime)
    }
})
