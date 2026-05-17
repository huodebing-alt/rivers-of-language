/**
 * Fetch Wikidata SPARQL for speaker counts and coordinates of major languages.
 *
 * Query: languages with Glottolog ID, with optional P1098 (number of speakers) and P625 (coordinates).
 *
 * Output: data/wikidata-langs.json
 */
import fs from "fs";
import path from "path";

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";

const QUERY = `
SELECT ?lang ?langLabel ?glottocode ?speakers ?coord WHERE {
  ?lang wdt:P31 wd:Q34770 .             # instance of: language
  OPTIONAL { ?lang wdt:P1394 ?glottocode . }
  OPTIONAL { ?lang wdt:P1098 ?speakers . }
  OPTIONAL { ?lang wdt:P625  ?coord . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,zh". }
}
LIMIT 5000
`;

async function main() {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(QUERY)}&format=json`;
  console.log("Querying Wikidata...");
  const res = await fetch(url, {
    headers: {
      "User-Agent": "rivers-of-language-ingest/0.1 (research)",
      Accept: "application/sparql-results+json",
    },
  });
  if (!res.ok) {
    console.error(`HTTP ${res.status}`);
    return;
  }
  const data = await res.json();
  const bindings = data.results.bindings;
  console.log(`Got ${bindings.length} results`);
  const out = bindings.map((b: any) => {
    const m = b.coord?.value?.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
    return {
      wikidata: b.lang.value.split("/").pop(),
      label: b.langLabel?.value,
      glottocode: b.glottocode?.value,
      speakers: b.speakers ? Number(b.speakers.value) : undefined,
      lat: m ? Number(m[2]) : undefined,
      lon: m ? Number(m[1]) : undefined,
    };
  });
  const outPath = path.resolve(__dirname, "../data/wikidata-langs.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`Wrote ${out.length} languages to ${outPath}`);
}

main().catch(console.error);
