// 批量插件卸载编排（spec 20261122-edb2 实现决策「plugin 卸载编排」，票 20261122-0204，
// 与安装内核 plugin-install.ts 对称）：前置检查 → 逐条（组装官方卸载命令 → 注入执行体
// 执行 → 卸后对账 → 锁文件清账）。批量语义与安装对称：逐条顺序执行；单条失败（执行非零
// 退出或对账落点仍在）即中止，报错带已完成/未完成清单；已完成项的账面清理保留，不因后条
// 失败回吐。账面为准：targets 中任一名字锁文件无记录即整体拒绝（命令层预校验之外的内核
// 不变式防线）；账全空时锁文件骨架保留（need FR-5：package/packageVersion 与空账对象在）。
// 不核 node_modules 残留（假设 A4 维持：依赖目录归官方命令管理）。
// 官方命令不在套件内实跑：执行体 run 由调用方注入（bin 传 runCommand，测试注入桩）。

import path from 'node:path';

import { buildPluginRemoveCommand, resolveExecutor, assertPluginPreconditions } from './dsh-command.ts';
import { reconcilePluginUninstall } from './reconcile.ts';
import { readLockfile, writeLockfile } from './lockfile.ts';
import { runCommand } from './plugin-install.ts';
import type { CommandRunResult, CommandRunner } from './plugin-install.ts';

export interface UninstallPluginTarget {
  name: string;
  // 本条卸载转发与对账用的 profile（账面定位值，或显式 --profile 覆盖值）
  profile: string;
}

export interface RemovedPlugin {
  name: string;
  profile: string;
}

export interface UninstallPluginsResult {
  removed: RemovedPlugin[];
  // 卸载完成后锁文件 plugins 账面剩余条数（呈现层「plugins 剩 N 项」用）
  remaining: number;
}

export function uninstallPlugins({
  targets,
  profilesRoot,
  dshInPath,
  projectRoot,
  nodeVersion = process.version,
  run = runCommand,
}: {
  targets: UninstallPluginTarget[];
  // profile 根目录（$DSH_HOME/profiles/）：逐条对账按各自 profile 取 <root>/<profile>/package.json
  profilesRoot: string;
  dshInPath: boolean;
  projectRoot: string;
  nodeVersion?: string;
  run?: CommandRunner;
}): UninstallPluginsResult {
  if (!Array.isArray(targets) || targets.length === 0) {
    throw new Error('未选择任何条目：targets 为空，拒绝卸载');
  }
  const lockfile = readLockfile(projectRoot);
  if (lockfile === null) {
    throw new Error(`锁文件不存在，无法卸载（无账面可核对：先 plugin add 安装后才有记账）`);
  }
  const ledger = lockfile.plugins ?? {};
  const missing = targets.filter((target) => !(target.name in ledger));
  if (missing.length > 0) {
    const installedList = Object.keys(ledger).sort().join('、') || '（无）';
    throw new Error(
      `以下插件没有安装记录（以锁文件 plugins 账面为准）：${missing.map((target) => target.name).join('、')}；已装：${installedList}`,
    );
  }
  assertPluginPreconditions({ nodeVersion, profile: targets[0].profile });
  const executor = resolveExecutor(dshInPath);
  lockfile.plugins = { ...(lockfile.plugins ?? {}) };

  const removed: RemovedPlugin[] = [];
  for (const [index, target] of targets.entries()) {
    try {
      const { command, args } = buildPluginRemoveCommand(executor, target.profile, target.name);
      const result: CommandRunResult = run({ command, args });
      if (result.status !== 0) {
        const tail = (result.stderr ?? '').trim().split('\n').slice(-3).join('；');
        throw new Error(
          `官方命令执行失败（${command} ${args.join(' ')} 退出码 ${result.status}${tail ? `；输出尾部：${tail}` : ''}）`,
        );
      }
      reconcilePluginUninstall({ profilePath: path.join(profilesRoot, target.profile), packageName: target.name });
      delete lockfile.plugins[target.name];
      writeLockfile(projectRoot, lockfile);
      removed.push({ name: target.name, profile: target.profile });
    } catch (err) {
      const completed = removed.map((entry) => entry.name).join('、') || '（无）';
      const pending = targets.slice(index).map((entry) => entry.name).join('、');
      throw new Error(
        `插件 ${target.name} 卸载中止：${err.message}\n已完成：${completed}\n未完成：${pending}`,
      );
    }
  }
  return { removed, remaining: Object.keys(lockfile.plugins).length };
}
