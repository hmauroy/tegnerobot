from matplotlib import pyplot as plt

# Path to the uploaded file
file_path = 'circle_38_segments.txt'

# Reading the data
x_values = []
y_values = []

with open(file_path, 'r') as file:
    lines = file.readlines()[1:]  # Skip the first line which contains 'n_segments Circle: 252'
    for line in lines:
        x, y = map(float, line.strip().split(','))
        x_values.append(x)
        y_values.append(y)

# Plotting
plt.figure(figsize=(10, 8))
plt.plot(x_values, y_values, marker='o', linestyle='-', color='blue')
plt.title('Complete Circular Plot')
plt.xlabel('X')
plt.ylabel('Y')
plt.grid(True)
plt.axis('equal')  # This line makes sure the scale is the same on both axes
plt.show()
