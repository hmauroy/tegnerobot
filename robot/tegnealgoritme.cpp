int n = 38;
float d_theta = 2 * PI / n;
float theta = 0;

for (byte i=0; i < n; i++) {

  theta = theta + d_theta;
  x_new = radius * cos(theta) + xcenter;
  y_new = radius * sin(theta) + ycenter;
  String target = String(x_new) + "," + String(y_new);

  // Move using bresenham-stepper
  moveHeadTo(x_new, y_new);


  // Update integer coordinates
  //x0 = x_new;
  //y0 = y_new;


}

void moveHeadTo(int targetX, int targetY)
{
    float x_steps = targetX / (xCalibration / 5000); //0,0124
    x = round(x_steps);
    float y_steps = targetY / (yCalibration / 5000);
    y = round(y_steps);
    runSteppersBres(x, y);
}