// 技能卸载编排域（spec 20261122-edb2 测试决策 S3，票 20261122-bdb8）。
// seam = src/kernel/skill-uninstall.ts（uninstallSkills）与 src/commands/skill/remove.ts
// （runSkillRemove 处理器，projectRoot 注入）。期望值独立来源 = spec 实现决策原文：
// 账本为准（任一无记账整体拒绝）、卸载动作 = 删实体目录 + 只清确属软链的 agent 目录软链
// （含悬空；真实文件/目录占位记冲突跳过）+ 锁文件 skills 清账且 package/packageVersion
// 骨架保留（need FR-5）。夹具用真实 installAssets 造三处落点，不手搓镜像结构。

import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { installAssets } from '../../src/kernel/installer.ts';
import type { InstallRow } from '../../src/kernel/installer.ts';
import { uninstallSkills } from '../../src/kernel/skill-uninstall.ts';
import { readLockfile, writeLockfile, LOCKFILE_NAME, PACKAGE_NAME } from '../../src/kernel/lockfile.ts';

// 与 ASSET_MAP 技能行同构的测试行（同 installer.test.ts 先例）
const SKILL_ROW: InstallRow = {
  type: '技能',
  sourceDir: 'skills',
  installTarget: '.agents/skills',
  symlinkRule: '<agentDir>/skills/<skillName>',
};

function makePackage(t: TestContext, skills: Record<string, Record<string, string>>) {
  const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-pkg-'));
  t.after(() => fs.rmSync(packageRoot, { recursive: true, force: true }));
  for (const [name, files] of Object.entries(skills)) {
    const dir = path.join(packageRoot, 'skills', name);
    for (const [rel, content] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), content);
    }
  }
  return packageRoot;
}

function makeProject(t: TestContext, existingDirs: string[] = []) {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-proj-'));
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));
  for (const dir of existingDirs) {
    fs.mkdirSync(path.join(projectRoot, dir), { recursive: true });
  }
  return projectRoot;
}

// 夹具：真实安装 selected 两处落点（实体 + 软链 + 记账），返回项目根
function installFixture(
  t: TestContext,
  { selected, agentDirs, packageRoot, projectRoot }: {
    selected: string[];
    agentDirs: string[];
    packageRoot: string;
    projectRoot: string;
  },
) {
  installAssets({
    row: SKILL_ROW,
    packageRoot,
    projectRoot,
    agentDirs,
    selected,
    packageVersion: '0.1.0',
    now: '2026-11-15T00:00:00Z',
  });
}

function uninstall(projectRoot: string, selected: string[], agentDirs = ['.claude']) {
  return uninstallSkills({ row: SKILL_ROW, projectRoot, agentDirs, selected });
}

test('卸载所选：实体删、软链删、账清且仅剩未卸项、骨架保留', (t) => {
  const packageRoot = makePackage(t, {
    alpha: { 'SKILL.md': '# alpha' },
    beta: { 'SKILL.md': '# beta' },
  });
  const projectRoot = makeProject(t, ['.claude']);
  installFixture(t, { selected: ['alpha', 'beta'], agentDirs: ['.claude'], packageRoot, projectRoot });

  const result = uninstall(projectRoot, ['alpha']);

  assert.equal(fs.existsSync(path.join(projectRoot, '.agents/skills/alpha')), false, '实体目录应删除');
  assert.equal(fs.existsSync(path.join(projectRoot, '.claude/skills/alpha')), false, 'agent 目录软链应删除');
  assert.equal(fs.lstatSync(path.join(projectRoot, '.claude/skills/beta')).isSymbolicLink(), true, '未卸项软链应保留');
  assert.equal(fs.existsSync(path.join(projectRoot, '.agents/skills/beta/SKILL.md')), true, '未卸项实体应保留');

  const lockfile = readLockfile(projectRoot)!;
  assert.deepEqual(Object.keys(lockfile.skills), ['beta'], '锁文件 skills 应仅剩未卸项');
  assert.equal(lockfile.package, PACKAGE_NAME, '骨架 package 保留');
  assert.equal(lockfile.packageVersion, '0.1.0', '骨架 packageVersion 保留');

  assert.deepEqual(result.removedSkills, ['alpha']);
  assert.deepEqual(result.clearedAgentDirs, ['.claude']);
  assert.deepEqual(result.phantomSkills, []);
  assert.deepEqual(result.conflicts, []);
});

test('--all 形态（账 2 项全卸）：skills 记账清空、package/packageVersion 骨架保留', (t) => {
  const packageRoot = makePackage(t, {
    alpha: { 'SKILL.md': '# alpha' },
    beta: { 'SKILL.md': '# beta' },
  });
  const projectRoot = makeProject(t, ['.claude']);
  installFixture(t, { selected: ['alpha', 'beta'], agentDirs: ['.claude'], packageRoot, projectRoot });

  const result = uninstall(projectRoot, ['alpha', 'beta']);

  assert.equal(fs.existsSync(path.join(projectRoot, '.agents/skills/alpha')), false);
  assert.equal(fs.existsSync(path.join(projectRoot, '.agents/skills/beta')), false);
  assert.equal(fs.existsSync(path.join(projectRoot, '.claude/skills/alpha')), false);
  assert.equal(fs.existsSync(path.join(projectRoot, '.claude/skills/beta')), false);
  const lockfile = readLockfile(projectRoot)!;
  assert.deepEqual(lockfile.skills, {}, 'skills 记账应清空');
  assert.equal(lockfile.package, PACKAGE_NAME, '骨架 package 保留');
  assert.equal(lockfile.packageVersion, '0.1.0', '骨架 packageVersion 保留');
  assert.deepEqual(result.clearedAgentDirs, ['.claude']);
});

test('软链位被真实目录占位：占位记冲突跳过不删、实体与账照清', (t) => {
  const packageRoot = makePackage(t, { alpha: { 'SKILL.md': '# alpha' } });
  const projectRoot = makeProject(t, ['.claude']);
  installFixture(t, { selected: ['alpha'], agentDirs: ['.claude'], packageRoot, projectRoot });
  // 使用者把软链位替换为真实目录
  fs.rmSync(path.join(projectRoot, '.claude/skills/alpha'));
  fs.mkdirSync(path.join(projectRoot, '.claude/skills/alpha'), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, '.claude/skills/alpha/user-file.txt'), 'keep me');

  const result = uninstall(projectRoot, ['alpha']);

  assert.equal(
    fs.readFileSync(path.join(projectRoot, '.claude/skills/alpha/user-file.txt'), 'utf8'),
    'keep me',
    '占位真实目录内容不得被删',
  );
  assert.equal(fs.existsSync(path.join(projectRoot, '.agents/skills/alpha')), false, '实体照删');
  assert.equal(Object.keys(readLockfile(projectRoot)!.skills).length, 0, '账照清');
  assert.deepEqual(result.conflicts.map((c) => c.linkPath), ['.claude/skills/alpha']);
  assert.deepEqual(result.clearedAgentDirs, [], '无软链可清则不计 clearedAgentDirs');
});

test('账在实亡（实体已手动删、软链悬空）：账清、悬空软链照删、phantom 记录', (t) => {
  const packageRoot = makePackage(t, { alpha: { 'SKILL.md': '# alpha' } });
  const projectRoot = makeProject(t, ['.claude']);
  installFixture(t, { selected: ['alpha'], agentDirs: ['.claude'], packageRoot, projectRoot });
  // 手动删实体 → .claude/skills/alpha 成为悬空软链
  fs.rmSync(path.join(projectRoot, '.agents/skills/alpha'), { recursive: true });
  assert.equal(fs.lstatSync(path.join(projectRoot, '.claude/skills/alpha')).isSymbolicLink(), true);

  const result = uninstall(projectRoot, ['alpha']);

  assert.equal(fs.lstatSync(path.join(projectRoot, '.claude/skills/alpha'), { throwIfNoEntry: false }), undefined, '悬空软链照删');
  assert.deepEqual(Object.keys(readLockfile(projectRoot)!.skills), [], '账清');
  assert.deepEqual(result.phantomSkills, ['alpha'], '实体已不在应记账在实亡');
  assert.deepEqual(result.clearedAgentDirs, ['.claude']);
});

test('账在实亡（无软链落点）：phantom 记录、账清、不抛错', (t) => {
  const packageRoot = makePackage(t, { alpha: { 'SKILL.md': '# alpha' } });
  const projectRoot = makeProject(t);
  installFixture(t, { selected: ['alpha'], agentDirs: [], packageRoot, projectRoot });
  fs.rmSync(path.join(projectRoot, '.agents/skills/alpha'), { recursive: true });

  const result = uninstall(projectRoot, ['alpha'], []);

  assert.deepEqual(result.phantomSkills, ['alpha']);
  assert.deepEqual(Object.keys(readLockfile(projectRoot)!.skills), []);
});

test('多 agent 目录软链各清各的；不存在的 agent 目录不进 clearedAgentDirs', (t) => {
  const packageRoot = makePackage(t, { alpha: { 'SKILL.md': '# alpha' } });
  const projectRoot = makeProject(t, ['.claude', '.zcode']);
  installFixture(t, { selected: ['alpha'], agentDirs: ['.claude', '.zcode'], packageRoot, projectRoot });

  const result = uninstall(projectRoot, ['alpha'], ['.claude', '.zcode', '.missing']);

  assert.equal(fs.existsSync(path.join(projectRoot, '.claude/skills/alpha')), false);
  assert.equal(fs.existsSync(path.join(projectRoot, '.zcode/skills/alpha')), false);
  assert.deepEqual(result.clearedAgentDirs.sort(), ['.claude', '.zcode']);
});

test('未记账名在内核拒绝（账本为准不变式，命令层预校验之外的防线）', (t) => {
  const packageRoot = makePackage(t, { alpha: { 'SKILL.md': '# alpha' } });
  const projectRoot = makeProject(t, ['.claude']);
  installFixture(t, { selected: ['alpha'], agentDirs: ['.claude'], packageRoot, projectRoot });

  assert.throws(() => uninstall(projectRoot, ['ghost']), /ghost/);
  assert.equal(fs.existsSync(path.join(projectRoot, '.agents/skills/alpha')), true, '拒绝路径不得动实体');
});

test('锁文件不存在：拒绝卸载（先有记账才有卸载）', (t) => {
  const projectRoot = makeProject(t, ['.claude']);
  assert.throws(() => uninstall(projectRoot, ['alpha']), /锁文件/);
});

test('空选择显式拒绝', (t) => {
  const packageRoot = makePackage(t, { alpha: { 'SKILL.md': '# alpha' } });
  const projectRoot = makeProject(t, ['.claude']);
  installFixture(t, { selected: ['alpha'], agentDirs: ['.claude'], packageRoot, projectRoot });
  assert.throws(() => uninstall(projectRoot, []), /选择/);
});

test('卸载后重装同款：三处落点恢复（账与实体/软链一致）', (t) => {
  const packageRoot = makePackage(t, { alpha: { 'SKILL.md': '# alpha' } });
  const projectRoot = makeProject(t, ['.claude']);
  installFixture(t, { selected: ['alpha'], agentDirs: ['.claude'], packageRoot, projectRoot });
  uninstall(projectRoot, ['alpha']);
  installAssets({
    row: SKILL_ROW,
    packageRoot,
    projectRoot,
    agentDirs: ['.claude'],
    selected: ['alpha'],
    packageVersion: '0.1.0',
    now: '2026-11-16T00:00:00Z',
  });
  const lockfile = readLockfile(projectRoot)!;
  assert.deepEqual(Object.keys(lockfile.skills), ['alpha']);
  assert.equal(lockfile.skills.alpha.installedAt, '2026-11-16T00:00:00Z', '重装记账新时间');
  assert.equal(fs.lstatSync(path.join(projectRoot, '.claude/skills/alpha')).isSymbolicLink(), true);
});

// ---------- runSkillRemove 处理器（projectRoot 注入）：分支行为与零落盘 ----------

// 静音 clack 的 stdout 呈现（单测断言出口码与盘上状态，不测渲染）
function silenceStdout(t: TestContext): void {
  const original = process.stdout.write;
  process.stdout.write = (() => true) as typeof process.stdout.write;
  t.after(() => {
    process.stdout.write = original;
  });
}

async function runHandler(t: TestContext, projectRoot: string, argv: { tokens: string[]; all: boolean }) {
  silenceStdout(t);
  const { runSkillRemove } = await import('../../src/commands/skill/remove.ts');
  return runSkillRemove({ tokens: argv.tokens, all: argv.all, context: { packageRoot: '/unused', packageVersion: '0.0.0' }, projectRoot });
}

test('--all 空账：提示退 0、零落盘', async (t) => {
  const projectRoot = makeProject(t, ['.claude']);
  const code = await runHandler(t, projectRoot, { tokens: [], all: true });
  assert.equal(code, 0, '空账 --all 应退 0');
  assert.equal(fs.existsSync(path.join(projectRoot, LOCKFILE_NAME)), false, '空账 --all 不得写锁文件');
});

test('--all 有账 2 项：全卸退 0（与带名同语义）', async (t) => {
  const packageRoot = makePackage(t, {
    alpha: { 'SKILL.md': '# alpha' },
    beta: { 'SKILL.md': '# beta' },
  });
  const projectRoot = makeProject(t, ['.claude']);
  installFixture(t, { selected: ['alpha', 'beta'], agentDirs: ['.claude'], packageRoot, projectRoot });

  const code = await runHandler(t, projectRoot, { tokens: [], all: true });
  assert.equal(code, 0);
  assert.equal(fs.existsSync(path.join(projectRoot, '.agents/skills/alpha')), false);
  assert.equal(fs.existsSync(path.join(projectRoot, '.agents/skills/beta')), false);
  assert.deepEqual(readLockfile(projectRoot)!.skills, {}, 'skills 记账清空');
  assert.equal(readLockfile(projectRoot)!.packageVersion, '0.1.0', '骨架保留');
});

test('部分未记账：整体拒绝退 1、零落盘、已记账项不卸', async (t) => {
  const packageRoot = makePackage(t, { alpha: { 'SKILL.md': '# alpha' } });
  const projectRoot = makeProject(t, ['.claude']);
  installFixture(t, { selected: ['alpha'], agentDirs: ['.claude'], packageRoot, projectRoot });
  const before = fs.readFileSync(path.join(projectRoot, LOCKFILE_NAME), 'utf8');

  const code = await runHandler(t, projectRoot, { tokens: ['alpha,ghost'], all: false });
  assert.equal(code, 1, '部分未记账应整体拒绝退 1');
  assert.equal(fs.readFileSync(path.join(projectRoot, LOCKFILE_NAME), 'utf8'), before, '锁文件零改动');
  assert.equal(fs.existsSync(path.join(projectRoot, '.agents/skills/alpha')), true, '已记账项不卸');
  assert.equal(fs.lstatSync(path.join(projectRoot, '.claude/skills/alpha')).isSymbolicLink(), true, '软链不动');
});

test('全未记账：拒绝退 1、零落盘', async (t) => {
  const packageRoot = makePackage(t, { alpha: { 'SKILL.md': '# alpha' } });
  const projectRoot = makeProject(t, ['.claude']);
  installFixture(t, { selected: ['alpha'], agentDirs: ['.claude'], packageRoot, projectRoot });
  const before = fs.readFileSync(path.join(projectRoot, LOCKFILE_NAME), 'utf8');

  const code = await runHandler(t, projectRoot, { tokens: ['ghost'], all: false });
  assert.equal(code, 1);
  assert.equal(fs.readFileSync(path.join(projectRoot, LOCKFILE_NAME), 'utf8'), before);
});

test('带名在账：卸载退 0，三处落点清干净', async (t) => {
  const packageRoot = makePackage(t, { alpha: { 'SKILL.md': '# alpha' } });
  const projectRoot = makeProject(t, ['.claude']);
  installFixture(t, { selected: ['alpha'], agentDirs: ['.claude'], packageRoot, projectRoot });

  const code = await runHandler(t, projectRoot, { tokens: ['alpha'], all: false });
  assert.equal(code, 0);
  assert.equal(fs.existsSync(path.join(projectRoot, '.agents/skills/alpha')), false);
  assert.equal(fs.existsSync(path.join(projectRoot, '.claude/skills/alpha')), false);
  assert.deepEqual(readLockfile(projectRoot)!.skills, {});
});

test('占位冲突经处理器：退 0、占位保留、账清', async (t) => {
  const packageRoot = makePackage(t, { alpha: { 'SKILL.md': '# alpha' } });
  const projectRoot = makeProject(t, ['.claude']);
  installFixture(t, { selected: ['alpha'], agentDirs: ['.claude'], packageRoot, projectRoot });
  fs.rmSync(path.join(projectRoot, '.claude/skills/alpha'));
  fs.mkdirSync(path.join(projectRoot, '.claude/skills/alpha'), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, '.claude/skills/alpha/user-file.txt'), 'keep me');

  const code = await runHandler(t, projectRoot, { tokens: ['alpha'], all: false });
  assert.equal(code, 0, '占位冲突按跳过处置、不失败');
  assert.equal(fs.readFileSync(path.join(projectRoot, '.claude/skills/alpha/user-file.txt'), 'utf8'), 'keep me');
  assert.deepEqual(readLockfile(projectRoot)!.skills, {});
});

test('锁文件损坏：✗ 通道退 1（不静默降级）', async (t) => {
  const projectRoot = makeProject(t, ['.claude']);
  writeLockfile(projectRoot, { package: PACKAGE_NAME, packageVersion: '0.1.0', skills: {} });
  fs.writeFileSync(path.join(projectRoot, LOCKFILE_NAME), '{ not-json', 'utf8');

  const code = await runHandler(t, projectRoot, { tokens: ['alpha'], all: false });
  assert.equal(code, 1, '锁文件损坏应退 1');
});
