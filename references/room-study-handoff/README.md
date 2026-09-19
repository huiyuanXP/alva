# Room Study · 交互式全屋 3D 原型

本目录是一个完整可下载的项目包，用于复现“二维住宅平面图 → 浏览器实时 3D 空间体验”的当前原型。

## 快速开始

最简单的方法：直接打开：

```text
room-study-standalone.html
```

它已经内嵌 CSS、JavaScript 和原始平面图，不需要构建工具或网络依赖。

多文件开发版可以直接打开 `index.html`。如浏览器限制本地文件，也可在目录中运行：

```bash
python3 -m http.server 8080
```

然后访问：

```text
http://127.0.0.1:8080/
```

## 重新生成单文件版

```bash
python3 build_standalone.py
```

## 项目结构

```text
room-study-handoff/
├── README.md
├── HANDOFF.md
├── index.html
├── room-study-standalone.html
├── styles.css
├── build_standalone.py
├── public/
│   └── floorplan.png
├── src/
│   ├── math.js
│   ├── model.js
│   ├── renderer.js
│   └── app.js
├── docs/
│   ├── FEATURES.md
│   └── IMPLEMENTATION.md
├── references/
│   └── assistant-ui-design.md
└── tests/
    ├── smoke.py
    └── validation-report.txt
```

## 重要边界

- 当前模型是根据无尺寸平面图进行的体验重建。
- 不是施工图、BIM、结构判断或精确日照分析工具。
- 3D 引擎为原生 WebGL 2，不是 Unreal Engine。
- 家具是基础几何预览模型。
- 当前包不包含业务后端、Agent 集成或数据库。

继续开发前请先阅读 `HANDOFF.md`。
