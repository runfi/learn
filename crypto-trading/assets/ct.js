/* 币圈短线实战课 · 共享脚本
   功能：1) 侧栏滚动高亮  2) 深浅主题切换  3) 涨跌配色切换（绿涨/红涨）
        4) 术语弹注：.nt 自动编号，点击弹出解释卡；页尾 #notes-list 自动生成术语一览 */
(function(){
  'use strict';
  var store = {
    get: function(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
    set: function(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
  };

  /* ---------- 主题与涨跌配色 ---------- */
  var root = document.documentElement;
  var theme = store.get('ct-theme');            // light / dark / 空 = 跟随系统
  if(theme) root.setAttribute('data-theme', theme);
  var updown = store.get('ct-updown');          // cn = 红涨绿跌；空 = 绿涨红跌
  if(updown === 'cn') root.setAttribute('data-updown', 'cn');

  function fireRestyle(){
    try{ window.dispatchEvent(new CustomEvent('ct-restyle')); }catch(e){}
  }
  window.addEventListener('DOMContentLoaded', function(){
    var tBtn = document.getElementById('btn-theme');
    if(tBtn){
      var syncT = function(){
        var cur = root.getAttribute('data-theme');
        tBtn.textContent = cur === 'dark' ? '🌙 深色' : cur === 'light' ? '☀️ 浅色' : '🖥 跟随系统';
      };
      syncT();
      tBtn.addEventListener('click', function(){
        var cur = root.getAttribute('data-theme');
        var next = cur === null ? 'dark' : cur === 'dark' ? 'light' : null;
        if(next){ root.setAttribute('data-theme', next); store.set('ct-theme', next); }
        else{ root.removeAttribute('data-theme'); store.set('ct-theme', ''); }
        syncT(); fireRestyle();
      });
    }
    var uBtn = document.getElementById('btn-updown');
    if(uBtn){
      var syncU = function(){
        uBtn.innerHTML = root.getAttribute('data-updown') === 'cn'
          ? '<span class="sw-up">红涨</span>·<span class="sw-dn">绿跌</span>'
          : '<span class="sw-up">绿涨</span>·<span class="sw-dn">红跌</span>';
      };
      syncU();
      uBtn.addEventListener('click', function(){
        var cn = root.getAttribute('data-updown') === 'cn';
        if(cn){ root.removeAttribute('data-updown'); store.set('ct-updown', ''); }
        else{ root.setAttribute('data-updown', 'cn'); store.set('ct-updown', 'cn'); }
        syncU(); fireRestyle();
      });
    }
    if(window.matchMedia){
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(){
        if(!root.getAttribute('data-theme')) fireRestyle();
      });
    }
  });

  /* ---------- 侧栏滚动高亮 ---------- */
  window.addEventListener('DOMContentLoaded', function(){
    var links = Array.prototype.slice.call(document.querySelectorAll('.sidenav a[href^="#"]'));
    if(!links.length) return;
    var map = [];
    links.forEach(function(a){
      var el = document.getElementById(a.getAttribute('href').slice(1));
      if(el) map.push([el, a]);
    });
    if(!map.length) return;
    function update(){
      var y = window.scrollY + 150;
      var cur = map[0][1];
      for(var i = 0; i < map.length; i++){
        if(map[i][0].offsetTop <= y) cur = map[i][1];
      }
      map.forEach(function(p){ p[1].classList.toggle('active', p[1] === cur); });
    }
    var tick = false;
    window.addEventListener('scroll', function(){
      if(!tick){ tick = true; requestAnimationFrame(function(){ tick = false; update(); }); }
    }, {passive: true});
    window.addEventListener('resize', update);
    update();
  });

  /* ---------- 术语弹注 ----------
     写法：正文 <span class="nt" data-note="mark-price">标记价格</span>
          页内任意处（通常 body 末尾）：
          <div class="notes-src" hidden>
            <section data-note-id="mark-price" data-title="标记价格" data-en="Mark Price">
              <p>解释段落……</p>
            </section>
          </div>
     行为：按出现顺序自动编号；点击在词旁弹卡（手机上从底部弹出）；
          若页面有 <ol class="notes-list" id="notes-list"></ol>，自动生成术语一览。 */
  window.addEventListener('DOMContentLoaded', function(){
    var srcRootList = document.querySelectorAll('.notes-src');
    if(!srcRootList.length) return;
    var defs = {};
    srcRootList.forEach ? srcRootList.forEach(collect) : Array.prototype.forEach.call(srcRootList, collect);
    function collect(rootEl){
      Array.prototype.forEach.call(rootEl.querySelectorAll('[data-note-id]'), function(s){
        defs[s.getAttribute('data-note-id')] = s;
      });
    }
    var terms = Array.prototype.slice.call(document.querySelectorAll('.nt[data-note]'));
    var order = [];                                     // 首次出现顺序 → 编号
    terms.forEach(function(t){
      var id = t.getAttribute('data-note');
      if(!defs[id]){ t.classList.remove('nt'); return; }
      if(order.indexOf(id) < 0) order.push(id);
      var no = order.indexOf(id) + 1;
      t.setAttribute('role', 'button');
      t.setAttribute('tabindex', '0');
      t.setAttribute('aria-label', '术语备注 ' + no + '：' + (defs[id].getAttribute('data-title') || ''));
      var sup = document.createElement('sup');
      sup.className = 'nn';
      sup.textContent = no;
      t.appendChild(sup);
    });

    var pop = null;
    function close(){ if(pop){ pop.remove(); pop = null; } }
    function open(t){
      var id = t.getAttribute('data-note');
      var def = defs[id];
      if(!def) return;
      close();
      var no = order.indexOf(id) + 1;
      pop = document.createElement('div');
      pop.className = 'pop';
      pop.setAttribute('role', 'dialog');
      pop.setAttribute('aria-label', '术语：' + (def.getAttribute('data-title') || ''));
      var en = def.getAttribute('data-en');
      pop.innerHTML = '<div class="pop-h"><span class="pop-t"><span class="nno">' + no + '</span>'
        + (def.getAttribute('data-title') || '')
        + (en ? '<span class="en-term">' + en + '</span>' : '')
        + '</span><button class="pop-x" aria-label="关闭">×</button></div>'
        + def.innerHTML;
      document.body.appendChild(pop);
      var r = t.getBoundingClientRect();
      var pw = pop.offsetWidth, ph = pop.offsetHeight;
      var x = Math.min(Math.max(8, r.left + window.scrollX), window.scrollX + document.documentElement.clientWidth - pw - 8);
      var below = r.bottom + 8 + ph < window.innerHeight || r.top - ph - 8 < 0;
      var y = below ? r.bottom + window.scrollY + 8 : r.top + window.scrollY - ph - 8;
      pop.style.left = x + 'px';
      pop.style.top = y + 'px';
      pop.querySelector('.pop-x').addEventListener('click', function(ev){ ev.stopPropagation(); close(); });
    }
    terms.forEach(function(t){
      t.addEventListener('click', function(ev){ ev.stopPropagation(); pop ? close() : open(t); });
      t.addEventListener('keydown', function(ev){
        if(ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); pop ? close() : open(t); }
        if(ev.key === 'Escape') close();
      });
    });
    document.addEventListener('click', function(ev){
      if(pop && !pop.contains(ev.target)) close();
    });
    document.addEventListener('keydown', function(ev){ if(ev.key === 'Escape') close(); });
    window.addEventListener('scroll', function(){
      if(pop && window.innerWidth > 640) close();
    }, {passive: true});

    /* 页尾术语一览 */
    var list = document.getElementById('notes-list');
    if(list){
      order.forEach(function(id, i){
        var def = defs[id];
        var li = document.createElement('li');
        li.id = 'note-' + id;
        var en = def.getAttribute('data-en');
        li.innerHTML = '<span class="nl-no">' + (i + 1) + '</span><div><span class="nl-t">'
          + (def.getAttribute('data-title') || '')
          + (en ? '<span class="en-term">' + en + '</span>' : '') + '</span>'
          + def.innerHTML + '</div>';
        list.appendChild(li);
      });
    }
  });
})();
