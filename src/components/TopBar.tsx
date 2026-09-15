interface TopBarProps {
  onOpen: () => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  fileName?: string;
  processing?: boolean;
}

export function TopBar({
  onOpen,
  onExport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  fileName,
  processing,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="logo">
        <div className="logo-mark" />
        <span>DITHYR</span>
      </div>
      <span className="status">
        {fileName ? fileName : 'untitled'}
        {processing ? ' · processing…' : ''}
      </span>
      <div className="topbar-actions">
        <button
          type="button"
          className="btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl/Cmd+Z)"
        >
          Undo
        </button>
        <button
          type="button"
          className="btn"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl/Cmd+Shift+Z)"
        >
          Redo
        </button>
        <button type="button" className="btn" onClick={onOpen}>
          Open
        </button>
        <button type="button" className="btn btn-primary" onClick={onExport}>
          Export PNG
        </button>
      </div>
    </header>
  );
}
