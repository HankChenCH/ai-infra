// pre-push 门对已验收清扫工单引用的放行测试（fix 票 20261122-e00b，名义归属 spec 0011）。
//
// 缺陷现场：验收 passed 清扫删除票文件后，trunk 直推推送提交中的 [#票ID] 引用经
// cmd_pre_push 反查 docs/tickets/ 落空 →「工单不存在」拒推（61d2 同族边界：
// 过程档生命周期终点缺出口）。期望：引用反查落空时回退查 tracker 映射持久记账
// （*.map，票投影过即有行；先例同源：cmd_claim 历史号检查）——命中 = 曾交付已清扫
// → 放行留痕；未命中（幽灵引用）维持拒绝。期望值独立来源 = 票 20261122-e00b
// 「做什么」字面契约，不由实现推导。
//
// seam = check.sh pre-push 的进程级外部行为（临时 git 夹具仓 + 伪造 origin 引用），
// 不 mock 内部协作者。真实链路（真实 hook 触发、真实平台 push）由集成级人工段背书。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CHECK = path.join(packageRoot, '.sdlc', 'check.sh');
const TICKET_ID = '20261122-e00b';
const TICKET_REL = `docs/tickets/spec0011-${TICKET_ID}-prepush-swept-ref-map-fallback.md`;

function git(root: string, ...args: string[]): string {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf-8' }).trim();
}

interface Fixture {
  root: string;
  cleanup(): void;
}

/** 最小夹具仓：main 两笔提交（base→head，head 引用已清扫票）+ origin 引用落在 base。 */
function makeFixture(opts: { mapWithTicket: boolean }): Fixture {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'prepush-swept-')));
  const g = (...a: string[]) => git(root, ...a);
  g('init', '-q', '-b', 'main');
  g('config', 'user.email', 'test@example.com');
  g('config', 'user.name', 'tester');
  fs.mkdirSync(path.join(root, '.sdlc', 'trackers'), { recursive: true });
  fs.copyFileSync(CHECK, path.join(root, '.sdlc', 'check.sh'));
  fs.chmodSync(path.join(root, '.sdlc', 'check.sh'), 0o755);
  fs.writeFileSync(path.join(root, '.sdlc', 'config.sh'), 'BASE_REF=main\nTRACKER=local\n');
  const mapRows = opts.mapWithTicket
    ? `${TICKET_REL}\t999\thttps://example.test/issues/999\n`
    : '';
  fs.writeFileSync(path.join(root, '.sdlc', 'trackers', 'github.map'), mapRows);
  fs.writeFileSync(path.join(root, 'README.md'), '# fixture\n');
  g('add', '-A');
  g('commit', '-qm', 'init');
  const baseRev = g('rev-parse', 'HEAD');
  fs.writeFileSync(path.join(root, 'notes.txt'), `交付改动（票已随验收清扫删除）：${TICKET_ID}\n`);
  g('add', '-A');
  g('commit', '-qm', `[#${TICKET_ID}] 交付已完成并验收清扫的改动`);
  // 伪造 origin 引用落在 base → trunk 直推领先态（不触网）
  g('update-ref', `refs/remotes/origin/main`, baseRev);
  return {
    root,
    cleanup() {
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

function runPrePush(root: string): { status: number; output: string } {
  try {
    const out = execFileSync('bash', [path.join(root, '.sdlc', 'check.sh'), 'pre-push'], {
      cwd: root,
      input: '',
      encoding: 'utf-8',
    });
    return { status: 0, output: out };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    return { status: err.status ?? 1, output: (err.stdout ?? '') + (err.stderr ?? '') };
  }
}

test('已清扫票的引用（tracker 记账在场）：pre-push 放行并留痕', () => {
  const fx = makeFixture({ mapWithTicket: true });
  try {
    const r = runPrePush(fx.root);
    assert.equal(r.status, 0, `应放行 rc=0，实际输出：${r.output}`);
    assert.ok(
      r.output.includes(`${TICKET_ID}`) && r.output.includes('已交付已清扫'),
      `应留痕放行该票，实际输出：${r.output}`,
    );
  } finally {
    fx.cleanup();
  }
});

test('幽灵引用（tracker 记账不在）：pre-push 维持拒绝', () => {
  const fx = makeFixture({ mapWithTicket: false });
  try {
    const r = runPrePush(fx.root);
    assert.equal(r.status, 1, `幽灵引用应 rc=1 拒绝，实际 ${r.status}：${r.output}`);
    assert.ok(r.output.includes('不存在') && r.output.includes('tracker 记账亦未命中'),
      `应报不存在且记账未命中，实际：${r.output}`);
  } finally {
    fx.cleanup();
  }
});

test('谱系行子串短号幽灵（他票 id 的子串）：不误放行，维持拒绝', () => {
  const fx = makeFixture({ mapWithTicket: true });
  try {
    // map 行含真票 spec0011-20261122-e00b-…；幽灵引用取其 id 段子串「e00」（3 位截断），
    // 旧模式 docs/tickets/.*$d 会子串命中被误放行，锚定文法必须仍拒绝
    fs.appendFileSync(
      path.join(fx.root, '.sdlc', 'trackers', 'github.map'),
      'docs/tickets/spec0011-20261122-e00b-prepush-swept-ref-map-fallback.md\t999\thttps://example.test/issues/999\n',
    );
    execFileSync('git', ['-C', fx.root, 'add', '-A'], { encoding: 'utf-8' });
    // [#20261122-e00] 可被 commit_refs 提取（-e00 全属 [0-9a-f]）但 ref_key 拒规整原样出列，
    // 且在锚定文法下是「spec0011- 前缀后 id 段的截断子串」——专钉子串误放行
    execFileSync('git', ['-C', fx.root, 'commit', '-qm', '[#20261122-e00] 幽灵截断引用（3 位 hex 尾，ref_key 拒规整原样出列）'], { encoding: 'utf-8' });
    const r = runPrePush(fx.root);
    assert.equal(r.status, 1, `短号幽灵应 rc=1 拒绝，实际 ${r.status}：${r.output}`);
    assert.ok(r.output.includes('不存在'), `应报不存在，实际：${r.output}`);
  } finally {
    fx.cleanup();
  }
});

test('无 *.map 记账文件：维持拒绝（fail-closed）', () => {
  const fx = makeFixture({ mapWithTicket: false });
  try {
    fs.rmSync(path.join(fx.root, '.sdlc', 'trackers', 'github.map'));
    const r = runPrePush(fx.root);
    assert.equal(r.status, 1, `无记账应 rc=1 拒绝，实际 ${r.status}：${r.output}`);
    assert.ok(r.output.includes('不存在'), `应报不存在，实际：${r.output}`);
  } finally {
    fx.cleanup();
  }
});
