# 插件入口主册（plugins）

> 使用者群体：dsh 宿主插件维护者——`agents/dsh/plugins/` 插件资产的安装与维护。
> 规范：[docs/plugin-assets.md](../../plugin-assets.md)。

## 定位与边界（入口范围）

- **是什么**：第二类套件资产 **agent 插件**——面向特定 agent 宿主的扩展包，两级布局（`agents/<宿主>/plugins/<插件>/`），以宿主官方插件格式分发；当前宿主 DeepSeek Harness（dsh），插件为 dsh-demo（demo 兼维护者模板）与 dsh-mcp；安装经官方命令 `dsh plugin --profile <名> add <包>` 转发（安装编排见 adoption 入口 kernel/plugin-install，装后 reconcile 对账 profile 两落点：package.json 依赖行 + `dsh.profile.bundles` 数组行）。
- **不是什么**：不覆盖安装器编排实现（→ adoption 入口）；dsh 本体是外部开源项目（npm 包 `@deepseek-ai/dsh`），本仓库只管自家插件资产。

## 模块面（本入口归属模块）

- `agents/dsh/plugins/`：dsh-demo、dsh-mcp（bundle 形态：package.json 声明 `dsh.bundle.patch` 指向随包携带的 cordis.patch.yml，按包名引用自己）。
- 校验面：`scripts/verify-bundle.ts`（bundle 清单双态口径判定单点 `collectBundleDefectsFor`：源码态 .ts main 语义合法 / 发布态 .js tarball，发布态 .ts 形态常驻拒绝）。

## 关键决策关联（入口决策）

- **dsh web 组合 MCP 管理面组合派生契约**——现状：web 组合下插件不自带 `id: mcp` manager 行（让位官方 mcp-manager 行）、settings ns 随 loader entry id 派生（web 组合 = `mcp-manager`）、gateway client api 写通道 `[ns, patch/ops, expectedRevision]` 三参必传。为什么：官方 web bundle 自带 manager 行（无条件自带即 boot duplicate 失败）、ns 派生拒硬编码、`prepareInvocation` 按参数个数严格数参——sdk/headless 契约在 web/desktop 组合实证不成立。取舍：组合派生契约而非统一常量；两层测试面（线层 e2e + 替身单测）双双漏过的教训已折回。→ [docs/adr/20261118-6037-dsh-web-combo-mgmt-contract.md](../../adr/20261118-6037-dsh-web-combo-mgmt-contract.md)
- **官方发布星座错位期间插件依赖策略**——现状：如实钉版 fail-loud + 集成前置门兜底（兼容星座真跑四条件 skip 留因）。为什么：覆盖式范围声明掩盖宿主/依赖不兼容。取舍：superseded 链——本 ADR 决策 1（插件 dependencies 携带 manager 副本 + peer 精确钉同 rc）已被 [ADR 20261120-5606](../../adr/20261120-5606-dsh-mcp-manager-supply-at-install-time.md) 取代，集成前置门条款保留不变。→ [docs/adr/20261118-ad91-dsh-ecosystem-pin-fail-loud.md](../../adr/20261118-ad91-dsh-ecosystem-pin-fail-loud.md)
- **dsh-mcp manager 供给责任移交安装流**——现状：插件 package.json 不携带 manager 依赖副本（兼容意图以可选 peer 表达），安装器 `plugin add` 装后对目标 profile 做就绪核验（探测运行时 dsh 版本对账 manager 解析版，非精确同版即退出非零并输出三段可复制处方）；verify-bundle 固化「dependencies 携带 manager 即缺陷」常驻拒绝门（源码态与发布态同查）。为什么：desktop profile 实证 manager 副本被宿主 boot 兼容门静默禁用——宿主强制 manager ≡ 运行时同 rc，发布期静态范围无法跨宿主版本保证。取舍：核验失败中断安装流（fail-loud），修复依赖用户执行处方；manager 版本决策移到安装时点（可观测运行时）。→ [docs/adr/20261120-5606-dsh-mcp-manager-supply-at-install-time.md](../../adr/20261120-5606-dsh-mcp-manager-supply-at-install-time.md)

## 入口专属术语节

（暂无——见[项目主册共享术语节](../README.md#共享术语节)。）

## 修订记录段

- v0.1 / 2026-11-25 / 立骨架：随四入口拍板首建。
