#!/usr/bin/env bash
# Rivers of Language — 一键推 GitHub + 部署 Vercel
# 使用：在 mac 终端进入项目目录后跑 ./push.sh
#
# 前置条件：
#   1. gh CLI 已登录到 huodebing-alt 账号（gh auth status 应该显示 huodebing-alt）
#   2. vercel CLI 已安装（npm i -g vercel）或用 npx vercel
#
# 如果 gh 不是 huodebing-alt 账号：gh auth login

set -euo pipefail

REPO_NAME="rivers-of-language"
GH_USER="huodebing-alt"
DESCRIPTION="Interactive visualization of how the world's 7 major language families evolved over 8000 years — Indo-European, Sino-Tibetan, Afro-Asiatic, Niger-Congo, Austronesian, Dravidian, Turkic. 交互式世界语言演变图：印欧、汉藏、闪含七大语系 8000 年。"

TOPICS=(
  "language"
  "linguistics"
  "language-family"
  "language-tree"
  "language-evolution"
  "etymology"
  "historical-linguistics"
  "proto-indo-european"
  "sino-tibetan"
  "phylogenetic"
  "d3"
  "d3js"
  "visualization"
  "data-visualization"
  "nextjs"
  "typescript"
  "education"
  "linguistic-typology"
  "glottolog"
  "interactive"
)

echo "── 步骤 1：检查依赖 ─────────────────────────────────"
command -v gh >/dev/null 2>&1 || { echo "❌ gh CLI 未安装。brew install gh"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ git 未安装。"; exit 1; }

ACTIVE_GH_USER=$(gh api user --jq .login 2>/dev/null || echo "")
if [ "$ACTIVE_GH_USER" != "$GH_USER" ]; then
  echo "⚠️  当前 gh 登录账号是 '$ACTIVE_GH_USER'，期望 '$GH_USER'"
  echo "    跑 'gh auth login' 切换到 $GH_USER 后再来。"
  read -p "    要继续吗？(用 $ACTIVE_GH_USER 推) [y/N]: " yn
  [[ "$yn" =~ ^[Yy]$ ]] || exit 1
  GH_USER="$ACTIVE_GH_USER"
fi

echo "── 步骤 2：初始化 git 仓库 ──────────────────────────"
if [ ! -d .git ]; then
  git init -b main
  git add .
  git commit -m "Initial commit: Rivers of Language — 200-language, 8000-year interactive visualization"
else
  echo "  .git 已存在，跳过 init"
fi

echo "── 步骤 3：在 GitHub 创建 public 仓库 ────────────────"
if gh repo view "$GH_USER/$REPO_NAME" >/dev/null 2>&1; then
  echo "  $GH_USER/$REPO_NAME 已存在，跳过 create"
  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$GH_USER/$REPO_NAME.git"
  git push -u origin main
else
  gh repo create "$GH_USER/$REPO_NAME" \
    --public \
    --description "$DESCRIPTION" \
    --homepage "https://rivers-of-language.vercel.app" \
    --source=. \
    --remote=origin \
    --push
fi

echo "── 步骤 4：添加 topics ──────────────────────────────"
gh repo edit "$GH_USER/$REPO_NAME" --add-topic "$(IFS=,; echo "${TOPICS[*]}")"

echo "── 步骤 5：部署 Vercel ──────────────────────────────"
if command -v vercel >/dev/null 2>&1; then
  VC="vercel"
else
  VC="npx vercel"
fi

# 检查 node_modules，否则先 install
if [ ! -d node_modules ]; then
  echo "  跑 npm install …"
  npm install
fi

# 首次部署：需要 login + 关联项目
echo "  Vercel 首次部署会询问几个问题："
echo "    - Set up and deploy? → y"
echo "    - Which scope? → 选你自己的"
echo "    - Link to existing project? → N"
echo "    - Project name? → rivers-of-language"
echo "    - Directory? → ./"
echo "    - Override settings? → N"
$VC --prod

echo ""
echo "──────────────────────────────────────────────────────"
echo "✅ 全部完成！"
echo "   GitHub:  https://github.com/$GH_USER/$REPO_NAME"
echo "   Vercel:  https://rivers-of-language.vercel.app"
echo "             （第一次部署 URL 可能是 https://rivers-of-language-<hash>.vercel.app）"
echo "──────────────────────────────────────────────────────"
echo ""
echo "如果要改项目名："
echo "   gh repo rename <new-name>"
echo "   git remote set-url origin https://github.com/$GH_USER/<new-name>.git"
echo "   sed -i '' 's/rivers-of-language/<new-name>/g' README.md package.json"
echo "   git add . && git commit -m 'Rename to <new-name>' && git push"
