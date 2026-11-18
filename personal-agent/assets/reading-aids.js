/* Reading assistance only: no model calls, tracking, storage or external requests. */
(() => {
  'use strict';
  const main = document.querySelector('main');
  if (!main || !window.COURSE_TERMS) return;
  const terms = window.COURSE_TERMS;
  const popup = document.createElement('div');
  popup.className = 'reading-popover';
  popup.id = 'reading-explanation';
  popup.hidden = true;
  popup.setAttribute('role', 'dialog');
  popup.setAttribute('aria-modal', 'false');
  popup.setAttribute('aria-labelledby', 'reading-explanation-title');
  popup.innerHTML = '<div class="reading-popover__head"><div class="reading-popover__heading"><p class="reading-popover__kind"></p><h2 class="reading-popover__title" id="reading-explanation-title"></h2></div><button type="button" class="reading-popover__close" aria-label="关闭说明">×</button></div><div class="reading-popover__body"></div>';
  document.body.append(popup);
  const title = popup.querySelector('h2');
  const kind = popup.querySelector('.reading-popover__kind');
  const body = popup.querySelector('.reading-popover__body');
  const closeButton = popup.querySelector('button');
  let trigger = null;
  let frame = 0;
  const details = new WeakMap();

  function close(restore = false) {
    const previous = trigger;
    if (previous) previous.setAttribute('aria-expanded', 'false');
    trigger = null;
    popup.hidden = true;
    if (restore && previous?.isConnected) previous.focus({preventScroll: true});
  }

  function position() {
    if (!trigger || popup.hidden) return;
    const r = trigger.getBoundingClientRect();
    const v = window.visualViewport;
    const x = v?.offsetLeft || 0, y = v?.offsetTop || 0;
    const width = v?.width || window.innerWidth, height = v?.height || window.innerHeight;
    if (r.bottom < y || r.top > y + height || r.right < x || r.left > x + width) { close(); return; }
    popup.style.maxWidth = `${Math.max(0, width - 24)}px`;
    popup.style.maxHeight = `${Math.max(0, height - 24)}px`;
    const box = popup.getBoundingClientRect();
    const left = Math.max(x + 12, Math.min(r.left, x + width - box.width - 12));
    let top = r.bottom + 8;
    if (top + box.height > y + height - 12) top = r.top - box.height - 8;
    top = Math.max(y + 12, Math.min(top, y + height - box.height - 12));
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }

  function paragraph(text, className) {
    if (!text) return;
    const p = document.createElement('p');
    if (className) p.className = className;
    p.textContent = text;
    body.append(p);
  }

  function open(button) {
    if (trigger === button && !popup.hidden) { close(true); return; }
    const data = details.get(button);
    if (!data) return;
    close();
    trigger = button;
    kind.textContent = data.kind;
    title.textContent = data.title;
    body.replaceChildren();
    paragraph(data.definition);
    paragraph(data.example, 'reading-popover__example');
    paragraph(data.boundary, 'reading-popover__boundary');
    if (data.url) {
      const link = document.createElement('a');
      link.className = 'reading-popover__link';
      link.href = data.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = data.linkLabel || '查看原始资料 ↗（新标签页）';
      body.append(link);
    }
    button.setAttribute('aria-expanded', 'true');
    popup.hidden = false;
    popup.scrollTop = 0;
    position();
    closeButton.focus({preventScroll: true});
  }

  function button(text, data, className) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = className;
    b.textContent = text;
    b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-haspopup', 'dialog');
    b.setAttribute('aria-controls', popup.id);
    b.setAttribute('aria-label', `${className === 'term-tip' ? '解释术语' : '查看参考资料'}：${data.title}`);
    details.set(b, data);
    b.addEventListener('click', () => open(b));
    return b;
  }

  // Citation numbers follow the existing chapter bibliography, including repeated citations.
  const refs = new Map();
  const canonical = href => { const u = new URL(href, location.href); u.hash = ''; return u.href; };
  main.querySelectorAll('.sources > li').forEach((li, index) => {
    const a = li.querySelector('a[href^="https://"],a[href^="http://"]');
    if (!a) return;
    refs.set(canonical(a.href), {
      kind: `参考资料 [${index + 1}]`, number: index + 1, title: a.textContent.trim(),
      definition: li.textContent.trim().slice(a.textContent.trim().length).replace(/^\s*[—–-]\s*/, ''),
      boundary: '该资料用于相邻正文的机制说明；教学例子和推演不等于已复现的实验结果。', url: a.href
    });
  });
  main.querySelectorAll('a[href^="https://"],a[href^="http://"]').forEach(a => {
    if (a.closest('.sources,nav,header,footer')) return;
    const data = refs.get(canonical(a.href));
    if (!data) return; // Do not invent a source or citation number.
    const sup = document.createElement('sup');
    sup.className = 'reference-note';
    sup.append(button(`[${data.number}]`, {...data, url: a.href}, 'reference-tip'));
    const label = document.createElement('span');
    label.className = 'reference-label';
    label.textContent = a.textContent;
    a.replaceWith(label, sup);
  });

  const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keys = Object.keys(terms).sort((a, b) => b.length - a.length);
  const matcher = new RegExp(`(?<![A-Za-z0-9_])(${keys.map(escape).join('|')})(?![A-Za-z0-9_])`, 'gi');
  const lookup = new Map(keys.map(k => [k.toLowerCase(), terms[k]]));
  const sections = main.querySelectorAll('section');
  sections.forEach(section => {
    if (section.id === 'sources') return;
    const seen = new Set();
    const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.textContent.trim() || node.parentElement.closest('a,button,script,style,svg,figure,nav,header,footer,h1,h2,h3,h4,.sources,.reference-label')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      matcher.lastIndex = 0;
      const text = node.textContent;
      const fragment = document.createDocumentFragment();
      let from = 0, changed = false;
      for (const match of text.matchAll(matcher)) {
        const key = match[0].toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        const data = lookup.get(key);
        fragment.append(document.createTextNode(text.slice(from, match.index)));
        fragment.append(button(match[0], {kind: '术语解释', ...data}, 'term-tip'));
        from = match.index + match[0].length;
        changed = true;
      }
      if (changed) { fragment.append(document.createTextNode(text.slice(from))); node.replaceWith(fragment); }
    }
  });

  if (main.querySelector('.term-tip,.reference-tip')) {
    const guide = document.createElement('p');
    guide.className = 'reading-guide';
    guide.textContent = '虚线标注的术语可点击查看解释；引用上标可查看来源。支持键盘 Enter 打开、Esc 关闭。';
    main.querySelector('header')?.append(guide);
  }
  closeButton.addEventListener('click', () => close(true));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !popup.hidden) { e.preventDefault(); close(true); } });
  document.addEventListener('pointerdown', e => {
    if (!popup.hidden && !popup.contains(e.target) && !e.target.closest('.term-tip,.reference-tip')) close();
  });
  document.addEventListener('focusin', e => {
    if (!popup.hidden && !popup.contains(e.target) && e.target !== trigger) close();
  });
  const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(position); };
  window.addEventListener('scroll', schedule, {passive: true, capture: true});
  window.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('scroll', schedule);
})();
