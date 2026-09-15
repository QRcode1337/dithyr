import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TopBar } from './components/TopBar';
import { CanvasView } from './components/CanvasView';
import { Inspector } from './components/Inspector';
import { VideoTimeline } from './components/VideoTimeline';
import { ALGORITHM_COUNT } from './dither/registry';
import {
  extractPaletteKMeans,
  extractPaletteMedianCut,
  getPalette,
} from './dither/palettes';
import { processAsync } from './pipeline/workerClient';
import { createSampleImage } from './utils/sampleImage';
import { downloadImageData } from './utils/export';
import { useDocHistory, type DocSnapshot } from './hooks/useDocHistory';
import type { EffectInstance, LoadedMedia, Palette, RGB } from './types';

const INITIAL_DOC: DocSnapshot = {
  algorithmId: 'floyd-steinberg',
  paletteId: 'pico8',
  customPalette: null,
  scale: 2,
  threshold: 0.5,
  preEffects: [],
  postEffects: [],
};

export default function App() {
  const [media, setMedia] = useState<LoadedMedia | null>(null);
  const [sourceFrame, setSourceFrame] = useState<ImageData | null>(null);
  const [preview, setPreview] = useState<ImageData | null>(null);
  const [processing, setProcessing] = useState(false);

  const {
    present: doc,
    commit,
    commitDebounced,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useDocHistory(INITIAL_DOC);

  const {
    algorithmId,
    paletteId,
    customPalette,
    scale,
    threshold,
    preEffects,
    postEffects,
  } = doc;

  const [playing, setPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reqRef = useRef(0);
  const videoRaf = useRef<number>(0);

  const activeColors: RGB[] = useMemo(() => {
    if (customPalette) return customPalette.colors;
    return getPalette(paletteId).colors;
  }, [paletteId, customPalette]);

  // Initial sample
  useEffect(() => {
    const sample = createSampleImage(640, 480);
    setSourceFrame(sample);
    setMedia({
      kind: 'image',
      name: 'sample-gradient.png',
      width: sample.width,
      height: sample.height,
      imageData: sample,
    });
  }, []);

  const runPipeline = useCallback(
    async (frame: ImageData) => {
      const id = ++reqRef.current;
      setProcessing(true);
      try {
        const result = await processAsync({
          imageData: frame,
          algorithmId,
          palette: activeColors,
          scale,
          threshold,
          serpentine: algorithmId.includes('serpentine'),
          preEffects,
          postEffects,
        });
        if (id === reqRef.current) {
          setPreview(result);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (id === reqRef.current) setProcessing(false);
      }
    },
    [algorithmId, activeColors, scale, threshold, preEffects, postEffects]
  );

  useEffect(() => {
    if (sourceFrame) {
      void runPipeline(sourceFrame);
    }
  }, [sourceFrame, runPipeline]);

  // Keyboard undo/redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
        if (tag === 'input' && (target as HTMLInputElement).type === 'range') {
          // range inputs: still allow app undo
        } else if (tag === 'input' || tag === 'textarea') {
          return;
        }
      }
      const key = e.key.toLowerCase();
      if (key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }
      if (key === 'z') {
        e.preventDefault();
        undo();
        return;
      }
      if (key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const grabVideoFrame = useCallback((video: HTMLVideoElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, []);

  // Video playback loop — update source frame
  useEffect(() => {
    if (!media?.videoEl || !playing) {
      if (videoRaf.current) cancelAnimationFrame(videoRaf.current);
      return;
    }
    const video = media.videoEl;
    const tick = () => {
      if (video.paused || video.ended) {
        setPlaying(false);
        return;
      }
      const frame = grabVideoFrame(video);
      setSourceFrame(frame);
      setMedia((m) =>
        m
          ? {
              ...m,
              currentTime: video.currentTime,
              imageData: frame,
            }
          : m
      );
      videoRaf.current = requestAnimationFrame(tick);
    };
    videoRaf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(videoRaf.current);
  }, [media?.videoEl, playing, grabVideoFrame]);

  const loadFile = async (file: File) => {
    const type = file.type;
    if (type.startsWith('video/') || type === 'image/gif') {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error('Failed to load media'));
      });
      video.currentTime = 0;
      await new Promise<void>((r) => {
        video.onseeked = () => r();
        setTimeout(() => r(), 100);
      });
      const frame = grabVideoFrame(video);
      setSourceFrame(frame);
      setMedia({
        kind: type === 'image/gif' ? 'gif' : 'video',
        name: file.name,
        width: frame.width,
        height: frame.height,
        imageData: frame,
        videoEl: video,
        duration: video.duration || 0,
        currentTime: 0,
      });
      setPlaying(false);
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
    });
    const canvas = document.createElement('canvas');
    const maxDim = 1600;
    let w = img.width;
    let h = img.height;
    if (Math.max(w, h) > maxDim) {
      const s = maxDim / Math.max(w, h);
      w = Math.round(w * s);
      h = Math.round(h * s);
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    URL.revokeObjectURL(url);
    setSourceFrame(imageData);
    setMedia({
      kind: 'image',
      name: file.name,
      width: w,
      height: h,
      imageData,
    });
  };

  const onDropFiles = (files: FileList) => {
    const f = files[0];
    if (f) void loadFile(f);
  };

  const onExtract = (method: 'median-cut' | 'k-means') => {
    if (!sourceFrame) return;
    const colors =
      method === 'median-cut'
        ? extractPaletteMedianCut(sourceFrame, 8)
        : extractPaletteKMeans(sourceFrame, 8);
    const p: Palette = {
      id: `extracted-${Date.now()}`,
      name: `Extracted (${method})`,
      colors,
    };
    commit((d) => ({ ...d, customPalette: p, paletteId: p.id }));
  };

  const patchDebounced = (partial: Partial<DocSnapshot>) => {
    commitDebounced((d) => ({ ...d, ...partial }));
  };

  const patchCommit = (partial: Partial<DocSnapshot>) => {
    commit((d) => ({ ...d, ...partial }));
  };

  return (
    <div className="app">
      <TopBar
        fileName={media?.name}
        processing={processing}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onOpen={() => fileInputRef.current?.click()}
        onExport={() => {
          if (preview) {
            downloadImageData(preview, `dithyr-${Date.now()}.png`);
          }
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,.gif"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void loadFile(f);
          e.target.value = '';
        }}
      />
      <div className="workspace">
        <div className="canvas-area">
          <CanvasView
            imageData={preview}
            onDropFiles={onDropFiles}
            processing={processing}
          />
          {media?.videoEl && (
            <VideoTimeline
              duration={media.duration || 0}
              currentTime={media.currentTime || 0}
              playing={playing}
              onSeek={(t) => {
                const v = media.videoEl!;
                v.currentTime = t;
                const onSeeked = () => {
                  const frame = grabVideoFrame(v);
                  setSourceFrame(frame);
                  setMedia((m) =>
                    m ? { ...m, currentTime: t, imageData: frame } : m
                  );
                  v.removeEventListener('seeked', onSeeked);
                };
                v.addEventListener('seeked', onSeeked);
              }}
              onTogglePlay={() => {
                const v = media.videoEl!;
                if (playing) {
                  v.pause();
                  setPlaying(false);
                } else {
                  void v.play();
                  setPlaying(true);
                }
              }}
            />
          )}
        </div>
        <Inspector
          algorithmId={algorithmId}
          onAlgorithm={(id) => patchCommit({ algorithmId: id })}
          paletteId={paletteId}
          customPalette={customPalette}
          activeColors={activeColors}
          onSelectBuiltin={(id) =>
            patchCommit({ paletteId: id, customPalette: null })
          }
          onCustomChange={(p) =>
            patchDebounced({ customPalette: p, paletteId: p.id })
          }
          onExtract={onExtract}
          scale={scale}
          onScale={(v) => patchDebounced({ scale: v })}
          threshold={threshold}
          onThreshold={(v) => patchDebounced({ threshold: v })}
          preEffects={preEffects}
          postEffects={postEffects}
          onPreEffects={(e: EffectInstance[]) => {
            const prev = preEffects;
            const structural =
              e.length !== prev.length ||
              e.some(
                (x, i) =>
                  !prev[i] ||
                  x.id !== prev[i].id ||
                  x.enabled !== prev[i].enabled ||
                  x.type !== prev[i].type
              );
            if (structural) patchCommit({ preEffects: e });
            else patchDebounced({ preEffects: e });
          }}
          onPostEffects={(e: EffectInstance[]) => {
            const prev = postEffects;
            const structural =
              e.length !== prev.length ||
              e.some(
                (x, i) =>
                  !prev[i] ||
                  x.id !== prev[i].id ||
                  x.enabled !== prev[i].enabled ||
                  x.type !== prev[i].type
              );
            if (structural) patchCommit({ postEffects: e });
            else patchDebounced({ postEffects: e });
          }}
          algorithmCount={ALGORITHM_COUNT}
        />
      </div>
    </div>
  );
}
