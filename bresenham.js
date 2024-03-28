/*
Bresenhams line algorithm 1.
Pseudocode fetched from here:
https://www.baeldung.com/cs/bresenhams-line-algorithm

Coordinate system:
UPPER LEFT (0,0)

*/

function line_bresenham(x0, y0, x1, y1) {
    console.log(x0, y0, x1, y1);

    let dx = Math.abs(x1 - x0);
    let dy = -Math.abs(y1 - y0);
    let sx = 0;
    let sy = 0;

    if (x0 < x1) {
        sx = 1;
    } else {
        sx = -1;
    }

    if (y0 < y1) {
        sy = 1;
    } else {
        sy = -1;
    }

    let e = dx + dy;
    let e2 = 2 * e;

    let isDrawing = true;
    let teller = 0;
    while (isDrawing) {
        teller += 1;
        if (teller >= 10000) {
            isDrawing = false;
        }
        console.log(x0, y0);
        //let p = document.createElement("p");
        //p.innerHTML = x0 + "," + y0;
        //output.appendChild(p);
        changeCellColor(x0, y0);
        if (x0 === x1 && y0 === y1) {
            isDrawing = false;
            break;
        }
        // Update error
        e2 = 2 * e;
        if (e2 >= dy) {
            // if reached target x
            if (x0 === x1) {
                isDrawing = false;
                break;
            }
            // update y-error when x is changed
            e = e + dy;
            x0 = x0 + sx;
        }
        if (e2 <= dx) {
            // if reached target y
            if (y0 === y1) {
                isDrawing = false;
                break;
            }
            // update x-error when y is changed
            e = e + dx;
            y0 = y0 + sy;
        }
    }
}



function generateTable(rows, cols) {
    // Create a table element
    let table = document.createElement("table");

    // Set the width and height of the cells
    let cellSize = "5px";

    // Loop through each row
    for (let i = 0; i < rows; i++) {
        // Create a table row
        let row = document.createElement("tr");

        // Loop through each column
        for (let j = 0; j < cols; j++) {
            // Create a table cell
            let cell = document.createElement("td");

            // Set the cell's size and background color
            cell.style.width = cellSize;
            cell.style.height = cellSize;
            cell.style.backgroundColor = "white";

            // Append the cell to the row
            row.appendChild(cell);
        }

        // Append the row to the table
        table.appendChild(row);
    }

    // Append the table to the document body
    document.body.appendChild(table);
}

function changeCellColor(x, y) {
    // Get all table cells
    let cells = document.getElementsByTagName("td");

    // Calculate the index of the cell to change color
    let index = y * cols + x; // Assuming cols variable is globally available

    // Check if the index is within the range of cells
    if (index >= 0 && index < cells.length) {
        // Change the background color of the cell at the calculated index to red
        cells[index].style.backgroundColor = "red";
    } else {
        console.log("Cell coordinates out of range.");
    }
}

// Example usage:
// Generate a 5x5 table
let rows = 200;
let cols = 200;
generateTable(rows, cols);

line_bresenham(5, 3, 150, 145);
line_bresenham(40, 39, 15, 145);
line_bresenham(3, 175, 120, 175);
