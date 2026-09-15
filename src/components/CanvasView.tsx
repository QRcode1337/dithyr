import { useEffect, useRef, useState, type DragEvent } from 'react';

interface CanvasViewProps {
  imageData: ImageData | null;
  sourceImageData?: ImageData | null;
  compareMode: boolean;
  onDropFiles: (files: FileList) => void;
  processing?: boolean;
}

export function CanvasView({
  imageData,
  sourceImageData,
  compareMode,
  onDropFiles,
  processing,
}: CanvasViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState(false);
  const displayedImageData = compareMode ? sourceImageData ?? imageData : imageData;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!displayedImageData) {
      canvas.width = 0;
      canvas.height = 0;
      return;
    }
    canvas.width = displayedImageData.width;
    canvas.height = displayedImageData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(displayedImageData, 0, 0);
  }, [displayedImageData]);

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
