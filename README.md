# SweetType

日本語テキストの文字組を編集します。
文字種ごと（漢字・ひらがな・カタカナ・数字・約物など）に分割し、
それぞれを class 付きの `<span>` で包んで、CSS から文字づめを制御できるようにします。

詰め量は canvas `TextMetrics` で**実フォントの字面を実測して**決めるので、書体を変えれば自動的に追随します。

- 設定ツール（ウェブ文字組エディタ） [sweet-type.html](sweet-type.html)

## 使い方

sweet-type.css と sweet-type.js を読み込んで、本文を囲む親要素に `class="sweet-type"` を付けるだけです。

```html
<link rel="stylesheet" href="sweet-type.css">

<div class="sweet-type">
  <p>組版を確認するためのサンプルです。漢字、ABC、123、記号（、。！？）を含みます。</p>
  <p>段落が複数あっても、親要素への指定一つで処理されます。</p>
</div>

<script src="sweet-type.js"></script>
```

別の要素を対象にしたい場合は、script タグに書きます。

```html
<script src="sweet-type.js" data-sweet-type-selector="article p, .honbun"></script>
```

明示的に呼ぶこともできます。

```js
SweetType.apply('.honbun');
```

### 設定ファイルを作成する

[sweet-type.html](sweet-type.html)（ウェブ文字組エディタ）を開くと、本文・書体・組体裁を指定しながら調整でき、そのまま貼れる CSS が書き出されます。

「字形のベース」は通常字形の実測ツメと、`palt`、`palt + kern`、`halt`、`pwid`、`hwid`、
`fwid`、`font-variant-east-asian: proportional-width` から選べます。
通常字形では約物アキを最終値として扱います。`halt` では自動実測ツメを残したまま約物補正を加算し、
字幅全体が変わる `palt` などでは自動実測ツメを止めて、選んだ字形へ追加補正を重ねます。
また、漢字・ひらがな・カナ・英数字ごとにフォント、大きさ、太さ、アキを設定できます。

#### プレビュー本文

新規作業フォルダの既定の本文は [`preview.html`](preview.html) から読み込みます。
基準の文章を変えたい場合はこのファイルを編集してください。

右側は「プレビュー」と「コード」を切り替えて表示します。「CSSを保存」を押すと、現在生成されている
完全版CSSを選択フォルダの `sweet-type.css` へ即時保存します。

#### フォルダに保存する

「作業フォルダを指定」で案件フォルダを選びます。フォルダ選択画面で新しいフォルダを作成して選ぶこともでき、空のフォルダなら案件用の作業フォルダとして初期化されます。初期化時は `template` にある既定の
本文・設定・`sweet-type.js`を入れ、変更のたびに 1 秒後へまとめて自動保存します。`sweet-type.css` は新規作成時には入れず、
設定変更または「CSSを保存」で作成されます。同時に、`sweet-type.css` とJavaScriptを読み込む組み込み例の `sample.html` も作成されます。既存の作業フォルダには影響しません。

| ファイル | 内容 |
|---|---|
| `preview.html` | プレビューに使う本文（複数段落可） |
| `sweet-type.css` | そのまま使えるスタイルシート |
| `sweet-type.js` | 文字分割を適用する共通ライブラリ |
| `sample.html` | `sweet-type.css` とJavaScriptを読み込む最小の組み込み例 |
| `settings.json` | 書体・組体裁などの編集設定（本文は含まない） |

作業フォルダのハンドルは IndexedDB に覚えておくので、次に開いたときは権限が残っていれば黙ってつながり、
`settings.json` があれば設定ごと読み戻します。権限が切れていたときは
「前回のフォルダに再接続」を押してください（権限の要求にはユーザー操作が必要で、自動では復帰できません）。

File System Access API を使うので **Chrome 前提**です。


#### スナップショット

名前を付けて設定をまるごと控えておき、ボタンで見比べられます。
保存先フォルダを決めていれば `settings.json` に一緒に書き込まれます。

#### 参考欄で既定の詰め設定と見比べる

右の参考欄は、CSS やフォント側が持っている詰めの設定に切り替えて並べられます。

| 設定 | 内容 |
|---|---|
| ベタ組み | `text-spacing-trim: space-all`。詰めをいっさいしない状態 |
| ブラウザ既定 | 何も指定しない状態 |
| `palt` / `palt` + `kern` | フォントのプロポーショナル字形 |
| `halt` | 約物を半角字形に |
| `pwid` / `hwid` / `fwid` | プロポーショナル幅 / 半角字形 / 全角字形 |
| `font-variant-east-asian: proportional-width` | `pwid` の CSS 標準の書きかた |

**同じ指定でも書体によって効き方がまったく違います。**同じ文章での実測値です。

| | ヒラギノ明朝 | Noto Serif JP |
|---|---|---|
| `palt` | −14.2% | **0%（機能を持っていない）** |
| `halt` | −8.2% | −8.2% |
| `pwid` | −8.7% | −0.5% |
| `hwid` | −33.1% | −0.5% |

Google Fonts が配信する Noto Serif JP は `palt` を持っていないため、`palt` に頼った文字づめは
その書体では何も起きません。ツールは効いていない場合にその旨を表示します。

Noto Serif JP の可変フォントが既定で、任意のウェブフォントも CSS の URL を入れて追加できます。
**実測値は書体ごとに違うので、必ず本番と同じ書体で調整してください。**

## しくみ

JS がやるのは、隣り合う 2 文字の**字面のアキを実測して `--sweet-type-g` として書き出す**ことだけです。
そこから実際の margin を決めるのは CSS なので、**JS を再実行しなくても変数だけで調整できます**。

### 約物は前後それぞれを指定する

約物のアキは「どの約物の、どちら側か」でまったく別物です。
`1946（昭和21）年` を例にとると、`6（` `（昭` `1）` `）年` の 4 箇所はすべて必要な量が違います。
InDesign の文字組みアキ量設定と同じく、**約物 6 種 × 前後 ＋ 約物どうし＝13 箇所**を
それぞれ独立して指定できます。

| 変数 | 対象 | 既定 |
|---|---|---|
| `--sweet-type-open-before` / `--sweet-type-open-after` | `「（〔` の前 / 後 | 0 / 0 |
| `--sweet-type-close-before` / `--sweet-type-close-after` | `」）〕` の前 / 後 | 0 / 0 |
| `--sweet-type-kuten-before` / `--sweet-type-kuten-after` | `。．` の前 / 後 | 0 / 0.25em |
| `--sweet-type-touten-before` / `--sweet-type-touten-after` | `、，` の前 / 後 | 0 / 0.125em |
| `--sweet-type-nakaten-before` / `--sweet-type-nakaten-after` | `・：；` の前 / 後 | 0 / 0 |
| `--sweet-type-bang-before` / `--sweet-type-bang-after` | `！？` の前 / 後 | 0 / 0.25em |
| `--sweet-type-yakumono-pair` | 約物どうし（`」「` など） | 0.125em |
| `--sweet-type-eol-yakumono` | 行末に来た約物 | 0 |

0.5em＝二分（JIS のベタ組み）、0.25em＝四分、0＝約物を詰めきる、です。
既定値はJISのベタ組みです。

**アキ量の数えかたは InDesign と同じ**で、「その約物自身が持っている余白」を指します。
隣に来る字の字面は数えません。

```
約物の margin = 指定したアキ − その約物自身の余白
```

こうしておくと、隣の字が変わってもアキが動きませんし（`家！` と `か？` が揃う）、
IDML から読み込んだ値をそのまま使えます。指定した値はそのまま実際のアキになり、
詰める方向だけでなく広げる方向にも効きます。

かな・漢字どうしだけは、隣り合う字面のアキを目標 `--sweet-type-target` に向けて
強度 `--sweet-type-strength` の分だけ詰める、という別の式です。

### InDesign の設定

InDesign の IDML を読み込むこともできます。IDML は ZIP + XML の公開形式なので、
`DecompressionStream` で展開して `designmap.xml` の `<MojikumiTable>` を読んでいます。
外部ライブラリは使っていません。

**InDesign は各アキに最小・最適・最大の 3 値を持ち、その範囲で行の調整をします。**CSS の margin は固定値で、ブラウザの `text-align: justify` に
「約物のアキで吸収させる」とは指示できないため、読み込めるのは**最適値だけ**です。

### 行末の扱い

負の `margin-right` は行末でも無視されません。ブラウザは行の幅をマージンこみで数えるので、
負のぶんだけ「まだ入る」と判断してしまいます。そこで JS が行末の span に `data-sweet-type-eol` を付け、
CSS 側で打ち消しています。

扱いは 2 通りに分かれます。

**約物の手前の字と、かな詰め**は打ち消します。

**`」）。、` の後ろ**は、本文中と同じアキを残すと行末の読点が版面の右端に届かず内側に
引っ込んで見えます（実測で読点が 3.2px、句点が 5.5px 手前で止まっていました）。
そこで行末では約物の余白を `--sweet-type-eol-yakumono` まで詰めきります。既定の 0 で字面が
版面にちょうど揃い、負の値にすると版面の外へぶら下がります。

```css
:root {
    /* 約物のベース */
    --sweet-type-base-feature: normal;  /* normal / "palt" / "halt" など */
    --sweet-type-base-variant: normal;  /* proportional-width など */
    --sweet-type-punctuation-manual: 0; /* 字形機能へ約物補正を加算するとき 1 */
    --sweet-type-auto-tsume: 1;         /* 字形機能の幅を土台にするとき 0 */
    --sweet-type-spacing-trim: trim-start;

    --sweet-type-eol-yakumono: 0em;      /* 版面に揃える（既定） */
    /* --sweet-type-eol-yakumono: -0.25em;   ぶら下げる */
}
```

### ブラウザとの分担

`sweet-type.css` は `text-spacing-trim: trim-start` を指定しています。これが引き受けるのは 2 つです。

1. **行頭に来た始め括弧を版面の左端に揃える**
2. 約物が連続したとき二分詰める

とくに 1 は「行頭かどうか」で処理を変える必要があり、CSS のセレクタでも JS でも安定して書けません。
2 でブラウザが詰める 0.5em は JS 側が実測値から差し引くので、二重には詰まりません。

### 詰めをすべて margin-right で与えている理由

負の `margin-left` を使うと、その文字が行頭に来たときに版面の外へはみ出すので、
すべて「左側の文字の margin-right」として与えています。行末側は上記のとおり別に処理しています。

### 出力

```html
<p data-sweet-type>
  <span class="sweet-type__kanji" data-sweet-type-span style="--sweet-type-g:0.163em">彼</span>
  <span class="sweet-type__hiragana" data-sweet-type-span data-sweet-type-boundary="open-before" style="--sweet-type-g:0.763em">は</span>
  <span class="sweet-type__open" data-sweet-type-span data-sweet-type-boundary="open-after" style="--sweet-type-g:0.106em">「</span>
  …
</p>
```

## 既存のマークアップ・SEO への影響

処理はクライアント側で走るので、**配信される HTML のソースは変わりません。**

DOM 上の挙動は次のとおりです（すべて Chrome で実測）。

| 項目 | 結果 |
|---|---|
| `<a>` / `<strong>` などの子要素 | 保持される（href もスタイルも有効） |
| `textContent` | 分割前と完全に一致 |
| ページ内検索（Ctrl+F） | span をまたいで一致する |
| 選択・コピー | 元のテキストと一致 |
| 改行位置・禁則処理 | 分割しない場合と完全に一致 |

`mode: 'class'` を指定すると、1 文字ずつではなく文字種の連なりごとに span を作ります。
span 数は減りますが、実測にもとづく詰めは効かなくなります。

## API

| | |
|---|---|
| `SweetType.apply(target, options?)` | 対象を分割する。`target` は CSS セレクタ / 要素 / 要素リスト |
| `SweetType.restore(target)` | 挿入した span を取り除いて元の DOM に戻す |
| `SweetType.tokenize(text)` | DOM を触らずに `[{ types, text }, …]` を返す |
| `SweetType.classify(char)` | 1 文字の文字種名を配列で返す |
| `SweetType.measure(font, char)` | 字送りとサイドベアリングを em で返す |
| `SweetType.TYPES` | 文字種名の一覧 |

### options

| キー | 既定値 | 内容 |
|---|---|---|
| `mode` | `'metrics'` | `'metrics'` は 1 文字ずつ span にして実測値を書き出す。`'class'` は文字種の連なりごとに span にするだけ |
| `prefix` | `'sweet-type__'` | class 名の接頭辞 |
| `skipSelector` | `'script, style, textarea, code, pre, rt, [data-sweet-type-skip]'` | この中のテキストは処理しない |
| `wrapSpace` | `false` | 半角スペース・改行も span で包むか |
| `trimLineEnds` | `true` | 行末に来た詰めを打ち消して、字が版面からはみ出さないようにする |

`apply()` は何度呼んでも結果が変わりません。`restore()` → `apply()` で元通りに戻ります。
Web フォントを使っている場合は `document.fonts.ready` の後で自動的に測り直します。

## 変数一覧

```css
:root {
    /* かな・漢字どうし */
    --sweet-type-target: 0.04em;        /* 目標のアキ */
    --sweet-type-strength: 0.7;         /* 詰め強度。0 でベタ組み、1 で目標まで詰める */
    --sweet-type-max: 0.25em;           /* 1 箇所あたりの上限 */

    /* 約物まわり（約物ごと・前後ごと） */
    --sweet-type-open-before: 0em;    --sweet-type-open-after: 0em;
    --sweet-type-close-before: 0em;   --sweet-type-close-after: 0em;
    --sweet-type-kuten-before: 0em;   --sweet-type-kuten-after: 0.25em;
    --sweet-type-touten-before: 0em;  --sweet-type-touten-after: 0.125em;
    --sweet-type-nakaten-before: 0em; --sweet-type-nakaten-after: 0em;
    --sweet-type-bang-before: 0em;    --sweet-type-bang-after: 0.25em;
    --sweet-type-yakumono-pair: 0.125em;
    --sweet-type-eol-yakumono: 0em;     /* 行末に来た約物。0 で版面に揃う */

    /* 全体の字間 */
    --sweet-type-tracking: 0em;         /* かな・漢字の字送りをまとめて広げる */

    /* 文字種別。font/weight は inherit、大きさは 1、アキは 0em が既定 */
    --sweet-type-kanji-font: inherit;
    --sweet-type-kanji-scale: 1;
    --sweet-type-kanji-weight: inherit;
    --sweet-type-kanji-spacing: 0em;
    --sweet-type-hiragana-font: inherit;
    --sweet-type-hiragana-scale: 1;
    --sweet-type-hiragana-weight: inherit;
    --sweet-type-hiragana-spacing: 0em;
    --sweet-type-katakana-font: inherit;
    --sweet-type-katakana-scale: 1;
    --sweet-type-katakana-weight: inherit;
    --sweet-type-katakana-spacing: 0em;
    --sweet-type-latin-font: inherit;
    --sweet-type-latin-scale: 1;
    --sweet-type-latin-weight: inherit;
    --sweet-type-latin-spacing: 0em;

    /* 和欧間 */
    --sweet-type-autospace: 0.125em;    /* 和欧間アキ。0.25em で JIS の四分アキ */
}
```

既定値では本文がベタ組みより 12% 前後詰まります（`palt` は同じ文章で約 11%）。

### 全体の字間を広げる

`--sweet-type-tracking` で、かな・漢字の字送りをまとめて広げられます。
**約物のアキはこの分を差し引くので、指定した値のまま保たれます。**
「全体を少しあけて、約物は詰める」という組み方ができます。

```css
:root {
    --sweet-type-tracking: 0.05em;   /* 全体を五十分の一だけあける */
    --sweet-type-kuten-after: 0.25em; /* 句点の後は四分のまま */
}
```

実測でも、かな同士のアキだけが `+0.05em` 増え、句点の後は `0.25em` のまま保たれます。

### 文字種ごとのフォント・大きさ・太さ・アキ

漢字・ひらがな・カナ・英数字は、それぞれ `*-font`、`*-scale`、`*-weight`、`*-spacing`
を持ちます。カナには半角カナ・長音・繰返し、英数字には半角／全角の英字・数字を含みます。

文字種別の書体やサイズを変えた場合も、JavaScript は分割後の各 span に適用された実際の書体・
ウェイト・サイズを左右別に取得して測り直します。異なる書体が隣り合う境界でも、右側の余白を
左側の em へ換算してから詰め量を求めます。

文字を大きくすると 2 つの副作用が出ます。

**線が太く見える** — `--sweet-type-latin-weight` で細めに戻せます。何も指定しないときの標準は `400`、
太字は `700` です。`font-weight` は可変フォントの wght 軸に対応しているので `350` のような
中間値も効きます（静的フォントでは持っているウェイトに丸められます）。

**その行だけ行間が広がる** — 拡大した欧文が行の高さを押し広げるためです。
`sweet-type.css` は文字種 span に `line-height: 0` を指定して、行の高さ計算から外しています。
段落自身の strut が行の高さを決めるので、どの倍率でも行間は変わりません
（実測：補正なしだと 1.2 倍で 144px → 166px、補正ありなら 144px のまま）。

```css
:root {
    --sweet-type-hiragana-font: "Noto Sans JP", sans-serif;
    --sweet-type-hiragana-scale: 1.05;
    --sweet-type-hiragana-weight: 450;
    --sweet-type-hiragana-spacing: 0.02em;
    --sweet-type-latin-scale: 1.05;
    --sweet-type-latin-weight: 350;
}
```

## 文字種

| class | 内容 |
|---|---|
| `sweet-type__hiragana` / `sweet-type__katakana` / `sweet-type__kana-half` | 平仮名 / 片仮名 / 半角カナ |
| `sweet-type__small` | 小書きの仮名（上記と併記。例: `class="sweet-type__hiragana sweet-type__small"`） |
| `sweet-type__kanji` | 漢字（CJK 拡張・互換漢字・〆〇 を含む） |
| `sweet-type__open` / `sweet-type__close` | 始め括弧類 / 終わり括弧類 |
| `sweet-type__kuten` / `sweet-type__touten` | 句点類 / 読点類 |
| `sweet-type__nakaten` | 中点類（・：；） |
| `sweet-type__yakumono` | 区切り約物（！？） |
| `sweet-type__choon` / `sweet-type__repeat` | 長音記号 / 繰返し記号（ゝゞヽヾ々〻） |
| `sweet-type__hyphen` / `sweet-type__dash` | ハイフン類 / ダッシュ・三点リーダ類 |
| `sweet-type__latin` / `sweet-type__digit` / `sweet-type__latin-punct` | 半角欧字 / 半角数字 / 半角約物 |
| `sweet-type__latin-full` / `sweet-type__digit-full` / `sweet-type__punct-full` | 全角英字 / 全角数字 / その他の全角記号 |
| `sweet-type__space-ja` / `sweet-type__space` | 和字間隔 / 半角空白 |
| `sweet-type__other` | 上記以外（絵文字など） |

分類は JIS X 4051（日本語文書の組版方法）の文字クラスをおおむね踏襲しています。
詰めの対象になるのは全角の和文と約物だけです。欧文と半角数字はフォントが字幅と
カーニングを持っているので触りません。

## 制限

- `font-feature-settings: "palt"` とは併用しないでください。二重に詰まります。
  `sweet-type.css` は `[data-sweet-type]` で `font-feature-settings: normal` にしています。
- `hanging-punctuation` は Chromium が未対応ですが、行末の句読点は
  `-after` 系のアキがそのまま消えることで版面に揃います。
- `text-spacing-trim` 非対応のブラウザでは、行頭の始め括弧が字下がりのままになります。
  約物の詰め自体は JS が実測値から算出するので効きます。
- 小書きの仮名が行頭に来るのが気になる場合は `line-break: strict` を指定してください。

## 動作環境

`Intl.Segmenter`（無い場合はコードポイント単位にフォールバック）、canvas `TextMetrics`、
`text-spacing-trim`、CSS カスタムプロパティ、Unicode プロパティエスケープを使用しています。
