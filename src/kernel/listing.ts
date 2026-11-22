// 清单数据装配（spec 20261122-edb2 实现决策「清单呈现」，票 20261122-64e9）。
//
// 只读不写：已装侧读 .infra-lock.json 记账（锁文件读侧），可装侧读包内编目（编目读侧）。
// 与 add 交互菜单同源同序——可装面直接复用 catalog.ts 的 listEntries/readDescriptions/
// listPlugins（不另写第二份编目），排序同为按名排序。呈现归命令层，本模块只装数据：
// 锁文件不存在/无 plugins 区 = 空账（清单是纯读，无账即无条目）；锁文件损坏原样上抛，
// 由调用方走 ✗ 通道（错误统一退出 1，与卸载侧同口径）。

import { listEntries, listPlugins, readDescriptions } from './catalog.ts';
import type { PluginCatalogEntry } from './catalog.ts';
import { readLockfile } from './lockfile.ts';
import type { PluginLockEntry } from './lockfile.ts';
import { ASSET_MAP, PLUGINS_TYPE, SKILLS_TYPE, findRow } from './asset-map.ts';

// 已装技能行（spec：名 + 安装时间；installedAt 为账面既有字段，原样透出）。
export interface InstalledSkillRow {
  name: string;
  installedAt: string;
}

// 已装插件行（spec：逐条 名@版本 + 安装时间；version 为账面既有字段，原样透出）。
export interface InstalledPluginRow {
  name: string;
  version: string;
  installedAt: string;
}

// profile 分组（spec：profile 名为组行；组按名排序、组内条目按名排序）。
export interface PluginProfileGroup {
  profile: string;
  plugins: InstalledPluginRow[];
}

// 已装技能行（按名排序）。锁文件不存在 = 空账；损坏原样上抛。
export function installedSkillRows(projectRoot: string): InstalledSkillRow[] {
  const lockfile = readLockfile(projectRoot);
  return Object.entries(lockfile?.skills ?? {})
    .map(([name, entry]) => ({ name, installedAt: entry.installedAt }))
    .sort((a, b) => (a.name < b.name ? -1 : 1));
}

// 已装插件按 profile 分组（profile 组行按名排序、组内条目按名排序）。
// 锁文件不存在或无 plugins 区 = 空分组；损坏原样上抛。
export function installedPluginProfileGroups(projectRoot: string): PluginProfileGroup[] {
  const ledger: Record<string, PluginLockEntry> = readLockfile(projectRoot)?.plugins ?? {};
  const byProfile = new Map<string, InstalledPluginRow[]>();
  for (const [name, entry] of Object.entries(ledger)) {
    const rows = byProfile.get(entry.profile) ?? [];
    rows.push({ name, version: entry.version, installedAt: entry.installedAt });
    byProfile.set(entry.profile, rows);
  }
  return [...byProfile.keys()]
    .sort((a, b) => (a < b ? -1 : 1))
    .map((profile) => ({
      profile,
      plugins: byProfile.get(profile)!.sort((a, b) => (a.name < b.name ? -1 : 1)),
    }));
}

// 包内编目可装技能全集（名 + 描述；与 add 交互菜单同源同序：同一编目读侧 + 按名排序）。
// 编目缺陷（来源目录缺失）原样上抛，由调用方走 ✗ 通道。
export function installableSkillEntries(packageRoot: string): Array<{ name: string; description: string }> {
  const row = findRow(ASSET_MAP, SKILLS_TYPE);
  const names = listEntries(packageRoot, row);
  const descriptions = readDescriptions(packageRoot, row, names);
  return [...names].sort().map((name) => ({ name, description: descriptions[name] ?? '' }));
}

// 包内编目可装插件全集（正名 + 描述；同一编目读侧 listPlugins，已按名排序）。
export function installablePluginEntries(packageRoot: string): PluginCatalogEntry[] {
  return listPlugins(packageRoot, findRow(ASSET_MAP, PLUGINS_TYPE));
}
