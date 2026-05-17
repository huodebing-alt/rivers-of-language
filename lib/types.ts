// 数据类型定义 — 详见 Phase2-技术与数据.md §2

export type FamilyId =
  | "ie"     // Indo-European 印欧
  | "st"     // Sino-Tibetan 汉藏
  | "afro"   // Afro-Asiatic 闪含
  | "an"     // Austronesian 南岛
  | "ng"     // Niger-Congo 尼日-刚果
  | "dr"     // Dravidian 达罗毗荼
  | "turk"   // Turkic 突厥
  | "isolate"; // 孤立语言（日韩等 ghost 节点）

export interface SpeakerPoint {
  year: number;        // 负数 = BCE
  count: number;       // 估算使用人数（个）
}

export interface LanguageNode {
  id: string;
  glottocode?: string;
  name: { zh: string; en: string; native?: string };
  family: FamilyId;
  branch?: string;
  parent?: string;       // parent LanguageNode.id
  born: number;          // 节点诞生年（BCE 为负）
  died?: number;         // 分化/消亡年
  geo: {
    lat: number;
    lon: number;
    bbox?: [number, number, number, number];
  };
  speakers: SpeakerPoint[];
  status?: "extinct" | "historical" | "living" | "reconstructed";
  notes?: { zh?: string; en?: string };
}

export interface EvolutionEdge {
  id: string;
  from: string;
  to: string;
  year: number;
  kind: "split" | "continuity";
  certainty: 0 | 1 | 2;
  exampleWord?: string;       // 引用 WordEvolution.id
}

export interface ContactEdge {
  id: string;
  source: string;
  target: string;
  year: number;
  kind: "loan" | "substrate" | "areal" | "script";
  strength: 0 | 1 | 2;
  example?: { zh?: string; en?: string };
  notes?: { zh?: string; en?: string };
}

export interface WordChainPoint {
  lang: string;     // LanguageNode.id
  form: string;     // 拼写
  ipa?: string;
  year?: number;
  note?: { zh?: string; en?: string };
}

export interface WordEvolution {
  id: string;
  gloss: { zh: string; en: string };
  proto: { lang: string; form: string };
  chain: WordChainPoint[];
}

export interface ScriptNode {
  id: string;
  name: { zh: string; en: string };
  born: number;
  region: { lat: number; lon: number };
  sample: string;          // unicode 样本
  parentScript?: string;
  notes?: { zh?: string; en?: string };
}

export interface ScriptEdge {
  id: string;
  from: string;
  to: string;
  year: number;
  kind: "derive" | "borrow" | "reform";
}

// 视图状态
export interface ViewState {
  mode: "language" | "script";
  hoveredId: string | null;
  selectedId: string | null;
  enabledFamilies: FamilyId[];
  showContacts: boolean;
  timeRange: [number, number];
}

export const FAMILY_META: Record<FamilyId, { zh: string; en: string; color: string }> = {
  ie:   { zh: "印欧", en: "Indo-European", color: "#3D5A80" },
  st:   { zh: "汉藏", en: "Sino-Tibetan",  color: "#9C3B3F" },
  afro: { zh: "闪含", en: "Afro-Asiatic",  color: "#7A8B3A" },
  an:   { zh: "南岛", en: "Austronesian",  color: "#3F7E84" },
  ng:   { zh: "尼日-刚果", en: "Niger-Congo", color: "#C97A3A" },
  dr:   { zh: "达罗毗荼", en: "Dravidian", color: "#6B4B8A" },
  turk: { zh: "突厥", en: "Turkic",        color: "#8A3F6B" },
  isolate: { zh: "孤立 / 接触", en: "Isolate / Contact", color: "#7A6A4A" },
};
