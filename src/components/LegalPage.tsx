import React from 'react';
import type { LegalBlock, LegalDoc } from '../content/legal/types';

export interface LegalPageProps {
  doc: LegalDoc;
  notice?: string;
  fullTextUrl?: string;
}

export function LegalPage({ doc, notice, fullTextUrl }: LegalPageProps) {
  return (
    <div className="w-full bg-tband">
      <div className="mx-auto box-border w-full min-w-0 max-w-3xl px-4 py-12 sm:py-16">
        <h1 className="text-3xl font-normal tracking-tight break-words text-tink sm:text-[2.5rem]">
          {doc.title}
        </h1>
        <p className="mt-3 text-sm font-light text-tink2">Last updated: {doc.lastUpdated}</p>

        {notice && (
          <p className="mt-4 rounded-[6px] border border-tdash bg-tsurface px-5 py-4 text-sm font-light leading-relaxed break-words text-tink2">
            {notice}
          </p>
        )}

        {/* Summary card ("In short") */}
        <section
          aria-label="Summary"
          className="mt-8 rounded-xl border border-tdivider bg-tsurface p-6 shadow-sm sm:p-7"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-taccent" />
            <h2 className="text-lg font-semibold text-tink">In short</h2>
          </div>
          <div className="space-y-3">
            {doc.summary.map((paragraph, idx) => (
              <p
                key={`summary-${idx}`}
                className="text-[1rem] font-light leading-relaxed break-words text-tink2 sm:text-[1.0625rem]"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        {/* Table of Contents */}
        <nav
          aria-label="Contents"
          className="mt-8 rounded-xl border border-tdivider bg-tsurface p-6 shadow-sm sm:p-7"
        >
          <h2 className="text-lg font-semibold text-tink">Contents</h2>
          <ol className="mt-3 list-none space-y-2 pl-1 text-[0.9375rem] font-light leading-relaxed text-tink2 sm:text-[1rem]">
            {doc.sections.map((section) => (
              <li key={`toc-${section.id}`} className="transition-transform hover:translate-x-1">
                <a
                  href={`#${section.id}`}
                  className="font-normal text-taccent underline underline-offset-2 hover:text-[#0257bf]"
                >
                  {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Main sections */}
        <div className="mt-8 space-y-8">
          {doc.sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-6 rounded-xl border border-tdivider bg-tsurface p-6 shadow-sm transition-colors hover:border-tborder sm:p-7"
            >
              <h2 className="text-xl font-semibold break-words text-tink sm:text-[1.375rem]">
                {section.heading}
              </h2>

              <div className="mt-4 space-y-3.5">
                {section.blocks.map((block: LegalBlock, bIdx: number) => {
                  const blockKey = `${section.id}-b-${bIdx}`;
                  if (block.kind === 'p') {
                    return (
                      <p
                        key={blockKey}
                        className="text-[1rem] font-light leading-relaxed break-words text-tink2 sm:text-[1.0625rem]"
                      >
                        {block.text}
                      </p>
                    );
                  }
                  if (block.kind === 'h3') {
                    return (
                      <h3
                        key={blockKey}
                        className="pt-2 text-[1.0625rem] font-medium break-words text-tink"
                      >
                        {block.text}
                      </h3>
                    );
                  }
                  if (block.kind === 'list') {
                    return (
                      <ul
                        key={blockKey}
                        className="list-disc space-y-1.5 pl-6 text-[0.95rem] font-light leading-relaxed break-words text-tink2 sm:text-[1rem]"
                      >
                        {block.items.map((item, iIdx) => (
                          <li key={`${blockKey}-item-${iIdx}`}>{item}</li>
                        ))}
                      </ul>
                    );
                  }
                  if (block.kind === 'table') {
                    return (
                      <div
                        key={blockKey}
                        className="my-4 overflow-x-auto rounded-lg border border-tdivider"
                      >
                        <table className="w-full border-collapse text-left text-[0.875rem] font-light leading-relaxed text-tink2 sm:text-[0.9375rem]">
                          <thead className="bg-tsurface2 font-medium text-tink">
                            <tr>
                              {block.headers.map((h, hIdx) => (
                                <th
                                  key={`${blockKey}-th-${hIdx}`}
                                  className="border-b border-tdivider px-3.5 py-2.5 font-semibold"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {block.rows.map((row, rIdx) => (
                              <tr
                                key={`${blockKey}-tr-${rIdx}`}
                                className="border-b border-tdivider/60 last:border-b-0 hover:bg-thoverbg"
                              >
                                {row.map((cell, cIdx) => (
                                  <td
                                    key={`${blockKey}-td-${rIdx}-${cIdx}`}
                                    className="px-3.5 py-2.5 align-top"
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </section>
          ))}
        </div>

        {fullTextUrl && (
          <p className="mt-8 text-center text-sm font-light break-words text-tink2">
            <a
              href={fullTextUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-taccent underline underline-offset-2 hover:text-[#0257bf]"
            >
              <span>Visit full policy at shrinkit.dusrel.com</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
              </svg>
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

export default LegalPage;
