import { useEffect, useRef, useState } from 'react';
import { t } from '../../lib/i18n/index';
import type { Locale } from '../../lib/i18n/index';

export interface InfoSectionsProps {
  locale: Locale;
}

interface InfoBlock {
  illustration: string;
  lightSrc: string;
  darkSrc: string;
  titleKey: string;
  paragraphKeys: readonly string[];
  /** Slide 2 flips illustration/text order on desktop, like the web app. */
  flipOnDesktop: boolean;
}

const BLOCKS: readonly InfoBlock[] = [
  {
    illustration: 'what',
    lightSrc: 'what-is-file-size-color.svg',
    darkSrc: 'what-is-file-size-color-dark.svg',
    titleKey: 'info1.title',
    paragraphKeys: ['info1.p1', 'info1.p2', 'info1.p3'],
    flipOnDesktop: false,
  },
  {
    illustration: 'how',
    lightSrc: 'how-to-reduce-file-size-color.svg',
    darkSrc: 'how-to-reduce-file-size-color-dark.svg',
    titleKey: 'info2.title',
    paragraphKeys: ['info2.p1', 'info2.p2', 'info2.p3'],
    flipOnDesktop: true,
  },
];

/** Resolve an illustration URL inside the extension (or plain web path). */
function illustrationUrl(file: string): string {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(`Illustration/${file}`);
  }
  return `/Illustration/${file}`;
}

/**
 * Info sections, mirroring the web app's InfoSections: two illustrated
 * explainer blocks. On narrow viewports (<1185px) they swipe horizontally
 * with pagination bullets, exactly like the web app; on desktop they stack.
 * Illustration swaps light/dark with the [data-theme] attribute, like web.
 */
export default function InfoSections({ locale }: InfoSectionsProps) {
  const [isDark, setIsDark] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const applyTheme = () => {
      setIsDark(document.documentElement.dataset.theme === 'dark');
    };
    applyTheme();
    const observer = new MutationObserver(applyTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  const handleScroll = () => {
    const wrapper = wrapperRef.current;
    if (!wrapper || wrapper.clientWidth <= 0) {
      return;
    }
    setActiveIndex(Math.round(wrapper.scrollLeft / wrapper.clientWidth));
  };

  const scrollToSlide = (index: number) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }
    wrapper.scrollTo({ left: index * wrapper.clientWidth, behavior: 'smooth' });
  };

  return (
    <div className="mt-5 overflow-x-clip bg-tband py-[3.125rem] min-[1185px]:py-[4.375rem]">
      <div className="mx-auto box-border w-full min-w-0 px-4">
        <div className="relative min-w-0">
          <div
            ref={wrapperRef}
            onScroll={handleScroll}
            className="flex flex-row snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-[1185px]:snap-none min-[1185px]:flex-col min-[1185px]:overflow-visible"
          >
            {BLOCKS.map((block) => (
              <div
                key={block.illustration}
                className="w-full shrink-0 snap-center min-[1185px]:snap-align-none"
              >
                <div className="mx-auto flex max-w-[1075px] min-w-0 flex-col items-center justify-center min-[1185px]:mb-[4.0625rem] min-[1185px]:flex-row min-[1185px]:gap-16 min-[1185px]:last:mb-0">
                  <div
                    className={`flex w-full items-center justify-center p-4 min-[1185px]:w-1/2 min-[1185px]:p-8 ${
                      block.flipOnDesktop
                        ? 'order-1 min-[1185px]:order-2'
                        : 'order-1 min-[1185px]:order-1'
                    }`}
                  >
                    <img
                      src={illustrationUrl(isDark ? block.darkSrc : block.lightSrc)}
                      alt={t(locale, block.titleKey)}
                      width="420"
                      height="420"
                      loading="lazy"
                      decoding="async"
                      className="pointer-events-none h-auto max-h-[240px] w-auto max-w-full object-contain select-none min-[600px]:max-h-[300px] min-[1185px]:max-h-[360px]"
                    />
                  </div>

                  <div
                    className={`flex w-full items-center px-4 min-[1185px]:max-w-[35.625rem] min-[1185px]:px-0 ${
                      block.flipOnDesktop
                        ? 'order-2 min-[1185px]:order-1'
                        : 'order-2 min-[1185px]:order-2'
                    }`}
                  >
                    <div className="mx-auto w-[90%] min-[1185px]:w-full">
                      <h3 className="pb-5 text-[1.875rem] leading-tight font-normal break-words text-tink min-[700px]:text-[2.5rem]">
                        {t(locale, block.titleKey)}
                      </h3>
                      <div className="space-y-4 text-[1.0625rem] leading-relaxed font-light break-words text-tink2">
                        {block.paragraphKeys.map((key) => (
                          <p key={key}>{t(locale, key)}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            className="mt-8 flex items-center justify-center gap-2.5 min-[1185px]:hidden"
            aria-label={t(locale, 'home.info.pagination')}
          >
            {BLOCKS.map((block, index) => (
              <button
                key={block.illustration}
                type="button"
                onClick={() => scrollToSlide(index)}
                aria-label={t(locale, block.titleKey)}
                aria-current={index === activeIndex}
                className={`h-[14px] w-[14px] cursor-pointer rounded-full transition-all ${
                  index === activeIndex ? 'bg-tswiperon' : 'bg-tswiperoff'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
