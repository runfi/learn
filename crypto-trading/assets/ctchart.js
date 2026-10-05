/* 币圈短线实战课 · 图表与指标库
   依赖：lightweight-charts.js（TradingView Lightweight Charts™ v5，已本地化）在本文件之前加载。
   数据：assets/data/*.js 用 CT.reg(name, rows) 注册，行格式：
     klines / mark：[t秒, o, h, l, c, v, 成交额]
     funding：[t秒, 费率小数]    metrics：[t秒, OI币, OI价值, 大户多空比, 全体多空比, 主动买卖比]
   指标函数输入统一为 K 线行数组，输出 [{time, value}]（对齐时间，预热期自动跳过）。 */
(function(){
  'use strict';
  var CT = window.CT = window.CT || {};
  CT.data = CT.data || {};
  CT.reg = function(name, rows){ CT.data[name] = rows; };
  CT.get = function(name){
    if(!CT.data[name]) throw new Error('数据未加载：' + name + '（检查 data 脚本引用）');
    return CT.data[name];
  };

  /* ---------- 小工具 ---------- */
  function cssVar(name){
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  /* 主题色：每次取用时现读 CSS 变量，保证深浅主题 / 红绿切换后拿到新值 */
  CT.pal = function(){
    return {
      up: cssVar('--up'), down: cssVar('--down'),
      upSoft: cssVar('--up-soft'), downSoft: cssVar('--down-soft'),
      ink: cssVar('--ink'), ink2: cssVar('--ink-2'), muted: cssVar('--muted'),
      line: cssVar('--line'), line2: cssVar('--line-2'),
      accent: cssVar('--accent'), accentSoft: cssVar('--accent-soft'),
      series: cssVar('--series'), series2: cssVar('--series2'),
      series3: cssVar('--series3'), series4: cssVar('--series4'),
      crit: cssVar('--crit'), surface: cssVar('--surface')
    };
  };
  function tok(c, pal){ return pal[c] !== undefined ? pal[c] : c; }  // 'up' → 颜色；'#abc' 原样

  /* Lightweight Charts 按 UTC 渲染时间戳；统一把秒级时间平移到本地时区，
     让轴和十字光标显示本地时间（北京 = UTC+8）。所有行数据 → 序列的转换口都要走 CT.ts。 */
  CT.tzOff = -(new Date().getTimezoneOffset() * 60);
  CT.ts = function(t){ return t + CT.tzOff; };
  CT.fmtN = function(x, d){
    if(x === null || x === undefined || isNaN(x)) return '—';
    return (+x).toLocaleString('en-US', {minimumFractionDigits: d === undefined ? 0 : d, maximumFractionDigits: d === undefined ? 2 : d});
  };
  CT.slice = function(rows, fromISO, toISO){
    var a = fromISO ? Date.parse(fromISO) / 1000 : -Infinity;
    var b = toISO ? Date.parse(toISO) / 1000 : Infinity;
    return rows.filter(function(r){ return r[0] >= a && r[0] < b; });
  };
  CT.candles = function(rows){
    return rows.map(function(r){ return {time: CT.ts(r[0]), open: r[1], high: r[2], low: r[3], close: r[4]}; });
  };
  CT.volumes = function(rows){
    return rows.map(function(r){
      return {time: CT.ts(r[0]), value: r[5], color: r[4] >= r[1] ? 'UP' : 'DOWN'};   // 占位，着色在 addVolume 里做
    });
  };
  CT.line = function(rows, fn){
    return rows.map(function(r, i){ return {time: CT.ts(r[0]), value: fn(r, i)}; });
  };

  /* ---------- 指标 ---------- */
  var I = CT.ind = {};
  function src(r){ return r[4]; }                       // 默认用收盘价

  I.sma = function(rows, n){
    var out = [], sum = 0;
    for(var i = 0; i < rows.length; i++){
      sum += src(rows[i]);
      if(i >= n) sum -= src(rows[i - n]);
      if(i >= n - 1) out.push({time: CT.ts(rows[i][0]), value: sum / n});
    }
    return out;
  };
  I.ema = function(rows, n){
    var out = [], k = 2 / (n + 1), e = null, warm = 0;
    for(var i = 0; i < rows.length; i++){
      var v = src(rows[i]);
      e = e === null ? v : v * k + e * (1 - k);
      if(++warm >= n) out.push({time: CT.ts(rows[i][0]), value: e});
    }
    return out;
  };
  I.rsi = function(rows, n){
    n = n || 14;
    var out = [], up = 0, dn = 0;
    for(var i = 1; i < rows.length; i++){
      var ch = src(rows[i]) - src(rows[i - 1]);
      var u = Math.max(ch, 0), d = Math.max(-ch, 0);
      if(i <= n){ up += u / n; dn += d / n; }
      else{ up = (up * (n - 1) + u) / n; dn = (dn * (n - 1) + d) / n; }
      if(i >= n) out.push({time: CT.ts(rows[i][0]), value: dn === 0 ? 100 : 100 - 100 / (1 + up / dn)});
    }
    return out;
  };
  I.macd = function(rows, fast, slow, sig){
    fast = fast || 12; slow = slow || 26; sig = sig || 9;
    var kf = 2 / (fast + 1), ks = 2 / (slow + 1), kg = 2 / (sig + 1);
    var ef = null, es = null, eg = null;
    var macd = [], signal = [], hist = [];
    for(var i = 0; i < rows.length; i++){
      var v = src(rows[i]);
      ef = ef === null ? v : v * kf + ef * (1 - kf);
      es = es === null ? v : v * ks + es * (1 - ks);
      if(i < slow - 1) continue;
      var m = ef - es;
      eg = eg === null ? m : m * kg + eg * (1 - kg);
      macd.push({time: CT.ts(rows[i][0]), value: m});
      signal.push({time: CT.ts(rows[i][0]), value: eg});
      hist.push({time: CT.ts(rows[i][0]), value: m - eg});
    }
    return {macd: macd, signal: signal, hist: hist};
  };
  I.boll = function(rows, n, k){
    n = n || 20; k = k === undefined ? 2 : k;
    var mid = [], up = [], dn = [], width = [];
    for(var i = n - 1; i < rows.length; i++){
      var sum = 0, j;
      for(j = i - n + 1; j <= i; j++) sum += src(rows[j]);
      var m = sum / n, sq = 0;
      for(j = i - n + 1; j <= i; j++) sq += Math.pow(src(rows[j]) - m, 2);
      var sd = Math.sqrt(sq / n), t = rows[i][0];
      mid.push({time: t, value: m});
      up.push({time: t, value: m + k * sd});
      dn.push({time: t, value: m - k * sd});
      width.push({time: t, value: m ? (2 * k * sd) / m * 100 : 0});
    }
    return {mid: mid, up: up, dn: dn, width: width};
  };
  function trueRanges(rows){
    var tr = [];
    for(var i = 0; i < rows.length; i++){
      var h = rows[i][2], l = rows[i][3];
      var pc = i ? rows[i - 1][4] : rows[i][1];
      tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    }
    return tr;
  }
  I.atr = function(rows, n){
    n = n || 14;
    var tr = trueRanges(rows), out = [], a = null;
    for(var i = 0; i < tr.length; i++){
      if(i < n){ a = (a === null ? 0 : a) + tr[i] / n; }
      else{ a = (a * (n - 1) + tr[i]) / n; }
      if(i >= n - 1) out.push({time: CT.ts(rows[i][0]), value: a});
    }
    return out;
  };
  I.adx = function(rows, n){
    n = n || 14;
    var tr = trueRanges(rows);
    var atrW = null, pW = null, mW = null, adxW = null;
    var adx = [], pdi = [], mdi = [];
    for(var i = 1; i < rows.length; i++){
      var upM = rows[i][2] - rows[i - 1][2];
      var dnM = rows[i - 1][3] - rows[i][3];
      var pdm = (upM > dnM && upM > 0) ? upM : 0;
      var mdm = (dnM > upM && dnM > 0) ? dnM : 0;
      if(i <= n){
        atrW = (atrW || 0) + tr[i] / n; pW = (pW || 0) + pdm / n; mW = (mW || 0) + mdm / n;
      }else{
        atrW = (atrW * (n - 1) + tr[i]) / n;
        pW = (pW * (n - 1) + pdm) / n;
        mW = (mW * (n - 1) + mdm) / n;
      }
      if(i < n) continue;
      var p = atrW ? 100 * pW / atrW : 0, m = atrW ? 100 * mW / atrW : 0;
      var dx = (p + m) ? 100 * Math.abs(p - m) / (p + m) : 0;
      if(i < 2 * n){ adxW = (adxW === null ? 0 : adxW) + dx / n; }
      else{ adxW = (adxW * (n - 1) + dx) / n; }
      var t = CT.ts(rows[i][0]);
      pdi.push({time: t, value: p});
      mdi.push({time: t, value: m});
      if(i >= 2 * n - 1) adx.push({time: t, value: adxW});
    }
    return {adx: adx, pdi: pdi, mdi: mdi};
  };
  I.kdj = function(rows, n, kn, dn){
    n = n || 9; kn = kn || 3; dn = dn || 3;
    var K = 50, D = 50, k = [], d = [], j = [];
    for(var i = n - 1; i < rows.length; i++){
      var hh = -Infinity, ll = Infinity;
      for(var x = i - n + 1; x <= i; x++){ hh = Math.max(hh, rows[x][2]); ll = Math.min(ll, rows[x][3]); }
      var rsv = hh === ll ? 50 : (rows[i][4] - ll) / (hh - ll) * 100;
      K = (K * (kn - 1) + rsv) / kn;
      D = (D * (dn - 1) + K) / dn;
      var t = CT.ts(rows[i][0]);
      k.push({time: t, value: K});
      d.push({time: t, value: D});
      j.push({time: t, value: 3 * K - 2 * D});
    }
    return {k: k, d: d, j: j};
  };
  I.obv = function(rows){
    var out = [], o = 0;
    for(var i = 1; i < rows.length; i++){
      if(rows[i][4] > rows[i - 1][4]) o += rows[i][5];
      else if(rows[i][4] < rows[i - 1][4]) o -= rows[i][5];
      out.push({time: CT.ts(rows[i][0]), value: o});
    }
    return out;
  };
  I.donchian = function(rows, n){
    n = n || 20;
    var up = [], dn = [];
    for(var i = n; i < rows.length; i++){
      var hh = -Infinity, ll = Infinity;
      for(var x = i - n; x < i; x++){ hh = Math.max(hh, rows[x][2]); ll = Math.min(ll, rows[x][3]); }
      up.push({time: CT.ts(rows[i][0]), value: hh});
      dn.push({time: CT.ts(rows[i][0]), value: ll});
    }
    return {up: up, dn: dn};
  };
  /* 当日 VWAP（UTC 日界），返回每根 K 线对应的当日累计均价 */
  I.vwapDaily = function(rows){
    var out = [], day = null, pv = 0, vv = 0;
    for(var i = 0; i < rows.length; i++){
      var d = Math.floor(rows[i][0] / 86400);
      if(d !== day){ day = d; pv = 0; vv = 0; }
      var tp = (rows[i][2] + rows[i][3] + rows[i][4]) / 3;
      pv += tp * rows[i][5]; vv += rows[i][5];
      out.push({time: CT.ts(rows[i][0]), value: vv ? pv / vv : tp});
    }
    return out;
  };

  /* ---------- 图表包装 ----------
     var g = CT.makeChart(el, {height: 360, panes: [0.28]});   panes：副图高度占比数组
     g.addCandles(rows)                                主图 K 线（自动涨跌配色）
     g.addLine(data, 'series', {width:2, pane:0, title})
     g.addHist(data, 'up/down' | 'accent', {pane:1})   柱状（'ud' = 按正负着涨跌色）
     g.addArea(data, 'accent', {pane:0})
     g.fit() / g.chart                                 主题切换时自动重新着色 */
  var LWC = window.LightweightCharts;
  var charts = [];
  CT.makeChart = function(el, opts){
    opts = opts || {};
    if(typeof el === 'string') el = document.getElementById(el);
    var pal = CT.pal();
    function baseOptions(p){
      return {
        autoSize: true,
        layout: {
          background: {color: 'transparent'},
          textColor: p.muted,
          fontFamily: getComputedStyle(document.body).fontFamily,
          fontSize: 11,
          attributionLogo: false,
          panes: {separatorColor: p.line, separatorHoverColor: p.accentSoft}
        },
        grid: {vertLines: {color: p.line}, horzLines: {color: p.line}},
        rightPriceScale: {borderColor: p.line2},
        timeScale: {borderColor: p.line2, timeVisible: !!opts.timeVisible, rightOffset: 2, minBarSpacing: opts.minBarSpacing || 0.5},
        crosshair: {
          vertLine: {color: p.muted, labelBackgroundColor: p.accent},
          horzLine: {color: p.muted, labelBackgroundColor: p.accent}
        },
        localization: {locale: 'zh-CN'},
        handleScroll: opts.frozen ? false : true,
        handleScale: opts.frozen ? false : true
      };
    }
    var chart = LWC.createChart(el, baseOptions(pal));
    var g = {chart: chart, el: el, series: [], _restyleFns: []};

    function candleOpts(p){
      return {
        upColor: p.up, downColor: p.down, borderVisible: false,
        wickUpColor: p.up, wickDownColor: p.down,
        priceLineVisible: false
      };
    }
    g.addCandles = function(rows, o){
      o = o || {};
      var s = chart.addSeries(LWC.CandlestickSeries, Object.assign(candleOpts(CT.pal()), o.opts || {}), o.pane || 0);
      s.setData(CT.candles(rows));
      g.series.push({s: s, kind: 'candle'});
      return s;
    };
    g.addLine = function(data, color, o){
      o = o || {};
      var s = chart.addSeries(LWC.LineSeries, Object.assign({
        color: tok(color, CT.pal()), lineWidth: o.width || 2,
        priceLineVisible: false, lastValueVisible: o.lastValue !== undefined ? o.lastValue : false,
        crosshairMarkerVisible: o.marker !== undefined ? o.marker : true,
        lineStyle: o.dashed ? 2 : 0,
        title: o.title || ''
      }, o.opts || {}), o.pane || 0);
      s.setData(data);
      g.series.push({s: s, kind: 'line', color: color, o: o});
      return s;
    };
    g.addArea = function(data, color, o){
      o = o || {};
      var p = CT.pal(), c = tok(color, p);
      var s = chart.addSeries(LWC.AreaSeries, Object.assign({
        lineColor: c, topColor: c + '44', bottomColor: c + '00',
        lineWidth: o.width || 2, priceLineVisible: false, lastValueVisible: false
      }, o.opts || {}), o.pane || 0);
      s.setData(data);
      g.series.push({s: s, kind: 'area', color: color, o: o});
      return s;
    };
    g.addHist = function(data, color, o){
      o = o || {};
      var s = chart.addSeries(LWC.HistogramSeries, Object.assign({
        priceLineVisible: false, lastValueVisible: false,
        priceFormat: o.volume ? {type: 'volume'} : undefined
      }, o.opts || {}), o.pane || 0);
      function paint(){
        var p = CT.pal();
        if(color === 'ud'){
          s.setData(data.map(function(d){ return {time: d.time, value: d.value, color: d.value >= 0 ? p.up : p.down}; }));
        }else if(color === 'vol'){
          s.setData(data.map(function(d){ return {time: d.time, value: d.value, color: (d.color === 'UP' ? p.up : p.down) + '55'}; }));
        }else{
          s.applyOptions({color: tok(color, p)});
          s.setData(data);
        }
      }
      paint();
      g.series.push({s: s, kind: 'hist', repaint: paint});
      return s;
    };
    g.priceLine = function(s, price, color, title, style){
      var pl = {price: price, color: tok(color, CT.pal()), lineWidth: 1, lineStyle: style === undefined ? 2 : style, title: title || '', axisLabelVisible: true};
      var obj = s.createPriceLine(pl);
      g.series.push({kind: 'priceline', obj: obj, color: color, base: pl});
      return obj;
    };
    g.markers = function(s, ms){
      /* ms: [{time, position:'aboveBar'|'belowBar', shape:'arrowUp'|'arrowDown'|'circle', color:'up', text}] */
      function paint(){
        var p = CT.pal();
        api.setMarkers(ms.map(function(m){ return Object.assign({}, m, {time: CT.ts(m.time), color: tok(m.color, p), size: m.size || 1}); }));
      }
      var api = LWC.createSeriesMarkers(s, []);
      paint();
      g.series.push({kind: 'markers', repaint: paint});
      return api;
    };
    if(opts.panes && opts.panes.length){
      /* 预建副图并设置占比：主图占 1 - sum(panes) */
      var total = opts.panes.reduce(function(a, b){ return a + b; }, 0);
      setTimeout(function(){
        var ps = chart.panes();
        if(ps[0]) ps[0].setStretchFactor(Math.max(1 - total, 0.2) * 100);
        opts.panes.forEach(function(f, i){ if(ps[i + 1]) ps[i + 1].setStretchFactor(f * 100); });
      }, 0);
    }
    g.fit = function(){ chart.timeScale().fitContent(); };
    g.setRange = function(fromISO, toISO){
      chart.timeScale().setVisibleRange({from: CT.ts(Date.parse(fromISO) / 1000), to: CT.ts(Date.parse(toISO) / 1000)});
    };
    g.restyle = function(){
      var p = CT.pal();
      chart.applyOptions(baseOptions(p));
      g.series.forEach(function(it){
        if(it.kind === 'candle') it.s.applyOptions(candleOpts(p));
        else if(it.kind === 'line') it.s.applyOptions({color: tok(it.color, p)});
        else if(it.kind === 'area'){ var c = tok(it.color, p); it.s.applyOptions({lineColor: c, topColor: c + '44', bottomColor: c + '00'}); }
        else if(it.repaint) it.repaint();
        else if(it.kind === 'priceline') it.obj.applyOptions({color: tok(it.color, p)});
      });
      g._restyleFns.forEach(function(f){ f(p); });
    };
    g.onRestyle = function(f){ g._restyleFns.push(f); };
    charts.push(g);
    return g;
  };
  window.addEventListener('ct-restyle', function(){
    charts.forEach(function(g){ g.restyle(); });
  });

  /* 图例：CT.legend(el, [['series','EMA20'], ['up','上涨'], ...]) */
  CT.legend = function(el, items){
    if(typeof el === 'string') el = document.getElementById(el);
    function paint(){
      var p = CT.pal();
      el.innerHTML = items.map(function(it){
        return '<span><i style="background:' + tok(it[0], p) + '"></i>' + it[1] + '</span>';
      }).join('');
    }
    paint();
    window.addEventListener('ct-restyle', paint);
  };

  /* 滑块绑定：CT.bindRange('id', fn)——input 时更新 output 并调 fn(value) */
  CT.bindRange = function(id, fn, fmt){
    var inp = document.getElementById(id);
    if(!inp) return;
    var out = inp.closest('label') ? inp.closest('label').querySelector('output') : null;
    function go(){
      var v = +inp.value;
      if(out) out.textContent = fmt ? fmt(v) : v;
      fn(v);
    }
    inp.addEventListener('input', go);
    go();
  };
  /* 分段按钮：CT.bindSeg('容器id', fn)——点击切换 aria-pressed 并调 fn(data-val) */
  CT.bindSeg = function(id, fn){
    var box = document.getElementById(id);
    if(!box) return;
    var btns = box.querySelectorAll('button');
    btns.forEach(function(b){
      b.addEventListener('click', function(){
        btns.forEach(function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        fn(b.getAttribute('data-val'));
      });
    });
    var init = box.querySelector('button[aria-pressed="true"]') || btns[0];
    if(init){ init.setAttribute('aria-pressed', 'true'); fn(init.getAttribute('data-val')); }
  };
})();
