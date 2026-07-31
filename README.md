# Hyeto

[![License](https://img.shields.io/badge/license-PolyForm_Noncommercial_1.0.0-4c4c4c)](LICENSE)

Hyeto 把 00:00–24:00 的 25 个逐时降雨数据点转化为实时 Three.js/WebGL 粒子雨景。用户可以拖动降雨曲线，让雨幕、峰值瀑布、水面波纹、坐标轴与雨声随数据同步变化。

Hyeto turns 25 hourly rainfall values from 00:00–24:00 into an interactive Three.js/WebGL landscape. Editing the curve reshapes the rain curtain, peak waterfall, water ripples, axis system and rain audio in real time.

> **源码许可 / Source terms:** 源码仅授权非商业学习、修改与分发；禁止商业使用、商业产品集成、广告和品牌项目。Source is available for noncommercial use only and is not OSI-approved open-source software. See [LICENSE](LICENSE) and [COMMERCIAL_USE.md](COMMERCIAL_USE.md).

> **出处 / Attribution:** Hyeto 的雨景可视化衍生自 afterimage 的 Rainform / 数据成雨，并沿用同一份非商业许可。Hyeto is a noncommercial derivative work — the rain visualization comes from Rainform / 数据成雨 by afterimage (<https://rainform.pages.dev/>). Hyeto 不是 Rainform 的官方版本，也未获得其背书。

## 运行环境 / Runtime

- Best experienced in a desktop browser with WebGL2 and hardware acceleration
- Mobile devices require landscape orientation
- Sound is off by default and can be enabled from the toolbar

## 功能 / Highlights

- 25 个逐时降雨数据点与实时可拖拽曲线 / 25 hourly rainfall values with a live draggable curve
- 数据驱动的粒子雨幕、峰值瀑布、水面波纹、坐标轴与雨声 / Data-driven rain, waterfall, water, axes and sound
- 桌面端视角拖拽、双击重置、声音切换与精确数据输入 / Desktop camera, reset, sound and precise editing
- 移动端横屏适配、安全区域与方向切换恢复 / Mobile landscape, safe-area and orientation recovery
- 中英文界面 / Chinese and English interface
- 可加载真实降雨数据：今日实时或 1940 年以来任意历史日期，数据来自 Open-Meteo 约 11 公里分辨率的网格化预报与再分析产品（并非地面观测站数据，坐标会吸附至最近的模型网格点）/ Load real precipitation: today's live reading or any historical day back to 1940, sourced from Open-Meteo's gridded ~11 km forecast and reanalysis output (not station observations — coordinates snap to the nearest model grid point)

## 本地开发 / Development

Requirements: Node.js 20 or newer.

```bash
npm ci
npm run dev
```

## 构建 / Build

```bash
npm run check
npm run preview
```

`npm run check` validates the Chinese/English interface and production build. Contributor validation requirements are documented in [CONTRIBUTING.md](CONTRIBUTING.md).

## 项目结构 / Structure

```text
.
├── index.html              # Application shell, metadata and controls
├── src/
│   ├── bootstrap.js        # Locale, mobile gate and deferred startup
│   ├── main.js             # Three.js scene, data model and interactions
│   └── styles.css          # Responsive application styles
├── public/                 # Runtime assets and hosting headers
├── scripts/                # Validation and maintainer media tools
├── docs/                   # Architecture, licensing and integration policy
└── .github/                # Dependency updates and contribution templates
```

## 使用与许可 / Usage and license

Noncommercial study, modification and redistribution are permitted under the [PolyForm Noncommercial License 1.0.0](LICENSE). Every copy or derived work — including Hyeto itself — must retain:

```text
Required Notice: Rainform / 数据成雨 © 2026 afterimage — https://rainform.pages.dev/
```

Attribution alone does not make commercial use permissible. Work from this source repository, preserve the license and notice, and read the [integration policy](docs/INTEGRATION.md) before combining Hyeto with another project.

The source license does not grant rights to use the Rainform / 数据成雨 name, logo or visual identity as another product's branding, and the same applies to Hyeto's own name. See [TRADEMARKS.md](TRADEMARKS.md).

Hyeto modifications copyright © 2026 JavaLyHn. Underlying rain visualization copyright © 2026 afterimage.

## 项目文档 / Project documentation

- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Contribution guide: [CONTRIBUTING.md](CONTRIBUTING.md)
- Security reports: [SECURITY.md](SECURITY.md)
- Release history: [CHANGELOG.md](CHANGELOG.md)
- Third-party notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
