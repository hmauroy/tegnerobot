tegneRobot.startDrawing()
let xverdi = 20
let yverdi = 20
let radius = 10
for (let index = 0; index < 5; index++) {
    tegneRobot.circle(
    xverdi,
    xverdi,
    radius,
    true
    )
    xverdi += 10
    yverdi += 5
    radius += 2
}
xverdi = 20
for (let index = 0; index < 5; index++) {
    tegneRobot.circle(
    xverdi,
    xverdi,
    radius,
    true
    )
    xverdi += 5
    yverdi += 10
    radius += 2
}
tegneRobot.triangle(
0,
0,
80,
50,
30,
80,
0,
true
)
tegneRobot.square(
0,
0,
80,
0,
true
)
tegneRobot.rectangle(
5,
40,
80,
15,
0,
true
)
tegneRobot.endDrawing()
