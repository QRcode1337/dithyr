export function downloadImageData(imageData: ImageData, filename = 'dithyr.png') {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  canvas.toBlob((blob) => {
    if (!blob) return;
    downloadBlob(blob, filename);
  }, 'image/png');
}

export function downloadJson(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/json' });
  downloadBlob(blob, filename);
}

export async function exportVideo(
  source: HTMLVideoElement,
  processFrame: (frame: ImageData) => Promise<ImageData>,
  width: number,
  height: number,
  onProgress: (progress: number) => void
) {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder is not supported in this browser');
  }

  const fps = 24;
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;
  outputCanvas.style.display = 'none';
  document.body.appendChild(outputCanvas);

  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = width;
  frameCanvas.height = height;
  const frameCtx = frameCanvas.getContext('2d')!;
  const outputCtx = outputCanvas.getContext('2d')!;

  let stream = outputCanvas.captureStream(0);
  let streamTrack = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
  if (typeof streamTrack.requestFrame !== 'function') {
    streamTrack.stop();
    stream = outputCanvas.captureStream(fps);
    streamTrack = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
  }

  const mimeType = getWebmMimeType();
  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(
    stream,
    mimeType ? { mimeType } : undefined
  );
  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => reject(new Error('MediaRecorder failed'));
    recorder.onstop = () => {
      if (!chunks.length) {
        reject(new Error('MediaRecorder produced no data'));
        return;
      }
      resolve(new Blob(chunks, { type: mimeType || 'video/webm' }));
    };
  });

  const originalTime = source.currentTime;
  const wasPaused = source.paused;
  source.pause();

  try {
    recorder.start(1000);
    onProgress(0);

    const duration = source.duration || 0;
    const frameCount = Math.max(1, Math.ceil(duration * fps));
    const startedAt = performance.now();
    for (let i = 0; i < frameCount; i++) {
      const time = Math.min(i / fps, duration);
      await seekVideo(source, time);
      frameCtx.drawImage(source, 0, 0, width, height);
      const frame = frameCtx.getImageData(0, 0, width, height);
      const processed = await processFrame(frame);
      outputCtx.putImageData(processed, 0, 0);
      streamTrack.requestFrame?.();
      onProgress((i + 1) / frameCount);

      const delay = startedAt + ((i + 1) * 1000) / fps - performance.now();
      if (delay > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
      }
    }

    recorder.stop();
    const blob = await stopped;
    downloadBlob(blob, `dithyr-${Date.now()}.webm`);
  } finally {
    if (recorder.state !== 'inactive') {
      recorder.stop();
      await stopped.catch(() => undefined);
    }
    stream.getTracks().forEach((track) => track.stop());
    outputCanvas.remove();
    await seekVideo(source, originalTime);
    if (!wasPaused) void source.play();
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getWebmMimeType() {
  return (
    ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(
      (type) => MediaRecorder.isTypeSupported(type)
    ) || ''
  );
}

function seekVideo(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve, reject) => {
    const done = () => {
      video.removeEventListener('seeked', done);
      video.removeEventListener('error', fail);
      resolve();
    };
    const fail = () => {
      video.removeEventListener('seeked', done);
      video.removeEventListener('error', fail);
      reject(new Error('Failed to seek video'));
    };

    video.addEventListener('seeked', done);
    video.addEventListener('error', fail);
    video.currentTime = time;
    if (Math.abs(video.currentTime - time) < 0.001) {
      requestAnimationFrame(done);
    }
  });
}
