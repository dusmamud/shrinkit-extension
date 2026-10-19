import React from 'react';
import type { Locale } from '../../lib/i18n/index';

export interface FaqSectionProps {
  locale: Locale;
}

const CONTENT = {
  en: {
    badge: 'Frequently Asked Questions',
    heading: 'Everything You Need to Know',
    subheading:
      'Find quick answers regarding our privacy model, supported formats, and client-side processing.',
    faqs: [
      {
        q: 'Are my photos uploaded to any external server?',
        a: 'No. Never. ShrinkIt operates entirely inside your web browser using HTML5 Canvas and Web Workers. Your files are decoded and resized locally in your device memory. You can verify this anytime by opening your browser Developer Tools (F12 → Network tab) to confirm zero bytes are transmitted.',
      },
      {
        q: 'How does ShrinkIt reduce file size without losing quality?',
        a: 'ShrinkIt employs two complementary techniques: smart dimension downsampling (reducing unnecessary megapixel counts for viewing) and intelligent lossy or lossless compression (optimizing color tables and DCT matrices in JPG and WebP) to discard imperceptible data while keeping photos crisp.',
      },
      {
        q: 'Can I compress photos for government applications (50KB & 20KB limits)?',
        a: 'Yes! We offer dedicated tools specifically engineered for official application portals like UPSC, SSC, IBPS, and state exams: "Compress to 50KB" for portrait photos and "Signature to 20KB" for signature and thumb-impression scans.',
      },
      {
        q: 'Which image formats can I convert between?',
        a: 'You can input JPG, PNG, WebP, AVIF, GIF, BMP, and Apple iPhone HEIC/HEIF files. You can export directly to JPG (universal compatibility), PNG (transparency preserved), and modern WebP (optimized for web speed).',
      },
      {
        q: 'Can I use ShrinkIt when I don’t have internet access?',
        a: 'Yes. ShrinkIt runs entirely in-browser. Once the extension is installed, you can disconnect your Wi-Fi, and compress and resize photos completely offline.',
      },
    ],
  },
  es: {
    badge: 'Preguntas Frecuentes',
    heading: 'Todo lo que necesitas saber',
    subheading:
      'Respuestas claras sobre nuestro modelo de privacidad, formatos compatibles y procesamiento local.',
    faqs: [
      {
        q: '¿Se suben mis fotos a algún servidor externo?',
        a: 'No. Nunca. ShrinkIt funciona completamente dentro de tu navegador web mediante Canvas y Web Workers. Tus archivos se procesan en la memoria local de tu dispositivo. Puedes comprobarlo abriendo las herramientas de desarrollador (F12 → Red) y verás cero bytes transmitidos.',
      },
      {
        q: '¿Cómo reduce el tamaño sin perder calidad visible?',
        a: 'ShrinkIt combina el remuestreo de dimensiones con algoritmos inteligentes de compresión JPG y WebP para descartar información redundante sin degradar la nitidez visual a simple vista.',
      },
      {
        q: '¿Puedo comprimir fotos para trámites oficiales (límites de 50KB y 20KB)?',
        a: '¡Sí! Contamos con herramientas especializadas para formularios oficiales: "Comprimir a 50KB" para fotos tamaño carnet y "Firma a 20KB" para firmas y huellas.',
      },
      {
        q: '¿Qué formatos de imagen son compatibles?',
        a: 'Aceptamos JPG, PNG, WebP, AVIF, GIF, BMP y fotos HEIC de iPhone. Puedes exportar a JPG, PNG y al moderno formato WebP.',
      },
      {
        q: '¿Puedo usar ShrinkIt sin conexión a internet?',
        a: 'Sí. ShrinkIt funciona sin conexión. Una vez abierta la extensión, puedes desconectar el Wi-Fi y seguir optimizando fotos con total normalidad.',
      },
    ],
  },
  pt: {
    badge: 'Perguntas Frequentes',
    heading: 'Tudo o que você precisa saber',
    subheading:
      'Respostas diretas sobre nosso modelo de privacidade, formatos e processamento local.',
    faqs: [
      {
        q: 'Minhas fotos são enviadas para algum servidor externo?',
        a: 'Não. Nunca. O ShrinkIt opera 100% no seu navegador usando Canvas e Web Workers. Suas imagens são processadas na memória local do seu aparelho. Você pode verificar abrindo o painel de desenvolvedor (F12 → Rede) e confirmando que nenhum byte é enviado.',
      },
      {
        q: 'Como o ShrinkIt reduz o tamanho sem perder qualidade visível?',
        a: 'O ShrinkIt aplica algoritmos avançados de compressão em JPG e WebP que eliminam dados redundantes mantendo a nitidez idêntica a olho nu.',
      },
      {
        q: 'Posso comprimir para editais e concursos (limites de 50KB e 20KB)?',
        a: 'Sim! Temos ferramentas dedicadas para concursos e vestibulares: "Comprimir para 50KB" para fotos 3x4 e "Assinatura para 20KB" para assinaturas digitalizadas.',
      },
      {
        q: 'Quais formatos de imagem são aceitos?',
        a: 'Suporta JPG, PNG, WebP, AVIF, GIF, BMP e arquivos HEIC de iPhone. É possível exportar para JPG, PNG e WebP.',
      },
      {
        q: 'Posso usar o ShrinkIt sem conexão com a internet?',
        a: 'Sim. O ShrinkIt funciona sem conexão com a internet. Você pode desligar a internet e continuar redimensionando fotos offline.',
      },
    ],
  },
};

export default function FaqSection({ locale }: FaqSectionProps) {
  const content = CONTENT[locale] ?? CONTENT.en;

  return (
    <section
      className="w-full border-t border-tborderfaint bg-tband py-12 sm:py-16"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto box-border w-full min-w-0 max-w-4xl px-4 sm:px-6">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-taccent/20 bg-taccent/10 px-3 py-1 text-xs font-semibold text-taccent">
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            {content.badge}
          </div>
          <h2
            id="faq-heading"
            className="text-2xl font-bold tracking-tight text-tink sm:text-3xl md:text-4xl"
          >
            {content.heading}
          </h2>
          <p className="mt-2 text-sm text-tmuted sm:text-base">
            {content.subheading}
          </p>
        </div>

        <div className="space-y-3">
          {content.faqs.map((faq, idx) => (
            <details
              key={`faq-${idx}`}
              className="group rounded-2xl border border-tborderfaint bg-tsurface p-5 transition duration-200 hover:border-taccent/40 open:border-taccent/60 open:shadow-sm"
            >
              <summary className="flex cursor-pointer list-none select-none items-center justify-between text-sm font-semibold text-tink sm:text-base [&::-webkit-details-marker]:hidden">
                <span className="pr-4">{faq.q}</span>
                <span className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tsurface2 text-tmuted transition-transform duration-200 group-open:rotate-180 group-open:text-taccent">
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </summary>
              <div className="mt-3.5 border-t border-tborderfaint/60 pt-3 text-xs leading-relaxed text-tmuted sm:text-sm">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
