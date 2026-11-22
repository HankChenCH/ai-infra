// skill remove 动词命令定义（spec 20261122-edb2，票 20261122-bdb8；别名 rm）：参数旗标
// 声明与校验分派与 add 同构（归一化共用 names.ts 单源）；无参交互勾选源 = 锁文件 skills
// 记账（PTY，需终端）。命令定义层承载参数旗标声明、校验分派、内核编排调用与摘要呈现。

import { Command } from 'commander';
import * as clack from '@clack/prompts';

import { configureCommandChannel } from '../channel.ts';
import type { ProgramContext } from '../../context.ts';
import {
  EMPTY_LEDGER_NOTICE,
  resolveLedgerRemoval,
  resolveSkillRemoveSelection,
} from './names.ts';
import { installedSkillNames, selectInstalledSkillsInteractive, uninstallSkillsAndRender } from './run.ts';

// skill remove 逐命令帮助（用法 + 示例；与 skill add 帮助分级同构）。
const SKILL_REMOVE_HELP = `用法：npx @hankchen/infra skill remove [名...] [选项]

卸载已装技能（.agents/skills/ 实体目录 + agent 目录软链 + .infra-lock.json 记账一次清干净，
以锁文件记账为准：无记账的名字不会被动）。

参数：
  名...    要卸载的技能名；空格或逗号分隔均可（如 dev-spec,dev-plan）

选项：
  --all         卸载全部已装技能（与技能名互斥）
  -h, --help    显示本帮助

示例：
  npx @hankchen/infra skill remove dev-spec      # 免交互卸载指定技能
  npx @hankchen/infra skill remove               # 交互勾选要卸载的技能
  npx @hankchen/infra skill remove --all         # 免交互卸载全部已装技能`;

export function createSkillRemoveCommand(context: ProgramContext, reportExitCode: (code: number) => void): Command {
  const remove = new Command('remove');
  remove.alias('rm');
  configureCommandChannel(remove);
  remove.description('卸载已装技能：带名免交互、--all 全卸、无参交互勾选（需终端）');
  remove.argument('[names...]', '要卸载的技能名；空格或逗号分隔均可（如 dev-spec,dev-plan）');
  remove.option('--all', '卸载全部已装技能（与技能名互斥）');
  remove.helpInformation = () => `${SKILL_REMOVE_HELP}\n`;
  remove.action(async (tokens: string[], opts: { all?: boolean }) => {
    reportExitCode(await runSkillRemove({ tokens, all: opts.all === true, context }));
  });
  return remove;
}

// skill remove 处理器：归一化校验 → 账面校验 → 分支行动。错误统一 ✗ 通道 + 退出 1
//（零落盘）；交互取消/空选与空账退出 0（零落盘，唯一豁免延续）；projectRoot 可注入
//（单测用），缺省当前目录（与 add 运行时同口径）。
export async function runSkillRemove({
  tokens,
  all,
  context,
  projectRoot = process.cwd(),
}: {
  tokens: string[];
  all: boolean;
  context: ProgramContext;
  projectRoot?: string;
}): Promise<number> {
  const selection = resolveSkillRemoveSelection({ tokens, all, isTTY: Boolean(process.stdin.isTTY) });
  switch (selection.kind) {
    case 'error':
      console.error(`✗ ${selection.message}`);
      return 1;
    case 'all': {
      let ledger: string[];
      try {
        ledger = installedSkillNames(projectRoot);
      } catch (err) {
        console.error(`✗ ${err.message}`);
        return 1;
      }
      if (ledger.length === 0) {
        clack.outro(EMPTY_LEDGER_NOTICE);
        return 0;
      }
      return uninstallSkillsAndRender(ledger, context, projectRoot);
    }
    case 'interactive': {
      let ledger: string[];
      try {
        ledger = installedSkillNames(projectRoot);
      } catch (err) {
        console.error(`✗ ${err.message}`);
        return 1;
      }
      clack.intro(`@hankchen/infra v${context.packageVersion} · 技能卸载`);
      if (ledger.length === 0) {
        clack.outro(EMPTY_LEDGER_NOTICE);
        return 0;
      }
      const picked = await selectInstalledSkillsInteractive(projectRoot);
      if (picked === null) {
        return 0; // 取消 / 空选：零落盘
      }
      return uninstallSkillsAndRender(picked, context, projectRoot);
    }
    case 'names': {
      let ledger: string[];
      try {
        ledger = installedSkillNames(projectRoot);
      } catch (err) {
        console.error(`✗ ${err.message}`);
        return 1;
      }
      const removal = resolveLedgerRemoval({ names: selection.names, ledger });
      if (removal.kind === 'missing') {
        console.error(`✗ ${removal.message}`);
        return 1;
      }
      return uninstallSkillsAndRender(removal.names, context, projectRoot);
    }
  }
}
