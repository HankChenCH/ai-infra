// run-mechanics 预演门禁执行纪律静态断言（fix 票 20261122-fe59，issue #340）。
//
// 守护 dev-execute 运行纪律参考件的两条折回落点（blueprint v1.44）：§6 预演节的
// 「门禁命令执行细则」（cwd 锚定仓库根 + 真实退出码）与「check-all 系门红先甄别
// 再处置」（环境偶发判据 + 授权复跑一次）。出处 = spec 0016 运行两次假绿实证教训
// （2026-11-03 stash 悬置 19 天，唯一现存载体 docs/research/20261122-f7a2-stash-
// rescue-archive.md）；期望值独立来源 = 票②正文期望节与 stash 原文措辞（非实现推导）。
// （手法先例：ci-workflow.test.ts「文件即契约」静态守护、codeup-projection-sync.test.ts
// 文档面单点守护。）

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string): string => fs.readFileSync(path.join(packageRoot, rel), 'utf8');

test('run-mechanics §6 预演：门禁命令执行细则落盘（cwd 锚仓库根 + 真实退出码）', () => {
  const runMechanics = read(path.join('skills', 'dev-execute', 'references', 'run-mechanics.md'));
  for (const needle of [
    '门禁命令执行细则',
    '以仓库根为',
    'pipestatus[1]',
    'PIPESTATUS[0]',
    '不得当门禁判据',
    '假绿',
  ]) {
    assert.ok(
      runMechanics.includes(needle),
      `run-mechanics.md 缺门禁命令执行细则关键词「${needle}」——教训折回缺失或措辞漂移`
    );
  }
});

test('run-mechanics §6 预演：check-all 系门红先甄别再处置落盘（环境偶发判据 + 授权复跑）', () => {
  const runMechanics = read(path.join('skills', 'dev-execute', 'references', 'run-mechanics.md'));
  for (const needle of [
    '门红先甄别再处置',
    '环境偶发',
    '复跑一次',
    '再红停机问人',
    '真代码回归特征',
    '预演失败流',
  ]) {
    assert.ok(
      runMechanics.includes(needle),
      `run-mechanics.md 缺门红甄别关键词「${needle}」——教训折回缺失或措辞漂移`
    );
  }
});

test('blueprint v1.44 修订记录：预演门禁执行纪律两条折回已登记（先文档后技能）', () => {
  const blueprint = read(path.join('docs', 'sdlc-skills-blueprint.md'));
  for (const needle of [
    'v1.44 修订记录（dev-execute 预演门禁执行纪律两条折回',
    '门禁命令执行细则',
    'check-all 系门红先甄别再处置',
    '20261122-fe59',
  ]) {
    assert.ok(
      blueprint.includes(needle),
      `sdlc-skills-blueprint.md 缺 v1.44 登记关键词「${needle}」`
    );
  }
  assert.ok(
    /版本 1\.44 · 2026-11-22/.test(blueprint),
    'sdlc-skills-blueprint.md 头部版本行未随 v1.44 更新（v1.25 漏更先例教训）'
  );
});
