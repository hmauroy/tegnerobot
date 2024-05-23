tegneRobot.startDrawing()
let xpos = 30
let ypos = 30
for (let index = 0; index < 5; index++) {
    tegneRobot.circle(
    xpos,
    ypos,
    15,
    true
    )
    xpos += 10
    ypos += 5
}
tegneRobot.endDrawing()
