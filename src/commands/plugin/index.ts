// plugin 命令组定义（spec 20261116-2c58，票 20261116-ccfb：add 动词；spec 20261122-edb2，
// 票 20261122-0204：remove 动词，别名 rm；票 20261122-64e9：list/ls、list-remote/ls-remote
// 清单动词）；无动词裸打显示本命令帮助（退出 0）。新增动词口径：加动词文件 + 本命令组
// 注册一处（spec 20261122-edb2：ADR af69「加文件 + 注册一处」口径的组内形态，顶层命令组数不变）。

import { Command } from 'commander';

import { configureCommandChannel } from '../channel.ts';
import type { ProgramContext } from '../../context.ts';
import { createPluginAddCommand } from './add.ts';
import { createPluginListCommand } from './list.ts';
import { createPluginListRemoteCommand } from './list-remote.ts';
import { createPluginRemoveCommand } from './remove.ts';

export function createPluginCommand(context: ProgramContext, reportExitCode: (code: number) => void): Command {
  const plugin = new Command('plugin');
  configureCommandChannel(plugin);
  plugin.description('安装套件插件进目标 dsh profile（官方命令转发 + 装后对账 + 锁文件记账）');
  plugin.addCommand(createPluginAddCommand(context, reportExitCode));
  plugin.addCommand(createPluginRemoveCommand(context, reportExitCode));
  plugin.addCommand(createPluginListCommand(context, reportExitCode));
  plugin.addCommand(createPluginListRemoteCommand(context, reportExitCode));
  plugin.action(() => {
    plugin.outputHelp(); // 无动词：本命令帮助写 stdout，action 正常归还 → 退出 0
  });
  return plugin;
}
