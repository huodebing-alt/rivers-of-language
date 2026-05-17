/**
 * Fetch Glottolog 5.x tree for the 7 families we care about.
 *
 * Output: data/glottolog.json — list of { glottocode, name, family, parent, geo }
 *
 * Source: https://glottolog.org/meta/downloads (CLDR-style CSV dump)
 * We hit the JSON endpoints for each family root and walk children.
 */
import fs from "fs";
import path from "path";

const FAMILY_ROOTS = {
  ie: "indo1319",      // Indo-European
  st: "sino1245",      // Sino-Tibetan
  afro: "afro1255",    // Afro-Asiatic
  an: "aust1307",      // Austronesian
  ng: "atla1278",      // Atlantic-Congo (modern Glottolog name for most of Niger-Congo)
  dr: "drav1251",      // Dravidian
  turk: "turk1311",    // Turkic
};

interface GlottoNode {
  id: string;
  name: string;
  family?: string;
  parent?: string;
  latitude?: number;
  longitude?: number;
  level?: string;
}

async function fetchJSON(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { "User-Agent": "rivers-of-language-ingest/0.1 (research)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function fetchSubtree(rootId: string, family: string): Promise<GlottoNode[]> {
  const url = `https://glottolog.org/resource/languoid/id/${rootId}.json`;
  const out: GlottoNode[] = [];
  try {
    const root = await fetchJSON(url);
    out.push({
      id: root.id,
      name: root.name,
      family,
      parent: root.parent?.id,
      latitude: root.latitude,
      longitude: root.longitude,
      level: root.level,
    });
    // Glottolog provides children at root.children
    for (const ch of root.children ?? []) {
      out.push(...(await fetchSubtree(ch.id, family)));
      await new Promise((r) => setTimeout(r, 60)); // rate-limit
    }
  } catch (e) {
    console.warn(`fetch failed for ${rootId}: ${e}`);
  }
  return out;
}

async function main() {
  const all: GlottoNode[] = [];
  for (const [family, root] of Object.entries(FAMILY_ROOTS)) {
    console.log(`Fetching ${family} (root ${root})...`);
    const sub = await fetchSubtree(root, family);
    console.log(`  ${sub.length} nodes`);
    all.push(...sub);
  }
  const outPath = path.resolve(__dirname, "../data/glottolog.json");
  fs.writeFileSync(outPath, JSON.stringify(all, null, 2));
  console.log(`Wrote ${all.length} nodes to ${outPath}`);
}

main().catch(console.error);
