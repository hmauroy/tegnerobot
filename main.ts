let x = 0
let y = 0
let radius = 0.5
for (let i = 0; i < 6; i++) {
    tegneRobot.circle(x, y, radius, true)
    x += 2
    y += 3
    radius += 0.5
}
