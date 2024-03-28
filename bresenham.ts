/*
Bresenhams line algorithm 1.
Pseudocode fetched from here:
https://www.baeldung.com/cs/bresenhams-line-algorithm

Coordinate system:
UPPER LEFT (0,0)

*/

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