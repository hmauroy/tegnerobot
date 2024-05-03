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
    }
    servos.P0.setAngle(150)
    basic.showLeds(`
        . . # . .
        . # . . .
        # # # # #
        . # . . .
        . . # . .
        `)
})
