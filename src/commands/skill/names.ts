// skill add 名归一化与选择校验（spec 20261116-2c58 实现决策，票 20261116-f761）。
//
// 名归一化与非 TTY 守卫文案与 plugin 侧共享单源实现（../names.ts，票 20261116-ccfb 起；
// 此处重导出保既有 import 面不变，勿另写第二份）。
// 错误文案为 spec 命令面契约原文（测试逐字锚定），不得改写：
//   --all 互斥 / 空名两条为 skill 侧专有；非 TTY 守卫为两命令共用。

import { ERR_INTERACTIVE_TTY, normalizeNames } from '../names.ts';
import { LOCKFILE_NAME } from '../../kernel/lockfile.ts';

// spec 契约原文：--all 与名并集互斥（先后顺序无关，由解析层先归一化后判定保证）。
export const ERR_ALL_MUTEX = '--all 与技能名互斥：全装与按条目指定只能选一';
// spec 契约原文：名过滤后为空。
export const ERR_NAMES_EMPTY = 'skill add 需要至少一个技能名（如 skill add dev-spec,dev-plan）';
// remove 侧契约文案（spec 20261122-edb2，票 20261122-bdb8）：--all 互斥与空名与 add 同口径
//（全卸语义平行改写，归一化/互斥/空名分支判定与 add 同构）。
export const ERR_REMOVE_ALL_MUTEX = '--all 与技能名互斥：全卸与按条目指定只能选一';
export const ERR_REMOVE_NAMES_EMPTY = 'skill remove 需要至少一个技能名（如 skill remove dev-spec）';
// remove 空账提示（spec 实现决策 A1 拍板：提示退 0 零落盘）。
export const EMPTY_LEDGER_NOTICE = `没有已装技能可卸（${LOCKFILE_NAME} skills 记账为空）。`;
// 非 TTY 守卫文案（spec 契约原文）自共享叶重导出，保既有 import 面（cli.test 等）不变。
export { ERR_INTERACTIVE_TTY, normalizeNames };

// 选择校验结果：error = ✗ 通道退出 1；names/all = 免交互安装；interactive = 无参进勾选。
export type SkillSelection =
  | { kind: 'error'; message: string }
  | { kind: 'all' }
  | { kind: 'interactive' }
  | { kind: 'names'; names: string[] };

// 选择校验纯函数：commander 解析产物（位置参数收集 + --all 旗标）→ 归一化后的行动分支。
// 无位置参数（tokens 空）才走交互/守卫；有参数但过滤后为空（如 `skill add ,`）为空名报错。
export function resolveSkillSelection({
  tokens,
  all,
  isTTY,
}: {
  tokens: string[];
  all: boolean;
  isTTY: boolean;
}): SkillSelection {
  const names = normalizeNames(tokens);
  if (all) {
    if (names.length > 0) {
      return { kind: 'error', message: ERR_ALL_MUTEX };
    }
    return { kind: 'all' };
  }
  if (names.length === 0) {
    if (tokens.length === 0) {
      return isTTY ? { kind: 'interactive' } : { kind: 'error', message: ERR_INTERACTIVE_TTY };
    }
    return { kind: 'error', message: ERR_NAMES_EMPTY };
  }
  return { kind: 'names', names };
}

// remove 选择校验结果：分支判定与 add 同构，文案换 remove 侧口径（互斥/空名）。
export type SkillRemoveSelection =
  | { kind: 'error'; message: string }
  | { kind: 'all' }
  | { kind: 'interactive' }
  | { kind: 'names'; names: string[] };

// remove 选择校验纯函数：commander 解析产物（位置参数收集 + --all 旗标）→ 行动分支。
// 归一化与 add 共用 normalizeNames 单源（spec：不另写第二份）；无参走交互/守卫（交互源 =
// 锁文件记账，由运行时供给），有参但过滤后为空（如 `skill remove ,`）为空名报错。
export function resolveSkillRemoveSelection({
  tokens,
  all,
  isTTY,
}: {
  tokens: string[];
  all: boolean;
  isTTY: boolean;
}): SkillRemoveSelection {
  const names = normalizeNames(tokens);
  if (all) {
    if (names.length > 0) {
      return { kind: 'error', message: ERR_REMOVE_ALL_MUTEX };
    }
    return { kind: 'all' };
  }
  if (names.length === 0) {
    if (tokens.length === 0) {
      return isTTY ? { kind: 'interactive' } : { kind: 'error', message: ERR_INTERACTIVE_TTY };
    }
    return { kind: 'error', message: ERR_REMOVE_NAMES_EMPTY };
  }
  return { kind: 'names', names };
}

// 账面校验结果：ok = 全部在账放行；missing = 任一无记账整体拒绝（不做部分卸载）。
export type LedgerRemoval =
  | { kind: 'ok'; names: string[] }
  | { kind: 'missing'; message: string };

// 账面校验纯函数（spec 实现决策「skill 卸载语义」）：requested 并集中任一名字锁文件无记账
// → 整体拒绝，文案含未记账名 + 已装清单 + skill ls 指路。已装清单按名排序呈现（呈现口径，
// 与卸载顺序无关）。
export function resolveLedgerRemoval({
  names,
  ledger,
}: {
  names: string[];
  ledger: string[];
}): LedgerRemoval {
  const installed = new Set(ledger);
  const missing = names.filter((name) => !installed.has(name));
  if (missing.length === 0) {
    return { kind: 'ok', names };
  }
  const installedList = ledger.length > 0 ? [...ledger].sort().join('、') : '（无）';
  return {
    kind: 'missing',
    message: `以下技能没有安装记录（以 ${LOCKFILE_NAME} 记账为准）：${missing.join('、')}；已装：${installedList}（skill ls 查看）`,
  };
}
