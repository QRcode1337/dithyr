interface VideoTimelineProps {
  duration: number;
  currentTime: number;
  playing: boolean;
  onSeek: (t: number) => void;
  onTogglePlay: () => void;
}

function fmt(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VideoTimeline({
  duration,
  currentTime,
  playing,
  onSeek,
  onTogglePlay,
}: VideoTimelineProps) {
  return (
    <div className="timeline">
      <button type="button" className="btn btn-sm" onClick={onTogglePlay}>
        {playing ? 'Pause' : 'Play'}
      </button>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.01}
        value={currentTime}
        onChange={(e) => onSeek(Number(e.target.value))}
        aria-label="Scrub timeline"
      />
      <span className="timeline-time">
        {fmt(currentTime)} / {fmt(duration || 0)}
      </span>
    </div>
  );
}
