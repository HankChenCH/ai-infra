// dsh-mcp 发布态 files 清单覆盖源码态声明资产的外部可观察行为（seam 落点：scripts/prepack.ts
// 真跑后的打包清单，探针形态比照 plugin-prepack-diagnostics.test.ts）。票 20261122-6b28：
// PUBLISHED_FILES 硬编码白名单在打包时整体覆写 files——源码态新声明的资产条目（img/，README
// 引用的截图）被静默丢弃，装出去的包在 dsh 介绍页图片 404（诊断实测：端点对安装目录直读，
// 缺文件即 404；相对路径渲染链路本身完好）。
// 期望值独立来源 = 仓库态 package.json 的 files 声明（npm 白名单外文件不随包分发是 npm 语义，
// 声明即分发承诺）；探针零副作用，t.after 清理。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PLUGIN_DIR = path.join(packageRoot, 'agents', 'dsh', 'plugins', 'dsh-mcp');
const PROBE_COPY_FILES = ['index.ts', 'package.json', 'cordis.patch.yml'];
const PROBE_COPY_DIRS = ['client', 'scripts'];

test('发布态 files 清单覆盖源码态声明的发布物（img 随包，README 引用不落空）', (t) => {
  const probe = path.join(packageRoot, `zz-release-probe-${process.pid}`);
  fs.mkdirSync(probe, { recursive: true });
  for (const file of PROBE_COPY_FILES) {
    fs.copyFileSync(path.join(PLUGIN_DIR, file), path.join(probe, file));
  }
  for (const dir of PROBE_COPY_DIRS) {
    fs.cpSync(path.join(PLUGIN_DIR, dir), path.join(probe, dir), { recursive: true });
  }
  // index.ts 的 type-only import（@deepseek-ai/dsh-mcp-manager）经插件自带 node_modules 解析
  // （真实 prepack 即此环境）；链接而非拷贝，rmSync 清理时对 symlink 只 unlink 不穿透
  fs.symlinkSync(path.join(PLUGIN_DIR, 'node_modules'), path.join(probe, 'node_modules'), 'dir');
  const declared = JSON.parse(fs.readFileSync(path.join(probe, 'package.json'), 'utf8')).files as string[];
  const declaredAssets = declared.filter((entry) => entry !== 'index.ts' && entry !== 'client');
  t.after(() => fs.rmSync(probe, { recursive: true, force: true }));

  const result = spawnSync(process.execPath, [path.join(probe, 'scripts', 'prepack.ts')], {
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, `prepack 应成功完成，实际退出 ${result.status}：${result.stderr}`);
  const published = JSON.parse(fs.readFileSync(path.join(probe, 'package.json'), 'utf8'));
  // 换载确已发生（发布态 main 指 .js），排除「清单没被动到所以 img 恰好还在」的假绿
  assert.equal(published.main, 'index.js', `清单应已换载发布态，实际 main：${String(published.main)}`);
  for (const asset of declaredAssets) {
    assert.ok(
      published.files?.includes(asset),
      `发布态 files 须含源码态声明的资产 "${asset}"（README 引用的文件不随包 = dsh 介绍页裂图），实际：${JSON.stringify(published.files)}`,
    );
  }
});
