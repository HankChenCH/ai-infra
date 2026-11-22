// 技能卸载编排（spec 20261122-edb2 实现决策「skill 卸载语义」，票 20261122-bdb8）：
// 表驱动——只认映射行字段（与 installer.ts 同一行型），账本为准：
//   1. 校验 selected 非空且全部在锁文件 skills 记账（任一无记账整体拒绝——命令层预校验
//      之外的内核不变式防线）
//   2. 逐条目删实体目录 <installTarget>/<名>（不存在记「账在实亡」照走后续）
//   3. 清各 agent 目录软链：仅 lstat 为符号链接者删（含悬空——悬空软链仍是软链）；真实
//      文件/目录占位记冲突跳过，绝不删非软链内容
//   4. 锁文件 skills 清账，package/packageVersion 骨架保留（need FR-5：账行清空不等于
//      头实体删除），一次落盘

import fs from 'node:fs';
import path from 'node:path';

import { expandSymlinkRule } from './asset-map.ts';
import { readLockfile, writeLockfile } from './lockfile.ts';
import type { InfraLockfile } from './lockfile.ts';
import type { InstallRow } from './installer.ts';

export interface UninstallConflict {
  linkPath: string;
  agentDir: string;
  skill: string;
}

export interface UninstallSkillsResult {
  removedSkills: string[];
  // 账在实亡：锁文件在册但实体目录已不存在（仅清账与悬空软链）
  phantomSkills: string[];
  // 至少清掉一条软链的 agent 目录（呈现口径：摘要「已清 M 个 agent 目录软链」）
  clearedAgentDirs: string[];
  conflicts: UninstallConflict[];
  lockfile: InfraLockfile;
}

export function uninstallSkills({
  row,
  projectRoot,
  agentDirs,
  selected,
}: {
  row: InstallRow;
  projectRoot: string;
  agentDirs: string[];
  selected: string[];
}): UninstallSkillsResult {
  if (!Array.isArray(selected) || selected.length === 0) {
    throw new Error('未选择任何条目：selected 为空，拒绝卸载');
  }
  const lockfile = readLockfile(projectRoot);
  if (lockfile === null) {
    throw new Error(`锁文件不存在，无法卸载（${row.installTarget}/ 无来源可卸：先 skill add 安装后才有记账）`);
  }
  const ledger = Object.keys(lockfile.skills);
  const missing = selected.filter((name) => !ledger.includes(name));
  if (missing.length > 0) {
    throw new Error(`以下技能没有安装记录（以锁文件记账为准）：${missing.join('、')}；已装：${ledger.sort().join('、') || '（无）'}`);
  }

  const result: UninstallSkillsResult = {
    removedSkills: [],
    phantomSkills: [],
    clearedAgentDirs: [],
    conflicts: [],
    lockfile,
  };
  const targetRoot = path.join(projectRoot, row.installTarget);

  for (const name of selected) {
    const entityPath = path.join(targetRoot, name);
    if (fs.existsSync(entityPath)) {
      fs.rmSync(entityPath, { recursive: true, force: true });
    } else {
      result.phantomSkills.push(name);
    }
    result.removedSkills.push(name);

    for (const agentDir of agentDirs) {
      const linkRel = expandSymlinkRule(row.symlinkRule, agentDir, name);
      const linkPath = path.join(projectRoot, linkRel);
      // lstat 不跟随软链：悬空软链 lstat 照常命中；throwIfNoEntry 让「路径不存在」（含父目录
      // 缺失）安静跳过——安装只对存在的 agent 目录建链，卸载侧扫全表即可
      const stat = fs.lstatSync(linkPath, { throwIfNoEntry: false });
      if (stat === undefined) {
        continue;
      }
      if (stat.isSymbolicLink()) {
        fs.unlinkSync(linkPath);
        if (!result.clearedAgentDirs.includes(agentDir)) {
          result.clearedAgentDirs.push(agentDir);
        }
      } else {
        result.conflicts.push({ linkPath: linkRel, agentDir, skill: name });
      }
    }

    delete lockfile.skills[name];
  }

  writeLockfile(projectRoot, lockfile);
  return result;
}
