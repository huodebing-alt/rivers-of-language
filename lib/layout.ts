/**
 * 河流布局算法 v5
 *
 * v5 关键改动：
 *  1. 厚度：log scale，强对比 — minTh=4, maxTh=70 px；英语视觉压倒性粗
 *  2. 堆叠：按 peak thickness + 恒定 gap（语言间 8px / 语系间 36px），ribbon 边缘等距
 *  3. centerline 加低频 sinusoidal noise — 每条河独立 phase 看像真河流
 *  4. thickness 加微 noise — 让河流有自然胖瘦变化
 *  5. ribbon 边缘 noise 不会越过相邻 ribbon（amplitude < gap/2）
 *
 * 保留 v4：
 *  - collapsedIds + enabledFamilies 过滤
 *  - 动态 totalHeight
 *  - X 轴分段线性
 */

import { LANGUAGES, LANGUAGE_BY_ID, speakerAt } from "./data";
import type { FamilyId, LanguageNode } from "./types";

export interface RibbonSample {
  x: number;       // 已 xScale 处理过
  y: number;       // 中心线 y
  w: number;       // 当前厚度
}

export interface LaneRibbon {
  id: string;
  name: { zh: string; en: string };
  /** 实际渲染用的名字（collapsed 时是「最大支流+等」） */
  displayName: { zh: string; en: string };
  family: FamilyId;
  branch?: string;
  path: string;
  centerPath: string;
  status: string;
  born: number;
  died: number;
  yStart: number;
  yEnd: number;
  parent?: string;
  modernThickness: number;
  peakThickness: number;
  collapsible: boolean;
  collapsed: boolean;
  /** 是否为「折叠后合并显示」的 ribbon */
  isMergedRibbon: boolean;
  descendantCount: number;
  /** 采样点（含 xScale 后坐标），供 hover wave 动画使用 */
  samples: RibbonSample[];
}

export interface LayoutResult {
  ribbons: LaneRibbon[];
  totalHeight: number;
  visibleLeafCount: number;
  collapsedCount: number;
  meanRibbonThickness: number;
}

export interface LayoutOptions {
  width: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  xScale: (year: number) => number;
  thickness?: (speakers: number) => number;
  collapsedIds?: Set<string>;
  enabledFamilies?: Set<FamilyId>;
}

// =================== v6 thickness — 1/3 of v5 ===================
const TH_MIN = 2;                       // v5: 4 → v6: 2
const TH_MAX = 23;                      // v5: 70 → v6: 23 (~v5÷3)
const TH_LOG_MIN = Math.log10(100);
const TH_LOG_MAX = Math.log10(2e9);

export function defaultThickness(speakers: number): number {
  const s = Math.max(speakers, 100);
  const v = Math.log10(s);
  const t = Math.max(0, Math.min(1, (v - TH_LOG_MIN) / (TH_LOG_MAX - TH_LOG_MIN)));
  return TH_MIN + (TH_MAX - TH_MIN) * t;
}

// =================== gap & noise ===================
const CONSTANT_GAP = 8;
const FAMILY_GAP = 36;
const NOISE_FREQ_CENTER = 0.0009;
const NOISE_FREQ_THICK  = 0.0017;
const NOISE_AMP_PX      = 2.5;          // v5: 1.4 → v6: 2.5（绝对像素，更明显）
const NOISE_THICK_PCT   = 0.18;         // v5: 0.10 → v6: 0.18 厚度起伏更明显

// 简易确定性 hash → 给每条河独立 phase
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function phase(id: string, salt: string = ""): number {
  return ((hashStr(id + salt) % 10000) / 10000) * Math.PI * 2;
}

// =================== X 轴 ===================
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
  const bps: { y0: number; y1: number; x0: number; x1: number }[] = [];
  for (const [y0, y1, frac] of SEGMENTS) {
    const w = usable * frac;
    bps.push({ y0, y1, x0: acc, x1: acc + w });
    acc += w;
  }
  return (year: number) => {
    if (year <= bps[0].y0) return bps[0].x0;
    if (year >= bps[bps.length - 1].y1) return bps[bps.length - 1].x1;
    for (const bp of bps) {
      if (year >= bp.y0 && year <= bp.y1) {
        const t = (year - bp.y0) / (bp.y1 - bp.y0);
        return bp.x0 + t * (bp.x1 - bp.x0);
      }
    }
    return bps[bps.length - 1].x1;
  };
}

export const X_TICKS: number[] = [-6000, -4000, -3000, -2000, -1000, -500, 0, 500, 1000, 1500, 1800, 2000];

export const EVENTS: { year: number; zh: string; en: string }[] = [
  { year: -3200, zh: "楔形文字", en: "Cuneiform" },
  { year: -1250, zh: "甲骨文", en: "Oracle Bones" },
  { year: -800, zh: "字母诞生", en: "Alphabet" },
  { year: -221, zh: "秦统一文字", en: "Qin Script" },
  { year: 632, zh: "阿语扩张", en: "Arabic Expansion" },
  { year: 1066, zh: "诺曼征服", en: "Norman Conquest" },
  { year: 1492, zh: "美洲开拓", en: "Atlantic Era" },
  { year: 1928, zh: "土耳其拉丁化", en: "Turkish Latinization" },
];

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
    marginTop,
    marginBottom,
    xScale,
    thickness = defaultThickness,
    collapsedIds = new Set<string>(),
    enabledFamilies,
  } = opts;

  // -------- Build children tree --------
  const childrenOf = new Map<string, string[]>();
  for (const l of LANGUAGES) {
    if (l.parent) {
      if (!childrenOf.has(l.parent)) childrenOf.set(l.parent, []);
      childrenOf.get(l.parent)!.push(l.id);
    }
  }

  // -------- Filter logic --------
  const familyEnabled = (f: FamilyId) => (enabledFamilies ? enabledFamilies.has(f) : true);
  function isAncestorCollapsed(id: string): boolean {
    let cur = LANGUAGE_BY_ID.get(id);
    while (cur?.parent) {
      if (collapsedIds.has(cur.parent)) return true;
      cur = LANGUAGE_BY_ID.get(cur.parent);
    }
    return false;
  }
  const shown = new Set<string>();
  for (const l of LANGUAGES) {
    if (familyEnabled(l.family) && !isAncestorCollapsed(l.id)) shown.add(l.id);
  }
  function isVisibleLeaf(id: string): boolean {
    if (!shown.has(id)) return false;
    if (collapsedIds.has(id)) return true;
    const kids = childrenOf.get(id) ?? [];
    return !kids.some((k) => shown.has(k));
  }
  const visibleLeaves = LANGUAGES.filter((l) => isVisibleLeaf(l.id));
  if (visibleLeaves.length === 0) {
    return {
      ribbons: [],
      totalHeight: marginTop + marginBottom + 200,
      visibleLeafCount: 0,
      collapsedCount: collapsedIds.size,
      meanRibbonThickness: 0,
    };
  }
  const sortKey = (l: LanguageNode) =>
    FAMILY_ORDER.indexOf(l.family) * 1000 +
    (BRANCH_ORDER[l.branch ?? ""] ?? 99) * 10 +
    l.geo.lon / 360;
  visibleLeaves.sort((a, b) => sortKey(a) - sortKey(b));

  // -------- v7: 计算合并 ribbon profile（仅 collapsed 节点）--------
  // 收集所有子孙（不管 enabled 与否 — collapse 把整个子树视为一支合流）
  function allDescendantsOf(id: string): LanguageNode[] {
    const out: LanguageNode[] = [];
    const stack = [...(childrenOf.get(id) ?? [])];
    while (stack.length) {
      const cid = stack.pop()!;
      const node = LANGUAGE_BY_ID.get(cid);
      if (node) out.push(node);
      const kids = childrenOf.get(cid) ?? [];
      stack.push(...kids);
    }
    return out;
  }

  function pickBiggest(descs: LanguageNode[]): LanguageNode {
    // 优先 living，按 2025 人数；否则全部里峰值人数
    const living = descs.filter((d) => d.status === "living");
    const pool = living.length > 0 ? living : descs;
    let best = pool[0];
    let bestScore = -1;
    for (const d of pool) {
      const score = living.length > 0
        ? speakerAt(d, 2025)
        : Math.max(0, ...(d.speakers ?? []).map((s) => s.count));
      if (score > bestScore) { best = d; bestScore = score; }
    }
    return best;
  }

  // mergedProfile.get(id) → 仅对 collapsed visible-leaf 有意义
  interface MergedProfile {
    biggest: LanguageNode;
    descendants: LanguageNode[];
    effectiveDied: number;
    displayName: { zh: string; en: string };
  }
  const mergedProfile = new Map<string, MergedProfile>();
  for (const leaf of visibleLeaves) {
    if (!collapsedIds.has(leaf.id)) continue;
    const descs = allDescendantsOf(leaf.id);
    if (descs.length === 0) continue;
    const biggest = pickBiggest(descs);
    const maxDied = Math.max(leaf.died ?? 2026, ...descs.map((d) => d.died ?? 2026));
    mergedProfile.set(leaf.id, {
      biggest,
      descendants: descs,
      effectiveDied: maxDied,
      displayName: {
        zh: biggest.name.zh + "等",
        en: biggest.name.en + " et al.",
      },
    });
  }

  // -------- v7: effectiveSpeakers — 合并 ribbon 在任一年取「最大 descendant 的当年人数」×1.15 --------
  function effectiveSpeakers(l: LanguageNode, y: number): number {
    const mp = mergedProfile.get(l.id);
    if (!mp) return speakerAt(l, y);
    let max = speakerAt(l, y);
    for (const d of mp.descendants) {
      const s = speakerAt(d, y);
      if (s > max) max = s;
    }
    return max * 1.15;       // ← 比最大支流粗一点
  }

  function effectiveDied(l: LanguageNode): number {
    const mp = mergedProfile.get(l.id);
    return mp ? mp.effectiveDied : (l.died ?? 2026);
  }

  // -------- 计算 peakThickness 给每个 visibleLeaf --------
  const peakThick = new Map<string, number>();
  for (const leaf of visibleLeaves) {
    let m = 0;
    const died = effectiveDied(leaf);
    for (let y = leaf.born; y <= died; y += 100) {
      const t = thickness(effectiveSpeakers(leaf, y));
      if (t > m) m = t;
    }
    const final = thickness(effectiveSpeakers(leaf, died));
    if (final > m) m = final;
    peakThick.set(leaf.id, Math.max(TH_MIN, m));
  }

  // -------- v5: 恒定 gap 堆叠 --------
  const yOf = new Map<string, number>();
  let acc = marginTop;
  let prevFamily: FamilyId | null = null;
  for (const leaf of visibleLeaves) {
    if (prevFamily !== null && prevFamily !== leaf.family) acc += FAMILY_GAP;
    else if (prevFamily !== null) acc += CONSTANT_GAP;
    const pt = peakThick.get(leaf.id)!;
    yOf.set(leaf.id, acc + pt / 2);
    acc += pt;
    prevFamily = leaf.family;
  }
  const totalHeight = Math.ceil(acc + marginBottom);

  // -------- 内部节点 Y 重心 --------
  function descVisibleLeaves(id: string): LanguageNode[] {
    if (isVisibleLeaf(id)) return [LANGUAGE_BY_ID.get(id)!];
    const out: LanguageNode[] = [];
    for (const cid of childrenOf.get(id) ?? []) {
      if (shown.has(cid)) out.push(...descVisibleLeaves(cid));
    }
    return out;
  }
  for (const l of LANGUAGES) {
    if (!shown.has(l.id) || yOf.has(l.id)) continue;
    const descs = descVisibleLeaves(l.id);
    if (descs.length === 0) {
      yOf.set(l.id, marginTop + (totalHeight - marginTop - marginBottom) / 2);
      continue;
    }
    let sumY = 0, sumW = 0;
    for (const d of descs) {
      const w = Math.log(Math.max(speakerAt(d, 2025), 1) + 1);
      sumY += yOf.get(d.id)! * w;
      sumW += w;
    }
    yOf.set(l.id, sumW > 0 ? sumY / sumW : marginTop + totalHeight / 2);
  }

  // -------- 生成 ribbons —— 加 noise wave + thickness 变化 --------
  const STEP = 30;
  const noiseAmp = NOISE_AMP_PX;
  const ribbons: LaneRibbon[] = [];
  let thickSum = 0;

  for (const l of LANGUAGES) {
    if (!shown.has(l.id)) continue;
    const born = l.born;
    const isMerged = mergedProfile.has(l.id);
    const died = effectiveDied(l);            // v7: 合并 ribbon 延伸到最远 descendant
    const startY = yOf.get(l.id)!;
    const parentY = l.parent && yOf.has(l.parent) ? yOf.get(l.parent)! : startY;

    const isLiving = isMerged ? true : l.status === "living";
    const isRecon = l.status === "reconstructed" && !isMerged;
    const minW = isRecon ? 1.2 : isLiving ? 3 : 2;
    const phaseY = phase(l.id, "y");
    const phaseT = phase(l.id, "t");

    const samples: { year: number; y: number; w: number }[] = [];
    const TRANSITION = Math.min(220, Math.max(80, (died - born) * 0.06));

    for (let y = born; y <= died; y += STEP) {
      // smooth merge from parent
      let cy = startY;
      if (l.parent && yOf.has(l.parent) && y < born + TRANSITION) {
        const t = (y - born) / TRANSITION;
        const ts = 0.5 - 0.5 * Math.cos(Math.PI * t);
        cy = parentY + (startY - parentY) * ts;
      }

      // v5: noise wave on centerline
      // amplitude 在两端 taper 到 0，避免和父/子接缝突兀
      let ampFactor = 1;
      if (y < born + TRANSITION) ampFactor = (y - born) / TRANSITION;
      if (l.died && y > died - TRANSITION) ampFactor = (died - y) / TRANSITION;
      ampFactor = Math.max(0, Math.min(1, ampFactor));
      cy += Math.sin(y * NOISE_FREQ_CENTER + phaseY) * noiseAmp * ampFactor;

      // base thickness
      // v7: 用 effectiveSpeakers — 合并 ribbon 取 max(descendants) × 1.15
      const count = effectiveSpeakers(l, y);
      let w = Math.max(minW, thickness(count));

      // noise thickness 微胖瘦
      w *= 1 + Math.sin(y * NOISE_FREQ_THICK + phaseT) * NOISE_THICK_PCT * ampFactor;

      // taper birth/death（合并 ribbon 不在尾端 taper — 它是活的）
      if (y < born + TRANSITION) w *= Math.max(0.05, (y - born) / TRANSITION);
      if (!isMerged && l.died && y > died - TRANSITION) w *= Math.max(0.05, (died - y) / TRANSITION);

      samples.push({ year: y, y: cy, w });
    }
    if (samples.length === 0 || samples[samples.length - 1].year < died) {
      let cy = startY;
      let w = Math.max(minW, thickness(effectiveSpeakers(l, died)));
      if (!isMerged && l.died) w *= 0.05;
      samples.push({ year: died, y: cy, w });
    }

    // SVG path: top edge forward + bot edge backward
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
      const ps = samples[i - 1], s = samples[i];
      const px = xScale(ps.year), py = ps.y;
      const x = xScale(s.year), y = s.y;
      const cx = (px + x) / 2;
      centerPath += `C ${cx},${py} ${cx},${y} ${x},${y} `;
    }

    const kids = childrenOf.get(l.id) ?? [];
    const collapsible = kids.length > 0;
    const collapsed = collapsedIds.has(l.id);

    function countAllDesc(id: string): number {
      const k = childrenOf.get(id) ?? [];
      let n = k.length;
      for (const cid of k) n += countAllDesc(cid);
      return n;
    }

    const peak = peakThick.get(l.id) ?? Math.max(...samples.map((s) => s.w));
    thickSum += peak;

    // 把 samples 转成已 xScale 处理过的坐标数组（供 hover wave 用）
    const ribbonSamples: RibbonSample[] = samples.map((s) => ({
      x: xScale(s.year),
      y: s.y,
      w: s.w,
    }));

    const mp = mergedProfile.get(l.id);
    const displayName = mp ? mp.displayName : l.name;

    ribbons.push({
      id: l.id,
      name: l.name,
      displayName,
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
      peakThickness: peak,
      collapsible,
      collapsed,
      isMergedRibbon: !!mp,
      descendantCount: countAllDesc(l.id),
      samples: ribbonSamples,
    });
  }

  return {
    ribbons,
    totalHeight,
    visibleLeafCount: visibleLeaves.length,
    collapsedCount: collapsedIds.size,
    meanRibbonThickness: ribbons.length > 0 ? thickSum / ribbons.length : 0,
  };
}
