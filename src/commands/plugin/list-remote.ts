// plugin list-remote 动词命令定义（spec 20261122-edb2 实现决策「清单呈现」，
// 票 20261122-64e9；别名 ls-remote）：列包内编目插件（正名 + 描述），与 plugin add 交互
// 菜单同源同序——复用同一编目读侧（listing.ts → catalog.ts），不另写第二份；纯读零落盘。

import { Command } from 'commander';

import { configureCommandChannel } from '../channel.ts';
import type { ProgramContext } from '../../context.ts';
import { installablePluginEntries } from '../../kernel/listing.ts';

// plugin list-remote 逐命令帮助（用法 + 示例 + 别名行；spec FR-4 逐动词帮助定稿口径）。
const PLUGIN_LIST_REMOTE_HELP = `用法：npx @hankchen/infra plugin list-remote [选项]

列包内编目可装插件全集（正名 + 描述；与 plugin add 交互菜单同源同序）。

别名：ls-remote——plugin ls-remote 与 plugin list-remote 行为逐字节一致

选项：
  -h, --help    显示本帮助

示例：
  npx @hankchen/infra plugin list-remote    # 列可装插件全集（正名 + 描述）
  npx @hankchen/infra plugin ls-remote      # 同上（别名）`;

export function createPluginListRemoteCommand(context: ProgramContext, reportExitCode: (code: number) => void): Command {
  const listRemote = new Command('list-remote');
  listRemote.alias('ls-remote');
  configureCommandChannel(listRemote);
  listRemote.description('列包内可装插件全集：正名 + 描述（与 plugin add 菜单同源同序，纯读）');
  listRemote.helpInformation = () => `${PLUGIN_LIST_REMOTE_HELP}\n`;
  listRemote.action(() => {
    reportExitCode(runPluginListRemote({ context, projectRoot: process.cwd() }));
  });
  return listRemote;
}

// plugin list-remote 处理器：编目装配 → 呈现。编目缺陷（包不完整）走 ✗ 通道（退出 1、
// 零落盘、零官方调用，与 add 编目失败同口径）；呈现归命令层、判定归内核（listing.ts）。
export function runPluginListRemote({ context, projectRoot = process.cwd() }: { context: ProgramContext; projectRoot?: string }): number {
  void projectRoot; // 可装面只读包内编目；签名与四动词处理器保持同构
  let entries;
  try {
    entries = installablePluginEntries(context.packageRoot);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    return 1;
  }
  const lines = [`可装插件（${entries.length} 项，按名排序）：`];
  for (const entry of entries) {
    lines.push(entry.description === '' ? `  ${entry.name}` : `  ${entry.name}  ${entry.description}`);
  }
  console.log(lines.join('\n'));
  return 0;
}
