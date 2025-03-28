/**
 * SVG Path Parser - Converts SVG path commands to points for filling
 * Supports: M (move), L (line), C (cubic bezier)
 */
class SVGPathParser {
    /**
     * Parse an SVG path command array into a flattened array of points
     * @param {Array} pathCommands - Array of SVG path commands (e.g. ['M',x,y,'C',x1,y1,x2,y2,x,y,...])
     * @param {number} flatness - Lower values produce smoother curves (default: 0.5)
     * @returns {Array} Array of {x,y} points representing the flattened path
     */
    static parseCommands(pathCommands, flatness = 0.5) {
        const points = [];
        let currentX = 0;
        let currentY = 0;
        let firstX = 0;
        let firstY = 0;
        let i = 0;
        
        while (i < pathCommands.length) {
            const command = pathCommands[i];
            
            switch (command) {
                case 'M': // MoveTo absolute
                    currentX = pathCommands[i + 1];
                    currentY = pathCommands[i + 2];
                    firstX = currentX; // Remember start point for path closure
                    firstY = currentY;
                    points.push({ x: currentX, y: currentY });
                    i += 3;
                    break;
                    
                case 'm': // MoveTo relative
                    currentX += pathCommands[i + 1];
                    currentY += pathCommands[i + 2];
                    firstX = currentX;
                    firstY = currentY;
                    points.push({ x: currentX, y: currentY });
                    i += 3;
                    break;
                    
                case 'L': // LineTo absolute
                    currentX = pathCommands[i + 1];
                    currentY = pathCommands[i + 2];
                    points.push({ x: currentX, y: currentY });
                    i += 3;
                    break;
                    
                case 'l': // LineTo relative
                    currentX += pathCommands[i + 1];
                    currentY += pathCommands[i + 2];
                    points.push({ x: currentX, y: currentY });
                    i += 3;
                    break;
                    
                case 'C': // CurveTo absolute - cubic Bézier
                    {
                        const x1 = pathCommands[i + 1];
                        const y1 = pathCommands[i + 2];
                        const x2 = pathCommands[i + 3];
                        const y2 = pathCommands[i + 4];
                        const x = pathCommands[i + 5];
                        const y = pathCommands[i + 6];
                        
                        // Flatten the cubic Bézier curve into line segments
                        const bezierPoints = this.flattenCubicBezier(
                            currentX, currentY, x1, y1, x2, y2, x, y, flatness
                        );
                        
                        // Add the points (excluding the first one, which is the current point)
                        for (let j = 1; j < bezierPoints.length; j++) {
                            points.push(bezierPoints[j]);
                        }
                        
                        currentX = x;
                        currentY = y;
                        i += 7;
                    }
                    break;
                    
                case 'c': // CurveTo relative - cubic Bézier
                    {
                        const x1 = currentX + pathCommands[i + 1];
                        const y1 = currentY + pathCommands[i + 2];
                        const x2 = currentX + pathCommands[i + 3];
                        const y2 = currentY + pathCommands[i + 4];
                        const x = currentX + pathCommands[i + 5];
                        const y = currentY + pathCommands[i + 6];
                        
                        // Flatten the cubic Bézier curve into line segments
                        const bezierPoints = this.flattenCubicBezier(
                            currentX, currentY, x1, y1, x2, y2, x, y, flatness
                        );
                        
                        // Add the points (excluding the first one, which is the current point)
                        for (let j = 1; j < bezierPoints.length; j++) {
                            points.push(bezierPoints[j]);
                        }
                        
                        currentX = x;
                        currentY = y;
                        i += 7;
                    }
                    break;
                    
                case 'Z': // ClosePath
                case 'z':
                    // If the path isn't already closed, close it
                    if (points.length > 0 && 
                        (points[points.length - 1].x !== firstX || 
                         points[points.length - 1].y !== firstY)) {
                        points.push({ x: firstX, y: firstY });
                    }
                    i += 1;
                    break;
                    
                default:
                    // Skip unknown commands
                    console.warn(`Unsupported SVG command: ${command}`);
                    i += 1;
                    break;
            }
        }
        
        return points;
    }
    
    /**
     * Flatten a cubic Bézier curve into line segments
     * @param {number} x0 - Start point x
     * @param {number} y0 - Start point y
     * @param {number} x1 - First control point x
     * @param {number} y1 - First control point y
     * @param {number} x2 - Second control point x
     * @param {number} y2 - Second control point y
     * @param {number} x3 - End point x
     * @param {number} y3 - End point y
     * @param {number} flatness - Lower values produce smoother curves
     * @returns {Array} Array of points representing the curve
     */
    static flattenCubicBezier(x0, y0, x1, y1, x2, y2, x3, y3, flatness) {
        // Adaptive recursive subdivision algorithm
        const points = [{ x: x0, y: y0 }];
        
        // Recursive function to subdivide curve until segments are flat enough
        const subdivide = (x0, y0, x1, y1, x2, y2, x3, y3, level) => {
            // Check if curve is flat enough or reached max recursion level
            if (level > 18 || this.isFlatEnough(x0, y0, x1, y1, x2, y2, x3, y3, flatness)) {
                points.push({ x: x3, y: y3 });
                return;
            }
            
            // Subdivide curve at midpoint
            const x01 = (x0 + x1) / 2;
            const y01 = (y0 + y1) / 2;
            const x12 = (x1 + x2) / 2;
            const y12 = (y1 + y2) / 2;
            const x23 = (x2 + x3) / 2;
            const y23 = (y2 + y3) / 2;
            
            const x012 = (x01 + x12) / 2;
            const y012 = (y01 + y12) / 2;
            const x123 = (x12 + x23) / 2;
            const y123 = (y12 + y23) / 2;
            
            const x0123 = (x012 + x123) / 2;
            const y0123 = (y012 + y123) / 2;
            
            // Recursive call for each half
            subdivide(x0, y0, x01, y01, x012, y012, x0123, y0123, level + 1);
            subdivide(x0123, y0123, x123, y123, x23, y23, x3, y3, level + 1);
        };
        
        subdivide(x0, y0, x1, y1, x2, y2, x3, y3, 0);
        return points;
    }
    
    /**
     * Check if a cubic Bézier curve segment is flat enough to be represented as a line
     * @param {number} x0 - Start point x
     * @param {number} y0 - Start point y
     * @param {number} x1 - First control point x
     * @param {number} y1 - First control point y
     * @param {number} x2 - Second control point x
     * @param {number} y2 - Second control point y
     * @param {number} x3 - End point x
     * @param {number} y3 - End point y
     * @param {number} flatness - Flatness threshold
     * @returns {boolean} True if the curve is flat enough
     */
    static isFlatEnough(x0, y0, x1, y1, x2, y2, x3, y3, flatness) {
        // Calculate the maximum deviation from the line between start and end points
        const ux = 3 * x1 - 2 * x0 - x3;
        const uy = 3 * y1 - 2 * y0 - y3;
        const vx = 3 * x2 - 2 * x3 - x0;
        const vy = 3 * y2 - 2 * y3 - y0;
        
        const maxSq = Math.max(ux * ux + uy * uy, vx * vx + vy * vy);
        return maxSq <= 16 * flatness * flatness;
    }
    
    /**
     * Parse a nested array format of SVG path data
     * @param {Array} svgPathArray - Array in the format [["M",x,y,"C",x1,y1,...],...]
     * @param {number} flatness - Lower values produce smoother curves
     * @returns {Array} Array of point arrays, one for each subpath
     */
    static parseNestedPathArray(svgPathArray, flatness = 0.5) {
        const subpaths = [];
        
        for (const subpathCommands of svgPathArray) {
            // Convert the subpath array to a flattened array of points
            const points = this.parseCommands(subpathCommands, flatness);
            subpaths.push(points);
        }
        
        return subpaths;
    }
    
    /**
     * Convert a string SVG path to points
     * Example: "M10,10 L20,20 C30,30 40,40 50,50 Z"
     * @param {string} svgPathString - SVG path data string
     * @param {number} flatness - Lower values produce smoother curves
     * @returns {Array} Array of {x,y} points
     */
    static parseSVGPathString(svgPathString, flatness = 0.5) {
        // Simple tokenizer for SVG path commands
        // This is a basic implementation that handles only M, L, C, Z commands
        const tokens = svgPathString.match(/([MLCZmlcz])|(-?\d+(\.\d+)?)/g) || [];
        const commands = [];
        
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (/[MLCZmlcz]/.test(token)) {
                commands.push(token);
            } else {
                commands.push(parseFloat(token));
            }
        }
        
        return this.parseCommands(commands, flatness);
    }
}

/**
 * Example usage - Replace the initDemo function with this
 */
function initDemo() {
    const canvas = document.getElementById('fillCanvas');
    const width = canvas.width;
    const height = canvas.height;
    
    // Create the filler
    const filler = new PathFiller(canvas, width, height);
    
    // Example SVG path data in array format
    // This example creates a star inside a pentagon, similar to the original example
    const svgPathData = [
        // Outer pentagon
        ["M", 250, 50, "L", 450, 150, "L", 400, 350, "L", 100, 350, "L", 50, 150, "Z"],
        
        // Inner star (drawn in the opposite direction to create a hole with even-odd rule)
        ["M", 250, 120, "L", 350, 280, "L", 170, 180, "L", 330, 180, "L", 150, 280, "Z"]
    ];
    
    // More complex example with cubic Bézier curves
    const complexSVGPath = [
        ["M", 58.1, 0.3, "C", 18.1, 0.5, 18.2, 1.1, 18.3, 1.6, "C", 18.4, 2.1, 18.5, 3, 18.6, 3.5, 
         "C", 18.7, 4, 18.7, 4.5, 18.7, 4.6, "C", 18.6, 4.7, 18.1, 4.9, 17.6, 5.1, "C", 16, 5.6, 
         14.8, 6.3, 13.4, 7.6, "C", 10.4, 10.5, 8.4, 14.7, 7, 21.4, "C", 6.7, 22.8, 6.4, 24.7, 
         6.3, 27, "C", 6.2, 28.4, 6.1, 29.7, 6.1, 29.8, "C", 6, 30, 5.4, 30, 3.5, 30, "C", 2.1, 30, 
         0.7, 30, 0.5, 30.1, "C", 0, 30.2, 0, 30.2, 0, 31.1, "L", 0, 32.1, 3, 32.1, "L", 6.1, 32.1, 
         6.2, 33.8, "C", 6.3, 35.8, 6.7, 39.4, 6.9, 40.2, "C", 7, 40.6, 7.1, 41.3, 7.2, 41.8, "C", 
         8.6, 48.6, 11.4, 54.6, 14.8, 58.1, "C", 16.9, 60.2, 18.8, 61.2, 21.4, 61.5, "C", 22.1, 61.7, 
         23.4, 61.8, 24.2, 62, "L", 25.8, 62.2, 27.2, 64.9, "C", 29.2, 68.7, 28.9, 68.3, 30.2, 68.3, 
         "C", 30.9, 68.3, 31.4, 68.3, 31.4, 68.2, "C", 31.4, 68.2, 31, 67.5, 30.5, 66.6, "C", 29.4, 
         64.9, 28.4, 62.8, 28.5, 62.7, "C", 28.5, 62.7, 29.3, 62.7, 30.2, 62.8, "C", 32.2, 63, 33.3, 
         62.9, 34.8, 62.1, "C", 39.1, 60.1, 42.4, 54.9, 44.1, 47.6, "C", 45, 43.9, 45.3, 42.2, 45.6, 
         38.1, "C", 45.8, 34.3, 45.4, 28.5, 44.8, 25.2, "C", 44.7, 24.7, 44.5, 24, 44.4, 23.5, "C", 
         43.2, 17.5, 41, 12, 38.1, 8.2, "C", 35.6, 4.8, 32.7, 2.8, 29.5, 2.4, "C", 28.3, 2.3, 28.1, 
         2.3, 26.4, 2.7, "C", 25.4, 2.9, 23.9, 3.3, 23.1, 3.5, "C", 22.3, 3.7, 21.7, 3.9, 21.6, 3.8, 
         "C", 21.6, 3.8, 22.1, 1.3, 22.4, 0.3, "C", 22.5, 0, 22.3, 0, 20.2, 0, "L", 18, 0, 18.1, 0.3]
    ];
    
    // Scale and translate the complex path to fit the canvas better
    const scaledComplexPath = scaleAndTranslatePath(complexSVGPath, 4, 100, 100);
    
    // Parse SVG paths to flattened point arrays
    const simplePaths = SVGPathParser.parseNestedPathArray(svgPathData);
    const complexPath = SVGPathParser.parseNestedPathArray(scaledComplexPath);
    
    // Combine simple paths into one path with holes
    // Note: For even-odd rule, we don't need to reverse inner paths
    const combinedSimplePath = simplePaths.flat();
    
    // Use either simple or complex path based on preference
    const pathToUse = combinedSimplePath; // or complexPath[0] for the complex SVG
    
    // Add UI controls to switch between paths
    const pathSelect = document.createElement('select');
    pathSelect.id = 'pathSelect';
    pathSelect.innerHTML = `
        <option value="simple">Simple Star & Pentagon</option>
        <option value="complex">Complex SVG Path</option>
    `;
    document.querySelector('.button-group').prepend(pathSelect);
    
    // Function to get current selected path
    const getSelectedPath = () => {
        return pathSelect.value === 'simple' ? combinedSimplePath : complexPath[0];
    };
    
    // Attach event handlers
    document.getElementById('startBtn').addEventListener('click', () => {
        filler.ctx.clearRect(0, 0, width, height);
        filler.visualizeFill(getSelectedPath(), true, true);
    });
    
    document.getElementById('fillOnlyBtn').addEventListener('click', () => {
        filler.ctx.clearRect(0, 0, width, height);
        
        const selectedPath = getSelectedPath();
        filler.fillPath(selectedPath, 'rgba(0, 200, 0, 0.8)');
        
        // Draw the original path outline
        filler.ctx.strokeStyle = 'black';
        filler.ctx.lineWidth = 2;
        filler.ctx.beginPath();
        filler.ctx.moveTo(selectedPath[0].x, selectedPath[0].y);
        for (let i = 1; i < selectedPath.length; i++) {
            filler.ctx.lineTo(selectedPath[i].x, selectedPath[i].y);
        }
        filler.ctx.closePath();
        filler.ctx.stroke();
    });
    
    document.getElementById('benchmarkBtn').addEventListener('click', () => {
        const iterations = 1000;
        const startTime = performance.now();
        const selectedPath = getSelectedPath();
        
        // Run many iterations without visualization
        for (let i = 0; i < iterations; i++) {
            filler.ctx.clearRect(0, 0, width, height);
            filler.fillPath(selectedPath, 'rgba(0, 200, 0, 0.8)');
        }
        
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        const timePerFill = totalTime / iterations;
        
        document.getElementById('benchmarkResult').textContent = 
            `Filled ${iterations} times in ${totalTime.toFixed(2)}ms. ` +
            `Average: ${timePerFill.toFixed(3)}ms per fill.`;
    });
}

/**
 * Helper function to scale and translate an SVG path
 * @param {Array} pathData - Array of SVG path commands
 * @param {number} scale - Scale factor
 * @param {number} translateX - X translation
 * @param {number} translateY - Y translation
 * @returns {Array} Transformed path data
 */
function scaleAndTranslatePath(pathData, scale, translateX, translateY) {
    return pathData.map(subpath => {
        const transformed = [];
        for (let i = 0; i < subpath.length; i++) {
            if (typeof subpath[i] === 'string') {
                transformed.push(subpath[i]);
            } else {
                // Apply scaling and translation to coordinates
                if (i % 2 === 1) { // X coordinate
                    transformed.push(subpath[i] * scale + translateX);
                } else { // Y coordinate
                    transformed.push(subpath[i] * scale + translateY);
                }
            }
        }
        return transformed;
    });
}
