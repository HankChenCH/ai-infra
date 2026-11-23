---
id: 20261124-4b4a
status: accepted
created: 2026-11-24
---
# 20261124-4b4a: 纯调研需求直达终态——need.fulfilled 增 dev-research / dev-clarify 两个记账出口，调研报告退出实现管道

## 背景

三路归置「转调研」支原有逃生舱「变 FR（调研报告是交付物）」（need 0001 先例）：研究问题写成 FR，报告作为交付物流进 spec → 票 → dev-execute 运行，被 dev-implement 纪律（红绿循环）执行。后果是 dev-research 的调研纪律（一手来源、引用与检索日期、防编造）全程不生效，产出是训练记忆冒充的调研结论（need 20261122-c702 问题陈述）。

逃生舱退役后出现新问题：报告即全部交付物的纯调研需求，照常走管道就得为一份报告建 worktree、评审、合并；不走管道，则没有合规的终态路径——`need.fulfilled` 此前只有 dev-accept 一个推进入口。

## 决策

1. **调研归置分两态，判据 = 报告之后是否还有实现交付物**。实现前调研照常经 spec / 票 / 运行管道，报告只作 need 正文依据与 spec 输入；纯调研需求不经 spec / 票 / 运行管道。
2. **纯调研需求的终态 = need 置 fulfilled，按进入形态归位记账**。
   - 手动形态（need 已 confirmed 后由用户触发 dev-research）：报告交付后由 dev-research 出口请用户通读拍板，拍板通过后记账。
   - 就地联动形态（dev-clarify 调研驱动在澄清中就地触发，报告交付时 need 仍为 draft）：dev-research 只交付报告、不记账；结论回填 need 后定稿，拍板与记账在定稿之后由 dev-clarify 出口承载。
3. **拍板与记账口径同 dev-accept 路径对齐**。拍板 = 成功标准逐条核销、残余风险为空或经用户显式接受，沉默不算；拍板不通过 → 不记账，说明差距并停在拍板点。记账动作 = need `status` 改 `fulfilled`、追加 `fulfilled: <今日>`，重跑 validate 与 publish，`[trivial]` 留痕。
4. **记账是 dev-research「改动 need/spec 等其他产物」禁止事项的唯一例外**，且只动 `status` 与 `fulfilled` 日期，不代写正文；记账只对盘上已 confirmed 的对应 need 执行。
5. **报告带 need 谱系前缀，投影按 need 首次投影时序补投**。有对应 need 时取号带 `need <need-ID>` 父参数。适配器对带 need 前缀的知识档要求映射账本已有其需求单行，否则警告跳过；need 只在定稿时首次投影，所以 need 首次投影前产出的报告随 dev-research 出口的 publish 必然被跳过（属预期），由 dev-clarify 在定稿、need 首次 publish 之后补投，且早于纯调研记账（记账时聚合单随终态关闭）。

被否的方案：

- 为调研补 research 票型与 dev-execute 派发路由（need 20261122-c702 拍板 D2）：调研本不该进实现管道，补票型是给不存在的需求加机制，还要动 check.sh 的 type 枚举。
- 记账全留在 dev-research 出口：就地联动形态下报告交付时 need 仍是 draft，会对 draft 的 need 写 fulfilled，随后被 dev-clarify 定稿覆写回 confirmed。
- 状态表只记主路径（`need.fulfilled` 推进者只记 dev-accept）、回退 GLOSSARY 注记：蓝图 §6.1 自称「全流程单一真相」，留分叉即不自洽；回退会削弱已批准的验收场景。

## 后果

- **正**：调研报告永不成为工单，实现编排者名下票全是实现票；纯调研需求不为一份报告走 worktree / 评审 / 合并；选型与依赖判断的依据指得回带一手来源的报告（dev-spec 起草时读 need 名下带前缀的报告并注明报告编号）。
- **负**：`need.fulfilled` 不再只有 dev-accept 一个推进者。蓝图 §6.1、蓝图 §4.3、METHOD 两处及其分发副本、GLOSSARY、concepts 六个枚举点必须同批维护，漏一处即分叉；本轮以 `test/unit/research-linkage-static-guard.test.ts` 的镜像断言兜底。METHOD.md 因此偏离了 spec 原「零改动」非目标（开例外，范围仅两处推进者镜像）。
- **未实测**：报告向聚合单的投影、定稿后补投、need 已确认但从未投影时「先重发 need 再重发报告」。验收在 `TRACKER=local` 的沙箱里执行，三腿适配器行为均为读码结论，留首次真实使用时验证。
- **待观察**：纯调研报告经就地联动形态产出（记账归 dev-clarify 出口）只有静态守护，没有运行时实操；四条异常流（用户拒绝联动、dev-research 不可用、拍板不通过、dev-spec 显式提示）同理。

## 证据

- need 20261122-c702（confirmed），spec 20261123-c5e1（round 1）。成文落点：蓝图 v1.46（§4.3、§6.1、§8、§9、§11.4、§11.13、§11.14）、dev-clarify / dev-research / dev-spec 的 SKILL.md、GLOSSARY「纯调研需求」词条。
- 评审 20261123-ad31（票 20261123-9492）与 20261124-b40e（票 20261123-e5b2）：两条互不通气的评审轴在初审与复审中多次独立同判本决策的各个缺口——记账与禁止事项冲突、就地联动形态无落点、推进者镜像分叉、need 谱系前缀漏载、报告投影时序——逐条经 spec 运行中修订后核销。
- 验收 20261124-a369（passed，承载 = 合并候选）：场景二（手动形态）在隔离沙箱实操——need 取号与确认、dev-research 取号带 need 前缀、报告落盘、用户通读拍板、need 置 fulfilled、`validate` 通过、三笔 `[trivial]` 留痕；全程 tickets / reviews / acceptance / overviews 四目录 0 文件，无 spec。
- PR #346，合并提交 11d201f。
