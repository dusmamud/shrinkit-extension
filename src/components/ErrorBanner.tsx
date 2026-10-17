interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  /** Accessible label for the dismiss button. Omit to use the visible × as the name. */
  dismissLabel?: string;
}

/**
 * Red error banner. All visible text comes from props so callers pass
 * already-localized strings — this component contains no hardcoded copy.
 */
export default function ErrorBanner({ message, onDismiss, dismissLabel }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex w-full min-w-0 max-w-full items-start justify-between gap-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
    >
      <p className="min-w-0 flex-1 break-words">{message}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="shrink-0 cursor-pointer rounded px-1 text-base leading-none font-bold hover:bg-red-100"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
