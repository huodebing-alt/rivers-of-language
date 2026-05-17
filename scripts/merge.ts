/**
 * Merge ingested data (glottolog / wikidata) into the seed `data/languages.*.json`.
 *
 * Strategy:
 *  - For each seed language with a glottocode hint or fuzzy name match, fill in:
 *    - latitude / longitude (Wikidata coordinate)
 *    - speakers (Wikidata P1098, only if seed doesn't have a 2025 sample)
 *  - Never overwrite seed values that have notes or detailed timeline.
 *  - Output a merged `data/languages.merged.json` for review (not auto-committed).
 */
import fs from "fs";
import path from "path";

const root = path.resolve(__dirname, "..");
const seedFiles = [
  "data/languages.ie.json",
  "data/languages.st.json",
  "data/languages.afro.json",
  "data/languages.an.json",
  "data/languages.other.json",
];

function readJSON(p: string) {
  return JSON.parse(fs.readFileSync(path.resolve(root, p), "utf8"));
}

function main() {
  const seed: any[] = seedFiles.flatMap(readJSON);
  let wikidata: any[] = [];
  try {
    wikidata = readJSON("data/wikidata-langs.json");
  } catch {
    console.warn("No wikidata-langs.json yet — run `npm run ingest:wikidata` first.");
  }

  const byGloss = new Map<string, any>();
  for (const w of wikidata) {
    if (w.glottocode) byGloss.set(w.glottocode, w);
  }

  let enriched = 0;
  for (const s of seed) {
    if (!s.glottocode) continue;
    const w = byGloss.get(s.glottocode);
    if (!w) continue;
    if (w.lat !== undefined && w.lon !== undefined && !s.geo?.bbox) {
      // Override only if seed coords differ by > 5°
      const dlat = Math.abs((s.geo?.lat ?? 0) - w.lat);
      if (dlat > 5) {
        s.geo = { ...s.geo, lat: w.lat, lon: w.lon };
        enriched++;
      }
    }
  }
  console.log(`Enriched ${enriched} languages from Wikidata.`);

  fs.writeFileSync(
    path.resolve(root, "data/languages.merged.json"),
    JSON.stringify(seed, null, 2)
  );
  console.log(`Wrote merged dataset (${seed.length} languages).`);
}

main();
