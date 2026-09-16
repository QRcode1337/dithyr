import type { ReactNode } from 'react';

export function Explain({ label = 'About', children }: { label?: string; children: ReactNode }) {
  return (
    <details className="explain-fold">
      <summary>{label}</summary>
      <div className="explain-fold-body">{children}</div>
    </details>
  );
}
