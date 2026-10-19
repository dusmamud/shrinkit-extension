import React from 'react';
import type { Locale } from '../../lib/i18n/index';

export interface HomeCtaProps {
  locale: Locale;
}

const CONTENT = {
  en: {
    heading: 'Ready to Optimize Your Photos?',
    subheading: 'Resize and compress your images with 100% privacy — free forever.',
    cta: 'Resize an Image Now',
    badge: 'Free Forever · No Signup · Zero Watermarks',
  },
  es: {
    heading: '¿Listo para optimizar tus fotos?',
    subheading: 'Redimensiona y comprime tus fotos con 100% de privacidad, gratis para siempre.',
    cta: 'Redimensionar Imágenes Ahora',
    badge: 'Gratis Para Siempre · Sin Registro · Sin Marcas de Agua',
  },
  pt: {
    heading: 'Pronto para otimizar suas fotos?',
    subheading: 'Redimensione e comprima suas fotos com 100% de privacidade, grátis para sempre.',
    cta: 'Redimensionar Fotos Agora',
    badge: 'Gratuito Para Sempre · Sem Cadastro · Sem Marca d’Água',
  },
};

export default function HomeCta({ locale }: HomeCtaProps) {
  const content = CONTENT[locale] ?? CONTENT.en;

  const scrollToTopTool = () => {
    const el = document.getElementById('tool');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <section
      className="w-full border-t border-tborderfaint bg-tpage py-14 text-center sm:py-20"
      aria-label="Call to Action"
    >
      <div className="mx-auto box-border w-full min-w-0 max-w-4xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-tborderfaint bg-gradient-to-b from-tsurface to-tsurface2 p-8 shadow-sm sm:p-12">
          {/* Subtle accent background glow */}
          <div
            className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-taccent/5 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative z-10">
            <span className="mb-4 inline-block rounded-full border border-taccent/20 bg-taccent/10 px-3.5 py-1 text-xs font-semibold text-taccent">
              {content.badge}
            </span>

            <h2 className="mb-3 text-2xl font-extrabold tracking-tight text-tink sm:text-3xl md:text-4xl">
              {content.heading}
            </h2>

            <p className="mx-auto mb-8 max-w-xl text-sm text-tmuted sm:text-base">
              {content.subheading}
            </p>

            <button
              type="button"
              onClick={scrollToTopTool}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-tbtnb px-8 py-3.5 text-sm font-bold text-white shadow-md transition duration-200 hover:bg-[#0257bf] hover:shadow-lg active:scale-95 sm:text-base"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>{content.cta}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
