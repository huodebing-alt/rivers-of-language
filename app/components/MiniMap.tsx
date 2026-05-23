"use client";
import { useEffect, useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3";
import { feature } from "topojson-client";
import { LANGUAGE_BY_ID, LANGUAGES } from "@/lib/data";
import { FAMILY_META } from "@/lib/types";

const WIDTH = 300, HEIGHT = 170;

interface Props {
  highlightId: string | null;
}

// world-atlas v2 (~110KB gzipped) — fetched from CDN once, cached
const WORLD_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

let _worldCache: any | null = null;

export default function MiniMap({ highlightId }: Props) {
  const [world, setWorld] = useState<any | null>(_worldCache);

  useEffect(() => {
    if (_worldCache) {
      setWorld(_worldCache);
      return;
    }
    let cancelled = false;
    fetch(WORLD_URL)
      .then((r) => r.json())
      .then((topo) => {
        if (cancelled) return;
        const fc = feature(topo, topo.objects.countries) as any;
        _worldCache = fc;
        setWorld(fc);
      })
      .catch(() => {
        // 网络失败：什么都不画（保留 fallback 视觉）
      });
    return () => { cancelled = true; };
  }, []);

  const projection = useMemo(
    () => geoNaturalEarth1().scale(58).translate([WIDTH / 2, HEIGHT / 2 + 6]),
    []
  );
  const pathGen = useMemo(() => geoPath(projection), [projection]);

  const highlight = highlightId ? LANGUAGE_BY_ID.get(highlightId) : null;
  const allLangs = useMemo(
    () => Array.from(LANGUAGE_BY_ID.values()),
    []
  );

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT} className="block">
      {/* 海洋背景 */}
      <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="#F5EFE2" opacity={0.5} />

      {/* 大陆轮廓（来自 world-atlas v2） */}
      <g opacity={0.45}>
        {world?.features.map((country: any, i: number) => (
          <path
            key={i}
            d={pathGen(country) || undefined}
            fill="#E2D3B0"
            stroke="#A8853C"
            strokeWidth={0.3}
          />
        ))}
      </g>

      {/* 全部语言点（淡） */}
      <g opacity={0.55}>
        {allLangs.map((l) => {
          if (l.status === "reconstructed") return null;
          const p = projection([l.geo.lon, l.geo.lat]);
          if (!p) return null;
          return (
            <circle
              key={l.id}
              cx={p[0]}
              cy={p[1]}
              r={0.9}
              fill={FAMILY_META[l.family].color}
            />
          );
        })}
      </g>

      {/* 高亮 */}
      {highlight && (() => {
        const p = projection([highlight.geo.lon, highlight.geo.lat]);
        if (!p) return null;
        return (
          <g>
            <circle cx={p[0]} cy={p[1]} r={11} fill={FAMILY_META[highlight.family].color} opacity={0.22} />
            <circle cx={p[0]} cy={p[1]} r={5.5} fill={FAMILY_META[highlight.family].color} opacity={0.5} />
            <circle cx={p[0]} cy={p[1]} r={3} fill={FAMILY_META[highlight.family].color} stroke="#FBF8F1" strokeWidth={0.8} />
            {/* 名字标签 */}
            <text
              x={p[0] + 8}
              y={p[1] - 2}
              fontSize={9}
              fontFamily="'Noto Serif SC', 'Cormorant Garamond', serif"
              fill={FAMILY_META[highlight.family].color}
              fontWeight={600}
            >
              {highlight.name.zh}
            </text>
            <text
              x={p[0] + 8}
              y={p[1] + 9}
              fontSize={8}
              fontStyle="italic"
              fontFamily="'Cormorant Garamond', serif"
              fill={FAMILY_META[highlight.family].color}
              opacity={0.75}
            >
              {highlight.name.en}
            </text>
          </g>
        );
      })()}

      {/* 边框 */}
      <rect x={0.5} y={0.5} width={WIDTH - 1} height={HEIGHT - 1} fill="none" stroke="#A8853C" strokeWidth={0.4} opacity={0.4} />
    </svg>
  );
}
