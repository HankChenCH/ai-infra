# 接入入口主册（adoption）

> 使用者群体：目标项目维护者——把 `@hankchen/infra` 的资产装进自己的 git 项目、接 `.sdlc/check.sh` 门禁、日常使用 32 技能。
> 安装步骤以使用者文档 [docs/getting-started.md](../../getting-started.md) 为准，本册管设计面与施工装载。

## 定位与边界（入口范围）

- **是什么**：安装器 CLI（`npx @hankchen/infra` 子命令面）——双侧对称六动词 `skill add [名...] [--all]` / `plugin add [名...] --profile <名>` / `remove`（别名 rm）/ `list`（别名 ls）/ `list-remote`（别名 ls-remote，纯读零落盘）。技能安装三件套：技能实体整目录拷入 `.agents/skills/<名>/` + 对项目内已存在 agent 目录（`.claude`、`.zcode` 等）建相对软链 + `.infra-lock.json` 记账（包版本 + 逐技能指纹）。装完后 `/setup-workspace` 接门禁。
- **不是什么**：不覆盖安装器源码的开发与发版（→ maintenance 入口）；不覆盖技能本身的流程设计（→ skills 入口）；不覆盖插件宿主侧契约细节（→ plugins 入口）。
- **硬前置**：两步接入顺序固定——先装技能、后 `/setup-workspace`；只装技能不接门禁时点名流程技能会在入口被校验拒绝（技能停下提示先运行 /setup-workspace）。

## 模块面（本入口归属模块）

`bin/infra.ts` 为装配壳（读版本、装配、派发）+ `src/` 三层（ADR af69）：

1. **程序装配层** `src/program.ts`——commander 程序组装、子命令注册（每命令恰一处）、顶层/逐命令帮助、未知命令/未知旗标契约文案。
2. **命令定义层** `src/commands/<命令>/`——每子命令一目录（index 注册工厂 / add 动词 / names 校验纯函数 / run 共享运行时）；上下文一律经叶模块 `src/context.ts` 取（包根/版本单点），命令间互不依赖，禁反向 import 装配层。
3. **安装内核层** `src/kernel/` 十模块——asset-map（「资产类型 → 安装机制」映射表，新增资产类型 = 加行不改流程代码）、installer（技能整目录替换拷贝 + agent 目录软链）、plugin-install（官方 `dsh plugin` 命令转发编排，单条失败即中止并报已完成/未完成清单）、catalog（包内资产编目）、lockfile（`.infra-lock.json` 记账）、reconcile（插件装后对账 profile 两落点）、agent-dirs、dsh-command、dsh-profiles、menu。

分层契约由 `test/unit/command-layers.test.ts` 静态守护（内核零上行导入、命令目录注册恰一处）；扩展口径 = 新增子命令加目录 + program.ts 注册一处，内核与既有命令零触碰。

## 关键决策关联（入口决策）

- **src 三层分层与子命令扩展口径**——现状：三层分层 + 「新增子命令 = 加命令目录 + 装配层注册一处」机械化。为什么：bin 曾 299 行集五事一身、src 11 模块平铺无层次，维护者预判命令会增多需防腐化（need 20261115-fc48 拍板 D9）。取舍：分层契约不靠约定靠测试静态守护；旧旗标顺序状态机与两层菜单硬切退役、不留兼容层（need D3 拍板）。→ [docs/adr/20261116-af69-infra-src-command-layering.md](../../adr/20261116-af69-infra-src-command-layering.md)
- 跨入口决策（包根 = 仓库根、TS 双形态）见[项目主册「关键决策关联」](../README.md)。

## 入口专属术语节

（暂无——现有 55 条全批判共享，见[项目主册共享术语节](../README.md#共享术语节)；新术语经 dev-clarify 登记，判属争议亮牌。）

## 修订记录段

- v0.1 / 2026-11-25 / 立骨架：随四入口拍板首建。
