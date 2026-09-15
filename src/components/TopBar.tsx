interface TopBarProps {
  onOpen: () => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onToggleCompare: () => void;
  onExportVideo?: () => void;
  fileName?: string;
  processing?: boolean;
  exporting?: boolean;
  exportProgress?: number;
}

export function TopBar({
  onOpen,
  onExport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onToggleCompare,
  onExportVideo,
  fileName,
  processing,
  exporting,
  exportProgress = 0,
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
        <button type="button" className="btn" onClick={onToggleCompare}>
          Compare
        </button>
        {onExportVideo && (
          <button
            type="button"
            className="btn"
            onClick={onExportVideo}
            disabled={exporting}
          >
            {exporting
              ? `Exporting ${Math.round(exportProgress * 100)}%`
              : 'Export Video'}
          </button>
        )}
        <button type="button" className="btn btn-primary" onClick={onExport}>
          Export PNG
        </button>
      </div>
    </header>
  );
}
