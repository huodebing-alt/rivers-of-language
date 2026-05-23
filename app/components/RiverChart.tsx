"use client";
import { useMemo } from "react";
import { LANGUAGES, LANGUAGE_BY_ID, CONTACTS } from "@/lib/data";
import {
  computeLayout,
  makeXScale,
  defaultThickness,
  X_TICKS,
  EVENTS,
  type LaneRibbon,
  type RibbonSample,
} from "@/lib/layout";
import { FAMILY_META, type FamilyId } from "@/lib/types";

// ===== Wave glyph helpers =====
// Deterministic small RNG seeded by string
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function mulberry32(seed: number) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function sampleAt(samples: RibbonSample[], x: number): RibbonSample {
  if (samples.length === 0) return { x, y: 0, w: 0 };
  if (x <= samples[0].x) return samples[0];
  if (x >= samples[samples.length - 1].x) return samples[samples.length - 1];
  for (let i = 0; i < samples.length - 1; i++) {
    if (x >= samples[i].x && x <= samples[i + 1].x) {
      const t = (x - samples[i].x) / Math.max(1e-6, samples[i + 1].x - samples[i].x);
      return {
        x,
        y: samples[i].y + (samples[i + 1].y - samples[i].y) * t,
        w: samples[i].w + (samples[i + 1].w - samples[i].w) * t,
      };
    }
  }
  return samples[samples.length - 1];
}

interface Wave { x: number; y: number; h: number; a: number; sw: number; op: number }

function generateWaves(samples: RibbonSample[], seed: string): Wave[] {
  if (samples.length < 2) return [];
  const out: Wave[] = [];
  const rng = mulberry32(hashStr(seed));
  const minX = samples[0].x;
  const maxX = samples[samples.length - 1].x;
  let x = minX + 6 + rng() * 12;
  while (x < maxX - 4) {
    const s = sampleAt(samples, x);
    if (s.w >= 1.4) {
      // glyph height = 60-75% of local ribbon thickness, clamped to a sane range
      const ratio = 0.55 + rng() * 0.25;
      const h = Math.max(2.6, Math.min(s.w * ratio, 14));
      const a = 0.9 + rng() * 1.8;             // amplitude 0.9 - 2.7
      const sign = rng() < 0.5 ? -1 : 1;
      const sw = 0.55 + rng() * 0.55;          // stroke width 0.55-1.1
      const op = 0.55 + rng() * 0.30;          // opacity 0.55-0.85
      const yJitter = (rng() - 0.5) * Math.min(s.w * 0.18, 1.5);
      out.push({ x, y: s.y + yJitter, h, a: a * sign, sw, op });
    }
    x += 26 + rng() * 16;                       // spacing 26-42
  }
  return out;
}

function waveGlyphPath(w: Wave): string {
  // 小垂直 S 曲线：M cx,y-h/2  C cx+a,y-h/3  cx-a,y+h/3  cx,y+h/2
  const { x, y, h, a } = w;
  return `M ${x.toFixed(2)},${(y - h / 2).toFixed(2)} C ${(x + a).toFixed(2)},${(y - h / 3).toFixed(2)} ${(x - a).toFixed(2)},${(y + h / 3).toFixed(2)} ${x.toFixed(2)},${(y + h / 2).toFixed(2)}`;
}

interface Props {
  width: number;
  containerHeight: number;
  isMobile?: boolean;
  hoveredId: string | null;
  selectedId: string | null;
  setHoveredId: (id: string | null) => void;
  setSelectedId: (id: string | null) => void;
  showContacts: boolean;
  enabledFamilies: Set<FamilyId>;
  collapsedIds: Set<string>;
  toggleCollapse: (id: string) => void;
}

const DESKTOP_MARGIN = { top: 4, right: 200, bottom: 4, left: 220 };
const MOBILE_MARGIN  = { top: 4, right: 170, bottom: 4, left: 140 };
const HEADER_H = 56;
const FOOTER_H = 48;

function splitLongName(name: string, max = 6): string[] {
  if (name.length <= max) return [name];
  const cut = Math.ceil(name.length / 2);
  return [name.slice(0, cut), name.slice(cut)];
}

export default function RiverChart(props: Props) {
  const {
    width,
    containerHeight,
    isMobile = false,
    hoveredId,
    selectedId,
    setHoveredId,
    setSelectedId,
    showContacts,
    enabledFamilies,
    collapsedIds,
    toggleCollapse,
  } = props;

  const MARGIN = isMobile ? MOBILE_MARGIN : DESKTOP_MARGIN;
  const xScale = useMemo(
    () => makeXScale(width, MARGIN.left, MARGIN.right),
    [width, MARGIN.left, MARGIN.right]
  );

  const { ribbons, totalHeight, visibleLeafCount, collapsedCount, meanRibbonThickness } = useMemo(
    () =>
      computeLayout({
        width,
        marginLeft: MARGIN.left,
        marginRight: MARGIN.right,
        marginTop: MARGIN.top,
        marginBottom: MARGIN.bottom,
        xScale,
        thickness: defaultThickness,
        collapsedIds,
        enabledFamilies,
      }),
    [width, xScale, MARGIN.left, MARGIN.right, MARGIN.top, MARGIN.bottom, collapsedIds, enabledFamilies]
  );

  if (typeof window !== "undefined") {
    (window as any).__riverLayout = {
      version: "v5",
      width,
      totalHeight,
      ribbonCount: ribbons.length,
      visibleLeafCount,
      collapsedCount,
      meanRibbonThickness: Math.round(meanRibbonThickness * 10) / 10,
      mapProjection: "equirectangular (d3-geo)",
      MARGIN,
    };
  }

  const ribbonsById = useMemo(() => {
    const m = new Map<string, LaneRibbon>();
    for (const r of ribbons) m.set(r.id, r);
    return m;
  }, [ribbons]);

  const focusIds = useMemo(() => {
    const id = hoveredId ?? selectedId;
    if (!id) return null;
    const out = new Set<string>([id]);
    let cur = LANGUAGE_BY_ID.get(id);
    while (cur && cur.parent) {
      out.add(cur.parent);
      cur = LANGUAGE_BY_ID.get(cur.parent);
    }
    function addDesc(pid: string) {
      for (const l of LANGUAGES) {
        if (l.parent === pid) {
          out.add(l.id);
          addDesc(l.id);
        }
      }
    }
    addDesc(id);
    return out;
  }, [hoveredId, selectedId]);

  function familyColor(f: FamilyId): string {
    return FAMILY_META[f].color;
  }

  // v5: 单击 = toggle collapse + sticky select
  function onRibbonClick(r: LaneRibbon, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedId(r.id);
    if (r.collapsible) toggleCollapse(r.id);
  }

  const scrollMaxH = Math.max(120, containerHeight - HEADER_H - FOOTER_H);

  return (
    <div
      className="w-full h-full flex flex-col bg-cream-50"
      style={{ minWidth: width, height: containerHeight }}
    >
      {/* ============ STICKY TOP ============ */}
      <div
        className="shrink-0 bg-cream-50 border-b border-cream-200"
        style={{ width, height: HEADER_H, position: "sticky", top: 0, zIndex: 30 }}
      >
        <svg width={width} height={HEADER_H}>
          <text
            x={MARGIN.left}
            y={18}
            fontSize={14}
            fontFamily="'Cormorant Garamond', serif"
            fontStyle="italic"
            fill="#82282C"
          >
            从原始印欧语到现代世界 · From Proto-Languages to Today
            <tspan fill="#A8853C" fontSize={10} dx={10}>
              {ribbons.length} ribbons · {visibleLeafCount} languages
              {collapsedCount > 0 ? ` · ${collapsedCount} branch${collapsedCount > 1 ? "es" : ""} collapsed` : ""}
            </tspan>
          </text>
          {EVENTS.map((e) => (
            <g key={e.year}>
              <line
                x1={xScale(e.year)}
                x2={xScale(e.year)}
                y1={HEADER_H - 22}
                y2={HEADER_H}
                stroke="#C4A05A"
                strokeWidth={0.6}
                opacity={0.7}
              />
              <text
                x={xScale(e.year)}
                y={HEADER_H - 26}
                textAnchor="middle"
                fontSize={10}
                fontFamily="'Cormorant Garamond', 'Noto Serif SC', serif"
                fill="#8A6A28"
                fontStyle="italic"
              >
                {e.zh}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* ============ MIDDLE: scrollable ============ */}
      <div
        className="overflow-y-auto overflow-x-hidden river-scroll"
        style={{ width, maxHeight: scrollMaxH, transition: "max-height 280ms ease" }}
      >
        <svg
          width={width}
          height={totalHeight}
          style={{ display: "block", transition: "height 280ms ease" }}
        >
          <defs>
            <linearGradient id="bg-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#F5EFE2" stopOpacity="0.4" />
              <stop offset="1" stopColor="#FBF8F1" stopOpacity="0" />
            </linearGradient>
            {Object.entries(FAMILY_META).map(([key, meta]) => (
              <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor={meta.color} stopOpacity="0.5" />
                <stop offset="1" stopColor={meta.color} stopOpacity="0.9" />
              </linearGradient>
            ))}
            {/* v5: 流水高光 — 单条 ribbon hover 时叠加 */}
            <linearGradient id="flow-shine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
              <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* 事件竖线（贯穿） */}
          <g className="event-lines">
            {EVENTS.map((e) => (
              <line
                key={e.year}
                x1={xScale(e.year)}
                x2={xScale(e.year)}
                y1={0}
                y2={totalHeight}
                stroke="#C4A05A"
                strokeWidth={0.5}
                strokeDasharray="2 4"
                opacity={0.35}
              />
            ))}
          </g>

          {/* 底色 */}
          <rect
            x={MARGIN.left}
            y={0}
            width={width - MARGIN.left - MARGIN.right}
            height={totalHeight}
            fill="url(#bg-gradient)"
          />

          {/* Ribbons */}
          <g className="ribbons">
            {ribbons.map((r) => {
              const isFocus = !focusIds || focusIds.has(r.id);
              const isReconstructed = r.status === "reconstructed";
              const isExtinct = r.status === "extinct" || r.status === "historical";
              const isHighlighted = hoveredId === r.id || selectedId === r.id;
              return (
                <g key={r.id}>
                  <path
                    d={r.path}
                    className={`river cursor-pointer ${isFocus ? "" : "river-dim"}`}
                    fill={`url(#grad-${r.family})`}
                    opacity={isReconstructed ? 0.45 : isExtinct ? 0.72 : 0.92}
                    stroke={familyColor(r.family)}
                    strokeWidth={isHighlighted ? 1.6 : 0.4}
                    strokeOpacity={0.55}
                    strokeDasharray={isReconstructed ? "3 3" : undefined}
                    onMouseEnter={() => setHoveredId(r.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={(e) => onRibbonClick(r, e)}
                  >
                    <title>
                      {r.name.zh} · {r.name.en}
                      {r.collapsible ? (r.collapsed ? "  [click to expand]" : "  [click to collapse]") : ""}
                    </title>
                  </path>

                  {/* v6: hover/selected 流水高光 — 手绘感垂直波浪线 + 横向流动 */}
                  {isHighlighted && (() => {
                    const waves = generateWaves(r.samples, r.id);
                    if (waves.length === 0) return null;
                    return (
                      <g pointerEvents="none">
                        <defs>
                          <clipPath id={`wave-clip-${r.id}`}>
                            <path d={r.path} />
                          </clipPath>
                        </defs>
                        <g clipPath={`url(#wave-clip-${r.id})`} className="river-waves">
                          {waves.map((wv, i) => (
                            <path
                              key={i}
                              d={waveGlyphPath(wv)}
                              fill="none"
                              stroke="white"
                              strokeWidth={wv.sw}
                              strokeLinecap="round"
                              opacity={wv.op}
                            />
                          ))}
                        </g>
                      </g>
                    );
                  })()}
                </g>
              );
            })}
          </g>

          {/* 借用虚线 */}
          {showContacts && (
            <g className="contacts">
              {CONTACTS.map((c) => {
                const src = ribbonsById.get(c.source);
                const tgt = ribbonsById.get(c.target);
                if (!src || !tgt) return null;
                const x = xScale(c.year);
                const y1 = src.yStart;
                const y2 = tgt.yStart;
                const cx = x + 32;
                const isFocus = !focusIds || focusIds.has(c.source) || focusIds.has(c.target);
                return (
                  <path
                    key={c.id}
                    d={`M ${x},${y1} C ${cx},${y1} ${cx},${y2} ${x + 2},${y2}`}
                    className="contact-loan"
                    fill="none"
                    stroke="#8A6A28"
                    strokeWidth={c.strength === 2 ? 1.2 : 0.7}
                    opacity={isFocus ? 0.5 : 0.08}
                  />
                );
              })}
            </g>
          )}

          {/* 语言标签 */}
          <g className="labels">
            {ribbons.map((r) => {
              if (r.status === "reconstructed") {
                return (
                  <text
                    key={r.id}
                    x={xScale(r.born) + 6}
                    y={r.yStart}
                    fontSize={10}
                    fontStyle="italic"
                    fontFamily="'Cormorant Garamond', 'Noto Serif SC', serif"
                    fill="#5C5247"
                    opacity={focusIds && !focusIds.has(r.id) ? 0.18 : 0.85}
                    dominantBaseline="middle"
                    pointerEvents="none"
                  >
                    * {r.name.zh}
                    {r.collapsed && <tspan fill="#A8853C" fontSize={9} dx={4}>+{r.descendantCount}</tspan>}
                  </text>
                );
              }
              if (r.died < 2020 && !r.collapsed) {
                return (
                  <text
                    key={r.id}
                    x={xScale(r.died) + 6}
                    y={r.yStart}
                    fontSize={11}
                    fontFamily="'Noto Serif SC', 'Cormorant Garamond', serif"
                    fontStyle="italic"
                    fill="#5C5247"
                    opacity={focusIds && !focusIds.has(r.id) ? 0.15 : 0.78}
                    dominantBaseline="middle"
                    pointerEvents="none"
                  >
                    † {r.name.zh}
                  </text>
                );
              }
              const lines = isMobile ? splitLongName(r.name.zh, 6) : [r.name.zh];
              const isHighlighted = hoveredId === r.id || selectedId === r.id;
              return (
                <g key={r.id}>
                  {lines.map((line, i) => (
                    <text
                      key={i}
                      x={width - MARGIN.right + 8}
                      y={r.yStart + (i - (lines.length - 1) / 2) * 13}
                      fontSize={isHighlighted ? 14 : 12}
                      fontFamily="'Noto Serif SC', 'Cormorant Garamond', serif"
                      fill={isHighlighted ? familyColor(r.family) : "#3A332A"}
                      fontWeight={isHighlighted ? 600 : 400}
                      opacity={focusIds && !focusIds.has(r.id) ? 0.18 : 0.95}
                      dominantBaseline="middle"
                      pointerEvents="none"
                    >
                      {line}
                      {r.collapsed && <tspan fill="#A8853C" fontSize={9} dx={4}>+{r.descendantCount}</tspan>}
                    </text>
                  ))}
                  {isHighlighted && (
                    <text
                      x={width - MARGIN.right + 8}
                      y={r.yStart + (lines.length / 2) * 13 + 4}
                      fontSize={10}
                      fontStyle="italic"
                      fontFamily="'Cormorant Garamond', serif"
                      fill={familyColor(r.family)}
                      opacity={0.75}
                      dominantBaseline="middle"
                      pointerEvents="none"
                    >
                      {r.name.en}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* 左侧语系标 */}
          <g className="family-labels">
            {(Object.entries(FAMILY_META) as [FamilyId, typeof FAMILY_META[FamilyId]][]).map(([key, meta]) => {
              if (!enabledFamilies.has(key)) return null;
              const ys = ribbons.filter((r) => r.family === key).map((r) => r.yStart);
              if (ys.length === 0) return null;
              const minY = Math.min(...ys), maxY = Math.max(...ys);
              const midY = (minY + maxY) / 2;
              return (
                <g key={key}>
                  <line
                    x1={MARGIN.left - 20}
                    x2={MARGIN.left - 20}
                    y1={minY - 6}
                    y2={maxY + 6}
                    stroke={meta.color}
                    strokeWidth={2.6}
                    opacity={0.75}
                    strokeLinecap="round"
                  />
                  <text
                    x={MARGIN.left - 30}
                    y={midY - 8}
                    textAnchor="end"
                    fontSize={isMobile ? 13 : 16}
                    fontFamily="'Noto Serif SC', serif"
                    fill={meta.color}
                    fontWeight={600}
                    dominantBaseline="middle"
                  >
                    {meta.zh}
                  </text>
                  <text
                    x={MARGIN.left - 30}
                    y={midY + 10}
                    textAnchor="end"
                    fontSize={isMobile ? 9.5 : 11}
                    fontStyle="italic"
                    fontFamily="'Cormorant Garamond', serif"
                    fill={meta.color}
                    opacity={0.75}
                    dominantBaseline="middle"
                  >
                    {meta.en}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* ============ STICKY BOTTOM ============ */}
      <div
        className="shrink-0 bg-cream-50 border-t border-cream-200"
        style={{ width, height: FOOTER_H, position: "sticky", bottom: 0, zIndex: 30 }}
      >
        <svg width={width} height={FOOTER_H}>
          <line x1={MARGIN.left} x2={width - MARGIN.right} y1={6} y2={6} stroke="#5C5247" strokeWidth={0.6} />
          {X_TICKS.map((y) => (
            <g key={y}>
              <line x1={xScale(y)} x2={xScale(y)} y1={6} y2={11} stroke="#5C5247" strokeWidth={0.6} />
              <text
                x={xScale(y)}
                y={26}
                textAnchor="middle"
                fontSize={11}
                fontFamily="'Cormorant Garamond', serif"
                fill="#3A332A"
              >
                {y < 0 ? `${Math.abs(y)} BCE` : y === 0 ? "0" : `${y} CE`}
              </text>
            </g>
          ))}
          <text
            x={width / 2}
            y={FOOTER_H - 4}
            textAnchor="middle"
            fontSize={9}
            fontStyle="italic"
            fill="#A8853C"
            opacity={0.7}
          >
            点击任意河流 = 折叠/展开后代 · Click any river to collapse/expand · 鼠标悬停看详情
          </text>
        </svg>
      </div>
    </div>
  );
}
