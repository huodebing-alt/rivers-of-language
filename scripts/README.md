# 数据 Ingestion 脚本

仓库内已经包含人工策展的 200 节点 seed 数据（`data/languages.*.json`、`words.json`、`contacts.json`、`scripts.json`），开箱即用。

本目录下的脚本用于**扩展和验证**：从 Glottolog / Wikidata / Wikipedia 拉取更多元数据（glottocode、坐标、使用人数），并合并到现有 seed 中。

## 运行

```bash
# 拉 Glottolog 树
npm run ingest:glottolog

# 拉 Wikidata SPARQL（使用人数、坐标）
npm run ingest:wikidata

# 拉 Wiktionary etymology（可选 — 命中率低）
npm run ingest:wiktionary

# 把所有结果合并到 data/languages.merged.json
npm run ingest:merge

# 一键全跑
npm run ingest:all
```

## 沙盒限制

如果在 Claude 沙盒里跑这些脚本可能因为网络/速率限制失败（Glottolog 偶尔 403、Wikidata SPARQL 限制 60s/query）。建议：

1. 把项目下载到本地
2. `npm install`
3. `npm run ingest:all`
4. 把生成的 `data/languages.merged.json` 复制覆盖 seed 的合并入口（详见 `lib/data.ts`）

## 数据源

- **Glottolog 5.x** — https://glottolog.org/  (JSON dump https://glottolog.org/meta/downloads)
- **Wikidata SPARQL** — https://query.wikidata.org/
- **Wiktionary REST** — https://en.wiktionary.org/api/rest_v1/
- **Wikipedia REST** — https://en.wikipedia.org/api/rest_v1/

## 当前节点

总数约 ~200，按语系分布见 `../Phase2-技术与数据.md`。
