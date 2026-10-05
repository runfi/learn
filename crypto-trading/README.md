# 币圈短线实战课

BTC / ETH 永续合约短波段的自编实战课：按“问题”学指标，每课给自己的交易系统加一个零件（v0.1 → v0.7），边学边模拟。

- `ct-index.html` — 学习地图（阶段 0–3 共 16 课 + 实战循环与量化下一程）
- `ct-journal.html` — 工具页：交易日志模板 v0（配合第 1 课模拟任务，字段随课程升级）
- `ct-l01.html` — 第 1 课 合约怎么运作
- `ct-l02.html` — 第 2 课 K 线与周期
- `ct-l03.html` — 第 3 课 风险、仓位与事件日历
- `ct-l04.html` — 第 4 课 现在往哪走（系统 v0.1）
- `ct-l05.html` — 第 5 课 涨过头了吗（系统 v0.2）
- `ct-l06.html` — 第 6 课 价格平时晃多大（系统 v0.3）
- `ct-l07.html` — 第 7 课 趋势市还是震荡市（系统 v0.4）
- `ct-l08.html` — 第 8 课 关键价位在哪（系统 v0.5）
- `ct-l09.html` — 第 9 课 有多少人在参与（系统 v0.6）
- `ct-l10.html` — 第 10 课 合约里的人在干什么（系统 v0.7）
- `ct-l11.html` — 第 11 课 宏观链条：利率、美元与流动性
- `ct-l12.html` — 第 12 课 币圈自身的驱动
- `ct-l13.html` — 第 13 课 宏观事件复盘
- `assets/` — 全站共用资源：
  - `ct.css`、`ct.js`（主题与涨跌配色切换）、`ctchart.js`（图表封装，数据注册 `CT.reg`）
  - `lightweight-charts.js`（TradingView Lightweight Charts v5.2.1 官方 standalone 版，Apache-2.0，许可证见 `LICENSE-lightweight-charts.txt`）
  - `data/`：币安 K 线（`klines-*`）、标记价格（`mark-*`）、资金费率（`funding-*`）、持仓量（`oi-*`）、合约指标（`metrics-*`）与 FRED 宏观数据（`fred-*`），每个文件为 `CT.reg("名称", [...])` 包裹的纯数据

从 `ct-index.html` 打开即可跳转各课讲义。
