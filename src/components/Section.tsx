import type { ReactNode } from 'react';

interface SectionProps {
  id: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  badge?: ReactNode;
  children: ReactNode;
}

export function Section({ id, title, open, onToggle, badge, children }: SectionProps) {
  const panelId = `section-panel-${id}`;
  const headerId = `section-header-${id}`;

  return (
    <section className={`section${open ? ' is-open' : ' is-collapsed'}`}>
      <h2 className="section-header sticky">
        <button
          type="button"
          id={headerId}
          className="section-toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span className="section-chevron" aria-hidden>
            {open ? '▾' : '▸'}
          </span>
          <span className="section-title">{title}</span>
          {badge}
        </button>
      </h2>
      {open && (
        <div className="section-body" id={panelId} role="region" aria-labelledby={headerId}>
          {children}
        </div>
      )}
    </section>
  );
}
