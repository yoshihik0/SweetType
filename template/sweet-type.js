/*!
 * sweet-type.js
 *
 * 日本語テキストを文字種ごとに分割し、class 付きの <span> で包むことで
 * CSS から文字づめを制御できるようにする。
 *
 * 役割分担
 *   約物のアキ（括弧・句読点・中点）  … ブラウザの text-spacing-trim に任せる
 *   かな詰め・和欧間アキ              … このライブラリが担当する
 *
 * text-spacing-trim は行頭の始め括弧・行末の句読点といった「位置に依存する規則」まで
 * 処理できる。これは CSS クラスでは原理的に書けないので、対応ブラウザでは
 * 約物に一切手を出さない。非対応ブラウザ向けの近似だけ用意してある。
 *
 * かな詰めは canvas の TextMetrics で実フォントのサイドベアリングを実測し、
 * 隣り合う 2 文字の字面のアキを CSS カスタムプロパティ --sweet-type-g として書き出す。
 * 実際の詰め量は sweet-type.css 側で計算するので、書体を変えれば自動的に追随し、
 * 詰め具合は CSS だけで調整できる。
 *
 * 使い方:
 *   <script src="sweet-type.js"></script>
 *   <script>SweetType.apply('.sweet-type');</script>
 *
 *   HTML に data-sweet-type を書けば DOMContentLoaded で自動適用される。
 */
(function (global) {
    'use strict';

    // ------------------------------------------------------------------
    // 文字種の定義
    //
    // 分類は JIS X 4051（日本語文書の組版方法）の文字クラスをおおむね踏襲している。
    // 判定は上から順に行われるので並び順に意味がある
    // （「ゝ」は Script=Hiragana でもあるが、先に repeat として拾う）。
    // ------------------------------------------------------------------
    var RULES = [
        ['space-ja', /^　$/u],                                  // 和字間隔
        ['space', /^\s$/u],                                     // 半角空白・改行

        ['open', /^[‘“（〔［｛〈《「『【〘〖〝‹«｟｢]$/u],          // 始め括弧類
        ['close', /^[’”）〕］｝〉》」』】〙〗〟›»｠｣]$/u],          // 終わり括弧類
        ['kuten', /^[。．｡]$/u],                                 // 句点類
        ['touten', /^[、，､]$/u],                                // 読点類
        ['nakaten', /^[・：；･]$/u],                             // 中点類
        ['yakumono', /^[！？‼⁇⁈⁉]$/u],                          // 区切り約物
        ['hyphen', /^[‐–〜～゠]$/u],                             // ハイフン類
        ['dash', /^[—―…‥〳〴〵]$/u],                             // 分離禁止文字
        ['repeat', /^[ゝゞヽヾ々〻]$/u],                          // 繰返し記号
        ['choon', /^[ーｰ]$/u],                                  // 長音記号

        ['kana-half', /^[ｦ-ﾟ]$/u],                              // 半角カナ
        ['hiragana', /^\p{Script=Hiragana}$/u],
        ['katakana', /^\p{Script=Katakana}$/u],
        ['kanji', /^[\p{Script=Han}〆〇]$/u],

        ['latin-full', /^[Ａ-Ｚａ-ｚ]$/u],
        ['digit-full', /^[０-９]$/u],
        ['digit', /^[0-9]$/u],
        ['latin', /^\p{Script=Latin}$/u],
        ['latin-punct', /^[!-\/:-@\[-`{-~]$/u],

        ['punct-full', /^[　-〿！-･￠-￦]$/u]                     // その他の全角記号
    ];

    // 小書きの仮名。hiragana / katakana / kana-half に付加クラスとして足す
    var SMALL_KANA = /^[ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶㇰ-ㇿｧ-ｯ]$/u;

    var FALLBACK = 'other';

    var TYPES = RULES.map(function (r) { return r[0]; }).concat([FALLBACK, 'small']);

    // 集合。境界ごとの処理の振り分けに使う
    var setOf = function (list) {
        var s = Object.create(null);
        list.forEach(function (k) { s[k] = true; });
        return s;
    };

    // 約物。ブラウザの text-spacing-trim も面倒を見るので、扱いを分ける
    var YAKUMONO = setOf(['open', 'close', 'kuten', 'touten', 'nakaten', 'yakumono']);

    // 全角の和文。字面のアキを実測して詰める対象。
    // 欧文・半角数字を入れないのは、フォント側が字幅とカーニングを持っており、
    // こちらが詰めると設計を壊してしまうため。
    var ZENKAKU = setOf([
        'hiragana', 'katakana', 'kana-half', 'kanji', 'choon', 'repeat',
        'hyphen', 'dash', 'punct-full', 'latin-full', 'digit-full'
    ]);

    var WESTERN = setOf(['latin', 'digit', 'latin-punct']);

    // text-spacing-trim が約物を詰める量。仕様どおりの二分で、
    // 明朝・ゴシックとも実測で 0.5em ちょうどだった。
    // 対応ブラウザではこの分を差し引いてから、こちらの詰めを重ねる。
    var NATIVE_TRIM = 0.5;

    // 約物のアキは「どの約物の、どちら側か」で 12 通りある。
    // InDesign の文字組みアキ量設定と同じで、ここをまとめてしまうと
    // 「1）はとても狭いのに）年は広い」といった調整のきかなさが出る。
    // すべて別々の CSS 変数に対応させ、個別に動かせるようにしてある。
    var AKI_AFTER = {
        open: 'open-after',        // 「（ の後
        close: 'close-after',      // 」） の後
        kuten: 'kuten-after',      // 。 の後
        touten: 'touten-after',    // 、 の後
        nakaten: 'nakaten-after',  // ・： の後
        yakumono: 'bang-after'     // ！？ の後
    };

    var AKI_BEFORE = {
        open: 'open-before',       // 「（ の前
        close: 'close-before',     // 」） の前
        kuten: 'kuten-before',     // 。 の前
        touten: 'touten-before',   // 、 の前
        nakaten: 'nakaten-before', // ・： の前
        yakumono: 'bang-before'    // ！？ の前
    };

    // ------------------------------------------------------------------
    // 既定オプション
    // ------------------------------------------------------------------
    var DEFAULTS = {
        // class 名の接頭辞。ページ側の .number や .alpha と衝突させないため
        prefix: 'sweet-type__',
        // この中のテキストは処理しない
        skipSelector: 'script, style, textarea, code, pre, rt, [data-sweet-type-skip]',
        // 'metrics' … 1 文字ずつ span にして実測値を書き出す（既定）
        // 'class'   … 文字種の連なりごとに span にするだけ。実測しない
        mode: 'metrics',
        // 半角スペース・改行も span で包むか
        wrapSpace: false,
        // 行末に来た詰めを打ち消して、版面から字がはみ出さないようにする
        trimLineEnds: true
    };

    // ------------------------------------------------------------------
    // 書記素単位への分割
    //
    // txt[i] は UTF-16 コード単位を返すため「𠮷」のようなサロゲートペアや
    // 結合文字が途中で割れる。Intl.Segmenter があればそれを使う。
    // ------------------------------------------------------------------
    var segmenter = (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function')
        ? new Intl.Segmenter('ja', { granularity: 'grapheme' })
        : null;

    function toGraphemes(text) {
        if (segmenter) {
            var out = [];
            var it = segmenter.segment(text)[Symbol.iterator]();
            for (var s = it.next(); !s.done; s = it.next()) out.push(s.value.segment);
            return out;
        }
        return Array.from(text);
    }

    // ------------------------------------------------------------------
    // 文字種判定
    // ------------------------------------------------------------------
    var classifyCache = new Map();

    /**
     * 1 文字（書記素）の文字種を返す。
     * @param {string} ch
     * @returns {string[]} 基本の文字種名を先頭とする配列（例: ['hiragana', 'small']）
     */
    function classify(ch) {
        var cached = classifyCache.get(ch);
        if (cached) return cached;

        // 結合文字が付いている場合は基底文字で判定する
        var base = ch.length > 1 ? Array.from(ch)[0] : ch;

        var type = FALLBACK;
        for (var i = 0; i < RULES.length; i++) {
            if (RULES[i][1].test(base)) { type = RULES[i][0]; break; }
        }

        var types = [type];
        if ((type === 'hiragana' || type === 'katakana' || type === 'kana-half') && SMALL_KANA.test(base)) {
            types.push('small');
        }

        classifyCache.set(ch, types);
        return types;
    }

    /**
     * テキストを文字種ごとの連なりに分割する。DOM を触らないので単体で使える。
     * @param {string} text
     * @returns {{types: string[], text: string}[]}
     */
    function tokenize(text) {
        var graphemes = toGraphemes(text);
        var tokens = [];
        var current = null;
        var currentKey = null;

        for (var i = 0; i < graphemes.length; i++) {
            var types = classify(graphemes[i]);
            var key = types.join(' ');
            if (current && key === currentKey) {
                current.text += graphemes[i];
            } else {
                current = { types: types, text: graphemes[i] };
                currentKey = key;
                tokens.push(current);
            }
        }
        return tokens;
    }

    // ------------------------------------------------------------------
    // フォントメトリクスの実測
    //
    // canvas の TextMetrics から、字面の左右の余白（サイドベアリング）を取る。
    // 同じ「ひらがな」でも「い」は 0.11em、「く」は 0.36em と 3 倍以上違い、
    // しかも書体で変わるので、クラスごとの固定値では精度が出ない。
    // ------------------------------------------------------------------
    var ctx = null;
    var metricsCache = new Map(); // fontKey -> Map(char -> metrics)

    function getContext() {
        if (!ctx && typeof document !== 'undefined') {
            ctx = document.createElement('canvas').getContext('2d');
        }
        return ctx;
    }

    function fontInfoOf(el) {
        var cs = getComputedStyle(el);
        // サイズを 100px に正規化して測り、em に換算する
        return {
            font: cs.fontStyle + ' ' + cs.fontWeight + ' 100px ' + cs.fontFamily,
            size: parseFloat(cs.fontSize) || 16
        };
    }

    function measure(font, ch) {
        var table = metricsCache.get(font);
        if (!table) { table = new Map(); metricsCache.set(font, table); }

        var m = table.get(ch);
        if (m) return m;

        var c = getContext();
        if (!c) return null;
        c.font = font;
        var tm = c.measureText(ch);

        m = {
            adv: tm.width / 100,
            // 字面の左余白 / 右余白
            lsb: -tm.actualBoundingBoxLeft / 100,
            rsb: (tm.width - tm.actualBoundingBoxRight) / 100
        };
        table.set(ch, m);
        return m;
    }

    var hasNativeTrim = (typeof CSS !== 'undefined') && CSS.supports('text-spacing-trim', 'trim-start');

    // ------------------------------------------------------------------
    // DOM への適用
    // ------------------------------------------------------------------
    function resolveTargets(target) {
        if (!target) return [];
        if (typeof target === 'string') {
            return Array.prototype.slice.call(document.querySelectorAll(target));
        }
        if (target.nodeType === 1) return [target];
        if (typeof target.length === 'number') {
            return Array.prototype.filter.call(target, function (n) { return n && n.nodeType === 1; });
        }
        return [];
    }

    function collectTextNodes(root, opts) {
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: function (node) {
                if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
                var parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                // 二重適用の防止
                if (parent.hasAttribute('data-sweet-type-span')) return NodeFilter.FILTER_REJECT;
                if (opts.skipSelector && parent.closest(opts.skipSelector)) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        var nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        return nodes;
    }

    // テキストを「セル」に分ける。metrics なら 1 文字ずつ、class なら文字種の連なりごと
    function toCells(text, opts) {
        if (opts.mode !== 'metrics') return tokenize(text);
        return toGraphemes(text).map(function (ch) {
            return { types: classify(ch), text: ch };
        });
    }

    // 隣り合う 2 文字の「字面のアキ」を実測する
    function gapOf(a, b, fontA, fontB) {
        var ma = measure(fontA.font, Array.from(a.text).pop());
        var mb = measure(fontB.font, Array.from(b.text)[0]);
        if (!ma || !mb) return null;
        // margin は左側 span の em で指定するため、右側の余白を左側基準へ換算する。
        return ma.rsb + mb.lsb * fontB.size / fontA.size;
    }

    /**
     * セル i と i+1 のあいだをどう扱うかを決める。
     *
     * 約物のアキは「約物のどちら側か」で必要な量が違う。たとえば
     * 「（の前」と「）の前」はまったく別物なので、ひとつの値でまとめると
     * 片方が詰まりすぎ、もう片方が空きすぎる。そこで位置ごとに種別を返し、
     * 実際の量は CSS 側の変数で決める。
     *
     * @returns {null | {kind:string, gap:number}}
     *   kind は 'tsume'（かな・漢字どうし）／'autospace'（和欧間）／
     *   'open' 'close' 'kuten' 'touten' 'nakaten' 'bang'（約物の各位置）／
     *   'pair'（約物どうし）
     */
    function boundaryOf(a, b, fontA, fontB, nativeTrim) {
        var ta = a.types[0];
        var tb = b.types[0];

        var aY = YAKUMONO[ta], bY = YAKUMONO[tb];
        var aZ = ZENKAKU[ta], bZ = ZENKAKU[tb];
        var aW = WESTERN[ta], bW = WESTERN[tb];

        // 和欧間アキ。
        // ブラウザにも text-autospace があるが、既定では働かず、有効にしても
        // 1/8 em 固定で量を変えられない。sweet-type.css で切ってこちらが持つ。
        if ((aZ && bW) || (aW && bZ)) return { kind: 'autospace' };

        // 空白・絵文字などが絡む境界は触らない
        if (!(aY || aZ || aW) || !(bY || bZ || bW) || !fontA || !fontB) return null;

        var gap = gapOf(a, b, fontA, fontB);
        if (gap === null) return null;

        // 約物どうしの連続。text-spacing-trim が二分詰めるので、
        // その分を引いた「残りのアキ」を書き出す（詰めが二重にかからない）
        if (aY && bY) {
            return { kind: 'pair', gap: gap - (nativeTrim ? NATIVE_TRIM : 0) };
        }

        if (aY || bY) {
            // 約物と、その隣（和文でも欧文でもよい）。
            // 「。1946」のように相手が欧文でも、句点の後のアキは要る。
            //
            // アキ量は InDesign の文字組みアキ量設定と同じ数えかたにする。
            // すなわち「その約物自身が持っている余白」だけを見て、隣に来る字の
            // 字面は数えない。こうすると
            //   ・「家！」と「か？」でアキが変わらない
            //   ・IDML から読み込んだ値をそのまま使える
            var m = aY ? measure(fontA.font, Array.from(a.text).pop())
                       : measure(fontB.font, Array.from(b.text)[0]);
            if (!m) return null;
            return {
                kind: aY ? AKI_AFTER[ta] : AKI_BEFORE[tb],
                gap: aY ? m.rsb : m.lsb * fontB.size / fontA.size
            };
        }

        // 和文どうし
        return aZ && bZ ? { kind: 'tsume', gap: gap } : null;
    }

    function applyBoundary(span, info) {
        if (!info) return;
        if (info.kind === 'autospace') {
            span.setAttribute('data-sweet-type-boundary', 'autospace');
            return;
        }
        span.style.setProperty('--sweet-type-g', info.gap.toFixed(4) + 'em');
        // 'tsume' は既定の扱いなので印を付けない
        if (info.kind !== 'tsume') span.setAttribute('data-sweet-type-boundary', info.kind);
    }

    function wrapTextNode(node, opts, useMetrics) {
        var cells = toCells(node.nodeValue, opts);
        var frag = document.createDocumentFragment();
        var spans = [];

        for (var i = 0; i < cells.length; i++) {
            var cell = cells[i];
            if (cell.types[0] === 'space' && !opts.wrapSpace) {
                frag.appendChild(document.createTextNode(cell.text));
                spans.push(null);
                continue;
            }
            var span = document.createElement('span');
            span.className = cell.types.map(function (t) { return opts.prefix + t; }).join(' ');
            span.setAttribute('data-sweet-type-span', '');
            // textContent なのでエスケープを意識する必要がない
            span.textContent = cell.text;
            frag.appendChild(span);
            spans.push(span);
        }

        node.parentNode.replaceChild(frag, node);

        // span を DOM に入れ、文字種別 CSS が適用された後の実フォントで測る。
        // 境界の margin は左側 span の em なので、左右のサイズが違う場合も換算する。
        var firstSpan = spans.find(function (s) { return s; });
        var nativeTrim = !!firstSpan && hasNativeTrim
            && getComputedStyle(firstSpan).textSpacingTrim !== 'space-all';
        for (var j = 0; j < cells.length - 1; j++) {
            if (!useMetrics || !spans[j] || !spans[j + 1]) continue;
            applyBoundary(spans[j], boundaryOf(
                cells[j], cells[j + 1], fontInfoOf(spans[j]), fontInfoOf(spans[j + 1]), nativeTrim));
        }
        return spans;
    }

    /**
     * 対象要素のテキストを文字種ごとの <span> に分割する。
     * @param {Element|NodeList|Element[]|string} target 要素・要素リスト・CSS セレクタ
     * @param {object} [options] DEFAULTS 参照
     * @returns {number} 処理した要素の数
     */
    function apply(target, options) {
        var opts = Object.assign({}, DEFAULTS, options || {});
        var targets = resolveTargets(target);
        var useMetrics = opts.mode === 'metrics' && !!getContext();
        var usedFonts = [];

        for (var i = 0; i < targets.length; i++) {
            var root = targets[i];
            var nodes = collectTextNodes(root, opts);
            for (var j = 0; j < nodes.length; j++) {
                var wrapped = wrapTextNode(nodes[j], opts, useMetrics);
                if (useMetrics) wrapped.forEach(function (span) {
                    if (span) usedFonts.push(fontInfoOf(span).font);
                });
            }
            root.setAttribute('data-sweet-type', '');
            writeLineHeight(root);
            if (opts.trimLineEnds) observeLineEnds(root);
        }

        // Web フォントの読み込み前に測っていた場合は測り直す。
        // status だけ見ると、別の書体が読み終わっていて 'loaded' になっている間に
        // 本文の書体がまだ来ていない、という取りこぼしが起きるので、
        // 実際に使う書体が使えるかどうかを check() で確かめる
        if (useMetrics && document.fonts) {
            var waiting = document.fonts.status !== 'loaded';
            usedFonts.forEach(function (f) {
                try { if (!document.fonts.check(f)) waiting = true; } catch (e) { /* 書体名が不正な場合 */ }
            });
            if (waiting) {
                document.fonts.ready.then(function () {
                    metricsCache.clear();
                    remeasure(targets, opts);
                    if (opts.trimLineEnds) targets.forEach(function (t) { markLineEnds(t); });
                });
            }
        }

        return targets.length;
    }

    // 既存の span を作り直さずに --sweet-type-g だけ測り直す
    function remeasure(targets, opts) {
        for (var i = 0; i < targets.length; i++) {
            var spans = targets[i].querySelectorAll('[data-sweet-type-span]');
            for (var j = 0; j < spans.length; j++) {
                var span = spans[j];
                var next = span.nextElementSibling;
                if (!next || !next.hasAttribute('data-sweet-type-span')) continue;
                // 直前に空白テキストノードが挟まっている場合は境界ではない
                if (span.nextSibling !== next) continue;

                var a = { types: classify(Array.from(span.textContent).pop()), text: span.textContent };
                var b = { types: classify(Array.from(next.textContent)[0]), text: next.textContent };
                span.style.removeProperty('--sweet-type-g');
                span.removeAttribute('data-sweet-type-boundary');
                var nativeTrim = hasNativeTrim && getComputedStyle(span).textSpacingTrim !== 'space-all';
                applyBoundary(span, boundaryOf(
                    a, b, fontInfoOf(span), fontInfoOf(next), nativeTrim));
            }
        }
    }

    // ------------------------------------------------------------------
    // 行末の詰めを打ち消す
    //
    // 負の margin-right は、行末に来ても無視されるわけではない。
    // ブラウザは行の幅を「マージンこみ」で数えるので、負のぶんだけ
    // 「まだ入る」と判断してしまい、結果その字の枠が版面の右へはみ出す。
    // 実測で約物なら 0.27em、かなでも 0.2em ほど出ることがある。
    //
    // 行末に来た span に印を付け、CSS 側でマージンを 0 に戻す。
    // 印を外すと行の幅が変わって折り返し位置が動くことがあるので、
    // 落ち着くまで数回くり返す。
    // ------------------------------------------------------------------
    function markLineEnds(root) {
        var spans = root.querySelectorAll('[data-sweet-type-span]');
        var i, j;

        // 印を外すとレイアウトが戻ってしまうので、いまの状態のまま測り、
        // 「あるべき印」と食い違うところだけ直す。これを落ち着くまでくり返す
        for (var pass = 0; pass < 5; pass++) {
            var lines = new Map();
            for (i = 0; i < spans.length; i++) {
                var rects = spans[i].getClientRects();
                for (j = 0; j < rects.length; j++) {
                    var r = rects[j];
                    if (!r.width) continue;
                    var top = Math.round(r.top);
                    var cur = lines.get(top);
                    if (!cur || r.right > cur.right) lines.set(top, { right: r.right, span: spans[i] });
                }
            }

            var want = new Set();
            lines.forEach(function (v) { want.add(v.span); });

            var changed = false;
            for (i = 0; i < spans.length; i++) {
                var has = spans[i].hasAttribute('data-sweet-type-eol');
                var should = want.has(spans[i]);
                if (has === should) continue;
                changed = true;
                if (should) spans[i].setAttribute('data-sweet-type-eol', '');
                else spans[i].removeAttribute('data-sweet-type-eol');
            }
            if (!changed) break;
        }
    }

    // 本文の行送りを「文字サイズに対する倍率」として書き出す。
    // 欧文を拡大したときに、その行だけ行間が広がるのを CSS 側で打ち消すために使う
    function writeLineHeight(root) {
        var cs = getComputedStyle(root);
        var size = parseFloat(cs.fontSize);
        var lh = parseFloat(cs.lineHeight);   // normal のときは NaN
        if (!size || !lh) return;
        root.style.setProperty('--sweet-type-line-height', (lh / size).toFixed(4));
    }

    // 幅が変われば行末も変わるので、要素ごとに監視しておく
    var observers = new WeakMap();

    function observeLineEnds(root) {
        markLineEnds(root);
        if (observers.has(root) || typeof ResizeObserver !== 'function') return;

        var scheduled = false;
        var ro = new ResizeObserver(function () {
            if (scheduled) return;
            scheduled = true;
            requestAnimationFrame(function () {
                scheduled = false;
                if (root.hasAttribute('data-sweet-type')) markLineEnds(root);
            });
        });
        ro.observe(root);
        observers.set(root, ro);
    }

    /**
     * apply() で挿入した <span> を取り除き、元の DOM 構造に戻す。
     * @param {Element|NodeList|Element[]|string} target
     * @returns {number} 処理した要素の数
     */
    function restore(target) {
        var targets = resolveTargets(target);

        for (var i = 0; i < targets.length; i++) {
            var root = targets[i];
            var spans = root.querySelectorAll('[data-sweet-type-span]');
            for (var j = spans.length - 1; j >= 0; j--) {
                var span = spans[j];
                span.parentNode.replaceChild(document.createTextNode(span.textContent), span);
            }
            root.removeAttribute('data-sweet-type');
            root.style.removeProperty('--sweet-type-line-height');
            var ro = observers.get(root);
            if (ro) { ro.disconnect(); observers.delete(root); }
            root.normalize(); // 隣り合ったテキストノードをまとめる
        }
        return targets.length;
    }

    // ------------------------------------------------------------------
    // 自動適用
    //
    // js を読み込んで .sweet-type を付けるだけで動く。
    // 対象を変えたい場合は script タグに data-sweet-type-selector を書く。
    //   <script src="sweet-type.js" data-sweet-type-selector=".honbun, article p"></script>
    // ------------------------------------------------------------------
    var AUTO_SELECTOR = '.sweet-type, [data-sweet-type]';

    // currentScript は DOMContentLoaded の時点では null になるので、いま読んでおく
    var thisScript = (typeof document !== 'undefined') ? document.currentScript : null;

    function autoInit() {
        apply((thisScript && thisScript.getAttribute('data-sweet-type-selector')) || AUTO_SELECTOR);
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', autoInit, { once: true });
        } else {
            autoInit();
        }
    }

    global.SweetType = {
        apply: apply,
        restore: restore,
        tokenize: tokenize,
        classify: classify,
        measure: measure,
        TYPES: TYPES,
        DEFAULTS: DEFAULTS,
        support: { textSpacingTrim: hasNativeTrim }
    };
})(typeof globalThis !== 'undefined' ? globalThis : this);
