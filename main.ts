i2crr.setI2CPins(DigitalPin.P2, DigitalPin.P1)
let pca_register = 492
tegneRobot.setreg()
pca_register = tegneRobot.getreg()
basic.showNumber(pca_register)
basic.forever(function () {
    tegneRobot.ledON()
    basic.pause(100)
    tegneRobot.ledOff()
    basic.pause(100)
})
