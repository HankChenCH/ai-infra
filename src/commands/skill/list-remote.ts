// skill list-remote 动词命令定义（spec 20261122-edb2 实现决策「清单呈现」，票 20261122-64e9；
// 别名 ls-remote）：列包内编目可装全集（名 + 描述），与 add 交互菜单同源同序——复用同一
// 编目读侧（listing.ts → catalog.ts），不另写第二份；纯读零落盘。

import { Command } from 'commander';

import { configureCommandChannel } from '../channel.ts';
import type { ProgramContext } from '../../context.ts';
import { installableSkillEntries } from '../../kernel/listing.ts';

// skill list-remote 逐命令帮助（用法 + 示例 + 别名行；spec FR-4 逐动词帮助定稿口径）。
const SKILL_LIST_REMOTE_HELP = `用法：npx @hankchen/infra skill list-remote [选项]

列包内编目可装技能全集（名 + 描述；与 skill add 交互菜单同源同序）。

别名：ls-remote——skill ls-remote 与 skill list-remote 行为逐字节一致

选项：
  -h, --help    显示本帮助

示例：
  npx @hankchen/infra skill list-remote    # 列可装技能全集（名 + 描述）
  npx @hankchen/infra skill ls-remote      # 同上（别名）`;

export function createSkillListRemoteCommand(context: ProgramContext, reportExitCode: (code: number) => void): Command {
  const listRemote = new Command('list-remote');
  listRemote.alias('ls-remote');
  configureCommandChannel(listRemote);
  listRemote.description('列包内可装技能全集：名 + 描述（与 skill add 菜单同源同序，纯读）');
  listRemote.helpInformation = () => `${SKILL_LIST_REMOTE_HELP}\n`;
  listRemote.action(() => {
    reportExitCode(runSkillListRemote({ context, projectRoot: process.cwd() }));
  });
  return listRemote;
}

// skill list-remote 处理器：编目装配 → 呈现。编目缺陷（来源目录缺失）走 ✗ 通道
//（退出 1、零落盘，与 add 编目失败同口径）；呈现归命令层、判定归内核（listing.ts）。
export function runSkillListRemote({ context, projectRoot = process.cwd() }: { context: ProgramContext; projectRoot?: string }): number {
  void projectRoot; // 可装面只读包内编目；签名与四动词处理器保持同构
  let entries;
  try {
    entries = installableSkillEntries(context.packageRoot);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    return 1;
  }
  const lines = [`可装技能（${entries.length} 项，按名排序）：`];
  for (const entry of entries) {
    lines.push(entry.description === '' ? `  ${entry.name}` : `  ${entry.name}  ${entry.description}`);
  }
  console.log(lines.join('\n'));
  return 0;
}
