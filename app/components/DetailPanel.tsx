"use client";
import { LANGUAGE_BY_ID, WORDS_BY_LANG, WORDS, CONTACTS, speakerAt } from "@/lib/data";
import { FAMILY_META } from "@/lib/types";
import MiniMap from "./MiniMap";

interface Props {
  id: string | null;
}

function fmtYear(y: number): string {
  return y < 0 ? `${Math.abs(y)} BCE` : y === 0 ? "0" : `${y} CE`;
}

function fmtCount(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${Math.round(n)}`;
}

export default function DetailPanel({ id }: Props) {
  if (!id) {
    return (
      <div className="px-4 py-6 text-sm font-serif italic text-ink-400 leading-relaxed">
        <p className="text-ink-500 mb-3 not-italic font-sans text-xs uppercase tracking-wider2 text-gilt-500">悬停语言以查看</p>
        <p className="text-base">Hover or click on any river to see a language&apos;s timeline, geography, and a word that traveled with it.</p>
        <hr className="my-5 border-cream-200" />
        <p className="text-xs text-ink-400">悬停任意河流，可看到该语言的诞生年代、地理范围、使用人数演变，以及一个跨越它的代表词。</p>
      </div>
    );
  }
  const lang = LANGUAGE_BY_ID.get(id);
  if (!lang) return null;
  const fam = FAMILY_META[lang.family];

  // 该语言的代表词链
  const wordsForLang = WORDS_BY_LANG.get(id) ?? [];
  const featuredWord = wordsForLang[0];

  // 借用关系
  const contactsIn = CONTACTS.filter((c) => c.target === id);
  const contactsOut = CONTACTS.filter((c) => c.source === id);

  // 父子关系
  const parent = lang.parent ? LANGUAGE_BY_ID.get(lang.parent) : null;
  const children = Array.from(LANGUAGE_BY_ID.values()).filter((l) => l.parent === id);

  const peakSpeakers = Math.max(...lang.speakers.map((s) => s.count));
  const nowSpeakers = speakerAt(lang, 2025);

  return (
    <div className="px-5 py-5 overflow-y-auto h-full text-sm text-ink-500 scrollbar-thin">
      <div className="text-[10px] uppercase tracking-wider2" style={{ color: fam.color }}>
        {fam.zh} · {fam.en}
        {lang.branch && <span className="ml-2 opacity-70">{lang.branch}</span>}
      </div>
      <h2 className="font-serif text-2xl mt-0.5 mb-0.5 text-ink-700" style={{ color: fam.color }}>
        {lang.name.zh}
      </h2>
      <p className="font-serif italic text-base text-ink-400 mb-1">{lang.name.en}</p>
      {lang.name.native && (
        <p className="text-lg mb-3" style={{ fontFamily: "'Noto Serif SC', serif" }}>{lang.name.native}</p>
      )}

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-4 mb-4 text-xs">
        <Field label="诞生 / Born" value={fmtYear(lang.born)} />
        <Field label={lang.died ? "消亡 / Died" : "状态 / Status"} value={lang.died ? fmtYear(lang.died) : (lang.status ?? "—")} />
        <Field label="地理 / Geo" value={`${lang.geo.lat.toFixed(1)}°, ${lang.geo.lon.toFixed(1)}°`} />
        <Field label="峰值人数 / Peak" value={fmtCount(peakSpeakers)} />
        {nowSpeakers > 0 && <Field label="现今人数 / Today" value={fmtCount(nowSpeakers)} />}
        {parent && <Field label="母语 / Parent" value={parent.name.zh} />}
        {children.length > 0 && (
          <Field label="后裔 / Children" value={`${children.length} 支`} />
        )}
      </div>

      {lang.notes && (
        <blockquote className="font-serif italic border-l-2 pl-3 my-3 text-ink-500 text-[13px] leading-relaxed" style={{ borderColor: fam.color }}>
          {lang.notes.zh && <p className="mb-1">{lang.notes.zh}</p>}
          {lang.notes.en && <p className="text-[12px] opacity-75">{lang.notes.en}</p>}
        </blockquote>
      )}

      {/* 缩略地图 */}
      <div className="my-4 bg-cream-100 rounded p-2">
        <p className="text-[10px] uppercase tracking-wider2 text-gilt-500 mb-1">地理 / Geography</p>
        <MiniMap highlightId={id} />
      </div>

      {/* 词演变链 */}
      {featuredWord && (
        <div className="my-4">
          <p className="text-[10px] uppercase tracking-wider2 text-gilt-500 mb-2">
            词例 / A Word&apos;s Journey
          </p>
          <p className="font-serif italic text-ink-700 mb-1">
            「{featuredWord.gloss.zh}」 · <span className="text-xs">{featuredWord.gloss.en}</span>
          </p>
          <div className="text-[11px] font-mono text-ink-400 mb-2">
            <span className="opacity-60">*</span>{featuredWord.proto.form} <span className="opacity-50">({LANGUAGE_BY_ID.get(featuredWord.proto.lang)?.name.zh})</span>
          </div>
          <div className="space-y-0.5 text-[11px]">
            {featuredWord.chain.slice(0, 12).map((c, i) => {
              const langName = LANGUAGE_BY_ID.get(c.lang)?.name.zh ?? c.lang;
              const isCurrent = c.lang === id;
              return (
                <div
                  key={i}
                  className={`flex items-baseline gap-2 px-1 py-0.5 rounded ${isCurrent ? "bg-cream-200" : ""}`}
                >
                  <span className="text-[9px] uppercase tracking-wider2 text-ink-400 w-16 shrink-0">
                    {langName}
                  </span>
                  <span className="font-serif italic flex-1" style={{ fontFamily: "'Cormorant Garamond', 'Noto Serif SC', serif" }}>
                    {c.form}
                  </span>
                  {c.ipa && <span className="text-[10px] font-mono text-ink-400">{c.ipa}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(contactsIn.length > 0 || contactsOut.length > 0) && (
        <div className="my-4">
          <p className="text-[10px] uppercase tracking-wider2 text-gilt-500 mb-1">
            借用 / Contacts
          </p>
          <div className="text-[11px] space-y-1">
            {contactsIn.map((c) => {
              const src = LANGUAGE_BY_ID.get(c.source);
              return (
                <div key={c.id}>
                  <span className="text-gilt-500">←</span> {src?.name.zh ?? c.source}
                  <span className="opacity-50 ml-2">{fmtYear(c.year)}</span>
                  {c.example && <p className="italic opacity-70 pl-4">{c.example.zh}</p>}
                </div>
              );
            })}
            {contactsOut.map((c) => {
              const tgt = LANGUAGE_BY_ID.get(c.target);
              return (
                <div key={c.id}>
                  <span className="text-gilt-500">→</span> {tgt?.name.zh ?? c.target}
                  <span className="opacity-50 ml-2">{fmtYear(c.year)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider2 text-gilt-500">{label}</p>
      <p className="font-serif">{value}</p>
    </div>
  );
}
