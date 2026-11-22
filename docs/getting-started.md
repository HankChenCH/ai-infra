# 安装与接入

使用者视角的安装与接入详解。仓库总览见根 [README](../README.md)，流程规则唯一来源是 [METHOD.md](./METHOD.md)。

## 依赖

git 与 bash；安装资产另需 Node.js ≥ 24.9.0（升级指引见下方「安装插件」节）。tracker 投影可选 GitHub（`gh`）/ GitLab（`glab`）/ 云效 Codeup（个人访问令牌），都不配则走本地文件模式，不影响任何门禁。

## 两步接入，顺序固定

**先安装技能，后 `/setup-workspace` 接门禁**。只装了技能、没接门禁就点名流程技能（`/dev-spec`、`/dev-implement` 等）会在入口被校验拒绝——技能停下来提示「本仓库未接入开发流程，先运行 /setup-workspace」。两步都完成才能开工。

## 第 1 步：安装技能

在目标 git 项目根目录运行 `skill add`，无参进交互勾选：

```bash
npx @hankchen/infra skill add
```

空格勾选要装的技能、回车确认。安装器做完三件事：

- 所选技能实体拷入项目 `.agents/skills/<技能名>/`，内容随包原样分发（与仓库 [skills/](../skills/) 清单一致）；
- 对项目内已存在的 agent 目录（`.claude`、`.zcode` 等）建相对软链；不存在的跳过并列入完成摘要，不报错；
- 在项目根写 `.infra-lock.json` 记账：包版本 + 逐技能指纹/安装时间。

脚本与 CI 里免交互安装，落盘结果与交互路径一致：

```bash
npx @hankchen/infra skill add --all                      # 安装全部技能
npx @hankchen/infra skill add dev-spec,dev-plan          # 只装指定技能（逗号分隔）
npx @hankchen/infra skill add dev-spec ref-testing       # 空格分隔多个名字（与逗号混用均可）
```

全部命令与用法示例见 `npx @hankchen/infra --help`（裸跑与任何位置 `-h` 都给对应层级帮助）。

- **重跑即升级**：再跑一次同一条命令，已装技能按当前包内容覆盖刷新、锁文件同步更新，不重复堆积。
- **从 0.1.x 升级**：命令面已切为子命令形态，0.1.x 的旧旗标输入已退役（跑出来会按「未知旗标」口径报错并指路 `--help`）——已装 0.1.x 的使用者直接改跑 `npx @hankchen/infra skill add`（或带名/`--all`）即按当前包内容刷新，无需先卸载。
- **锁版本**：`npx @hankchen/infra@<版本> skill add <名...>` 安装指定版本（如 `npx @hankchen/infra@0.2.0 skill add dev-spec`），锁文件记录实际安装的版本号，团队以此对齐同一版本。

## 卸载技能（remove/rm）

卸载以 `.infra-lock.json` 记账为准（「是我装的」判据）：`.agents/skills/<技能名>/` 实体目录、各 agent 目录软链与记账行**一次清干净**，不留悬空软链或脏账；无记账的名字整体拒卸并列出已装清单（`skill ls` 查看），不会误删自建内容；agent 目录软链只清确属软链的（悬空软链仍是软链，照删），被使用者替换为真实文件/目录的占位记冲突跳过、绝不删非软链内容。

```bash
npx @hankchen/infra skill remove dev-spec            # 免交互卸载指定技能
npx @hankchen/infra skill remove dev-spec,dev-plan   # 逗号分隔多个（空格分隔亦可，混用均可）
npx @hankchen/infra skill remove --all               # 免交互卸载全部已装技能
```

无参跑 `skill remove` 进已装技能交互勾选（与安装同款空格勾选、回车确认；Ctrl-C 取消或空选确认即退出，不动任何落盘）。别名 `rm` 与 `remove` 行为逐字节一致（`skill rm dev-spec` 等价上行首条）。

## 清单视图（list/ls、list-remote/ls-remote）

已装面与可装面各一条纯读命令，对照着做补装/升级决策；两条都零落盘：

```bash
npx @hankchen/infra skill list          # 列已装技能：按名排序 + 安装时间（别名 ls）
npx @hankchen/infra skill list-remote   # 列包内可装技能全集：名 + 描述，与 add 菜单同源同序（别名 ls-remote）
```

npm 访问受限（内网、公司代理）时，先配镜像或代理再跑安装：

```bash
# 走公共镜像源
npm config set registry https://registry.npmmirror.com

# 或走 HTTP 代理
npm config set proxy http://127.0.0.1:7890
npm config set https-proxy http://127.0.0.1:7890
```

恢复默认：`npm config delete registry`、`npm config delete proxy`、`npm config delete https-proxy`。

## 安装插件（首个宿主：DeepSeek Harness）

插件是套件第二类资产：面向 agent 宿主的扩展包，以宿主官方格式分发。首个宿主为 DeepSeek Harness（dsh），套件随包提供 demo 插件 `@hankchen/dsh-demo`（内容与维护者照抄指南见[插件资产规范](./plugin-assets.md)）。插件安装不落项目文件——它把 npm 包经官方命令装进本机 dsh profile。

前置：**Node.js ≥ 24.9.0**（官方 dsh CLI 的 engines 要求），版本不足时安装器直接拒装并报当前版本。升级：

```bash
fnm install 24 && fnm use 24    # 或 nvm install 24 && nvm use 24
```

交互安装（勾选插件与目标 profile）：

```bash
npx @hankchen/infra plugin add
```

空格勾选要装的插件（条目正名为 npm 包名），回车后选定目标 profile——菜单列出 `~/.dsh/profiles/` 既有项（`DSH_HOME` 可覆盖根目录），无既有项时可输入新名。安装器把勾选包逐条转发官方命令 `dsh plugin --profile <名> add <包>`（`dsh` 不在 PATH 时自动改经 `npx @deepseek-ai/dsh` 运行）；完成摘要给出对账结果——profile 的 package.json 依赖行 + `dsh.profile.bundles` 行两处落点——并记入 `.infra-lock.json`。

脚本与 CI 里免交互安装，落盘结果与交互路径一致：

```bash
npx @hankchen/infra plugin add @hankchen/dsh-demo --profile default
npx @hankchen/infra plugin add @hankchen/dsh-demo <另一包> --profile work   # 空格分隔多个（逗号亦可）
```

`--profile` 必填：插件安装缺它即报错并列出既有 profile。全部命令与用法示例见 `npx @hankchen/infra --help`。

两个例外：

- **`desktop` profile 装不了**：`desktop` 是官方保留 profile 名，官方 CLI 拒绝对其做插件管理；安装器在执行官方命令前同样拒装并说明。
- **registry 访问受限**：插件安装链路比技能多三处 registry 访问（npx 拉 `@deepseek-ai/dsh`、装插件包、profile 依赖经 pnpm 安装）。内网、公司代理环境先按上方「npm 访问受限」配镜像或代理再跑。

## 卸载插件（remove/rm）

插件卸载与安装对称：经官方命令 `dsh plugin --profile <名> remove <包>` 转发，卸后对账（profile 的依赖行与 `dsh.profile.bundles` 行两落点都消失）才清 `.infra-lock.json` 账——dsh 侧状态不明时账面保留，不冒进。目标 profile 不用指定：默认由账面该插件记录自动定位。

```bash
npx @hankchen/infra plugin remove @hankchen/dsh-demo                  # 免交互卸载（profile 由账面定位）
npx @hankchen/infra plugin remove @hankchen/dsh-demo --profile test   # 覆盖账面 profile 卸载
npx @hankchen/infra plugin remove --all                               # 免交互卸载全部已装插件（逐条按各自账面 profile 卸）
```

无记账的名字整体拒卸并列出已装插件清单（`plugin ls` 查看）；无参跑 `plugin remove` 进已装插件交互勾选（确认摘要列「插件→profile」）。别名 `rm` 与 `remove` 行为逐字节一致。

**已知边界**：`.infra-lock.json` 的 plugins 账面每名恰一条——同一插件装进多个 profile 时，账面只记最后一次套件安装（后装覆盖），卸载默认定位到该 profile；要卸其他 profile 里的同名插件，`--profile <名>` 覆盖是唯一显式出口。

## 插件清单（list/ls、list-remote/ls-remote）

```bash
npx @hankchen/infra plugin list          # 列已装插件：按 profile 分组，名@版本 + 安装时间（别名 ls）
npx @hankchen/infra plugin list-remote   # 列包内可装插件：正名 + 描述，与 add 菜单同源同序（别名 ls-remote）
```

## 第 2 步：接入仓库

在目标 git 仓库的会话里运行 `/setup-workspace`。它会扫描仓库、问你三件事（产物与 issue 出口、执行环境、编码标准来源），然后生成门禁脚本、配置与 tracker 适配器，并装好 git hooks。幂等可重跑，永不触碰源码。

## 第 3 步：开工

- `/sdlc` —— 随时盘点：走到哪个阶段、可开工哪些工票、被哪个门禁挡住。
- `/dev-clarify` —— 从一个模糊想法开始；需求已清晰可直接 `/dev-spec`。
- 脊柱上的技能出口**默认自动串联**下一个，只在决策点停下问你；也可以 `/sdlc next` 让总控自动推进到下一个决策点。
- 点名一张 approved spec 交给 `/dev-execute`，整 spec 编排：worktree 并行实现、逐票评审、一次合并收口，全程人只决策两次（开工、合并）。

一轮最小闭环：

```
/dev-clarify → /dev-spec → /dev-plan → /dev-implement → /dev-review → /dev-ship → /dev-accept
```

## 接入后的工作区

在目标项目运行 `/setup-workspace` 后，工作区长成这样：

```
<repo>/
├── .sdlc/                  # 流程基础设施（机器物）
│   ├── check.sh            # 门禁脚本
│   ├── config.sh           # 本仓库配置（用户所有，setup 绝不覆盖）
│   ├── hooks/              # L4 平台层拦截判定脚本
│   └── trackers/           # tracker 适配器（local/github/gitlab/codeup，可扩展）
├── docs/                   # 流程产物（人文物）
│   ├── METHOD.md           # 流程规则唯一来源
│   ├── needs/ specs/ designs/ tickets/ overviews/ reviews/ acceptance/ adr/ research/
│   └── standards/          # 编码标准（增量导入）
├── AGENTS.md               # sdlc 哨兵块
├── GLOSSARY.md             # 流程术语与项目术语
├── CODING_STANDARDS.md     # 编码标准索引 + 兜底基线
└── CHANGELOG.md            # 懒创建，仅需要发布流程的项目
```

- **九类产物各有固定状态机**（如 spec：draft → approved → done），frontmatter 是 check.sh 的解析依据；知识档进版本库，过程档（工票 / 评审 / 验收 / 总览）被 .gitignore 排除、验收后蒸馏清扫——审计链主承载为 tracker 投影与源码提交 `[#NNNN]` 引用。状态机详见 [METHOD.md](./METHOD.md) §5。
- **check.sh 常用子命令**：`phase` 全库状态总览；`frontier` 可开工的工票；`validate <file>` 产物模板与 FR 追溯校验；`publish <file>` 投影到 tracker；`all` 全量 lint/typecheck/test。提交走轻门禁（message 带 `[#NNNN]` 或 `[trivial]`），push 前走重门禁（implemented 工票必须有 approved 评审覆盖）。
