---
id: 20261122-f5fc
status: fulfilled
fulfilled: 2026-11-22
confirmed: 2026-11-22
created: 2026-11-22
---
# tracker 投影聚合化：一次需求开发一个远端 issue（github/gitlab 对齐 codeup 口径）

## 背景与业务目标

github/gitlab 腿现行投影口径是**全产物独立 issue**：need、spec、design、adr、research、票、评审、验收各建一个 issue，映射账本已积累 295 行（`.sdlc/trackers/github.map`）。一次需求开发的行为链被拆散在十几个 issue 里，回看时要在多个页面间跳转拼图（来源：用户原话「现在是每个阶段，比如need、spec、design都会创建一个issue……这是一次完整的行为，而不是像现在这样」）。

codeup 腿在 need 20261119-8458（2026-11-20 交付，spec 20261119-20b1）已经反转过同款问题：need 建需求单、带 need 谱系前缀的 spec/design/adr/research 挂评论、票与过程档不投。当时拍板 D6 让 github/gitlab 腿维持旧口径，两腿分叉记录为「拍板结果非缺陷」。本 need 反转 D6——使用反馈：分叉的代价（行为链碎片化）大于维持旧口径的代价（适配器改造量）。

业务目标：github/gitlab 腿对齐 codeup 聚合口径并按语义甲分治过程档——**一次需求开发 = 远端一个 issue**，需求怎么提出（need 正文）、怎么设计（design）、调研了什么（research）、实施规格如何（spec）、评审验收结论如何，全部按时间线在同一单内可见；三腿口径归一，GLOSSARY/蓝图中「两腿分叉」表述整体消失。

不做的代价：行为链继续碎片化，审计回看逐 issue 跳转；分叉表述持续占据文档口径的解释成本。

## 干系人与用户

- **仓库主人**（TRACKER=github/gitlab 的项目使用者，本 need 主场景）：期望 need 确认后远端出现一个聚合单，后续各阶段产物落盘后在同一单下按时间线看到演进。成功标准：一次需求开发全过程（need → spec → design/adr/research → 评审 → 验收）在单个 issue 页面按时间顺序完整可见，无需跳转其他 issue。
- **流程技能**（dev-clarify / dev-spec / dev-plan / dev-ship / dev-accept / dev-fix / dev-quick-implement 等涉 publish 出口）：publish 受理面变化全部收在适配器内，出口链行为不变——投影失败警告跳过 exit 0 契约照旧（蓝图 §5.4）。
- **AI 执行者**：投影动作仍由 `check.sh publish` → 适配器（bash 子进程）执行，无会话内动作变化（与 codeup MCP 路径无关，codeup 腿零改动）。

## 系统能力需求

- **FR-1 聚合建单**：need 产物首次投影时新建独立 issue（一个 need 一个 issue），标题 = need 一级标题，正文 = 盘上指针行 + 全文（超 60000 字节截断注记，现行 github.sh 既有形态不变）（来源：拍板 D1）。
- **FR-2 知识档评论化**：带 need 谱系前缀的 spec / design / adr / research 投影为对应聚合单下**追加评论**（正文首行盘上指针 + 产物全文，超限截断注记）；同产物演进重复投影**追加新评论不覆写**，时间线保留（来源：拍板 D2，对齐 codeup 腿幂等口径「同产物重复投影一律追加评论不新建」）。
- **FR-3 过程档分治（语义甲）**：票（docs/tickets/ 产物）**不投**；其余过程档（评审 / 验收 / 总览）投影为对应聚合单下追加评论。评审/验收/总览与 need 的聚合定位键现行不存在（各投各的无需关联），需新增机制——候选：文件名谱系前缀 / frontmatter spec 引用回溯 / 映射记账扩展，归 spec 拍板（来源：拍板 D5 语义甲「选A，但依然保持tickets不入issue」）。
- **FR-4 独立知识档不投**：无 need 谱系前缀的独立知识档不再建独立 issue，警告跳过（对齐 codeup 腿既有口径；行为变化：github/gitlab 腿现行是投的）（来源：拍板 D6 三腿归一推论）。
- **FR-5 终态关闭**：聚合单关闭时机 = need 自身 frontmatter `status` 置终态时（GLOSSARY 终态集合 → completed；rejected → not_planned，现行映射不变）；中间态不流转；其他产物置终态不触发关闭（来源：拍板 D3）。
- **FR-6 幂等共账**：映射文件（github.map / gitlab.map）语义升级——知识档与评论态过程档行第二列记其承载 need 的 issue 号（对齐 codeup.map 既有语义）；need 行记自身 issue 号；同产物重复投影一律追加评论不新建单（来源：拍板 D2 + FR-2/FR-3 推论）。
- **FR-7 存量不动**：现有 295 个已映射 issue 不迁移、不删除、不回填，作为历史审计留存；映射账本新旧语义按行共存，新口径只对新投影生效（来源：拍板 D4）。
- **FR-8 文档口径同步**：METHOD 总原则「审计链主承载为 tracker 投影与源码提交 `[#NNNN]` 引用」及 §7.1 受理面表重写（票不投后其审计留痕只剩 commit `[#NNNN]` 引用）；GLOSSARY「投影」词条；蓝图 v1.x 修订（§5.4 / §11.1 / §14 / 修订记录）——治理规则「先改文档再改技能」（来源：拍板 D5 共同代价 + D6）。

## 场景

- **主流程（need 建单）**：Given TRACKER=github、gh 可用已认证，When dev-clarify 出口 publish 一张 confirmed 的 need，Then 新建聚合 issue（标题 = 一级标题、正文首行盘上指针），map 新增 need 行记 issue 号。
- **主流程（spec 评论）**：Given 该 need 已有映射行，When publish 一张带其谱系前缀的 spec，Then 对应聚合单追加一条评论（指针行 + 全文），map 记账该 spec 行（第二列 = need 的 issue 号）。
- **主流程（评审评论）**：Given 评审产物与其 need 的定位键已按 spec 拍板机制成立，When publish 该评审，Then 聚合单追加评论（FR-3；定位键机制本身归 spec 验证）。
- **演进追加**：Given 同一 spec 已投影过且内容已演进，When 再次 publish，Then 追加新评论，旧评论保留不编辑（FR-2）。
- **票不投**：When publish 一张票（docs/tickets/ 产物），Then stderr 说明「票不入聚合投影，审计留痕 = commit 引用」，exit 0（FR-3）。
- **独立知识档不投**：When publish 无 need 谱系前缀的知识档，Then 警告跳过 exit 0（FR-4）。
- **终态关闭**：Given 某 need status=fulfilled，When publish 该 need，Then 聚合单置 closed；rejected → not_planned；重复关闭幂等无害（FR-5）。
- **异常流（need 无映射）**：When publish 一张 spec 但其 need 尚无映射，Then 警告跳过并指明「先投影对应 need」（对齐 codeup 腿既有异常流）。
- **异常流（投影失败）**：gh 缺失 / 未认证 / API 失败 → 明确警告跳过 exit 0，出口链不受影响（既有契约，蓝图 §5.4）。

## 假设与风险

- **A1（低代价 × 低不确定）聚合单评论量**：票不进单（语义甲）消除了最大膨胀源；spec 多轮 + 评审验收多轮合计通常 < 30 条评论，GitHub 评论无硬上限，风险可接受。**验证结果（验收 20261122-39cc）：本轮未触发**——#342 实测 4 条评论聚合运转无异常；票不投消除最大膨胀源由替身面背书。
- **A2（中代价 × 中不确定）过程档定位键缺失**：评审/验收/总览产物与 need 的关联机制现行不存在，是聚合成立的前提——**round 1 靶心候选**，spec 阶段在「文件名谱系前缀 / frontmatter 引用回溯 / 映射记账扩展」三候选中拍板并定测试。**验证结果（验收 20261122-39cc）：验证通过**——评审经「spec 前缀 → 盘上 spec 文件 need 前缀 → 账本需求单行」定位链在真环境命中 #342 并落评论，靶心方案实跑成立。
- **A3（低代价 × 低不确定）票审计留痕减弱**：票清扫后唯一留痕 = commit `[#N]` 引用，tracker 投影承载消失——用户拍板接受（语义甲共同代价已明示）；METHOD 审计链表述随 FR-8 同步，不留悬空陈述。**验证结果（验收 20261122-39cc）：本轮未触发**——受控序列无票投递；口径由 METHOD 同步与替身负向断言背书。
- **A4（低代价 × 低不确定）gitlab 腿缺实环境验证**：gitlab.sh 与 github.sh 同构、双腿同改，但本仓库 gitlab 腿无实跑记录——靠进程级替身测试覆盖（假 glab PATH 前置，参照 codeup 腿 v1.41 先例⑤），风险接受。**验证结果（验收 20261122-39cc）：本轮未触发**——实环境缺配置（glab 未安装），替身面已验 23/23；补验路径开放归用户拍板。

- **残余风险折回（验收 20261122-39cc passed，2026-11-22）**：① 已关单（如 #306）重复终态发布时 gh 幂等 close 返回 0 走成功分支，留痕打「同步关闭」而非失败留痕——幂等无害（状态不变、无重复注评），瑕疵留痕不阻塞，替身面「非零失败留痕」契约独立自洽；② gitlab 腿实环境零实跑（A4 已显式接受），补验路径开放归用户拍板。**两条残余风险经用户显式接受（2026-11-22 拍板「接受风险」），need 置 fulfilled；gitlab 补验留痕开放，具备 glab 环境时按 spec 集成级第 2 条同链补验。下一轮建议：无。**

## 范围与非目标

范围：
- `.sdlc/trackers/github.sh`、`.sdlc/trackers/gitlab.sh` 与 `skills/setup-workspace/assets/trackers/` 分发副本（双份同文）；映射文件行级语义升级（FR-6）。
- METHOD §7.1 受理面表与总原则审计链句重写、GLOSSARY「投影」词条、蓝图 v1.x 修订（§5.4 / §11.1 / §14 / 修订记录）——先改文档再改技能（FR-8）。
- 测试面：github/gitlab 适配器进程级替身测试新契约化（现行断言独立 issue 口径的用例同批重指向，参照 codeup 腿 v1.41 先例⑤）。

非目标（全部来自显式拍板）：
- **codeup 腿零改动**（D6：已聚合，本 need 是 github/gitlab 反向对齐）。
- **存量 295 个 issue 不迁移不删除不回填**（D4）。
- **票不投，含兜底与评论形态**（D5 语义甲）。
- 中间态流转（D3：仅终态关闭）。
- 平台 → 盘上回读 / 双向同步（need 0002 既有非目标延续）。
- 评论删除 / 编辑等投影外互动（need 0002 延续）。

## 开放问题

（无未决问题。拍板记录：）
- D1 聚合主体 → 一个 need 一个 issue，聚合键 = 产物文件名 need 谱系前缀（去向 FR-1/FR-6）。
- D2 时间线语义 → 演进重复投影追加评论不覆写（去向 FR-2）。
- D3 关闭时机 → 仅 need 自身终态触发（去向 FR-5）。
- D4 存量处置 → 295 个存量 issue 不迁移，新旧语义账本按行共存（去向 FR-7）。
- D5 过程档分治 → 语义甲：评审/验收/总览评论进单，票不投；票审计留痕 = commit 引用（去向 FR-3/FR-8）。
- D6 腿范围 → github + gitlab 双腿同步改，三腿口径归一，反转 need 20261119-8458 拍板 D6（去向 FR-4/FR-8、范围节）。
- 过程档定位键机制 → 三候选转 spec 拍板（去向 FR-3 备注、假设 A2）。
