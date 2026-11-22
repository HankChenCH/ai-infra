// plugin remove 动词命令定义（spec 20261122-edb2 实现决策「plugin 卸载语义（账面定位）」，
// 票 20261122-0204；别名 rm）：参数旗标声明与校验分派与 add 同构（归一化共用 names.ts 单源）；
// 目标 profile 由锁文件 plugins 账面自动定位，--profile <名> 显式覆盖（转发与卸后对账都用
// 给定 profile、锁文件仍清该名账面记录）；desktop 无保留名分支（对称放行拍板）。命令定义层
// 承载参数旗标声明、校验分派、内核编排调用与摘要呈现。

import { Command, CommanderError } from 'commander';
import * as clack from '@clack/prompts';

import { configureCommandChannel } from '../channel.ts';
import type { ProgramContext } from '../../context.ts';
import {
  EMPTY_PLUGIN_LEDGER_NOTICE,
  ERR_REMOVE_PROFILE_VALUE,
  resolvePluginLedgerRemoval,
  resolvePluginRemoveSelection,
} from './names.ts';
import { installedPluginEntries, installedPluginLedger, selectInstalledPluginsInteractive, uninstallPluginsAndRender } from './run.ts';

// plugin remove 逐命令帮助（用法 + 示例 + 别名行；与 plugin add 帮助分级同构，别名行随
// 票 20261122-64e9 契约收口补齐）。
const PLUGIN_REMOVE_HELP = `用法：npx @hankchen/infra plugin remove [名...] [选项]

卸载已装插件（经宿主官方命令转发卸载 + 卸后对账 + .infra-lock.json 清账；目标 profile 由
账面自动定位，--profile <名> 显式覆盖）。

别名：rm——plugin rm 与 plugin remove 行为逐字节一致

参数：
  名...    要卸载的插件包名；空格或逗号分隔均可（如 @hankchen/dsh-demo）

选项：
  --all             卸载全部已装插件（与插件名互斥；逐条按各自账面 profile 卸）
  --profile <名>    覆盖账面 profile（官方命令转发与卸后对账都用该 profile）
  -h, --help        显示本帮助

示例：
  npx @hankchen/infra plugin remove @hankchen/dsh-demo                  # 免交互卸载（profile 由账面定位）
  npx @hankchen/infra plugin remove @hankchen/dsh-demo --profile test   # 覆盖账面 profile 卸载
  npx @hankchen/infra plugin remove                                     # 交互勾选要卸载的插件
  npx @hankchen/infra plugin remove --all                               # 免交互卸载全部已装插件`;

export function createPluginRemoveCommand(context: ProgramContext, reportExitCode: (code: number) => void): Command {
  const remove = new Command('remove');
  remove.alias('rm');
  configureCommandChannel(remove);
  remove.description('卸载已装插件：账面定位 profile、--profile 可覆盖；带名免交互、--all 全卸、无参交互勾选（需终端）');
  remove.argument('[names...]', '要卸载的插件包名；空格或逗号分隔均可（如 @hankchen/dsh-demo）');
  remove.option('--all', '卸载全部已装插件（与插件名互斥）');
  remove.option('--profile <名>', '覆盖账面 profile（官方命令转发与卸后对账都用该 profile）');
  remove.helpInformation = () => `${PLUGIN_REMOVE_HELP}\n`;
  // --profile 值必需由 commander 选项声明承担（与 add 同口径）：缺值时 commander 抛
  // optionMissingArgument，此处翻成 remove 侧契约文案走 ✗ 通道（装配层收口退出码 1）；
  // 其余库错误原样上抛，沿装配层既有 ✗/帮助通道。
  remove.exitOverride((err: CommanderError) => {
    if (err.code === 'commander.optionMissingArgument' && err.message.includes("'--profile")) {
      throw new CommanderError(err.exitCode, 'commander.customError', ERR_REMOVE_PROFILE_VALUE);
    }
    throw err;
  });
  remove.action(async (tokens: string[], opts: { all?: boolean; profile?: string }) => {
    reportExitCode(await runPluginRemove({ tokens, all: opts.all === true, profile: opts.profile, context }));
  });
  return remove;
}

// plugin remove 处理器：归一化校验 → 账面校验 → 分支行动。错误统一 ✗ 通道 + 退出 1
//（零落盘、零官方调用）；交互取消/空选与空账退出 0（零落盘，唯一豁免延续）；projectRoot
// 可注入（单测用），缺省当前目录（与 add 运行时同口径）。
export async function runPluginRemove({
  tokens,
  all,
  profile,
  context,
  projectRoot = process.cwd(),
}: {
  tokens: string[];
  all: boolean;
  profile: string | undefined;
  context: ProgramContext;
  projectRoot?: string;
}): Promise<number> {
  const selection = resolvePluginRemoveSelection({ tokens, all, profile, isTTY: Boolean(process.stdin.isTTY) });
  switch (selection.kind) {
    case 'error':
      console.error(`✗ ${selection.message}`);
      return 1;
    case 'all': {
      let ledger;
      try {
        ledger = installedPluginLedger(projectRoot);
      } catch (err) {
        console.error(`✗ ${err.message}`);
        return 1;
      }
      const targets = installedPluginEntries(ledger).map((entry) => ({ ...entry, ledgerProfile: entry.profile }));
      if (targets.length === 0) {
        clack.outro(EMPTY_PLUGIN_LEDGER_NOTICE);
        return 0;
      }
      return uninstallPluginsAndRender(targets, context, projectRoot);
    }
    case 'interactive': {
      let ledger;
      try {
        ledger = installedPluginLedger(projectRoot);
      } catch (err) {
        console.error(`✗ ${err.message}`);
        return 1;
      }
      clack.intro(`@hankchen/infra v${context.packageVersion} · 插件卸载`);
      const entries = installedPluginEntries(ledger);
      if (entries.length === 0) {
        clack.outro(EMPTY_PLUGIN_LEDGER_NOTICE);
        return 0;
      }
      const picked = await selectInstalledPluginsInteractive(entries);
      if (picked === null) {
        return 0; // 取消 / 空选：零落盘
      }
      // 账面为源（A2 拍板）：勾选名 → 账面 profile 直达目标，无独立 profile 选择步
      const targets = picked.map((name) => ({ name, profile: ledger[name].profile, ledgerProfile: ledger[name].profile }));
      return uninstallPluginsAndRender(targets, context, projectRoot);
    }
    case 'names': {
      let ledger;
      try {
        ledger = installedPluginLedger(projectRoot);
      } catch (err) {
        console.error(`✗ ${err.message}`);
        return 1;
      }
      const removal = resolvePluginLedgerRemoval({ names: selection.names, ledger, profile: selection.profile });
      if (removal.kind === 'missing') {
        console.error(`✗ ${removal.message}`);
        return 1;
      }
      return uninstallPluginsAndRender(removal.targets, context, projectRoot);
    }
  }
}
