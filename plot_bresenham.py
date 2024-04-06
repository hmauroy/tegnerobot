import matplotlib.pyplot as plt


def plot_movements_from_file(file_path):
    movements = []

    with open(file_path, 'r') as file:
        next(file)  # Skip the first line
        for line in file:
            # Splitting correctly based on the file format
            parts = line.strip().split()  # First split by space
            dx_dy = parts[2].split(',')  # Then split the last part by comma
            dx, dy = float(dx_dy[0]), float(dx_dy[1])
            movements.append((dx, dy))

    # Starting point, set manually from pixel values.
    x, y = [75], [49]

    # Calculate the absolute positions
    for dx, dy in movements:
        x.append(x[-1] + dx)
        y.append(y[-1] + dy)

    # Plotting the points without lines
    plt.figure(figsize=(10, 8))
    plt.scatter(x, y, color='blue')
    plt.plot(x,y, color="red")
    plt.title('Path from File Relative Movements')
    plt.xlabel('X')
    plt.ylabel('Y')
    plt.grid(True)
    plt.axis('equal')
    plt.show()


# Replace 'your_file_path.txt' with the actual path to your text file
file_path = 'r30_38_seg_timerfix_pos_teoretisk.txt'
plot_movements_from_file(file_path)
