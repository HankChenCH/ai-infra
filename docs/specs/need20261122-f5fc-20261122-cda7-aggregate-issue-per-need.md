---
id: 20261122-cda7
status: done
done: 2026-11-22
approved: 2026-11-22
need: 20261122-f5fc
round: 1
created: 2026-11-22
---
# github/gitlab 投影聚合化：need 建单、知识档与评审/验收/总览评论进单、票不投

## 问题陈述

TRACKER=github/gitlab 的项目里，一次需求开发的行为链被投影成十几个互相独立的 issue（need/spec/design/adr/research/票/评审/验收各一个），且回看演进要靠编辑历史——同一产物重投影是覆写正文（edit-in-place），旧版本只存在于平台编辑历史里。仓库主人无法在一个页面按时间线看完一次需求开发的全过程（need 20261122-f5fc 问题陈述与用户原话）。codeup 腿已用「need 建需求单 + 知识档评论」解决了同款问题，github/gitlab 腿按 need 拍板反转旧口径对齐。

## 方案

github/gitlab 适配器受理面照搬 codeup 适配器已实证的目录判定骨架，并按语义甲扩展：need → 建聚合单（一个 need 一个 issue）；带 need 谱系的知识档（spec/design/adr/research）→ 聚合单下追加评论；评审/验收/总览 → 同为评论进单；票与无谱系独立知识档 → 不投。时间线不可变：投影对象一经创建不再编辑，一切演进以追加评论表达。终态关闭只由 need 自身触发。聚合定位统一走「谱系前缀提 ID → 上溯 needID → 映射账本需求单行取单号」，评审以 spec 名义归属取得谱系（先例：票名义归属）。文档口径（METHOD §7.1 / GLOSSARY「投影」/ 蓝图修订）同批归一，删除「两腿分叉」表述。

本轮范围（分轮拍板 2026-11-22，用户确认）：need 20261122-f5fc 全量 FR-1…FR-8，github + gitlab 双腿同改；聚合定位采用「谱系前缀 + 需求单行」推荐方案。集成级实环境冒烟：github 腿本仓库可全链实跑；gitlab 腿无实环境，以替身契约面交付（A4 已接受），实环境补验留验收段处置。

## 用户故事

1. 作为仓库主人，我想要 need 确认后远端只出现一个聚合单，以便一次需求开发有唯一锚点。
2. 作为仓库主人，我想要 spec/design/adr/research 落盘后自动以评论出现在聚合单下，以便不跳转页面就能看到设计、调研与实施规格。
3. 作为仓库主人，我想要评审结论、验收记录、总览走查也进同一单，以便行为链的审查段同框可见。
4. 作为仓库主人，我想要票不进聚合单，以便单内时间线不被十几张实施票刷屏。
5. 作为仓库主人，我想要同一产物演进后重投影时追加新评论而非覆写，以便看到每次演进的时间线。
6. 作为仓库主人，我想要 need 到达终态时聚合单自动关闭，以便未收口的开发在远端保持打开。
7. 作为仓库主人，我想要存量 295 个历史 issue 原样留存，以便历史审计链不被迁移动作扰动。
8. 作为套件使用者，我想要投影失败只警告不阻断，以便出口链永远能走完（盘上真相源兜底）。

## 实现决策

1. **受理面按 docs/ 产物目录判定**（codeup 适配器骨架平移，与环境配置无关先判定）：docs/needs/ → 单形态；docs/specs/、docs/designs/、docs/adr/、docs/research/ → 知识档评论形态；docs/tickets/ → 不投（stderr 说明票审计留痕 = commit 引用）；docs/reviews/、docs/acceptance/、docs/overviews/ → 过程档评论形态；不在产物目录 → 警告跳过。文件名畸形 exit 1（调用错误）契约与正则不变。
2. **聚合定位链（need 风险 A2 拍板方案）**：知识档从自身文件名 `need<父ID>-` 前缀直取 needID；过程档从自身文件名 `spec<父ID>-` 单层前缀取 specID，按 specID 在知识档目录定位 spec 文件（spec 为知识档永不清扫），从其文件名 need 前缀提 needID；needID 查映射账本需求单行（docs/needs/ 行）取单号。链上任一环缺失（无 need 前缀、specID 定位不到 spec 文件、spec 文件名无 need 前缀、账本无需求单行）→ 警告跳过并指明缺哪一环。**定位只走需求单行**：需求单行两代语义第二列恒为自身单号，无新旧账本代际歧义，这是不引入行版本标记的关键。
3. **评审取得谱系 = spec 名义归属**：dev-review 取号从 `claim review <slug>` 改为 `claim review <slug> spec <spec-ID>`（名义归属——先例：票 20261122-61d2 名义归属 spec 0011，跨 spec 真实覆盖面仍由评审 frontmatter tickets 声明）；文件名获得 `spec<specID>-` 前缀后与验收/总览同链解析。check.sh 取号机制类型无关零改动；pre-push 覆盖校验只读 frontmatter tickets 零改动。评审真实覆盖跨 spec 票时名义归属任选其一（约定：归属被覆盖票的主 spec）。
4. **时间线不可变**：投影对象一经创建不再调用编辑接口——标题、正文永不修改；同产物（含 need 自身）重复投影一律追加评论。旧口径的 edit-in-place 行为废止。
5. **终态关闭触发面 = 仅 need 形态**（codeup 同款收敛）：知识档/过程档分支追加评论后即退出，不读终态、不调关闭；need 形态终态集合与关闭语义不变（GLOSSARY 终态 → completed + 注评；rejected → not_planned；已关再关非零留痕不阻断）。
6. **映射记账语义**：need 行第二列 = 自身单号；知识档/过程档行第二列 = 承载需求单号（codeup.map 既有语义平移）；本产物行已存在时不重复记账、不回改旧行内容（旧代际行第二列=旧自身单号，留存不迁移，FR-7）；评论形态行第三列留空（codeup 同款）。
7. **正文形态与限额**：指针行 + 全文、超 60000 字节截断注记（现行形态不变）；评论正文与单正文同构。
8. **失败契约不变**：配置缺失 / gh·glab 缺失 / 未认证 / API 非零 / 编号解析失败 → 明确警告 exit 0 不阻断；新增的定位链解析失败同款。
9. **文档口径同步**（先改文档再改技能）：METHOD 总原则「审计链主承载」句改为——知识档与评审/验收投影承载于聚合单评论，票审计留痕 = commit `[#N]` 引用；METHOD §7.1 受理面表改为三腿统一描述（GitHub/GitLab 独立 issue 分叉表述删除）；GLOSSARY「投影」词条同步；蓝图 v1.x 修订记录补条（§5.4 publish 行 / §11.1 决策① / §14 tracker 落地条目）。dev-review 取号话术与技能正文同步（决策 3）。
10. **无设计产物偏离记录**：本 spec 无 analyzed design（need 未走 /dev-design），实现决策自 need FR 与本节拍板推导，无设计快照可偏离。

## 测试决策

- **seam：适配器进程级替身**——假 gh / 假 glab 可执行文件 PATH 前置，记录调用序列（方法/参数/数据）后回预制输出；断言调用面、退出码、stderr 文案、映射文件副作用。先例：`test/unit/codeup-adapter-stub.test.ts`（11 例，替身只钉替身契约、期望值独立来源 = spec 验收场景字面契约，stub-fidelity-integration 纪律）。双腿各一测试文件，结构镜像。
- **现状盘点（实证）**：github.sh / gitlab.sh 现行零测试引用（test/ 全树 grep 无命中）——无旧断言迁移负担，全部新增。
- **静态同步断言**：METHOD §7.1 受理面表 ↔ 双适配器头注 ↔ 技能 publish 话术一致性；先例 `test/unit/codeup-projection-sync.test.ts`（其断言面涉 §7.1 话术与「github/gitlab 腿零改动」表述，实现期同批重指向新口径）。
- **集成级人工段**：github 腿在本仓库真环境全链冒烟（替身无法背书真实平台资源语义）；gitlab 腿无实环境（A4），补验路径留验收段拍板。

## 验收场景

- [FR-1 | 工单级] Given 无映射的 confirmed need，When publish，Then 新建聚合单（标题 = 一级标题，正文首行盘上指针行），映射账本新增需求单行（第二列 = 单号）。
- [FR-1 | 工单级] Given 已映射的 need 第二次 publish（内容演进），Then 追加一条评论，不调用编辑接口、不新建单、映射账本不变。
- [FR-2 | 工单级] Given 带谱系 spec 且其 need 已映射，When publish，Then 对应聚合单追加一条评论（指针行 + 全文），账本新增本产物行（第二列 = 需求单单号）。
- [FR-2 | 工单级] Given 已记账的 spec 演进后再次 publish，Then 追加新评论（平台侧旧评论保留），不重复记账。
- [FR-3 | 工单级] Given acceptance / overview 产物（文件名 `spec<父ID>-` 前缀）且定位链成立，When publish，Then 需求单下追加评论。
- [FR-3 | 工单级] Given review 产物（名义归属 spec，文件名同形态），When publish，Then 同链追加评论至聚合单。
- [FR-3 | 工单级] Given docs/tickets/ 产物，When publish，Then stderr 明确说明「票不入聚合投影，审计留痕 = commit 引用」exit 0，零平台调用、账本不变。
- [FR-4 | 工单级] Given 无 need 谱系前缀的独立知识档，When publish，Then 警告跳过 exit 0。
- [FR-5 | 工单级] Given need status=fulfilled，When publish，Then 聚合单以 completed 关闭并附注评。
- [FR-5 | 工单级] Given need status=rejected，When publish，Then 聚合单以 not_planned 关闭。
- [FR-5 | 工单级] Given 知识档 status=approved，When publish，Then 只追加评论，负向断言零关闭调用（触发面仅 need 形态）。
- [FR-5 | 工单级] Given 聚合单已关闭，When 再 publish 终态 need，Then 关闭调用非零按失败留痕 stderr，exit 0。
- [FR-6 | 工单级] Given 各形态产物首轮投影，When 检查账本，Then need 行第二列 = 自身单号、评论形态行第二列 = 需求单单号、评论形态行第三列留空；已有行不重复记账。
- [FR-7 | 工单级] Given 账本存在旧代际行（知识档行第二列 = 旧自身单号），When 重投该知识档，Then 定位走向需求单行（评论落聚合单），旧行内容不回改、不迁移。
- [FR-8 | 工单级] Given 交付完成，When 运行文档同步静态断言，Then METHOD §7.1 受理面表、GLOSSARY「投影」词条、双适配器头注、dev-review 取号话术四处口径一致且与「两腿分叉」表述不再共存。
- 异常流（定位链缺环，逐环枚举）：
  - [FR-2 | 工单级] Given 知识档 needID 在账本无需求单行，When publish，Then 警告跳过并指明「先投影对应 need」exit 0。
  - [FR-3 | 工单级] Given 过程档 specID 在知识档目录定位不到 spec 文件，When publish，Then 警告跳过并指明缺失环节 exit 0。
  - [FR-3 | 工单级] Given 过程档定位到的 spec 文件名无 need 前缀（legacy 链），When publish，Then 警告跳过并指明「legacy 产物链不解析」exit 0。
- 异常流（既有契约保持）：
  - [FR-1 | 工单级] Given gh / glab 缺失、未认证或 API 非零，When publish，Then 明确警告 exit 0，出口链不受影响。
  - [FR-1 | 工单级] Given 建单输出无法解析出编号，When publish，Then 警告跳过（不记账，重发不重复创建不保证——警告文案指明人工核对）。
  - [FR-1 | 工单级] Given 文件名不符合产物命名正则，When publish，Then exit 1（调用错误，非警告跳过）。
  - [FR-1 | 工单级] Given 正文超 60000 字节，When publish，Then 截断并附注记，投影不因超限失败。
- 集成级：
  - [FR-2 | 集成级 | 人工：真实 GitHub 资源不可入自动化（会污染真实仓库投影记账），由验收会话在本仓库真环境冒烟] Given TRACKER=github 真环境，When 依次 publish need → spec → review → 终态 need，Then 聚合单、评论时间线、终态关闭在平台侧如实可见。
  - [FR-2 | 集成级 | 人工：gitlab 腿无实环境配置（need A4 已接受），替身背书契约面，实环境冒烟待具备环境时补验] Given TRACKER=gitlab 环境，When 同链冒烟，Then 同款结果；环境未配置期间本条保持开放，处置归验收段显式拍板。

## 非目标

- codeup 腿零改动（need 拍板 D6：已聚合，本轮是反向对齐）。
- 存量 295 个 issue 与旧代际账本行的迁移 / 删除 / 回改（need 拍板 D4）。
- 票投影（含评论形态兜底，need 拍板 D5 语义甲）。
- 中间态流转（仅终态关闭，need 拍板 D3）。
- 平台 → 盘上回读 / 双向同步（need 0002 既有非目标延续）。
- 评论删除 / 编辑等投影外互动（need 0002 延续）。
- check.sh publish 接口与判定树变更（受理面变化全部收在适配器内；三级判定树、警告跳过契约照旧）。
- legacy 四位 ID 产物链的定位支持（警告跳过即终态，FR-7 存量不动推论）。
- 界面交付（纯适配器与文档改造，无界面——dev-spec 出口建议条款不适用）。

## 备注

- 输入：need 20261122-f5fc（confirmed 2026-11-22），round 1；分轮范围与 A2 定位方案经用户显式拍板（同日），评审名义归属先例 = 票 20261122-61d2 名义归属 spec 0011。
- 实证记录：cmd_claim 父前缀为单层 `<父类型><父ID>-`（check.sh 取号实现直读）；acceptance/overview 现行取号已带 spec 父参数（dev-accept / dev-overview 技能正文），review 现行无父参数（dev-review 技能正文，注释「父为过程档不带前缀」）——决策 3 只改 dev-review 一处；github.sh / gitlab.sh 结构同构、现行零测试引用；`codeup-projection-sync.test.ts` 断言面涉 §7.1 与「github/gitlab 腿零改动」话术，实现期同批重指向（测试决策已记）。
- 风险回指：A1 评论量（票不进单消除最大膨胀源）；A2 定位链（本 spec 决策 2/3 收敛为已拍板方案，残余风险 = 链条多一跳 glob，替身测试覆盖）；A3 票审计留痕转 commit 引用（METHOD 同步消解悬空陈述）；A4 gitlab 实环境（集成级人工条目开放处置）。
