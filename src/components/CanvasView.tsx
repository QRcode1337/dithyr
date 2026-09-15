import { useEffect, useRef, useState, type DragEvent } from 'react';

interface CanvasViewProps {
  imageData: ImageData | null;
  onDropFiles: (files: FileList) => void;
  processing?: boolean;
}

export function CanvasView({ imageData, onDropFiles, processing }: CanvasViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageData) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(imageData, 0, 0);
  }, [imageData]);

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) onDropFiles(e.dataTransfer.files);
  };

  return (
    <div
      className="canvas-wrap"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="canvas-frame">
        {processing && <div className="processing">Rendering</div>}
        <canvas ref={canvasRef} />
        {dragging && <div className="drop-overlay">Drop image, GIF, or video</div>}
      </div>
      {!imageData && <div className="drop-hint">Drop a file or click Open</div>}
    </div>
  );
}
