tegneRobot.startDrawing()
for (let index = 0; index < 3; index++) {
    tegneRobot.square(
        5,
        5,
        80,
        0,
        true
    )
}
for (let index = 0; index < 3; index++) {
    tegneRobot.circle(
        50,
        50,
        20,
        true
    )
}
tegneRobot.endDrawing()
