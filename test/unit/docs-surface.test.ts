// 面向使用者的文档命令面静态断言（spec 20261116-2c58 FR-6，票 20261116-bfcf）。
//
// README.md 与 docs/getting-started.md 的命令示例必须与新命令面同相：含 `skill add` /
// `plugin add` 形态示例与升级叙事，不含已退役旧旗标名（--skills/--plugins）与裸跑两层菜单
// 旧形态描述；GLOSSARY 安装器词条含子命令形态描述。期望值独立来源 = spec FR-6 验收场景原文
// 与票面文档纪律（非实现推导）——命令面再变时，本测试与文档同批改。
// （手法的先例：ci-workflow.test.ts「文件即契约」静态守护。）
//
// 卸载与清单六动词（spec 20261122-edb2 FR-6，票 20261122-350f）：README 与 getting-started
// 含 remove/list/list-remote 双侧（skill 与 plugin）形态示例与卸载叙事、已知边界（锁文件
// plugins 账面单条目、后装覆盖、--profile 覆盖是唯一显式出口）写明；GLOSSARY 套件资产词条
// 命令面更新为六动词口径并在项目术语章登记「已装记录」「安装落点」。锚词 = 文档关键句字面，
// 独立来源 = spec FR-6 验收场景原文（非实现推导）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string): string => fs.readFileSync(path.join(packageRoot, rel), 'utf8');

// 已退役旧形态（FR-6 负向断言清单）：旧旗标名 + 裸跑两层菜单叙事
const RETIRED_TOKENS = ['--skills', '--plugins', '两层菜单'];

test('README 快速上手：skill add 形态示例、不含旧旗标与两层菜单旧形态', () => {
  const readme = read('README.md');
  assert.ok(readme.includes('npx @hankchen/infra skill add'), 'README 应含 skill add 形态示例');
  for (const token of RETIRED_TOKENS) {
    assert.equal(readme.includes(token), false, `README 不得含旧形态 ${token}`);
  }
});

test('getting-started：skill add 与 plugin add 形态示例齐备、不含旧旗标与两层菜单旧形态', () => {
  const guide = read(path.join('docs', 'getting-started.md'));
  for (const needle of [
    'npx @hankchen/infra skill add',
    'npx @hankchen/infra skill add --all',
    'npx @hankchen/infra plugin add @hankchen/dsh-demo --profile',
    'npx @hankchen/infra plugin add',
  ]) {
    assert.ok(guide.includes(needle), `getting-started 应含 ${needle}`);
  }
  for (const token of RETIRED_TOKENS) {
    assert.equal(guide.includes(token), false, `getting-started 不得含旧形态 ${token}`);
  }
});

test('getting-started：升级叙事含「重跑 skill add 即刷新」与 0.1.x 使用者指路', () => {
  const guide = read(path.join('docs', 'getting-started.md'));
  assert.ok(guide.includes('重跑即升级'), '应含重跑刷新叙事');
  assert.match(guide, /从 0\.1\.x 升级[^]*?skill add/, '应含 0.1.x 使用者改跑 skill add 即刷新的升级指路');
});

test('GLOSSARY 安装器词条：含子命令形态描述（skill add / plugin add --profile）', () => {
  const glossary = read('GLOSSARY.md');
  for (const needle of ['skill add [名...]', 'plugin add [名...] --profile <名>']) {
    assert.ok(glossary.includes(needle), `GLOSSARY 安装器词条应含子命令形态 ${needle}`);
  }
});

test('README：卸载与清单双侧形态示例齐备（skill 与 plugin 两侧）', () => {
  const readme = read('README.md');
  for (const needle of [
    'npx @hankchen/infra skill rm', // skill 侧卸载形态
    'npx @hankchen/infra skill ls', // skill 侧清单形态
    'npx @hankchen/infra plugin rm', // plugin 侧卸载形态
    'npx @hankchen/infra plugin ls', // plugin 侧清单形态
  ]) {
    assert.ok(readme.includes(needle), `README 应含双侧形态示例 ${needle}`);
  }
});

test('README：卸载叙事以锁文件记账为准（无记账拒卸护栏）', () => {
  const readme = read('README.md');
  assert.ok(
    readme.includes('以 `.infra-lock.json` 记账为准'),
    'README 卸载叙事应写明以 .infra-lock.json 记账为准',
  );
  assert.ok(readme.includes('无记账的名字不会被动'), 'README 卸载叙事应写明无记账拒卸护栏');
});

test('getting-started：skill 侧 remove/list/list-remote 形态示例齐备', () => {
  const guide = read(path.join('docs', 'getting-started.md'));
  for (const needle of [
    'npx @hankchen/infra skill remove dev-spec', // 卸载主名形态
    'npx @hankchen/infra skill remove --all', // 全卸形态
    'npx @hankchen/infra skill list', // 已装清单
    'npx @hankchen/infra skill list-remote', // 可装清单
  ]) {
    assert.ok(guide.includes(needle), `getting-started 应含 skill 侧形态示例 ${needle}`);
  }
});

test('getting-started：plugin 侧 remove/list/list-remote 形态示例齐备（含 --profile 覆盖）', () => {
  const guide = read(path.join('docs', 'getting-started.md'));
  for (const needle of [
    'npx @hankchen/infra plugin remove @hankchen/dsh-demo', // 卸载（profile 账面定位）
    'npx @hankchen/infra plugin remove @hankchen/dsh-demo --profile test', // 覆盖账面 profile
    'npx @hankchen/infra plugin list', // 已装清单（按 profile 分组）
    'npx @hankchen/infra plugin list-remote', // 可装清单
  ]) {
    assert.ok(guide.includes(needle), `getting-started 应含 plugin 侧形态示例 ${needle}`);
  }
});

test('getting-started：卸载叙事与已知边界写明（账面单条目、后装覆盖、--profile 唯一显式出口）', () => {
  const guide = read(path.join('docs', 'getting-started.md'));
  assert.ok(
    guide.includes('一次清干净'),
    'getting-started 卸载叙事应写明实体+软链+记账一次清干净',
  );
  assert.ok(
    guide.includes('每名恰一条'),
    'getting-started 应写明锁文件 plugins 账面每名恰一条',
  );
  assert.ok(guide.includes('后装覆盖'), 'getting-started 应写明后装覆盖边界');
  assert.ok(
    guide.includes('唯一显式出口'),
    'getting-started 应写明 --profile 覆盖是唯一显式出口',
  );
});

test('GLOSSARY 套件资产词条：命令面更新为六动词口径（remove/list/list-remote 双侧）', () => {
  const glossary = read('GLOSSARY.md');
  for (const needle of [
    'skill remove [名...] [--all]',
    'skill list',
    'skill list-remote',
    'plugin remove [名...] [--all]',
    'plugin list',
    'plugin list-remote',
  ]) {
    assert.ok(glossary.includes(needle), `GLOSSARY 套件资产词条应含六动词口径 ${needle}`);
  }
});

test('GLOSSARY 项目术语章：登记「已装记录」与「安装落点」（首次出现 spec 20261122-edb2）', () => {
  const glossary = read('GLOSSARY.md');
  const projectTerms = glossary.slice(glossary.indexOf('## 项目术语'));
  for (const term of ['**已装记录**', '**安装落点**']) {
    assert.ok(projectTerms.includes(term), `GLOSSARY 项目术语章应登记 ${term}`);
  }
  assert.ok(
    projectTerms.includes('（首次出现：spec 20261122-edb2'),
    'GLOSSARY 两新术语应标注首次出现 spec 20261122-edb2',
  );
});
