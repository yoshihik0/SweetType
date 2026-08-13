/*!
 * SweetType-h engine: character-by-character heading typesetting runtime.
 * Usage: SweetTypeH.register('title', settings);
 */
(function (global) {
  'use strict';
  function value(v, fallback) { return v === '' || v == null ? fallback : v; }
  function numberValue(v, fallback) {
    var n = parseFloat(v);
    return Number.isFinite(n) ? n : (fallback || 0);
  }
  var registry = Object.create(null);
  function normalizeId(id) {
    return String(id || 'title').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'title';
  }
  function apply(target, settings) {
    var root = typeof target === 'string' ? document.querySelector(target) : target;
    if (!root || !settings) return root;
    var baseFont = value(settings.font, getComputedStyle(root).fontFamily);
    var baseWeight = value(settings.weight, getComputedStyle(root).fontWeight);
    var writing = settings.writing === 'vertical' ? 'vertical' : 'horizontal';
    var chars = Array.isArray(settings.characters) ? settings.characters : [];
    root.classList.toggle('sweet-type-h--vertical', writing === 'vertical');
    root.style.writingMode = writing === 'vertical' ? 'vertical-rl' : 'horizontal-tb';
    root.style.fontFamily = baseFont;
    if (settings.color) root.style.color = settings.color;
    if (settings.size != null && settings.size !== '') root.style.fontSize = /[a-z%]/i.test(String(settings.size)) ? settings.size : String(settings.size) + 'px';
    root.style.fontWeight = baseWeight;
    if (settings.lineHeight != null && settings.lineHeight !== '') root.style.lineHeight = settings.lineHeight;
    var source = [];
    Array.from(root.childNodes).forEach(function read(node) {
      if (node.nodeType === 3) Array.from(node.nodeValue).forEach(function (char) { source.push(char); });
      else if (node.nodeType === 1 && node.tagName === 'BR') source.push('\n');
      else Array.from(node.childNodes || []).forEach(read);
    });
    root.replaceChildren();
    var propertyIndex = 0;
    source.forEach(function (char, sourceIndex) {
      if (char === '\r') return;
      if (char === '\n') { root.appendChild(document.createElement('br')); return; }
      var item = chars[propertyIndex] || {}, span = document.createElement('span');
      propertyIndex += 1;
      span.textContent = char;
      span.dataset.sweetTypeHIndex = String(propertyIndex);
      span.style.display = 'inline-block';
      var lineEnd = source[sourceIndex + 1] === '\n' || source[sourceIndex + 1] === undefined;
      if (item.spacing && !lineEnd) span.style.letterSpacing = numberValue(item.spacing) + 'em';
      if (item.font) span.style.fontFamily = item.font;
      if (item.color) span.style.color = item.color;
      if (item.size) span.style.fontSize = numberValue(item.size) + 'px';
      if (item.weight) span.style.fontWeight = item.weight;
      var y = numberValue(item.y);
      if (y) span.style.transform = 'translateY(' + (-y) + 'px)';
      root.appendChild(span);
    });
    return root;
  }
  function applyRegistered(id) {
    var key = normalizeId(id), settings = registry[key];
    if (!settings) return 0;
    var selector = '[data-sweet-type-h-' + key + ']';
    var roots = document.querySelectorAll(selector);
    roots.forEach(function (root) { apply(root, settings); });
    return roots.length;
  }
  function register(id, settings) {
    var key = normalizeId(id);
    registry[key] = settings;
    if (document.readyState !== 'loading') applyRegistered(key);
    return key;
  }
  function init() { Object.keys(registry).forEach(applyRegistered); }
  global.SweetTypeH = { apply: apply, register: register, applyRegistered: applyRegistered, settings: registry };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
}(window));
