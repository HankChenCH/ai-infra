// gitlab 适配器进程级替身测试（spec 20261122-cda7，票 20261122-4295）。
//
// 与 github-adapter-stub.test.ts 结构镜像（双腿同构改造）：假 glab（PATH 前置）钉调用序列、
// 退出码、stderr 文案与映射文件副作用。GitLab 平台差异面：create/comment 以内联字符串传正文
// （--description / --message，替身记 DESC_HEAD/DESC_LEN），close 无 reason 概念（rejected 与
// 其余终态同款关闭，v1.40 既有口径）。期望值独立来源 = spec 20261122-cda7 验收场景字面契约，
// 不由实现推导；替身只钉替身契约，真实链路由集成级人工段背书（stub-fidelity-integration 纪律）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ADAPTER = path.join(packageRoot, '.sdlc', 'trackers', 'gitlab.sh');

// ── 假 glab：记录 issue/<verb> 调用序列与正文摘要（长度 + 首行）后按环境开关回预制结果 ──
const FAKE_GLAB = `#!/bin/sh
log="\${FAKE_GLAB_LOG:?}"
if [ "\$1" = "auth" ]; then
  printf 'auth\\tstatus\\n' >> "\$log"
  if [ -n "\${FAKE_GLAB_FAIL_AUTH:-}" ]; then echo 'fake glab: 模拟未认证' >&2; exit 1; fi
  exit 0
fi
verb="\$2"
desc_len="0"; desc_head=""
prev=""
for a in "\$@"; do
  if [ "\$prev" = "--description" ] || [ "\$prev" = "--message" ]; then
    desc_len="\$(printf '%s' "\$a" | wc -c | tr -d ' ')"
    desc_head="\$(printf '%s' "\$a" | sed -n '1p')"
  fi
  prev="\$a"
done
{
  printf 'issue\\t%s' "\$verb"
  prev=""
  for a in "\$@"; do
    if [ "\$prev" = "--description" ] || [ "\$prev" = "--message" ]; then
      # 正文内联多行，原样入日志会撕裂单行格式——记摘要占位（长度 + 首行）
      printf '\\t<DESC len=%s head=%s>' "\$desc_len" "\$desc_head"
    else
      printf '\\t%s' "\$a"
    fi
    prev="\$a"
  done
  printf '\\n'
} >> "\$log"
case "\$verb" in
  create)
    if [ -n "\${FAKE_GLAB_FAIL_CREATE:-}" ]; then echo 'fake glab: 模拟创建失败' >&2; exit 1; fi
    printf '%s/-/issues/%s\\n' "\${FAKE_GLAB_URL_BASE:-https://gitlab.com/acme/widget}" "\${FAKE_GLAB_NEW_NUM:-42}"
    ;;
  comment) : ;;
  close)
    if [ -n "\${FAKE_GLAB_FAIL_CLOSE:-}" ]; then echo 'fake glab: 模拟关闭失败（可能已关闭）' >&2; exit 1; fi
    ;;
  update) : ;;
esac
`;

interface RunResult {
  status: number;
  stderr: string;
  stdout: string;
  log: string[]; // 每行 issue\t<verb>\t<args...>[\tDESC_HEAD=…\tDESC_LEN=…]
  mapLines: string[];
}

type Kind =
  | 'need' | 'spec' | 'ticket' | 'research'
  | 'acceptance' | 'review' | 'overview'
  | 'oldFormatProcess' | 'legacyPrefixProcess';

interface SandboxSpec {
  kind: Kind;
  frontmatterStatus: string;
  mapSeed?: string[];
  specAnchor?: 'lineage' | 'legacy';
  failAuth?: boolean;
  failCreate?: boolean;
  failClose?: boolean;
  newNum?: string;
  config?: Partial<Record<'TRACKER_REPO', string>>;
  bodyPadBytes?: number;
  omitGlab?: boolean;
  customBase?: string;
}

const FIXTURES: Record<Kind, { dir: string; base: string }> = {
  need: { dir: 'docs/needs', base: '20261122-f5fc-projection-aggregate-per-need.md' },
  spec: { dir: 'docs/specs', base: 'need20261122-f5fc-20261122-cda7-aggregate-issue-per-need.md' },
  ticket: { dir: 'docs/tickets', base: 'spec20261122-cda7-20261122-4295-aggregate-projection-batch.md' },
  research: { dir: 'docs/research', base: '20261122-b001-independent-note.md' },
  acceptance: { dir: 'docs/acceptance', base: 'spec20261122-cda7-20261122-b002-accept-batch.md' },
  review: { dir: 'docs/reviews', base: 'spec20261122-cda7-20261122-d003-review-batch.md' },
  overview: { dir: 'docs/overviews', base: 'spec20261122-cda7-20261122-e004-overview-batch.md' },
  oldFormatProcess: { dir: 'docs/reviews', base: '20261122-c005-old-review.md' },
  legacyPrefixProcess: { dir: 'docs/reviews', base: 'spec0004-20261122-c006-legacy-review.md' },
};

const NEED_REL = `docs/needs/${FIXTURES.need.base}`;
const SPEC_REL = `docs/specs/${FIXTURES.spec.base}`;
const NEED_NUM = '7';
const NEW_NUM = '42';
const POINTER_HEAD = `> 盘上产物：${NEED_REL}`;

function runAdapter(spec: SandboxSpec): RunResult {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'gitlab-adapter-')));
  const fakeBin = path.join(root, 'fakebin');
  fs.mkdirSync(fakeBin);
  if (!spec.omitGlab) fs.writeFileSync(path.join(fakeBin, 'glab'), FAKE_GLAB, { mode: 0o755 });
  fs.mkdirSync(path.join(root, '.sdlc', 'trackers'), { recursive: true });
  fs.copyFileSync(ADAPTER, path.join(root, '.sdlc', 'trackers', 'gitlab.sh'));
  fs.writeFileSync(
    path.join(root, '.sdlc', 'config.sh'),
    `TRACKER=gitlab\nTRACKER_REPO="${spec.config?.TRACKER_REPO ?? 'acme/widget'}"\n`,
  );
  if (spec.specAnchor === 'lineage') {
    fs.mkdirSync(path.join(root, 'docs', 'specs'), { recursive: true });
    fs.writeFileSync(path.join(root, SPEC_REL), '---\nid: 20261122-cda7\nstatus: approved\n---\n# 锚 spec\n');
  } else if (spec.specAnchor === 'legacy') {
    fs.mkdirSync(path.join(root, 'docs', 'specs'), { recursive: true });
    fs.writeFileSync(path.join(root, 'docs/specs/0004-tracker-platform-adapters.md'), '---\nid: 0004\nstatus: approved\n---\n# legacy 锚\n');
  }
  const fx = FIXTURES[spec.kind];
  fs.mkdirSync(path.join(root, fx.dir), { recursive: true });
  const base = spec.customBase ?? fx.base;
  const rel = path.join(fx.dir, base);
  const pad = spec.bodyPadBytes ? `\n${'x'.repeat(spec.bodyPadBytes)}` : '';
  fs.writeFileSync(
    path.join(root, rel),
    `---\nid: 20261122-f5fc\nstatus: ${spec.frontmatterStatus}\ncreated: 2026-11-22\n---\n# ${spec.kind} 夹具标题\n\n正文。${pad}\n`,
  );
  const mapPath = path.join(root, '.sdlc', 'trackers', 'gitlab.map');
  if (spec.mapSeed !== undefined) fs.writeFileSync(mapPath, spec.mapSeed.join('\n') + '\n');
  const logPath = path.join(root, 'fake-glab.log');

  const env: NodeJS.ProcessEnv = { ...process.env, FAKE_GLAB_LOG: logPath };
  if (spec.failAuth) env.FAKE_GLAB_FAIL_AUTH = '1';
  if (spec.failCreate) env.FAKE_GLAB_FAIL_CREATE = '1';
  if (spec.failClose) env.FAKE_GLAB_FAIL_CLOSE = '1';
  if (spec.newNum !== undefined) env.FAKE_GLAB_NEW_NUM = spec.newNum;
  const res = spawnSync('bash', [path.join(root, '.sdlc', 'trackers', 'gitlab.sh'), 'publish', path.join(root, rel)], {
    cwd: root,
    env: spec.omitGlab ? { ...process.env, PATH: '/usr/bin:/bin', FAKE_GLAB_LOG: logPath } : { ...env, PATH: `${fakeBin}${path.delimiter}${process.env.PATH}` },
    encoding: 'utf-8',
  });

  const result: RunResult = {
    status: res.status ?? -1,
    stderr: res.stderr,
    stdout: res.stdout,
    log: fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf-8').split('\n').filter((l) => l !== '') : [],
    mapLines: fs.existsSync(mapPath) ? fs.readFileSync(mapPath, 'utf-8').split('\n').filter((l) => l !== '') : [],
  };
  fs.rmSync(root, { recursive: true, force: true });
  return result;
}

const callsOf = (r: RunResult, verb: string): string[] =>
  r.log.filter((l) => l.split('\t')[0] === 'issue' && l.split('\t')[1] === verb);
const descInfoOf = (line: string): { len: number; head: string } => {
  const f = line.split('\t').find((x) => x.startsWith('<DESC len='));
  const m = f?.match(/^<DESC len=(\d+) head=(.*)>$/);
  return { len: m ? Number(m[1]) : 0, head: m ? m[2] : '' };
};

// ── FR-1 need 形态 ──

test('publish need 首投：一次建单（标题=一级标题、正文首行盘上指针）+ 账本需求单行三字段', () => {
  const r = runAdapter({ kind: 'need', frontmatterStatus: 'confirmed' });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}，stderr：${r.stderr}`);
  const creates = callsOf(r, 'create');
  assert.equal(creates.length, 1, `应恰一次建单，实际调用日志：${JSON.stringify(r.log)}`);
  assert.ok(creates[0].includes('--title'), '建单应带标题参数');
  assert.ok(creates[0].includes('need 夹具标题'), `标题应取产物一级标题，实际：${creates[0]}`);
  assert.ok(descInfoOf(creates[0]).head.startsWith(POINTER_HEAD), `正文首行应为盘上指针行，实际：${descInfoOf(creates[0]).head}`);
  assert.equal(r.mapLines.length, 1, `账本应新增一行，实际：${JSON.stringify(r.mapLines)}`);
  assert.equal(r.mapLines[0].split('\t')[0], NEED_REL);
  assert.equal(r.mapLines[0].split('\t')[1], NEW_NUM, '需求单行第二列应记自身单号');
  assert.equal(r.mapLines[0].split('\t')[2], `https://gitlab.com/acme/widget/-/issues/${NEW_NUM}`, '需求单行第三列应记对象 URL');
  assert.equal(callsOf(r, 'close').length, 0, '活跃态不得关闭');
});

test('publish need status=fulfilled：建单后 close 附终态注评', () => {
  const r = runAdapter({ kind: 'need', frontmatterStatus: 'fulfilled' });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}，stderr：${r.stderr}`);
  assert.equal(callsOf(r, 'close').length, 1, `应恰一次关闭，实际：${JSON.stringify(r.log)}`);
});

test('publish need status=rejected：同款 close（GitLab 无 reason 概念）', () => {
  const r = runAdapter({ kind: 'need', frontmatterStatus: 'rejected' });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}，stderr：${r.stderr}`);
  assert.equal(callsOf(r, 'close').length, 1, `应恰一次关闭，实际：${JSON.stringify(r.log)}`);
});

test('publish need 重投（已映射）：向既有单追加评论，零编辑零新建、账本不变', () => {
  const r = runAdapter({
    kind: 'need',
    frontmatterStatus: 'confirmed',
    mapSeed: [`${NEED_REL}\t${NEED_NUM}\t`],
  });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}，stderr：${r.stderr}`);
  assert.equal(callsOf(r, 'create').length, 0, '重投不得新建');
  assert.equal(callsOf(r, 'update').length, 0, '时间线不可变：不得调用编辑接口');
  const comments = callsOf(r, 'comment');
  assert.equal(comments.length, 1, `应恰一次评论，实际：${JSON.stringify(r.log)}`);
  assert.ok(comments[0].split('\t').includes(NEED_NUM), `评论应挂既有单 #${NEED_NUM}，实际：${comments[0]}`);
  assert.equal(r.mapLines.length, 1, '账本行数应不变');
});

test('已关闭聚合单重复终态 publish：关闭非零留痕 stderr，仍 exit 0 且评论已追加', () => {
  const r = runAdapter({
    kind: 'need',
    frontmatterStatus: 'fulfilled',
    mapSeed: [`${NEED_REL}\t${NEED_NUM}\t`],
    failClose: true,
  });
  assert.equal(r.status, 0, `关闭失败应留痕不阻断，实际 exit ${r.status}`);
  assert.ok(r.stderr.includes('终态关闭失败'), `stderr 应留痕，实际：${r.stderr}`);
  assert.equal(callsOf(r, 'comment').length, 1, '重复 publish 仍应追加评论');
  assert.equal(r.mapLines.length, 1, '账本行数应不变');
});

test('glab 缺失：明确警告跳过 exit 0、零调用', () => {
  const r = runAdapter({ kind: 'need', frontmatterStatus: 'confirmed', omitGlab: true });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}`);
  assert.ok(r.stderr.includes('glab 未安装'), `stderr 应点名 glab 缺失，实际：${r.stderr}`);
  assert.equal(r.log.length, 0, '零平台调用');
});

test('glab 未认证：明确警告跳过 exit 0、零调用', () => {
  const r = runAdapter({ kind: 'need', frontmatterStatus: 'confirmed', failAuth: true });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}`);
  assert.ok(r.stderr.includes('未认证'), `stderr 应点名未认证，实际：${r.stderr}`);
  assert.equal(r.log.filter((l) => !l.startsWith('auth')).length, 0, '除认证探测外零调用');
});

test('glab 建单失败：警告跳过不记账 exit 0', () => {
  const r = runAdapter({ kind: 'need', frontmatterStatus: 'confirmed', failCreate: true });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}`);
  assert.ok(r.stderr.includes('创建失败'), `stderr 应说明创建失败，实际：${r.stderr}`);
  assert.equal(r.mapLines.length, 0, '失败不得记账');
});

test('glab 建单输出无法解析编号：警告跳过不记账、文案指明人工核对', () => {
  const r = runAdapter({ kind: 'need', frontmatterStatus: 'confirmed', newNum: 'oops' });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}`);
  assert.ok(r.stderr.includes('无法从 glab 输出解析 issue 编号'), `stderr 应说明解析失败，实际：${r.stderr}`);
  assert.ok(r.stderr.includes('人工核对'), '文案应指明人工核对（单可能已创建）');
  assert.equal(r.mapLines.length, 0, '失败不得记账');
});

test('文件名不符合产物命名：调用错误 exit 1', () => {
  const r = runAdapter({ kind: 'need', frontmatterStatus: 'confirmed', customBase: 'badname.md' });
  assert.equal(r.status, 1, `畸形名应 exit 1，实际 ${r.status}，stderr：${r.stderr}`);
});

test('正文超 60000 字节：截断注记、投影不因超限失败', () => {
  const r = runAdapter({ kind: 'need', frontmatterStatus: 'confirmed', bodyPadBytes: 61000 });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}，stderr：${r.stderr}`);
  const creates = callsOf(r, 'create');
  assert.equal(creates.length, 1, '超限仍应建单');
  const len = descInfoOf(creates[0]).len;
  assert.ok(len < 61000, `正文应被截断（原始 61000+），实际 ${len} 字节`);
  assert.ok(len > 60000, `截断应保留至上限附近，实际 ${len} 字节`);
});

// ── FR-2 知识档评论形态 ──

test('publish 带谱系 spec（need 已映射）：聚合单下追加评论，账本行第二列记需求单单号第三列留空', () => {
  const r = runAdapter({
    kind: 'spec',
    frontmatterStatus: 'draft',
    mapSeed: [`${NEED_REL}\t${NEED_NUM}\t`],
  });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}，stderr：${r.stderr}`);
  assert.equal(callsOf(r, 'create').length, 0, '评论形态不得新建');
  assert.equal(callsOf(r, 'close').length, 0, '评论形态不得关闭（触发面仅 need）');
  const comments = callsOf(r, 'comment');
  assert.equal(comments.length, 1, `应恰一次评论，实际：${JSON.stringify(r.log)}`);
  assert.ok(comments[0].split('\t').includes(NEED_NUM), `评论应挂聚合单 #${NEED_NUM}，实际：${comments[0]}`);
  assert.equal(r.mapLines.length, 2, `账本应为 need 行 + spec 行，实际：${JSON.stringify(r.mapLines)}`);
  const specRow = r.mapLines.find((l) => l.startsWith(SPEC_REL));
  assert.ok(specRow !== undefined, `账本应有 spec 行，实际：${JSON.stringify(r.mapLines)}`);
  assert.equal(specRow.split('\t')[1], NEED_NUM, '知识档行第二列应记承载需求单单号');
  assert.equal(specRow.split('\t')[2], '', '评论形态行第三列应留空');
});

test('publish spec 二次（演进重投）：追加新评论不覆写、不重复记账', () => {
  const r = runAdapter({
    kind: 'spec',
    frontmatterStatus: 'approved',
    mapSeed: [`${NEED_REL}\t${NEED_NUM}\t`, `${SPEC_REL}\t${NEED_NUM}\t`],
  });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}，stderr：${r.stderr}`);
  assert.equal(callsOf(r, 'create').length, 0, '不得新建');
  assert.equal(callsOf(r, 'update').length, 0, '时间线不可变：不得编辑');
  assert.equal(callsOf(r, 'comment').length, 1, '演进重投应追加评论');
  assert.equal(callsOf(r, 'close').length, 0, '知识档终态不触发关闭');
  assert.equal(r.mapLines.length, 2, '账本行数应不变（不重复记账、旧行不回改）');
});

test('publish spec 而账本无其需求单行：警告先投影对应 need、零调用 exit 0', () => {
  const r = runAdapter({ kind: 'spec', frontmatterStatus: 'draft', mapSeed: [] });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}`);
  assert.ok(r.stderr.includes('先投影对应 need'), `stderr 应指明先投影 need，实际：${r.stderr}`);
  assert.equal(r.log.length, 0, '零平台调用');
});

// ── FR-3 过程档评论形态（评审/验收/总览同链）──

for (const kind of ['acceptance', 'review', 'overview'] as const) {
  test(`publish ${kind}（spec 名义归属、定位链成立）：聚合单下追加评论并记账`, () => {
    const r = runAdapter({
      kind,
      frontmatterStatus: 'draft',
      mapSeed: [`${NEED_REL}\t${NEED_NUM}\t`],
      specAnchor: 'lineage',
    });
    assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}，stderr：${r.stderr}`);
    assert.equal(callsOf(r, 'create').length, 0, '过程档评论形态不得新建');
    const comments = callsOf(r, 'comment');
    assert.equal(comments.length, 1, `应恰一次评论，实际：${JSON.stringify(r.log)}`);
    assert.ok(comments[0].split('\t').includes(NEED_NUM), `评论应挂聚合单 #${NEED_NUM}`);
    const fx = FIXTURES[kind];
    const procRow = r.mapLines.find((l) => l.startsWith(`${fx.dir}/${fx.base}`));
    assert.ok(procRow !== undefined, `账本应有 ${kind} 行，实际：${JSON.stringify(r.mapLines)}`);
    assert.equal(procRow.split('\t')[1], NEED_NUM, '过程档评论行第二列应记需求单单号');
  });
}

test('publish 过程档而盘上定位不到其 spec 文件：警告指明缺环 exit 0、零调用', () => {
  const r = runAdapter({ kind: 'review', frontmatterStatus: 'draft', mapSeed: [`${NEED_REL}\t${NEED_NUM}\t`] });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}`);
  assert.ok(r.stderr.includes('找不到'), `stderr 应指明定位缺环，实际：${r.stderr}`);
  assert.equal(r.log.length, 0, '零平台调用');
});

test('publish 过程档所指 spec 为 legacy 无谱系：警告 legacy 链不解析 exit 0、零调用', () => {
  const r = runAdapter({
    kind: 'legacyPrefixProcess',
    frontmatterStatus: 'draft',
    mapSeed: [`${NEED_REL}\t${NEED_NUM}\t`],
    specAnchor: 'legacy',
  });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}`);
  assert.ok(r.stderr.includes('legacy'), `stderr 应说明 legacy 链不解析，实际：${r.stderr}`);
  assert.equal(r.log.length, 0, '零平台调用');
});

test('publish 旧取号过程档（文件名无 spec 前缀）：警告定位链缺环 exit 0、零调用', () => {
  const r = runAdapter({
    kind: 'oldFormatProcess',
    frontmatterStatus: 'draft',
    mapSeed: [`${NEED_REL}\t${NEED_NUM}\t`],
    specAnchor: 'lineage',
  });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}`);
  assert.ok(r.stderr.includes('spec 名义归属前缀'), `stderr 应说明无名义归属前缀，实际：${r.stderr}`);
  assert.equal(r.log.length, 0, '零平台调用');
});

// ── FR-3 票不投 / FR-4 独立知识档 ──

test('publish 票：stderr 说明票不入聚合投影且审计留痕转 commit 引用，零调用零记账', () => {
  const r = runAdapter({ kind: 'ticket', frontmatterStatus: 'ready' });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}，stderr：${r.stderr}`);
  assert.ok(r.stderr.includes('票不入聚合投影'), `stderr 应说明票跳过，实际：${r.stderr}`);
  assert.ok(r.stderr.includes('commit'), `stderr 应说明审计留痕转 commit 引用，实际：${r.stderr}`);
  assert.equal(r.log.length, 0, `零平台调用，实际：${JSON.stringify(r.log)}`);
  assert.equal(r.mapLines.length, 0, '票不得进账本');
});

test('publish 独立知识档（无 need 谱系）：跳过并说明无 need 谱系，零调用', () => {
  const r = runAdapter({ kind: 'research', frontmatterStatus: 'accepted' });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}`);
  assert.ok(r.stderr.includes('无 need 谱系'), `stderr 应说明无谱系跳过，实际：${r.stderr}`);
  assert.equal(r.log.length, 0, '零平台调用');
});

// ── FR-7 旧代际账本共存 ──

test('旧代际知识档行（第二列=旧自身单号）重投：定位恒走需求单行，旧行不回改', () => {
  const r = runAdapter({
    kind: 'spec',
    frontmatterStatus: 'approved',
    mapSeed: [`${NEED_REL}\t${NEED_NUM}\t`, `${SPEC_REL}\t99\t`],
  });
  assert.equal(r.status, 0, `应 exit 0，实际 ${r.status}，stderr：${r.stderr}`);
  const comments = callsOf(r, 'comment');
  assert.equal(comments.length, 1, '应追加评论');
  assert.ok(comments[0].split('\t').includes(NEED_NUM), `评论应落聚合单 #${NEED_NUM}（非旧单 99），实际：${comments[0]}`);
  assert.equal(r.mapLines.length, 2, '不得新增或回改账本行');
  const oldRow = r.mapLines.find((l) => l.startsWith(SPEC_REL));
  assert.equal(oldRow?.split('\t')[1], '99', '旧代际行第二列应原样保留');
});
