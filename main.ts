i2crr.setI2CPins(DigitalPin.P2, DigitalPin.P1)
let pca_register = 492
tegneRobot.setreg()
pca_register = tegneRobot.getreg()
basic.showNumber(pca_register)
pins.analogWritePin(AnalogPin.P0, 1023)
pins.analogSetPeriod(AnalogPin.P0, 500)
