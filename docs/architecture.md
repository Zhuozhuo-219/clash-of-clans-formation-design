# TH18 模块化编辑器与外部模型生成接口（v0.2）

## 目标与边界

平台用于**18本家乡村庄**的建筑占位、下兵线几何和基于自然语言的阵型草案的可检验输入。**不实现**完整兵种 AI、精准伤害模拟，也不能直接把 JSON 导入腾讯国服客户端。地形可建设 mask、真实游戏边界规则以及国服参数仍存在待验证项。

## 模块划分

```text
index.html                   HTML 结构，不包含内联业务 JS/CSS
src/styles.css               样式
src/main.js                  Canvas/UI 事件编排、编辑、导入导出、撤销和存档
src/catalog.generated.mjs    浏览器直接导入的目录（通过 scripts/sync-catalog.mjs 从 JSON 生成）
src/topology.mjs             核心占格/禁下兵区/连通域，浏览器与 Node 都直接导入的纯 ES Module
src/layout-contract.mjs      外部草案/旧阵型接收、严格合法性校验、标准化导出
src/fill-engine.mjs          确定性初始补位：仅矩形不重叠与位置偏好，不是防三星优化器
src/samples.mjs              编辑器中用于教学的演示草案
scripts/layout-cli.mjs       外部模型可以通过工具运行的 CLI 入口
schemas/*                    草案 JSON Schema，供模型结构化输出
```

原先全部放在单个 HTML 的 UI 逻辑已搬进模块。当前 `src/main.js` 仍同时承担画布渲染与部分 UI 事件，是下一轮最适合细分 `renderer / controller / store` 的地方。本阶段优先稳定跨模型的数据边界和可验证可运行性。

## ChatGPT → GitHub → 编辑器的推荐调用链

1. ChatGPT 通过连接的 GitHub 获取 `data/catalog.json`、`schemas/coc-th18-draft-v1.schema.json` 和示例。
2. 用户自然语言表达“偏置大本营、四座防空分散、保留中央禁下兵区”等目标，ChatGPT 输出 `coc-th18-draft-v1` JSON 文件（只给出明确的 `placements`，可以指定少量 `autoFill`）。
3. 将草案提交到仓库 `drafts/xxx.json`（需要通过 GitHub app 已获授权；不得在网页中保存 GitHub 或大模型密钥）。
4. 通过本地或 CI 命令 `node scripts/layout-cli.mjs validate drafts/xxx.json` 进行硬约束检查。
5. 运行 `node scripts/layout-cli.mjs materialize drafts/xxx.json layouts/xxx.json` 生成可编辑布局；用户在编辑器内导入 JSON，或直接在侧栏粘贴草案，继续手动优化。
6. 迭代调整时仍生成一个新的 JSON 快照，不直接覆盖未经确认的阵型。

**模型只能提出意图及候选几何，不是放置规则的最终裁判**。硬约束由拓扑与目录数据执行，软约束由人审/回放验证。

## 数据规范

`placements` 为左上角原点的占位坐标，x 向右、y 向下。实体尺寸从 `data/catalog.json` 查询，绝不由模型自报。`Town Hall / Army Camp / Hero Hall / Workshop` 均为4×4。对象不可重叠、不可出44×44、同类不超过最大数量。陷阱/特斯拉占位但不扩展下兵禁区。静态一格禁区仅为研究模型。

`autoFill` 采用可复现的网格候选打分，按区域偏好和同类建筑距离逐一放置；**不可代表阵型优劣，不保证对任何流派有防御力**。城墙与剩余建筑填满需要进一步人工设计。

## 为什么暂时不依赖 React/Vite？

这一阶段的模块已经可通过原生 ES Modules 在浏览器运行，且 `node` 工具无需安装第三方包；可直接部署为 GitHub Pages 静态站点。引入 React/Vite 只是未来 UI 组件演化，不应把模型接口和数值校验绑死在某个 UI 技术栈里。

## 测试

```bash
npm test
python3 -m http.server 8080
# 另一个终端：python3 tests/test_canvas_layout.py (需要 playwright 和 Chromium)
```
