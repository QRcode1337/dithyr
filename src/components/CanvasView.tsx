import { LOGO_MARK_SM_SRC } from '../brand/assets';
import { useEffect, useRef, useState, type DragEvent, type WheelEvent } from 'react';

interface CanvasViewProps {
  imageData: ImageData | null;
  sourceImageData?: ImageData | null;
  compareMode?: boolean;
  onDropFiles: (files: FileList) => void;
  processing?: boolean;
}

export function CanvasView({
  imageData,
  sourceImageData,
  compareMode = false,
  onDropFiles,
  processing,
}: CanvasViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
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

  const onWheel = (e: WheelEvent) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    e.preventDefault();
    const dir = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.min(4, Math.max(0.25, Math.round((z + dir) * 20) / 20)));
  };

  return (
    <div
      className="canvas-wrap"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onWheel={onWheel}
    >
      <div className="canvas-stage">
        <div className="canvas-vignette" aria-hidden />
        <div
          className={`canvas-frame${displayedImageData ? '' : ' is-empty'}${compareMode ? ' is-compare' : ''}`}
          style={displayedImageData ? { transform: `scale(${zoom})` } : undefined}
        >
          {displayedImageData ? (
            <canvas ref={canvasRef} />
          ) : (
            <div className="empty-stage">
              <img src={LOGO_MARK_SM_SRC} alt="" width={56} height={56} className="empty-mark" />
              <p className="empty-title">Drop media to begin</p>
              <p className="empty-sub">
                Image, GIF, or video — dither becomes a material you can sculpt.
              </p>
            </div>
          )}
          {dragging && (
            <div className="drop-overlay">
              <span>Drop to load</span>
            </div>
          )}
        </div>

        {processing && (
          <div className="processing-badge" role="status">
            <span className="spinner" aria-hidden />
            Rendering
          </div>
        )}
        {compareMode && displayedImageData && (
          <div className="compare-badge">Original</div>
        )}
      </div>

      <div className="canvas-toolbar">
        <span className="hint-muted">
          {displayedImageData
            ? `${displayedImageData.width}×${displayedImageData.height}${compareMode ? ' · compare' : ''}`
            : 'Open a file or drop onto the stage'}
        </span>
        <div className="zoom-controls">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setZoom((z) => Math.max(0.25, Math.round((z - 0.25) * 100) / 100))}
            disabled={!displayedImageData}
            title="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm zoom-readout"
            onClick={() => setZoom(1)}
            disabled={!displayedImageData}
            title="Reset zoom (Ctrl/Cmd+scroll to zoom)"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setZoom((z) => Math.min(4, Math.round((z + 0.25) * 100) / 100))}
            disabled={!displayedImageData}
            title="Zoom in"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
