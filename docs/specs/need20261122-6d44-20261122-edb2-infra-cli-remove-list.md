---
id: 20261122-edb2
status: approved
need: 20261122-6d44
round: 1
created: 2026-11-22
approved: 2026-11-22
---
# @hankchen/infra 剩余动词补全（round 1）：卸载（remove/rm）与清单（list/ls、list-remote/ls-remote）单轮全量

## 问题陈述

`@hankchen/infra` 命令面只有 `skill add` / `plugin add` 两个动词（spec 20261116-2c58 硬切后的预留位），能装不能卸：使用者装错资产后只能手动做三处清理——`.agents/skills/<名>/` 实体目录、各 agent 目录软链、`.infra-lock.json` 记账——漏掉任何一处都留悬空软链或脏账；误删无记账的使用者自建内容也无护栏。已装面与可装面没有命令行视图，升级/补装决策只能翻锁文件。

## 方案

对外（need FR-1–FR-4）：`skill` 与 `plugin` 命令组各新增 `remove`（别名 `rm`）、`list`（别名 `ls`）、`list-remote`（别名 `ls-remote`）三个动词。卸载带名免交互直接执行（归一化与 add 同构）、无参进已装条目交互勾选（确认后动手）、`--all` 一键全卸；「是我装的」以锁文件记账为准，无记账拒卸并列已装清单。插件卸载经官方命令 `dsh plugin --profile <名> remove <包>` 转发，profile 由账面自动定位（`--profile` 显式覆盖），卸后对账两落点消失再清账。清单为纯读双命令：`list`/`ls` 列锁文件已装（插件按 profile 分组），`list-remote`/`ls-remote` 列包内编目可装——fnm 式拆两条（need D8 翻案拍板）。

对内（承 ADR 20261116-af69 扩展口径）：命令组内加动词文件 + 注册，顶层命令组数不变；内核新增技能卸载编排、插件卸载编排（含卸后对账）与清单数据装配三个能力位，全部只读写既有存储——设计 20261122-81e9 分析段结论「装卸对称双流、账本驱动、零新增持久化实体」照落。文档与测试随契约同步（need FR-6）。

## 用户故事

- 作为外部使用者，我想要 `npx @hankchen/infra skill rm dev-spec` 一条命令把实体、软链、账一次清干净，以便不留脏迹。
- 作为外部使用者，我想要 `skill remove` 无参进已装技能勾选，以便不记名时交互挑着卸。
- 作为外部使用者，我想要 `skill remove --all`，以便一条命令清空套件技能。
- 作为外部使用者，我想要 `plugin rm @hankchen/dsh-demo` 不带 `--profile` 就能卸（账面定位），以便少打字。
- 作为外部使用者，我想要卸未记账名字时被拒绝并列已装清单，以便不误删自建内容。
- 作为外部使用者，我想要 `skill ls` 与 `skill ls-remote`，以便一眼对照已装与可装、做补装决策。
- 作为套件维护者，我想要新动词只加命令目录文件与注册、内核对称扩展，以便分层不腐化（ADR 20261116-af69 口径延续）。

## 实现决策

引用设计 20261122-81e9 分析段：装卸对称共用账本（DFD 1.0→4.0→5.0 对 1.0→3.0）；概念类「已装资产记录 × 安装落点」承载卸载语义（软链形态属性 = 只删确属软链的判别）；ER 零新增持久化实体（LOCKFILE 头实体与账行分离 = 骨架保留）。命名沿用分析段术语（已装记录 / 安装落点 / 账面），GLOSSARY 登记随文档同步票走。

- **命令面注册与别名**：`skill`/`plugin` 命令组各挂 `remove`、`list`、`list-remote` 动词；`rm`=remove、`ls`=list、`ls-remote`=list-remote（commander alias）。命令组保持单数（承 2c58 拍板 D2）；顶层命令组数不变，动词注册在各命令组内（ADR af69「加文件 + 注册一处」口径的组内形态——分层契约测试按组内注册断言更新，顶层目录数断言不动）。
- **名归一化**：remove 侧与 add 共用同一归一化单源（空格 variadic + 逗号双收、trim 滤空、按首现保序去重），不另写第二份。
- **skill 卸载语义（账本为准，need 拍板 D5）**：带名并集中任一名字锁文件无记账 → 整体拒绝（文案含未记账名 + 已装清单 + `skill ls` 指路），退出 1、零落盘——与 add 未知名整体拒绝同构，不做部分卸载；在账但不在当前包编目的名字照卸。卸载动作 = 删实体目录（不存在记「账在实亡」照走后续）+ 清 agent 目录软链（仅 lstat 为符号链接者删；真实文件/目录占位记冲突跳过，绝不删非软链内容——悬空软链仍是软链，照删）+ 锁文件 skills 清账。完成摘要与安装摘要同构（已卸 N 项 / 已清 M 个 agent 目录软链 / 冲突跳过列表 / 记账更新行）。
- **skill remove `--all`**：与名互斥（同 add 口径报错）；账空时提示「没有已装技能可卸」退出 0、零落盘（假设 A1 拍板：与交互空选退 0 纪律同构）；有账时免交互逐项按带名同语义卸。
- **plugin 卸载语义（账面定位，need 拍板 D6）**：带名并集中任一名字账面无记录 → 整体拒绝（同构 skill 侧）；目标 profile 取账面该插件记录的 profile；显式 `--profile <名>` 覆盖账面（官方命令转发用给定 profile、卸后对账核给定 profile、锁文件仍清该名账面记录）。已知边界随文档同步写明：锁文件 plugins 每名恰一条（后装覆盖），同插件装多 profile 时账面只记最后一次套件安装，`--profile` 覆盖是唯一显式出口。
- **plugin 卸载编排（与安装对称）**：前置检查共用（node 版本 floor，低于拒绝且不发起官方调用）；执行体解析共用（dsh 不在 PATH 回退 `npx --yes @deepseek-ai/dsh`）；官方命令形态 `dsh plugin --profile <名> remove <包>`（profile 与包名独立 argv 元素，不拼 shell 串）；卸后对账 = profile package.json 的 dependencies 无该包依赖行且 dsh.profile.bundles 无该包名（两落点消失）——对账通过才清账，失败保留账（dsh 侧状态不明时账是安全默认，对称安装「对账失败不记账」）；批量逐条顺序执行、单条失败中止并报已完成/未完成清单（已完成项账面清理保留）；不核 node_modules 残留（假设 A4 维持：依赖目录归官方命令管理）。
- **desktop 口径（缺口 1 归置拍板）**：`plugin remove` 与 add 现态同构，无保留名分支——`--profile desktop` 照卸（官方 CLI 已放行 desktop 插件管理；need S6 作废，留痕备注）。
- **交互纪律**：remove 无参进已装条目勾选（PTY 需终端）——skill 侧源 = 锁文件 skills 记账（与 add 勾选源=包编目不同源）；plugin 侧拍板（假设 A2）：勾已装插件（账面为源、条目提示含账面 profile）→ 确认摘要列「插件→profile」→ 执行，无独立 profile 选择步。取消（Ctrl-C）与空选确认 → 退出 0、零落盘（唯一豁免延续）；非 TTY 守卫文案为共享单源，更新为同时列举 add 与 remove 主形态（文案原文级锚定）。
- **清单呈现（fnm 式拆两条，need 拍板 D8/D9）**：`skill list`/`ls` 按名排序列锁文件 skills 记账（名 + 安装时间），账空输出「（无已装技能）」退出 0；`skill list-remote`/`ls-remote` 列包内编目可装全集（名 + 描述，与 add 菜单同源同序）；`plugin list`/`ls` 按 profile 分组（profile 名为组行，逐条 名@版本 + 安装时间），账空输出「（无已装插件）」；`plugin list-remote`/`ls-remote` 列包内编目（正名 + 描述）。清单纯读零落盘；别名与主名行为逐字节一致。
- **命令面契约同步**：顶层帮助命令清单纳入六个新动词形态与别名；未知动词口径文案的可用清单取实际注册动词主名（add、remove、list、list-remote）；逐动词帮助（用法 + 示例 + 别名行）与 2c58 定稿帮助分级同构。
- **版本**：0.5.0 → 0.6.0（0.x minor 承载功能新增，承 2c58 版本策略先例）。

## 测试决策

seam 清单（既有同类测试为先例）：

- **S1 解析矩阵扩展（test/unit/cli.test.ts）**：新动词路由与别名等价（rm/ls/ls-remote 双侧与主名行为一致）；`--all`×名互斥（remove 侧）；账校验报错文案锚定；`--all` 空账提示退 0；未知动词可用清单更新；帮助分层断言（顶层含新动词与别名、逐动词帮助含别名行）。
- **S2 校验纯函数（unit）**：账面校验判定（全未记账/部分未记账整体拒绝）；`--all` 互斥与空账判定；profile 定位判定（账面取值 / `--profile` 覆盖）。
- **S3 卸载与清单内核（unit，新增）**：技能卸载编排——实体删、软链只删确属软链（含悬空）、占位冲突跳过、账清、骨架保留、账在实亡路径；插件卸载编排——桩 run 断言 `plugin --profile dev remove <包>` argv 形态、卸后对账两落点消失、对账失败不清账、单条失败中止已完成保留、npx 回退形态、desktop 无保留分支；清单数据装配——账空/有账、profile 分组、可装编目同源。
- **S4 交互构造与守卫（test/unit/menu.test.ts + PTY）**：remove 勾选源 = 账面（含 profile 提示）；取消/空选零落盘；非 TTY 守卫更新文案。
- **S5 端到端（test/e2e/install、plugin-install 扩展）**：装→卸三处一致（无实体、无软链、无账）；`--all` 与再卸空账；dsh shim 断言 remove 调用形态；PTY 交互卸载路径；清单样张输出。
- **S6 分层与发布对账**：分层契约测试按组内动词注册口径纳管（顶层目录数断言不变）；`pnpm pack && pnpm run verify:pack <tgz>` 三查过；既有内核单测全绿。

## 验收场景

- [FR-1 | 工单级] Given 已装 dev-spec,dev-plan 且 .claude 目录存在，When `skill rm dev-spec`，Then 实体目录删、`.claude/skills/dev-spec` 软链删、锁文件 skills 仅剩 dev-plan、摘要列删除项，退出 0。
- [FR-1 | 工单级] When `skill remove dev-spec,dev-plan dev-spec` 跑解析，Then 归一化为并集保序去重（与 add 同构）。
- [FR-1 | 工单级] Given PTY 环境，When `skill remove`（无参）勾选 1 项确认，Then 卸载结果与带名路径一致；When Ctrl-C 取消与空选确认各一次，Then 退出 0、零落盘。
- [FR-1 | 工单级] When `skill remove --all`（账有 2 项），Then 两项按带名同语义全卸、锁文件 skills 记账清空且 package/packageVersion 字段保留、退出 0。
- [FR-1 | 工单级] When `skill remove --all`（账空），Then 提示「没有已装技能可卸」、退出 0、零落盘。
- [FR-1 | 工单级] When `skill rm 不存在的名字`，Then ✗ 报错含该名与已装清单并指路 `skill ls`、退出 1、零落盘。
- [FR-1 | 工单级] When `skill rm 已记账名,未记账名`（部分未记账），Then 整体拒绝（文案含未记账名与已装清单）、退出 1、零落盘，已记账项不卸。
- [FR-1 | 工单级] Given `.claude/skills/dev-spec` 已被使用者替换为真实目录，When `skill rm dev-spec`，Then 实体与账照清、该位置记冲突跳过不删、摘要注明、退出 0。
- [FR-1 | 工单级] Given 锁文件有记账但实体目录已被手动删除（含悬空软链），When `skill rm dev-spec`，Then 账清、悬空软链照删、摘要注明「账在实亡」、退出 0。
- [FR-1 | 工单级] Given stdin 非 TTY，When `skill remove`（无参），Then 非 TTY 守卫文案（更新版，含 remove 用法）报错、退出 1、零落盘。
- [FR-2 | 工单级] Given dsh shim 注入 PATH 且锁文件记录 `@hankchen/dsh-demo` → profile dev，When `plugin rm @hankchen/dsh-demo`，Then shim 收到 `['plugin', '--profile', 'dev', 'remove', '@hankchen/dsh-demo']`、卸后对账两落点消失、锁文件 plugins 清账、退出 0。
- [FR-2 | 工单级] Given 账面 profile dev，When `plugin rm @hankchen/dsh-demo --profile test`，Then 转发与对账用 test、锁文件清该名账面记录、摘要注明 profile 覆盖。
- [FR-2 | 工单级] When `plugin remove --all`（账 2 条跨 profile），Then 逐条按各自账面 profile 卸载清账、退出 0；账空时提示「没有已装插件可卸」、退出 0、零落盘。
- [FR-2 | 工单级] Given PTY 环境，When `plugin remove`（无参）勾选 2 项（账面 profile 不同），Then 确认摘要列「插件→profile」、执行与所选一致；取消/空选退出 0、零落盘。
- [FR-2 | 工单级] Given PATH 无 dsh，When `plugin rm <包>`，Then 官方调用回退 `['--yes', '@deepseek-ai/dsh', 'plugin', '--profile', <账面profile>, 'remove', <包>]`。
- [FR-2 | 工单级] When `plugin rm @hankchen/dsh-demo --profile desktop`（shim 放行），Then 无保留名分支、转发正常（对称放行拍板留痕）。
- [FR-2 | 工单级] Given node 低于官方 floor，When `plugin rm <包>`，Then 前置检查拒绝（与 add 同文案口径）、shim 零调用。
- [FR-2 | 工单级] When `plugin rm 未记账名`，Then ✗ 报错含已装插件清单、退出 1、零落盘、shim 零调用。
- [FR-2 | 工单级] Given shim 模拟官方命令非零退出，When `plugin rm a,b`，Then 报错含输出尾部与已完成/未完成清单、a 账面清理保留、b 未动、退出 1。
- [FR-2 | 工单级] Given shim 执行成功但 profile 两落点仍在（对账失败），When `plugin rm <包>`，Then 对账失败报错、账面保留、退出 1。
- [FR-3 | 工单级] Given 账 2 技能，When `skill ls`，Then 按名排序列名与安装时间、退出 0；When 账空，Then 输出「（无已装技能）」、退出 0。
- [FR-3 | 工单级] When `skill ls-remote`，Then 列包内可装全集（名 + 描述，与 add 交互菜单同源同序）、退出 0。
- [FR-3 | 工单级] When `plugin ls`（账 2 条跨 profile），Then 按 profile 分组列 名@版本 与安装时间；账空输出「（无已装插件）」。
- [FR-3 | 工单级] When `plugin ls-remote`，Then 列包内编目插件（正名 + 描述）。
- [FR-3 | 工单级] Given 任意已装状态，When `skill ls`、`plugin ls-remote` 各跑一次，Then 锁文件内容与项目内落点集不变（纯读零落盘）。
- [FR-4 | 工单级] When `rm`/`ls`/`ls-remote` 别名与主名各跑一次（双侧），Then 行为逐字节一致。
- [FR-4 | 工单级] When 顶层 `--help`、`skill rm --help`、`plugin list --help` 各跑一次，Then 顶层帮助含全部新动词与别名、逐动词帮助含用法/示例/别名行、退出 0、零落盘。
- [FR-4 | 工单级] When `skill foo`（未知动词），Then 未知命令口径报错、可用清单列实际注册动词主名（add、remove、list、list-remote）、退出 1。
- [FR-4 | 工单级] When `skill rm dev-spec --all`，Then `--all`×名互斥报错（同 add 口径）、退出 1、零落盘。
- [FR-5 | 工单级] Given skills 与 plugins 记账均被卸空，When 最后一次卸载完成，Then `.infra-lock.json` 保留（package/packageVersion 在、skills/plugins 为空对象）。
- [FR-6 | 工单级] When 静态断言 README.md 与 docs/getting-started.md，Then 含 remove/list/list-remote（双侧）形态示例与卸载叙事、已知边界（账面单条目）写明；GLOSSARY 套件资产词条命令面描述更新（含已装记录/安装落点术语登记）。
- [FR-6 | 工单级] When 运行分层结构契约测试与 `pnpm pack && pnpm run verify:pack <tgz>`，Then 组内动词注册断言过（顶层目录数不变）、三查全过。
- [FR-2 | 集成级 | 承载票 NNNN] Given 维护者本机 dsh 可用，When 经 `plugin add` 真装进测试 profile 后 `plugin rm` 真卸，Then profile 两落点真实消失、锁文件清账（前置门跳过纪律：无 dsh/registry 环境显式 skip 不假绿）。
- [FR-1 | 集成级 | 人工：需版本已发布至 npm registry，发布属单向门在验收时点完成] Given 0.6.0 已发布，When 全新项目先 `npx @hankchen/infra@0.6.0 skill add <名>` 再 `skill rm <名>`，Then 卸载成功且锁文件账清（留验收阶段人工执行）。

## 非目标

1. 技能升级动词（`skill update` 等）与插件升级包装不做（need 非目标 1：技能升级由 add 重跑刷新覆盖，插件升级维持官方命令管理）。
2. `skills`/`plugins` 复数命令组别名不做（承 2c58 拍板 D2）。
3. list 的 JSON 机器可读输出不做（need 非目标 3）。
4. 锁文件 plugins 账面单条目结构改造不做（每名一条、后装覆盖的现状保持，边界以文档写明；多 profile 精确记账留下轮建议）。
5. 账全空删除 `.infra-lock.json` 不做（need FR-5 骨架保留）。
6. 触碰无记账的使用者自建内容不做（need 拍板 D5 对立面）。
7. `--version` 旗标不做（承 2c58 非目标 6 延续）。
8. 卸载回收站/撤销机制不做（remove 即删，护栏靠账本为准 + 确认纪律）。

## 备注

- 输入：need 20261122-6d44（confirmed，issue #327）；design 20261122-81e9（analyzed，issue #328）分析段结论照引。
- 缺口归置留痕（§1.4 三路）：缺口 1 → 落本 spec，拍板「desktop 卸载对称放行、无保留名分支」；need S6 作废——其引用的「装入侧 F4 拒 desktop」基准已随 spec 20261119-7a9a（票 20261119-443c）移除，官方 CLI 已放行 desktop 插件管理；docs/plugin-assets.md「初始化器仍按 F4 拒装」表述与代码现状矛盾，属文档债，归 dev-docs 另案。
- 假设归置留痕：A1 → `--all` 空账提示退出 0（2026-11-22 拍板）；A2 → plugin 无参交互勾插件账面定位、无独立 profile 步（2026-11-22 拍板）；A3 → `list-remote`/`ls-remote` 命名定案（发起人点名 fnm 参照同款）；A4 → 卸后对账不核 node_modules 维持。
- 分轮拍板：round 1 单轮全量 6 FR（2026-11-22 用户确认，动词面互为对称一次成型，承 2c58 单轮全量先例）。
- 版本策略：0.5.0 → 0.6.0。
- 设计偏离记录：无——分析段与实现决策一致（缺口 1 在分析段已留痕，本 spec 归置即其归宿）。
