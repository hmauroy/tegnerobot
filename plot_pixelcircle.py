import matplotlib.pyplot as plt


def plot_movements_and_times_from_file(file_path):
    movements = []
    times_x = []
    times_y = []

    with open(file_path, 'r') as file:
        next(file)  # Skip the first line
        for line in file:
            # Extract nx, ny, timePerStepX, timePerStepY values
            _, values = line.split(':')
            nx, ny, time_x, time_y = [float(v) for v in values.split(',')]
            movements.append((nx, ny))
            times_x.append(time_x)
            times_y.append(time_y)

    # Starting point for movements
    x, y = [6542], [4032]

    # Calculate the absolute positions for movements
    for nx, ny in movements:
        x.append(x[-1] + nx)
        y.append(y[-1] + ny)

    # Plotting the movements
    plt.figure(figsize=(12, 6))
    plt.subplot(1, 2, 1)  # 1 row, 2 columns, 1st subplot = movements plot
    plt.scatter(x, y, color='blue')
    plt.plot(x[:14], y[:14], color='red')
    plt.title('Path from File Based on nx, ny Movements')
    plt.xlabel('X')
    plt.ylabel('Y')
    plt.grid(True)
    plt.axis('equal')  # Ensure equal scaling on the x and y axes

    # Plotting time per step for X and Y
    plt.subplot(1, 2, 2)  # 1 row, 2 columns, 2nd subplot = times plot
    steps = list(range(len(times_x)))  # Step numbers as x-axis
    plt.plot(steps, times_x, label='TimePerStepX', marker='o')
    plt.plot(steps, times_y, label='TimePerStepY', marker='x')
    plt.title('Time Per Step for X and Y')
    plt.xlabel('Step Number')
    plt.ylabel('Time Per Step')
    plt.legend()
    plt.grid(True)

    plt.tight_layout()  # Adjust layout to not overlap
    plt.show()


# Replace 'path_to_your_data_file.txt' with the actual path to your text file
file_path = 'circle1_teori_d.txt'
plot_movements_and_times_from_file(file_path)
