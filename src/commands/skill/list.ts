// skill list 动词命令定义（spec 20261122-edb2 实现决策「清单呈现」，票 20261122-64e9；
// 别名 ls）：列锁文件 skills 记账（名 + 安装时间，按名排序），账空输出「（无已装技能）」
// 退出 0；纯读零落盘（唯一写入面是安装/卸载编排，本命令零调用）。

import { Command } from 'commander';

import { configureCommandChannel } from '../channel.ts';
import type { ProgramContext } from '../../context.ts';
import { installedSkillRows } from '../../kernel/listing.ts';

// skill list 逐命令帮助（用法 + 示例 + 别名行；spec FR-4 逐动词帮助定稿口径）。
const SKILL_LIST_HELP = `用法：npx @hankchen/infra skill list [选项]

列已装技能（以 .infra-lock.json skills 记账为准）：按名排序，含安装时间；纯读零落盘。

别名：ls——skill ls 与 skill list 行为逐字节一致

选项：
  -h, --help    显示本帮助

示例：
  npx @hankchen/infra skill list    # 列已装技能（按名排序 + 安装时间）
  npx @hankchen/infra skill ls      # 同上（别名）`;

export function createSkillListCommand(context: ProgramContext, reportExitCode: (code: number) => void): Command {
  const list = new Command('list');
  list.alias('ls');
  configureCommandChannel(list);
  list.description('列已装技能：按名排序 + 安装时间（以 .infra-lock.json 记账为准，纯读）');
  list.helpInformation = () => `${SKILL_LIST_HELP}\n`;
  list.action(() => {
    reportExitCode(runSkillList({ context, projectRoot: process.cwd() }));
  });
  return list;
}

// skill list 处理器：账面装配 → 呈现。锁文件损坏走 ✗ 通道（退出 1、零落盘）；账空提示
// 退 0；呈现归命令层、判定归内核（listing.ts），projectRoot 可注入（单测用）。
const SKILL_LIST_EMPTY_NOTICE = '（无已装技能）';

export function runSkillList({ context, projectRoot = process.cwd() }: { context: ProgramContext; projectRoot?: string }): number {
  void context; // 清单呈现不消费包上下文；签名与四动词处理器保持同构
  let rows;
  try {
    rows = installedSkillRows(projectRoot);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    return 1;
  }
  if (rows.length === 0) {
    console.log(SKILL_LIST_EMPTY_NOTICE);
    return 0;
  }
  const lines = [`已装技能（${rows.length} 项，按名排序）：`];
  for (const row of rows) {
    lines.push(`  ${row.name}  ${row.installedAt}`);
  }
  console.log(lines.join('\n'));
  return 0;
}
