// 安装后对账（spec 20261115-495e 实现决策「安装后对账」+ docs/plugin-assets.md §2.3）。
// 接口窄：进 目标 profile 目录路径 + 包名，出 落点核对结果。
// 两处落点 = profile package.json 的 dependencies 依赖行 + dsh.profile.bundles 数组行，
// 齐备 = 安装符合官方格式；缺任一 → 报错指明缺失落点与 profile 路径。

import fs from 'node:fs';
import path from 'node:path';

// profile package.json 的对账相关切片（官方写入的两落点；其余键不进核对范围）。
interface ProfilePackage {
  dependencies?: Record<string, string>;
  dsh?: { profile?: { bundles?: string[] } };
}

export interface ReconcileResult {
  ok: true;
  version: string;
}

function readProfilePackage(profilePath: string): ProfilePackage {
  const pkgFile = path.join(profilePath, 'package.json');
  let raw;
  try {
    raw = fs.readFileSync(pkgFile, 'utf8');
  } catch (err) {
    throw new Error(
      `对账失败：profile 的 package.json 读不到（${pkgFile}，${err.message}）——官方命令可能未完成安装`,
    );
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`对账失败：profile 的 package.json 不是合法 JSON（${pkgFile}，${err.message}）`);
  }
}

export function reconcilePluginInstall({ profilePath, packageName }: {
  profilePath: string;
  packageName: string;
}): ReconcileResult {
  const pkg = readProfilePackage(profilePath);
  const missing: string[] = [];
  const version = pkg.dependencies?.[packageName];
  if (version === undefined) {
    missing.push('dependencies 依赖行');
  }
  const bundles = pkg.dsh?.profile?.bundles;
  if (!Array.isArray(bundles) || !bundles.includes(packageName)) {
    missing.push('dsh.profile.bundles 清单行');
  }
  if (missing.length > 0) {
    throw new Error(
      `对账失败：包 ${packageName} 在 profile ${profilePath} 的 package.json 缺少落点——${missing.join(' 与 ')}；` +
        `安装未通过官方格式核对`,
    );
  }
  // 对账通过 = dependencies 依赖行已核存在，version 必为 string（undefined 已进 missing 并抛出）
  return { ok: true, version: version as string };
}

// 卸载后对账（spec 20261122-edb2 实现决策「plugin 卸载编排」）：两落点消失 = dependencies
// 无该包依赖行 且 dsh.profile.bundles 无该包名；任一仍在 → 报错（官方命令可能未完成卸载，
// dsh 侧状态不明时账面保留是安全默认——对称安装「对账失败不记账」）。profile 清单整体
// 不存在（官方卸载连 profile 清单一并清掉）视为两落点已消失；清单在但不可解析仍报错。
export interface ReconcileUninstallResult {
  ok: true;
}

export function reconcilePluginUninstall({ profilePath, packageName }: {
  profilePath: string;
  packageName: string;
}): ReconcileUninstallResult {
  const pkgFile = path.join(profilePath, 'package.json');
  let raw: string;
  try {
    raw = fs.readFileSync(pkgFile, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { ok: true };
    }
    throw new Error(
      `卸载对账失败：profile 的 package.json 读不到（${pkgFile}，${err.message}）——dsh 侧状态不明，账面保留`,
    );
  }
  let pkg: ProfilePackage;
  try {
    pkg = JSON.parse(raw);
  } catch (err) {
    throw new Error(`卸载对账失败：profile 的 package.json 不是合法 JSON（${pkgFile}，${err.message}）`);
  }
  const remaining: string[] = [];
  if (pkg.dependencies?.[packageName] !== undefined) {
    remaining.push('dependencies 依赖行');
  }
  const bundles = pkg.dsh?.profile?.bundles;
  if (Array.isArray(bundles) && bundles.includes(packageName)) {
    remaining.push('dsh.profile.bundles 清单行');
  }
  if (remaining.length > 0) {
    throw new Error(
      `卸载对账失败：包 ${packageName} 在 profile ${profilePath} 的 package.json 仍有落点——${remaining.join(' 与 ')}；` +
        `官方命令可能未完成卸载，账面保留`,
    );
  }
  return { ok: true };
}
