interface TopBarProps {
  onOpen: () => void;
  onExport: () => void;
  fileName?: string;
  processing?: boolean;
}

export function TopBar({ onOpen, onExport, fileName, processing }: TopBarProps) {
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
