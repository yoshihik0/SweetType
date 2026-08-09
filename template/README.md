# 新規作業フォルダ用テンプレート

空のフォルダを作業フォルダに指定すると、ここにある `preview.html`・`settings.json`・`sweet-type.js` をそのフォルダへコピーします。

`preview.html` を変更した後は、`node scripts/sync-template-preview.mjs` を実行して、ファイルを直接開いた場合の新規フォルダ用本文も更新してください。

- 既定本文を変える：`preview.html` を編集（複数の `<p>` を書ける）
- 既定の組版設定を変える：`settings.json` を編集
- 案件へ渡す文字分割ライブラリを変える：`sweet-type.js` を編集

`sweet-type.css` はツールがプレビューと書き出しの土台として使うCSSです。指定した作業フォルダへは最初からコピーせず、
設定を変更するか「CSSを保存」を押すと、その案件用の `sweet-type.css` が生成されます。
