// 清单动词域（spec 20261122-edb2 测试决策 S3/S1，票 20261122-64e9）。
//
// seam = src/kernel/listing.ts（清单数据装配：锁文件读侧 + 编目读侧，只读不写）与
// src/commands/{skill,plugin}/{list,list-remote}.ts 处理器（呈现归命令层、判定归内核，
// 沿 skill-uninstall.test 先例 projectRoot 注入）。期望值独立来源 = spec 实现决策原文
//（按名排序、按 profile 分组、名+安装时间 / 名@版本+安装时间 / 名+描述、与 add 菜单
// 同源同序、空账文案「（无已装技能）/（无已装插件）」）——fixture 字面量直接给定，
// 不由实现推导。

import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  installablePluginEntries,
  installableSkillEntries,
  installedPluginProfileGroups,
  installedSkillRows,
} from '../../src/kernel/listing.ts';
import { LOCKFILE_NAME, PACKAGE_NAME, writeLockfile } from '../../src/kernel/lockfile.ts';
import type { InfraLockfile, PluginLockEntry, SkillLockEntry } from '../../src/kernel/lockfile.ts';
import type { ProgramContext } from '../../src/context.ts';

// fixture 安装时间（字面量——锁文件记账既有字段，测试不生成时间）
const T_ALPHA = '2026-01-01T00:00:00.000Z';
const T_BETA = '2026-01-02T00:00:00.000Z';
const T_GAMMA = '2026-01-03T00:00:00.000Z';

// ---------- 命令处理器（呈现归命令层；沿 skill-uninstall.test 先例 projectRoot 注入）----------
// 清单纯读：断言 stdout 逐字节与零落盘（锁文件与项目落点集不变）。

import { runSkillList } from '../../src/commands/skill/list.ts';
import { runSkillListRemote } from '../../src/commands/skill/list-remote.ts';
import { runPluginList } from '../../src/commands/plugin/list.ts';
import { runPluginListRemote } from '../../src/commands/plugin/list-remote.ts';

function captureOutput(t: TestContext): { out: () => string; err: () => string } {
  const originalOut = process.stdout.write;
  const originalErr = process.stderr.write;
  let outBuf = '';
  let errBuf = '';
  process.stdout.write = ((chunk: unknown) => {
    outBuf += String(chunk);
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: unknown) => {
    errBuf += String(chunk);
    return true;
  }) as typeof process.stderr.write;
  t.after(() => {
    process.stdout.write = originalOut;
    process.stderr.write = originalErr;
  });
  return { out: () => outBuf, err: () => errBuf };
}

function contextFor(packageRoot: string): ProgramContext {
  return { packageRoot, packageVersion: '0.0.0' };
}

// 期望串（fixture 字面量直拼，行格式 = 组头/条目行的呈现契约）
const EXPECT_SKILL_LIST_TWO = `已装技能（2 项，按名排序）：\n  alpha  ${T_BETA}\n  zeta  ${T_ALPHA}\n`;
const EXPECT_SKILL_LIST_EMPTY = '（无已装技能）\n';
const EXPECT_PLUGIN_LIST_EMPTY = '（无已装插件）\n';
const EXPECT_PLUGIN_LIST_GROUPED =
  `已装插件（3 项，按 profile 分组）：\n` +
  `  dev（2 项）：\n    p/alpha@1.0.0  ${T_BETA}\n    p/beta@2.0.0  ${T_ALPHA}\n` +
  `  test（1 项）：\n    p/gamma@3.0.0  ${T_GAMMA}\n`;
const EXPECT_SKILL_LIST_REMOTE =
  '可装技能（3 项，按名排序）：\n  alpha  甲技能描述\n  beta  乙技能描述\n  gamma\n';
const EXPECT_PLUGIN_LIST_REMOTE =
  '可装插件（2 项，按名排序）：\n  @hankchen/pkg-alpha  插件甲\n  @hankchen/pkg-zeta  插件乙\n';

// fixture 包根：skills/{alpha,beta,gamma}（gamma 无 SKILL.md）+ agents/dsh/plugins/{dir-a,dir-b}
function makeFixturePackageRoot(t: TestContext): string {
  const packageRoot = makeDir(t, 'infra-list-pkg-');
  fs.mkdirSync(path.join(packageRoot, 'skills', 'beta'), { recursive: true });
  fs.writeFileSync(path.join(packageRoot, 'skills', 'beta', 'SKILL.md'), '---\ndescription: 乙技能描述\n---\n# beta\n');
  fs.mkdirSync(path.join(packageRoot, 'skills', 'alpha'), { recursive: true });
  fs.writeFileSync(path.join(packageRoot, 'skills', 'alpha', 'SKILL.md'), '---\ndescription: 甲技能描述\n---\n# alpha\n');
  fs.mkdirSync(path.join(packageRoot, 'skills', 'gamma'), { recursive: true }); // 无 SKILL.md
  const hostDir = path.join(packageRoot, 'agents', 'dsh', 'plugins');
  fs.mkdirSync(path.join(hostDir, 'dir-b'), { recursive: true });
  fs.writeFileSync(
    path.join(hostDir, 'dir-b', 'package.json'),
    JSON.stringify({ name: '@hankchen/pkg-zeta', description: '插件乙' }),
  );
  fs.mkdirSync(path.join(hostDir, 'dir-a'), { recursive: true });
  fs.writeFileSync(
    path.join(hostDir, 'dir-a', 'package.json'),
    JSON.stringify({ name: '@hankchen/pkg-alpha', description: '插件甲' }),
  );
  return packageRoot;
}

test('skill list：账 2 技能退 0，stdout 逐字节（按名排序 + 安装时间），锁文件字节不变', (t) => {
  const projectRoot = makeDir(t, 'infra-list-proj-');
  writeProjectLockfile(projectRoot, {
    zeta: { fingerprint: 'f-zeta', installedAt: T_ALPHA },
    alpha: { fingerprint: 'f-alpha', installedAt: T_BETA },
  });
  const before = fs.readFileSync(path.join(projectRoot, LOCKFILE_NAME), 'utf8');
  const captured = captureOutput(t);

  const code = runSkillList({ context: contextFor('/unused'), projectRoot });

  assert.equal(code, 0);
  assert.equal(captured.out(), EXPECT_SKILL_LIST_TWO);
  assert.equal(captured.err(), '');
  assert.equal(fs.readFileSync(path.join(projectRoot, LOCKFILE_NAME), 'utf8'), before, '纯读零落盘');
});

test('skill list：账空（无锁文件）退 0，恰输出「（无已装技能）」，不产生锁文件', (t) => {
  const projectRoot = makeDir(t, 'infra-list-proj-');
  const captured = captureOutput(t);

  const code = runSkillList({ context: contextFor('/unused'), projectRoot });

  assert.equal(code, 0);
  assert.equal(captured.out(), EXPECT_SKILL_LIST_EMPTY);
  assert.equal(fs.existsSync(path.join(projectRoot, LOCKFILE_NAME)), false, '纯读零落盘');
});

test('skill list：锁文件损坏退 1，✗ 走 stderr（不静默降级为空账）', (t) => {
  const projectRoot = makeDir(t, 'infra-list-proj-');
  fs.writeFileSync(path.join(projectRoot, LOCKFILE_NAME), 'not-json', 'utf8');
  const captured = captureOutput(t);

  const code = runSkillList({ context: contextFor('/unused'), projectRoot });

  assert.equal(code, 1);
  assert.equal(captured.out(), '');
  assert.match(captured.err(), /^✗ .*不是合法 JSON/);
});

test('skill list-remote：包内可装全集逐字节（名 + 描述，与 add 菜单同源同序），退 0', (t) => {
  const packageRoot = makeFixturePackageRoot(t);
  const captured = captureOutput(t);

  const code = runSkillListRemote({ context: contextFor(packageRoot), projectRoot: makeDir(t, 'infra-list-proj-') });

  assert.equal(code, 0);
  assert.equal(captured.out(), EXPECT_SKILL_LIST_REMOTE);
  assert.equal(captured.err(), '');
});

test('skill list-remote：编目缺陷（来源目录缺失）退 1，✗ 走 stderr', (t) => {
  const packageRoot = makeDir(t, 'infra-list-pkg-'); // 无 skills/ 目录
  const captured = captureOutput(t);

  const code = runSkillListRemote({ context: contextFor(packageRoot), projectRoot: makeDir(t, 'infra-list-proj-') });

  assert.equal(code, 1);
  assert.equal(captured.out(), '');
  assert.match(captured.err(), /^✗ /);
});

test('plugin list：账 3 项跨 profile 退 0，stdout 逐字节（profile 组行 + 名@版本 + 安装时间）', (t) => {
  const projectRoot = makeDir(t, 'infra-list-proj-');
  writeProjectLockfile(
    projectRoot,
    {},
    {
      'p/beta': { version: '2.0.0', profile: 'dev', installedAt: T_ALPHA },
      'p/alpha': { version: '1.0.0', profile: 'dev', installedAt: T_BETA },
      'p/gamma': { version: '3.0.0', profile: 'test', installedAt: T_GAMMA },
    },
  );
  const before = fs.readFileSync(path.join(projectRoot, LOCKFILE_NAME), 'utf8');
  const captured = captureOutput(t);

  const code = runPluginList({ context: contextFor('/unused'), projectRoot });

  assert.equal(code, 0);
  assert.equal(captured.out(), EXPECT_PLUGIN_LIST_GROUPED);
  assert.equal(captured.err(), '');
  assert.equal(fs.readFileSync(path.join(projectRoot, LOCKFILE_NAME), 'utf8'), before, '纯读零落盘');
});

test('plugin list：账空退 0，恰输出「（无已装插件）」，不产生锁文件', (t) => {
  const projectRoot = makeDir(t, 'infra-list-proj-');
  const captured = captureOutput(t);

  const code = runPluginList({ context: contextFor('/unused'), projectRoot });

  assert.equal(code, 0);
  assert.equal(captured.out(), EXPECT_PLUGIN_LIST_EMPTY);
  assert.equal(fs.existsSync(path.join(projectRoot, LOCKFILE_NAME)), false, '纯读零落盘');
});

test('plugin list：锁文件损坏退 1，✗ 走 stderr', (t) => {
  const projectRoot = makeDir(t, 'infra-list-proj-');
  fs.writeFileSync(path.join(projectRoot, LOCKFILE_NAME), 'not-json', 'utf8');
  const captured = captureOutput(t);

  const code = runPluginList({ context: contextFor('/unused'), projectRoot });

  assert.equal(code, 1);
  assert.match(captured.err(), /^✗ /);
});

test('plugin list-remote：包内编目插件逐字节（正名 + 描述），退 0', (t) => {
  const packageRoot = makeFixturePackageRoot(t);
  const captured = captureOutput(t);

  const code = runPluginListRemote({ context: contextFor(packageRoot), projectRoot: makeDir(t, 'infra-list-proj-') });

  assert.equal(code, 0);
  assert.equal(captured.out(), EXPECT_PLUGIN_LIST_REMOTE);
  assert.equal(captured.err(), '');
});

function makeDir(t: TestContext, prefix: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function writeProjectLockfile(
  projectRoot: string,
  skills: Record<string, SkillLockEntry>,
  plugins?: Record<string, PluginLockEntry>,
): void {
  const lockfile: InfraLockfile = {
    package: PACKAGE_NAME,
    packageVersion: '0.0.0',
    skills,
    ...(plugins ? { plugins } : {}),
  };
  writeLockfile(projectRoot, lockfile);
}

// ---------- 内核清单数据装配：锁文件读侧（spec S3）----------

test('锁文件读侧：skills 记账按名排序，名 + 安装时间逐字段透出', (t) => {
  const projectRoot = makeDir(t, 'infra-list-proj-');
  // 插入序故意乱序（zeta 在前）——排序是装配层职责，期望值按名字面量给定
  writeProjectLockfile(projectRoot, {
    zeta: { fingerprint: 'f-zeta', installedAt: T_ALPHA },
    alpha: { fingerprint: 'f-alpha', installedAt: T_BETA },
  });
  assert.deepEqual(installedSkillRows(projectRoot), [
    { name: 'alpha', installedAt: T_BETA },
    { name: 'zeta', installedAt: T_ALPHA },
  ]);
});

test('锁文件读侧：无锁文件 = 空账（空数组，不抛错）', (t) => {
  const projectRoot = makeDir(t, 'infra-list-proj-');
  assert.deepEqual(installedSkillRows(projectRoot), []);
});

test('锁文件读侧：plugins 分组——profile 组行按名排序、组内条目按名排序、版本与时间透出', (t) => {
  const projectRoot = makeDir(t, 'infra-list-proj-');
  writeProjectLockfile(
    projectRoot,
    {},
    {
      'p/beta': { version: '2.0.0', profile: 'dev', installedAt: T_ALPHA },
      'p/alpha': { version: '1.0.0', profile: 'dev', installedAt: T_BETA },
      'p/gamma': { version: '3.0.0', profile: 'test', installedAt: T_GAMMA },
    },
  );
  assert.deepEqual(installedPluginProfileGroups(projectRoot), [
    {
      profile: 'dev',
      plugins: [
        { name: 'p/alpha', version: '1.0.0', installedAt: T_BETA },
        { name: 'p/beta', version: '2.0.0', installedAt: T_ALPHA },
      ],
    },
    {
      profile: 'test',
      plugins: [{ name: 'p/gamma', version: '3.0.0', installedAt: T_GAMMA }],
    },
  ]);
});

test('锁文件读侧：锁文件无 plugins 区（旧格式）= 空分组，不抛错', (t) => {
  const projectRoot = makeDir(t, 'infra-list-proj-');
  writeProjectLockfile(projectRoot, {});
  assert.deepEqual(installedPluginProfileGroups(projectRoot), []);
});

test('锁文件读侧：锁文件损坏原样上抛（不静默降级为空账）', (t) => {
  const projectRoot = makeDir(t, 'infra-list-proj-');
  fs.writeFileSync(path.join(projectRoot, LOCKFILE_NAME), 'not-json', 'utf8');
  assert.throws(() => installedSkillRows(projectRoot), /不是合法 JSON/);
});

// ---------- 内核清单数据装配：编目读侧（spec S3，与 add 菜单同源同序）----------

test('编目读侧：可装技能按名排序、描述取各 SKILL.md description（缺 SKILL.md 为空描述）', (t) => {
  const packageRoot = makeDir(t, 'infra-list-pkg-');
  fs.mkdirSync(path.join(packageRoot, 'skills', 'beta'), { recursive: true });
  fs.writeFileSync(path.join(packageRoot, 'skills', 'beta', 'SKILL.md'), '---\ndescription: 乙技能描述\n---\n# beta\n');
  fs.mkdirSync(path.join(packageRoot, 'skills', 'alpha'), { recursive: true });
  fs.writeFileSync(path.join(packageRoot, 'skills', 'alpha', 'SKILL.md'), '---\ndescription: 甲技能描述\n---\n# alpha\n');
  fs.mkdirSync(path.join(packageRoot, 'skills', 'gamma'), { recursive: true }); // 无 SKILL.md

  assert.deepEqual(installableSkillEntries(packageRoot), [
    { name: 'alpha', description: '甲技能描述' },
    { name: 'beta', description: '乙技能描述' },
    { name: 'gamma', description: '' },
  ]);
});

test('编目读侧：可装插件按正名（package.json name，非目录名）排序透出描述', (t) => {
  const packageRoot = makeDir(t, 'infra-list-pkg-');
  const hostDir = path.join(packageRoot, 'agents', 'dsh', 'plugins');
  fs.mkdirSync(path.join(hostDir, 'dir-b'), { recursive: true });
  fs.writeFileSync(
    path.join(hostDir, 'dir-b', 'package.json'),
    JSON.stringify({ name: '@hankchen/pkg-zeta', description: '插件乙' }),
  );
  fs.mkdirSync(path.join(hostDir, 'dir-a'), { recursive: true });
  fs.writeFileSync(
    path.join(hostDir, 'dir-a', 'package.json'),
    JSON.stringify({ name: '@hankchen/pkg-alpha', description: '插件甲' }),
  );

  assert.deepEqual(installablePluginEntries(packageRoot), [
    { name: '@hankchen/pkg-alpha', description: '插件甲' },
    { name: '@hankchen/pkg-zeta', description: '插件乙' },
  ]);
});

test('编目读侧：宿主目录无 plugins 机制目录则跳过该宿主（按需建目录口径不变）', (t) => {
  const packageRoot = makeDir(t, 'infra-list-pkg-');
  fs.mkdirSync(path.join(packageRoot, 'agents', 'bare-host'), { recursive: true });
  assert.deepEqual(installablePluginEntries(packageRoot), []);
});
