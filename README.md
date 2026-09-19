# alva

业主通过Chat整理生活需求、校准户型、预览确认修改，再导出设计师可编辑的同版本交付。

当前为已验证的旧模块复用基线与新项目开发中状态，完整alva尚未发布。恢复入口：[CURRENT.md](CURRENT.md)。规格[SPEC.md](SPEC.md)，范围[SCOPE.md](SCOPE.md)，验证[ACCEPTANCE.md](ACCEPTANCE.md)。

当前复跑：`npm ci --ignore-scripts`、`npm run check`、`npm run build:web`、`python3 scripts/baseline-tests.py`。媒体测试前运行`python3 scripts/prepare-media-fixtures.py --output .runtime/fixtures`。后续新业务启动入口会随ALVA-001落地。
