/*
Bresenhams line algorithm 1.
Pseudocode fetched from here:
https://www.baeldung.com/cs/bresenhams-line-algorithm

Coordinate system:
UPPER LEFT (0,0)

*/

let output = document.getElementById("coordinates")

let x0 = 2
let y0 = 1
let x1 = 5
let y1 = 3

let dx = Math.abs(x1-x0)
let dy = -Math.abs(y1 - y0)
let sx = 0
let sy = 0

if (x0 < x1) {
    sx = 1
}
else {
    sx = -1
}

if (y0 < y1) {
    sy = 1
}
else {
    sy = -1
}

let e = dx + dy
let e2 = 2 * e

let isDrawing = true
while (isDrawing) {
    console.log(x0, y0)
    let p = document.createElement("p")
    p.innerHTML = x0 + "," + y0
    output.appendChild(p)
    if (x0 === x1 && y0 === y1) {
        isDrawing = false
        break
    }
    // Update error
    e2 = 2 * e
    if (e2 >= dy) {
        // if reached target x
        if (x0 === x1) {
            isDrawing = false
            break
        }
        // update y-error when x is changed
        e = e + dy
        x0 = x0 + sx
    }
    if (e2 <= dx) {
        // if reached target y
        if (y0 === y1) {
            isDrawing = false
            break
        }
        // update x-error when y is changed
        e = e + dx
        y0 = y0 + sy
    }

} 
