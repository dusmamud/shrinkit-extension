interface LogoProps {
  size?: 16 | 32 | 48 | 128;
  showWordmark?: boolean;
}

function resolveIconUrl(size: number): string {
  const path = `icons/icon-${size}.png`;
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      return chrome.runtime.getURL(path);
    }
  } catch {
    // Not running inside an extension context — fall through to the
    // relative path below, which works for plain web pages / previews.
  }
  return `/${path}`;
}

/**
 * ShrinkIt brand mark: the extension icon plus the "ShrinkIt" wordmark.
 * The wordmark is the product brand name, not a localizable UI string.
 * The icon URL resolves through chrome.runtime.getURL inside extension
 * pages and falls back to a relative path elsewhere.
 */
export default function Logo({ size = 48, showWordmark = true }: LogoProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <img
        src={resolveIconUrl(size)}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size, maxWidth: size, maxHeight: size }}
        className="shrink-0"
        draggable={false}
      />
      {showWordmark && (
        <span className="text-lg font-semibold leading-none tracking-tight">ShrinkIt</span>
      )}
    </span>
  );
}
