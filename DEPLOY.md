# 部署到 GitHub + Vercel

## 一键推（推荐）

```bash
chmod +x push.sh
./push.sh
```

`push.sh` 会自动：
1. 检查 `gh` 当前账号（期望 `huodebing-alt`）
2. `git init` + commit
3. `gh repo create huodebing-alt/rivers-of-language --public`
4. 加 20 个 topics (`language`, `linguistics`, `language-family`, `etymology`, ...)
5. `vercel --prod` 部署

## 手动跑

### GitHub

```bash
cd rivers-of-language
git init -b main
git add .
git commit -m "Initial commit"

gh repo create huodebing-alt/rivers-of-language \
  --public \
  --description "Interactive visualization of how the world's 7 major language families evolved over 8000 years." \
  --homepage "https://rivers-of-language.vercel.app" \
  --source=. \
  --remote=origin \
  --push

gh repo edit huodebing-alt/rivers-of-language --add-topic \
  language,linguistics,language-family,language-tree,language-evolution,etymology,historical-linguistics,proto-indo-european,sino-tibetan,phylogenetic,d3,d3js,visualization,data-visualization,nextjs,typescript,education,linguistic-typology,glottolog,interactive
```

### Vercel

```bash
npm install
npx vercel --prod
```

首次会问几个问题：
- Set up and deploy? → **y**
- Which scope? → 选自己的账号
- Link to existing project? → **N**
- Project name? → **rivers-of-language**
- Directory? → **./**
- Override settings? → **N**

部署完会拿到 URL（默认 `https://rivers-of-language.vercel.app`，如果被占用会加 hash 后缀）。

### 自定义域名（可选）

如果你有 `riversoflanguage.com` / `lang-rivers.dev` 等域名：

1. Vercel Dashboard → Project → Settings → Domains → Add
2. 按 Vercel 指示把 DNS 指过去

## 改名（30 秒）

如果不喜欢 `rivers-of-language` 想改成别的：

```bash
NEW_NAME="<新名字>"  # 比如 "language-rivers"

# 1. GitHub repo rename
gh repo rename "$NEW_NAME"

# 2. 本地 remote
git remote set-url origin "https://github.com/huodebing-alt/$NEW_NAME.git"

# 3. 替换文件中的旧名
sed -i '' "s/rivers-of-language/$NEW_NAME/g" README.md package.json DEPLOY.md push.sh app/layout.tsx public/sitemap.xml public/robots.txt

# 4. commit + push
git add . && git commit -m "Rename project to $NEW_NAME" && git push

# 5. Vercel rename
vercel project rename rivers-of-language "$NEW_NAME"
```

## 提升 SEO 收录速度

部署完成后，可选做：

1. **Google Search Console**：
   - 添加 `https://rivers-of-language.vercel.app` 为属性
   - 验证（用 HTML meta 或 DNS）
   - 提交 sitemap: `https://rivers-of-language.vercel.app/sitemap.xml`

2. **Bing Webmaster Tools**：同上，地址 https://www.bing.com/webmasters

3. **社交分享**（让 OpenGraph + Twitter card 生效）：
   - 在 Twitter / Mastodon / LinkedIn 发一帖含 URL，会被 crawler 抓取
   - Reddit r/linguistics, r/etymology, r/dataisbeautiful

4. **Awesome lists / Hacker News**：
   - 提 PR 到 `awesome-d3`, `awesome-linguistics`, `awesome-data-visualization`
   - HN Show submit
