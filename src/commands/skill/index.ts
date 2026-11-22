// skill 命令组定义（票 20261116-f761：add 动词；票 20261122-bdb8：remove 动词，别名 rm；
// 票 20261122-64e9：list/ls、list-remote/ls-remote 清单动词）；无动词裸打显示本命令帮助
//（退出 0）。新增动词口径：加动词文件 + 本命令组注册一处（spec 20261122-edb2：ADR af69
//「加文件 + 注册一处」口径的组内形态，顶层命令组数不变）。

import { Command } from 'commander';

import { configureCommandChannel } from '../channel.ts';
import type { ProgramContext } from '../../context.ts';
import { createSkillAddCommand } from './add.ts';
import { createSkillListCommand } from './list.ts';
import { createSkillListRemoteCommand } from './list-remote.ts';
import { createSkillRemoveCommand } from './remove.ts';

export function createSkillCommand(context: ProgramContext, reportExitCode: (code: number) => void): Command {
  const skill = new Command('skill');
  configureCommandChannel(skill);
  skill.description('安装套件技能进目标 git 项目（.agents/skills/ + agent 目录软链 + 锁文件记账）');
  skill.addCommand(createSkillAddCommand(context, reportExitCode));
  skill.addCommand(createSkillRemoveCommand(context, reportExitCode));
  skill.addCommand(createSkillListCommand(context, reportExitCode));
  skill.addCommand(createSkillListRemoteCommand(context, reportExitCode));
  skill.action(() => {
    skill.outputHelp(); // 无动词：本命令帮助写 stdout，action 正常归还 → 退出 0
  });
  return skill;
}
