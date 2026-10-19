import React from 'react';
import type { Locale } from '../../lib/i18n/index';

export interface ZeroUploadGuaranteeProps {
  locale: Locale;
}

const CONTENT = {
  en: {
    badge: 'Verified Privacy Architecture',
    heading: '100% In-Browser. Zero Uploads to Any Server.',
    subheading:
      'Your photos contain private memories, location GPS data, and personal documents. We believe they should never touch third-party servers.',
    terminalTitle: 'Browser Network Inspector (F12)',
    reqSent: 'Requests sent to remote servers',
    bytesTransferred: 'Bytes transferred over network',
    storageUsed: 'Cloud database storage used',
    testLabel: 'Test it yourself:',
    testPress: 'Press',
    testOrClick: 'or right-click → Inspect →',
    testTail: 'tab. Resize any file and verify that no upload requests are ever fired.',
    cards: [
      {
        title: 'Processed Entirely on Your Device',
        desc: 'ShrinkIt leverages modern Canvas and Web Workers running in your browser sandbox. Decoding, resizing, and encoding are 100% local.',
      },
      {
        title: 'Works Fully Offline',
        desc: 'Load the extension once, turn off your Wi-Fi, and resize your images. It works without an active internet connection.',
      },
      {
        title: 'EXIF Scrubbed Completely',
        desc: 'Hidden camera model tags, serial numbers, timestamps, and GPS coordinates are stripped clean before you download.',
      },
    ],
  },
  es: {
    badge: 'Arquitectura de Privacidad Verificada',
    heading: '100% en tu navegador. Cero subidas a servidores.',
    subheading:
      'Tus fotos contienen recuerdos privados, datos de ubicación GPS y documentos personales. Creemos que nunca deben enviarse a la nube.',
    terminalTitle: 'Inspector de Red del Navegador (F12)',
    reqSent: 'Peticiones enviadas a servidores remotos',
    bytesTransferred: 'Bytes transferidos por la red',
    storageUsed: 'Almacenamiento en base de datos en la nube',
    testLabel: 'Compruébalo tú mismo:',
    testPress: 'Pulsa',
    testOrClick: 'o clic derecho → Inspeccionar →',
    testTail:
      'pestaña. Redimensiona cualquier archivo y comprueba que nunca se envía ninguna subida.',
    cards: [
      {
        title: 'Procesado totalmente en tu dispositivo',
        desc: 'ShrinkIt usa Canvas y Web Workers en el entorno seguro de tu navegador. La compresión y codificación son 100% locales.',
      },
      {
        title: 'Funciona completamente sin conexión',
        desc: 'Abre la extensión, apaga tu Wi-Fi y optimiza tus fotos. Funciona incluso sin internet.',
      },
      {
        title: 'Metadatos EXIF eliminados por completo',
        desc: 'Coordenadas GPS, modelo de cámara y fecha se eliminan automáticamente para proteger tu privacidad.',
      },
    ],
  },
  pt: {
    badge: 'Arquitetura de Privacidade Verificada',
    heading: '100% no seu navegador. Zero envios para servidores.',
    subheading:
      'Suas fotos contêm momentos privados, GPS e documentos. Acreditamos que elas nunca devem ser enviadas para a nuvem.',
    terminalTitle: 'Inspetor de Rede do Navegador (F12)',
    reqSent: 'Requisições enviadas a servidores remotos',
    bytesTransferred: 'Bytes transmitidos pela rede',
    storageUsed: 'Espaço usado em banco de dados na nuvem',
    testLabel: 'Teste você mesmo:',
    testPress: 'Pressione',
    testOrClick: 'ou clique com o botão direito → Inspecionar →',
    testTail: 'aba. Redimensione qualquer arquivo e confirme que nenhum upload é feito.',
    cards: [
      {
        title: 'Processado totalmente no seu dispositivo',
        desc: 'O ShrinkIt usa APIs de Canvas e Web Workers no navegador. A compressão e redimensionamento são 100% locais.',
      },
      {
        title: 'Funciona completamente offline',
        desc: 'Abra a extensão, desligue o Wi-Fi e use normalmente. Funciona mesmo sem conexão com a internet.',
      },
      {
        title: 'Metadados EXIF removidos por completo',
        desc: 'Localização GPS, modelo de câmera e dados pessoais são limpos automaticamente antes do download.',
      },
    ],
  },
};

export default function ZeroUploadGuarantee({ locale }: ZeroUploadGuaranteeProps) {
  const content = CONTENT[locale] ?? CONTENT.en;

  return (
    <section
      className="w-full border-t border-tborderfaint bg-tpage py-12 sm:py-16"
      aria-labelledby="privacy-guarantee-heading"
    >
      <div className="mx-auto box-border w-full min-w-0 max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          {/* Left text & cards */}
          <div className="lg:col-span-7">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
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
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              {content.badge}
            </div>
            <h2
              id="privacy-guarantee-heading"
              className="text-2xl font-bold leading-tight tracking-tight text-tink sm:text-3xl md:text-4xl"
            >
              {content.heading}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-tmuted sm:text-base">
              {content.subheading}
            </p>

            <div className="mt-8 space-y-4">
              {content.cards.map((card, idx) => (
                <div key={`priv-card-${idx}`} className="flex items-start gap-3.5">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-tink sm:text-base">{card.title}</h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-tmuted sm:text-sm">
                      {card.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right terminal / devtools proof card */}
          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-2xl border border-tborderfaint bg-tsurface shadow-xl">
              <div className="flex items-center justify-between border-b border-tborderfaint bg-tsurface2 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                  <span className="ml-2 font-mono text-xs font-medium text-tmuted">
                    {content.terminalTitle}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Live Sandbox
                </span>
              </div>

              <div className="space-y-4 p-5 font-mono text-xs">
                <div className="flex items-center justify-between rounded-lg border border-tborderfaint bg-tsurface2 p-3">
                  <span className="text-tmuted">{content.reqSent}</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    0 req
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-tborderfaint bg-tsurface2 p-3">
                  <span className="text-tmuted">{content.bytesTransferred}</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    0 KB
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-tborderfaint bg-tsurface2 p-3">
                  <span className="text-tmuted">{content.storageUsed}</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    0 bytes
                  </span>
                </div>

                <div className="pt-2 text-[11px] leading-normal text-tmuted">
                  <p>
                    💡 <span className="font-semibold text-tink">{content.testLabel}</span>{' '}
                    {content.testPress}{' '}
                    <kbd className="rounded border border-tborderfaint bg-tsurface2 px-1.5 py-0.5 font-semibold text-tink">
                      F12
                    </kbd>{' '}
                    {content.testOrClick} <strong>Network</strong> {content.testTail}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
