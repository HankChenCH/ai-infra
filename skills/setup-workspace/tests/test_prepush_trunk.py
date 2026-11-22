# pre-push trunk 直推形态行为用例（fix 票 20261122-61d2）。
#
# 既有 pre-push 用例（legacy_stream.py pre-push 组）全部工作在分支流形态
# （HEAD 领先 refs/heads/main，HEAD≠base）；主干直推形态（HEAD == BASE_REF）
# 由本文件补齐：该形态下 merge-base 退化为 HEAD 本身、mb..HEAD 恒空集，修复前
# 门输出「无领先提交」空转放行（受控复现实证，见票正文）。
#
# 夹具：build_fixture_repo 本地 main + 本地 bare 仓库充当 origin（纯本地操作
# 不碰网络），push 后本地领先构成 trunk 直推实态。既有用例无 origin，修复后
# 兜底链对 origin 缺失仓库行为不变（subjects 仍空 → 照常通过），STREAM 快照
# 流不受本修复影响。
#
# 期望值来自票①验收标准与门语义字面（警告/拒绝文案取 cmd_pre_push 既有输出），
# 不由实现推导。不进 STREAM：冻结快照流按旧套件运行序回放，新用例独立成文件。

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from conftest import build_fixture_repo

TICKET_TEMPLATE = """---
id: {tid}
status: implemented
---
# {tid}: coupon
"""


def _git(root: Path, *args: str) -> None:
    subprocess.run(
        ["git", "-C", str(root), *args],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def _prepush(root: Path) -> tuple[int, str]:
    """跑夹具内 check.sh pre-push；stdin 接 /dev/null（git hook 调用时为 EOF 型，
    cmd_pre_push 的 cat >/dev/null 消费行立即读到 EOF）。"""
    proc = subprocess.run(
        ["bash", ".sdlc/check.sh", "pre-push"],
        cwd=root, capture_output=True, text=True,
        encoding="utf-8", errors="surrogateescape", stdin=subprocess.DEVNULL,
    )
    return proc.returncode, proc.stdout + proc.stderr


@pytest.fixture()
def trunk_repo(tmp_path: Path) -> Path:
    """主干直推夹具：本地 main 与 origin/main 同步起步。"""
    root = tmp_path / "trunk-fixture"
    build_fixture_repo(root)
    origin = tmp_path / "origin.git"
    subprocess.run(["git", "init", "-q", "--bare", str(origin)], check=True)
    _git(root, "remote", "add", "origin", str(origin))
    _git(root, "push", "-q", "origin", "main")
    return root


def _commit_ahead(root: Path, message: str) -> None:
    (root / "f.txt").write_text("x\n", encoding="utf-8")
    _git(root, "add", "f.txt")
    _git(root, "commit", "-qm", message)


def test_trunk_push_unreferenced_commit_warns_not_blind(trunk_repo: Path):
    """主干直推领先无工单引用提交 → 绕门警告放行，而非「无领先提交」空转。"""
    _commit_ahead(trunk_repo, "no ref commit")
    rc, out = _prepush(trunk_repo)
    assert rc == 0, f"退出码 {rc}，期望 0（警告放行）\n输出：\n{out}"
    assert "未引用任何工单" in out, f"主干直推被空转放行（预期绕门警告），输出：\n{out}"
    assert "无领先提交" not in out, f"门仍报告无领先提交（空转未修），输出：\n{out}"


def test_trunk_push_implemented_without_review_rejected(trunk_repo: Path):
    """主干直推领先 implemented 无 approved 评审提交 → 拒绝，而非空转放行。"""
    tickets = trunk_repo / "docs" / "tickets"
    tickets.mkdir(parents=True)
    (tickets / "0002-coupon.md").write_text(
        TICKET_TEMPLATE.format(tid="0002"), encoding="utf-8"
    )
    _commit_ahead(trunk_repo, "[#0002] coupon")
    rc, out = _prepush(trunk_repo)
    assert rc == 1, f"退出码 {rc}，期望 1（评审覆盖缺失拒绝）\n输出：\n{out}"
    assert "评审覆盖" in out, f"主干直推绕过评审覆盖校验，输出：\n{out}"


def test_trunk_push_up_to_date_still_passes(trunk_repo: Path):
    """真无领先（本地 main == origin/main）→ 空集语义保持，照常通过。"""
    rc, out = _prepush(trunk_repo)
    assert rc == 0, f"退出码 {rc}，期望 0\n输出：\n{out}"
    assert "无领先提交" in out, f"输出：\n{out}"
