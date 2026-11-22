// 解析矩阵域（spec 20261116-2c58 测试决策 S1，票 20261116-f761/20261116-ccfb 立骨架、
// 20261116-bfcf 硬切定稿）。
//
// seam = src/commands/skill/names.ts 与 src/commands/plugin/names.ts（名归一化与选择校验
// 纯函数）+ src/program.ts（未知命令/未知旗标契约文案纯函数）。期望值独立来源 =
// spec 20261116-2c58 实现决策原文（名归一化语义 + 错误文案逐字），不由实现推导。
// 旧旗标十六案例矩阵（RQ3 §11.4 + §10.4）随旗标契约硬切退役删除——FR-5 逐字节防线随
// 旗标退役不再保留；历史矩阵与证据 docs/research/cli-lib/evidence/ 留档不改写。
// 交互分支断言单边落 menu.test（交互构造与守卫域）；真实进程三通道（stdout/stderr/退出码）
// 断言在 e2e（install.test / plugin-install.test，含 spec 契约文案逐字节）。
// 硬切后新矩阵的 e2e 承接：--all×名互斥顺序反转 2 例、未知子命令、未知旗标（顶层旧旗标名 +
// 命令级任意旗标）、裸跑/无动词帮助——本文件锚定纯函数与文案原文，e2e 锚定三通道。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  EMPTY_LEDGER_NOTICE,
  ERR_INTERACTIVE_TTY,
  normalizeNames,
  resolveLedgerRemoval,
  resolveSkillRemoveSelection,
  resolveSkillSelection,
} from '../../src/commands/skill/names.ts';
import {
  EMPTY_PLUGIN_LEDGER_NOTICE,
  ERR_PROFILE_VALUE,
  profileRequiredLines,
  resolvePluginLedgerRemoval,
  resolvePluginRemoveSelection,
  resolvePluginSelection,
} from '../../src/commands/plugin/names.ts';
import { renderTopHelp, unknownCommandMessage, unknownFlagMessage } from '../../src/program.ts';

// ---- spec 20261116-2c58 命令面契约文案（票 20261116-bfcf 硬切定稿）----
// 未知子命令/未知旗标为 spec 实现决策原文（文案模板取实际输入与实际注册清单，呈现归装配层）。

test('未知子命令文案 = spec 契约原文（可用命令清单 + --help 指路）', () => {
  assert.equal(
    unknownCommandMessage('foo', ['skill', 'plugin']),
    '未知命令「foo」；可用命令：skill、plugin（--help 查看用法示例）',
  );
});

test('未知旗标文案 = spec 契约原文：旧旗标名 --skills 同口径（实际输入 + --help 指路）', () => {
  assert.equal(unknownFlagMessage('--skills'), '未知旗标「--skills」；运行 --help 查看全部命令与用法');
});

test('未知旗标文案 = spec 契约原文：命令级任意旗标 --foo 同口径', () => {
  assert.equal(unknownFlagMessage('--foo'), '未知旗标「--foo」；运行 --help 查看全部命令与用法');
});

// ---- spec 20261116-2c58 skill add 名归一化矩阵（票 20261116-f761）----
// seam = src/commands/skill/names.ts。期望值 = spec 实现决策原文：
// 拆逗号/trim/滤空/首现保序去重（`skill add a b,c d` → [a, b, c, d]、`skill add a,a` → [a]）。

const ERR_ALL_MUTEX = '--all 与技能名互斥：全装与按条目指定只能选一';
const ERR_NAMES_EMPTY = 'skill add 需要至少一个技能名（如 skill add dev-spec,dev-plan）';

const NORMALIZE_ROWS: Array<{ name: string; tokens: string[]; want: string[] }> = [
  { name: '空格 variadic 逐个收集', tokens: ['dev-spec', 'dev-plan'], want: ['dev-spec', 'dev-plan'] },
  { name: '空格与逗号混合双收（spec 原例 a b,c d → [a,b,c,d]）', tokens: ['a', 'b,c', 'd'], want: ['a', 'b', 'c', 'd'] },
  { name: '重复名按首现保序去重（spec 原例 a,a → [a]）', tokens: ['a', 'a'], want: ['a'] },
  { name: '逐 token 拆逗号、trim、滤空段', tokens: [' a , ,b ', '  c  '], want: ['a', 'b', 'c'] },
  { name: '首现保序：后现重复让位于首现位置', tokens: ['b', 'a', 'b', 'c', 'a'], want: ['b', 'a', 'c'] },
  { name: '全空段过滤为空数组', tokens: ['', ',', ' , '], want: [] },
];

for (const row of NORMALIZE_ROWS) {
  test(`名归一化：${row.name}`, () => {
    assert.deepEqual(normalizeNames(row.tokens), row.want);
  });
}

// 选择校验（互斥判定在归一化之后 → 与名同给即互斥，与先后顺序无关；两序真实解析由 e2e
// `skill add dev-spec --all` / `skill add --all dev-spec` 承接，见 install.test）。
const SELECTION_ROWS: Array<{
  name: string;
  tokens: string[];
  all: boolean;
  isTTY: boolean;
  error?: string;
  want?: { kind: string; names?: string[] };
}> = [
  { name: '带名免交互：归一化后按名安装', tokens: ['dev-spec', 'dev-plan'], all: false, isTTY: false, want: { kind: 'names', names: ['dev-spec', 'dev-plan'] } },
  { name: '--all 全装', tokens: [], all: true, isTTY: false, want: { kind: 'all' } },
  { name: '--all 与名互斥（先后顺序无关）', tokens: ['dev-spec'], all: true, isTTY: true, error: ERR_ALL_MUTEX },
  { name: '--all 与多名并集互斥', tokens: ['dev-spec', 'dev-plan'], all: true, isTTY: true, error: ERR_ALL_MUTEX },
  { name: '空串 token 过滤后为空报错', tokens: [''], all: false, isTTY: true, error: ERR_NAMES_EMPTY },
  { name: '纯逗号空段 token 过滤后为空报错', tokens: [' , '], all: false, isTTY: false, error: ERR_NAMES_EMPTY },
  { name: '--all 与空段 token 同用按全装（无可互斥之名）', tokens: [' , '], all: true, isTTY: true, want: { kind: 'all' } },
];

for (const row of SELECTION_ROWS) {
  test(`选择校验：${row.name}`, () => {
    const selection = resolveSkillSelection({ tokens: row.tokens, all: row.all, isTTY: row.isTTY });
    if (row.error !== undefined) {
      assert.deepEqual(selection, { kind: 'error', message: row.error });
    } else {
      assert.deepEqual(selection, row.want);
    }
  });
}

// ---- spec 20261122-edb2 skill remove 解析矩阵（票 20261122-bdb8，S1/S2）----
// seam = src/commands/skill/names.ts（resolveSkillRemoveSelection / resolveLedgerRemoval）。
// 期望值独立来源 = spec 实现决策原文：归一化与 add 共用同一单源（不另测一遍归一化实现，
// 只测 remove 侧分支）；「是我装的」以锁文件记账为准，任一无记账整体拒绝。

const ERR_REMOVE_ALL_MUTEX = '--all 与技能名互斥：全卸与按条目指定只能选一';
const ERR_REMOVE_NAMES_EMPTY = 'skill remove 需要至少一个技能名（如 skill remove dev-spec）';

const REMOVE_SELECTION_ROWS: Array<{
  name: string;
  tokens: string[];
  all: boolean;
  isTTY: boolean;
  error?: string;
  want?: { kind: string; names?: string[] };
}> = [
  { name: '带名免交互：归一化后按名卸载', tokens: ['dev-spec'], all: false, isTTY: false, want: { kind: 'names', names: ['dev-spec'] } },
  { name: '归一化与 add 同构：remove a,b a → 并集保序去重 [a,b]', tokens: ['a,b', 'a'], all: false, isTTY: false, want: { kind: 'names', names: ['a', 'b'] } },
  { name: '--all 全卸', tokens: [], all: true, isTTY: false, want: { kind: 'all' } },
  { name: '--all 与名互斥（remove 侧同 add 口径）', tokens: ['dev-spec'], all: true, isTTY: true, error: ERR_REMOVE_ALL_MUTEX },
  { name: '空段 token 过滤后为空报错（remove 侧口径）', tokens: [' , '], all: false, isTTY: false, error: ERR_REMOVE_NAMES_EMPTY },
  { name: '无参且有 TTY：进交互勾选分支（源=锁文件记账，分支判定同构）', tokens: [], all: false, isTTY: true, want: { kind: 'interactive' } },
  { name: '无参且非 TTY：守卫文案报错（更新版含 skill remove 用法，共享单源）', tokens: [], all: false, isTTY: false, error: ERR_INTERACTIVE_TTY },
];

for (const row of REMOVE_SELECTION_ROWS) {
  test(`remove 选择校验：${row.name}`, () => {
    const selection = resolveSkillRemoveSelection({ tokens: row.tokens, all: row.all, isTTY: row.isTTY });
    if (row.error !== undefined) {
      assert.deepEqual(selection, { kind: 'error', message: row.error });
    } else {
      assert.deepEqual(selection, row.want);
    }
  });
}

// 账面校验判定（spec S2）：requested 全部在账才放行；任一无记账（全未记账/部分未记账）
// 整体拒绝——文案含未记账名 + 已装清单 + skill ls 指路（spec 命令面契约）。
const LEDGER_ROWS: Array<{
  name: string;
  names: string[];
  ledger: string[];
  want: { kind: string; message?: string; names?: string[] };
}> = [
  {
    name: '全部在账：放行按名卸载',
    names: ['dev-spec', 'dev-plan'],
    ledger: ['dev-plan', 'dev-spec'],
    want: { kind: 'ok', names: ['dev-spec', 'dev-plan'] },
  },
  {
    name: '全未记账：整体拒绝（含该名 + 已装清单 + skill ls 指路）',
    names: ['ghost'],
    ledger: ['dev-spec', 'dev-plan'],
    want: {
      kind: 'missing',
      message: '以下技能没有安装记录（以 .infra-lock.json 记账为准）：ghost；已装：dev-plan、dev-spec（skill ls 查看）',
    },
  },
  {
    name: '部分未记账：整体拒绝（不做部分卸载）',
    names: ['dev-spec', 'ghost'],
    ledger: ['dev-spec'],
    want: {
      kind: 'missing',
      message: '以下技能没有安装记录（以 .infra-lock.json 记账为准）：ghost；已装：dev-spec（skill ls 查看）',
    },
  },
  {
    name: '空账：整体拒绝且已装清单为（无）',
    names: ['ghost'],
    ledger: [],
    want: {
      kind: 'missing',
      message: '以下技能没有安装记录（以 .infra-lock.json 记账为准）：ghost；已装：（无）（skill ls 查看）',
    },
  },
];

for (const row of LEDGER_ROWS) {
  test(`账面校验：${row.name}`, () => {
    assert.deepEqual(resolveLedgerRemoval({ names: row.names, ledger: row.ledger }), row.want);
  });
}

test('空账 --all 提示文案 = spec 契约原文（A1 拍板：提示退 0）', () => {
  assert.equal(EMPTY_LEDGER_NOTICE, '没有已装技能可卸（.infra-lock.json skills 记账为空）。');
});

// ---- spec 20261116-2c58 plugin add 新矩阵（票 20261116-ccfb）----
// seam = src/commands/plugin/names.ts。期望值独立来源 = spec 实现决策原文：名归一化与
// skill 侧同构（共享同一实现）、空名 / --profile 缺值两条错误文案逐字、缺 --profile 三行结构原文。
// 交互分支断言单边落 menu.test（票 20261116-bfcf 承接 20261116-ccfb 评审标准轴 #2 域分工收敛）。

const ERR_PLUGIN_NAMES_EMPTY =
  'plugin add 需要至少一个插件名（如 plugin add @hankchen/dsh-demo --profile dev）';

const PLUGIN_ROWS: Array<{
  name: string;
  tokens: string[];
  profile: string | undefined;
  isTTY: boolean;
  want: { kind: string; names?: string[]; profile?: string; message?: string };
}> = [
  {
    name: '带名免交互：归一化后按名安装（名与 --profile 顺序无关）',
    tokens: ['@hankchen/dsh-demo'],
    profile: 'dev',
    isTTY: false,
    want: { kind: 'names', names: ['@hankchen/dsh-demo'], profile: 'dev' },
  },
  {
    name: '空格 variadic 与逗号混合双收（与 skill 侧同构：a b,c d → [a,b,c,d]）',
    tokens: ['a', 'b,c', 'd'],
    profile: 'dev',
    isTTY: false,
    want: { kind: 'names', names: ['a', 'b', 'c', 'd'], profile: 'dev' },
  },
  {
    name: '重复名按首现保序去重（与 skill 侧同构：a,a → [a]）',
    tokens: ['a', 'a'],
    profile: 'dev',
    isTTY: false,
    want: { kind: 'names', names: ['a'], profile: 'dev' },
  },
  {
    name: '逐 token 拆逗号、trim、滤空段',
    tokens: [' a , ,b ', '  c  '],
    profile: 'qa',
    isTTY: false,
    want: { kind: 'names', names: ['a', 'b', 'c'], profile: 'qa' },
  },
  {
    name: '带名缺 --profile：三行结构分支',
    tokens: ['@hankchen/dsh-demo'],
    profile: undefined,
    isTTY: true,
    want: { kind: 'profile-required' },
  },
  {
    name: '空串 token 过滤后为空报空名错（与 skill 侧同构）',
    tokens: [''],
    profile: 'dev',
    isTTY: true,
    want: { kind: 'error', message: ERR_PLUGIN_NAMES_EMPTY },
  },
  {
    name: '纯逗号空段 token 过滤后为空报空名错',
    tokens: [' , '],
    profile: undefined,
    isTTY: false,
    want: { kind: 'error', message: ERR_PLUGIN_NAMES_EMPTY },
  },
  {
    name: '--profile 空串值按缺值口径报错（先于其余分支）',
    tokens: ['@hankchen/dsh-demo'],
    profile: '',
    isTTY: true,
    want: { kind: 'error', message: ERR_PROFILE_VALUE },
  },
  {
    name: '--profile 空白值按缺值口径报错',
    tokens: [],
    profile: '  ',
    isTTY: true,
    want: { kind: 'error', message: ERR_PROFILE_VALUE },
  },
];

for (const row of PLUGIN_ROWS) {
  test(`plugin 选择校验：${row.name}`, () => {
    const selection = resolvePluginSelection({ tokens: row.tokens, profile: row.profile, isTTY: row.isTTY });
    assert.deepEqual(selection, row.want);
  });
}

test('plugin 选择校验：--profile 缺值文案为 spec 契约原文', () => {
  assert.equal(ERR_PROFILE_VALUE, '--profile 需要一个 profile 名（如 plugin add @hankchen/dsh-demo --profile dev）');
});

// 缺 --profile 三行结构（spec 契约原文：沿用现行三行结构、示例行改新形态）
test('缺 --profile 三行结构：有既有项列既有 profile（按名排序由调用方注入）', () => {
  assert.deepEqual(profileRequiredLines(['dev', 'work']), [
    '插件安装需要 --profile <名> 指定目标 dsh profile。',
    '既有 profile：dev、work',
    '示例：npx @hankchen/infra plugin add @hankchen/dsh-demo --profile dev',
  ]);
});

test('缺 --profile 三行结构：无既有项输出任意新名说明行', () => {
  assert.deepEqual(profileRequiredLines([]), [
    '插件安装需要 --profile <名> 指定目标 dsh profile。',
    '未发现既有 profile（$DSH_HOME/profiles/，缺省 ~/.dsh/profiles/）——可用任意新名。',
    '示例：npx @hankchen/infra plugin add @hankchen/dsh-demo --profile dev',
  ]);
});

// ---- spec 20261122-edb2 plugin remove 解析矩阵（票 20261122-0204，S1/S2）----
// seam = src/commands/plugin/names.ts（resolvePluginRemoveSelection / resolvePluginLedgerRemoval）。
// 期望值独立来源 = spec 实现决策原文：目标 profile 由账面自动定位（--profile 显式覆盖）、
// 任一名字账面无记录整体拒绝（同构 skill 侧）、--all 与名互斥（同 add 口径）。
// 归一化与 add 共用同一单源（不另测归一化实现，只测 remove 侧分支）。

const ERR_PLUGIN_REMOVE_ALL_MUTEX = '--all 与插件名互斥：全卸与按条目指定只能选一';
// --all × --profile 组合无 spec 语义（--all 按各条目账面 profile 卸，覆盖无落点）：
// 实现拍板显式拒绝而非静默忽略（fail loud；spec 实现决策互斥口径同族）。
const ERR_PLUGIN_REMOVE_ALL_PROFILE_MUTEX = '--profile 与 --all 互斥：全卸按各条目账面 profile 执行';
const ERR_PLUGIN_REMOVE_NAMES_EMPTY = 'plugin remove 需要至少一个插件名（如 plugin remove @hankchen/dsh-demo）';

const PLUGIN_REMOVE_SELECTION_ROWS: Array<{
  name: string;
  tokens: string[];
  all: boolean;
  profile: string | undefined;
  isTTY: boolean;
  error?: string;
  want?: { kind: string; names?: string[]; profile?: string };
}> = [
  {
    name: '带名免交互：账面定位（无 --profile 时 profile 为 undefined）',
    tokens: ['@hankchen/dsh-demo'],
    all: false,
    profile: undefined,
    isTTY: false,
    want: { kind: 'names', names: ['@hankchen/dsh-demo'], profile: undefined },
  },
  {
    name: '带名 --profile 覆盖：profile 随旗标（账面定位被覆盖）',
    tokens: ['@hankchen/dsh-demo'],
    all: false,
    profile: 'test',
    isTTY: false,
    want: { kind: 'names', names: ['@hankchen/dsh-demo'], profile: 'test' },
  },
  {
    name: '归一化与 add 同构：a,b a → 并集保序去重 [a,b]',
    tokens: ['a,b', 'a'],
    all: false,
    profile: undefined,
    isTTY: false,
    want: { kind: 'names', names: ['a', 'b'], profile: undefined },
  },
  {
    name: '--all 全卸',
    tokens: [],
    all: true,
    profile: undefined,
    isTTY: false,
    want: { kind: 'all' },
  },
  {
    name: '--all 与名互斥（同 add 口径）',
    tokens: ['@hankchen/dsh-demo'],
    all: true,
    profile: undefined,
    isTTY: true,
    error: ERR_PLUGIN_REMOVE_ALL_MUTEX,
  },
  {
    name: '--all 与 --profile 互斥（全卸按各条目账面 profile，覆盖无落点）',
    tokens: [],
    all: true,
    profile: 'dev',
    isTTY: true,
    error: ERR_PLUGIN_REMOVE_ALL_PROFILE_MUTEX,
  },
  {
    name: '空段 token 过滤后为空报错（remove 侧口径）',
    tokens: [' , '],
    all: false,
    profile: undefined,
    isTTY: false,
    error: ERR_PLUGIN_REMOVE_NAMES_EMPTY,
  },
  {
    name: '无参且有 TTY：进交互勾选分支（源=锁文件账面）',
    tokens: [],
    all: false,
    profile: undefined,
    isTTY: true,
    want: { kind: 'interactive' },
  },
  {
    name: '无参且非 TTY：守卫文案报错（共享单源）',
    tokens: [],
    all: false,
    profile: undefined,
    isTTY: false,
    error: ERR_INTERACTIVE_TTY,
  },
];

for (const row of PLUGIN_REMOVE_SELECTION_ROWS) {
  test(`plugin remove 选择校验：${row.name}`, () => {
    const selection = resolvePluginRemoveSelection({ tokens: row.tokens, all: row.all, profile: row.profile, isTTY: row.isTTY });
    if (row.error !== undefined) {
      assert.deepEqual(selection, { kind: 'error', message: row.error });
    } else {
      assert.deepEqual(selection, row.want);
    }
  });
}

// 账面校验判定（spec S2）：requested 全部在账才放行且逐条定 profile（账面取值 / --profile
// 覆盖）；任一无记账（全未记账/部分未记账）整体拒绝——文案含未记账名 + 已装清单（插件→profile）
// + plugin ls 指路。
const PLUGIN_LEDGER_ROWS: Array<{
  name: string;
  names: string[];
  ledger: Record<string, { profile: string }>;
  profile: string | undefined;
  want: { kind: string; targets?: Array<{ name: string; profile: string; ledgerProfile: string }>; message?: string };
}> = [
  {
    name: '全部在账：放行且逐条取账面 profile',
    names: ['@hankchen/a', '@hankchen/b'],
    ledger: { '@hankchen/a': { profile: 'dev' }, '@hankchen/b': { profile: 'test' } },
    profile: undefined,
    want: {
      kind: 'ok',
      targets: [
        { name: '@hankchen/a', profile: 'dev', ledgerProfile: 'dev' },
        { name: '@hankchen/b', profile: 'test', ledgerProfile: 'test' },
      ],
    },
  },
  {
    name: '全部在账 + --profile 覆盖：转发/对账 profile 用覆盖值、账面值随行携带',
    names: ['@hankchen/a'],
    ledger: { '@hankchen/a': { profile: 'dev' } },
    profile: 'qa',
    want: {
      kind: 'ok',
      targets: [{ name: '@hankchen/a', profile: 'qa', ledgerProfile: 'dev' }],
    },
  },
  {
    name: '全未记账：整体拒绝（含该名 + 已装插件→profile 清单 + plugin ls 指路）',
    names: ['@hankchen/ghost'],
    ledger: { '@hankchen/a': { profile: 'dev' }, '@hankchen/b': { profile: 'test' } },
    profile: undefined,
    want: {
      kind: 'missing',
      message: '以下插件没有安装记录（以 .infra-lock.json plugins 账面为准）：@hankchen/ghost；已装：@hankchen/a → dev、@hankchen/b → test（plugin ls 查看）',
    },
  },
  {
    name: '部分未记账：整体拒绝（不做部分卸载）',
    names: ['@hankchen/a', '@hankchen/ghost'],
    ledger: { '@hankchen/a': { profile: 'dev' } },
    profile: undefined,
    want: {
      kind: 'missing',
      message: '以下插件没有安装记录（以 .infra-lock.json plugins 账面为准）：@hankchen/ghost；已装：@hankchen/a → dev（plugin ls 查看）',
    },
  },
  {
    name: '空账：整体拒绝且已装清单为（无）',
    names: ['@hankchen/ghost'],
    ledger: {},
    profile: undefined,
    want: {
      kind: 'missing',
      message: '以下插件没有安装记录（以 .infra-lock.json plugins 账面为准）：@hankchen/ghost；已装：（无）（plugin ls 查看）',
    },
  },
];

for (const row of PLUGIN_LEDGER_ROWS) {
  test(`plugin 账面校验：${row.name}`, () => {
    assert.deepEqual(resolvePluginLedgerRemoval({ names: row.names, ledger: row.ledger, profile: row.profile }), row.want);
  });
}

test('plugin 空账 --all 提示文案（A1 拍板同构：提示退 0）', () => {
  assert.equal(EMPTY_PLUGIN_LEDGER_NOTICE, '没有已装插件可卸（.infra-lock.json plugins 记账为空）。');
});

// ---- spec 20261122-edb2 命令面契约收口（票 20261122-64e9，S1 帮助分层断言）----
// seam = src/program.ts（renderTopHelp）+ 命令工厂（createSkillCommand/createPluginCommand，
// 组内注册即单一事实源）。期望值独立来源 = spec 实现决策「命令面契约同步」原文：
// 顶层帮助纳入六个新动词形态与别名；逐动词帮助 = 用法 + 示例 + 别名行；未知动词可用清单
// 取实际注册动词主名（add、remove、list、list-remote）。

import { createPluginCommand } from '../../src/commands/plugin/index.ts';
import { createSkillCommand } from '../../src/commands/skill/index.ts';
import type { Command } from 'commander';
import type { ProgramContext } from '../../src/context.ts';

// 组内注册断言与别名矩阵共用的装配（stub 上下文；reportExitCode 收集器由用例自备）
function buildGroups(): { skill: Command; plugin: Command } {
  const context: ProgramContext = { packageRoot: '/unused', packageVersion: '0.0.0-test' };
  return {
    skill: createSkillCommand(context, () => {}),
    plugin: createPluginCommand(context, () => {}),
  };
}

const VERB_MAIN_NAMES = ['add', 'remove', 'list', 'list-remote'];
const VERB_ALIASES: Record<string, string[]> = { add: [], remove: ['rm'], list: ['ls'], 'list-remote': ['ls-remote'] };

test('组内注册：双侧动词主名 = add、remove、list、list-remote（未知动词可用清单的事实源）', () => {
  const { skill, plugin } = buildGroups();
  assert.deepEqual(skill.commands.map((cmd) => cmd.name()), VERB_MAIN_NAMES);
  assert.deepEqual(plugin.commands.map((cmd) => cmd.name()), VERB_MAIN_NAMES);
});

test('别名声明：rm/ls/ls-remote 双侧与主名各挂一别名（无多余别名）', () => {
  const { skill, plugin } = buildGroups();
  for (const group of [skill, plugin]) {
    for (const verb of group.commands) {
      assert.deepEqual(verb.aliases(), VERB_ALIASES[verb.name()], `别名声明应与 spec 相符（${verb.name()}）`);
    }
  }
});

test('未知动词可用清单文案：实际注册动词主名逐字节（skill 与 plugin 同清单同模板）', () => {
  const { skill, plugin } = buildGroups();
  const want = '未知命令「foo」；可用命令：add、remove、list、list-remote（--help 查看用法示例）';
  assert.equal(unknownCommandMessage('foo', skill.commands.map((cmd) => cmd.name())), want);
  assert.equal(unknownCommandMessage('foo', plugin.commands.map((cmd) => cmd.name())), want);
});

test('顶层帮助含全部六个新动词形态与别名，不含退役旗标名', () => {
  const help = renderTopHelp();
  for (const needle of [
    'skill remove [名...] [--all]',
    'skill list',
    'skill list-remote',
    'plugin remove [名...] [--all]',
    'plugin list',
    'plugin list-remote',
    '别名 rm',
    '别名 ls',
    '别名 ls-remote',
  ]) {
    assert.ok(help.includes(needle), `顶层帮助应含 ${needle}`);
  }
  for (const retired of ['--skills', '--plugins']) {
    assert.equal(help.includes(retired), false, `顶层帮助不得含旧旗标名 ${retired}`);
  }
});

test('逐动词帮助含用法、示例与别名行（remove/list/list-remote 双侧，2c58 帮助分级同构）', () => {
  const { skill, plugin } = buildGroups();
  const rows: Array<[Command, string, string, string]> = [
    [skill, 'skill remove', 'rm', 'remove'],
    [skill, 'skill list', 'ls', 'list'],
    [skill, 'skill list-remote', 'ls-remote', 'list-remote'],
    [plugin, 'plugin remove', 'rm', 'remove'],
    [plugin, 'plugin list', 'ls', 'list'],
    [plugin, 'plugin list-remote', 'ls-remote', 'list-remote'],
  ];
  for (const [group, usage, alias, verb] of rows) {
    const groupName = usage.split(' ')[0]; // skill | plugin
    const cmd = group.commands.find((c) => c.name() === verb);
    assert.ok(cmd, `动词 ${usage} 应已注册`);
    const help = cmd.helpInformation();
    assert.ok(help.includes(`用法：npx @hankchen/infra ${usage}`), `${usage} 帮助应含用法行`);
    assert.ok(help.includes('示例：'), `${usage} 帮助应含示例节`);
    const aliasLine = `别名：${alias}——${groupName} ${alias} 与 ${usage} 行为逐字节一致`;
    assert.ok(help.includes(aliasLine), `${usage} 帮助应含别名行「${aliasLine}」`);
  }
});
