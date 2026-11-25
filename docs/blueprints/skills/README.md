# 技能入口主册（skills）

> 使用者群体：技能作者与维护者——32 个技能正源的设计与规格面。
> 设计真相源：[docs/sdlc-skills-blueprint.md](../../sdlc-skills-blueprint.md)（治理规则「先改文档再改技能」）；流程规则唯一来源：[docs/METHOD.md](../../METHOD.md)；技能清单：[docs/skills.md](../../skills.md)。

## 定位与边界（入口范围）

- **是什么**：`skills/` 正源 32 技能（sdlc 总控 / setup-\* / dev-\* 脊柱 / design-\* / ref-\* 参考层），安装器原样拷入目标项目；每技能 SKILL.md + references/ 自含。
- **不是什么**：不覆盖安装器（→ adoption 入口）、插件资产（→ plugins 入口）；不承载具体项目的轮次产物（need / spec / design / ticket 照旧归 docs/ 各目录）。
- **双态同步坑**：改 skills/ 内容后 docs/skills.md 技能清单与包内清单须同步，`verify-pack` 对账不过即拒绝发布。

## 模块面（本入口归属模块）

- `skills/`：32 技能目录（已清点：`ls -d skills/*/ | wc -l` = 32）。
- `docs/sdlc-skills-blueprint.md`：设计真相源——改任何技能前先改其对应规格。
- `docs/skills.md`：技能清单，与包内清单由 verify-pack 相等校验守护。

## 关键决策关联（入口决策）

流程域四决策（本套件行为设计；本仓库自宿主，即本仓库自身流程同受约束）：

- **过程档 gitignore 化 + 蒸馏清扫**——现状：知识档（need / spec / design / adr / research / standards）进库永久留存，过程档（ticket / review / acceptance / overview）自创建起被 .gitignore 排除、过程中盘上存在门禁照常，验收通过后随蒸馏清扫删除；收口 = 蒸馏折回 + 清扫 + spec 置 done 恰一个 `[trivial]` 原子提交。为什么：过程档提交持续稀释 git 历史；tracker 投影与源码 `[#NNNN]` 引用已可承载审计链，旧否决前提（审计链离开版本库即门禁失据）失效。取舍：存量过程档提交不回改；门禁只依赖盘上文件。superseded 链：替代 [ADR 0001](../../adr/0001-artifact-tiering-atomic-closeout.md)「过程档照常进库、验收后原子收口」。→ [docs/adr/0002-process-tier-gitignore-distill.md](../../adr/0002-process-tier-gitignore-distill.md)
- **运行 worktree 过程档物化**——现状：编排者建立任何运行/票 worktree 后立即把过程档目录复制进该 worktree（untracked、不进提交），工单 status 翻转是纯盘上操作、合回前由编排者同步到运行 worktree。为什么：`git worktree add` 不携带 gitignore 过程档，而门禁（validate / commit-msg / pre-push）全读当前目录盘上文件，不物化则门禁误拦一切 `[#NNNN]` 提交。取舍：物化清单 = 门禁输入目录全集，新增门禁输入目录须与清单同批成文（漏枚举的失败模式 = 门禁在 worktree 内 fail-loud 误拦）。→ [docs/adr/0003-run-worktree-process-materialization.md](../../adr/0003-run-worktree-process-materialization.md)
- **时间戳派生 ID 与单一原子取号**——现状：产物号 = `YYYYMMDD-4hex`，全部取号收敛到 check.sh `claim` 单一原子入口（排他创建占号、撞号重掷、按父产物参数拼装谱系前缀）。为什么：旧「每类独立、目录内最大号 +1」在清扫后号复用、多会话并发撞号。取舍：无中央计数器、无锁目录，唯一性由排他创建 + map/git 历史号双源查重保证；旧四位纯数字纪元止于存量产物，新旧格式可区分。→ [docs/adr/20261105-945d-timestamp-id-scheme.md](../../adr/20261105-945d-timestamp-id-scheme.md)
- **纯调研需求直达终态**——现状：`need.fulfilled` 增 dev-research / dev-clarify 两个记账出口，纯调研 need 不经 spec / 票 / 运行管道，报告交付即终态。为什么：报告走实现管道会被 dev-implement 纪律（红绿循环）执行、调研纪律（一手来源、引用与检索日期、防编造）全程不生效；不走管道此前又无合规终态路径。取舍：两态判据 = 报告之后是否还有实现交付物；实现前调研照常经管道。→ [docs/adr/20261124-4b4a-pure-research-need-direct-fulfillment.md](../../adr/20261124-4b4a-pure-research-need-direct-fulfillment.md)

## 入口专属术语节

（暂无——见[项目主册共享术语节](../README.md#共享术语节)。）

## 修订记录段

- v0.1 / 2026-11-25 / 立骨架：随四入口拍板首建。
