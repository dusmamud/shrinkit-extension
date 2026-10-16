import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  hint?: string;
  icon?: ReactNode;
}

/**
 * Centered empty state. All visible text comes from props so callers pass
 * already-localized strings — this component contains no hardcoded copy.
 */
export default function EmptyState({ title, hint, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      {icon ? <div className="mb-1 text-4xl">{icon}</div> : null}
      <p className="text-base font-medium">{title}</p>
      {hint ? <p className="max-w-sm text-sm opacity-70">{hint}</p> : null}
    </div>
  );
}
