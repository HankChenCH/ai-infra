// 插件卸载编排域（spec 20261122-edb2 测试决策 S3，票 20261122-0204）。
// seam = src/kernel/plugin-uninstall.ts（uninstallPlugins）与 src/kernel/reconcile.ts
// （reconcilePluginUninstall 卸后对账）。期望值独立来源 = spec 实现决策原文：
// 官方命令形态 `dsh plugin --profile <名> remove <包>`（profile 与包名独立 argv 元素）、
// npx 回退形态、卸后对账两落点消失才清账（对账失败账面保留）、批量逐条顺序执行单条失败
// 中止报已完成/未完成清单、node floor 前置拒绝不发起官方调用、desktop 无保留名分支、
// 账全空骨架保留（need FR-5）。执行体注入桩断言 argv 形态（期望值为 spec 原文形态字面）。

import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { uninstallPlugins } from '../../src/kernel/plugin-uninstall.ts';
import type { CommandRunner } from '../../src/kernel/plugin-install.ts';
import { readLockfile, writeLockfile, LOCKFILE_NAME, PACKAGE_NAME } from '../../src/kernel/lockfile.ts';

const PKG = '@hankchen/dsh-demo';

// 官方语义的 profile 两落点形态（与安装对账切片同构：dependencies 依赖行 + dsh.profile.bundles 行）
interface ProfilePackage {
  dependencies?: Record<string, string>;
  dsh?: { profile?: { bundles?: string[] } };
}

function makeProject(t: TestContext) {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-pluginrm-'));
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));
  return projectRoot;
}

function makeProfilesRoot(t: TestContext) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'infra-pluginrm-profiles-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

// 按官方两落点形态给 profile 播种已装包（卸载夹具的起点；文件形态与安装侧对账切片一致）
function seedProfile(profilesRoot: string, profile: string, packages: string[]): void {
  const dir = path.join(profilesRoot, profile);
  fs.mkdirSync(dir, { recursive: true });
  const pkgFile = path.join(dir, 'package.json');
  const pkg: ProfilePackage = fs.existsSync(pkgFile) ? JSON.parse(fs.readFileSync(pkgFile, 'utf8')) : {};
  for (const name of packages) {
    pkg.dependencies = { ...(pkg.dependencies ?? {}), [name]: '0.1.0' };
    pkg.dsh = { ...(pkg.dsh ?? {}), profile: { bundles: [...(pkg.dsh?.profile?.bundles ?? []), name] } };
  }
  fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2));
}

function seedLockfile(projectRoot: string, plugins: Record<string, { version: string; profile: string }>, skills: Record<string, unknown> = {}): void {
  writeLockfile(projectRoot, {
    package: PACKAGE_NAME,
    packageVersion: '0.1.0',
    skills: skills as Record<string, { fingerprint: string; installedAt: string }>,
    plugins: Object.fromEntries(
      Object.entries(plugins).map(([name, entry]) => [name, { ...entry, installedAt: '2026-11-15T00:00:00Z' }]),
    ),
  });
}

// 官方命令模拟执行体：记录调用；remove 分支按官方语义删 profile 两落点（failFor 模拟非零
// 退出、noopFor 模拟成功但落点不动）；add 分支写两落点（夹具经官方同款路径装）。
function makeOfficialSim(t: TestContext, profilesRoot: string, { failFor = [], noopFor = [] }: { failFor?: string[]; noopFor?: string[] } = {}) {
  const calls: { command: string; args: string[] }[] = [];
  const run: CommandRunner = ({ command, args }) => {
    calls.push({ command, args });
    const verb = args[args.indexOf('plugin') + 3];
    const name = args.at(-1)!;
    if (verb === 'remove') {
      if (failFor.includes(name)) {
        return { status: 1, stdout: '', stderr: 'npm error simulated failure' };
      }
      if (noopFor.includes(name)) {
        return { status: 0, stdout: '', stderr: '' };
      }
      const profile = args[args.indexOf('plugin') + 2];
      const pkgFile = path.join(profilesRoot, profile, 'package.json');
      if (fs.existsSync(pkgFile)) {
        const pkg: ProfilePackage = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
        if (pkg.dependencies !== undefined) {
          delete pkg.dependencies[name];
        }
        if (pkg.dsh?.profile?.bundles !== undefined) {
          pkg.dsh.profile.bundles = pkg.dsh.profile.bundles.filter((entry) => entry !== name);
        }
        fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2));
      }
      return { status: 0, stdout: '', stderr: '' };
    }
    const profile = args[args.indexOf('plugin') + 2];
    seedProfile(profilesRoot, profile, [name]);
    return { status: 0, stdout: '', stderr: '' };
  };
  return { calls, run };
}

function uninstall({
  targets,
  profilesRoot,
  projectRoot,
  run,
  nodeVersion = 'v24.22.1',
  dshInPath = true,
}: {
  targets: Array<{ name: string; profile: string }>;
  profilesRoot: string;
  projectRoot: string;
  run: CommandRunner;
  nodeVersion?: string;
  dshInPath?: boolean;
}) {
  return uninstallPlugins({
    targets,
    profilesRoot,
    dshInPath,
    projectRoot,
    nodeVersion,
    run,
  });
}

test('卸载转发形态：官方命令收到 plugin --profile dev remove <包>，两落点消失、锁文件清账', (t) => {
  const projectRoot = makeProject(t);
  const profilesRoot = makeProfilesRoot(t);
  seedProfile(profilesRoot, 'dev', [PKG]);
  seedLockfile(projectRoot, { [PKG]: { version: '0.1.0', profile: 'dev' } });
  const sim = makeOfficialSim(t, profilesRoot);

  const result = uninstall({ targets: [{ name: PKG, profile: 'dev' }], profilesRoot, projectRoot, run: sim.run });

  assert.deepEqual(result.removed, [{ name: PKG, profile: 'dev' }]);
  assert.equal(sim.calls.length, 1, '官方命令应恰好执行一次');
  assert.equal(sim.calls[0].command, 'dsh');
  assert.deepEqual(sim.calls[0].args, ['plugin', '--profile', 'dev', 'remove', PKG]);

  const profilePkg: ProfilePackage = JSON.parse(fs.readFileSync(path.join(profilesRoot, 'dev', 'package.json'), 'utf8'));
  assert.equal(profilePkg.dependencies?.[PKG], undefined, '依赖行应消失');
  assert.deepEqual(profilePkg.dsh?.profile?.bundles, [], 'bundles 行应不含该包');

  const lockfile = readLockfile(projectRoot)!;
  assert.deepEqual(lockfile.plugins, {}, '锁文件 plugins 应清账');
  assert.equal(lockfile.package, PACKAGE_NAME, '骨架 package 保留');
  assert.equal(lockfile.packageVersion, '0.1.0', '骨架 packageVersion 保留');
});

test('dsh 不在 PATH：执行体收到 npx --yes @deepseek-ai/dsh + 同款 remove 参数', (t) => {
  const projectRoot = makeProject(t);
  const profilesRoot = makeProfilesRoot(t);
  seedProfile(profilesRoot, 'dev', [PKG]);
  seedLockfile(projectRoot, { [PKG]: { version: '0.1.0', profile: 'dev' } });
  const sim = makeOfficialSim(t, profilesRoot);

  uninstall({ targets: [{ name: PKG, profile: 'dev' }], profilesRoot, projectRoot, dshInPath: false, run: sim.run });

  assert.equal(sim.calls[0].command, 'npx');
  assert.deepEqual(sim.calls[0].args, ['--yes', '@deepseek-ai/dsh', 'plugin', '--profile', 'dev', 'remove', PKG]);
});

test('--profile 覆盖：转发与对账都用给定 profile、锁文件清该名账面记录', (t) => {
  const projectRoot = makeProject(t);
  const profilesRoot = makeProfilesRoot(t);
  // 账面记 dev；显式覆盖为 test——官方命令与对账都落 test
  seedProfile(profilesRoot, 'dev', [PKG]);
  seedProfile(profilesRoot, 'test', [PKG]);
  seedLockfile(projectRoot, { [PKG]: { version: '0.1.0', profile: 'dev' } });
  const sim = makeOfficialSim(t, profilesRoot);

  uninstall({ targets: [{ name: PKG, profile: 'test' }], profilesRoot, projectRoot, run: sim.run });

  assert.deepEqual(sim.calls[0].args, ['plugin', '--profile', 'test', 'remove', PKG], '转发应用覆盖 profile');
  const devPkg: ProfilePackage = JSON.parse(fs.readFileSync(path.join(profilesRoot, 'dev', 'package.json'), 'utf8'));
  const testPkg: ProfilePackage = JSON.parse(fs.readFileSync(path.join(profilesRoot, 'test', 'package.json'), 'utf8'));
  assert.equal(devPkg.dependencies?.[PKG], '0.1.0', '账面 profile dev 的落点不得被动');
  assert.equal(testPkg.dependencies?.[PKG], undefined, '覆盖 profile test 的落点应消失');
  assert.deepEqual(readLockfile(projectRoot)!.plugins, {}, '锁文件清该名账面记录');
});

test('批量逐条顺序执行、各按各自 profile：两笔 remove 逐条转发', (t) => {
  const projectRoot = makeProject(t);
  const profilesRoot = makeProfilesRoot(t);
  seedProfile(profilesRoot, 'dev', ['@hankchen/one']);
  seedProfile(profilesRoot, 'test', ['@hankchen/two']);
  seedLockfile(projectRoot, {
    '@hankchen/one': { version: '0.1.0', profile: 'dev' },
    '@hankchen/two': { version: '0.1.0', profile: 'test' },
  });
  const sim = makeOfficialSim(t, profilesRoot);

  const result = uninstall({
    targets: [
      { name: '@hankchen/one', profile: 'dev' },
      { name: '@hankchen/two', profile: 'test' },
    ],
    profilesRoot,
    projectRoot,
    run: sim.run,
  });

  assert.deepEqual(sim.calls.map((c) => c.args), [
    ['plugin', '--profile', 'dev', 'remove', '@hankchen/one'],
    ['plugin', '--profile', 'test', 'remove', '@hankchen/two'],
  ], '应按给定顺序逐条以各自 profile 转发');
  assert.deepEqual(result.removed.map((r) => r.name), ['@hankchen/one', '@hankchen/two']);
  assert.deepEqual(readLockfile(projectRoot)!.plugins, {}, '两笔账面均清');
});

test('单条失败即中止：报已完成/未完成清单、已完成项账面清理保留、失败项账面未动', (t) => {
  const projectRoot = makeProject(t);
  const profilesRoot = makeProfilesRoot(t);
  seedProfile(profilesRoot, 'dev', ['@hankchen/ok', '@hankchen/fail', '@hankchen/never']);
  seedLockfile(projectRoot, {
    '@hankchen/ok': { version: '0.1.0', profile: 'dev' },
    '@hankchen/fail': { version: '0.1.0', profile: 'dev' },
    '@hankchen/never': { version: '0.1.0', profile: 'dev' },
  });
  const sim = makeOfficialSim(t, profilesRoot, { failFor: ['@hankchen/fail'] });

  assert.throws(
    () => uninstall({
      targets: [
        { name: '@hankchen/ok', profile: 'dev' },
        { name: '@hankchen/fail', profile: 'dev' },
        { name: '@hankchen/never', profile: 'dev' },
      ],
      profilesRoot,
      projectRoot,
      run: sim.run,
    }),
    (err) => {
      const message = (err as Error).message;
      assert.match(message, /@hankchen\/fail/, '报错须指明失败的插件');
      assert.match(message, /已完成：@hankchen\/ok/, '报错须含已完成清单');
      assert.match(message, /未完成：@hankchen\/fail、@hankchen\/never/, '报错须含未完成清单');
      return true;
    },
  );
  assert.equal(sim.calls.length, 2, '失败后不应继续执行后续官方命令');
  const lockfile = readLockfile(projectRoot)!.plugins!;
  assert.deepEqual(Object.keys(lockfile), ['@hankchen/fail', '@hankchen/never'], '已完成项账面清理保留、失败与未执行项未动');
});

test('官方命令成功但两落点仍在：对账失败、账面保留、报错含落点与 profile 路径', (t) => {
  const projectRoot = makeProject(t);
  const profilesRoot = makeProfilesRoot(t);
  seedProfile(profilesRoot, 'dev', [PKG]);
  seedLockfile(projectRoot, { [PKG]: { version: '0.1.0', profile: 'dev' } });
  const sim = makeOfficialSim(t, profilesRoot, { noopFor: [PKG] }); // 成功退出但落点不动

  assert.throws(
    () => uninstall({ targets: [{ name: PKG, profile: 'dev' }], profilesRoot, projectRoot, run: sim.run }),
    (err) => {
      const message = (err as Error).message;
      assert.match(message, /卸载对账失败/, '报错应点名卸载对账失败');
      assert.match(message, /dsh\.profile\.bundles/, '报错应点名仍在的落点');
      assert.ok(message.includes(path.join(profilesRoot, 'dev')), '报错应含 profile 路径');
      return true;
    },
  );
  assert.deepEqual(Object.keys(readLockfile(projectRoot)!.plugins!), [PKG], '对账失败账面保留（dsh 侧状态不明时账是安全默认）');
});

test('node 低于官方 floor：第一时刻拒绝、官方命令一次都不执行、锁文件不动', (t) => {
  const projectRoot = makeProject(t);
  const profilesRoot = makeProfilesRoot(t);
  seedProfile(profilesRoot, 'dev', [PKG]);
  seedLockfile(projectRoot, { [PKG]: { version: '0.1.0', profile: 'dev' } });
  const before = fs.readFileSync(path.join(projectRoot, LOCKFILE_NAME), 'utf8');
  const sim = makeOfficialSim(t, profilesRoot);

  assert.throws(
    () => uninstall({ targets: [{ name: PKG, profile: 'dev' }], profilesRoot, projectRoot, nodeVersion: 'v22.23.4', run: sim.run }),
    (err) => (err as Error).message.includes('22.23.4'),
  );
  assert.equal(sim.calls.length, 0, '拒绝不得执行任何官方命令');
  assert.equal(fs.readFileSync(path.join(projectRoot, LOCKFILE_NAME), 'utf8'), before, '拒绝路径锁文件零改动');
});

test('profile 为 desktop：无保留名分支、全链照旧（转发、对账、清账）', (t) => {
  const projectRoot = makeProject(t);
  const profilesRoot = makeProfilesRoot(t);
  seedProfile(profilesRoot, 'desktop', [PKG]);
  seedLockfile(projectRoot, { [PKG]: { version: '0.1.0', profile: 'desktop' } });
  const sim = makeOfficialSim(t, profilesRoot);

  const result = uninstall({ targets: [{ name: PKG, profile: 'desktop' }], profilesRoot, projectRoot, run: sim.run });

  assert.deepEqual(sim.calls[0].args, ['plugin', '--profile', 'desktop', 'remove', PKG], 'desktop 照常转发');
  assert.deepEqual(result.removed, [{ name: PKG, profile: 'desktop' }]);
  assert.deepEqual(readLockfile(projectRoot)!.plugins, {});
});

test('skills 与 plugins 记账均卸空：锁文件骨架保留（package/packageVersion 在、两账空对象）', (t) => {
  const projectRoot = makeProject(t);
  const profilesRoot = makeProfilesRoot(t);
  seedProfile(profilesRoot, 'dev', [PKG]);
  seedLockfile(projectRoot, { [PKG]: { version: '0.1.0', profile: 'dev' } });
  const sim = makeOfficialSim(t, profilesRoot);

  uninstall({ targets: [{ name: PKG, profile: 'dev' }], profilesRoot, projectRoot, run: sim.run });

  const lockfile = readLockfile(projectRoot)!;
  assert.deepEqual(lockfile.skills, {}, 'skills 记账为空对象');
  assert.deepEqual(lockfile.plugins, {}, 'plugins 记账为空对象');
  assert.equal(lockfile.package, PACKAGE_NAME, '骨架 package 保留');
  assert.equal(lockfile.packageVersion, '0.1.0', '骨架 packageVersion 保留');
});

test('未记账名在内核拒绝（账面为准不变式，命令层预校验之外的防线）、零官方调用', (t) => {
  const projectRoot = makeProject(t);
  const profilesRoot = makeProfilesRoot(t);
  seedProfile(profilesRoot, 'dev', [PKG]);
  seedLockfile(projectRoot, { [PKG]: { version: '0.1.0', profile: 'dev' } });
  const sim = makeOfficialSim(t, profilesRoot);

  assert.throws(
    () => uninstall({ targets: [{ name: '@hankchen/ghost', profile: 'dev' }], profilesRoot, projectRoot, run: sim.run }),
    (err) => (err as Error).message.includes('@hankchen/ghost'),
  );
  assert.equal(sim.calls.length, 0, '内核拒绝不得执行任何官方命令');
  assert.deepEqual(Object.keys(readLockfile(projectRoot)!.plugins!), [PKG], '账面零改动');
});

test('锁文件不存在：拒绝卸载（先有记账才有卸载）', (t) => {
  const projectRoot = makeProject(t);
  const profilesRoot = makeProfilesRoot(t);
  const sim = makeOfficialSim(t, profilesRoot);
  assert.throws(
    () => uninstall({ targets: [{ name: PKG, profile: 'dev' }], profilesRoot, projectRoot, run: sim.run }),
    /锁文件/,
  );
  assert.equal(sim.calls.length, 0);
});

test('空选择显式拒绝', (t) => {
  const projectRoot = makeProject(t);
  const profilesRoot = makeProfilesRoot(t);
  seedLockfile(projectRoot, { [PKG]: { version: '0.1.0', profile: 'dev' } });
  const sim = makeOfficialSim(t, profilesRoot);
  assert.throws(
    () => uninstall({ targets: [], profilesRoot, projectRoot, run: sim.run }),
    /选择/,
  );
  assert.equal(sim.calls.length, 0);
});

test('卸载后重装同款：两落点恢复、账面重记（装卸对称）', (t) => {
  const projectRoot = makeProject(t);
  const profilesRoot = makeProfilesRoot(t);
  seedProfile(profilesRoot, 'dev', [PKG]);
  seedLockfile(projectRoot, { [PKG]: { version: '0.1.0', profile: 'dev' } });
  const sim = makeOfficialSim(t, profilesRoot);

  uninstall({ targets: [{ name: PKG, profile: 'dev' }], profilesRoot, projectRoot, run: sim.run });

  // 经同一官方模拟执行体的 add 分支重装（官方幂等语义）
  sim.run({ command: 'dsh', args: ['plugin', '--profile', 'dev', 'add', PKG] });
  writeLockfile(projectRoot, {
    ...readLockfile(projectRoot)!,
    plugins: { [PKG]: { version: '0.1.0', profile: 'dev', installedAt: '2026-11-16T00:00:00Z' } },
  });

  const profilePkg: ProfilePackage = JSON.parse(fs.readFileSync(path.join(profilesRoot, 'dev', 'package.json'), 'utf8'));
  assert.equal(profilePkg.dependencies?.[PKG], '0.1.0', '依赖行恢复');
  assert.deepEqual(profilePkg.dsh?.profile?.bundles, [PKG], 'bundles 行恢复');
  assert.deepEqual(Object.keys(readLockfile(projectRoot)!.plugins!), [PKG]);
});
