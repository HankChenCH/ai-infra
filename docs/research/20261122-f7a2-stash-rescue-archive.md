---
id: 20261122-f7a2
created: 2026-11-22
---
# stash 遗留留档：dev-execute 0015 运行前暂存（2026-11-03）的运行后折回抢救归档

## 来龙去脉

2026-11-03 23:12 dev-execute 运行 0015 开工确认时拍板 stash 7 个未提交改动（stash 提交信息原话「运行后人工恢复」），运行完成后恢复步骤未执行，暂存悬置 19 天。2026-11-22 全局遗留清扫中甄别定性，用户拍板「留档后丢弃」：全文存档于本文件后 drop `stash@{0}`，其中仍有效的折回（甄别结论 #3、#4）的实施另行开票，不在本次清理范围。

## 甄别结论（逐块）

| # | stash 内容 | 定性 | 依据 |
|---|---|---|---|
| 1 | dev-fix / dev-plan / GLOSSARY 三处「票编号 = max(目录内最大号, git 全史 `[#NNNN]` 最大号) + 1」 | 已被架构性取代，不恢复 | 编号撞号问题已由时间戳 ID 方案根治（ADR 20261105-945d），现行票 id 为 `20261121-6089` 形态；旧修法恢复即倒退回顺序编号体系 |
| 2 | dev-review「评审人即实现人（同一会话出票又评票）时，必须另派独立只读子代理盲审」 | 语义内核已被承载，残余价值低 | spec 0016（评审轴清单制，done 2026-11-04）落地「每轴恰一个独立子代理（强制）、禁评审执行体亲做任一轴」，独立上下文防作者盲区已制度化；盲审条款的具体措辞未入正源 |
| 3 | check.sh `cmd_pre_push` 主干直推兜底（merge-base 退化为空集时改对 `origin/<BASE_REF>..HEAD` 做同款校验） | **真实缺口，待开票** | bug 实测仍在：`.sdlc/check.sh:553-560`，trunk 直推（HEAD == BASE_REF）时 `mb..HEAD` 恒空集、implemented↔approved 评审覆盖核验空转放行（stash 注释引 retro 0004 实证）；当前 check.sh 无兜底 |
| 4 | run-mechanics 三条运行纪律：恢复前核对子代理模型锚定（AmendWorkflow 带 subagent_model 重锚）/ 门禁命令执行细则（cwd 锚定仓库根 + pipestatus 真实退出码）/ check-all 系门红先甄别再处置（环境偶发判据 + 授权复跑一次） | **真实缺口，待开票** | 三条均为 spec 0016 运行两次假绿实证的操作纪律；run-mechanics 后续演进线（20261108-a202、20261109-5ff0、20261110-a013，主题均为收口链）未覆盖，当前文件零命中 |
| 5 | github.map +6 行（票 0032–0037 → issues 103–108） | 已冗余 | 6 行记账已全部在当前 map 中，随 run 0015 正式提交落库 |

## 抢救指引

开票落地 #3、#4 时从下方原文取材，按当前代码形态重写——stash 补丁基于 2026-11-03 的旧版本（assets/check.sh blob e860857、run-mechanics blob 3cb16b），不可直接 apply：

- #3 落点 `.sdlc/check.sh` `cmd_pre_push`，双态资产同步 `skills/setup-workspace/assets/check.sh`（verify-pack 对账不过即拒绝发布）。
- #4 落点 `skills/dev-execute/references/run-mechanics.md`，注意与现行 §5（恢复）/§6（预演）结构对位。
- 治理规则：先改 docs/sdlc-skills-blueprint.md 对应规格再动技能。

## 原文存档（stash@{0} 全文 diff，stash^ → stash）

```diff
diff --git a/.sdlc/trackers/github.map b/.sdlc/trackers/github.map
index 62d53ae..3bbdebe 100644
--- a/.sdlc/trackers/github.map
+++ b/.sdlc/trackers/github.map
@@ -87,3 +87,9 @@ docs/tickets/0031-overview-dogfood-spec-0014.md	98	https://github.com/HankChenCH
 docs/acceptance/0001-dev-overview-walkthrough.md	100	https://github.com/HankChenCH/skills/issues/100
 docs/needs/0013-design-skill-suite.md	101	https://github.com/HankChenCH/skills/issues/101
 docs/specs/0015-design-skill-suite.md	102	https://github.com/HankChenCH/skills/issues/102
+docs/tickets/0032-design-suite-governance-docs.md	103	https://github.com/HankChenCH/skills/issues/103
+docs/tickets/0033-design-brief-skill.md	104	https://github.com/HankChenCH/skills/issues/104
+docs/tickets/0034-design-baseline-skill.md	105	https://github.com/HankChenCH/skills/issues/105
+docs/tickets/0035-design-ui-skill.md	106	https://github.com/HankChenCH/skills/issues/106
+docs/tickets/0036-design-deliver-skill.md	107	https://github.com/HankChenCH/skills/issues/107
+docs/tickets/0037-spine-three-suggestions.md	108	https://github.com/HankChenCH/skills/issues/108
diff --git a/skills/dev-execute/references/run-mechanics.md b/skills/dev-execute/references/run-mechanics.md
index 3cb16b0..4ab0603 100644
--- a/skills/dev-execute/references/run-mechanics.md
+++ b/skills/dev-execute/references/run-mechanics.md
@@ -276,7 +276,10 @@ git worktree add "<repo>-runs/<spec-id>-t<NNNN>" -b "run/<spec-id>-t<NNNN>" "run
    不重做。盘上状态机不动：票 frontmatter + worktree 仍是唯一运行真源，运行记录
    与盘上推导冲突时以盘上为准（spec 0013 实现决策）；脚本不落盘，续接按同宿主
    重新探测得同档后重建/修订脚本承接（缓存复用不重做已完成步），修订不成 →
-   停机问人。
+   停机问人。**恢复前核对子代理模型锚定**：跨会话/跨计划续接时，运行记录中的
+   模型上下文可能不可再建（子代理创建报 Model creation failed——spec 0016 运行
+   实证），先以修订（AmendWorkflow 带 subagent_model 重锚当前会话模型，脚本字节
+   不变则仅动设置）承接再恢复，已完成步缓存不重做。
 
 ## 6. 预演（每次合回后）
 
@@ -289,6 +292,16 @@ git worktree add "<repo>-runs/<spec-id>-t<NNNN>" -b "run/<spec-id>-t<NNNN>" "run
 2. spec 验收场景中标 [FR-N | 集成级] 且仓库已有自动化承载的测试（`CHECK_TEST`
    已覆盖的不再重复跑；无承载的集成场景留给 /dev-accept，运行不代跑）。
 3. 预演记录进运行摘要：哪次合回、哪条命令、什么输出。
+4. **门禁命令执行细则**（会话侧，spec 0016 运行两次假绿实证）：命令一律以仓库根为
+   cwd（会话工作目录会漂移——cwd 错位时 `.sdlc/check.sh: no such file or directory`
+   会被管道尾部命令吞掉，退出码 0 假绿）；退出码直取（zsh `pipestatus[1]` / bash
+   `PIPESTATUS[0]`）——`长命令 | tail` 的管道尾退出码不得当门禁判据；后台跑门禁
+   同理（cwd 显式锚定 + 真实退出码落日志）。
+5. **check-all 系门红先甄别再处置**：进程异常终止形态（输出止于用例名中间、无失败
+   摘要）+ 同套件复跑全绿 + 代码零变化 → 判环境偶发（如 SwiftShader Chromium
+   worker 崩溃），报用户授权后复跑一次；授权复跑策略可编入脚本（rehearse 系确定性
+   门：红则复跑一次，绿则继续、再红停机问人——spec 0016 运行实证闭环）。可复现的
+   失败摘要（真代码回归特征）不经此通道，直走 SKILL.md §8 预演失败流。
 
 ## 7. 机械合回
 
diff --git a/skills/dev-fix/SKILL.md b/skills/dev-fix/SKILL.md
index 445b689..30ffb7c 100644
--- a/skills/dev-fix/SKILL.md
+++ b/skills/dev-fix/SKILL.md
@@ -48,8 +48,10 @@ description: 为缺陷开 fix 工单并送入实现链。入口先分诊定级
 
 ## 4. 出口门禁（全部通过才算完）
 
-1. 用下面的固定模板落盘 `docs/tickets/NNNN-slug.md`（id = 目录内最大号 +1，
-   `type: fix`，`spec` 必填），跑 `.sdlc/check.sh validate` 必须通过，再跑
+1. 用下面的固定模板落盘 `docs/tickets/NNNN-slug.md`（id = max(目录内最大号,
+   `git log --all --format=%s | grep -o '\[#[0-9]\{4\}\]'` 最大号) + 1——过程档清扫后目录内
+   编号会回收复用，只看目录会与 git 史撞号，retro 0003 实证；`type: fix`，`spec` 必填），
+   跑 `.sdlc/check.sh validate` 必须通过，再跑
    `publish`。开票提交带 `[trivial]`（流程产物落盘）。
 2. **处置 = 排期或不修** → 票留盘（ready）或把不修理由写进 Progress，停，
    不送实现链。
diff --git a/skills/dev-plan/SKILL.md b/skills/dev-plan/SKILL.md
index c470a39..2834b25 100644
--- a/skills/dev-plan/SKILL.md
+++ b/skills/dev-plan/SKILL.md
@@ -58,7 +58,9 @@ docs/adr/ 中相关 ADR → GLOSSARY.md → 粗读改动将落到的代码区域
   （§4.1）一并向用户确认，不新增人工门；互斥不进门禁——validate 不受理票正文行，
   check.sh 零改动。
 - **固定模板**：确认后用下面的模板落盘 `docs/tickets/NNNN-slug.md`
-  （id = 目录内最大号 +1，type 一律 feature——fix 票出自 dev-fix，slug 用 ASCII 小写短横线）：
+  （id = max(目录内最大号, `git log --all --format=%s | grep -o '\[#[0-9]\{4\}\]'` 最大号) + 1——
+  过程档清扫后目录内编号会回收复用，只看目录会与 git 史里的 `[#NNNN]` 撞号（retro 0003 实证
+  `[#0006]` 指向 4 张票）；type 一律 feature——fix 票出自 dev-fix，slug 用 ASCII 小写短横线）：
 
 ```markdown
 ---
diff --git a/skills/dev-review/SKILL.md b/skills/dev-review/SKILL.md
index 74b686b..8597e9a 100644
--- a/skills/dev-review/SKILL.md
+++ b/skills/dev-review/SKILL.md
@@ -48,6 +48,9 @@ description: 对当前分支上已实现的工单做双轴代码评审——标
 - **Spec 轴**：逐工单对照 spec 与验收标准，只查三件事——缺失（该做没做）、
   走样（做了但与 spec 不符）、超范围（做了 spec 之外的事）。回答"做的是不是要的"。
 - 两轴可派两个并行子代理分头评审；聚合时**分轴出具、不合并重排、不互相稀释**。
+- **评审人即实现人（同一会话出票又评票）时，必须另派一个独立只读子代理按同样两轴盲审**，
+  自审与盲审分轴聚合后再出结论——自审会沿用实现时的假设，盲审才能抓到「宣称 ≠ 实况」
+  这类作者盲区（retro 0003：评审 0002 盲审抓出自审漏掉的阻断）。
 - 每条 finding 按 ref-review 规则：`文件:行` + 怎么改 + 为什么 + 阻断/建议定级。
 
 ## 4. 出口门禁（全部通过才算完）
diff --git a/skills/setup-workspace/assets/GLOSSARY.md b/skills/setup-workspace/assets/GLOSSARY.md
index 12398ba..7540bdc 100644
--- a/skills/setup-workspace/assets/GLOSSARY.md
+++ b/skills/setup-workspace/assets/GLOSSARY.md
@@ -11,7 +11,7 @@
 | need | 需求纪要：业务目标、干系人、系统能力需求（FR-N）、场景、假设与风险。一轮迭代的最上层依据。 |
 | spec | 规格：用户视角的问题陈述、方案、用户故事、实现与测试决策、验收场景。改源码前的必要产物。 |
 | design | 技术方案：模块划分、数据流、seam（测试边界）。配合 ADR 记录架构决策。 |
-| ticket | 工单：一张可独立开工、可独立验收的实现单元，分 feature / fix 两类，同池编号。 |
+| ticket | 工单：一张可独立开工、可独立验收的实现单元，分 feature / fix 两类，同池编号；编号 = max(目录内最大号, git 全史 `[#NNNN]` 最大号) + 1——过程档清扫后目录内编号会被回收复用，不连同 git 史取大则 `[#NNNN]` 跨运行撞号、提交追溯链断（追溯锚 = 带 `[#NNNN]` 的合入提交 + spec 编号）。 |
 | overview | 总览：开工前对单张 spec 名下产物的纯读合成文档，固定五节（全景一行、全景矩阵、黄金场景走查、样张、差距清单）；过程档归置，详见项目术语章。 |
 | review | 评审报告：双轴（标准轴 + Spec 轴）findings 汇总，`tickets: []` 声明覆盖面。 |
 | acceptance | 验收报告：集成后逐条运行集成级场景、逐 FR 核销、风险复审的结果。 |
diff --git a/skills/setup-workspace/assets/check.sh b/skills/setup-workspace/assets/check.sh
index e860857..9b71ad5 100755
--- a/skills/setup-workspace/assets/check.sh
+++ b/skills/setup-workspace/assets/check.sh
@@ -483,8 +483,17 @@ cmd_pre_push() {
   [ -n "$base" ] || die "找不到基准分支 ${BASE_REF}（本地与 origin 都没有）——检查 .sdlc/config.sh 的 BASE_REF"
   mb="$(git merge-base "$base" HEAD 2>/dev/null)" \
     || die "无法计算与 $BASE_REF 的 merge-base（当前 HEAD 不含该历史？）"
-  local subjects refs rc=0 d f st cov rv t
+  local subjects refs rc=0 d f st cov rv t origin_base
   subjects="$(git log --format=%s "$mb..HEAD")"
+  # 主干直推（HEAD == BASE_REF，如 trunk 上直接提交后 push）：merge-base 比较退化为空集、
+  # implemented↔approved 评审覆盖核验空转（retro 0004 实证）——此时改对
+  # origin/<BASE_REF>..HEAD（即本次推送内容）做同款校验。
+  if [ -z "$subjects" ] && [ "$base" = "$(git rev-parse HEAD 2>/dev/null)" ]; then
+    origin_base="$(git rev-parse --verify --quiet "refs/remotes/origin/$BASE_REF" || true)"
+    if [ -n "$origin_base" ] && [ "$origin_base" != "$base" ]; then
+      subjects="$(git log --format=%s "$origin_base..HEAD")"
+    fi
+  fi
   if [ -z "$subjects" ]; then
     info "✓ 分支无领先提交，pre-push 通过"
     return 0
```
