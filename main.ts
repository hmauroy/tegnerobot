i2crr.setI2CPins(DigitalPin.P2, DigitalPin.P1)
let pca_register = 492
tegneRobot.setreg()
pca_register = tegneRobot.getreg()
basic.showNumber(pca_register)
while (true) {
    tegneRobot.ledON()
    control.waitMicros(500000)
    tegneRobot.ledOff()
    control.waitMicros(500000)
}
