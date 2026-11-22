// plugin add/remove 名归一化与选择校验（add：spec 20261116-2c58，票 20261116-ccfb；
// remove：spec 20261122-edb2 实现决策「plugin 卸载语义（账面定位）」，票 20261122-0204）。
//
// 名归一化与 skill 侧共享同一实现（../names.ts，勿另写第二份）；本模块承载 plugin 侧
// 的选择分支判定与契约文案。错误文案为 spec 命令面契约原文（测试逐字锚定），不得改写：
//   add 侧 空名 / --profile 缺值 / 非 TTY 守卫 / 缺 --profile 三行结构；
//   remove 侧互斥/空名与 add 同口径改写，账面校验文案锚定 spec「账面无记录整体拒绝」。

import { ERR_INTERACTIVE_TTY, normalizeNames } from '../names.ts';
import { LOCKFILE_NAME } from '../../kernel/lockfile.ts';
import type { PluginLockEntry } from '../../kernel/lockfile.ts';

// spec 契约原文：名过滤后为空（plugin 侧同构文案）。
export const ERR_NAMES_EMPTY =
  'plugin add 需要至少一个插件名（如 plugin add @hankchen/dsh-demo --profile dev）';
// spec 契约原文：--profile 缺值。commander 选项声明 `--profile <名>` 承担值必需，缺值经
// 出口通道翻本文案（见 add.ts 的 exitOverride 转译）；空串值同缺值口径（旧旗标矩阵同义）。
export const ERR_PROFILE_VALUE =
  '--profile 需要一个 profile 名（如 plugin add @hankchen/dsh-demo --profile dev）';
// 非 TTY 交互守卫（spec 契约原文，与 skill 侧同一条）自共享叶重导出，保 import 面单一。
export { ERR_INTERACTIVE_TTY };

// 选择校验结果：error = ✗ 通道退出 1；profile-required = 缺 --profile 三行结构报错；
// names = 带名免交互安装；interactive = 无参进勾选（presetProfile 非空时不再提示 profile）。
export type PluginSelection =
  | { kind: 'error'; message: string }
  | { kind: 'profile-required' }
  | { kind: 'interactive'; presetProfile: string | undefined }
  | { kind: 'names'; names: string[]; profile: string };

// 选择校验纯函数：commander 解析产物（位置参数收集 + --profile 值）→ 行动分支。
// 判定顺序：--profile 空值（显式给了旗标但无有效值）最先报；带名无 profile 为三行结构；
// 有参数但过滤后为空（如 `plugin add ,`）为空名报错；无位置参数才走交互/守卫。
export function resolvePluginSelection({
  tokens,
  profile,
  isTTY,
}: {
  tokens: string[];
  profile: string | undefined;
  isTTY: boolean;
}): PluginSelection {
  if (profile !== undefined && profile.trim() === '') {
    return { kind: 'error', message: ERR_PROFILE_VALUE };
  }
  const names = normalizeNames(tokens);
  if (names.length > 0) {
    return profile === undefined
      ? { kind: 'profile-required' }
      : { kind: 'names', names, profile };
  }
  if (tokens.length > 0) {
    return { kind: 'error', message: ERR_NAMES_EMPTY };
  }
  if (!isTTY) {
    return { kind: 'error', message: ERR_INTERACTIVE_TTY };
  }
  return { kind: 'interactive', presetProfile: profile };
}

// 缺 --profile 三行结构（spec 命令面契约：沿用现行三行结构，示例行改新形态）。纯函数
// 返回三行内容（不含 ✗ 前缀与缩进，呈现归处理器）；既有 profile 列表由调用方读盘注入。
export function profileRequiredLines(existingProfiles: string[]): string[] {
  return [
    '插件安装需要 --profile <名> 指定目标 dsh profile。',
    existingProfiles.length > 0
      ? `既有 profile：${existingProfiles.join('、')}`
      : '未发现既有 profile（$DSH_HOME/profiles/，缺省 ~/.dsh/profiles/）——可用任意新名。',
    '示例：npx @hankchen/infra plugin add @hankchen/dsh-demo --profile dev',
  ];
}

// ---------- remove 侧（spec 20261122-edb2「plugin 卸载语义」，票 20261122-0204）----------
// 分支判定与 add 同构，文案换 remove 侧口径（互斥/空名）；目标 profile 由账面自动定位，
// --profile 显式覆盖（spec：转发与对账用给定 profile、锁文件仍清该名账面记录）。

// remove 侧契约文案：互斥/空名与 add 同口径（全卸语义平行改写）。
export const ERR_REMOVE_ALL_MUTEX = '--all 与插件名互斥：全卸与按条目指定只能选一';
export const ERR_REMOVE_NAMES_EMPTY = 'plugin remove 需要至少一个插件名（如 plugin remove @hankchen/dsh-demo）';
// --profile 缺值同 add 口径（commander 值必需经 remove 命令的出口通道转译到本文案）。
export const ERR_REMOVE_PROFILE_VALUE = '--profile 需要一个 profile 名（如 plugin remove @hankchen/dsh-demo）';
// --all × --profile 组合无 spec 语义（--all 逐条按各自账面 profile 卸，覆盖无落点）：
// 显式拒绝而非静默忽略（fail loud；实现拍板，与互斥口径同族）。
export const ERR_REMOVE_ALL_PROFILE_MUTEX = '--profile 与 --all 互斥：全卸按各条目账面 profile 执行';
// remove 空账提示（spec A1 拍板同构：提示退 0 零落盘）。
export const EMPTY_PLUGIN_LEDGER_NOTICE = `没有已装插件可卸（${LOCKFILE_NAME} plugins 记账为空）。`;

// remove 选择校验结果：error = ✗ 通道退出 1；all = 免交互全卸（逐条按各自账面 profile）；
// interactive = 无参进勾选（源 = 锁文件账面）；names = 带名免交互（profile undefined = 账面
// 定位，非 undefined = 显式覆盖）。
export type PluginRemoveSelection =
  | { kind: 'error'; message: string }
  | { kind: 'all' }
  | { kind: 'interactive' }
  | { kind: 'names'; names: string[]; profile: string | undefined };

// remove 选择校验纯函数：commander 解析产物（位置参数收集 + --all/--profile 旗标）→ 行动分支。
// 判定顺序与 add 同构：--profile 空值最先报；--all 与名互斥、与 --profile 互斥；无位置参数
// 才走交互/守卫；有参数但过滤后为空（如 `plugin remove ,`）为空名报错。归一化与 add 共用
// normalizeNames 单源。
export function resolvePluginRemoveSelection({
  tokens,
  all,
  profile,
  isTTY,
}: {
  tokens: string[];
  all: boolean;
  profile: string | undefined;
  isTTY: boolean;
}): PluginRemoveSelection {
  if (profile !== undefined && profile.trim() === '') {
    return { kind: 'error', message: ERR_REMOVE_PROFILE_VALUE };
  }
  const names = normalizeNames(tokens);
  if (all) {
    if (names.length > 0) {
      return { kind: 'error', message: ERR_REMOVE_ALL_MUTEX };
    }
    if (profile !== undefined) {
      return { kind: 'error', message: ERR_REMOVE_ALL_PROFILE_MUTEX };
    }
    return { kind: 'all' };
  }
  if (names.length === 0) {
    if (tokens.length === 0) {
      return isTTY ? { kind: 'interactive' } : { kind: 'error', message: ERR_INTERACTIVE_TTY };
    }
    return { kind: 'error', message: ERR_REMOVE_NAMES_EMPTY };
  }
  return { kind: 'names', names, profile };
}

// 卸载目标：name/profile 供内核转发与对账；ledgerProfile 是账面记录值（呈现层用它注明
// profile 覆盖）。无覆盖时两者相等。
export interface PluginRemovalTarget {
  name: string;
  profile: string;
  ledgerProfile: string;
}

// 账面校验结果：ok = 全部在账放行（逐条定 profile）；missing = 任一无记账整体拒绝（不做
// 部分卸载）。ledger 为锁文件 plugins 账面（名 → 记录）。
export type PluginLedgerRemoval =
  | { kind: 'ok'; targets: PluginRemovalTarget[] }
  | { kind: 'missing'; message: string };

// 账面校验纯函数（spec 实现决策「plugin 卸载语义」）：requested 并集中任一名字账面无记录
// → 整体拒绝，文案含未记账名 + 已装插件→profile 清单 + plugin ls 指路。已装清单按名排序
// 呈现（呈现口径，与卸载顺序无关）。目标 profile = 显式覆盖值 ?? 账面记录值。
export function resolvePluginLedgerRemoval({
  names,
  ledger,
  profile,
}: {
  names: string[];
  // 账面切片：判定与定位只读 profile（完整 PluginLockEntry 记录可直接传入，结构兼容）
  ledger: Record<string, Pick<PluginLockEntry, 'profile'>>;
  profile: string | undefined;
}): PluginLedgerRemoval {
  const installedNames = Object.keys(ledger);
  const missing = names.filter((name) => !(name in ledger));
  if (missing.length > 0) {
    const installedList = installedNames.length > 0
      ? [...installedNames].sort().map((name) => `${name} → ${ledger[name].profile}`).join('、')
      : '（无）';
    return {
      kind: 'missing',
      message: `以下插件没有安装记录（以 ${LOCKFILE_NAME} plugins 账面为准）：${missing.join('、')}；已装：${installedList}（plugin ls 查看）`,
    };
  }
  return {
    kind: 'ok',
    targets: names.map((name) => {
      const ledgerProfile = ledger[name].profile;
      return { name, profile: profile ?? ledgerProfile, ledgerProfile };
    }),
  };
}
