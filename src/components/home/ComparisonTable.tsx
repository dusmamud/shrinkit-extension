import React from 'react';
import type { Locale } from '../../lib/i18n/index';

export interface ComparisonTableProps {
  locale: Locale;
}

const CONTENT = {
  en: {
    badge: 'Why Choose ShrinkIt',
    heading: 'ShrinkIt vs. Cloud Image Resizers',
    subheading:
      'See how in-browser processing beats slow, cloud-upload tools in privacy, speed, and freedom.',
    featureCol: 'Feature',
    shrinkitCol: 'ShrinkIt (In-Browser)',
    othersCol: 'Traditional Cloud Compressors',
    rows: [
      {
        feature: 'Server Uploads',
        shrinkit: '0 (Processed 100% locally on your device)',
        others: 'Full image uploaded to cloud server',
        winner: true,
      },
      {
        feature: 'Data Privacy & Leaks',
        shrinkit: '100% Private (Nobody can view or save your files)',
        others: 'Files stored temporarily on 3rd-party servers',
        winner: true,
      },
      {
        feature: 'Processing Speed',
        shrinkit: 'Instant (No internet upload latency)',
        others: 'Delayed by upload & download connection speed',
        winner: true,
      },
      {
        feature: 'Daily Limits & Paywalls',
        shrinkit: 'Unlimited & Free forever',
        others: 'Free tiers limit usage; full access needs a paid plan',
        winner: true,
      },
      {
        feature: 'Offline Availability',
        shrinkit: 'Yes (Full offline capability)',
        others: 'No (Requires constant internet connection)',
        winner: true,
      },
      {
        feature: 'Watermarks or Account',
        shrinkit: 'None (Zero signup, zero branding marks)',
        others: 'Account walls, newsletter popups, watermarks',
        winner: true,
      },
    ],
  },
  es: {
    badge: '¿Por qué elegir ShrinkIt?',
    heading: 'ShrinkIt frente a compresores en la nube',
    subheading:
      'Descubre cómo el procesamiento local supera a las herramientas en la nube en privacidad, rapidez y libertad.',
    featureCol: 'Característica',
    shrinkitCol: 'ShrinkIt (En el Navegador)',
    othersCol: 'Compresores tradicionales en la nube',
    rows: [
      {
        feature: 'Subidas a Servidores',
        shrinkit: '0 (Procesado 100% local en tu dispositivo)',
        others: 'La imagen se sube completa a un servidor',
        winner: true,
      },
      {
        feature: 'Privacidad de Archivos',
        shrinkit: '100% Privado (Nadie puede ver tus fotos)',
        others: 'Archivos guardados en servidores de terceros',
        winner: true,
      },
      {
        feature: 'Velocidad de Procesamiento',
        shrinkit: 'Instantáneo (Sin demoras de subida)',
        others: 'Depende de la velocidad de tu conexión',
        winner: true,
      },
      {
        feature: 'Límites diarios y suscripciones',
        shrinkit: 'Ilimitado y gratis para siempre',
        others: 'Los planes gratuitos limitan el uso; el acceso completo requiere un plan de pago',
        winner: true,
      },
      {
        feature: 'Uso sin conexión (Offline)',
        shrinkit: 'Sí (Funciona totalmente sin internet)',
        others: 'No (Requiere conexión constante)',
        winner: true,
      },
      {
        feature: 'Marcas de agua o registro',
        shrinkit: 'Ninguno (Sin cuenta ni marcas de agua)',
        others: 'Peticiones de registro y marcas de agua',
        winner: true,
      },
    ],
  },
  pt: {
    badge: 'Por que escolher o ShrinkIt?',
    heading: 'ShrinkIt vs. Compressores na Nuvem',
    subheading:
      'Veja como o processamento local supera ferramentas na nuvem em privacidade, velocidade e liberdade.',
    featureCol: 'Recurso',
    shrinkitCol: 'ShrinkIt (No Navegador)',
    othersCol: 'Compressores tradicionais na nuvem',
    rows: [
      {
        feature: 'Envio para Servidores',
        shrinkit: '0 (Processado 100% localmente no seu dispositivo)',
        others: 'Imagem enviada para servidores remotos',
        winner: true,
      },
      {
        feature: 'Privacidade dos Arquivos',
        shrinkit: '100% Privado (Ninguém tem acesso aos seus dados)',
        others: 'Arquivos salvos em servidores de terceiros',
        winner: true,
      },
      {
        feature: 'Velocidade de Processamento',
        shrinkit: 'Instantâneo (Sem atraso de envio pela rede)',
        others: 'Lento dependendo da velocidade de conexão',
        winner: true,
      },
      {
        feature: 'Limites diários e assinaturas',
        shrinkit: 'Ilimitado e gratuito para sempre',
        others: 'Planos gratuitos limitam o uso; o acesso completo exige um plano pago',
        winner: true,
      },
      {
        feature: 'Funcionamento Offline',
        shrinkit: 'Sim (Funciona sem conexão com a internet)',
        others: 'Não (Requer internet ativa o tempo todo)',
        winner: true,
      },
      {
        feature: 'Marca d’água ou cadastro',
        shrinkit: 'Nenhum (Sem cadastro e sem marcas)',
        others: 'Exige login, popups ou marcas nas imagens',
        winner: true,
      },
    ],
  },
};

export default function ComparisonTable({ locale }: ComparisonTableProps) {
  const content = CONTENT[locale] ?? CONTENT.en;

  return (
    <section
      className="w-full bg-tpage py-12 sm:py-16"
      aria-labelledby="comparison-heading"
    >
      <div className="mx-auto box-border w-full min-w-0 max-w-5xl px-4 sm:px-6">
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
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            {content.badge}
          </div>
          <h2
            id="comparison-heading"
            className="text-2xl font-bold tracking-tight text-tink sm:text-3xl md:text-4xl"
          >
            {content.heading}
          </h2>
          <p className="mt-2 text-sm text-tmuted sm:text-base">
            {content.subheading}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-tborderfaint bg-tsurface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-tborderfaint bg-tsurface2">
                  <th
                    scope="col"
                    className="px-4 py-4 text-xs font-semibold text-tink sm:px-6 sm:text-sm"
                  >
                    {content.featureCol}
                  </th>
                  <th
                    scope="col"
                    className="bg-taccent/5 px-4 py-4 text-xs font-bold text-taccent sm:px-6 sm:text-sm"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-taccent" />
                      {content.shrinkitCol}
                    </span>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-4 text-xs font-medium text-tmuted sm:px-6 sm:text-sm"
                  >
                    {content.othersCol}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tborderfaint text-xs sm:text-sm">
                {content.rows.map((row, idx) => (
                  <tr
                    key={`cmp-row-${idx}`}
                    className="transition-colors hover:bg-tsurface2/40"
                  >
                    <td className="px-4 py-3.5 font-semibold text-tink whitespace-nowrap sm:px-6 sm:whitespace-normal">
                      {row.feature}
                    </td>
                    <td className="bg-taccent/5 px-4 py-3.5 font-medium text-tink sm:px-6">
                      <div className="flex items-start gap-2">
                        <svg
                          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>{row.shrinkit}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-tmuted sm:px-6">
                      <div className="flex items-start gap-2">
                        <svg
                          className="mt-0.5 h-4 w-4 shrink-0 text-rose-500"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        <span>{row.others}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
