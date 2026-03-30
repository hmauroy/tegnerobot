// Pre-compute bounding info for each curve
        function getCurveBounds(curve,tolerance) {
            const start = getCurveStartPoint(curve);
            const end = getCurveEndPoint(curve);
            return {
                start,
                end,
                minX: Math.min(start.x, end.x) - tolerance,
                maxX: Math.max(start.x, end.x) + tolerance,
                minY: Math.min(start.y, end.y) - tolerance,
                maxY: Math.max(start.y, end.y) + tolerance
            };
        }

        // ========== Convert curves to array of subarrays of [x, y] points ===========
        function curvesToPointArrays(curves) {
            const result = [];
            
            for (const curve of curves) {
                if (curve.type === 'polyline' && curve.points && curve.points.length > 0) {
                    const pointArray = curve.points.map(p => [p.x, p.y]);
                    result.push(pointArray);
                }
            }
            
            return result;
        }

        // ========== Convert point arrays to cubic bezier path commands ===========
        function pointArraysToCubicBeziers(pointArrays, maxError = 2.0) {
            const allPaths = [];
            
            for (const points of pointArrays) {
                if (points.length < 2) continue;
                
                const pathCommands = fitCubicBeziersToPath(points, maxError);
                allPaths.push(pathCommands);
            }
            
            return allPaths;
        }

        function fitCubicBeziersToPath(points, maxError = 2.0) {
            if (points.length < 2) return [];
            
            const path = [];
            
            // Start with Move command
            const [x0, y0] = points[0];
            path.push("M", x0, y0);
            
            if (points.length === 2) {
                // Simple straight line as one bezier
                const [x3, y3] = points[1];
                const x1 = x0 + (x3 - x0) / 3;
                const y1 = y0 + (y3 - y0) / 3;
                const x2 = x0 + 2 * (x3 - x0) / 3;
                const y2 = y0 + 2 * (y3 - y0) / 3;
                path.push("C", x1, y1, x2, y2, x3, y3);
                return path;
            }
            
            // Adaptively fit bezier curves - maximize points per curve while staying under error threshold
            let i = 0;
            while (i < points.length - 1) {
                const result = fitMaximalBezier(points, i, maxError);
                const [cp1x, cp1y, cp2x, cp2y, endX, endY] = result.bezier;
                path.push("C", cp1x, cp1y, cp2x, cp2y, endX, endY);
                i = result.endIndex;
            }
            
            return path;
        }

        function fitMaximalBezier(points, startIdx, maxError) {
            // Start with minimum segment (2 points) and grow until error exceeds threshold
            let bestEndIdx = startIdx + 1;
            let bestBezier = null;
            
            // Try progressively longer segments
            for (let endIdx = startIdx + 1; endIdx < points.length; endIdx++) {
                const segment = points.slice(startIdx, endIdx + 1);
                const bezier = fitBezierToSegment(segment);
                
                // Calculate maximum error for this fit
                const error = calculateBezierError(segment, bezier);
                
                if (error <= maxError) {
                    // This fit is acceptable, keep trying longer segments
                    bestEndIdx = endIdx;
                    bestBezier = bezier;
                } else {
                    // Error too large, use previous best fit
                    break;
                }
            }
            
            // If we never found a good fit (shouldn't happen), use minimum segment
            if (bestBezier === null) {
                const segment = points.slice(startIdx, startIdx + 2);
                bestBezier = fitBezierToSegment(segment);
                bestEndIdx = startIdx + 1;
            }
            
            return { bezier: bestBezier, endIndex: bestEndIdx };
        }

        function calculateBezierError(points, bezier) {
            // Calculate maximum distance from any point to the fitted bezier curve
            const [x0, y0] = points[0];
            const [cp1x, cp1y, cp2x, cp2y, x3, y3] = bezier;
            
            let maxError = 0;
            
            // Check error at each point along the segment
            for (let i = 1; i < points.length - 1; i++) {
                const [px, py] = points[i];
                
                // Find closest point on bezier curve (sample at various t values)
                let minDist = Infinity;
                for (let t = 0; t <= 1; t += 0.05) {
                    const [bx, by] = evaluateBezier(x0, y0, cp1x, cp1y, cp2x, cp2y, x3, y3, t);
                    const dist = Math.sqrt((px - bx) ** 2 + (py - by) ** 2);
                    minDist = Math.min(minDist, dist);
                }
                
                maxError = Math.max(maxError, minDist);
            }
            
            return maxError;
        }

        function evaluateBezier(x0, y0, x1, y1, x2, y2, x3, y3, t) {
            // Cubic bezier evaluation using De Casteljau's algorithm
            const mt = 1 - t;
            const mt2 = mt * mt;
            const mt3 = mt2 * mt;
            const t2 = t * t;
            const t3 = t2 * t;
            
            const x = mt3 * x0 + 3 * mt2 * t * x1 + 3 * mt * t2 * x2 + t3 * x3;
            const y = mt3 * y0 + 3 * mt2 * t * y1 + 3 * mt * t2 * y2 + t3 * y3;
            
            return [x, y];
        }

        function fitBezierToSegment(points) {
            const [x0, y0] = points[0];
            const [x3, y3] = points[points.length - 1];
            
            if (points.length === 2) {
                // Straight line
                const x1 = x0 + (x3 - x0) / 3;
                const y1 = y0 + (y3 - y0) / 3;
                const x2 = x0 + 2 * (x3 - x0) / 3;
                const y2 = y0 + 2 * (y3 - y0) / 3;
                return [x1, y1, x2, y2, x3, y3];
            }
            
            // Use simple control point estimation based on tangents
            // First control point: extend from start in direction of second point
            const [x0_next, y0_next] = points[1];
            const dx_start = x0_next - x0;
            const dy_start = y0_next - y0;
            const x1 = x0 + dx_start * 0.4;
            const y1 = y0 + dy_start * 0.4;
            
            // Second control point: extend from end in direction of penultimate point
            const [x3_prev, y3_prev] = points[points.length - 2];
            const dx_end = x3 - x3_prev;
            const dy_end = y3 - y3_prev;
            const x2 = x3 - dx_end * 0.4;
            const y2 = y3 - dy_end * 0.4;
            
            return [x1, y1, x2, y2, x3, y3];
        }

        // ========== Usage example (call after getting allCurves) ===========
        // Uncomment these lines in the processImage function after getting allCurves:
        // const pointArrays = curvesToPointArrays(allCurves);
        // console.log('Point arrays:', pointArrays);
        // const beziers = pointArraysToCubicBeziers(pointArrays);
        // console.log('Beziers:', beziers);