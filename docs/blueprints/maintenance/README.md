# 维护入口主册（maintenance）

> 使用者群体：本仓库维护者——改发布面、发版、守护门禁与测试基线。
> 维护者文档：[docs/maintainer-guide.md](../../maintainer-guide.md)。

## 定位与边界（入口范围）

- **是什么**：发布面（`scripts/`）、测试基线（`test/`）、自宿主门禁（`.sdlc/`）、包清单与编译拍板（`package.json` / `tsconfig.json`）。发布链 = `pnpm pack`（prepack 编译 → postpack 还原仓库树）→ `pnpm run verify:pack <tgz>`（发布对账门：技能清单相等 / 插件清单相等 / 禁含 node_modules 三查，不过即拒绝发布）→ `npm publish <tgz>`（prepublishOnly publish-gate 结构性拒绝目录直发）。
- **不是什么**：不覆盖安装器内核设计（→ adoption 入口）；不覆盖技能正源内容与规格（→ skills 入口）。
- **自宿主**：本仓库自己跑同一套门禁流程（`node .sdlc/check.sh phase|frontier|validate <file>|publish <file>|all`），提交必须过门禁、禁 --no-verify；tsconfig include 覆盖 src/bin/scripts/test/agents。

## 模块面（本入口归属模块）

- `scripts/`：prepack.ts / postpack.ts（打包前把 src/bin 编译为同路径 .js 进 tarball、打包后还原仓库树）、verify-pack.ts（发布对账门）、verify-bundle.ts（插件 bundle 清单校验）、publish-gate.ts（发布门）。
- `test/unit`、`test/e2e`：node:test（e2e 含 expect 驱动的交互安装测试）；`pnpm test` = unit + e2e；`pnpm run typecheck` = tsc --noEmit。
- `.sdlc/`：check.sh、config.sh、hooks、trackers 适配器。
- `package.json`：files 白名单、engines node ≥ 24.9.0、packageManager 钉 pnpm 12.15.0（engines 与 .nvmrc 的一致性由 `test/unit/node-baseline.test.ts` 守护）；`tsconfig.json` 头部注释是编译拍板权威记录，改动前先读。

## 关键决策关联（入口决策）

- 入口暂无专属 ADR；跨入口决策（包根 = 仓库根、TS 双形态——发布面形态直接约束本入口的发布链与编译还原机制）见[项目主册「关键决策关联」](../README.md)。

## 入口专属术语节

（暂无——见[项目主册共享术语节](../README.md#共享术语节)。）

## 修订记录段

- v0.1 / 2026-11-25 / 立骨架：随四入口拍板首建。
