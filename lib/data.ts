import ieRaw from "@/data/languages.ie.json";
import stRaw from "@/data/languages.st.json";
import afroRaw from "@/data/languages.afro.json";
import anRaw from "@/data/languages.an.json";
import otherRaw from "@/data/languages.other.json";
import contactsRaw from "@/data/contacts.json";
import wordsRaw from "@/data/words.json";
import scriptsRaw from "@/data/scripts.json";
import type {
  LanguageNode,
  EvolutionEdge,
  ContactEdge,
  WordEvolution,
  ScriptNode,
  ScriptEdge,
} from "./types";

export const LANGUAGES: LanguageNode[] = [
  ...(ieRaw as LanguageNode[]),
  ...(stRaw as LanguageNode[]),
  ...(afroRaw as LanguageNode[]),
  ...(anRaw as LanguageNode[]),
  ...(otherRaw as LanguageNode[]),
];

// 派生「演变边」：每个有 parent 的节点 → 一条 edge
export const EDGES: EvolutionEdge[] = LANGUAGES
  .filter((l) => l.parent)
  .map((l) => ({
    id: `e_${l.parent}_${l.id}`,
    from: l.parent!,
    to: l.id,
    year: l.born,
    kind: "split" as const,
    certainty: l.status === "reconstructed" ? 0 : (l.born < -500 ? 1 : 2) as 0 | 1 | 2,
  }));

export const CONTACTS: ContactEdge[] = contactsRaw as ContactEdge[];
export const WORDS: WordEvolution[] = wordsRaw as WordEvolution[];
export const SCRIPTS: { nodes: ScriptNode[]; edges: ScriptEdge[] } = scriptsRaw as any;

export const LANGUAGE_BY_ID = new Map<string, LanguageNode>(
  LANGUAGES.map((l) => [l.id, l])
);

export const WORDS_BY_LANG = new Map<string, WordEvolution[]>();
for (const w of WORDS) {
  for (const c of w.chain) {
    if (!WORDS_BY_LANG.has(c.lang)) WORDS_BY_LANG.set(c.lang, []);
    WORDS_BY_LANG.get(c.lang)!.push(w);
  }
}

// 时间范围
export const TIME_MIN = -6500;
export const TIME_MAX = 2026;

// 当前年（用于「现在」标记）
export const TIME_NOW = 2026;

// 帮助函数
export function speakerAt(lang: LanguageNode, year: number): number {
  if (year < lang.born) return 0;
  if (lang.died && year > lang.died) return 0;
  if (lang.status === "living" && year > 2026) return 0;
  const sp = lang.speakers;
  if (sp.length === 0) return 1000;
  if (year <= sp[0].year) return sp[0].count;
  if (year >= sp[sp.length - 1].year) return sp[sp.length - 1].count;
  for (let i = 0; i < sp.length - 1; i++) {
    if (year >= sp[i].year && year <= sp[i + 1].year) {
      const t = (year - sp[i].year) / (sp[i + 1].year - sp[i].year);
      // log interpolation (population grows exponentially)
      const logA = Math.log(Math.max(sp[i].count, 1));
      const logB = Math.log(Math.max(sp[i + 1].count, 1));
      return Math.exp(logA + (logB - logA) * t);
    }
  }
  return sp[sp.length - 1].count;
}
