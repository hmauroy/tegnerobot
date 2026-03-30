/**
 * Path Filling Algorithm with Bezier Curve Support
 * Implementation of an optimized scanline algorithm for filling paths
 * with support for SVG-like path commands (M, L, C)
 */

class Edge {
    constructor(x1, y1, x2, y2) {
        // Ensure y1 is always the top point (smaller y)
        if (y1 > y2) {
            [x1, y1, x2, y2] = [x2, y2, x1, y1];
        }
        
        this.yTop = Math.ceil(y1);      // Integer y-coordinate where edge starts
        this.yBottom = Math.floor(y2);  // Integer y-coordinate where edge ends
        this.xTop = x1;                 // x-coordinate at the top point
        
        // Calculate edge slope (dx/dy) for interpolation
        this.slope = (y2 !== y1) ? (x2 - x1) / (y2 - y1) : 0;
    }
    
    // Calculate x-coordinate at a given scanline y
    getXAtScanline(y) {
        return this.xTop + (y - this.yTop + 0.5) * this.slope;
    }
}

class BezierCurve {
    constructor(x0, y0, x1, y1, x2, y2, x3, y3) {
        this.x0 = x0; // Start point
        this.y0 = y0;
        this.x1 = x1; // Control point 1
        this.y1 = y1;
        this.x2 = x2; // Control point 2
        this.y2 = y2;
        this.x3 = x3; // End point
        this.y3 = y3;
        
        // Pre-calculate y bounds for quick filtering
        this.yMin = Math.min(y0, y1, y2, y3);
        this.yMax = Math.max(y0, y1, y2, y3);
    }
    
    // Evaluate cubic Bezier at parameter t (0-1)
    evaluate(t) {
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        const t2 = t * t;
        const t3 = t2 * t;
        
        // Cubic Bezier formula
        const x = mt3 * this.x0 + 3 * mt2 * t * this.x1 + 3 * mt * t2 * this.x2 + t3 * this.x3;
        const y = mt3 * this.y0 + 3 * mt2 * t * this.y1 + 3 * mt * t2 * this.y2 + t3 * this.y3;
        
        return { x, y };
    }
    
    // Find all intersections with a horizontal scanline at given y
    findIntersectionsWithScanline(y) {
        // Quick reject if scanline is outside curve bounds
        if (y < this.yMin || y > this.yMax) {
            return [];
        }
        
        // Binary subdivision to find intersections
        // This is more accurate than analytically solving the cubic equation
        return this.findIntersectionsRecursive(y, 0, 1, []);
    }
    
    findIntersectionsRecursive(y, tMin, tMax, results, depth = 0) {
        // Limit recursion depth to avoid stack overflow
        if (depth > 20) return results;
        
        const tMid = (tMin + tMax) / 2;
        const pMin = this.evaluate(tMin);
        const pMid = this.evaluate(tMid);
        const pMax = this.evaluate(tMax);
        
        // Check if scanline passes through this segment
        const crossesMin = (pMin.y <= y && pMid.y >= y) || (pMin.y >= y && pMid.y <= y);
        const crossesMax = (pMid.y <= y && pMax.y >= y) || (pMid.y >= y && pMax.y <= y);
        
        // If segment is small enough and crosses scanline, add intersection
        const isSmallSegment = (tMax - tMin) < 0.001;
        
        if (isSmallSegment) {
            if (crossesMin) {
                // Linearly interpolate to find more precise x
                const t = tMin + (y - pMin.y) * (tMid - tMin) / (pMid.y - pMin.y);
                const p = this.evaluate(t);
                results.push(p.x);
            }
            if (crossesMax) {
                // Linearly interpolate to find more precise x
                const t = tMid + (y - pMid.y) * (tMax - tMid) / (pMax.y - pMid.y);
                const p = this.evaluate(t);
                results.push(p.x);
            }
            return results;
        }
        
        // Recursively subdivide
        if (crossesMin) {
            this.findIntersectionsRecursive(y, tMin, tMid, results, depth + 1);
        }
        if (crossesMax) {
            this.findIntersectionsRecursive(y, tMid, tMax, results, depth + 1);
        }
        
        return results;
    }
    
    // Convert Bezier curve to a series of line segments for rendering
    // numSegments controls the level of detail
    toLineSegments(numSegments = 12) {
        const points = [];
        
        for (let i = 0; i <= numSegments; i++) {
            const t = i / numSegments;
            points.push(this.evaluate(t));
        }
        
        return points;
    }
}

class PathParser {
    /**
     * Parse SVG-like path commands and convert to a series of points and Bezier curves
     * @param {Array} commands - Array of commands like [["M",x,y,"C",x1,y1,x2,y2,x3,y3,"L",x4,y4],...]
     * @returns {Object} - Object with points and bezierCurves arrays
     */
    static parsePath(commands) {
        const points = [];          // Collection of line segment endpoints
        const bezierCurves = [];    // Collection of cubic Bezier curves
        
        let currentX = 0;
        let currentY = 0;
        let pathStartX = 0;
        let pathStartY = 0;
        
        commands.forEach(command => {
            let i = 0;
            while (i < command.length) {
                const cmd = command[i];
                
                if (cmd === "M") {
                    // Move to absolute position
                    currentX = command[i + 1];
                    currentY = command[i + 2];
                    pathStartX = currentX;
                    pathStartY = currentY;
                    i += 3;
                }
                else if (cmd === "L") {
                    // Line to absolute position
                    const x = command[i + 1];
                    const y = command[i + 2];
                    
                    // Add line segment
                    points.push({ x: currentX, y: currentY });
                    points.push({ x, y });
                    
                    currentX = x;
                    currentY = y;
                    i += 3;
                }
                else if (cmd === "C") {
                    // Cubic Bezier curve to absolute position
                    const x1 = command[i + 1];
                    const y1 = command[i + 2];
                    const x2 = command[i + 3];
                    const y2 = command[i + 4];
                    const x = command[i + 5];
                    const y = command[i + 6];
                    
                    // Create Bezier curve object
                    bezierCurves.push(new BezierCurve(
                        currentX, currentY, // Start point (current position)
                        x1, y1,             // First control point
                        x2, y2,             // Second control point
                        x, y                // End point
                    ));
                    
                    currentX = x;
                    currentY = y;
                    i += 7;
                }
                else if (cmd === "Z" || cmd === "z") {
                    // Close path
                    points.push({ x: currentX, y: currentY });
                    points.push({ x: pathStartX, y: pathStartY });
                    
                    currentX = pathStartX;
                    currentY = pathStartY;
                    i += 1;
                }
                else {
                    // Skip unknown command
                    console.warn(`Unknown path command: ${cmd}`);
                    i += 1;
                }
            }
        });
        
        return { points, bezierCurves };
    }
}

class PathFiller {
    constructor(canvas, width, height) {
        this.canvas = canvas;
        this.width = width;
        this.height = height;
        this.ctx = canvas.getContext('2d');
        
        // Clear the canvas
        this.ctx.clearRect(0, 0, width, height);
    }
    
    /**
     * Extract edges from points and organize them into y-buckets
     * @param {Array} points - Array of {x, y} points defining line segments
     * @returns {Object} - Object with y-values as keys and arrays of edges as values
     */
    createEdgeBuckets(points) {
        const edgeBuckets = {};
        const edges = [];
        
        // Process points as pairs forming line segments
        for (let i = 0; i < points.length - 1; i += 2) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            // Skip horizontal edges as they don't contribute to filling
            if (Math.abs(p1.y - p2.y) < 0.001) continue;
            
            const edge = new Edge(p1.x, p1.y, p2.x, p2.y);
            edges.push(edge);
            
            // Add edge to the bucket corresponding to its top y-coordinate
            if (!edgeBuckets[edge.yTop]) {
                edgeBuckets[edge.yTop] = [];
            }
            edgeBuckets[edge.yTop].push(edge);
        }
        
        return { edgeBuckets, edges };
    }
    
    /**
     * Find the range of y-coordinates that need to be processed
     * @param {Array} edges - All edges
     * @param {Array} bezierCurves - All Bezier curves
     * @returns {Object} - {yMin, yMax} representing the vertical bounds
     */
    findYRange(edges, bezierCurves) {
        if (edges.length === 0 && bezierCurves.length === 0) return { yMin: 0, yMax: 0 };
        
        let yMin = Infinity;
        let yMax = -Infinity;
        
        // Check edges
        for (const edge of edges) {
            yMin = Math.min(yMin, edge.yTop);
            yMax = Math.max(yMax, edge.yBottom);
        }
        
        // Check Bezier curves
        for (const curve of bezierCurves) {
            yMin = Math.min(yMin, curve.yMin);
            yMax = Math.max(yMax, curve.yMax);
        }
        
        return { 
            yMin: Math.ceil(yMin), 
            yMax: Math.floor(yMax)
        };
    }
    
    /**
     * Fill a path using even-odd rule with an optimized scanline algorithm
     * @param {Array} pathCommands - Array of SVG-like path commands
     * @param {string} fillColor - Color to fill the path with
     */
    fillPath(pathCommands, fillColor) {
        // Parse the path commands
        const { points, bezierCurves } = PathParser.parsePath(pathCommands);
        
        // Extract and organize edges from line segments
        const { edgeBuckets, edges } = this.createEdgeBuckets(points);
        const { yMin, yMax } = this.findYRange(edges, bezierCurves);
        
        // Set fill color
        this.ctx.fillStyle = fillColor;
        
        // Active Edge Table (AET) - edges that intersect current scanline
        let activeEdges = [];
        
        // Process each scanline from top to bottom
        for (let y = yMin; y <= yMax; y++) {
            // 1. Add new edges that start at this scanline
            if (edgeBuckets[y]) {
                activeEdges = activeEdges.concat(edgeBuckets[y]);
            }
            
            // 2. Remove edges that end before this scanline
            activeEdges = activeEdges.filter(edge => edge.yBottom >= y);
            
            // 3. Calculate x-coordinates where active edges intersect this scanline
            let xIntersections = activeEdges.map(edge => edge.getXAtScanline(y));
            
            // 4. Find intersections with Bezier curves
            for (const curve of bezierCurves) {
                const curveIntersections = curve.findIntersectionsWithScanline(y);
                xIntersections = xIntersections.concat(curveIntersections);
            }
            
            // 5. Sort intersections from left to right
            xIntersections.sort((a, b) => a - b);
            
            // 6. Fill between pairs of intersections (even-odd rule)
            for (let i = 0; i < xIntersections.length; i += 2) {
                if (i + 1 < xIntersections.length) {
                    const x1 = Math.round(xIntersections[i]);
                    const x2 = Math.round(xIntersections[i + 1]);
                    
                    // Fill a single-pixel-height rectangle between intersections
                    this.ctx.fillRect(x1, y, x2 - x1, 1);
                }
            }
        }
    }
    
    /**
     * Draw the path outline for visualization
     * @param {Array} pathCommands - Array of SVG-like path commands
     * @param {string} strokeColor - Color for the stroke
     * @param {number} lineWidth - Width of the stroke
     */
    drawPathOutline(pathCommands, strokeColor = 'black', lineWidth = 2) {
        const { points, bezierCurves } = PathParser.parsePath(pathCommands);
        
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = lineWidth;
        this.ctx.beginPath();
        
        // Start from the first point if available
        if (points.length > 0) {
            this.ctx.moveTo(points[0].x, points[0].y);
        }
        
        // Draw line segments
        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }
        
        // Draw Bezier curves
        for (const curve of bezierCurves) {
            this.ctx.moveTo(curve.x0, curve.y0);
            this.ctx.bezierCurveTo(
                curve.x1, curve.y1,
                curve.x2, curve.y2,
                curve.x3, curve.y3
            );
        }
        
        this.ctx.stroke();
    }
    
    /**
     * Draw the filled path with visualization of scanlines and intersections
     * @param {Array} pathCommands - Array of SVG-like path commands
     * @param {boolean} showEdges - Whether to draw the path edges
     * @param {boolean} showIntersections - Whether to show intersection points
     */
    visualizeFill(pathCommands, showEdges = true, showIntersections = true) {
        // Parse the path commands
        const { points, bezierCurves } = PathParser.parsePath(pathCommands);
        
        // Extract and organize edges
        const { edgeBuckets, edges } = this.createEdgeBuckets(points);
        const { yMin, yMax } = this.findYRange(edges, bezierCurves);
        
        // Draw the original path outline
        if (showEdges) {
            this.drawPathOutline(pathCommands);
        }
        
        // Initial fill with transparent green
        this.fillPath(pathCommands, 'rgba(0, 255, 0, 0.3)');
        
        // If we're not showing the process, we're done
        if (!showIntersections) return;
        
        // Visualization speed
        const delay = 50;
        let activeEdges = [];
        let currentY = yMin;
        
        const processNextScanline = () => {
            if (currentY > yMax) return;
            
            // 1. Add new edges that start at this scanline
            if (edgeBuckets[currentY]) {
                activeEdges = activeEdges.concat(edgeBuckets[currentY]);
            }
            
            // 2. Remove edges that end before this scanline
            activeEdges = activeEdges.filter(edge => edge.yBottom >= currentY);
            
            // 3. Calculate x-coordinates where active edges intersect this scanline
            let xIntersections = activeEdges.map(edge => 
                edge.getXAtScanline(currentY));
            
            // 4. Add intersections with Bezier curves
            for (const curve of bezierCurves) {
                const curveIntersections = curve.findIntersectionsWithScanline(currentY);
                xIntersections = xIntersections.concat(curveIntersections);
            }
            
            // 5. Sort intersections from left to right
            xIntersections.sort((a, b) => a - b);
            
            // Draw scanline
            this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(0, currentY);
            this.ctx.lineTo(this.width, currentY);
            this.ctx.stroke();
            
            // Draw intersection points
            this.ctx.fillStyle = 'blue';
            for (const x of xIntersections) {
                this.ctx.beginPath();
                this.ctx.arc(x, currentY, 3, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
            }
            
            currentY++;
            setTimeout(processNextScanline, delay);
        };
        
        // Start the visualization
        processNextScanline();
    }
}

/**
 * Example usage with SVG-like path commands
 */
function initDemo() {
    const canvas = document.getElementById('fillCanvas');
    const width = canvas.width;
    const height = canvas.height;
    
    // Create the filler
    const filler = new PathFiller(canvas, width, height);
    
    // Define path commands for a complex shape
    // Format: [["M",x,y,"C",x1,y1,x2,y2,x3,y3,"L",x4,y4],...]
    const logoPath = [
        ["M", 58.1, 100.3, "C", 18.1, 100.5, 18.2, 151.1, 18.3, 201.6, "C", 18.4, 252.1, 18.5, 303, 118.6, 303.5],
        ["M", 118.6, 303.5, "C", 218.7, 304, 218.7, 254.5, 218.7, 204.6],
        ["M", 218.7, 204.6, "C", 218.6, 154.7, 218.1, 104.9, 117.6, 105.1],
        ["M", 117.6, 105.1, "C", 116.0, 105.6, 114.8, 156.3, 213.4, 157.6],
        ["M", 150, 150, "C", 200, 150, 200, 250, 150, 250, "C", 100, 250, 100, 150, 150, 150]
    ];
    
    // SVG-like path for a simple character
    const characterPath = [
        ["M", 58.1, 0.3, "C", 18.1, 0.5, 18.2, 1.1, 18.3, 1.6, "C", 18.4, 2.1, 18.5, 3, 18.6, 3.5, "C", 18.7, 4, 18.7, 4.5, 18.7, 4.6],
        ["M", 18.7, 4.6, "C", 18.6, 4.7, 18.1, 4.9, 17.6, 5.1, "C", 16, 5.6