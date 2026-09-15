interface VideoTimelineProps {
  duration: number;
  currentTime: number;
  playing: boolean;
  onSeek: (t: number) => void;
  onTogglePlay: () => void;
}

export function VideoTimeline({
  duration,
  currentTime,
  playing,
  onSeek,
  onTogglePlay,
}: VideoTimelineProps) {
  if (!duration || duration <= 0) return null;
  return (
    <div className="timeline">
      <button type="button" className="btn btn-ghost" onClick={onTogglePlay}>
        {playing ? 'Pause' : 'Play'}
      </button>
      <input
        type="range"
        min={0}
        max={duration}
        step={0.01}
        value={currentTime}
        onChange={(e) => onSeek(Number(e.target.value))}
      />
      <span className="status">
        {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
      </span>
    </div>
  );
}
