# @hankchen/dsh-mcp 维护者笔记

本文档面向本仓库维护者：实现决策、已知边界、故障排查与恢复配方。**不随 npm 包分发**（不在 package.json `files` 清单），因此不会出现在 dsh 插件介绍页；面向使用者的说明见 [README.md](./README.md)。

## 挂载机制

包自带 `cordis.patch.yml` 随 profile 加载，插入两行：

- 官方 MCP 管理器 `@deepseek-ai/dsh-mcp-manager` 的补位挂载行——官方只在 Web/Desktop profile 预挂该管理器，headless/sdk/acp 自定义 profile 由本插件的挂载行补位；
- 本插件模块行（id `dsh-mcp-manage`）。

本插件不携带 manager 依赖副本（可选 peer 声明，见下「manager 解析版必须与宿主运行时同 rc」条），该模块的解析可用性由安装途径保证。

## 已知边界

- **官方兼容星座未定（2026-11-18 核验，票 20261118-2d72）**：官方 `@deepseek-ai/dsh-mcp-manager` 0.2.2-rc.2+ 的 peer 精确钉同 rc 兄弟套件，要求宿主 dsh ≥ `0.2.2-rc.2`；官方 npm `latest` 标签仍是 `0.2.2-rc.1`（rc.2+ 已发布于 `next` 标签，`latest` 未跟进）。本插件因此声明 `engines.dsh >=0.2.2-rc.2`——装进 latest（rc.1）宿主 profile 会被版本声明显式拒绝，属预期 fail-loud 而非缺陷。官方发布兼容星座后无需改插件即可直装。（2026-11-19 补充：manager 解析版与运行时对齐是另一独立风险面，见下条——范围钉版不保证跨宿主成立，钉版策略修订归 ADR 通道。）
- **manager 解析版必须与宿主运行时同 rc（2026-11-19 desktop 实证；插件已剥离依赖副本）**：宿主 boot 兼容门按 peer 精确钉同 rc 校验 manager，失败即**静默禁用 manager 行——连官方预挂行一起**。事故形态：本插件曾以 `dependencies` 携带 `@deepseek-ai/dsh-mcp-manager: ^0.2.2-rc.2` 副本，该副本被 profile 的 `minimumReleaseAge` 供应链门解析到**最老满足版**（desktop 实解为 rc.2）而运行时已前移（desktop 实跑 rc.5），插件依赖副本劫持了官方预挂行的模块解析——现已改用可选 peer 声明（任何安装形态装完本插件，profile 依赖树不再出现 manager 副本），副本劫持路径就此消除；manager 版本供给责任移交安装途径（官方直装恢复配方见下，初始化器装后核验另见套件文档）。症状三联征（排查同类故障仍适用）：`/mcp` 不被命令面板识别、右栏面板报 "no active Remote method exports this endpoint"、插件管理器视角本体行 fiber `pending`——此时 devtools console 无错、`--dump-config` 合成树一切正常，金标准证据只在 boot 日志：`dsh: disabling profile plugin row "mcp-manager": … incompatible with dsh …`。恢复配方：profile 的 `pnpm-workspace.yaml` 加 `overrides` 把 manager 钉到运行时同版 → 重装 profile 依赖 → 插件管理器开关重载（`plugin_manager set_plugin` 或 GUI）。
- **合成树 ≠ 运行时状态，装成 ≠ 跑得起来**：`--dump-config` 里行 `disabled: false` 不代表运行时启用——插件管理器的持久开关与 boot 兼容门禁用都作用在合成层之上（兼容门禁用时开关报 `overridden`）；客户端 bundle 只随页面加载注入，Host 行激活经开关重载或重启 app 生效。
- **`desktop` profile 直装已放行，初始化器仍拒装**：官方 CLI 对 desktop 的插件管理（`dsh plugin --profile desktop add/remove`）2026-11-19 实证放行（boot/dump 类 profile 级操作仍归 Electron app 独占）；套件初始化器按 2026-11-15 查证结论（need 339e F4）仍在执行前拒装 desktop（`RESERVED_PROFILES`），源码修订走正式通道，暂可经官方命令绕过。
- **安装链路的 registry 访问**：插件安装链路比技能安装多三处 npm registry 访问（npx 拉官方 CLI `@deepseek-ai/dsh`、装本插件包、profile 依赖经 pnpm 安装）。面向使用者的镜像/代理配置方法见 README「网络要求」。

## 使用面速查（改命令/工具/面板前先对这里）

- `/mcp` 子命令与值解析边界：`index.ts` `MCP_USAGE` / `parseAddOptions`（`--` 之后全归位置参数；值含引号添加期拒收）。
- `mcp_manage` 工具参数面：`index.ts` `MANAGE_TOOL_PARAMETERS`（dsh-tools 支持的 JSON Schema 关键字子集）。
- 右栏面板行为与按钮矩阵：`client/index.ts`（failed 行「重试」= restart、disabled 行「探测」= probe；编辑里 transport 只读）。
- 测试：`test/unit/dsh-mcp-plugin.test.ts`、`test/unit/dsh-mcp-dock-readonly.test.ts`（替身契约钉死注释见各文件头）。
