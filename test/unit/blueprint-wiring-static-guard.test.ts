// 蓝图接线静态锚定断言（spec 20261124-6c73 实现决策 14 / 测试决策 seam，票 20261124-6891；
// v1.49 深化扩围：spec 20261124-7e10 实现决策 10，票 20261124-58b8 治理先行 + 票 20261124-2df8 技能落盘）。
//
// 守护边界（哪些文件哪些句受守护）——被守护文件九份，正向锚 = spec「验收场景」关键句
// 字面（期望值独立来源，非实现推导），受守护文本再变时本测试与文档同批改：
// - docs/sdlc-skills-blueprint.md §11.25 dev-blueprint 条目：诞生亮牌两态句（FR-1/FR-2）、
//   权威序句与 ADR accepted 亮牌句（FR-8）、术语迁册句与归属模糊亮牌句（FR-9，v1.49
//   升级共享术语节）、落册判定三支与修订记录追加行句（FR-8）、拆册与对账句（FR-6）、
//   按入口装载三支句（FR-7，v1.49 治理先行修订升级，票 20261124-58b8）。
// - skills/dev-blueprint/SKILL.md：权威序句、术语迁册句、拆册对账三句、AGENTS 蓝图指针
//   写入非哨兵区句（FR-6/7/8/9）；v1.49 深化锚（票 20261124-2df8，spec 20261124-7e10
//   验收场景字面）：入口目录结构句与 entry_slug 句（FR-1）、主册七段句与单入口退化句
//   （FR-1/E2）、共享面判定句与归属列句（FR-2）、按入口装载三支句与装载对照发现即写行句
//   （FR-3/FR-4）、回写自查未消解行句（FR-4/E3）、标记行区行格式与消解留痕句（FR-5）、
//   术语归册句（FR-6）、多入口 AGENTS 指针句（FR-1）、E1 入口判定句。
// - skills/dev-design/SKILL.md：诞生亮牌句 + ADR accepted 亮牌句（FR-1/FR-8）。
// - skills/setup-reconstruct/SKILL.md：出口蓝图诞生亮牌句（FR-2）。
// - skills/dev-accept/SKILL.md：蒸馏第五路句、修订记录追加行句、落册判定三支（FR-8）、
//   蓝图册按需装载句（实现决策 11）。
// - skills/dev-implement/SKILL.md：开工装载句与「模块地图」登记载体句（FR-7）。
// - skills/dev-review/SKILL.md：蓝图册按需装载句（实现决策 11）。
// - skills/dev-clarify/SKILL.md：新术语双语态登记句（FR-9）。
// - skills/setup-workspace/assets/AGENTS.md 模板：蓝图指针行 + 非哨兵区定位（FR-7）。
//
// 比对形态：正向 = 去空白后字面 includes（受守护 Markdown 有硬折行，全文与锚词两侧同规
// 去空白）；负向 = 去空白后零命中（收编 ADR 条为负向后视正则零匹配，见下）；双份断言 =
// 机械 diff（逐字相等，不去空白）。红证义务（docs/standards/static-anchor-guard.md 纪律 5）：
// 每个正向锚逐处删除须红、每个负向锚逐个写回须红，证据记票 Progress——本测试落盘时的
// 反向审计已在票 20261124-6891 执行；v1.49 扩围锚（蓝图规格行新锚 + dev-blueprint SKILL.md
// 深化锚 + 负向新锚）的反向审计在票 20261124-2df8 执行。
//
// 读取面口径（正向与负向分离，docs/standards/static-anchor-guard.md 纪律 3）：
// - 蓝图正向锚只打规格行——整块剔除头部修订块（自 `> 版本 ` 行起、至首个 `## ` 标题之前）。
//   v1.47 修订记录逐字复述了 §11.25 的大部分新句：读全文的话规格行回退后正向断言假绿。
//   定位点缺失或剔除后仍留修订记录行即抛错，不让读取面静默退化成全文。
// - 蓝图负向锚打全文（含修订块）——反转句在蓝图任何位置都不该出现；v1.46 ⑧ 既定口径。
// - 技能与 assets 文件无修订记录结构，正负向都打全文。
//
// 负向守护面 = 蓝图全文 + dev-blueprint SKILL.md 全文：权威序、拆册、收编三条纪律的
// 规则文本只在这两处承载；其余接线技能只引用联动亮牌、不载规则本体，不在负向面
// （清单非穷尽声明：未来若有新文件载入这三条纪律，负向面须同批扩围）。负向锚取
// 稳定子串（spec E1 / FR-5 / FR-6 负向字面）：「以蓝图为准」（反转句「以蓝图为准压倒
// 轮次产物」的稳定核）、「自动拆册」、「撤 docs/adrs」。v1.49 扩围负向锚（spec 20261124-7e10
// 实现决策 10）：「自动建入口」（E1 反转「不经拍板自动建入口」的稳定核）、「代改蓝图册」
// （「检测者代改蓝图册内容」反转句的稳定核）、FR-7 旧单态装载句退役锚「命中 → 装对应
// 模块册 + 主册」（带箭头整句形态——蓝图 v1.47 修订记录的历史引文「命中装对应模块册 +
// 主册」无箭头，不受误伤）。「收编 ADR」不能裸用——两处禁止形态「不收编 ADR」
// （dev-blueprint 禁止事项与蓝图 §11.25 禁止事项）含该子串，裸零命中会把合法禁止文本
// 误判为反转；改用负向后视正则 `(?<!不)收编ADR` 打去空白全文：「不收编 ADR」豁免，
// 其余任何非禁止形态（含「蓝图收编 ADR」与删「不」翻面）即命中变红。同手法扩围：E1
// 负向「代挑」不能裸用——正向句「禁止代挑」含该子串，改用 `(?<!禁止)代挑` 打 dev-blueprint
// SKILL.md 去空白全文；此锚只打技能面不打蓝图面（蓝图 §11.25 禁止事项行「替用户拍板或
// 代挑入口候选与术语归属」是合法禁止语义但无「禁止」紧邻前缀，入面会误红；spec E1
// 负向场景的检索对象即技能文本）。
//
// 同句多份镜像的守护边界：
// - dev-design 同文件两处「建议调 dev-blueprint」（§5.1 诞生亮牌 / §5.2 ADR 亮牌）——
//   各钉带区分后缀的独占字面（「…立骨架」/「…待回写」），删任一份必红。
// - dev-accept 全文仅蒸馏段一份含「主册修订记录段追加一行」（description 只写
//   「蓝图回写折册」，未复述裸句）——蒸馏段那份钉独占字面「按落册判定折进对应册 +
//   主册修订记录段追加一行」，删蒸馏段必红；同句镜像在 dev-blueprint SKILL.md 两处
//   （description 第 3 行 + 正文），不在本锚词面。
// - dev-blueprint SKILL.md 的权威序句 / 指针句在 description 与正文各一份，拆册三句中
//   「亮牌建议拆 + 用户拍板」仅正文 §3.4 一份（description 为变体无「+ 用户拍板」）——
//   spec 验收场景只点名「检索 SKILL.md 含句」未点名节位——钉全文至少一份在场
//   （单份句删之即红、双份句两份全删才红），此局限在此声明；dev-design / dev-clarify
//   场景同样未点名节位，同口径。v1.49 深化锚（评审 20261124-f96e 勘误头注）：正文锚
//   取带独占前后缀的长字面，description 短镜面无一满足长锚（长独占字面不在 description
//   复述面），正文份删之即红——无 description 兜底容忍；真实存在的镜像容忍仅
//   「标记行是元数据不是蓝图内容」正文两份（§1 / §4），删任一份仍绿、两份全删才红；
//   E1 句长锚全文恰一份（§3.1；description 虽含「禁止代挑」字样但无该长句），删之即红。
// - 不在实现决策 14 锚词清单（票面守护面）里的验收场景句本轮没有守护（如 FR-2 存量
//   入口识别句、FR-3 入口判定句、FR-4 主册五节清单、FR-5 决策关联叙述句、E1 漂移信号
//   正向语义、E4 入口候选句——本轮锚词面之外，留后续治理票按需扩围）。
//
// 双份资产断言（运行中修订 2026-11-24 归置本票，评审 20261124-17be F1）：根版 AGENTS
// 哨兵块逐字一致断言——generation.md §2「AGENTS.md 收口」固定文本代码块 ↔
// assets/AGENTS.md 哨兵块（`<!-- sdlc:begin` 至 `<!-- sdlc:end -->` 含标记行）机械 diff，
// 不等即红；提取失败（定位点缺失、块形态异常、哨兵块多份）一律抛错不静默。成员版
// 哨兵块的结构性防漂移由 setup-workspace e2e 承载（legacy_stream 夹具从 generation.md
// 成员小节提取落装，固定文本与文档不可能漂移），不在本测试面。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string): string => fs.readFileSync(path.join(packageRoot, rel), 'utf8');

/** 读取面：label 进失败信息（哪个文件、哪种读取面），text 是全文。 */
interface Surface {
  label: string;
  text: string;
}

const loadSurface = (rel: string): Surface => ({ label: rel, text: read(rel) });

const blueprintRel = path.join('docs', 'sdlc-skills-blueprint.md');
const blueprint = read(blueprintRel);
const blueprintFull: Surface = { label: `${blueprintRel}（全文，含修订块）`, text: blueprint };

/**
 * 蓝图规格行读取面：整块剔除头部修订块——自 `> 版本 ` 行起、至首个 `## ` 标题之前。
 * 读取面不可信时一律抛错，不让它静默退化成全文：
 * - 定位点缺失或次序颠倒；
 * - 剔除后仍有修订记录行——修订块整体挪去了别处，或版本行与修订记录之间插进了二级标题。
 * （手法先例：research-linkage-static-guard.test.ts 同名函数。）
 */
function blueprintSpecText(full: string): string {
  const lines = full.split('\n');
  const blockStart = lines.findIndex((line) => line.startsWith('> 版本 '));
  const blockEnd = lines.findIndex((line) => line.startsWith('## '));
  if (blockStart === -1 || blockEnd === -1 || blockStart >= blockEnd) {
    throw new Error(
      `蓝图修订块定位失败，规格行读取面不可信：\`> 版本 \` 行下标 ${blockStart}、首个 \`## \` 标题行下标 ${blockEnd}（从 0 起；应为前者 ≥ 0 且小于后者）`,
    );
  }
  const specLines = lines.filter((_, index) => index < blockStart || index >= blockEnd);
  const strayRecords = specLines.filter((line) => line.startsWith('> **v')).length;
  if (strayRecords > 0) {
    throw new Error(`修订记录不在头部块内，规格行读取面不可信：整块剔除后仍有 ${strayRecords} 行以 \`> **v\` 开头`);
  }
  return specLines.join('\n');
}

/** 蓝图规格行：剔除头部修订块——正向锚只打在这里。 */
const blueprintSpec: Surface = { label: `${blueprintRel}（规格行）`, text: blueprintSpecText(blueprint) };

const devBlueprint = loadSurface(path.join('skills', 'dev-blueprint', 'SKILL.md'));
const devDesign = loadSurface(path.join('skills', 'dev-design', 'SKILL.md'));
const setupReconstruct = loadSurface(path.join('skills', 'setup-reconstruct', 'SKILL.md'));
const devAccept = loadSurface(path.join('skills', 'dev-accept', 'SKILL.md'));
const devImplement = loadSurface(path.join('skills', 'dev-implement', 'SKILL.md'));
const devReview = loadSurface(path.join('skills', 'dev-review', 'SKILL.md'));
const devClarify = loadSurface(path.join('skills', 'dev-clarify', 'SKILL.md'));
const agentsAsset = loadSurface(path.join('skills', 'setup-workspace', 'assets', 'AGENTS.md'));
const generationRef = read(path.join('skills', 'setup-workspace', 'references', 'generation.md'));

/** 折行处理：去空白后比对——硬折行不在锚词里留痕迹。 */
const squeeze = (text: string): string => text.replace(/\s/g, '');

/** 正向：每个读取面都含每个锚词；缺失时逐条点名读取面与锚词。 */
function assertAnchored(surfaces: readonly Surface[], anchors: readonly string[]): void {
  const missing = surfaces.flatMap((target) =>
    anchors
      .filter((anchor) => !squeeze(target.text).includes(squeeze(anchor)))
      .map((anchor) => `${target.label} 缺「${anchor}」`),
  );
  assert.deepEqual(missing, [], `锚词缺失——蓝图接线回退或措辞漂移：${missing.join('；')}`);
}

/** 负向：每个读取面都不含任何反转锚词；命中时逐条点名读取面与锚词。 */
function assertRetiredAbsent(surfaces: readonly Surface[], anchors: readonly string[]): void {
  const hits = surfaces.flatMap((target) =>
    anchors
      .filter((anchor) => squeeze(target.text).includes(squeeze(anchor)))
      .map((anchor) => `${target.label} 出现「${anchor}」`),
  );
  assert.deepEqual(hits, [], `反转句回潮：${hits.join('；')}`);
}

// ── 正向：蓝图 §11.25 dev-blueprint 条目（规格行读取面）──

test('蓝图 §11.25 规格行：FR-1/FR-2 诞生亮牌两态句在场（正向只打规格行，修订记录行不计）', () => {
  assertAnchored([blueprintSpec], [
    // dev-design 联动（FR-1）——含「用户确认才动、亮牌可拒绝」语义后缀
    'dev-design 分析形态走查批准后亮牌建议调 dev-blueprint 立骨架',
    '用户确认才动、亮牌可拒绝',
    // setup-reconstruct 联动（FR-2）
    'setup-reconstruct 完成后亮牌建议汇合逆向产物成首版',
  ]);
});

test('蓝图 §11.25 规格行：FR-8 权威序句与 ADR accepted 亮牌句在场', () => {
  assertAnchored([blueprintSpec], [
    '权威序纪律：蓝图与最新轮次产物冲突时以轮次产物为准',
    '置 ADR accepted 时亮牌蓝图待回写',
  ]);
});

test('蓝图 §11.25 规格行：FR-9 术语迁册句与归属模糊亮牌句在场', () => {
  assertAnchored([blueprintSpec], [
    // v1.49 治理先行修订（票 20261124-58b8）把主册术语节升级为共享术语节，锚词随受守护文本同批改
    'GLOSSARY 项目术语章迁入主册共享术语节、原章替换为指针行',
    '术语归属模糊亮牌 + 拍板',
  ]);
});

test('蓝图 §11.25 规格行：FR-8 落册判定三支与修订记录追加行句在场', () => {
  assertAnchored([blueprintSpec], [
    // 全局面 / 模块面 / 册不存在三支钉整句（含箭头支）；反转任一支（如改成「折入轮次产物」）都会红
    '全局面（跨模块架构原则、全局决策）折项目主册对应节或全局册',
    '模块面折对应模块册',
    '模块册不存在 → 亮牌建议建册，拒绝则折全局册留痕',
    '主册「修订记录段」追加一行',
  ]);
});

test('蓝图 §11.25 规格行：FR-6 拆册与对账句在场', () => {
  assertAnchored([blueprintSpec], [
    '> 300 行',
    '亮牌建议拆 + 用户拍板',
    '主册目录 ↔ 盘上册实体对账自查',
  ]);
});

test('蓝图 §11.25 规格行：FR-7 按入口装载三支句在场（v1.49 治理先行修订升级，锚词随受守护文本同批改，票 20261124-58b8）', () => {
  assertAnchored([blueprintSpec], [
    // 三支各钉跨箭头整句（static-anchor-guard 纪律 1）；反转任一支（如改回单态装载）都会红
    '命中恰一入口 → 装项目主册 + 该入口主册 + 命中模块册',
    '命中多入口（跨入口改动）→ 装项目主册 + 各命中入口主册 + 命中模块册',
    '未命中（未登记模块）→ 只装项目主册 + 亮牌建议补登记，不拦截开工',
  ]);
});

// ── 正向：蓝图 §11.25 v1.49 深化扩围（spec 20261124-7e10 验收场景字面，票 20261124-2df8）──

test('蓝图 §11.25 规格行：FR-1 入口目录结构句与 entry_slug 句在场（规格行读取面，v1.49 条目正文已载）', () => {
  assertAnchored([blueprintSpec], [
    // 入口层立册三要素：每入口子目录 / 入口主册 + 入口级分册落子目录 / 项目级留顶层
    '每入口一个子目录，入口主册 + 入口级分册（模块册 / 术语分册）落子目录，项目级留顶层',
    'entry_slug 用 ASCII 小写短横线，对齐 claim slug 惯例',
    'book_type ∈ {项目主册, 全局册, 模块册, 入口主册}',
  ]);
});

test('蓝图 §11.25 规格行：FR-1/E2 主册七段句与单入口退化句在场', () => {
  assertAnchored([blueprintSpec], [
    // 七段清单钉产物约定节整段字面（含 ** 加粗标记——同字面纪律）；E2 退化钉产物约定节独占形态
    '**主册七段**：定位与边界 / 入口索引（入口 slug → 使用者群体一句 → 子目录指针）/ 架构分层与模块地图（模块清单每行带入口归属 + 共享模块清单行）/ 关键决策关联（跨入口共享决策）/ 共享术语节（跨入口共享概念）/ 修订记录段（演进史）/ 待回写漂移标记行区',
    '单入口退化：不建入口层，主册仍含标记行区，入口索引节标「单入口退化」',
  ]);
});

test('蓝图 §11.25 规格行：FR-2 归属列句与 FR-5 标记行区契约句在场', () => {
  assertAnchored([blueprintSpec], [
    // 归属列钉五过程之⑤登记载体独占前缀（产物约定七段括注另有一份短镜面，接前文区分）
    '登记载体升级：模块清单每行带入口归属 + 共享模块清单行——模块 → 入口 slug 映射，共享模块行标「共享」',
    // 标记行区契约：行格式 + 消解留痕 + 元数据语义（产物约定节独占）
    '行格式 = `- [待回写] <发现点> → <冲突对象引用>（<日期>）`，回写消解后该行改 `- [已消解 <日期>] <原行内容>` 留痕 + 主册修订记录段追加一行',
    '标记行是元数据不是蓝图内容',
    // E3 回写自查（轮次回写支独占）
    '每次回写收尾核对主册待回写漂移标记行区，未消解行集中亮牌逐行处置',
  ]);
});

test('蓝图 §11.25 规格行：FR-1 AGENTS 指针句、FR-4 检测三处句、FR-6 术语归册句、E1 入口判定句在场', () => {
  assertAnchored([blueprintSpec], [
    // 立骨架支（五过程之①）独占形态——破折号后缀区分于其他复述
    '多入口时指针含真实入口索引——入口清单逐项列出',
    // 检测三处（定位节整句，含 dev-blueprint 回写自查尾支）
    '漂移检测三处：dev-implement 装载对照发现即写行、dev-accept 使用方走查轴材料扩蓝图对照（验收代理装载对照发现即写行并留痕报告）、dev-blueprint 回写自查集中亮牌',
    // 术语按入口归册（五过程之①）
    '共享术语登记主册共享术语节、入口专属术语登记对应入口主册术语节',
    // E1 入口判定（定位节整句，spec 验收场景「亮牌列候选 + 用户拍板 + 禁止代挑」的全字面）
    '存量汇合时从逆向产物与代码结构列入口候选 + 用户拍板确认清单 + 禁止代挑，判属争议亮牌列候选 + 用户拍板 + 禁止代挑',
  ]);
});

// ── 正向：六技能接线句（全文读取面，硬折行去空白比对）──

test('dev-design SKILL.md：诞生亮牌句与 ADR 亮牌句在场（两处「建议调 dev-blueprint」各钉独占字面）', () => {
  assertAnchored([devDesign], [
    // §5.1 分析形态出口——独占后缀「立骨架」
    '分析形态走查批准后亮牌建议调 dev-blueprint 立骨架',
    '用户确认才动、亮牌可拒绝',
    // §5.2 方案形态出口——独占后缀「待回写」
    '置 ADR accepted 时亮牌蓝图待回写',
  ]);
});

test('setup-reconstruct SKILL.md：出口蓝图诞生亮牌句在场', () => {
  assertAnchored([setupReconstruct], ['完成后亮牌建议汇合逆向产物成首版']);
});

test('dev-accept SKILL.md：蒸馏第五路句、修订记录追加行独占字面与落册三支在场', () => {
  assertAnchored([devAccept], [
    // 第五路句（§4.4.1 蒸馏 ⑤）
    '验收通过时该轮耐久变化按落册判定折进对应册',
    // 修订记录追加行——钉蒸馏段独占字面：description 复述裸句「主册修订记录段追加一行」，
    // 只钉裸句时删掉蒸馏段那份仍绿（description 单独满足）
    '按落册判定折进对应册 + 主册修订记录段追加一行',
    // 落册判定三支
    '全局面（跨模块架构原则、全局决策）折项目主册对应节或全局册',
    '模块面折对应模块册',
    '模块册不存在 → 亮牌建议建册，拒绝则折全局册留痕',
  ]);
});

test('dev-accept SKILL.md：蓝图册按需装载句在场（实现决策 11）', () => {
  assertAnchored([devAccept], [
    'docs/blueprints/ 蓝图集在盘时，按需装载相关蓝图册作参照——项目主册 + 改动面命中的模块册（同 dev-implement 开工装载口径，未命中只装主册）；只作设计参照，禁装清单不因此放开',
  ]);
});

test('dev-implement SKILL.md：开工装载句与模块地图登记载体句在场', () => {
  assertAnchored([devImplement], [
    '开工装载项目主册 + 改动面命中模块册；未命中只装主册 + 亮牌建议补登记，不拦截开工',
    // 登记载体句接前文钉住：裸「模块地图」会被蓝图引用行外的字样满足
    '项目主册「模块地图」节同口径匹配',
  ]);
});

test('dev-review SKILL.md：蓝图册按需装载句在场（实现决策 11）', () => {
  assertAnchored([devReview], [
    'docs/blueprints/ 蓝图集在盘时，按需装载相关蓝图册作参照——项目主册 + 改动面命中的模块册（同 dev-implement 开工装载口径，未命中只装主册）',
  ]);
});

test('dev-clarify SKILL.md：新术语双语态登记句在场（蓝图不在盘 / 在盘两支整句）', () => {
  // 双语态钉整句：只钉单支时把另一支反转（在盘仍登记 GLOSSARY）不会红。
  // 锚词随受守护文本同批升级（票 20261124-b584，spec 20261124-7e10 实现决策 7）：
  // 在盘支升级为登记命中入口的入口主册术语节（共享术语登记主册共享术语节，判属争议亮牌）
  assertAnchored([devClarify], ['蓝图在盘登记命中入口的入口主册术语节（共享术语登记主册共享术语节，判属争议亮牌）、蓝图不在盘登记 GLOSSARY 项目术语章']);
});

test('dev-blueprint SKILL.md：权威序句、迁移句、拆册对账句、蓝图指针句在场', () => {
  // 权威序句与拆册三句在 description（发现面）与正文（§1 / §3.4）各有一份，场景未点名
  // 节位——钉全文至少一份在场（两份全删才红），头注已声明此局限；
  // 迁移句随 v1.49 深化升级为共享术语节形态（锚词与受守护文本同批改，票 20261124-2df8）
  assertAnchored([devBlueprint], [
    '蓝图与最新轮次产物冲突时以轮次产物为准',
    'GLOSSARY 项目术语章迁入主册共享术语节、原章替换为指针行',
    '> 300 行',
    '亮牌建议拆 + 用户拍板',
    '主册目录 ↔ 盘上册实体对账自查',
    'AGENTS.md 蓝图指针写入非哨兵区',
  ]);
});

// ── 正向：dev-blueprint SKILL.md v1.49 深化锚（spec 20261124-7e10 验收场景字面，票 20261124-2df8）──

test('dev-blueprint SKILL.md：FR-1 入口目录结构句、七段句、AGENTS 多入口指针句在场', () => {
  assertAnchored([devBlueprint], [
    // 入口层立册（§1 入口目录结构，三要素整句）
    '每入口一个子目录，入口主册 + 入口级分册（模块册 / 术语分册）落子目录，项目主册与项目级分册（跨入口共享模块册 / 全局册）留顶层',
    'entry_slug 用 ASCII 小写短横线（对齐 claim slug 惯例）',
    // 主册七段（§4 引导句整句列举，删任一段名即红）
    '主册七段 = 定位与边界 / 入口索引 / 架构分层与模块地图 / 关键决策关联 / 共享术语节 / 修订记录段 / 待回写漂移标记行区',
    // E2 单入口退化（§3.1 独占字面：括注内含标记行区仍在主册 + 入口索引节标退化）
    '单入口退化不建入口层（主册仍含待回写漂移标记行区，入口索引节标「单入口退化」）',
    // AGENTS 指针多入口形态（§3.1）
    '多入口时指针含真实入口索引（入口清单逐项列出）',
  ]);
});

test('dev-blueprint SKILL.md：FR-2 共享面判定句与归属列句在场', () => {
  assertAnchored([devBlueprint], [
    // 共享面判定（§1 整句）
    '跨入口共享内容归项目主册或项目级分册（共享判据：全局架构原则、共享领域概念、共享模块与共享决策）',
    '入口主册六类内容自治（含入口专属术语节），不重复',
    // 装载命中判定载体（§3.5 独占字面——§4 模板注释为短镜面变体，接前缀区分）
    '模块清单每行带入口归属（模块 → 入口 slug 映射）+ 共享模块清单行，共享模块行标「共享」',
  ]);
});

test('dev-blueprint SKILL.md：FR-3 按入口装载三支句与 FR-4 装载对照发现句在场', () => {
  assertAnchored([devBlueprint], [
    // 三支各钉跨箭头整句（规则反转任一支即红）
    '命中恰一入口 → 装项目主册 + 该入口主册 + 命中模块册',
    '命中多入口（跨入口改动）→ 装项目主册 + 各命中入口主册 + 命中模块册',
    '未命中（未登记模块）→ 只装项目主册 + 亮牌建议补登记，不拦截开工',
    // 装载对照发现即写行（检测三处之装载支在技能面的规则文本，跨箭头整句）
    '装载对照发现蓝图册与最新轮次产物冲突（模块地图与实际改动面失配、决策被新 ADR 取代等）→ 发现即写主册标记行区标记行并亮牌告知',
  ]);
});

test('dev-blueprint SKILL.md：FR-4/E3 回写自查句与 FR-5 标记行区契约句在场', () => {
  assertAnchored([devBlueprint], [
    // E3 回写自查（§3.3 独占字面）
    '每次回写收尾核对主册待回写漂移标记行区，未消解行集中亮牌逐行处置',
    // 标记行区契约（§4）：行格式 + 消解留痕 + 元数据语义 + 权威序
    '行格式 = `- [待回写] <发现点> → <冲突对象引用>（<日期>）`',
    '回写消解后该行改 `- [已消解 <日期>] <原行内容>` 留痕 + 主册修订记录段追加一行',
    '标记行是元数据不是蓝图内容',
    '权威序不变：冲突以轮次产物为准',
  ]);
});

test('dev-blueprint SKILL.md：FR-6 术语归册句与 E1 入口判定句在场', () => {
  assertAnchored([devBlueprint], [
    // 术语按入口归册（§3.1 整句，含入口主册术语节与共享术语节双边）
    '共享术语登记主册共享术语节、入口专属术语登记对应入口主册术语节',
    // E1 入口判定（§3.1 恰一份，description 无「禁止代挑」字样——删之即红）
    '亮牌列入口候选 + 用户拍板确认清单 + 禁止代挑，判属争议亮牌列候选 + 用户拍板 + 禁止代挑',
  ]);
});

test('assets/AGENTS.md 模板：蓝图指针行与非哨兵区定位在场', () => {
  assertAnchored([agentsAsset], [
    '项目蓝图：docs/blueprints/',
    '哨兵块外，非哨兵区',
  ]);
});

// ── 负向：反转句零命中（蓝图全文含修订块 + dev-blueprint SKILL.md 全文）──

test('负向：权威序反转「以蓝图为准」与「自动拆册」「撤 docs/adrs」稳定子串零命中', () => {
  assertRetiredAbsent([blueprintFull, devBlueprint], ['以蓝图为准', '自动拆册', '撤 docs/adrs']);
});

test('负向：v1.49 扩围反转句「自动建入口」「代改蓝图册」与 FR-7 旧单态装载句零命中（票 20261124-2df8）', () => {
  // 「自动建入口」= E1 反转「不经拍板自动建入口」的稳定核（入口必须拍板）；
  // 「代改蓝图册」= 反转句「检测者代改蓝图册内容」的稳定核（检测者只写标记行区元数据）；
  // 「命中 → 装对应模块册 + 主册」= FR-7 旧单态装载句退役锚，取带箭头整句形态——
  // 蓝图 v1.47 修订记录的历史引文「命中装对应模块册 + 主册」无箭头，不受误伤
  assertRetiredAbsent([blueprintFull, devBlueprint], [
    '自动建入口',
    '代改蓝图册',
    '命中 → 装对应模块册 + 主册',
  ]);
});

test('负向：「收编 ADR」非禁止形态零命中（负向后视豁免合法禁止文本「不收编 ADR」）', () => {
  // 禁止形态「不收编 ADR」是合法正文，裸子串零命中会误伤；负向后视只拦非禁止形态——
  // 删「不」翻面、「蓝图收编 ADR」式反转、任何「X收编 ADR」肯定句都命中变红
  const pattern = /(?<!不)收编ADR/;
  const offenders = [blueprintFull, devBlueprint].flatMap((target) =>
    pattern.test(squeeze(target.text)) ? [`${target.label} 出现非禁止形态「收编 ADR」`] : [],
  );
  assert.deepEqual(offenders, [], `蓝图收编 ADR 纪律反转：${offenders.join('；')}`);
});

test('负向：「代挑」非禁止形态零命中（负向后视豁免正向句「禁止代挑」；只打技能面，票 20261124-2df8）', () => {
  // E1 负向「代挑」不能裸用——正向句「禁止代挑」含该子串；负向后视只拦非禁止形态
  // （「替用户拍板或代挑入口候选」式反转、删「禁止」翻面均命中变红）。
  // 只打 dev-blueprint SKILL.md 不打蓝图全文：蓝图 §11.25 禁止事项行「替用户拍板或
  // 代挑入口候选与术语归属」是合法禁止语义但无「禁止」紧邻前缀，入面会误红；
  // spec E1 负向场景的检索对象即技能文本（头注已声明此读取面局限）
  const pattern = /(?<!禁止)代挑/;
  const offenders = pattern.test(squeeze(devBlueprint.text))
    ? [`${devBlueprint.label} 出现非禁止形态「代挑」`]
    : [];
  assert.deepEqual(offenders, [], `E1 入口判定纪律反转（代挑）：${offenders.join('；')}`);
});

// ── 双份资产逐字一致断言（评审 20261124-17be F1 归置本票承载）──

/**
 * generation.md §2「AGENTS.md 收口」根版哨兵固定文本代码块：取 §2 标题后的第一个
 * ```markdown 围栏块内容。定位点缺失、围栏不成对、块形态异常一律抛错，不静默退化
 * （提取手法同 legacy_stream 夹具：段落定位 + 围栏切换 + 原文截取）。
 */
function generationFixedBlock(full: string): string {
  const lines = full.split('\n');
  const sectionStart = lines.findIndex((line) => line.startsWith('## 2. AGENTS.md 收口'));
  if (sectionStart === -1) {
    throw new Error('generation.md §2 标题「## 2. AGENTS.md 收口」定位失败，双份读取面不可信');
  }
  const fenceOpen = lines.findIndex((line, i) => i > sectionStart && line === '```markdown');
  if (fenceOpen === -1) {
    throw new Error('generation.md §2 固定文本代码块（```markdown 围栏）定位失败，双份读取面不可信');
  }
  const fenceClose = lines.findIndex((line, i) => i > fenceOpen && line === '```');
  if (fenceClose === -1) {
    throw new Error('generation.md §2 固定文本代码块围栏不成对（缺收栏 ```），双份读取面不可信');
  }
  const block = lines.slice(fenceOpen + 1, fenceClose).join('\n');
  if (!block.startsWith('<!-- sdlc:begin') || !block.endsWith('<!-- sdlc:end -->')) {
    throw new Error('generation.md §2 首个围栏块不是根版哨兵固定文本（应起于 sdlc:begin、讫于 sdlc:end），双份读取面不可信');
  }
  return block;
}

/** assets/AGENTS.md 哨兵块：`<!-- sdlc:begin` 行至 `<!-- sdlc:end -->` 行（含）原文截取。 */
function assetSentinelBlock(full: string): string {
  const lines = full.split('\n');
  const beginIndexes = lines.reduce<number[]>(
    (acc, line, i) => (line.startsWith('<!-- sdlc:begin') ? [...acc, i] : acc),
    [],
  );
  if (beginIndexes.length !== 1) {
    throw new Error(`assets/AGENTS.md 应恰含一个哨兵块（sdlc:begin 标记 ${beginIndexes.length} 个），双份读取面不可信`);
  }
  const begin = beginIndexes[0];
  const end = lines.findIndex((line, i) => i >= begin && line === '<!-- sdlc:end -->');
  if (end === -1) {
    throw new Error('assets/AGENTS.md 哨兵块缺收标 `<!-- sdlc:end -->`，双份读取面不可信');
  }
  return lines.slice(begin, end + 1).join('\n');
}

test('双份资产逐字一致：generation.md §2 根版哨兵固定文本 ↔ assets/AGENTS.md 哨兵块（机械 diff，不等即红）', () => {
  assert.equal(
    assetSentinelBlock(agentsAsset.text),
    generationFixedBlock(generationRef),
    'AGENTS 哨兵块双份漂移：generation.md §2 固定文本与 assets/AGENTS.md 哨兵块须逐字一致（改一处须同步另一处，dual-copy-assets #1）',
  );
});
