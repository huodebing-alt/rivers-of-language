"use client";
import { useMemo } from "react";
import * as d3 from "d3";
import { LANGUAGE_BY_ID } from "@/lib/data";
import { FAMILY_META } from "@/lib/types";

// 极简的世界地图 — 用一组国家/大陆的轮廓近似
// 为了零外部 GeoJSON 依赖，使用世界主要大陆的圆弧近似
const W = 280, H = 180;

interface Props {
  highlightId: string | null;
}

// 用 Mollweide 投影把 (lat, lon) 投到画布上
function project(lat: number, lon: number): [number, number] {
  // Equirectangular projection
  const x = ((lon + 180) / 360) * W;
  const y = ((90 - lat) / 180) * H;
  return [x, y];
}

// 简化大陆轮廓（粗略椭圆 / 多边形）
const CONTINENTS: { name: string; d: string }[] = [
  // 欧亚大陆
  { name: "Eurasia", d: "M 60,30 Q 120,20 200,32 Q 240,45 250,80 Q 230,95 180,92 Q 130,90 90,80 Q 60,70 60,50 Z" },
  // 非洲
  { name: "Africa", d: "M 130,75 Q 160,80 165,110 Q 160,140 145,150 Q 130,140 125,110 Q 120,90 130,75 Z" },
  // 澳大利亚
  { name: "Australia", d: "M 215,125 Q 245,125 245,140 Q 235,150 215,148 Q 205,140 215,125 Z" },
  // 北美
  { name: "N. America", d: "M 25,40 Q 60,35 70,60 Q 65,80 45,85 Q 25,75 20,60 Q 18,48 25,40 Z" },
  // 南美
  { name: "S. America", d: "M 55,95 Q 75,95 75,120 Q 70,148 55,150 Q 45,135 48,115 Q 50,100 55,95 Z" },
];

export default function MiniMap({ highlightId }: Props) {
  const all = LANGUAGE_BY_ID;
  const highlight = highlightId ? all.get(highlightId) : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block">
      {/* 大陆轮廓 */}
      <g opacity={0.4}>
        {CONTINENTS.map((c) => (
          <path key={c.name} d={c.d} fill="#E2D3B0" stroke="#A8853C" strokeWidth={0.4} />
        ))}
      </g>

      {/* 所有语言的点（淡色） */}
      <g opacity={0.4}>
        {Array.from(all.values()).map((l) => {
          if (l.status === "reconstructed") return null;
          const [x, y] = project(l.geo.lat, l.geo.lon);
          return (
            <circle
              key={l.id}
              cx={x}
              cy={y}
              r={0.7}
              fill={FAMILY_META[l.family].color}
            />
          );
        })}
      </g>

      {/* 高亮 */}
      {highlight && (() => {
        const [x, y] = project(highlight.geo.lat, highlight.geo.lon);
        return (
          <g>
            <circle cx={x} cy={y} r={8} fill={FAMILY_META[highlight.family].color} opacity={0.25} />
            <circle cx={x} cy={y} r={3.2} fill={FAMILY_META[highlight.family].color} stroke="#FBF8F1" strokeWidth={0.6} />
          </g>
        );
      })()}

      {/* 边框 */}
      <rect x={0.5} y={0.5} width={W - 1} height={H - 1} fill="none" stroke="#A8853C" strokeWidth={0.4} opacity={0.4} />
    </svg>
  );
}
