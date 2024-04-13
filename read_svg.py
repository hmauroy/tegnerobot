# Re-defining the classes after code execution state reset

from matplotlib import pyplot as plt

class SVGElement:
    def __init__(self, is_preceding_path=False, transform=None):
        self.is_preceding_path = is_preceding_path
        # transform should be a tuple: (translate_x, translate_y, scale_x, scale_y)
        self.transform = transform

    def apply_transform(self, x, y):
        if self.transform:
            tx, ty, sx, sy = self.transform
            # Apply scaling and translation
            x, y = x * sx + tx, y * sy + ty
        return x, y

    def parse(self, svg_content):
        pass

    def generate_points(self):
        pass


class BezierCurve(SVGElement):
    def __init__(self, points=None, **kwargs):
        super().__init__(**kwargs)
        self.points = points if points else []

    def generate_points(self):
        # Returns the control points as a text string
        return self.points
        return ', '.join(str(p) for p in self.points)


class CubicBezier(BezierCurve):
    def parse(self, svg_content):
        svg_content = svg_content.replace(',', ' ')
        parts = svg_content.split()
        idx = parts.index('c') if 'c' in parts else parts.index('C')
        self.points = parts[idx+1:idx+9]

        # Apply transformation to each point
        transformed_points = []
        for i in range(0, len(self.points), 2):
            x, y = self.apply_transform(
                float(self.points[i]), float(self.points[i+1]))
            transformed_points.extend([x, y])
        self.points = transformed_points
    
    def cubic_bezier_points(self, n=30):
        x0, y0, x1, y1, x2, y2, x3, y3 = map(float, self.points)
        result = []
        for i in range(n + 1):
            t = i / n
            a = (1. - t)**3
            b = 3. * t * (1. - t)**2
            c = 3.0 * t**2 * (1.0 - t)
            d = t**3
            x = a * x0 + b * x1 + c * x2 + d * x3
            y = a * y0 + b * y1 + c * y2 + d * y3
            result.append((x, y))
        return result

    def generate_points(self):
        points = self.cubic_bezier_points()
        return points


# Example transformation from the <g> element
transform = (0, 480, 0.015625, -0.015625)
transform = (0, 1, 1, 1)

# Example usage
path_data = "c 16 1 1 4 3 16 15 11"
cubic_curve = CubicBezier(transform=transform)
cubic_curve.parse(path_data)
points = cubic_curve.generate_points()
x, y = zip(*points)
plt.scatter(x, y, color="red")
plt.plot(x,y,color="blue")
plt.xlim(0, 17)
plt.ylim(0, 17)
plt.gca().invert_yaxis()
plt.show()
