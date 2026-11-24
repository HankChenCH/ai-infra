// 蓝图接线静态锚定断言（spec 20261124-6c73 实现决策 14 / 测试决策 seam，票 20261124-6891）。
//
// 守护边界（哪些文件哪些句受守护）——被守护文件九份，正向锚 = spec 20261124-6c73
// 「验收场景」关键句字面（期望值独立来源，非实现推导），受守护文本再变时本测试与
// 文档同批改：
// - docs/sdlc-skills-blueprint.md §11.25 dev-blueprint 条目：诞生亮牌两态句（FR-1/FR-2）、
//   权威序句与 ADR accepted 亮牌句（FR-8）、术语迁册句与归属模糊亮牌句（FR-9）、
//   落册判定三支与修订记录追加行句（FR-8）、拆册与对账句（FR-6）、施工装载命中句（FR-7）。
// - skills/dev-blueprint/SKILL.md：权威序句、术语迁册句、拆册对账三句、AGENTS 蓝图指针
//   写入非哨兵区句（FR-6/7/8/9）。
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
// 反向审计已在票 20261124-6891 执行。
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
// 轮次产物」的稳定核）、「自动拆册」、「撤 docs/adrs」。「收编 ADR」不能裸用——两处
// 禁止形态「不收编 ADR」（dev-blueprint 禁止事项与蓝图 §11.25 禁止事项）含该子串，
// 裸零命中会把合法禁止文本误判为反转；改用负向后视正则 `(?<!不)收编ADR` 打去空白全文：
// 「不收编 ADR」豁免，其余任何非禁止形态（含「蓝图收编 ADR」与删「不」翻面）即命中变红。
//
// 同句多份镜像的守护边界：
// - dev-design 同文件两处「建议调 dev-blueprint」（§5.1 诞生亮牌 / §5.2 ADR 亮牌）——
//   各钉带区分后缀的独占字面（「…立骨架」/「…待回写」），删任一份必红。
// - dev-accept description 复述「主册修订记录段追加一行」——蒸馏段那份钉独占字面
//   「按落册判定折进对应册 + 主册修订记录段追加一行」，删蒸馏段必红；description
//   发现面复述不单独钉（同 research-linkage 先例口径）。
// - dev-blueprint SKILL.md 的权威序句 / 指针句 / 拆册三句在 description 与正文各有一份，
//   spec 验收场景只点名「检索 SKILL.md 含句」未点名节位——钉全文至少一份在场（两份
//   全删才红），此局限在此声明；dev-design / dev-clarify 场景同样未点名节位，同口径。
// - 不在任何验收场景与实现决策 14 锚词清单里的句子没有守护（如 FR-4 主册五节清单、
//   FR-5 决策关联叙述句——本轮锚词面之外，留后续治理票按需扩围）。
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
    'GLOSSARY 项目术语章迁入主册术语节、原章替换为指针行',
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

test('蓝图 §11.25 规格行：FR-7 施工装载命中与未命中句在场', () => {
  assertAnchored([blueprintSpec], [
    '命中 → 装对应模块册 + 主册；未命中（未登记模块）→ 只装主册 + 亮牌建议补登记，不拦截开工',
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
  // 双语态钉整句：只钉单支时把另一支反转（在盘仍登记 GLOSSARY）不会红
  assertAnchored([devClarify], ['蓝图不在盘登记 GLOSSARY 项目术语章、蓝图在盘登记主册术语节']);
});

test('dev-blueprint SKILL.md：权威序句、迁移句、拆册对账句、蓝图指针句在场', () => {
  // 权威序句与拆册三句在 description（发现面）与正文（§1 / §3.4）各有一份，场景未点名
  // 节位——钉全文至少一份在场（两份全删才红），头注已声明此局限
  assertAnchored([devBlueprint], [
    '蓝图与最新轮次产物冲突时以轮次产物为准',
    'GLOSSARY 项目术语章迁入主册术语节、原章替换为指针行',
    '> 300 行',
    '亮牌建议拆 + 用户拍板',
    '主册目录 ↔ 盘上册实体对账自查',
    'AGENTS.md 蓝图指针写入非哨兵区',
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

test('负向：「收编 ADR」非禁止形态零命中（负向后视豁免合法禁止文本「不收编 ADR」）', () => {
  // 禁止形态「不收编 ADR」是合法正文，裸子串零命中会误伤；负向后视只拦非禁止形态——
  // 删「不」翻面、「蓝图收编 ADR」式反转、任何「X收编 ADR」肯定句都命中变红
  const pattern = /(?<!不)收编ADR/;
  const offenders = [blueprintFull, devBlueprint].flatMap((target) =>
    pattern.test(squeeze(target.text)) ? [`${target.label} 出现非禁止形态「收编 ADR」`] : [],
  );
  assert.deepEqual(offenders, [], `蓝图收编 ADR 纪律反转：${offenders.join('；')}`);
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
