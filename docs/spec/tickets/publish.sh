#!/usr/bin/env bash
# 把 11 张票发到 GitHub，按依赖顺序创建，并建立原生的 blocked_by 关系。
# 用法：./publish.sh <spec01 的 issue 编号> <spec02 的 issue 编号>
set -euo pipefail
cd "$(dirname "$0")"

SPEC1="${1:?用法: ./publish.sh <spec01-issue> <spec02-issue>}"
SPEC2="${2:?用法: ./publish.sh <spec01-issue> <spec02-issue>}"
REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"

gh label create ready-for-agent \
  --description "Fully specified, ready for an AFK agent" \
  --color 0E8A16 2>/dev/null || true

# 文件 -> 标题（创建顺序即拓扑序，阻塞者在前）
FILES=(
  01-vue-crepe-skeleton.md
  02-open-file.md
  03-save-and-save-as.md
  04-titlebar-and-frameless-window.md
  05-recent-files.md
  06-typography-and-readme.md
  07-canonicalization.md
  08-version-storage.md
  09-line-diff.md
  10-diff-view.md
  11-restore.md
)
TITLES=(
  "Vue + Crepe 骨架"
  "打开文件"
  "保存与另存为"
  "1c 标题栏与无边框窗口"
  "最近文件"
  "1c 视觉定稿与 README 重写"
  "规范化模块"
  "版本存储与留存策略"
  "行级差异"
  "双页视图"
  "还原"
)
# 每张票的阻塞者，用上面数组的下标（0 起），空串表示无阻塞
BLOCKERS=( "" "0" "1" "2" "3" "3" "0" "6 2" "6" "7 8" "9" )

NUMS=()
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for i in "${!FILES[@]}"; do
  sed -e "s/SPEC1_REF/#${SPEC1}/" -e "s/SPEC2_REF/#${SPEC2}/" \
      "${FILES[$i]}" > "$TMP/body.md"
  url="$(gh issue create \
      --title "${TITLES[$i]}" \
      --body-file "$TMP/body.md" \
      --label ready-for-agent)"
  num="${url##*/}"
  NUMS+=("$num")
  echo "创建 #${num}  ${TITLES[$i]}"
done

echo
echo "建立阻塞关系…"
for i in "${!FILES[@]}"; do
  [ -z "${BLOCKERS[$i]}" ] && continue
  child="${NUMS[$i]}"
  for b in ${BLOCKERS[$i]}; do
    blocker="${NUMS[$b]}"
    id="$(gh api "repos/${REPO}/issues/${blocker}" --jq .id)"
    if gh api --method POST \
         "repos/${REPO}/issues/${child}/dependencies/blocked_by" \
         -F issue_id="$id" >/dev/null 2>&1; then
      echo "  #${child} blocked_by #${blocker}"
    else
      echo "  [跳过] #${child} blocked_by #${blocker} —— 该仓库未启用 issue dependencies；正文里的「Blocked by」仍然有效"
    fi
  done
done

echo
echo "完成。可立即开始的票：#${NUMS[0]}（Vue + Crepe 骨架）"
