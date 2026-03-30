tegneRobot.startDrawing()
let x = 50
let y = 50
let radius = 10
for (let index = 0; index < 3; index++) {
    tegneRobot.circle(
    x,
    y,
    radius,
    false
    )
    radius += 5
}
tegneRobot.endDrawing()
