/**
 * Converts arrays of point arrays into smooth Cubic Bezier curves
 * 
 * @param {Array<Array<Array<number>>>} pathsArray - Array of paths, each path is array of [x,y] points
 * @param {Object} options - Configuration options
 * @param {number} options.alphamax - Corner threshold (default: 1)
 * @param {boolean} options.optcurve - Enable curve optimization (default: true)
 * @param {number} options.opttolerance - Optimization tolerance (default: 0.2)
 * @param {number} options.moveThreshold - Distance threshold for Move command (default: 2)
 * @param {number} options.angleThreshold - Max angle in degrees before discarding outlier point (default: 150)
 * @returns {Array<Array>} Array of curve arrays, one per input path: [["M",x,y,"C",x1,y1,...], ["M",x,y,...]]
 */
function pointsToBezierCurves(pathsArray, options = {}) {
  const alphamax = options.alphamax ?? 1;
  const optcurve = options.optcurve ?? true;
  const opttolerance = options.opttolerance ?? 0.2;
  const moveThreshold = options.moveThreshold ?? 2;

  // Helper functions
  function mod(a, n) {
    return a >= n ? a % n : a >= 0 ? a : n - 1 - ((-1 - a) % n);
  }

  function interval(lambda, a, b) {
    return {
      x: a.x + lambda * (b.x - a.x),
      y: a.y + lambda * (b.y - a.y)
    };
  }

  function ddenom(p0, p2) {
    const r = {
      y: Math.sign(p2.x - p0.x),
      x: -Math.sign(p2.y - p0.y)
    };
    return r.y * (p2.x - p0.x) - r.x * (p2.y - p0.y);
  }

  function dpara(p0, p1, p2) {
    const x1 = p1.x - p0.x;
    const y1 = p1.y - p0.y;
    const x2 = p2.x - p0.x;
    const y2 = p2.y - p0.y;
    return x1 * y2 - x2 * y1;
  }

  function cprod(p0, p1, p2, p3) {
    const x1 = p1.x - p0.x;
    const y1 = p1.y - p0.y;
    const x2 = p3.x - p2.x;
    const y2 = p3.y - p2.y;
    return x1 * y2 - x2 * y1;
  }

  function iprod(p0, p1, p2) {
    const x1 = p1.x - p0.x;
    const y1 = p1.y - p0.y;
    const x2 = p2.x - p0.x;
    const y2 = p2.y - p0.y;
    return x1 * x2 + y1 * y2;
  }

  function iprod1(p0, p1, p2, p3) {
    const x1 = p1.x - p0.x;
    const y1 = p1.y - p0.y;
    const x2 = p3.x - p2.x;
    const y2 = p3.y - p2.y;
    return x1 * x2 + y1 * y2;
  }

  function ddist(p, q) {
    return Math.sqrt((p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y));
  }

  function bezier(t, p0, p1, p2, p3) {
    const s = 1 - t;
    return {
      x: s * s * s * p0.x + 3 * (s * s * t) * p1.x + 3 * (t * t * s) * p2.x + t * t * t * p3.x,
      y: s * s * s * p0.y + 3 * (s * s * t) * p1.y + 3 * (t * t * s) * p2.y + t * t * t * p3.y
    };
  }

  function tangent(p0, p1, p2, p3, q0, q1) {
    const A = cprod(p0, p1, q0, q1);
    const B = cprod(p1, p2, q0, q1);
    const C = cprod(p2, p3, q0, q1);
    const a = A - 2 * B + C;
    const b = -2 * A + 2 * B;
    const c = A;
    const d = b * b - 4 * a * c;

    if (a === 0 || d < 0) return -1.0;

    const s = Math.sqrt(d);
    const r1 = (-b + s) / (2 * a);
    const r2 = (-b - s) / (2 * a);

    if (r1 >= 0 && r1 <= 1) return r1;
    else if (r2 >= 0 && r2 <= 1) return r2;
    else return -1.0;
  }

  // Detect and filter out outlier points that create sharp angles
  function filterOutliers(points, angleThreshold = 150) {
    if (points.length < 3) return points;
    
    const filtered = [points[0]]; // Always keep first point
    
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      
      // Calculate vectors
      const v1x = curr.x - prev.x;
      const v1y = curr.y - prev.y;
      const v2x = next.x - curr.x;
      const v2y = next.y - curr.y;
      
      // Calculate angle using dot product
      const dot = v1x * v2x + v1y * v2y;
      const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
      const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
      
      if (mag1 > 0 && mag2 > 0) {
        const cosAngle = dot / (mag1 * mag2);
        const angleDeg = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
        
        // Keep point if angle is smooth enough (less than threshold)
        if (angleDeg < angleThreshold) {
          filtered.push(curr);
        }
        // Otherwise skip this point (it's an outlier creating a sharp spike)
      } else {
        filtered.push(curr);
      }
    }
    
    filtered.push(points[points.length - 1]); // Always keep last point
    
    return filtered;
  }

  // Main smooth function - works on a single path (open curve, not closed)
  function smooth(points) {
    const m = points.length;
    if (m < 2) return null;
    
    const curve = {
      vertices: [...points],
      controlPoints: new Array(m * 3),
      tags: new Array(m),
      alpha: new Array(m),
      alpha0: new Array(m),
      beta: new Array(m)
    };

    // Process as open curve, not closed loop
    for (let i = 0; i < m - 1; i++) {
      const j = i + 1;
      const k = Math.min(i + 2, m - 1);
      const p4 = interval(0.5, curve.vertices[k], curve.vertices[j]);

      const denom = ddenom(curve.vertices[i], curve.vertices[k]);
      let alpha;
      
      if (denom !== 0.0) {
        const dd = Math.abs(dpara(curve.vertices[i], curve.vertices[j], curve.vertices[k]) / denom);
        alpha = dd > 1 ? 1 - 1.0 / dd : 0;
        alpha = alpha / 0.75;
      } else {
        alpha = 4 / 3.0;
      }
      
      curve.alpha0[j] = alpha;

      if (alpha >= alphamax) {
        curve.tags[j] = "CORNER";
        curve.controlPoints[3 * j + 1] = {...curve.vertices[j]};
        curve.controlPoints[3 * j + 2] = {...p4};
      } else {
        if (alpha < 0.55) alpha = 0.55;
        else if (alpha > 1) alpha = 1;
        
        const p2 = interval(0.5 + 0.5 * alpha, curve.vertices[i], curve.vertices[j]);
        const p3 = interval(0.5 + 0.5 * alpha, curve.vertices[k], curve.vertices[j]);
        curve.tags[j] = "CURVE";
        curve.controlPoints[3 * j + 0] = {...p2};
        curve.controlPoints[3 * j + 1] = {...p3};
        curve.controlPoints[3 * j + 2] = {...p4};
      }
      curve.alpha[j] = alpha;
      curve.beta[j] = 0.5;
    }
    
    // Handle first and last points for open curve
    curve.tags[0] = "CURVE";
    curve.controlPoints[0] = {...curve.vertices[0]};
    curve.controlPoints[1] = {...curve.vertices[0]};
    curve.controlPoints[2] = {...curve.vertices[0]};

    return curve;
  }

  // Optimization function - works on a single curve (open, not closed)
  function optimizeCurve(curve) {
    const m = curve.vertices.length;
    
    function optiPenalty(i, j, res) {
      if (i === j || j >= m) return 1;

      const p0 = curve.controlPoints[i * 3 + 2] ? {...curve.controlPoints[i * 3 + 2]} : {...curve.vertices[i]};
      const p1 = {...curve.vertices[Math.min(i + 1, m - 1)]};
      const p2 = {...curve.vertices[Math.min(j, m - 1)]};
      const p3 = curve.controlPoints[j * 3 + 2] ? {...curve.controlPoints[j * 3 + 2]} : {...curve.vertices[Math.min(j, m - 1)]};

      const A1 = dpara(p0, p1, p2);
      const A2 = dpara(p0, p1, p3);
      const A3 = dpara(p0, p2, p3);
      const A4 = A1 + A3 - A2;

      if (A2 === A1) return 1;

      const t = A3 / (A3 - A4);
      const s = A2 / (A2 - A1);
      const alpha = 2 - Math.sqrt(4 - 0.3);

      res.c = [
        interval(t * alpha, p0, p1),
        interval(s * alpha, p3, p2)
      ];
      res.alpha = alpha;
      res.t = t;
      res.s = s;
      res.pen = 0;

      const p1n = res.c[0];
      const p2n = res.c[1];

      // Only iterate through points between i and j (not wrapping around)
      for (let k = i + 1; k < j; k++) {
        const k1 = k + 1;
        if (k1 >= m) break;
        
        const tt = tangent(p0, p1n, p2n, p3, curve.vertices[k], curve.vertices[k1]);
        if (tt < -0.5) return 1;

        const pt = bezier(tt, p0, p1n, p2n, p3);
        const d = ddist(curve.vertices[k], curve.vertices[k1]);
        if (d === 0.0) return 1;

        const d1 = dpara(curve.vertices[k], curve.vertices[k1], pt) / d;
        if (Math.abs(d1) > opttolerance) return 1;
        if (iprod(curve.vertices[k], curve.vertices[k1], pt) < 0 ||
            iprod(curve.vertices[k1], curve.vertices[k], pt) < 0) return 1;

        res.pen += d1 * d1;
      }

      return 0;
    }

    const pt = new Array(m + 1);
    const pen = new Array(m + 1);
    const len = new Array(m + 1);
    const opt = new Array(m + 1);

    pt[0] = -1;
    pen[0] = 0;
    len[0] = 0;

    // Process as open curve
    for (let j = 1; j < m; j++) {
      pt[j] = j - 1;
      pen[j] = pen[j - 1];
      len[j] = len[j - 1] + 1;

      for (let i = j - 2; i >= 0; i--) {
        const o = {};
        const r = optiPenalty(i, j, o);
        if (r) break;

        if (len[j] > len[i] + 1 || (len[j] === len[i] + 1 && pen[j] > pen[i] + o.pen)) {
          pt[j] = i;
          pen[j] = pen[i] + o.pen;
          len[j] = len[i] + 1;
          opt[j] = o;
        }
      }
    }

    const om = len[m - 1];
    const optimizedCurve = {
      vertices: new Array(om + 1),
      controlPoints: new Array((om + 1) * 3),
      tags: new Array(om + 1),
      alpha: new Array(om + 1),
      alpha0: new Array(om + 1),
      beta: new Array(om + 1)
    };
    const s = new Array(om + 1);
    const t = new Array(om + 1);

    let j = m - 1;
    for (let i = om; i >= 0; i--) {
      if (i === 0 || pt[j] === j - 1) {
        const idx = Math.min(j, m - 1);
        optimizedCurve.tags[i] = curve.tags[idx];
        optimizedCurve.controlPoints[i * 3 + 0] = curve.controlPoints[idx * 3 + 0] ? {...curve.controlPoints[idx * 3 + 0]} : {...curve.vertices[idx]};
        optimizedCurve.controlPoints[i * 3 + 1] = curve.controlPoints[idx * 3 + 1] ? {...curve.controlPoints[idx * 3 + 1]} : {...curve.vertices[idx]};
        optimizedCurve.controlPoints[i * 3 + 2] = curve.controlPoints[idx * 3 + 2] ? {...curve.controlPoints[idx * 3 + 2]} : {...curve.vertices[idx]};
        optimizedCurve.vertices[i] = {...curve.vertices[idx]};
        optimizedCurve.alpha[i] = curve.alpha[idx] || 1;
        optimizedCurve.alpha0[i] = curve.alpha0[idx] || 1;
        optimizedCurve.beta[i] = curve.beta[idx] || 0.5;
        s[i] = t[i] = 1.0;
      } else {
        optimizedCurve.tags[i] = "CURVE";
        optimizedCurve.controlPoints[i * 3 + 0] = {...opt[j].c[0]};
        optimizedCurve.controlPoints[i * 3 + 1] = {...opt[j].c[1]};
        optimizedCurve.controlPoints[i * 3 + 2] = curve.controlPoints[j * 3 + 2] ? {...curve.controlPoints[j * 3 + 2]} : {...curve.vertices[j]};
        optimizedCurve.vertices[i] = interval(opt[j].s, curve.controlPoints[j * 3 + 2] || curve.vertices[j], curve.vertices[j]);
        optimizedCurve.alpha[i] = opt[j].alpha;
        optimizedCurve.alpha0[i] = opt[j].alpha;
        s[i] = opt[j].s;
        t[i] = opt[j].t;
      }
      j = pt[j];
      if (j < 0) break;
    }

    for (let i = 0; i < om; i++) {
      optimizedCurve.beta[i] = s[i] / (s[i] + t[i + 1]);
    }

    return optimizedCurve;
  }

  // Convert single curve to output format (open curve)
  function curveToOutput(curve) {
    const result = [];
    const n = curve.vertices.length;
    
    if (n === 0) return result;

    // Start with first point
    const firstPoint = curve.vertices[0];
    result.push("M", firstPoint.x, firstPoint.y);

    // Generate curves for each segment (not closing back to start)
    for (let i = 0; i < n - 1; i++) {
      const nextIdx = i + 1;
      
      // Get control points and end point
      const cp1 = curve.controlPoints[nextIdx * 3 + 0] || curve.vertices[i];
      const cp2 = curve.controlPoints[nextIdx * 3 + 1] || curve.vertices[nextIdx];
      const endPoint = curve.vertices[nextIdx];

      // Add cubic bezier curve
      result.push("C", cp1.x, cp1.y, cp2.x, cp2.y, endPoint.x, endPoint.y);
    }

    return result;
  }

  // Convert input array format to point objects
  function convertInputToPoints(pointArray) {
    return pointArray.map(p => ({ x: p[0], y: p[1] }));
  }

  // Process each path separately and return array of results
  const results = [];
  
  for (let pathIdx = 0; pathIdx < pathsArray.length; pathIdx++) {
    const pointArray = pathsArray[pathIdx];
    let points = convertInputToPoints(pointArray);
    
    // Filter outlier points that create sharp spikes
    //points = filterOutliers(points, options.angleThreshold ?? 90);
    
    let curve = smooth(points);
    if (curve && optcurve) {
      curve = optimizeCurve(curve);
    }
    
    if (curve) {
      results.push(curveToOutput(curve));
    } else {
      results.push([]);
    }
  }
  
  return results;
}

