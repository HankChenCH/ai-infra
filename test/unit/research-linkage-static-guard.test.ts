// 调研归位语义的静态锚定断言（spec 20261123-c5e1 实现决策 8 / 测试决策，票 20261123-e5b2）。
//
// 守护对象 = 票 20261123-9492 落盘的调研归位语义：澄清就地联动 dev-research 的时序、三路归置
// 逃生舱「变 FR（调研报告是交付物）」退役、调研分两态归置（纯调研支不经 spec / 票 / 运行管道）、
// need.fulfilled 推进者镜像。读八文件全文：docs/sdlc-skills-blueprint.md、
// skills/dev-clarify/SKILL.md、skills/dev-clarify/references/research.md、
// skills/dev-research/SKILL.md、skills/dev-spec/SKILL.md、GLOSSARY.md、docs/METHOD.md、
// docs/concepts.md。
// 锚词 = spec 20261123-c5e1「验收场景」与「实现决策」的字面，期望值独立来源（非实现推导）；
// 受守护文本再变时，本测试与文档同批改。测试按验收场景组织；测试名括注列出读取面与锚词
// 所在的节——断言打在整个读取面上，节号仅供定位。
// （手法先例：docs-surface.test.ts 锚词 + 负向清单、ci-workflow.test.ts「文件即契约」。）
//
// 蓝图读取面分两种：
// - 正向锚只打在规格行——比对前整块剔除头部修订块：自 `> 版本 ` 行起、至首个 `## ` 标题之前。
//   修订记录逐字复述了大部分新句：读全文的话，规格行回退后这些锚词靠修订记录就能满足，
//   正向断言假绿。按行剔除会漏掉折行的续行，所以整块剔除；两个定位点任一找不到就抛错，
//   不让读取面静默退化成全文。
// - 负向锚打在蓝图全文（含修订块）——退役句在蓝图任何位置都不该复述。
//
// 退役句负向锚 = 稳定子串「变 FR」「调研报告是交付物」「不许悬置」，打在退役句的三个历史
// 落点（蓝图、references/research.md、dev-clarify SKILL.md）。不用带括注的原句字面：蓝图旧句
// 括注内多一段「，need 0001 先例」，原句对蓝图是空断言（改前就零命中）；对另两处，原句只
// 拦得住逐字写回，拦不住改括注的写回。
//
// 折行处理：受守护 Markdown 有硬折行，锚词可能被折行切开——比对前把全文与锚词的空白字符
// 全部去掉，两侧同规。
// 锚词取法：带箭头的条件规则钉跨箭头整句（条件与后果各钉碎片时，把规则反转仍是绿的）；
// 裸关键词会被同文件内无关句子满足的（蓝图规格行里的「沉默不算」「禁止代挑」
// 「need 谱系前缀」各有多处命中），取其所在句的字面；同一句在同文件两节各有一份时（蓝图 §8
// 决策点全表与 §11.13、蓝图 §11.13 与 §11.14、dev-clarify description 与 §4 出口、research.md
// 时序节与落盘映射节），场景点名的节各钉一条接上前后文的独占字面，删掉任一份都会红；前后文
// 只差标点的那一句（拍板不通过句）改钉它在蓝图规格行的出现次数。负向锚按 spec 点名的稳定
// 子串字面使用。

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
 * 定位点缺失或次序颠倒即抛错：读取面静默退化成全文，等于正向断言假绿。
 */
function blueprintSpecLines(full: string): string {
  const lines = full.split('\n');
  const blockStart = lines.findIndex((line) => line.startsWith('> 版本 '));
  const blockEnd = lines.findIndex((line) => line.startsWith('## '));
  if (blockStart === -1 || blockEnd === -1 || blockStart >= blockEnd) {
    throw new Error(
      `蓝图修订块定位失败，规格行读取面不可信：\`> 版本 \` 行下标 ${blockStart}、首个 \`## \` 标题行下标 ${blockEnd}（从 0 起；应为前者 ≥ 0 且小于后者）`,
    );
  }
  return lines.filter((_, index) => index < blockStart || index >= blockEnd).join('\n');
}

/** 蓝图规格行：剔除头部修订块——正向锚只打在这里。 */
const blueprintSpec: Surface = { label: `${blueprintRel}（规格行）`, text: blueprintSpecLines(blueprint) };
const devClarify = loadSurface(path.join('skills', 'dev-clarify', 'SKILL.md'));
const researchRef = loadSurface(path.join('skills', 'dev-clarify', 'references', 'research.md'));
const devResearch = loadSurface(path.join('skills', 'dev-research', 'SKILL.md'));
const devSpec = loadSurface(path.join('skills', 'dev-spec', 'SKILL.md'));
const glossary = loadSurface('GLOSSARY.md');
const method = loadSurface(path.join('docs', 'METHOD.md'));
const concepts = loadSurface(path.join('docs', 'concepts.md'));

/** 退役句的稳定子串：三个历史落点同取，带括注的原句字面拦不住改括注的写回。 */
const RETIRED_FRAGMENTS = ['变 FR', '调研报告是交付物', '不许悬置'];

/** 折行处理：去空白后比对——硬折行不在锚词里留痕迹。 */
const squeeze = (text: string): string => text.replace(/\s/g, '');

/** 正向：每个读取面都含每个锚词；缺失时逐条点名读取面与锚词。 */
function assertAnchored(surfaces: readonly Surface[], anchors: readonly string[]): void {
  const missing = surfaces.flatMap((target) =>
    anchors
      .filter((anchor) => !squeeze(target.text).includes(squeeze(anchor)))
      .map((anchor) => `${target.label} 缺「${anchor}」`),
  );
  assert.deepEqual(missing, [], `锚词缺失——调研归位语义回退或措辞漂移：${missing.join('；')}`);
}

/** 负向：每个读取面都不含任何退役锚词；命中时逐条点名读取面与锚词。 */
function assertRetiredAbsent(surfaces: readonly Surface[], anchors: readonly string[]): void {
  const hits = surfaces.flatMap((target) =>
    anchors
      .filter((anchor) => squeeze(target.text).includes(squeeze(anchor)))
      .map((anchor) => `${target.label} 出现「${anchor}」`),
  );
  assert.deepEqual(hits, [], `退役句回潮：${hits.join('；')}`);
}

// ── 负向：退役句与被更正的旧措辞零命中 ──

test('蓝图全文（含头部修订块）：退役句稳定子串「变 FR」「调研报告是交付物」「不许悬置」零命中', () => {
  assertRetiredAbsent([blueprintFull], RETIRED_FRAGMENTS);
});

test('references/research.md：退役句稳定子串「变 FR」「调研报告是交付物」「不许悬置」零命中（改括注的写回同样拦）', () => {
  assertRetiredAbsent([researchRef], RETIRED_FRAGMENTS);
});

test('dev-clarify SKILL.md（退役句第三个历史落点）：退役句稳定子串「变 FR」「调研报告是交付物」「不许悬置」零命中', () => {
  assertRetiredAbsent([devClarify], RETIRED_FRAGMENTS);
});

test('蓝图全文：被更正的旧措辞「只交付报告并回填」零命中', () => {
  assertRetiredAbsent([blueprintFull], ['只交付报告并回填']);
});

test('回填承载时点：蓝图、dev-clarify、research.md、dev-research 均无「在定稿时承载」', () => {
  assertRetiredAbsent([blueprintFull, devClarify, researchRef, devResearch], ['在定稿时承载']);
});

test('拒绝联动不强制调研：蓝图、research.md、dev-clarify 均无「必须完成调研才可定稿」句式', () => {
  assertRetiredAbsent([blueprintFull, researchRef, devClarify], ['必须完成调研才可定稿']);
});

test('拍板不通过不置终态：蓝图、dev-clarify、research.md、dev-research 均无「不通过亦置 fulfilled」「即置 fulfilled」语义', () => {
  assertRetiredAbsent([blueprintFull, devClarify, researchRef, devResearch], ['不通过亦置 fulfilled', '即置 fulfilled']);
});

// ── 正向：就地联动时序与转调研归置（FR-1 / FR-2 与其异常流）──

test('联动时序句：问题清单经用户确认 → 检索出报告 → 结论回填 need → 之后才定稿（蓝图 §11.13 / dev-clarify / research.md）', () => {
  assertAnchored([blueprintSpec, devClarify, researchRef], [
    '问题清单经用户确认 → 检索出报告 → 结论回填 need → 之后才定稿',
  ]);
});

test('调研驱动行就地联动 dev-research：报告落盘回填后才定稿、报告先于 spec（蓝图 §9 / dev-clarify 方法论表）', () => {
  assertAnchored([blueprintSpec, devClarify], ['就地联动 dev-research——报告落盘回填后才定稿，报告先于 spec']);
});

test('research.md：系统调研级问题由本技能就地联动 dev-research，转调研 = 就地联动 dev-research', () => {
  assertAnchored([researchRef], ['由本技能就地联动 dev-research', '转调研 = 就地联动 dev-research']);
});

test('就地触发的执行机制 = 用 Skill 工具调用 dev-research 就地联动，不自行检索（蓝图 §11.13 / dev-clarify / research.md）', () => {
  assertAnchored([blueprintSpec, devClarify, researchRef], [
    '就地触发的执行机制 = 用 Skill 工具调用 dev-research 就地联动（不自行检索），调用时给出 need 编号',
  ]);
});

test('转调研的报告作 need 正文依据与 spec 输入，不产生工单（蓝图 §11.13 / dev-clarify / research.md）', () => {
  assertAnchored([blueprintSpec, devClarify, researchRef], ['报告作 need 正文依据与 spec 输入，不产生工单']);
});

test('用户拒绝联动或 dev-research 不可用 → 过查证过滤闸转假设，条目标注「未经系统调研」（蓝图 §11.13 / dev-clarify / research.md）', () => {
  assertAnchored([blueprintSpec, devClarify, researchRef], [
    '用户拒绝联动或 dev-research 不可用 → 过查证过滤闸转假设，条目标注「未经系统调研」',
  ]);
  // research.md 在就地联动时序节与落盘映射节各载一份同句，各接上一行的文钉住——删掉任一份都要红
  assertAnchored([researchRef], [
    '报告作 need 正文依据与 spec 输入，不产生工单。用户拒绝联动或 dev-research 不可用 → 过查证过滤闸转假设，条目标注「未经系统调研」',
    '调研明确否掉的方案 → 范围与非目标。用户拒绝联动或 dev-research 不可用 → 过查证过滤闸转假设，条目标注「未经系统调研」',
  ]);
});

test('research.md 诚实边界：dev-research 未安装 → 如实相告；内联查证结论不得冒充调研结论', () => {
  // 第二个锚词在盘上被硬折行切开，靠去空白比对命中
  assertAnchored([researchRef], ['dev-research 未安装 → 如实相告', '结论必须标注"内联查证，未做系统调研"，不得冒充调研结论']);
});

test('research.md 落盘映射：调研明确否掉的方案 → 范围与非目标', () => {
  assertAnchored([researchRef], ['调研明确否掉的方案 → 范围与非目标']);
});

// ── 正向：取号前置、草稿骨架与不重复触发 ──

test('触发 dev-research 前 need 已取号在盘（蓝图 §11.13 / dev-clarify / research.md）', () => {
  assertAnchored([blueprintSpec, devClarify, researchRef], ['前置 = 触发 dev-research 前 need 已取号在盘']);
});

test('dev-clarify §4 第 2 步：草稿骨架按 need 模板 frontmatter（status: draft / created）加七节标题；成稿在既有文件上补齐、不覆盖已落盘内容', () => {
  assertAnchored([devClarify], [
    '草稿骨架 = 按 need 模板 frontmatter（`id` / `status: draft` / `created`）加七节标题',
    '在既有文件上补齐、不覆盖已落盘内容',
  ]);
});

test('该 need 名下已有带 need 谱系前缀且覆盖该问题清单的报告 → 不重复触发，直接回填（蓝图 §11.13 / dev-clarify / research.md）', () => {
  assertAnchored([blueprintSpec, devClarify, researchRef], [
    '带 need 谱系前缀且覆盖该问题清单的报告 → 不重复触发，直接回填',
  ]);
});

test('结论回填 need 时注明报告编号（dev-clarify / research.md 回填句；蓝图 §11.13 三路归置句与 references 摘要行）', () => {
  assertAnchored([devClarify, researchRef], ['在定稿前承载，注明报告编号']);
  // 摘要行这条与 §11.14 出口段的近似句只差主语（「报告回填 need 归本技能」对「结论回填 need
  // 由 dev-clarify」），各钉各的主语——只钉共同子串时删掉任何一处都仍绿。
  assertAnchored([blueprintSpec], [
    '结论回填 need 时注明报告编号',
    '报告回填 need 归本技能按三路归置在定稿前承载，并注明报告编号',
  ]);
});

// ── 正向：纯调研支两态归置与拍板记账（FR-3）──

test('出口按下述两态归置出口：纯调研支指路（通读拍板 → 记账置 fulfilled，不经 spec）（蓝图 §11.14 / dev-research）', () => {
  assertAnchored([blueprintSpec, devResearch], [
    '按下述两态归置出口',
    '纯调研支指路（通读拍板 → 记账置 fulfilled，不经 spec）',
  ]);
});

test('两态判据 = 报告之后是否还有实现交付物；实现前调研照常指路 dev-spec（蓝图 §11.14 / dev-research）', () => {
  assertAnchored([blueprintSpec, devResearch], ['判据 = 报告之后是否还有实现交付物', '实现前调研照常指路 dev-spec']);
});

test('纯调研需求报告后无实现交付物，不经 spec / 票 / 运行管道（蓝图 §11.14 / dev-research / GLOSSARY）', () => {
  // 蓝图 §11.13 出口门禁另有「不经 spec / 票 / 运行管道：」一份，§11.14 这份靠紧随的
  // 「落点按进入形态分」钉住。
  assertAnchored([blueprintSpec, devResearch], [
    '纯调研需求（报告即全部交付物，报告后无实现交付物）不经 spec / 票 / 运行管道，落点按进入形态分',
  ]);
  assertAnchored([glossary], ['报告后无实现交付物', '不经 spec / 票 / 运行管道']);
});

test('就地联动形态与 need 尚为 draft 的手动触发：只交付报告，不记账、不写 need；回填在定稿前承载，拍板与记账交回 dev-clarify 出口（蓝图 §11.14 / dev-research）', () => {
  assertAnchored([blueprintSpec, devResearch], [
    'need 尚为 draft 的手动触发：报告交付时 need 仍为 draft',
    '只交付报告，不记账、不写 need',
    '结论回填 need 由 dev-clarify 按三路归置在定稿前承载，并注明报告编号',
    '拍板与记账交回 dev-clarify 出口在定稿之后承载',
  ]);
});

test('记账只对盘上已 confirmed 的对应 need 执行（蓝图 §11.14 / dev-research / GLOSSARY）', () => {
  assertAnchored([blueprintSpec, devResearch, glossary], ['记账只对盘上已 confirmed 的对应 need 执行']);
});

test('拍板口径：成功标准逐条核销、残余风险为空或经用户显式接受，沉默不算（蓝图 §11.13 与 §11.14 各一份 / dev-clarify / dev-research）', () => {
  // 拍板口径接在各自的触发句后面钉成整句：蓝图 §11.13 与 §11.14 各载一份同句，各钉各的触发句
  assertAnchored([blueprintSpec, devClarify], [
    '定稿后请用户通读拍板，拍板 = 成功标准逐条核销、残余风险为空或经用户显式接受，沉默不算',
  ]);
  assertAnchored([blueprintSpec, devResearch], [
    '报告交付后请用户通读拍板，拍板 = 成功标准逐条核销、残余风险为空或经用户显式接受，沉默不算',
  ]);
});

test('拍板不通过 → 不记账，说明差距并停在拍板点（蓝图 §11.13 与 §11.14 各一份 / dev-clarify / research.md / dev-research）', () => {
  const sentence = '拍板不通过 → 不记账，说明差距并停在拍板点';
  assertAnchored([blueprintSpec, devClarify, researchRef, devResearch], [sentence]);
  // 蓝图 §11.13 出口门禁与 §11.14 出口各载一份同句、前后文只差标点：改钉次数，删掉任意一份都会红
  const occurrences = squeeze(blueprintSpec.text).split(squeeze(sentence)).length - 1;
  assert.equal(occurrences, 2, `「${sentence}」应在蓝图规格行出现 2 次`);
});

test('纯调研支出口：通读拍板 → 记账置 need fulfilled，不指路 /dev-spec（蓝图 §11.13 出口门禁 / dev-clarify §4 出口 / research.md）', () => {
  assertAnchored([blueprintSpec, devClarify, researchRef], [
    '纯调研支出口（通读拍板 → 记账置 need fulfilled，不指路 /dev-spec）',
  ]);
});

test('纯调研支出口按报告是否交付分叉：未交付 → 建议 /dev-research 交付报告；已交付并已随定稿回填 → 定稿后通读拍板（蓝图 §11.13 出口门禁 / dev-clarify §4 出口 / research.md）', () => {
  // 已交付分支钉跨箭头整句：只钉条件半句时，把「定稿后」改成「定稿前」不会变红。
  assertAnchored([blueprintSpec, devClarify], [
    '报告已交付并已随定稿回填（含就地联动产出与定稿前手动触发产出的报告）→ 定稿后请用户通读拍板',
  ]);
  assertAnchored([researchRef], [
    '报告尚未交付 → 建议 /dev-research 交付报告',
    '报告已交付并已随定稿回填（含就地联动产出与定稿前手动触发产出的报告）→ 拍板与记账在定稿之后归 SKILL.md §4 出口第 4 步',
  ]);
  // 未交付分支与引导括注在蓝图 §8 决策点全表 dev-clarify 行、dev-clarify description 各另有一份：
  // 场景点名的是 §11.13 出口门禁与 §4 出口，各钉一条只在该节出现的独占字面。
  assertAnchored([blueprintSpec], [
    '纯调研支出口（通读拍板 → 记账置 need fulfilled，不指路 /dev-spec）**——纯调研需求（报告即全部交付物，报告后无实现交付物）不经 spec / 票 / 运行管道：报告尚未交付 → 建议 /dev-research 交付报告',
  ]);
  assertAnchored([devClarify], [
    '报告尚未交付 → 建议 /dev-research 交付报告（交付后的拍板与记账归 dev-research 出口手动形态，本技能到此为止）',
  ]);
});

// ── 正向：触发形态、记账例外、入口判据与重入（FR-3）──

test('蓝图 §11.14 触发行：两进入形态——① dev-clarify 调研驱动联动就地触发 ② 用户手动', () => {
  assertAnchored([blueprintSpec], ['（两进入形态）：① dev-clarify 调研驱动联动就地触发', '② 用户手动（"调研 X"']);
});

test('纯调研支记账例外句三处都在场：dev-research 开头句、dev-research 禁止事项、蓝图 §11.14 禁止事项（只动 status 与 fulfilled 日期，不代写正文）', () => {
  // 三处字面各异（开头句承接「一律拒绝」、两条禁止条的括注形态不同），逐处钉住——
  // 只查共同子串会被开头句单独满足。
  assertAnchored([devResearch], ['一律拒绝——唯一例外：手动形态纯调研支出口记账，只动 status 与 fulfilled 日期，不代写正文']);
  assertAnchored([devResearch], [
    '改动 need/spec 等其他产物——只指路，不代写；唯一例外：手动形态纯调研支出口记账，只动 status 与 fulfilled 日期，不代写正文',
  ]);
  assertAnchored([blueprintSpec], [
    '改动 need/spec 等其他产物（唯一例外：手动形态纯调研支出口记账，只动 status 与 fulfilled 日期，不代写正文）',
  ]);
});

test('need 已 confirmed → 手动形态走 dev-research 出口，纯调研支的记账在此（蓝图 §11.14 输入行 / dev-research 入口）', () => {
  assertAnchored([blueprintSpec, devResearch], ['need 已 confirmed → 手动形态，走本技能出口（纯调研支的记账在此）']);
});

test('need 仍为 draft（就地联动，或 need 尚为 draft 的手动触发）→ 只交付报告、不记账，拍板与记账归 dev-clarify 定稿后的出口（蓝图 §11.14 输入行 / dev-research 入口）', () => {
  assertAnchored([blueprintSpec, devResearch], [
    'need 尚为 draft 的手动触发）→ 只交付报告、不记账，拍板与记账归 dev-clarify 定稿后的出口',
  ]);
});

test('已有带前缀且覆盖本次问题清单的报告 → 按 §5 重入规则处理，不另立（蓝图 §11.14 输入行 / dev-research 入口）', () => {
  assertAnchored([blueprintSpec, devResearch], ['按 §5 重入规则处理，不另立']);
});

test('不在澄清中且 need 未 confirmed → 停止并指路 /dev-clarify（蓝图 §11.14 输入行 / dev-research 入口）', () => {
  assertAnchored([blueprintSpec, devResearch], ['不在澄清中且 need 未 confirmed → 停止并指路 /dev-clarify']);
});

test('need 不可唯一确定 → 列出候选请用户点名，禁止代挑（蓝图 §11.14 输入行 / dev-research 入口）', () => {
  assertAnchored([blueprintSpec, devResearch], ['不可唯一确定 → 列出候选请用户点名，禁止代挑']);
});

test('报告已落盘后重入（就地联动形态或 need 尚为 draft）：该 need 名下已有带 need 谱系前缀且覆盖该问题清单的报告 → 读既有报告、把结论交回 dev-clarify 回填，不重跑检索、不另立报告（蓝图 §11.14 / dev-research §5）', () => {
  // 条件与后果钉成跨箭头整句：条件半句在蓝图 §11.13「不重复触发」句里另有一份，后果半句在
  // 手动形态分句里也出现——各钉碎片时，把后果反转成「重跑检索、另立报告」不会变红。
  assertAnchored([blueprintSpec, devResearch], [
    '该 need 名下已有带 need 谱系前缀且覆盖该问题清单的报告 → 读既有报告、把结论交回 dev-clarify 回填，不重跑检索、不另立报告',
  ]);
});

test('手动形态重入：报告已落盘而通读拍板或记账未完成 → 不重跑检索、不另立报告（蓝图 §11.14 / dev-research §5）', () => {
  assertAnchored([blueprintSpec, devResearch], ['报告已落盘而通读拍板或记账未完成 → 不重跑检索、不另立报告']);
});

// ── 正向：need 谱系前缀与报告投影时序 ──

test('取号带父参数 need <need-ID>，报告文件名带 need 谱系前缀（蓝图 §11.14 产物行 / dev-research §4 第 2 步）', () => {
  assertAnchored([blueprintSpec, devResearch], ['带父参数 `need <need-ID>`，文件名带 need 谱系前缀']);
});

test('纯调研需求可按主题多张，文件名带 need 谱系前缀（蓝图 §11.14 产物行 / dev-research）', () => {
  assertAnchored([blueprintSpec, devResearch], ['可按主题多张，文件名带 need 谱系前缀']);
});

test('need 未投影时报告首次 publish 被适配器警告跳过，属预期，由 dev-clarify 在定稿、need 首次 publish 后补投；遇此警告先重发 need 再重发报告（蓝图 §11.14 产物行 / dev-research §4 第 2 步）', () => {
  assertAnchored([blueprintSpec, devResearch], [
    '报告首次 publish 会被适配器警告跳过，属预期，由 dev-clarify 在定稿、need 首次 publish 后补投',
    '遇此警告先重发 need 再重发报告',
  ]);
});

test('need 首次 publish 后补投带 need 谱系前缀且尚未投影的调研报告，判据 = 映射账本无该报告行（蓝图 §11.13 出口门禁 / dev-clarify §4 第 3 步）', () => {
  assertAnchored([blueprintSpec, devClarify], ['带 need 谱系前缀且尚未投影的调研报告逐张补跑 publish', '映射账本无该报告行 = 尚未投影']);
});

// ── 正向：dev-spec 提示与调研引用（FR-4 与调研引用链）──

test('dev-spec 入口门禁：假设带「未经系统调研」标注 → 起草实现决策时显式提示该风险（提示不拦截，不新增门禁）', () => {
  assertAnchored([devSpec], ['「未经系统调研」标注的条目 → 起草实现决策时向用户显式提示该风险（提示不拦截，不新增门禁）']);
});

test('调研引用：装载 need 名下带 need 谱系前缀的调研报告，实现决策依据报告结论时在该条注明报告编号（dev-spec / 蓝图 §11.4）', () => {
  assertAnchored([devSpec, blueprintSpec], [
    'need 名下带 need 谱系前缀的调研报告（存在时装载）',
    '实现决策依据调研报告结论时在该条注明报告编号',
  ]);
});

// ── 正向：GLOSSARY 词条与 need.fulfilled 推进者镜像 ──

test('GLOSSARY 项目术语章：「纯调研需求」词条在场，判据 = 报告后无实现交付物', () => {
  assertAnchored([glossary], ['**纯调研需求** —— 报告即全部交付物的 need', '报告后无实现交付物']);
});

test('GLOSSARY「纯调研需求」词条：记账归属含 need 尚为 draft 的手动触发（同归 dev-clarify 出口）', () => {
  assertAnchored([glossary], ['含 need 尚为 draft 的手动触发']);
});

test('GLOSSARY 状态表 need.fulfilled 行：推进者含纯调研支经用户通读拍板记账置位，记账出口两形态点名', () => {
  assertAnchored([glossary], [
    'dev-accept 收口序列，或纯调研支经用户通读拍板记账置位',
    '手动形态 dev-research 出口、就地联动形态 dev-clarify 出口',
  ]);
});

test('need.fulfilled 推进者镜像：蓝图 §6.1 状态机表、蓝图 §4.3 与 METHOD 循环模型退出条件句、METHOD 状态机表均含纯调研支置位注记', () => {
  // 两种句式各钉一处：状态机表用破折号接记账出口，循环退出条件句用括注并以「不经 spec」
  // 收尾——蓝图与 METHOD 各两处镜像由此逐处在场。
  assertAnchored([blueprintSpec, method], [
    '或纯调研支经用户通读拍板记账置位——手动形态 dev-research 出口、就地联动形态 dev-clarify 出口',
    '或由纯调研支经用户通读拍板记账置位（手动形态 dev-research 出口、就地联动形态 dev-clarify 出口，不经 spec）',
  ]);
});

test('docs/concepts.md 状态机举例：need 行 fulfilled 推进者含纯调研支经用户通读拍板记账置位（状态机表同口径）', () => {
  assertAnchored([concepts], [
    '或纯调研支经用户通读拍板记账置位——手动形态 dev-research 出口、就地联动形态 dev-clarify 出口',
  ]);
});
