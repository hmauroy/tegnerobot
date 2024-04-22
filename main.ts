let y = 0
let x = 0
let radius = 0.5
for (let index = 0; index < 6; index++) {
    tegneRobot.circle(
    x,
    y,
    radius,
    true
    )
    x += 2
    y += 3
    radius += 0.5
}
servos.P0.setAngle(150)
