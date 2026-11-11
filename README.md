# TH18 阵型设计实验室｜Clash of Clans Formation Design

[![Geometry and Draft Checks](https://github.com/Zhuozhuo-219/clash-of-clans-formation-design/actions/workflows/check-layouts.yml/badge.svg)](https://github.com/Zhuozhuo-219/clash-of-clans-formation-design/actions/workflows/check-layouts.yml)

面向《部落冲突》中国大陆（腾讯）服务器的 **18 本家乡阵型设计研究项目**。当前版本 v0.2.0，目标是把可交互的 44×44 菱形网格、实时下兵边界、可信的建筑占地数据和**外部模型（ChatGPT 等）生成初版阵型的工具接口**连接起来。非官方项目；现阶段不包含高精度战斗模拟，也不会生成游戏客户端可直接导入的阵型链接。

> 数据基线仍为 2026-11-10（TH18），于 2026-11-11 更新占地几何：**大本营、兵营（Army Camp）、英雄殿堂、攻城机器工坊均为 4×4**。兵营和工坊曾使用过 5×5 旧数据，已修正。**训练营（Barracks）是 3×3**。其余国服攻击数值仍有未验证部分，请参见质量报告。

## 1. 启动交互编辑器

无需安装 npm 依赖。由于使用 ES Modules，需要一个**静态文件服务器**，不能只双击 `index.html`：

```bash
git clone https://github.com/Zhuozhuo-219/clash-of-clans-formation-design.git
cd clash-of-clans-formation-design
python3 -m http.server 8080
```

浏览器打开 `http://localhost:8080/`。也可以在 GitHub 仓库 **Settings → Pages** 选择从 `main` 分支根目录部署（需要拥有者开启 GitHub Pages）。

支持建筑搜索、占格冲突检测、菱形与俯视图切换、城墙绘制、陷阱/特斯拉差异化禁区、内部可下兵空洞检测、移动/撤销、截图、JSON 导入导出、模型草案粘贴与校验。

## 2. 利用 ChatGPT 生成一个可验证的初版骨架

让已经连接本 GitHub 仓库的 ChatGPT 阅读以下文件：

- [`data/catalog.json`](data/catalog.json) — 建筑类型、占地尺寸、数量、是否产生下兵禁区
- [`schemas/coc-th18-draft-v1.schema.json`](schemas/coc-th18-draft-v1.schema.json) — 机器可读草案格式
- [`docs/model-prompt.md`](docs/model-prompt.md) — 自然语言提示词模板
- [`examples/llm_draft.json`](examples/llm_draft.json) — 一个可以工作的具体示例

ChatGPT 根据你的要求输出草案（这里仅举两座建筑，实际可添加更多）：

```json
{
  "format": "coc-th18-draft-v1",
  "description": "18本偏置核心、分散防空的初步骨架",
  "grid": {"width": 44, "height": 44},
  "placements": [
    {"id": "town_hall", "x": 19, "y": 19},
    {"id": "hero_hall", "x": 9, "y": 20}
  ],
  "autoFill": [{"id": "air_defense", "count": 4, "region": "distributed", "minSeparation": 12}]
}
```

将 JSON 粘贴到编辑器侧栏的**模型草案接口**，点击「校验草案」，有效后「应用草案」。或者通过仓库/本地工具：

```bash
node scripts/layout-cli.mjs catalog
node scripts/layout-cli.mjs validate examples/llm_draft.json
node scripts/layout-cli.mjs materialize examples/llm_draft.json layouts/llm_example.json
```

生成的布局可再导入编辑器作可视化调整。ChatGPT 也可通过 GitHub 连接器将草案提交为 `drafts/xxx.json`；GitHub Actions 会在提交或 PR 时运行几何回归测试。**并没有在浏览器里嵌入任何模型密钥或偷偷调用付费 API**。模型理解自然语言、提出布局意图；本地工具是位置合法性的最终判定方。

`autoFill` 只是可复现的矩形放置、区域偏好与同类间距启发式，**并不是战斗AI或防三星优化器**。需经玩家检查和国服实战回放验证。

## 3. 技术架构

```text
index.html                         HTML壳
src/styles.css                     样式
src/main.js                        Canvas和UI控制器
src/catalog.generated.mjs          从data/catalog.json生成的模块
src/topology.mjs                   44×44占格/一格禁下兵区/空洞拓扑
src/layout-contract.mjs            统一JSON校验、导出与协议升级
src/fill-engine.mjs                确定性初版建筑补位
src/samples.mjs                    模型草案样例
scripts/layout-cli.mjs             模型工具调用的命令行入口
scripts/validate-all.mjs           批量验证drafts/和layouts/
scripts/sync-catalog.mjs           更新生成的前端目录
schemas/                           模型JSON Schema
examples/                          演示草案及原型布局
layouts/                           机器校验后生成的布局
drafts/                            外部模型输出草案
.github/workflows/check-layouts.yml  GitHub CI
```

为什么当前不强制使用 React/Vite？将游戏规则、模型协议与UI框架解耦优先级更高。原生 ES Modules 已是模块化源码、可直接作为静态站点发布、Node 工具零依赖；以后可以单独把编辑器控制器迁移为 React 组件。完整说明见 [`docs/architecture.md`](docs/architecture.md)。

## 4. 测试与同步

```bash
npm test                               # 核心几何、数据一致性、草案协议测试
npm run test:all-layouts              # 校验layouts与drafts的JSON文件
python3 tests/test_canvas_layout.py   # Chromium页面回归，需要Playwright
npm run sync:catalog                   # 修改data/catalog.json后运行
```

注意：浏览器回归测试在受限CI沙盒会暂时拼装内联测试版本（避免无法导航本地文件），生产代码仍是原生模块。CI 不强制下载大型浏览器依赖。

## 5. 数据出处及风险边界

- [`data/coc_th18_cn_2026-11-10.json`](data/coc_th18_cn_2026-11-10.json) ：205类条目的18本研究数据，已包含2026-11-11几何纠错说明
- [`data/th18_data_quality_report.json`](data/th18_data_quality_report.json)：冲突、不确定字段和待核验项
- [`docs/TH18_CN_数据说明与核实清单.md`](docs/TH18_CN_数据说明与核实清单.md)：18本数据说明
- [`docs/topology_spec.md`](docs/topology_spec.md)：白色下兵线、陷阱与隐藏特斯拉的占位拓扑

地图是 **44×44** 格，软件坐标采用左上原点 x 向右、y 向下。普通建筑和城墙的禁下兵区按外扩一格方形范围并集计算；陷阱与隐藏特斯拉不扩展该禁区。**这些是尚待国服客户端边缘机制实测的研究假设**，不能冒充游戏服务器权威判定。

建筑历史缩小尺寸的官方依据：[Supercell 2019 December Update Patch Notes](https://supercell.com/en/games/clashofclans/blog/news/december-update-patch-notes/)；2026年兵营尺寸参考：[Goblins Farm Army Camp](https://goblinsfarm.com/wiki/buildings/army-camp.html)；英雄殿堂：[GiBiArena Hero Hall](https://www.gibiarena.com/en/clash-of-clans/upgrades/hero-hall)。

## License

尚未确定开源许可证。请勿在未获授权的情况下加入 Supercell / 腾讯素材、游戏客户端文件或私人账号数据。
