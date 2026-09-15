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
import type { EffectInstance, LoadedMedia, Palette, RGB } from './types';

export default function App() {
  const [media, setMedia] = useState<LoadedMedia | null>(null);
  const [sourceFrame, setSourceFrame] = useState<ImageData | null>(null);
  const [preview, setPreview] = useState<ImageData | null>(null);
  const [processing, setProcessing] = useState(false);

  const [algorithmId, setAlgorithmId] = useState('floyd-steinberg');
  const [paletteId, setPaletteId] = useState('pico8');
  const [customPalette, setCustomPalette] = useState<Palette | null>(null);
  const [scale, setScale] = useState(2);
  const [threshold, setThreshold] = useState(0.5);
  const [preEffects, setPreEffects] = useState<EffectInstance[]>([]);
  const [postEffects, setPostEffects] = useState<EffectInstance[]>([]);

  const [playing, setPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reqRef = useRef(0);
  const videoRaf = useRef<number>(0);

  const activeColors: RGB[] = useMemo(() => {
    if (customPalette) return customPalette.colors;
    return getPalette(paletteId).colors;
  }, [paletteId, customPalette]);

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

  const grabVideoFrame = useCallback((video: HTMLVideoElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, []);

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
    setCustomPalette({
      id: `extracted-${Date.now()}`,
      name: `Extracted (${method})`,
      colors,
    });
  };

  return (
    <div className="app">
      <TopBar
        fileName={media?.name}
        processing={processing}
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
          onAlgorithm={setAlgorithmId}
          paletteId={paletteId}
          customPalette={customPalette}
          activeColors={activeColors}
          onSelectBuiltin={(id) => {
            setPaletteId(id);
            setCustomPalette(null);
          }}
          onCustomChange={(p) => {
            setCustomPalette(p);
            setPaletteId(p.id);
          }}
          onExtract={onExtract}
          scale={scale}
          onScale={setScale}
          threshold={threshold}
          onThreshold={setThreshold}
          preEffects={preEffects}
          postEffects={postEffects}
          onPreEffects={setPreEffects}
          onPostEffects={setPostEffects}
          algorithmCount={ALGORITHM_COUNT}
        />
      </div>
    </div>
  );
}
