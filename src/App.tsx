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
import { loadSampleImage } from './utils/sampleImage';
import { downloadImageData, exportVideo } from './utils/export';
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
  const [compareMode, setCompareMode] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reqRef = useRef(0);
  const videoRaf = useRef<number>(0);
  const processingRef = useRef(false);
  const pendingVideoFrameRef = useRef<ImageData | null>(null);

  const activeColors: RGB[] = useMemo(() => {
    if (customPalette) return customPalette.colors;
    return getPalette(paletteId).colors;
  }, [paletteId, customPalette]);

  useEffect(() => {
    void loadSampleImage().then((sample) => {
      setSourceFrame(sample);
      setMedia({
        kind: 'image',
        name: 'mage.jpg',
        width: sample.width,
        height: sample.height,
        imageData: sample,
      });
    });
  }, []);

  const runPipeline = useCallback(
    async (frame: ImageData) => {
      const id = ++reqRef.current;
      processingRef.current = true;
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
        if (id === reqRef.current) setPreview(result);
      } catch (err) {
        console.error(err);
      } finally {
        if (id === reqRef.current) {
          processingRef.current = false;
          setProcessing(false);
          const pendingFrame = pendingVideoFrameRef.current;
          if (pendingFrame) {
            pendingVideoFrameRef.current = null;
            setSourceFrame(pendingFrame);
          }
        }
      }
    },
    [algorithmId, activeColors, scale, threshold, preEffects, postEffects]
  );

  useEffect(() => {
    if (sourceFrame) void runPipeline(sourceFrame);
  }, [sourceFrame, runPipeline]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
        if (!(tag === 'input' && (target as HTMLInputElement).type === 'range')) {
          if (tag === 'input' || tag === 'textarea') return;
        }
      }
      const key = e.key.toLowerCase();
      if (key === 'z' && e.shiftKey) { e.preventDefault(); redo(); return; }
      if (key === 'z') { e.preventDefault(); undo(); return; }
      if (key === 'y') { e.preventDefault(); redo(); }
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

  const seekVideoFrame = useCallback((video: HTMLVideoElement, time: number) => {
    return new Promise<void>((resolve, reject) => {
      if (Math.abs(video.currentTime - time) < 0.001) {
        requestAnimationFrame(() => resolve());
        return;
      }
      const cleanup = () => {
        window.clearTimeout(timeout);
        video.removeEventListener('seeked', done);
        video.removeEventListener('error', fail);
      };
      const done = () => { cleanup(); resolve(); };
      const fail = () => { cleanup(); reject(new Error('Failed to seek video')); };
      const timeout = window.setTimeout(() => { cleanup(); reject(new Error('Timed out seeking video')); }, 5000);
      video.addEventListener('seeked', done);
      video.addEventListener('error', fail);
      video.currentTime = time;
    });
  }, []);

  useEffect(() => {
    if (!media?.videoEl || !playing) {
      if (videoRaf.current) cancelAnimationFrame(videoRaf.current);
      return;
    }
    const video = media.videoEl;
    const tick = () => {
      if (video.paused || video.ended) { setPlaying(false); return; }
      const frame = grabVideoFrame(video);
      if (!processingRef.current) {
        pendingVideoFrameRef.current = null;
        setSourceFrame(frame);
      } else {
        pendingVideoFrameRef.current = frame;
      }
      setMedia((m) => (m ? { ...m, currentTime: video.currentTime, imageData: frame } : m));
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
      await seekVideoFrame(video, 0);
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
    setMedia({ kind: 'image', name: file.name, width: w, height: h, imageData });
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
    const p: Palette = { id: `extracted-${Date.now()}`, name: `Extracted (${method})`, colors };
    commit((d) => ({ ...d, customPalette: p, paletteId: p.id }));
  };

  const patchDebounced = (partial: Partial<DocSnapshot>) => commitDebounced((d) => ({ ...d, ...partial }));
  const patchCommit = (partial: Partial<DocSnapshot>) => commit((d) => ({ ...d, ...partial }));

  const onExportVideo = async () => {
    if (!media?.videoEl || exporting) return;
    setExporting(true);
    setExportProgress(0);
    try {
      await exportVideo(
        media.videoEl,
        (frame) =>
          processAsync({
            imageData: frame,
            algorithmId,
            palette: activeColors,
            scale,
            threshold,
            serpentine: algorithmId.includes('serpentine'),
            preEffects,
            postEffects,
          }),
        media.width,
        media.height,
        setExportProgress
      );
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
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
        onExport={() => { if (preview) downloadImageData(preview, `dithyr-${Date.now()}.png`); }}
        onExportVideo={media?.videoEl ? onExportVideo : undefined}
        exporting={exporting}
        exportProgress={exportProgress}
        onToggleCompare={() => setCompareMode((value) => !value)}
      />
      <input ref={fileInputRef} type="file" accept="image/*,video/*,.gif" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void loadFile(f); e.target.value = ''; }} />
      <div className="workspace">
        <div className="canvas-area">
          <CanvasView imageData={preview} sourceImageData={sourceFrame} compareMode={compareMode} onDropFiles={onDropFiles} processing={processing} />
          {media?.videoEl && (
            <VideoTimeline
              duration={media.duration || 0}
              currentTime={media.currentTime || 0}
              playing={playing}
              onSeek={(t) => {
                const v = media.videoEl!;
                void seekVideoFrame(v, t).then(() => {
                  const frame = grabVideoFrame(v);
                  setSourceFrame(frame);
                  setMedia((m) => (m ? { ...m, currentTime: t, imageData: frame } : m));
                });
              }}
              onTogglePlay={() => {
                const v = media.videoEl!;
                if (playing) { v.pause(); setPlaying(false); }
                else { void v.play(); setPlaying(true); }
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
          onSelectBuiltin={(id) => patchCommit({ paletteId: id, customPalette: null })}
          onCustomChange={(p) => patchDebounced({ customPalette: p, paletteId: p.id })}
          onExtract={onExtract}
          scale={scale}
          onScale={(v) => patchDebounced({ scale: v })}
          threshold={threshold}
          onThreshold={(v) => patchDebounced({ threshold: v })}
          preEffects={preEffects}
          postEffects={postEffects}
          onPreEffects={(e: EffectInstance[]) => {
            const prev = preEffects;
            const structural = e.length !== prev.length || e.some((x, i) => !prev[i] || x.id !== prev[i].id || x.enabled !== prev[i].enabled || x.type !== prev[i].type);
            if (structural) patchCommit({ preEffects: e }); else patchDebounced({ preEffects: e });
          }}
          onPostEffects={(e: EffectInstance[]) => {
            const prev = postEffects;
            const structural = e.length !== prev.length || e.some((x, i) => !prev[i] || x.id !== prev[i].id || x.enabled !== prev[i].enabled || x.type !== prev[i].type);
            if (structural) patchCommit({ postEffects: e }); else patchDebounced({ postEffects: e });
          }}
          algorithmCount={ALGORITHM_COUNT}
        />
      </div>
      <footer className="made-by">
        <a href="https://epsilonsec.ai" target="_blank" rel="noopener noreferrer">
          made by <span>Epsilonsec.ai</span>
        </a>
      </footer>
    </div>
  );
}
