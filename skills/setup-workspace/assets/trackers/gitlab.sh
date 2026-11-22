#!/usr/bin/env bash
# gitlab tracker 适配器：publish 的投影路径（聚合口径，spec 20261122-cda7，与 github.sh 同构）。
# 投影受理面（三腿统一聚合口径，METHOD §7.1）：
#   need → 新建聚合单（一个 need 一个 issue，标题 = 产物一级标题，描述 = 指针行 + 全文）；
#   带 need 谱系前缀（need<父ID>-）的 spec/design/adr/research → 对应聚合单下追加评论；
#   带 spec 名义归属前缀（spec<父ID>-）的 review/acceptance/overview → 经定位链
#     （specID → 盘上 spec 文件名 need 前缀 → 账本需求单行）解析后追加评论；
#   票（docs/tickets/）与无 need 谱系的独立知识档 → 不投（票审计留痕 = 源码提交 [#NNNN] 引用）。
# 时间线不可变：投影对象一经创建不再编辑（edit-in-place 废止），同产物重复投影一律追加评论。
# 终态关闭：仅 need 形态触发，GLOSSARY 终态集合统一关闭（GitLab 无 close reason 概念，
# rejected 与其余终态同款关闭，v1.40 既有口径）。
# 契约：调用错误（未知子命令/缺文件/畸形名）exit 1；一切投影/关闭失败（配置缺失/glab 缺失/
# 未认证/API 失败/定位链缺环）明确警告并 exit 0——不阻断技能出口链，盘上产物是真相源。
# 幂等共账：映射文件三字段（盘上相对路径 / 对象标识 / 对象 URL）——need 行第二列 = 自身单号
# （两代语义恒同）；评论形态行第二列 = 承载需求单单号、第三列留空；行已存在不重复记账、
# 不回改旧代际行；评论定位恒走账本需求单行（旧知识档行第二列是旧自身单号，不作定位依据）。
set -u

SDL_DIR="$(cd "$(dirname "$0")" && pwd -P)"    # <repo>/.sdlc/trackers
SDL_ROOT="$(cd "$SDL_DIR/.." && pwd -P)"       # <repo>/.sdlc（config.sh 所在）
REPO_ROOT="$(cd "$SDL_DIR/../.." && pwd -P)"   # <repo>（产物相对路径键的基准）
[ -f "$SDL_ROOT/config.sh" ] && . "$SDL_ROOT/config.sh"
: "${TRACKER_REPO:=}"

MAP="$SDL_DIR/gitlab.map"
DESC_MAX=60000   # 低于 GitLab issue 正文上限，留出指针行余量

cmd="${1:-}"
file="${2:-}"

warn_skip() { echo "gitlab: $*，投影跳过（产物已在盘上，docs/ 是真相源）" >&2; exit 0; }

[ "$cmd" = "publish" ] || { echo "gitlab: 未知子命令 ${cmd:-（空）}（支持 publish <file>）" >&2; exit 1; }
[ -f "$file" ] || { echo "gitlab: 找不到产物文件 ${file:-（空）}" >&2; exit 1; }
# 文件名校验（spec 0017 决策 7）：投影只收产物名——旧四位或新时间戳 ID（可带谱系前缀），
# 畸形名是调用错误 exit 1，不进投影与映射
base="$(basename "$file")"
printf '%s\n' "$base" | grep -qE '^((need|spec|design|adr|research)([0-9]{4}|[0-9]{8}-[0-9a-f]{4})-[0-9]{8}-[0-9a-f]{4}|[0-9]{8}-[0-9a-f]{4}|[0-9]{4})-[a-z0-9]+(-[a-z0-9]+)*\.md$' \
  || { echo "gitlab: 文件名不符合产物命名（NNNN-slug.md 或 [父类型父ID-]YYYYMMDD-4hex-slug.md）：$base" >&2; exit 1; }

rel="${file#"$REPO_ROOT"/}"

# ── 受理面判定（METHOD §7.1，按 docs/ 产物目录定类型，与环境配置无关先判定）──
case "$rel" in
  docs/needs/*) kind="need" ;;
  docs/specs/*|docs/designs/*|docs/adr/*|docs/research/*) kind="knowledge" ;;
  docs/tickets/*) warn_skip "票不入聚合投影，审计留痕 = commit 引用（源码提交 [#NNNN]）" ;;
  docs/reviews/*|docs/acceptance/*|docs/overviews/*) kind="process" ;;
  *) warn_skip "产物不在 docs/ 产物目录，无法判定类型" ;;
esac

# ── 谱系解析（spec 20261122-cda7 实现决策 2）：知识档从自身前缀取 needID；过程档从
#    spec<父ID>- 前缀取 specID，经盘上 spec 文件名上溯 needID；链上任一环缺失即警告跳过 ──
need_id=""
case "$kind" in
  knowledge)
    need_prefix="$(printf '%s\n' "$base" | grep -oE '^need([0-9]{4}|[0-9]{8}-[0-9a-f]{4})-[0-9]{8}-[0-9a-f]{4}-' || true)"
    if [ -n "$need_prefix" ]; then
      need_id="${need_prefix#need}"
      need_id="${need_id%-[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f]-}"
      need_id="${need_id%-}"
    fi
    [ -n "$need_id" ] || warn_skip "无 need 谱系（文件名无 need<父ID>- 前缀，独立知识档不入聚合投影）"
    ;;
  process)
    spec_prefix="$(printf '%s\n' "$base" | grep -oE '^spec([0-9]{4}|[0-9]{8}-[0-9a-f]{4})-[0-9]{8}-[0-9a-f]{4}-' || true)"
    [ -n "$spec_prefix" ] || warn_skip "无 spec 名义归属前缀（评审/验收/总览定位链缺环——旧取号产物不带谱系，重走 /dev-review 取号后才可投影）"
    spec_id="${spec_prefix#spec}"
    spec_id="${spec_id%-[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]-[0-9a-f][0-9a-f][0-9a-f][0-9a-f]-}"
    spec_id="${spec_id%-}"
    spec_base=""
    for cand in "$REPO_ROOT"/docs/specs/*.md; do
      [ -e "$cand" ] || continue
      cb="$(basename "$cand")"
      case "$cb" in
        "$spec_id"-*|need*"-$spec_id"-*) spec_base="$cb"; break ;;
      esac
    done
    [ -n "$spec_base" ] || warn_skip "定位链缺环：docs/specs/ 找不到 spec ${spec_id} 产物文件（spec 是知识档永不清扫，缺失即未落盘）"
    need_id="$(printf '%s\n' "$spec_base" | grep -oE '^need([0-9]{4}|[0-9]{8}-[0-9a-f]{4})-' || true)"
    [ -n "$need_id" ] || warn_skip "定位链缺环：spec 文件名无 need 前缀（legacy 产物链不解析）：${spec_base}"
    need_id="${need_id#need}"
    need_id="${need_id%-}"
    ;;
esac

# 评论形态的聚合单定位（纯本地账本读取，先于环境检查——缺行即零调用退出）
issue_num=""
if [ "$kind" != "need" ]; then
  issue_num="$(awk -F'\t' -v id="$need_id" '
    $1 ~ /^docs\/needs\// {
      key = substr($1, length("docs/needs/") + 1)
      if (index(key, id "-") == 1) { print $2; exit }
    }' "$MAP" 2>/dev/null)"
  [ -n "$issue_num" ] || warn_skip "映射账本无其需求单行（need ${need_id}），先投影对应 need 再发布本产物"
fi

[ -n "$TRACKER_REPO" ] || warn_skip "TRACKER_REPO 未配置（config.sh，格式 group/project）"
command -v glab >/dev/null 2>&1 || warn_skip "glab 未安装（见 gitlab.com/cli 或 brew install glab）"
glab auth status >/dev/null 2>&1 || warn_skip "glab 未认证（glab auth status 失败，先 glab auth login）"

title="$(grep -m1 '^# ' "$file" | sed 's/^#[[:space:]]*//')"
[ -n "$title" ] || title="$(basename "$file")"

body_file="$(mktemp)"
trap 'rm -f "$body_file"' EXIT
{
  printf '> 盘上产物：%s（盘上是真相源，本条为单向投影，请勿在此定稿）\n\n' "$rel"
  if [ "$(wc -c < "$file")" -gt "$DESC_MAX" ]; then
    head -c "$DESC_MAX" "$file"
    printf '\n\n> 内容超限已截断，全文见盘上文件。'
  else
    cat "$file"
  fi
} > "$body_file"
desc="$(cat "$body_file")"

existing="$(awk -F'\t' -v k="$rel" '$1 == k { print $2 "\t" $3; exit }' "$MAP" 2>/dev/null)"

if [ "$kind" = "need" ]; then
  if [ -n "$existing" ]; then
    num="${existing%%$'\t'*}"
    glab issue comment "$num" -R "$TRACKER_REPO" --message "$desc" >/dev/null 2>&1 \
      || warn_skip "聚合单 #${num} 评论失败（glab issue comment 非零）"
    echo "gitlab: 已投影（追加评论）${rel} → 聚合单 #${num}"
  else
    out="$(glab issue create -R "$TRACKER_REPO" --title "$title" --description "$desc" 2>/dev/null)" \
      || warn_skip "issue 创建失败（glab issue create 非零）"
    url="$(printf '%s\n' "$out" | grep -oE 'https?://[^[:space:]]*/issues/[0-9]+' | tail -n 1)"
    num="$(printf '%s\n' "${out:-}" | grep -oE '(issues/|#)[0-9]+' | grep -oE '[0-9]+' | tail -n 1)"
    [ -n "$num" ] || warn_skip "无法从 glab 输出解析 issue 编号：${out:-（空输出）}（单可能已创建但未记账，重发会重复创建——请先人工核对 ${TRACKER_REPO}）"
    printf '%s\t%s\t%s\n' "$rel" "$num" "${url:-}" >> "$MAP"
    echo "gitlab: 已投影 ${rel} → 聚合单 #${num}${url:+（${url}）}"
  fi
else
  # 评论形态：定位已在环境检查前完成（恒走账本需求单行——需求单行两代语义第二列恒为
  # 自身单号，无代际歧义；本产物行仅记账——旧代际行第二列是旧自身单号，不作定位依据，也不回改）
  glab issue comment "$issue_num" -R "$TRACKER_REPO" --message "$desc" >/dev/null 2>&1 \
    || warn_skip "聚合单 #${issue_num} 评论失败（glab issue comment 非零）"
  [ -n "$existing" ] || printf '%s\t%s\t\n' "$rel" "$issue_num" >> "$MAP"
  echo "gitlab: 已投影 ${rel} → 聚合单 #${issue_num} 下评论"
  exit 0
fi

# 终态投影关闭（仅 need 形态到达此处；评论形态已提前退出——spec 20261122-cda7 实现决策 5）。
# 聚合单代表整次需求开发，随 need 自身终态关闭；中间态不流转，其他产物终态不触发。
# 终态集合对齐 GLOSSARY 状态机；GitLab 无 close reason 概念，rejected 与其余终态同款关闭（v1.40）。
# 只读 frontmatter 不做状态推断；research 无 status 行不命中。关闭失败警告留痕不阻断（exit 0），
# 已关再关的非零同款留痕（幂等无害）。关闭是生命周期终点表达，不是清扫回删。
status="$(grep -m1 '^status:' "$file" | awk '{print $2}')"
case "$status" in
  done|fulfilled|passed|accepted|superseded|approved|reviewed|reconstructed|rejected)
    if glab issue close "$num" -R "$TRACKER_REPO" >/dev/null 2>&1; then
      echo "gitlab: 聚合单 #${num} 随 need 终态 ${status} 同步关闭"
    else
      echo "gitlab: 聚合单 #${num} 终态关闭失败（glab issue close 非零，可能已关闭）——投影已完成，关闭留待下次" >&2
    fi ;;
esac
