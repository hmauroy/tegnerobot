/**
 * Code created by Henrik Mauroy in bachelor thesis.
 * Located in custom.ts in MakeCode Tegnerobot library.
 * Modified to only return an array of points.
 *
 *
 */

/**
 * Draws the SVG from a JSON-string
 * @param svgString - Bezier curves on this format: "[[\"M\",6.962,0.115,\"C\",10.833,0.138,17.167,0.138,21.038,0.115,\"C\",24.91,0.092,21.742,0.074,14,0.074,\"C\",6.258,0.074,3.09,0.092,6.962,0.115]]"
 * Webpage exports JSON with double quotes which are escaped automatically by MakeCode editor.
 */
//% block="SVG|SVG string %svgString |penLifted %lift" blockGap=8
export function svg(svgString: string, lift = true): number[][] {
  // Define a type for the elements that can be either a string or a number.
  type SvgElement = any | number;
  // Define the interface for the array where each inner array can contain any number of SvgElement.
  type SvgArray = SvgElement[][];
  function pythagoras(dx: SvgElement, dy: SvgElement): number {
    return Math.sqrt(dx * dx + dy * dy);
  }
  let svgArr: (any | (string | number))[][] = JSON.parse(svgString);
  // Run through array
  let lastCoordinates: number[] = [];
  let coordinates: number[] = [];
  let drawCoords: (number | number)[][] = [];
  let n_segments = 1;
  let curveLength = 0;
  let x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number;
  for (let i = 0; i < svgArr.length; i++) {
    for (let j = 0; j < svgArr[i].length; j++) {
      if (svgArr[i][j] === "M") {
        // Absolute move
        //serialLog("M " + svgArr[i][j + 1] + "," + svgArr[i][j+2]);
        lastCoordinates = [svgArr[i][j + 1], svgArr[i][j + 2]];
        coordinates = [];
        j += 2;
      }
      if (svgArr[i][j] === "C") {
        // Cubic bezier
        coordinates = []; // Initialize empty array to store lastCoordinates and the next 6 control points.
        coordinates = coordinates.concat(lastCoordinates);
        coordinates = coordinates.concat([
          svgArr[i][j + 1],
          svgArr[i][j + 2],
          svgArr[i][j + 3],
          svgArr[i][j + 4],
          svgArr[i][j + 5],
          svgArr[i][j + 6],
        ]);
        //serialLog("C " + svgArr[i][j + 1] + "," + svgArr[i][j + 2]);
        //serialLog("C");
        /*
                coordinates.forEach(coord => {
                    serial.writeString("" + coord + "," );
                });
                serial.writeLine("");
                */
        lastCoordinates = [svgArr[i][j + 5], svgArr[i][j + 6]];
        // Calculate approximate length of segment and divide bezier curve into x mm long segments.
        curveLength = pythagoras(
          coordinates[6] - coordinates[0],
          coordinates[7] - coordinates[1]
        );

        let segment_length = 1;

        n_segments = Math.ceil(curveLength / segment_length);
        //n_segments = 30;
        x0 = coordinates[0];
        y0 = coordinates[1];
        x1 = coordinates[2];
        y1 = coordinates[3];
        x2 = coordinates[4];
        y2 = coordinates[5];
        x3 = coordinates[6];
        y3 = coordinates[7];
        // Calculate each point along bezier curve.
        // http://rosettacode.org/wiki/Cubic_bezier_curves#C
        for (let k = 0; k < n_segments; k++) {
          let t = k / n_segments;
          let a = Math.pow(1.0 - t, 3);
          let b = 3.0 * t * Math.pow(1.0 - t, 2);
          let c = 3.0 * Math.pow(t, 2) * (1.0 - t);
          let d = Math.pow(t, 3);

          let x = a * x0 + b * x1 + c * x2 + d * x3;
          let y = a * y0 + b * y1 + c * y2 + d * y3;

          //serialLog("" + x + "," + y);
          drawCoords.push([x, y]);
        }
        j += 6;
      }
      if (svgArr[i][j] === "L") {
        // Line
        coordinates = [
          svgArr[i][j + 1],
          svgArr[i][j + 2],
          svgArr[i][j + 3],
          svgArr[i][j + 4],
        ]; // Start and end coordinates are indicated by L segment.
        lastCoordinates = [svgArr[i][j + 3], svgArr[i][j + 4]];
        j += 4;
      }
    }
  }
  console.log(drawCoords);
  return drawCoords;
}
