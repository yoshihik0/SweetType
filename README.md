# SweetType

日本語テキストの文字組を編集します。
SweetType（本文版）とSweetType-h（見出し版） があります。

現在のセットバージョンは **1.1** です。正本は [VERSION](VERSION)、変更内容は [CHANGELOG.md](CHANGELOG.md) で管理します。

## SweetType（本文版）

文字種ごと（漢字・ひらがな・カタカナ・数字・約物など）に分割し、
それぞれを class 付きの `<span>` で包んで、CSS から文字づめを制御できるようにします。

- 設定ツール（ウェブ文字組エディタ）: [sweet-type.html](sweet-type.html)

## 見出し版（SweetType-h）

見出し文字、一字ずつの編集ができます。
横組み・縦組みに対応し、文字ごとに字間、フォント、文字色、文字サイズ、ウェイト、上下位置を設定できます。
特定の文字列に対する設定を行います。

- 設定ツール（見出し用文字組エディタ）: [sweet-type-h.html](sweet-type-h.html)

## SweetType　の使い方

SweetType では、プロジェクトをフォルダで管理しています。
必要なファイルは、フォルダ内に生成されます。

1. `sweet-type.html` （本文版）または、 `sweet-type-h.html`（見出し版）を Chrome ブラウザで開きます。
2. 「作業フォルダを指定」をクリックして、作業用フォルダを指定します。作業を開始するときは、新しいフォルダを作ってそれを指定するとよいでしょう。
3. 編集を行うと、その状態が `settings.json`（本文版）または、　`sweet-type-h-settings.json`　（見出し版）に保存されます。
4. 複数の設定を比較したいときは、スナップショットで設定を保存できます。スナップショット名をクリックすると、設定を切り替えることができます。
5. 「CSSを保存」（本文版）では `sweet-type.css`、「JSを保存」（見出し版）では
   `sweet-type-h-engine.js` と `sweet-type-h-data-title.js` を、それぞれ `sample.html` と一緒に保存します。

作業を再開するときは、「作業フォルダを指定」で希望するフォルダを指定してください。

本文版で表示される文章は、 `preview.html` で管理されています。
画面右の「比較対象」の部分で、編集することもできます。編集は、保存されないので、文章を変えたいときは `preview.html` を編集してください。

## getKerning

見出し版（SweetType-h）では、Adobe Illustratorで設定した文字組の字間設定をデータとして書き出して、読み込むことができます。

Illustratorからの書き出しには、 `getKerning/getKerning.js` を利用してください。

## SweetType（本文版）の本番ページへの組み込み方

CSS・JavaScript ファイルを読み込み、適用する `p` タグの親要素に `sweet-type` class を設定します。
`sample.html` を参考にしてください。

ウェブフォントを使用している場合は、別途読み込む指定を書き加えてください。

CSS ファイル:

```html
<link rel="stylesheet" href="sweet-type.css">
```

JavaScript ファイル:

```html
<script src="sweet-type.js"></script>
```

文字組を利用する部分の `p` タグの親要素:

```html
<div class="sweet-type">
  <p>文章</p>
  <p>文章</p>
</div>
```

## SweetType-h（見出し版）の本番ページへの組み込み方

見出しごとに設定画面の「見出しID」を指定します。既定値は `title` です。

```html
<h1 data-sweet-type-h-title>最初の見出し</h1>
<h2 data-sweet-type-h-section>別の見出し</h2>

<script src="sweet-type-h-engine.js"></script>
<script src="sweet-type-h-data-title.js"></script>
<script src="sweet-type-h-data-section.js"></script>
```

`sweet-type-h-engine.js` はページに一度だけ読み込みます。文字数や文字別設定が異なる見出しは、
`data-sweet-type-h-見出しID` と `sweet-type-h-data-見出しID.js` の組で追加します。

`sample.html` を参考にしてください。

## くわしくは

詳しくは、[info.md](info.md) をご覧ください。
