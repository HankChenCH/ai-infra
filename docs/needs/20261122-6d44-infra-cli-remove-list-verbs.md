---
id: 20261122-6d44
status: confirmed
created: 2026-11-22
confirmed: 2026-11-22
---
# @hankchen/infra 命令行剩余动词补全：卸载（remove/rm）与清单（list/ls、list-remote/ls-remote）

## 背景与业务目标

spec 20261116-2c58 硬切子命令化时，把 `skill list` / `plugin list` / `skill remove` 等动词列为非目标（非目标 1：「目录结构预留动词位，实现留下轮」）。当前命令面只有 `skill add` / `plugin add` 两个动词，使用者装错资产后只能手动做三处清理——`.agents/skills/<名>/` 实体目录、各 agent 目录下的软链、`.infra-lock.json` 记账——任何一处漏掉都会留下悬空软链或脏账。

需求发起人（套件维护者）的目标（原话「我想补全命令行的剩余操作和短命令，比如remove rm这些」2026-11-22）：补齐卸载与清单两组动词，带短别名（rm/ls 风格）；清单侧参照 fnm 形态拆两条命令（原话「要不把已装和未装的ls拆2条命令更清晰，像fnm一样」2026-11-22）：`list`/`ls` 列已装，`list-remote`/`ls-remote` 列包内可装。

可验证目标：本轮交付后，`skill remove/rm`、`skill list/ls`、`skill list-remote/ls-remote`、`plugin remove/rm`、`plugin list/ls`、`plugin list-remote/ls-remote` 及双侧无参交互卸载、双侧 `--all` 全卸，全部可执行且行为如「场景」节样张；`pnpm test` 全绿 + `pnpm pack && pnpm run verify:pack <tgz>` 过；README.md 与 docs/getting-started.md 命令示例同步新动词。

不做的代价：卸载只能手动三处清理，错删漏删；已装面与可装面没有命令行视图，升级/补装决策靠翻锁文件；命令面能装不能卸，相对 add 单侧失衡。

## 干系人与用户

| Actor | 要完成什么 | 成功标准 |
|---|---|---|
| 外部使用者 | 卸载套件技能/插件（带名、交互勾选、--all 三形态） | 场景节样张命令复制可执行；卸后实体目录、软链、锁文件三处一致；不误删使用者自建内容 |
| 外部使用者 | 查看已装清单与包内可装清单，做升级/补装决策 | `list`/`ls` 列锁文件实态（插件按 profile 分组）；`list-remote`/`ls-remote` 列包内编目 |
| 套件维护者 | 命令面增删查齐备，分层结构不腐化 | 新增动词只加 `src/commands/<命令>/` 内文件 + 命令组注册一处；`pnpm test` 全绿 + verify:pack 过 |

## 系统能力需求

- **FR-1** skill 卸载（溯源：原话「补全命令行的剩余操作…remove rm」2026-11-22 + 拍板 D4/D5/S3/S4）：
  - `skill remove <名...>` / `skill rm <名...>`：带名免交互直接卸；名字空格或逗号分隔双收，归一化与 add 同构（trim 滤空、按首现保序去重）；
  - 卸载语义 = 删 `.agents/skills/<名>/` 实体目录 + 删各 agent 目录下**确属软链**的链接（被真实文件/目录占位的记冲突跳过，绝不删非软链内容）+ 锁文件 skills 清账；完成摘要与安装摘要同构（删除项、清理的软链、锁文件更新）；
  - 「这个技能是我装的」以锁文件记账为准（拍板 D5）：锁文件无记账的名字拒卸，✗ 报错含该名并列已装清单指路 `skill list`，退出 1、零落盘；在账但不在当前包编目的名字照卸；
  - `skill remove --all`：免交互卸掉锁文件 skills 全部记账（拍板 D2 圈选纳入）；账已空时的口径转 spec 细化（假设 A1）；
  - 无参 `skill remove`：进已装技能交互勾选（PTY，需终端），确认后才动手；Ctrl-C 取消或空选确认 → 退出 0、零落盘（延续现行交互纪律）。
- **FR-2** plugin 卸载（溯源：拍板 D3 翻案 need 20261115-339e 非目标 5 + D6/S5/S6）：
  - `plugin remove <名...>` / `plugin rm <名...>`：经官方命令 `dsh plugin --profile <名> remove <包>` 转发 → 卸后对账（profile package.json 的 dependencies 依赖行与 dsh.profile.bundles 清单行均消失）→ 锁文件 plugins 清账；批量逐条顺序执行、单条失败中止并带已完成/未完成清单（与安装批量语义对称）；dsh 不在 PATH 回退 `npx @deepseek-ai/dsh`；
  - 目标 profile 由锁文件逐插件记录的 profile 自动定位（拍板 D6）；显式 `--profile <名>` 覆盖账面；锁文件无该插件记账时报错并列已装插件清单；
  - `plugin remove --all`：卸掉锁文件 plugins 全部记账，逐条按各自账面 profile 定位（拍板 D2 圈选纳入）；账已空口径同假设 A1；
  - `--profile desktop` 保留名拒卸，与装入 F4 同口径（拍板 S6）；
  - 无参 `plugin remove`：进交互勾选（PTY，需终端），确认后动手；profile 维度形态转 spec 细化（假设 A2）。
- **FR-3** 清单视图（溯源：原话「已装和未装的ls拆2条命令…像fnm一样」2026-11-22 + S7）：
  - `skill list` / `skill ls`：列锁文件 skills 记账（名 + 安装时间；指纹不展示）；
  - `skill list-remote` / `skill ls-remote`：列包内编目可装技能全集（与 `skill add` 交互菜单同源，当前 31 个）；
  - `plugin list` / `plugin ls`：列锁文件 plugins 记账，按 profile 分组（名 + 版本 + 安装时间）；
  - `plugin list-remote` / `plugin ls-remote`：列包内编目可装插件（两级枚举 `agents/<宿主>/plugins/`）；
  - 命名遵循 fnm 形态（发起人点名参照）：`list`/`ls` = 本地已装，`list-remote`/`ls-remote` = 包（npm 最新发布物）可装面。
- **FR-4** 短别名与命令面契约（溯源：原话「短命令…remove rm这些」2026-11-22 + S1）：
  - `rm` 为 remove 别名、`ls` 为 list 别名、`ls-remote` 为 list-remote 别名（commander alias，帮助文案并列呈现）；命令组保持单数（承 spec 20261116-2c58 拍板 D2 单数对称式，不设 skills/plugins 复数别名）；
  - 顶层帮助命令清单纳入全部新动词与别名；未知命令口径的可用清单随注册面同步。
- **FR-5** 空账保留骨架（拍板 D7）：卸载到 skills 与 plugins 记账全空时，保留 `.infra-lock.json`（package/packageVersion 字段），文件不删。
- **FR-6** 文档与测试随契约同步（承 spec 20261116-2c58 FR-6 纪律）：README.md、docs/getting-started.md 补新动词示例与卸载叙事；GLOSSARY.md 套件资产词条命令面描述更新；解析契约测试矩阵按新动词扩展，e2e 覆盖卸载与清单样张。

## 场景

**主流程 1（带名卸载技能）**
- Given 项目内已 `skill add dev-spec,dev-plan` 且 `.claude` 目录存在
- When `npx @hankchen/infra skill rm dev-spec`
- Then `.agents/skills/dev-spec/` 删除、`.claude/skills/dev-spec` 软链删除、锁文件 skills 清掉 dev-spec，摘要列出删除项，退出 0

**主流程 2（账面自动定位卸插件）**
- Given 锁文件记录 `@hankchen/dsh-demo` 装在 profile dev
- When `npx @hankchen/infra plugin rm @hankchen/dsh-demo`
- Then 经官方命令 `dsh plugin --profile dev remove @hankchen/dsh-demo` 卸载，对账两落点消失，锁文件清账，退出 0

**主流程 3（交互卸载技能）**
- When `npx @hankchen/infra skill remove`（无参，TTY）
- Then 进已装技能多选（锁文件为源），空格勾选、回车确认后按 FR-1 语义卸载；Ctrl-C 取消或空选确认 → 零落盘退出 0

**主流程 4（清单）**
- When `npx @hankchen/infra skill ls`
- Then 列锁文件已装技能（名 + 安装时间）；When `skill ls-remote`，Then 列包内可装技能全集

**主流程 5（全卸）**
- When `npx @hankchen/infra skill remove --all`
- Then 锁文件 skills 全部记账按 FR-1 语义逐个卸载，摘要列出，退出 0

**异常流 1（卸未记账技能）**
- When `skill rm 名字不在锁文件`
- Then ✗ 报错含该名与已装清单、指路 `skill list`，退出 1、零落盘（承拍板 D5）

**异常流 2（软链位被占）**
- Given `.claude/skills/dev-spec` 被使用者替换为真实目录
- When `skill rm dev-spec`
- Then 实体目录与锁文件照清，该软链位记冲突跳过不删，摘要注明（承 S4）

**异常流 3（官方命令卸载失败）**
- When `plugin rm x` 且官方命令非零退出
- Then 报错带输出尾部，已完成项账面保留、未完成项列明，退出 1（承 S5，与安装对称）

**异常流 4（desktop 拒卸）**
- When `plugin rm x --profile desktop`
- Then ✗ 保留 profile 拒卸口径，退出 1、零落盘（承 S6）

## 假设与风险

- A1（代价中×不确定度低）：`--all` 在账已空时的口径（报错退出 1 vs 提示退出 0）未拍板——spec 定；add 侧「空选退出 0」纪律可平移。
- A2（代价中×不确定度低）：plugin remove 无参交互的 profile 维度形态（账面分组多选 vs 先选 profile 再勾插件）未拍板——spec 定；建议与 add 交互同构（先勾插件、profile 由账面预置）。
- A3（代价低×不确定度中）：`list-remote` 命名按发起人点名的 fnm 同款落盘；我们的「remote」语义是 npm 包最新发布物的编目面，不是 registry 实时查询——若使用者语感冲突，spec 阶段仍可改名。
- A4（代价低×不确定度低）：插件卸后对账只核「两落点消失」，不核 node_modules 残留——依赖目录归官方命令管理，套件不越界（与安装对账语义对称）。
- 风险：卸载是破坏性操作，清理边界拍板「锁文件记账为准」后，锁文件丢失/损坏的项目无法经套件卸载（报错指路手动清理）——这是保护使用者自建内容的有意取舍。

## 范围与非目标

非目标（全部来自显式拍板）：
1. `skill update` 等升级动词不做（本轮圈掉；技能升级已由 `skill add` 重跑刷新覆盖，插件升级维持官方命令管理——拍板 D3 翻案边界仅卸载，不含升级）。
2. `skills`/`plugins` 复数命令组别名不做（承 spec 20261116-2c58 拍板 D2 单数对称式）。
3. list 的 JSON 机器可读输出不做（无发起人原话）。
4. 卸载 `desktop` profile 插件不做（拍板 S6 拒，与装入 F4 同口径）。
5. 账全空时删除 `.infra-lock.json` 不做（拍板 D7 保留骨架）。
6. 触碰 `.agents/skills/` 下无锁文件记账的使用者自建内容不做（拍板 D5 的对立面）。

## 开放问题

（已清零——拍板记录）
- D1 方法论 → 用例驱动（发起人选项确认）。
- D2 动词范围 → remove/rm + list/ls 双侧全做，含无参交互卸载、双侧 --all、可装视图（发起人圈选全收）。
- D3 plugin remove 翻案 → 纳入套件 CLI（推翻 need 20261115-339e 非目标 5「插件卸载套件不做 CLI 包装」；翻案边界仅卸载，升级仍归官方命令）。
- D4 破坏护栏 → 带名免交互直接卸；无参交互勾选，确认后动手。
- D5 skill 清理边界 → 锁文件记账为准，无记账拒卸并列已装清单。
- D6 plugin profile 定位 → 锁文件账面自动定位，`--profile` 显式覆盖。
- D7 空锁文件 → 保留骨架，不删文件。
- D8 list 形态 → 初拍两节同屏，发起人翻案改 fnm 式拆两条（list/ls 已装 + list-remote/ls-remote 可装）。
- D9 可装命令命名 → list-remote/ls-remote（发起人点名 fnm 参照取同款；命名确认卡未及回应，按参照落盘，spec 可改——见假设 A3）。
- S1–S7 陈述句（别名四件套/归一化同构/未知名口径/软链只删确属软链/插件卸载链/desktop 拒/清单数据源）→ 发起人确认全部成立。
