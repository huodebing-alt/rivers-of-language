/**
 * Fetch Wiktionary etymology for high-priority PIE roots.
 *
 * Wiktionary's REST API doesn't give structured etymology trees, so we parse
 * the wikitext and extract reflexes (descendants) listed under each entry.
 *
 * Output: data/wiktionary-etym.json — list of { proto, gloss, descendants: [{lang, form}] }
 */
import fs from "fs";
import path from "path";

// Wiktionary PIE root pages to try (these are real Wiktionary URLs)
const PIE_ROOTS = [
  { proto: "*ph₂tḗr", page: "Reconstruction:Proto-Indo-European/ph₂tḗr", gloss: "father" },
  { proto: "*méh₂tēr", page: "Reconstruction:Proto-Indo-European/méh₂tēr", gloss: "mother" },
  { proto: "*septḿ̥", page: "Reconstruction:Proto-Indo-European/septḿ̥", gloss: "seven" },
  { proto: "*kʷékʷlos", page: "Reconstruction:Proto-Indo-European/kʷékʷlos", gloss: "wheel" },
  { proto: "*bʰréh₂tēr", page: "Reconstruction:Proto-Indo-European/bʰréh₂tēr", gloss: "brother" },
];

async function fetchWikitext(title: string): Promise<string> {
  const url = `https://en.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(
    title
  )}&prop=wikitext&format=json&formatversion=2`;
  const res = await fetch(url, {
    headers: { "User-Agent": "rivers-of-language-ingest/0.1 (research)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${title}`);
  const data = await res.json();
  return data.parse?.wikitext ?? "";
}

// Naively parse `* {{desc|<lang>|<form>}}` lines from wikitext
function parseDescendants(wikitext: string): { lang: string; form: string }[] {
  const out: { lang: string; form: string }[] = [];
  const re = /\{\{desc(?:endant)?\|([^|}]+)\|([^|}]+)/g;
  let m;
  while ((m = re.exec(wikitext))) {
    out.push({ lang: m[1].trim(), form: m[2].trim() });
  }
  return out;
}

async function main() {
  const result: any[] = [];
  for (const r of PIE_ROOTS) {
    try {
      console.log(`Fetching ${r.proto}...`);
      const wt = await fetchWikitext(r.page);
      const descendants = parseDescendants(wt);
      result.push({ ...r, descendants });
      console.log(`  ${descendants.length} descendants`);
    } catch (e) {
      console.warn(`  Failed: ${e}`);
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  const outPath = path.resolve(__dirname, "../data/wiktionary-etym.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`Wrote ${result.length} roots to ${outPath}`);
}

main().catch(console.error);
