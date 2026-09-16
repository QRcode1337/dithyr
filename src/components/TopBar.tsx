import { LOGO_MARK_SM_SRC, LOGO_WORDMARK_SM_SRC } from '../brand/assets';

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

function Kbd({ children }: { children: string }) {
  return <kbd className="kbd">{children}</kbd>;
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
  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const mod = isMac ? '⌘' : 'Ctrl';

  return (
    <header className="topbar">
      <div className="brand">
        <img
          className="brand-mark"
          src={LOGO_MARK_SM_SRC}
          alt=""
          width={48}
          height={48}
          draggable={false}
        />
        <img
          className="brand-wordmark"
          src={LOGO_WORDMARK_SM_SRC}
          alt="dithyr"
          height={32}
          width={164}
          draggable={false}
        />
        <span className="brand-tagline">creative dithering studio</span>
      </div>

      <div className={`status-pill${processing || exporting ? ' is-busy' : ''}`}>
        <span className="status-dot" aria-hidden />
        <span className="status-name" title={fileName || 'untitled'}>
          {fileName || 'untitled'}
        </span>
        {processing && <span className="status-busy">rendering</span>}
        {exporting && (
          <span className="status-busy">export {Math.round(exportProgress * 100)}%</span>
        )}
      </div>

      <div className="topbar-actions">
        <div className="btn-group" role="group" aria-label="History">
          <button
            type="button"
            className="btn btn-icon"
            onClick={onUndo}
            disabled={!canUndo}
            title={`Undo (${mod}+Z)`}
          >
            <span aria-hidden>↶</span>
            <span className="btn-label">Undo</span>
            <Kbd>{`${mod}+Z`}</Kbd>
          </button>
          <button
            type="button"
            className="btn btn-icon"
            onClick={onRedo}
            disabled={!canRedo}
            title={`Redo (${mod}+Shift+Z)`}
          >
            <span aria-hidden>↷</span>
            <span className="btn-label">Redo</span>
            <Kbd>{`${mod}+⇧Z`}</Kbd>
          </button>
        </div>

        <div className="btn-group">
          <button type="button" className="btn" onClick={onOpen} title="Open image, GIF, or video">
            Open
          </button>
          <button
            type="button"
            className="btn"
            onClick={onToggleCompare}
            title="Toggle original vs dithered"
          >
            Compare
          </button>
          {onExportVideo && (
            <button
              type="button"
              className="btn"
              onClick={onExportVideo}
              disabled={exporting}
              title="Export processed video as WebM"
            >
              {exporting
                ? `Exporting ${Math.round(exportProgress * 100)}%`
                : 'Export Video'}
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={onExport}
            title="Export current preview as PNG"
          >
            Export PNG
          </button>
        </div>
      </div>
    </header>
  );
}
