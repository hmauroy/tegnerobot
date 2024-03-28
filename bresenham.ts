/*
Bresenhams line algorithm 1.
Pseudocode fetched from here:
https://www.baeldung.com/cs/bresenhams-line-algorithm

*/

let x0 = 2
let y0 = 1
let x = 5
let y = 3

let dx = Math.abs(x-x0)
let dy = -Math.abs(y-y0)

