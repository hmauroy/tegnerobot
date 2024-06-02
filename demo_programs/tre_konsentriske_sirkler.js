tegneRobot.startDrawing()
let x = 60
let y = 60
let radius = 30
for (let index = 0; index < 3; index++) {
    tegneRobot.circle(
        x,
        y,
        radius,
        false
    )
    radius += 10
}
tegneRobot.endDrawing()