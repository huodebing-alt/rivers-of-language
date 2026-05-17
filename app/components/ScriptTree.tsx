"use client";
import { useMemo } from "react";
import { SCRIPTS } from "@/lib/data";
import { makeXScale, X_TICKS } from "@/lib/layout";

interface Props {
  width: number;
  height: number;
}

const MARGIN = { top: 50, right: 100, bottom: 60, left: 60 };

export default function ScriptTree({ width, height }: Props) {
  const xScale = useMemo(() => makeXScale(width, MARGIN.left, MARGIN.right), [width]);

  // 按字母系/汉字系分两栏布局
  // ROW system: cluster scripts by lineage root
  const layout = useMemo(() => {
    // 给每个 script 一个 Y position
    // Categorize: Egyptian/Sinaitic family vs Sumerian-cuneiform vs Chinese
    const groups: Record<string, string[]> = {
      cuneiform: ["cuneiform"],
      egyptian_alpha: [
        "hieroglyphic", "proto_sinaitic", "phoenician_script", "aramaic_script", "hebrew_script", "arabic_script",
        "brahmi", "devanagari", "tamil_script", "tibetan_script", "burmese_script",
        "greek_script", "latin_script", "cyrillic", "runic",
      ],
      chinese: [
        "oracle_bone", "bronze_inscription", "seal_script", "clerical_script", "regular_script", "simplified_chinese",
        "kana", "hangul",
      ],
    };
    const rowOrder: string[] = [...groups.cuneiform, ...groups.egyptian_alpha, ...groups.chinese];
    const ys = new Map<string, number>();
    const usable = height - MARGIN.top - MARGIN.bottom;
    rowOrder.forEach((id, i) => {
      const y = MARGIN.top + ((i + 0.5) / rowOrder.length) * usable;
      ys.set(id, y);
    });
    return { ys };
  }, [height]);

  return (
    <svg width={width} height={height}>
      <defs>
        <linearGradient id="script-bg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#F5EFE2" stopOpacity="0.5" />
          <stop offset="1" stopColor="#FBF8F1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect
        x={MARGIN.left}
        y={MARGIN.top}
        width={width - MARGIN.left - MARGIN.right}
        height={height - MARGIN.top - MARGIN.bottom}
        fill="url(#script-bg)"
      />

      <text x={MARGIN.left} y={28} fontSize={14} fontStyle="italic" fontFamily="'Cormorant Garamond', serif" fill="#82282C">
        文字之河 · Rivers of Script
      </text>

      {/* Edges first */}
      <g>
        {SCRIPTS.edges.map((e) => {
          const y1 = layout.ys.get(e.from);
          const y2 = layout.ys.get(e.to);
          if (y1 === undefined || y2 === undefined) return null;
          const fromNode = SCRIPTS.nodes.find((n) => n.id === e.from);
          const toNode = SCRIPTS.nodes.find((n) => n.id === e.to);
          if (!fromNode || !toNode) return null;
          const x1 = xScale(fromNode.born);
          const x2 = xScale(toNode.born);
          const cx = (x1 + x2) / 2;
          return (
            <path
              key={e.id}
              d={`M ${x1},${y1} C ${cx},${y1} ${cx},${y2} ${x2},${y2}`}
              fill="none"
              stroke={e.kind === "reform" ? "#82282C" : "#A8853C"}
              strokeWidth={1.4}
              strokeDasharray={e.kind === "borrow" ? "4 4" : undefined}
              opacity={0.55}
            />
          );
        })}
      </g>

      {/* Nodes */}
      <g>
        {SCRIPTS.nodes.map((n) => {
          const y = layout.ys.get(n.id);
          if (y === undefined) return null;
          const x = xScale(n.born);
          // estimated lifespan
          const childrenEdges = SCRIPTS.edges.filter((e) => e.from === n.id);
          const minChildBorn = childrenEdges.length > 0 ? Math.min(...childrenEdges.map((e) => {
            const cn = SCRIPTS.nodes.find((nn) => nn.id === e.to);
            return cn?.born ?? 2026;
          })) : 2026;
          const isReformed = SCRIPTS.edges.some((e) => e.from === n.id && e.kind === "reform");
          const x2 = xScale(Math.min(2026, n.id.startsWith("regular") ? 2026 : (n.id === "phoenician_script" ? 300 : (n.id === "oracle_bone" ? -1100 : (n.id === "bronze_inscription" ? -221 : (n.id === "seal_script" ? -200 : (n.id === "clerical_script" ? 200 : (n.id === "hieroglyphic" ? 400 : (n.id === "proto_sinaitic" ? -1200 : (n.id === "aramaic_script" ? 400 : 2026))))))))));
          return (
            <g key={n.id}>
              <line
                x1={x}
                x2={Math.max(x + 60, x2)}
                y1={y}
                y2={y}
                stroke="#5C5247"
                strokeWidth={3}
                strokeLinecap="round"
                opacity={0.35}
              />
              <circle cx={x} cy={y} r={4} fill="#C4A05A" stroke="#82282C" strokeWidth={0.6} />
              {/* 字符样本 */}
              <text
                x={x + 8}
                y={y - 6}
                fontSize={16}
                fontFamily="'Noto Serif SC', serif"
                fill="#1B1815"
              >
                {n.sample}
              </text>
              <text
                x={x + 8}
                y={y + 12}
                fontSize={10}
                fontFamily="'Noto Serif SC', serif"
                fill="#5C5247"
              >
                {n.name.zh}
              </text>
              <text
                x={x + 8}
                y={y + 22}
                fontSize={8}
                fontStyle="italic"
                fontFamily="'Cormorant Garamond', serif"
                fill="#5C5247"
                opacity={0.7}
              >
                {n.name.en}
              </text>
            </g>
          );
        })}
      </g>

      {/* Time axis */}
      <g>
        <line
          x1={MARGIN.left}
          x2={width - MARGIN.right}
          y1={height - MARGIN.bottom + 1}
          y2={height - MARGIN.bottom + 1}
          stroke="#5C5247"
          strokeWidth={0.6}
        />
        {X_TICKS.map((y) => (
          <g key={y}>
            <line
              x1={xScale(y)}
              x2={xScale(y)}
              y1={height - MARGIN.bottom + 1}
              y2={height - MARGIN.bottom + 6}
              stroke="#5C5247"
              strokeWidth={0.6}
            />
            <text
              x={xScale(y)}
              y={height - MARGIN.bottom + 22}
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
    </svg>
  );
}
