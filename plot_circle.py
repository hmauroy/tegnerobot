import matplotlib.pyplot as plt

# Define the points
points = [
    (750, 40), (590, 695), (255, 719), (54, 450), (500, 656),
    (737, 303), (664, 630), (350, 747), (82, 545), (107, 210),
    (402, 51), (696, 213), (718, 548), (448, 747), (135, 628),
    (65, 300), (304, 64), (632, 138), (747, 453), (543, 720),
    (209, 693), (51, 397), (549, 844), (747, 354), (627, 667),
    (298, 735), (64, 95), (139, 168), (454, 55)
]

points2 = [
    (750, 400), (743, 473), (720, 543), (684, 606), (635, 661),
    (575, 704), (509, 733), (437, 749), (292, 733), (225, 704),
    (166, 661), (117, 606), (81, 543), (58, 473), (50, 400),
    (58, 328), (81, 258), (117, 195), (166, 140), (226, 97),
    (292, 68), (364, 52), (437, 52), (509, 68), (576, 97),
    (635, 140), (684, 195), (720, 258), (743, 328), (750, 401)
]


# Extract x and y coordinates
x = [point[0] for point in points]
y = [point[1] for point in points]

# Plot the points
plt.scatter(x, y)
plt.plot(x,y)

# Invert the y-axis
plt.gca().invert_yaxis()

# Add labels and title
plt.xlabel('X')
plt.ylabel('Y')
plt.title('Points with Y-axis Downwards')
plt.axis('equal')

# Show the plot
plt.show()
