/**
 * 河流布局算法 v2 — 修复下游 overlap + 长标签
 *
 * 关键改动 vs v1：
 *  - 每个 leaf 按 **峰值厚度** 预留垂直「车道」（min 7px / living, 5px / historical, + gap）
 *  - SVG **总高度动态计算** — 不再固定容器高度，让所有 ribbon 都有空间，容器 overflow-y scroll
 *  - ribbon 厚度有下限（living = 4px, historical = 2px），保证 hover 可点
 *  - 后期 collision 检测：扫一遍所有 ribbon，发现 yStart 间距 < laneHeight 的对手就下推
 *
 * 调用方拿到 `{ ribbons, totalHeight }`，把 totalHeight 设给 SVG 的 height 属性。
 */

import { LANGUAGES, LANGUAGE_BY_ID, speakerAt } from "./data";
import type { FamilyId, LanguageNode } from "./types";

export interface LaneRibbon {
  id: string;
  name: { zh: string; en: string };
  family: FamilyId;
  branch?: string;
  path: string;          // SVG path d
  centerPath: string;    // 中线 path（用于 label / hover）
  status: string;
  born: number;
  died: number;
  yStart: number;        // 出生 y
  yEnd: number;          // 死亡 / 现在 y
  parent?: string;
  /** 当前在 modern 的厚度（用于 hit 区域判断） */
  modernThickness: number;
}

export interface LayoutResult {
  ribbons: LaneRibbon[];
  totalHeight: number;
}

export interface LayoutOptions {
  width: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  xScale: (year: number) => number;
  thickness: (speakers: number) => number;
  /** 最小厚度（living），默认 7 */
  minThickLiving?: number;
  /** 最小厚度（historical / extinct），默认 5 */
  minThickHistorical?: number;
  /** Lane 间隔 gap，默认 3 */
  laneGap?: number;
}

// X 轴：分段线性
const SEGMENTS: [number, number, number][] = [
  [-6500, -2500, 0.18],
  [-2500, -200,  0.22],
  [-200,   600,  0.16],
  [600,    1400, 0.18],
  [1400,   1800, 0.12],
  [1800,   2026, 0.14],
];

export function makeXScale(width: number, marginLeft: number, marginRight: number) {
  const usable = width - marginLeft - marginRight;
  let acc = marginLeft;
  const breakpoints: { y0: number; y1: number; x0: number; x1: number }[] = [];
  for (const [y0, y1, frac] of SEGMENTS) {
    const w = usable * frac;
    breakpoints.push({ y0, y1, x0: acc, x1: acc + w });
    acc += w;
  }
  return (year: number) => {
    if (year <= breakpoints[0].y0) return breakpoints[0].x0;
    if (year >= breakpoints[breakpoints.length - 1].y1) return breakpoints[breakpoints.length - 1].x1;
    for (const bp of breakpoints) {
      if (year >= bp.y0 && year <= bp.y1) {
        const t = (year - bp.y0) / (bp.y1 - bp.y0);
        return bp.x0 + t * (bp.x1 - bp.x0);
      }
    }
    return breakpoints[breakpoints.length - 1].x1;
  };
}

export const X_TICKS: number[] = [-6000, -4000, -3000, -2000, -1000, -500, 0, 500, 1000, 1500, 1800, 2000];

const FAMILY_ORDER: FamilyId[] = ["ie", "afro", "dr", "turk", "st", "isolate", "an", "ng"];
const BRANCH_ORDER: Record<string, number> = {
  "celtic": 1, "germanic": 2, "north-germanic": 2.1, "west-germanic": 2.2, "east-germanic": 2.3,
  "romance": 3, "italic": 3.5, "albanian": 4, "greek": 4.5, "slavic": 5, "balto-slavic": 5,
  "baltic": 5.1, "armenian": 5.5, "anatolian": 6, "indo-iranian": 7, "iranian": 7.5,
  "indo-aryan": 8, "tocharian": 9,
  "sinitic": 1, "tibetic": 2, "burmic": 3, "qiangic": 4, "karenic": 5, "sal": 6, "bai": 7,
  "newaric": 8,
  "semitic": 1, "east-semitic": 1.1, "nw-semitic": 1.2, "central-semitic": 1.3, "south-semitic": 1.4,
  "egyptian": 2, "berber": 3, "cushitic": 4, "chadic": 5,
  "formosan": 0, "wmp": 1, "mp": 1.5, "oceanic": 2,
  "bantu": 1, "volta-niger": 2, "atlantic": 3, "kwa": 4,
  "japonic": 1, "koreanic": 2, "vietic": 3,
};

export function computeLayout(opts: LayoutOptions): LayoutResult {
  const {
    width,
    marginTop,
    marginBottom,
    xScale,
    thickness,
    minThickLiving = 22,        // v3: 7 → 22（每条 living 至少 22px 车道）
    minThickHistorical = 16,    // v3: 5 → 16
    laneGap = 18,               // v3: 3 → 18（车道间空白大幅加大）
  } = opts;

  // 1. Build children map
  const childrenOf = new Map<string, string[]>();
  for (const l of LANGUAGES) {
    if (l.parent) {
      if (!childrenOf.has(l.parent)) childrenOf.set(l.parent, []);
      childrenOf.get(l.parent)!.push(l.id);
    }
  }

  function isLeaf(id: string) {
    return !childrenOf.has(id) || childrenOf.get(id)!.length === 0;
  }

  const leaves = LANGUAGES.filter((l) => isLeaf(l.id));

  // 2. 排序：语系 → 分支 → 经度
  const sortKey = (l: LanguageNode): number => {
    const fOrder = FAMILY_ORDER.indexOf(l.family);
    const bOrder = BRANCH_ORDER[l.branch ?? ""] ?? 99;
    return fOrder * 1000 + bOrder * 10 + l.geo.lon / 360;
  };
  leaves.sort((a, b) => sortKey(a) - sortKey(b));

  // 3. 给每个 leaf 计算「车道高度」 = 峰值厚度 + gap
  const laneHeight = new Map<string, number>();
  for (const leaf of leaves) {
    const peak = Math.max(
      speakerAt(leaf, 2025),
      speakerAt(leaf, leaf.died ?? 2025),
      ...(leaf.speakers ?? []).map((s) => s.count),
      1
    );
    const min = leaf.status === "living" ? minThickLiving : minThickHistorical;
    const h = Math.max(min, thickness(peak));
    laneHeight.set(leaf.id, h + laneGap);
  }

  // 4. 垂直堆叠 — 语系之间额外 gap
  const FAMILY_BREAK_GAP = 48;   // v3: 8 → 48（语系之间留出明显分隔）
  const yOf = new Map<string, number>();
  let acc = marginTop;
  let prevFamily: FamilyId | null = null;
  for (const leaf of leaves) {
    if (prevFamily && prevFamily !== leaf.family) acc += FAMILY_BREAK_GAP;
    const h = laneHeight.get(leaf.id)!;
    yOf.set(leaf.id, acc + h / 2);
    acc += h;
    prevFamily = leaf.family;
  }
  const totalHeight = Math.ceil(acc + marginBottom);

  // 5. 内部节点 Y = descendants 加权重心（按 modern speakers）
  function descLeaves(id: string): LanguageNode[] {
    if (isLeaf(id)) return [LANGUAGE_BY_ID.get(id)!];
    const out: LanguageNode[] = [];
    for (const cid of childrenOf.get(id) ?? []) out.push(...descLeaves(cid));
    return out;
  }
  for (const l of LANGUAGES) {
    if (isLeaf(l.id)) continue;
    const descs = descLeaves(l.id);
    if (descs.length === 0) { yOf.set(l.id, marginTop + (totalHeight - marginTop - marginBottom) / 2); continue; }
    let sumY = 0, sumW = 0;
    for (const d of descs) {
      const finalY = yOf.get(d.id)!;
      const w = Math.log(Math.max(speakerAt(d, 2025), 1) + 1);
      sumY += finalY * w;
      sumW += w;
    }
    yOf.set(l.id, sumW > 0 ? sumY / sumW : marginTop + totalHeight / 2);
  }

  // 6. 生成 ribbons
  const STEP = 40;
  const ribbons: LaneRibbon[] = [];
  for (const l of LANGUAGES) {
    const born = l.born;
    const died = l.died ?? 2026;
    const startY = yOf.get(l.id)!;
    const parentY = l.parent ? (yOf.get(l.parent) ?? startY) : startY;

    const isLiving = l.status === "living";
    const isRecon = l.status === "reconstructed";
    const minW = isLiving ? 4 : isRecon ? 1.5 : 2;

    const samples: { year: number; y: number; w: number }[] = [];
    const TRANSITION = Math.min(200, Math.max(80, (died - born) * 0.06));

    for (let y = born; y <= died; y += STEP) {
      let cy = startY;
      if (l.parent && y < born + TRANSITION) {
        const t = (y - born) / TRANSITION;
        const ts = 0.5 - 0.5 * Math.cos(Math.PI * t);
        cy = parentY + (startY - parentY) * ts;
      }
      const count = speakerAt(l, y);
      let w = Math.max(minW, thickness(count));
      // taper start
      if (y < born + TRANSITION) {
        const t = (y - born) / TRANSITION;
        w *= Math.max(0.05, t);
      }
      // taper end (only for died / extinct)
      if (l.died && y > died - TRANSITION) {
        const t = (died - y) / TRANSITION;
        w *= Math.max(0.05, t);
      }
      samples.push({ year: y, y: cy, w });
    }
    if (samples.length === 0 || samples[samples.length - 1].year < died) {
      let cy = startY;
      let w = Math.max(minW, thickness(speakerAt(l, died)));
      if (l.died) w *= 0.05;
      samples.push({ year: died, y: cy, w });
    }

    // build path
    const top: [number, number][] = samples.map((s) => [xScale(s.year), s.y - s.w / 2]);
    const bot: [number, number][] = samples.map((s) => [xScale(s.year), s.y + s.w / 2]);

    let path = `M ${top[0][0]},${top[0][1]} `;
    for (let i = 1; i < top.length; i++) {
      const px = top[i - 1][0], py = top[i - 1][1];
      const [x, y] = top[i];
      const cx = (px + x) / 2;
      path += `C ${cx},${py} ${cx},${y} ${x},${y} `;
    }
    path += `L ${bot[bot.length - 1][0]},${bot[bot.length - 1][1]} `;
    for (let i = bot.length - 2; i >= 0; i--) {
      const px = bot[i + 1][0], py = bot[i + 1][1];
      const [x, y] = bot[i];
      const cx = (px + x) / 2;
      path += `C ${cx},${py} ${cx},${y} ${x},${y} `;
    }
    path += "Z";

    let centerPath = `M ${xScale(samples[0].year)},${samples[0].y} `;
    for (let i = 1; i < samples.length; i++) {
      const ps = samples[i - 1];
      const s = samples[i];
      const px = xScale(ps.year), py = ps.y;
      const x = xScale(s.year), y = s.y;
      const cx = (px + x) / 2;
      centerPath += `C ${cx},${py} ${cx},${y} ${x},${y} `;
    }

    ribbons.push({
      id: l.id,
      name: l.name,
      family: l.family,
      branch: l.branch,
      path,
      centerPath,
      status: l.status ?? "living",
      born,
      died,
      yStart: startY,
      yEnd: startY,
      parent: l.parent,
      modernThickness: samples[samples.length - 1].w,
    });
  }

  return { ribbons, totalHeight };
}

// 默认厚度函数：log10 scale
export function defaultThickness(speakers: number): number {
  const v = Math.log10(Math.max(speakers, 100));
  // log10(100)=2 → 0.6;  log10(1.5B)=9.18 → ~32
  return Math.max(0.6, (v - 2) * 4.5);
}
