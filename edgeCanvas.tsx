import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Play } from "lucide-react";
import { toast } from "sonner";

interface BezierCurve {
  startX: number;
  startY: number;
  controlX: number;
  controlY: number;
  endX: number;
  endY: number;
}

interface EdgeCanvasProps {
  imageUrl: string | null;
  onCurvesGenerated: (curves: BezierCurve[]) => void;
}

export const EdgeCanvas = ({ imageUrl, onCurvesGenerated }: EdgeCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [threshold1, setThreshold1] = useState([50]);
  const [threshold2, setThreshold2] = useState([150]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [curves, setCurves] = useState<BezierCurve[]>([]);
  const [useSkeletonization, setUseSkeletonization] = useState(false);

  const applySkeletonization = (gray: any): any => {
    console.log('Starting skeletonization process...');
    // Create binary image from grayscale
    const binary = new window.cv.Mat();
    const skeleton = new window.cv.Mat();
    const temp = new window.cv.Mat();
    const temp2 = new window.cv.Mat();
    const kernel = window.cv.getStructuringElement(window.cv.MORPH_CROSS, new window.cv.Size(3, 3));
    
    // Threshold to create binary image (invert so lines are white on black)
    window.cv.threshold(gray, binary, 127, 255, window.cv.THRESH_BINARY_INV);
    console.log('Binary threshold applied');
    
    // Initialize skeleton
    skeleton.setTo(new window.cv.Scalar(0));
    binary.copyTo(temp2); // Keep original binary for iteration
    
    // Iterative thinning process
    let done = false;
    let iterations = 0;
    const maxIterations = 50; // Prevent infinite loops
    
    while (!done && iterations < maxIterations) {
      // Erode the image
      window.cv.erode(temp2, temp, kernel);
      
      // Dilate the eroded image
      window.cv.dilate(temp, temp, kernel);
      
      // Subtract from original
      window.cv.subtract(temp2, temp, temp);
      
      // Union with skeleton
      window.cv.bitwise_or(skeleton, temp, skeleton);
      
      // Update for next iteration - erode the working image
      window.cv.erode(temp2, temp2, kernel);
      
      // Check if we're done (no more changes)
      const sum = window.cv.sum(temp2);
      done = sum[0] === 0;
      iterations++;
    }
    
    // Convert back to edges format (invert back)
    window.cv.bitwise_not(skeleton, skeleton);
    
    temp.delete();
    temp2.delete();
    binary.delete();
    kernel.delete();
    
    return skeleton;
  };

  const processImage = async () => {
    if (!imageUrl || !canvasRef.current) return;

    console.log('Processing image with skeletonization:', useSkeletonization);
    setIsProcessing(true);
    try {
      // Load OpenCV if not already loaded
      if (typeof window.cv === 'undefined' || !window.cv.Mat || typeof window.cv.Mat !== 'function') {
        console.log('OpenCV not ready, loading...');
        await loadOpenCV();
      }
      
      // Double check OpenCV is ready
      if (!window.cv || !window.cv.Mat || typeof window.cv.Mat !== 'function') {
        throw new Error('OpenCV failed to initialize properly');
      }

      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        
        // Set canvas dimensions
        canvas.width = Math.min(img.width, 800);
        canvas.height = Math.min(img.height, 600);
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Create OpenCV matrices
        const src = window.cv.imread(img);
        const dst = new window.cv.Mat();
        const gray = new window.cv.Mat();
        let edges = new window.cv.Mat();
        
        // Convert to grayscale
        window.cv.cvtColor(src, gray, window.cv.COLOR_RGBA2GRAY);
        
        // Apply skeletonization if requested
        if (useSkeletonization) {
          console.log('Applying skeletonization...');
          edges = applySkeletonization(gray);
          console.log('Skeletonization completed, edges:', edges);
        } else {
          console.log('Applying Canny edge detection...');
          // Standard Canny edge detection
          window.cv.Canny(gray, edges, threshold1[0], threshold2[0]);
        }
        
        // Find contours
        const contours = new window.cv.MatVector();
        const hierarchy = new window.cv.Mat();
        window.cv.findContours(edges, contours, hierarchy, window.cv.RETR_EXTERNAL, window.cv.CHAIN_APPROX_SIMPLE);
        
        // Convert contours to bezier curves
        const generatedCurves: BezierCurve[] = [];
        
        for (let i = 0; i < contours.size(); i++) {
          const contour = contours.get(i);
          const points = [];
          
          for (let j = 0; j < contour.rows; j++) {
            const point = contour.data32S.slice(j * 2, j * 2 + 2);
            points.push({ x: point[0] * scale, y: point[1] * scale });
          }
          
          // Convert points to quadratic bezier curves
          if (points.length >= 3) {
            for (let k = 0; k < points.length - 2; k += 2) {
              const start = points[k];
              const control = points[k + 1];
              const end = points[k + 2];
              
              generatedCurves.push({
                startX: start.x,
                startY: start.y,
                controlX: control.x,
                controlY: control.y,
                endX: end.x,
                endY: end.y,
              });
            }
          }
        }
        
        // Draw bezier curves on canvas
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        
        generatedCurves.forEach(curve => {
          ctx.beginPath();
          ctx.moveTo(curve.startX, curve.startY);
          ctx.quadraticCurveTo(curve.controlX, curve.controlY, curve.endX, curve.endY);
          ctx.stroke();
        });
        
        setCurves(generatedCurves);
        onCurvesGenerated(generatedCurves);
        
        // Cleanup
        src.delete();
        dst.delete();
        gray.delete();
        edges.delete();
        contours.delete();
        hierarchy.delete();
        
        toast.success(`Generated ${generatedCurves.length} bezier curves!`);
      };
      
      img.src = imageUrl;
    } catch (error) {
      console.error('Error processing image:', error);
      toast.error('Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  };

  const loadOpenCV = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if OpenCV is fully loaded with Mat constructor
      if (typeof window.cv !== 'undefined' && window.cv.Mat && typeof window.cv.Mat === 'function') {
        console.log('OpenCV already loaded and ready');
        resolve();
        return;
      }

      console.log('Loading OpenCV...');
      
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="opencv.js"]');
      if (existingScript) {
        console.log('OpenCV script already in DOM, waiting for initialization...');
        const checkReady = () => {
          if (window.cv && window.cv.Mat && typeof window.cv.Mat === 'function') {
            console.log('OpenCV is now ready');
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
      script.async = true;
      
      let resolved = false;
      
      const checkAndResolve = () => {
        if (resolved) return;
        if (window.cv && window.cv.Mat && typeof window.cv.Mat === 'function') {
          console.log('OpenCV initialization complete');
          resolved = true;
          resolve();
        }
      };
      
      // Set up global callback
      (window as any).onOpenCVReady = checkAndResolve;
      
      script.onload = () => {
        console.log('OpenCV script loaded');
        // Poll for readiness
        const pollForReady = () => {
          if (resolved) return;
          if (window.cv && window.cv.Mat && typeof window.cv.Mat === 'function') {
            checkAndResolve();
          } else if (window.cv && typeof window.cv.onRuntimeInitialized !== 'undefined') {
            // Set up runtime callback if not already set
            const originalCallback = window.cv.onRuntimeInitialized;
            window.cv.onRuntimeInitialized = () => {
              if (originalCallback) originalCallback();
              checkAndResolve();
            };
          } else {
            setTimeout(pollForReady, 100);
          }
        };
        pollForReady();
      };
      
      script.onerror = (error) => {
        console.error('Failed to load OpenCV script:', error);
        if (!resolved) {
          resolved = true;
          reject(error);
        }
      };
      
      document.head.appendChild(script);
      
      // Timeout fallback
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error('OpenCV failed to load within timeout'));
        }
      }, 15000); // 15 second timeout
    });
  };

  const downloadCurves = () => {
    const dataStr = JSON.stringify(curves, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bezier-curves.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Curves exported successfully!');
  };

  useEffect(() => {
    if (imageUrl) {
      // Reset states when new image is loaded but don't auto-process
      setUseSkeletonization(false);
      setCurves([]);
    }
  }, [imageUrl]);

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {useSkeletonization ? "Skeletonized" : "Edge Detection"} & Bezier Curves
        </h3>
        <div className="flex gap-2">
          <Button
            onClick={downloadCurves}
            variant="outline"
            size="sm"
            disabled={curves.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="skeletonization"
            checked={useSkeletonization}
            onCheckedChange={(checked) => setUseSkeletonization(checked === true)}
          />
          <label
            htmlFor="skeletonization"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Use Skeletonization (for line drawings with double edges)
          </label>
        </div>
        <Button
          onClick={processImage}
          disabled={!imageUrl || isProcessing}
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          Process Image
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Lower Threshold: {threshold1[0]}</label>
          <Slider
            value={threshold1}
            onValueChange={setThreshold1}
            max={255}
            min={0}
            step={1}
            disabled={isProcessing}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Upper Threshold: {threshold2[0]}</label>
          <Slider
            value={threshold2}
            onValueChange={setThreshold2}
            max={255}
            min={0}
            step={1}
            disabled={isProcessing}
          />
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full border border-border rounded-lg bg-card shadow-soft"
          style={{ maxHeight: '600px' }}
        />
        {isProcessing && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Processing image...</p>
            </div>
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Curves generated: {curves.length}
      </p>
    </Card>
  );
};

// Extend window object for OpenCV
declare global {
  interface Window {
    cv: any;
  }
}