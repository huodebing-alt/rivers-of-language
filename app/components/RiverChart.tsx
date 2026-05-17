"use client";
import { useMemo } from "react";
import { LANGUAGES, LANGUAGE_BY_ID, CONTACTS } from "@/lib/data";
import { computeLayout, makeXScale, defaultThickness, X_TICKS, type LaneRibbon } from "@/lib/layout";
import { FAMILY_META, type FamilyId } from "@/lib/types";

interface Props {
  width: number;
  /** 最小可视高度（容器高度），SVG 自身高度会动态变大、容器 overflow-y scroll */
  minHeight: number;
  isMobile?: boolean;
  hoveredId: string | null;
  selectedId: string | null;
  setHoveredId: (id: string | null) => void;
  setSelectedId: (id: string | null) => void;
  showContacts: boolean;
  enabledFamilies: Set<FamilyId>;
}

// v3: 左侧标签栏更宽（桌面 220，手机 140），右侧 200 容纳长 living-language 名字
const DESKTOP_MARGIN = { top: 40, right: 200, bottom: 70, left: 220 };
const MOBILE_MARGIN  = { top: 40, right: 170, bottom: 70, left: 140 };

const EVENTS: { year: number; label: { zh: string; en: string } }[] = [
  { year: -3200, label: { zh: "楔形文字", en: "Cuneiform" } },
  { year: -1250, label: { zh: "甲骨文", en: "Oracle Bones" } },
  { year: -800, label: { zh: "字母诞生", en: "Alphabet" } },
  { year: -221, label: { zh: "秦统一文字", en: "Qin Script" } },
  { year: 632, label: { zh: "阿语扩张", en: "Arabic Expansion" } },
  { year: 1066, label: { zh: "诺曼征服", en: "Norman Conquest" } },
  { year: 1492, label: { zh: "美洲开拓", en: "Atlantic Era" } },
  { year: 1928, label: { zh: "土耳其拉丁化", en: "Turkish Latinization" } },
];

// 把过长的中文名拆 2 行（按字数）
function splitLongName(name: string, max = 6): string[] {
  if (name.length <= max) return [name];
  // 找一个合理切点（偏中间、汉字处）
  const cut = Math.ceil(name.length / 2);
  return [name.slice(0, cut), name.slice(cut)];
}

export default function RiverChart({
  width,
  minHeight,
  isMobile = false,
  hoveredId,
  selectedId,
  setHoveredId,
  setSelectedId,
  showContacts,
  enabledFamilies,
}: Props) {
  const MARGIN = isMobile ? MOBILE_MARGIN : DESKTOP_MARGIN;
  const xScale = useMemo(() => makeXScale(width, MARGIN.left, MARGIN.right), [width, MARGIN.left, MARGIN.right]);

  const { ribbons, totalHeight } = useMemo(
    () =>
      computeLayout({
        width,
        marginLeft: MARGIN.left,
        marginRight: MARGIN.right,
        marginTop: MARGIN.top,
        marginBottom: MARGIN.bottom,
        xScale,
        thickness: defaultThickness,
      }),
    [width, xScale, MARGIN.left, MARGIN.right, MARGIN.top, MARGIN.bottom]
  );

  // SVG 实际高度 = max(容器最小高度, 计算出的总高度)
  const svgHeight = Math.max(minHeight, totalHeight);

  // 部署调试用 — 浏览器 console 能看到当前布局尺寸
  if (typeof window !== "undefined") {
    (window as any).__riverLayout = { width, totalHeight, svgHeight, ribbonCount: ribbons.length, MARGIN };
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

  return (
    <svg
      width={width}
      height={svgHeight}
      viewBox={`0 0 ${width} ${svgHeight}`}
      className="select-none block"
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
      </defs>

      {/* 底色 */}
      <rect
        x={MARGIN.left}
        y={MARGIN.top}
        width={width - MARGIN.left - MARGIN.right}
        height={svgHeight - MARGIN.top - MARGIN.bottom}
        fill="url(#bg-gradient)"
      />

      {/* 历史事件竖线 */}
      <g className="events">
        {EVENTS.map((e) => (
          <g key={e.year}>
            <line
              x1={xScale(e.year)}
              x2={xScale(e.year)}
              y1={MARGIN.top}
              y2={svgHeight - MARGIN.bottom + 4}
              stroke="#C4A05A"
              strokeWidth={0.5}
              strokeDasharray="2 4"
              opacity={0.55}
            />
            <text
              x={xScale(e.year)}
              y={MARGIN.top - 12}
              textAnchor="middle"
              fontSize={10}
              fontFamily="'Cormorant Garamond', 'Noto Serif SC', serif"
              fill="#8A6A28"
              fontStyle="italic"
            >
              {e.label.zh}
            </text>
          </g>
        ))}
      </g>

      {/* 河流 ribbons */}
      <g className="ribbons">
        {ribbons.map((r) => {
          if (!enabledFamilies.has(r.family)) return null;
          const isFocus = !focusIds || focusIds.has(r.id);
          const isReconstructed = r.status === "reconstructed";
          const isExtinct = r.status === "extinct" || r.status === "historical";
          return (
            <path
              key={r.id}
              d={r.path}
              className={`river cursor-pointer ${isFocus ? "" : "river-dim"} ${
                hoveredId === r.id || selectedId === r.id ? "river-highlight" : ""
              }`}
              fill={`url(#grad-${r.family})`}
              opacity={isReconstructed ? 0.45 : isExtinct ? 0.72 : 0.92}
              stroke={familyColor(r.family)}
              strokeWidth={selectedId === r.id ? 1.6 : 0.4}
              strokeOpacity={0.5}
              strokeDasharray={isReconstructed ? "3 3" : undefined}
              onMouseEnter={() => setHoveredId(r.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => setSelectedId(selectedId === r.id ? null : r.id)}
            >
              <title>
                {r.name.zh} · {r.name.en}
              </title>
            </path>
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
            if (!enabledFamilies.has(src.family) || !enabledFamilies.has(tgt.family)) return null;
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

      {/* 语言标签 — 右端 living / inline 灭绝 */}
      <g className="labels">
        {ribbons.map((r) => {
          if (!enabledFamilies.has(r.family)) return null;
          if (r.status === "reconstructed") {
            // 拟构语：左端 italic 标
            return (
              <text
                key={r.id}
                x={xScale(r.born) + 4}
                y={r.yStart}
                fontSize={9}
                fontStyle="italic"
                fontFamily="'Cormorant Garamond', 'Noto Serif SC', serif"
                fill="#5C5247"
                opacity={focusIds && !focusIds.has(r.id) ? 0.18 : 0.85}
                dominantBaseline="middle"
                pointerEvents="none"
              >
                * {r.name.zh}
              </text>
            );
          }
          if (r.died < 2020) {
            // 灭绝语言：标在 died 处（inline）
            return (
              <text
                key={r.id}
                x={xScale(r.died) + 4}
                y={r.yStart}
                fontSize={9.5}
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
          // v3: 桌面 right margin 200 单行装得下大多数名字，不再硬拆 2 行；mobile 还按 6 字拆
          const lines = isMobile ? splitLongName(r.name.zh, 6) : [r.name.zh];
          const isHighlighted = hoveredId === r.id || selectedId === r.id;
          return (
            <g key={r.id}>
              {lines.map((line, i) => (
                <text
                  key={i}
                  x={width - MARGIN.right + 8}
                  y={r.yStart + (i - (lines.length - 1) / 2) * 13}
                  fontSize={isHighlighted ? 14 : 12}   /* v3: 10→12 default, 11.5→14 highlight */
                  fontFamily="'Noto Serif SC', 'Cormorant Garamond', serif"
                  fill={isHighlighted ? familyColor(r.family) : "#3A332A"}
                  fontWeight={isHighlighted ? 600 : 400}
                  opacity={focusIds && !focusIds.has(r.id) ? 0.18 : 0.95}
                  dominantBaseline="middle"
                  pointerEvents="none"
                >
                  {line}
                </text>
              ))}
              {/* 英文副名（hover/select 时显示） */}
              {isHighlighted && (
                <text
                  x={width - MARGIN.right + 8}
                  y={r.yStart + ((lines.length) / 2) * 13 + 4}
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

      {/* 时间轴 */}
      <g className="time-axis">
        <line
          x1={MARGIN.left}
          x2={width - MARGIN.right}
          y1={svgHeight - MARGIN.bottom + 1}
          y2={svgHeight - MARGIN.bottom + 1}
          stroke="#5C5247"
          strokeWidth={0.6}
        />
        {X_TICKS.map((y) => (
          <g key={y}>
            <line
              x1={xScale(y)}
              x2={xScale(y)}
              y1={svgHeight - MARGIN.bottom + 1}
              y2={svgHeight - MARGIN.bottom + 6}
              stroke="#5C5247"
              strokeWidth={0.6}
            />
            <text
              x={xScale(y)}
              y={svgHeight - MARGIN.bottom + 22}
              textAnchor="middle"
              fontSize={11}
              fontFamily="'Cormorant Garamond', serif"
              fill="#3A332A"
            >
              {y < 0 ? `${Math.abs(y)} BCE` : y === 0 ? "0" : `${y} CE`}
            </text>
          </g>
        ))}
      </g>

      {/* 左侧语系标 — v3: 字号增大 + 宽空间 */}
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
                fontSize={isMobile ? 13 : 16}   /* v3: 13→16 desktop */
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
                fontSize={isMobile ? 9.5 : 11}   /* v3: 9.5→11 desktop */
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

      {/* 标题 */}
      <text
        x={MARGIN.left}
        y={24}
        fontSize={14}
        fontFamily="'Cormorant Garamond', serif"
        fontStyle="italic"
        fill="#82282C"
      >
        从原始印欧语到现代世界 · From Proto-Languages to Today
      </text>
    </svg>
  );
}
