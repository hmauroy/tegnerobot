let ypos = 0
let xpos = 0
tegneRobot.startDrawing()
for (let index = 0; index < 3; index++) {
    xpos = 30
    ypos = 30
    for (let index = 0; index < 10; index++) {
        tegneRobot.circle(
        xpos,
        ypos,
        15,
        true
        )
        xpos += 10
        ypos += 5
        tegneRobot.moveHeadToMM(100, 90)
        tegneRobot.lowerPen()
        tegneRobot.moveHeadToMM(10, 90)
    }
}
tegneRobot.endDrawing()
