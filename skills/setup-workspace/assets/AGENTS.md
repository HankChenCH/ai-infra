# AGENTS.md

## 项目速览

<!-- 项目速览区归项目维护者续写；下方蓝图指针行是新项目开箱预置位（哨兵块外，非哨兵区），蓝图未诞生前保持占位，蓝图诞生后由 dev-blueprint 回填入口索引 -->
- 项目蓝图：docs/blueprints/（入口索引：<主册文件路径>——单入口退化形态，多入口结构 round 2 启用）

<!-- sdlc:begin 由 setup-workspace 管理，勿在此块内手改 -->
## 开发流程（强制，不可协商）
完整规则见 docs/METHOD.md，术语与状态定义见 GLOSSARY.md。
- 改动源码前必须存在 status: approved 的 spec 与对应工单；小修走 [trivial] 豁免（retro 审计）。
- 提交必须通过 .sdlc/check.sh；禁止 --no-verify。
- 评审标准轴依据 CODING_STANDARDS.md 及其索引的 docs/standards/ 文件。
- 不确定当前阶段就运行 /sdlc，不要凭记忆推进。
<!-- sdlc:end -->
