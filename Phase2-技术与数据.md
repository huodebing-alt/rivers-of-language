# Phase 2：技术方案 + 数据源

> 范围确认（Phase 1 决策）：
> - 时间：~6000 BCE → 2026（8000 年）
> - 语系：**七大语系**（印欧 + 汉藏 + 闪含 + 尼日刚果 + 南岛 + 达罗毗荼 + 突厥）
> - 例子：发音演变链（默认）+ 文字演变（切换图层）
> - 节点：~200
> - 中文支线深做（上古 → 中古 → 近代 → 普 / 粤 / 吴 / 闽 / 客 + 日韩越借用虚线）
> - 视觉：奶白 + 暗红 + 哑金 + 衬线（沿用普拉多/卢浮宫）

---

## 1. 技术栈

| 层 | 技术 | 版本 / 备注 |
|---|---|---|
| 框架 | **Next.js** | 14（App Router，纯静态导出可 Vercel） |
| 语言 | **TypeScript** | 5.x，strict |
| 样式 | **Tailwind CSS** | 3.x + 自定义衬线字体栈 |
| 字体 | Cormorant Garamond / Inter / Noto Serif SC | Google Fonts |
| 可视化 | **D3.js v7** | `d3-scale` / `d3-shape` / `d3-selection` / `d3-zoom` |
| 地理 | `d3-geo` + 自带世界 GeoJSON（简化版） | 缩略地图 |
| 状态 | React `useState` + URL search params | 模式切换 / 选中语言持久化到 URL |
| 部署 | Vercel | 静态导出，零后端 |

**为什么 D3 而不是 Recharts/Visx**：streamgraph 的分叉/汇聚需要**自定义 SVG path**（用 cubic Bezier 拼接），现成 chart 库做不了。D3 提供 `d3.stack` + `d3.area` 的底层 primitive，可以自由扩展。

---

## 2. 数据 Schema

### 2.1 语言节点 `Language`

```ts
interface LanguageNode {
  id: string;                    // "lat" / "fra" / "zh_archaic" / "skt"
  glottocode?: string;           // Glottolog ID, e.g. "stan1295"
  name: { zh: string; en: string; native?: string };
  family: FamilyId;              // "ie" | "st" | "afro" | "ng" | "an" | "dr" | "turk"
  branch?: string;               // "germanic" / "romance" / "sinitic" / ...
  parent?: string;               // parent LanguageNode.id
  born: number;                  // 节点诞生年（负数 = BCE）
  died?: number;                 // 若分化/消亡（如拉丁→罗曼诸语后）
  geo: {
    lat: number;                 // 中心点纬度
    lon: number;                 // 中心点经度
    bbox?: [number, number, number, number]; // [W,S,E,N]
  };
  speakers: SpeakerPoint[];      // 时序：每个时间点的使用人数
  status?: "extinct" | "historical" | "living";
  notes?: { zh?: string; en?: string };
}

interface SpeakerPoint {
  year: number;                  // 负数 = BCE
  count: number;                 // 估算使用人口
  geoShift?: { lat: number; lon: number }; // 该年地理重心
}
```

### 2.2 演变边 `EvolutionEdge`（父子分叉）

```ts
interface EvolutionEdge {
  id: string;
  from: string;                  // parent LanguageNode.id
  to: string;                    // child LanguageNode.id
  year: number;                  // 分化大约年代
  kind: "split" | "continuity";  // 分叉 / 直接延续
  certainty: 0 | 1 | 2;          // 0 = 推测, 1 = 学界主流, 2 = 文献铁证
  example?: WordEvolution;       // 该次分叉的代表词例
}
```

### 2.3 借用边 `ContactEdge`（虚线，跨语系/语支借用）

```ts
interface ContactEdge {
  id: string;
  source: string;                // 借出方
  target: string;                // 借入方
  year: number;                  // 大约年代
  kind: "loan" | "substrate" | "areal" | "script";
  strength: 0 | 1 | 2;           // 影响强度
  example?: string;              // 一两个借词示例
  notes?: { zh?: string; en?: string };
}
```

### 2.4 词演变链 `WordEvolution`

```ts
interface WordEvolution {
  gloss: { zh: string; en: string };     // 词义，如「父亲 / father」
  proto: { lang: string; form: string }; // 拟构形，如 PIE *ph₂tḗr
  chain: Array<{
    lang: string;                        // LanguageNode.id
    form: string;                        // 实际拼写/拟音
    ipa?: string;                        // IPA
    year?: number;                       // 该形式大致年代
    note?: string;
  }>;
}
```

### 2.5 文字演变图层 `ScriptNode` / `ScriptEdge`

```ts
interface ScriptNode {
  id: string;                    // "cuneiform" / "phoenician" / "greek" / "latin" / "oracle" / "kaishu"
  name: { zh: string; en: string };
  born: number;
  region: { lat: number; lon: number };
  sample?: string;               // 一个字符样本（unicode 或图像 url）
  parentScript?: string;
}
```

---

## 3. 数据源

| 来源 | 用途 | 访问 | 命中率 |
|---|---|---|---|
| **Glottolog 5.x** | 语系树结构 + Glottocode + 地理坐标 | https://glottolog.org/ + JSON dump | 高（最权威） |
| **Wikidata** | 语言项属性（P646 Glottolog ID、P2581 BabelNet、P5402 speakers）+ SPARQL | https://query.wikidata.org/ | 高（结构化） |
| **Wikipedia 语系页 / 语言页** | 起源时代、地理范围、使用人数、历史叙述 | https://en.wikipedia.org/ + REST API | 中（半结构化） |
| **Ethnologue** | 现代使用人数 | 收费，**用 Wikipedia / Wikidata 替代** | — |
| **Wiktionary Etymology** | 词演变链（PIE 拟构 → 各分支） | https://en.wiktionary.org/ + Wikitext 解析 | 中（命中率参差，PIE 词命中率高，小语种低） |
| **WALS Online** | 学术参考（语法特征） | https://wals.info/ | 备用 |
| **Index Diachronica** | 音变规则参考（人工拟构） | https://chridd.nfshost.com/diachronica/ | 备用，校验用 |

### 数据策略

考虑到 Wiktionary 命中率不稳定，**采取双轨**：

1. **自动抓取**：脚本跑 Glottolog + Wikidata SPARQL，覆盖语系树骨架（约 130 节点的元数据：名字、glottocode、坐标、估计使用人数）。
2. **人工策展**：剩余 ~70 节点（古语 / 拟构语 / 中古语 / 方言）+ 所有词演变链 + 所有借用边 → **手工写在 seed JSON**，由我（Claude）根据语言学常识补全。
3. **Wiktionary 备用**：如果时间允许，再跑 Wiktionary 抓 PIE / 拉丁 / 古英语 / 古汉语 5–10 个高命中词的 etymology 树作为加分项。

> **沙盒访问限制预案**：如果沙盒在 Glottolog / Wikidata API 上限速或 403，输出脚本让用户在本机跑（`npm run ingest`）。所有抓取脚本都设计为「输出 JSON → 提交到 `data/` 目录 → 前端静态加载」，前端不直接调外网。

---

## 4. 200 节点初步分配

| 语系 | 节点数 | 备注 |
|---|---|---|
| 印欧 Indo-European | **80** | PIE → 12 分支 → 各分支 5–8 节点（罗曼语单独细做）|
| 汉藏 Sino-Tibetan | **40** | 上古/中古/近代汉语 + 普粤吴闽客 5 方言 + 藏缅支 + 借用伪节点 |
| 闪含 Afro-Asiatic | **25** | 闪米特（阿卡德/希伯来/阿拉米/阿拉伯）+ 古埃及 → 科普特 + 柏柏尔 + 库希特 + 乍得 |
| 南岛 Austronesian | **20** | Proto-Austronesian → 马来-波利尼西亚 → 印尼/马来 / 他加禄 / 夏威夷 / 毛利 / 马达加斯加 |
| 尼日-刚果 Niger-Congo | **15** | Proto-NC → 班图 → 斯瓦希里 / 祖鲁 / 约鲁巴 / 伊博 / 沃洛夫 |
| 达罗毗荼 Dravidian | **10** | Proto-Dravidian → 泰米尔（古/中/现代）/ 泰卢固 / 卡纳达 / 马拉雅拉姆 |
| 突厥 Turkic | **10** | Proto-Turkic → 古突厥 → 葛逻禄/钦察/乌古斯 → 土耳其/维吾尔/哈萨克/乌兹别克/亚塞拜然 |

**总：200**（含 ~30 个拟构语 / 古语「ghost 节点」，~170 个有文献记载的）。

### 4.1 印欧 80 节点拆解（举例）

```
PIE (Proto-Indo-European)
├─ Anatolian: Hittite, Luwian (2)
├─ Tocharian: Tocharian A, B (2)
├─ Indo-Iranian (15):
│   ├─ Indo-Aryan: Vedic Sanskrit, Classical Sanskrit, Prakrits, Pali, Hindi, Urdu, Bengali, Punjabi, Marathi (9)
│   └─ Iranian: Avestan, Old Persian, Middle Persian, Modern Persian, Pashto, Kurdish (6)
├─ Greek (4): Mycenaean, Classical Greek, Koine, Modern Greek
├─ Italic (15):
│   └─ Romance: Latin (Classical/Vulgar), Old French, Modern French, Old Italian, Modern Italian, Old Spanish, Modern Spanish, Portuguese, Romanian, Catalan, Sardinian, Occitan
├─ Celtic (6): Gaulish, Old Irish, Modern Irish, Scottish Gaelic, Welsh, Breton
├─ Germanic (15):
│   ├─ North: Old Norse, Icelandic, Norwegian, Swedish, Danish
│   ├─ West: Old English, Middle English, Modern English, Old High German, Middle HG, Modern German, Dutch, Frisian
│   └─ East: Gothic
├─ Balto-Slavic (10):
│   ├─ Baltic: Old Prussian, Lithuanian, Latvian
│   └─ Slavic: OCS, Old Russian, Russian, Polish, Czech, Serbo-Croatian, Bulgarian
├─ Albanian (1)
└─ Armenian (1 — Classical + Modern)
```

### 4.2 汉藏 40 节点拆解

```
Proto-Sino-Tibetan
├─ Sinitic (汉语支) (15):
│   ├─ 上古汉语 Old Chinese (~1200 BCE – 200 CE)
│   ├─ 中古汉语 Middle Chinese (200 – 1200)
│   ├─ 近代汉语 Early Mandarin (1200 – 1900)
│   ├─ 现代普通话 / 粤 / 吴 / 闽南 / 闽东 / 客家 / 赣 / 湘 / 晋 (9 现代)
│   └─ 文白异读 ghost 节点
├─ Tibeto-Burman (15):
│   ├─ 古藏语 / 现代藏语 / 缅甸语 (古/现代) / 嘉绒 / 羌 / 彝 / 纳西 / 景颇 / 克伦
├─ Karen / Bai / 其他 (5)
├─ 借用 ghost 节点（日韩越，跨语系）(5):
│   日语 (Old/Modern), 朝鲜语, 越南语 — 标为「外系，深受汉语接触」
```

### 4.3 闪含 25 节点

```
Proto-Afro-Asiatic
├─ Semitic 闪米特 (12):
│   ├─ East: Akkadian (Old/Middle/Neo) (3)
│   ├─ Northwest: Ugaritic, Phoenician, Biblical Hebrew, Modern Hebrew, Aramaic (古/Syriac/现代) (6)
│   └─ Central/South: Classical Arabic, Modern Standard Arabic, Modern Arabic dialects (3)
├─ Egyptian 古埃及 → Coptic (2)
├─ Berber 柏柏尔 (Proto / Tamazight / Tuareg) (3)
├─ Cushitic 库希特 (Somali, Oromo, Beja) (3)
├─ Chadic 乍得 (Proto, Hausa) (2)
├─ Omotic (Proto) (1)
├─ 借用 ghost (Akkadian ↔ Sumerian) (1 ghost)
└─ 残留 1
```

### 4.4 其余四语系（南岛/尼日-刚果/达罗毗荼/突厥）见 `data/seed.json`，模式相同。

---

## 5. 视觉草图（文字版）

```
桌面 1440×900 布局：

┌──────────────────────────────────────────────────────────────────┐
│   语言之河  Rivers of Language    ［语言模式 ▾］［文字模式］   │ ← 顶 header
├──────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────┐  ┌────────────┐  │
│  │                                            │  │ 选中详情卡 │  │
│  │       ～～ ╲                               │  │            │  │
│  │      ／    ╲╲～～～Latin                   │  │ 拉丁语     │  │
│  │     ／      ╲╲      ╲～～～French          │  │ Latin      │  │
│  │  PIE        ╲╲╲      ╲～～～Spanish       │  │            │  │
│  │     ╲      ╱╱╱        ╲～～Portuguese     │  │ ~700 BCE   │  │
│  │      ╲～～╱╱  Germanic→English             │  │ Italy      │  │
│  │           ╲～～～～～～～～～German         │  │            │  │
│  │   汉语→中古→普通话 ━━━━━━━━━━━━━━           │  │ 词例：     │  │
│  │   汉语→中古→粤语   ━━━━━━━━━━━━━           │  │ *ph₂tḗr → │  │
│  │   ┄┄┄ 汉语 → 日/韩/越（虚线借用）         │  │   pater → │  │
│  │                                            │  │   père    │  │
│  └────────────────────────────────────────────┘  │   father  │  │
│  -6000  -4000  -2000   0   500  1000  1500  2026 │            │  │
│         ←—— 时间轴 ——→                          └────────────┘  │
│                                          ┌─────────────────┐    │
│                                          │ 缩略地图        │    │
│                                          │ ▢ 高亮: 意大利  │    │
│                                          └─────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

- **主图区**：水平 streamgraph
  - X = 时间（log-ish scale，远古拉宽、近现代压缩 — 因为近现代节点密集）
  - Y = **地理纬度 + 经度的组合排序**（按"欧亚非"经度从西到东排列，使印欧在上、闪含中、汉藏下、南岛最下、尼日刚果中下、达罗毗荼下、突厥中上 — 大致符合地理分布）
  - 每条流的**宽度 = 估计使用人数**（log scale，否则现代英语会吞掉一切）
  - 流颜色按语系：印欧蓝、汉藏暗红、闪含金绿、南岛青、尼日刚果橙、达罗毗荼紫、突厥紫红
- **分叉**：父流末端用 Bezier 曲线分成 N 条子流，确保 `Σ child_width = parent_width`
- **借用**：虚线 / 半透明窄带跨越流之间
- **hover**：悬停某条流的某个时间点 → 右侧详情卡 + 缩略地图高亮 + 词演变链高亮
- **时间轴**：底部 ticks，重大事件标记（如「-3000 楔形文字」「-200 拉丁化」「1500 印刷术」）
- **缩略地图**：右下角，欧亚非世界地图（D3 orthographic 投影），高亮选中语言地理范围

### 移动端（< 768px）

```
┌────────────────┐
│ 语言之河      │ ← 顶 header（语言/文字切换）
├────────────────┤
│ 时间滑块      │ ← 顶部固定时间游标
│ -6000────2026 │
├────────────────┤
│               │
│   纵向滚动   │
│   streamgraph │ ← 旋转 90°：时间从上到下
│   每个语系   │
│   一个 section│
│               │
│   印欧 ▼    │
│   ……         │
│   汉藏 ▼    │
│   ……         │
├────────────────┤
│ 详情 sheet    │ ← 底部可拉起
│ ▲ Latin       │
└────────────────┘
```

---

## 6. 文件结构

```
lang-evolution/
├─ app/                          # Next.js App Router
│   ├─ layout.tsx
│   ├─ page.tsx                  # 主页
│   ├─ globals.css
│   └─ components/
│       ├─ Streamgraph.tsx       # D3 主图
│       ├─ TimeAxis.tsx
│       ├─ MiniMap.tsx           # 缩略地图
│       ├─ DetailCard.tsx        # 右侧详情
│       ├─ ModeToggle.tsx        # 语言/文字切换
│       ├─ ScriptLayer.tsx       # 文字演变图层
│       └─ MobileSheet.tsx
├─ data/
│   ├─ languages.json            # 200 LanguageNode
│   ├─ edges.json                # EvolutionEdge
│   ├─ contacts.json             # ContactEdge（借用）
│   ├─ words.json                # WordEvolution（词演变链）
│   ├─ scripts.json              # ScriptNode + ScriptEdge
│   └─ world-simplified.json     # GeoJSON（缩略地图）
├─ lib/
│   ├─ types.ts                  # 上面所有 interface
│   ├─ layout.ts                 # streamgraph 布局算法
│   └─ utils.ts
├─ scripts/                      # ingestion（用户可本机跑）
│   ├─ fetch-glottolog.ts
│   ├─ fetch-wikidata.ts
│   ├─ fetch-wiktionary.ts
│   ├─ merge.ts
│   └─ README.md
├─ public/
├─ tailwind.config.ts
├─ next.config.js
├─ package.json
└─ README.md
```

---

## 7. 实施顺序（Phase 3 → 4）

1. **Phase 3a**：Next.js 骨架 + Tailwind 视觉变量 + 字体
2. **Phase 3b**：seed `data/*.json`（人工策展 200 节点 + 词例）
3. **Phase 3c**：ingestion 脚本（Glottolog + Wikidata，可选 Wiktionary）+ 文档
4. **Phase 4a**：Streamgraph 主图（无交互）
5. **Phase 4b**：hover + 详情卡 + 缩略地图 + 词演变链卡片
6. **Phase 4c**：语言/文字模式切换 + 借用层
7. **Phase 4d**：移动端响应式
8. **Phase 4e**：本地构建 + Vercel 部署说明 + 打包

---

## 8. 风险 & 取舍

| 风险 | 取舍 |
|---|---|
| 200 节点全靠手工填，词例可能有错 | 标注 `certainty` 字段，UI 上对推测节点用半透明/虚线表示 |
| streamgraph 在 200 流时性能 | 用 `<canvas>` fallback？先 SVG，瓶颈再换 |
| 时间跨度大（8000 年）+ 节点密度不均 | X 轴用分段线性（古代 1 段，每段不同密度） |
| 文字 / 语言两模式都精做 → 时间紧 | 文字模式先做骨架（10 个主要文字 + 演变箭头），细节后续补 |
| Wikidata SPARQL 速率限制 | 脚本加重试 + 缓存，限制单次 ≤ 50 query |

---

**下一步**：进 Phase 3a，scaffold Next.js 项目。
