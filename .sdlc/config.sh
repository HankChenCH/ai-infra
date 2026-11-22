# SDLC 流程配置（本文件归用户所有；setup-workspace 重跑绝不覆盖）
TRACKER=github
TRACKER_REPO="HankChenCH/ai-infra"
BASE_REF=main
RUN_ENV=
RUN_PREFIX=""
PKG_MGR=
CODE_DIRS=

CHECK_LINT=""
# tsc --noEmit（pnpm run typecheck；tsconfig include 覆盖 src/bin/scripts/test/agents）
CHECK_TYPE="pnpm run typecheck"
# pytest（setup-workspace 套件）+ node 单测（unit 面；e2e 需 node≥24.9 与 registry，留 CI/regression-gate）。
# 前提：unit 的 plugin-install 前置门测试在 node<24.9 环境红（票面见评审 20261122-4475 范围外备注，
# 前置门修复随 fix 票落实后本行在 node22 环境亦绿）
CHECK_TEST="uv run --project skills/setup-workspace/tests pytest skills/setup-workspace/tests && pnpm run test:unit"
