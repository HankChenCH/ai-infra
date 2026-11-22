// skill 安装/卸载运行时（票 20261116-f761 起；20261116-bfcf 硬切后为 skill add 命令的唯一
// 交互勾选与安装摘要实现；票 20261122-bdb8 增卸载侧交互勾选与卸载摘要——安装行为在
// 安装内核、卸载行为在卸载内核，本层只编排与呈现）。

import * as clack from '@clack/prompts';

import type { ProgramContext } from '../../context.ts';
import { AGENT_DIRS } from '../../kernel/agent-dirs.ts';
import { ASSET_MAP, SKILLS_TYPE, findRow } from '../../kernel/asset-map.ts';
import { listEntries, readDescriptions } from '../../kernel/catalog.ts';
import { installAssets } from '../../kernel/installer.ts';
import type { InstallAssetsResult } from '../../kernel/installer.ts';
import { readLockfile, LOCKFILE_NAME } from '../../kernel/lockfile.ts';
import { uninstallSkills } from '../../kernel/skill-uninstall.ts';
import type { UninstallSkillsResult } from '../../kernel/skill-uninstall.ts';
import { skillOptions } from '../../kernel/menu.ts';

// 条目多选勾选（构造保留：按名排序、描述提示，与现行 skillOptions 形态一致）。
// 取消（Ctrl-C）与空选确认 → 提示后返回 null，调用方按 0 退出、零落盘（现行交互纪律）。
export async function selectSkillsInteractive(context: ProgramContext): Promise<string[] | null> {
  const row = findRow(ASSET_MAP, SKILLS_TYPE);
  const names = listEntries(context.packageRoot, row);
  const descriptions = readDescriptions(context.packageRoot, row, names);
  const picked = await clack.multiselect({
    message: `选择要安装的技能（共 ${names.length} 项；空格勾选、回车确认）`,
    options: skillOptions(names, descriptions),
    required: false,
  });
  if (clack.isCancel(picked)) {
    clack.cancel('已取消，未做任何改动。');
    return null;
  }
  if (picked.length === 0) {
    clack.outro('未勾选任何技能——未做任何改动。');
    return null;
  }
  clack.log.step(`已选 ${picked.length} 项：${picked.join('、')}`);
  return picked;
}

// 安装 + 完成摘要：spinner → 内核 installAssets → 摘要（含软链冲突跳过与记账提示）。
export async function installSkillsAndRender(selected: string[], context: ProgramContext): Promise<number> {
  const spinner = clack.spinner();
  spinner.start(`正在安装 ${selected.length} 项技能…`);
  let result: InstallAssetsResult;
  try {
    result = installAssets({
      row: findRow(ASSET_MAP, SKILLS_TYPE),
      packageRoot: context.packageRoot,
      projectRoot: process.cwd(),
      agentDirs: AGENT_DIRS,
      selected,
      packageVersion: context.packageVersion,
      now: new Date().toISOString(),
    });
  } catch (err) {
    spinner.stop('安装失败');
    clack.log.error(err.message);
    return 1;
  }
  spinner.stop(`安装完成（${result.installedSkills.length} 项）`);
  renderSummary(result, context);
  return 0;
}

function renderSummary(result: InstallAssetsResult, context: ProgramContext): void {
  const lines = [];
  lines.push(`已安装 ${result.installedSkills.length} 项技能 → .agents/skills/：${result.installedSkills.join('、')}`);
  if (result.linkedAgentDirs.length > 0) {
    lines.push(`已为 ${result.linkedAgentDirs.length} 个 agent 目录建软链：${result.linkedAgentDirs.join('、')}`);
  }
  if (result.skippedAgentDirs.length > 0) {
    lines.push(
      `跳过 ${result.skippedAgentDirs.length} 个 agent 目录（项目内不存在）：${result.skippedAgentDirs.map((s) => s.dir).join('、')}`,
    );
  }
  for (const conflict of result.conflicts) {
    lines.push(`跳过软链（该位置已有真实文件，未改动使用者数据）：${conflict.linkPath}`);
  }
  lines.push(`记账：${LOCKFILE_NAME}（包版本 ${context.packageVersion}）；重跑本命令即刷新已装技能到当前包内容。`);
  clack.outro(lines.join('\n'));
}

// ---------- 卸载侧（spec 20261122-edb2，票 20261122-bdb8）----------
// 交互勾选源 = 锁文件 skills 记账（与 add 的编目源不同源）；卸载行为（账本为准、软链只删
// 确属软链、占位冲突跳过、骨架保留）全部在卸载内核，本层只编排与呈现。

// 锁文件 skills 记账名（按名排序；账空/无锁文件为空数组）。锁文件损坏原样上抛，
// 由调用方走 ✗ 通道（错误统一退出 1）。
export function installedSkillNames(projectRoot: string): string[] {
  const lockfile = readLockfile(projectRoot);
  return lockfile === null ? [] : Object.keys(lockfile.skills).sort();
}

// 已装条目多选（构造与 add 同构：skillOptions 按名排序；记账提示为空——账面只有名与
// 指纹/时间，指纹不进菜单）。取消（Ctrl-C）与空选确认 → 提示后返回 null，调用方按 0
// 退出、零落盘（现行交互纪律）。
export async function selectInstalledSkillsInteractive(projectRoot: string): Promise<string[] | null> {
  const names = installedSkillNames(projectRoot);
  const picked = await clack.multiselect({
    message: `选择要卸载的技能（共 ${names.length} 项；空格勾选、回车确认）`,
    options: skillOptions(names, {}),
    required: false,
  });
  if (clack.isCancel(picked)) {
    clack.cancel('已取消，未做任何改动。');
    return null;
  }
  if (picked.length === 0) {
    clack.outro('未勾选任何技能——未做任何改动。');
    return null;
  }
  clack.log.step(`已选 ${picked.length} 项：${picked.join('、')}`);
  return [...picked];
}

// 卸载 + 完成摘要：spinner → 内核 uninstallSkills → 摘要（与安装摘要同构：已卸 N 项 /
// 已清 M 个 agent 目录软链 / 账在实亡注明 / 冲突跳过列表 / 记账更新行）。
export async function uninstallSkillsAndRender(
  selected: string[],
  context: ProgramContext,
  projectRoot: string,
): Promise<number> {
  const spinner = clack.spinner();
  spinner.start(`正在卸载 ${selected.length} 项技能…`);
  let result: UninstallSkillsResult;
  try {
    result = uninstallSkills({
      row: findRow(ASSET_MAP, SKILLS_TYPE),
      projectRoot,
      agentDirs: AGENT_DIRS,
      selected,
    });
  } catch (err) {
    spinner.stop('卸载失败');
    clack.log.error(err.message);
    return 1;
  }
  spinner.stop(`卸载完成（${result.removedSkills.length} 项）`);
  renderUninstallSummary(result, context);
  return 0;
}

function renderUninstallSummary(result: UninstallSkillsResult, context: ProgramContext): void {
  const lines = [];
  lines.push(`已卸载 ${result.removedSkills.length} 项技能 ← .agents/skills/：${result.removedSkills.join('、')}`);
  if (result.clearedAgentDirs.length > 0) {
    lines.push(`已清 ${result.clearedAgentDirs.length} 个 agent 目录软链：${result.clearedAgentDirs.join('、')}`);
  }
  if (result.phantomSkills.length > 0) {
    lines.push(`账在实亡（实体目录已不在，仅清账）：${result.phantomSkills.join('、')}`);
  }
  for (const conflict of result.conflicts) {
    lines.push(`跳过软链（该位置已有真实文件，未改动使用者数据）：${conflict.linkPath}`);
  }
  const remaining = Object.keys(result.lockfile.skills).length;
  lines.push(`记账：${LOCKFILE_NAME}（skills 剩 ${remaining} 项；包版本 ${context.packageVersion}）；重装同款技能用 skill add <名>。`);
  clack.outro(lines.join('\n'));
}
