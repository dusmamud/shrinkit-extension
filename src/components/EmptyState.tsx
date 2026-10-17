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
    <div className="flex w-full min-w-0 flex-col items-center justify-center gap-2 break-words px-4 py-10 text-center sm:px-6">
      {icon ? <div className="mb-1 text-4xl">{icon}</div> : null}
      <p className="min-w-0 text-base font-medium break-words">{title}</p>
      {hint ? (
        <p className="min-w-0 max-w-full break-words text-sm opacity-70 sm:max-w-sm">{hint}</p>
      ) : null}
    </div>
  );
}
