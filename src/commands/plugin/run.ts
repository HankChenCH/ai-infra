// plugin 安装/卸载运行时（票 20261116-ccfb 起；20261116-bfcf 硬切后为 plugin add 命令的唯一
// 交互勾选与安装摘要实现，沿 skill 侧 run.ts 先例：helper 复用而非命令注册；票
// 20261122-0204 增卸载侧交互勾选与卸载摘要——安装行为在安装内核、卸载行为在卸载内核，
// 本层只编排与呈现）。

import path from 'node:path';

import * as clack from '@clack/prompts';

import type { ProgramContext } from '../../context.ts';
import { ASSET_MAP, PLUGINS_TYPE, findRow } from '../../kernel/asset-map.ts';
import { listPlugins } from '../../kernel/catalog.ts';
import { commandExists, DSH_COMMAND, resolveExecutor } from '../../kernel/dsh-command.ts';
import { listProfiles, profilesRoot } from '../../kernel/dsh-profiles.ts';
import { installPlugins, runCommand } from '../../kernel/plugin-install.ts';
import type { InstallPluginsResult } from '../../kernel/plugin-install.ts';
import { uninstallPlugins } from '../../kernel/plugin-uninstall.ts';
import type { UninstallPluginsResult } from '../../kernel/plugin-uninstall.ts';
import { readLockfile, LOCKFILE_NAME } from '../../kernel/lockfile.ts';
import type { PluginLockEntry } from '../../kernel/lockfile.ts';
import { checkManagerReadiness, MANAGER_PACKAGE, managerPrescriptionLines, READINESS_TRIGGER_PLUGIN } from '../../kernel/readiness.ts';
import type { ReadinessOutcome } from '../../kernel/readiness.ts';
import { skillOptions } from '../../kernel/menu.ts';
import type { PluginRemovalTarget } from './names.ts';

// 交互勾选结果（评审 20261116-ccfb 增量修正）：编目失败可区分返回，调用方走 ✗ 通道 +
// 退出 1——spec「错误统一走 ✗ 通道 + 退出码 1」，取消/空选是唯一明文豁免（零落盘退 0），
// 编目失败不在豁免之列；成功为所选组合。
export type PluginInteractivePick =
  | { kind: 'catalog-error'; message: string }
  | { kind: 'cancel' }
  | { kind: 'picked'; plugins: string[]; profile: string };

// 插件条目多选（构造保留：按名排序、正名为包名、提示为包 description，与现行形态一致）。
// 取消（Ctrl-C）与空选确认 → 提示后返回 cancel，调用方按 0 退出、零落盘（现行交互纪律）。
// presetProfile 非空时跳过 profile 提示（spec：`plugin add --profile dev` 无名进交互
// 仅提示插件多选、不再提示 profile）；否则既有 profile 单选、无既有项输入新名。
// desktop 与其他 profile 同一流程（保留名拒装已随官方 CLI 放行 desktop 插件管理移除——
// spec 20261119-7a9a，票 20261119-443c）。
export async function selectPluginsInteractive(
  context: ProgramContext,
  presetProfile: string | undefined,
): Promise<PluginInteractivePick> {
  let catalog;
  try {
    catalog = listPlugins(context.packageRoot, findRow(ASSET_MAP, PLUGINS_TYPE));
  } catch (err) {
    return { kind: 'catalog-error', message: err.message }; // 交调用方 ✗ 通道（错误统一退出 1）
  }
  const names = catalog.map((entry) => entry.name);
  const descriptions = Object.fromEntries(catalog.map((entry) => [entry.name, entry.description]));
  const picked = await clack.multiselect({
    message: `选择要安装的插件（共 ${names.length} 项；空格勾选、回车确认）`,
    options: skillOptions(names, descriptions),
    required: false,
  });
  if (clack.isCancel(picked)) {
    clack.cancel('已取消，未做任何改动。');
    return { kind: 'cancel' };
  }
  if (picked.length === 0) {
    clack.outro('未勾选任何插件——未做任何改动。');
    return { kind: 'cancel' };
  }

  // profile 提示（预置跳过 / 既有单选 / 无既有输入新名）：clack 的 isCancel 守卫窄化依赖
  // 分支内对 await 结果直接判定（声明 string | symbol 变量会让 generic symbol 挡住窄化），
  // 故各分支自收窄到 string 后合并。
  let profile: string;
  if (presetProfile !== undefined) {
    profile = presetProfile;
  } else {
    const existing = listProfiles(profilesRoot());
    if (existing.length > 0) {
      const picked = await clack.select({
        message: '选择目标 dsh profile（既有项按名排序）',
        options: existing.map((name) => ({ value: name, label: name })),
      });
      if (clack.isCancel(picked)) {
        clack.cancel('已取消，未做任何改动。');
        return { kind: 'cancel' };
      }
      profile = picked;
    } else {
      const entered = await clack.text({
        message: '未发现既有 dsh profile，输入新 profile 名（官方流程会初始化它）',
      });
      if (clack.isCancel(entered)) {
        clack.cancel('已取消，未做任何改动。');
        return { kind: 'cancel' };
      }
      profile = String(entered).trim();
      if (profile === '') {
        clack.cancel('profile 名为空——未做任何改动。');
        return { kind: 'cancel' };
      }
    }
  }

  clack.log.step(`已选 ${picked.length} 项：${picked.join('、')} → profile ${profile}`);
  return { kind: 'picked', plugins: [...picked], profile };
}

// 编目校验所选正名（不套件包内即报错列清单、零落盘）→ 前置检查 → 逐条转发官方命令 →
// 对账记账。失败路径：spinner 停止 + ✗ 呈现 + 退出 1（与技能失败路径同流）。
export async function installPluginsAndRender({
  plugins,
  profile,
  context,
}: {
  plugins: string[];
  profile: string;
  context: ProgramContext;
}): Promise<number> {
  let cataloged;
  try {
    cataloged = listPlugins(context.packageRoot, findRow(ASSET_MAP, PLUGINS_TYPE)).map((entry) => entry.name);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    return 1;
  }
  const missing = plugins.filter((name) => !cataloged.includes(name));
  if (missing.length > 0) {
    console.error(`✗ 以下插件不在套件包内：${missing.join('、')}；可用插件：${cataloged.join('、') || '（无）'}`);
    return 1;
  }

  const spinner = clack.spinner();
  spinner.start(`正在安装 ${plugins.length} 项插件 → profile ${profile}…`);
  const profilePath = path.join(profilesRoot(), profile);
  const dshInPath = commandExists(DSH_COMMAND);
  try {
    const result = installPlugins({
      profile,
      plugins,
      profilePath,
      dshInPath,
      projectRoot: process.cwd(),
      packageVersion: context.packageVersion,
      now: new Date().toISOString(),
    });
    spinner.stop(`安装完成（${result.installed.length} 项）`);
    // 装后就绪核验（spec 20261119-7a9a 就绪核验契约，票 20261119-9bd3）：只对 manager 供给
    // 契约的宿主插件核验（其余插件安装与 manager 无关）；探测沿安装同款执行体（runCommand）。
    // fail-loud 分支处方已呈现 → 退出 1；探测失败降级警告继续（退出 0、不虚构通过）。
    if (plugins.includes(READINESS_TRIGGER_PLUGIN)) {
      const outcome = checkManagerReadiness({ profilePath, executor: resolveExecutor(dshInPath), run: runCommand });
      const render = renderManagerReadiness(outcome, profilePath);
      if (render.kind === 'fail') {
        return 1;
      }
      renderPluginSummary(context, result, render.kind === 'pass' ? render.summaryLine : undefined);
      return 0;
    }
    renderPluginSummary(context, result);
    return 0;
  } catch (err) {
    spinner.stop('安装失败');
    clack.log.error(err.message);
    return 1;
  }
}

// 核验结果呈现（呈现归命令层、判定归内核）：fail-loud = ✗ 头行报告两版本号/缺副本 +
// 三段可复制处方；pass = 完成摘要追加「核验通过」行（报告两版本号）；探测失败 = 降级警告
// + 手工核验途径（README「已知边界」boot 日志金标准），无「核验通过」行——不虚构通过。
type ReadinessRender =
  | { kind: 'fail' }
  | { kind: 'pass'; summaryLine: string }
  | { kind: 'degraded' };

function renderManagerReadiness(outcome: ReadinessOutcome, profilePath: string): ReadinessRender {
  switch (outcome.kind) {
    case 'mismatch':
    case 'missing': {
      // missing 按实报因（评审 20261120-4f76 建议 3）：absent 真缺副本 / unreadable 副本在
      // 但不可读 / corrupt 副本损坏——分支行为同归 fail-loud，headline 粒度按实因。
      const headline =
        outcome.kind === 'mismatch'
          ? `运行时 dsh ${outcome.runtimeVersion} 与 manager 解析版 ${outcome.managerVersion} 不同版（宿主要求精确同 rc）`
          : outcome.cause === 'absent'
            ? `profile 依赖树缺 ${MANAGER_PACKAGE} 解析副本（运行时 dsh ${outcome.runtimeVersion}）`
            : outcome.cause === 'unreadable'
              ? `${MANAGER_PACKAGE} 解析副本不可读（package.json 读取失败；运行时 dsh ${outcome.runtimeVersion}）`
              : `${MANAGER_PACKAGE} 解析副本损坏（package.json 不可解析或缺 version；运行时 dsh ${outcome.runtimeVersion}）`;
      console.error(
        `✗ 装后就绪核验未通过：${headline}——安装已完成并记账，` +
          `但宿主 boot 兼容门将静默禁用 manager 行（装成 ≠ 跑得起来）。按以下三段处方修复：`,
      );
      for (const line of managerPrescriptionLines({ profilePath, runtimeVersion: outcome.runtimeVersion })) {
        console.error(line);
      }
      return { kind: 'fail' };
    }
    case 'pass':
      return {
        kind: 'pass',
        summaryLine: `就绪核验通过：运行时 dsh ${outcome.runtimeVersion} ≡ manager ${outcome.managerVersion}（peer 精确同版）。`,
      };
    case 'probe-unavailable':
      console.error('⚠ 运行时 dsh 版本探测失败（--version 无可用输出）——跳过装后就绪核验，安装继续。');
      console.error(
        '  手工核验途径：对照 agents/dsh/plugins/dsh-mcp/README.md「已知边界」（boot 日志金标准 + 恢复配方），' +
          '或重启宿主后确认 /mcp 入口可用。',
      );
      return { kind: 'degraded' };
  }
}

function renderPluginSummary(context: ProgramContext, result: InstallPluginsResult, readinessLine?: string): void {
  const lines = result.installed.map(
    (entry) =>
      `已安装插件 ${entry.name}@${entry.version} → dsh profile ${result.profile}（对账：依赖行 + bundles 行齐备）`,
  );
  if (readinessLine !== undefined) {
    lines.push(readinessLine);
  }
  lines.push(`记账：${LOCKFILE_NAME}（包版本 ${context.packageVersion}）；重跑本命令即按官方幂等语义刷新安装。`);
  clack.outro(lines.join('\n'));
}

// ---------- 卸载侧（spec 20261122-edb2「plugin 卸载语义」，票 20261122-0204）----------
// 交互勾选源 = 锁文件 plugins 账面（与 add 的编目源不同源；A2 拍板：账面为源、条目提示含
// 账面 profile、无独立 profile 选择步）；卸载行为（账面为准、前置检查、逐条转发官方命令、
// 卸后对账、清账）全部在卸载内核，本层只编排与呈现。

// 锁文件 plugins 账面（名 → 记录）。锁文件不存在或无 plugins 区 = 空账（卸载侧无账可卸）；
// 锁文件损坏原样上抛，由调用方走 ✗ 通道（错误统一退出 1）。
export function installedPluginLedger(projectRoot: string): Record<string, PluginLockEntry> {
  const lockfile = readLockfile(projectRoot);
  return lockfile?.plugins ?? {};
}

// 已装插件条目（名 + 账面 profile），供交互勾选与 --all 目标装配。
export function installedPluginEntries(ledger: Record<string, PluginLockEntry>): Array<{ name: string; profile: string }> {
  return Object.entries(ledger).map(([name, entry]) => ({ name, profile: entry.profile }));
}

// 已装条目多选（构造与 add 同构：skillOptions 按名排序；条目提示 = 账面 profile——A2 拍板
// 「条目提示含账面 profile」）。取消（Ctrl-C）与空选确认 → 提示后返回 null，调用方按 0
// 退出、零落盘（现行交互纪律）。确认摘要列「插件→profile」（无独立 profile 选择步）。
export async function selectInstalledPluginsInteractive(
  entries: Array<{ name: string; profile: string }>,
): Promise<string[] | null> {
  const profiles = new Map(entries.map((entry) => [entry.name, entry.profile]));
  const picked = await clack.multiselect({
    message: `选择要卸载的插件（共 ${entries.length} 项；空格勾选、回车确认）`,
    options: skillOptions(
      entries.map((entry) => entry.name),
      Object.fromEntries(entries.map((entry) => [entry.name, `profile ${entry.profile}`])),
    ),
    required: false,
  });
  if (clack.isCancel(picked)) {
    clack.cancel('已取消，未做任何改动。');
    return null;
  }
  if (picked.length === 0) {
    clack.outro('未勾选任何插件——未做任何改动。');
    return null;
  }
  clack.log.step(`已选 ${picked.length} 项：${picked.map((name) => `${name} → ${profiles.get(name)}`).join('、')}`);
  return [...picked];
}

// 卸载 + 完成摘要：spinner → 内核 uninstallPlugins → 摘要（与安装摘要同构：逐条列插件
// 与 profile / 覆盖注明 / 对账结果 / 记账更新行）。
export async function uninstallPluginsAndRender(
  targets: PluginRemovalTarget[],
  context: ProgramContext,
  projectRoot: string,
): Promise<number> {
  const spinner = clack.spinner();
  spinner.start(`正在卸载 ${targets.length} 项插件…`);
  let result: UninstallPluginsResult;
  try {
    result = uninstallPlugins({
      targets: targets.map(({ name, profile }) => ({ name, profile })),
      profilesRoot: profilesRoot(),
      dshInPath: commandExists(DSH_COMMAND),
      projectRoot,
    });
  } catch (err) {
    spinner.stop('卸载失败');
    clack.log.error(err.message);
    return 1;
  }
  spinner.stop(`卸载完成（${result.removed.length} 项）`);
  renderUninstallSummary(targets, result, context);
  return 0;
}

function renderUninstallSummary(targets: PluginRemovalTarget[], result: UninstallPluginsResult, context: ProgramContext): void {
  const ledgerProfiles = new Map(targets.map((target) => [target.name, target.ledgerProfile]));
  const lines = result.removed.map((entry) => {
    const ledgerProfile = ledgerProfiles.get(entry.name);
    const override = ledgerProfile !== undefined && ledgerProfile !== entry.profile
      ? `（--profile 覆盖账面 ${ledgerProfile}）`
      : '';
    return `已卸载插件 ${entry.name} ← dsh profile ${entry.profile}${override}（对账：依赖行 + bundles 行已消失）`;
  });
  lines.push(`记账：${LOCKFILE_NAME}（plugins 剩 ${result.remaining} 项；包版本 ${context.packageVersion}）；重装同款插件用 plugin add <名> --profile <名>。`);
  clack.outro(lines.join('\n'));
}
