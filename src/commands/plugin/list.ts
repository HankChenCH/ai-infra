// plugin list 动词命令定义（spec 20261122-edb2 实现决策「清单呈现」，票 20261122-64e9；
// 别名 ls）：列锁文件 plugins 账面（按 profile 分组，profile 名为组行，逐条 名@版本 +
// 安装时间），账空输出「（无已装插件）」；纯读零落盘。

import { Command } from 'commander';

import { configureCommandChannel } from '../channel.ts';
import type { ProgramContext } from '../../context.ts';
import { installedPluginProfileGroups } from '../../kernel/listing.ts';

// plugin list 逐命令帮助（用法 + 示例 + 别名行；spec FR-4 逐动词帮助定稿口径）。
const PLUGIN_LIST_HELP = `用法：npx @hankchen/infra plugin list [选项]

列已装插件（以 .infra-lock.json plugins 账面为准）：按 profile 分组（profile 名为组行），
逐条 名@版本 + 安装时间；纯读零落盘。

别名：ls——plugin ls 与 plugin list 行为逐字节一致

选项：
  -h, --help    显示本帮助

示例：
  npx @hankchen/infra plugin list    # 列已装插件（按 profile 分组）
  npx @hankchen/infra plugin ls      # 同上（别名）`;

export function createPluginListCommand(context: ProgramContext, reportExitCode: (code: number) => void): Command {
  const list = new Command('list');
  list.alias('ls');
  configureCommandChannel(list);
  list.description('列已装插件：按 profile 分组，名@版本 + 安装时间（以 .infra-lock.json 账面为准，纯读）');
  list.helpInformation = () => `${PLUGIN_LIST_HELP}\n`;
  list.action(() => {
    reportExitCode(runPluginList({ context, projectRoot: process.cwd() }));
  });
  return list;
}

// plugin list 处理器：账面装配 → 呈现。锁文件损坏走 ✗ 通道（退出 1、零落盘）；账空提示
// 退 0；呈现归命令层、判定归内核（listing.ts），projectRoot 可注入（单测用）。
const PLUGIN_LIST_EMPTY_NOTICE = '（无已装插件）';

export function runPluginList({ context, projectRoot = process.cwd() }: { context: ProgramContext; projectRoot?: string }): number {
  void context; // 清单呈现不消费包上下文；签名与四动词处理器保持同构
  let groups;
  try {
    groups = installedPluginProfileGroups(projectRoot);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    return 1;
  }
  if (groups.length === 0) {
    console.log(PLUGIN_LIST_EMPTY_NOTICE);
    return 0;
  }
  const total = groups.reduce((sum, group) => sum + group.plugins.length, 0);
  const lines = [`已装插件（${total} 项，按 profile 分组）：`];
  for (const group of groups) {
    lines.push(`  ${group.profile}（${group.plugins.length} 项）：`);
    for (const row of group.plugins) {
      lines.push(`    ${row.name}@${row.version}  ${row.installedAt}`);
    }
  }
  console.log(lines.join('\n'));
  return 0;
}
