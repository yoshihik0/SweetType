import { readFile, writeFile } from 'node:fs/promises';

const previewPath = new URL('../template/preview.html', import.meta.url);
const editorPath = new URL('../sweet-type.html', import.meta.url);
const start = '    <template id="embedded-template-preview">\n';
const end = '    </template>';

const [preview, editor] = await Promise.all([
    readFile(previewPath, 'utf8'),
    readFile(editorPath, 'utf8'),
]);
const from = editor.indexOf(start);
const to = from < 0 ? -1 : editor.indexOf(end, from + start.length);
if (from < 0 || to < 0) throw new Error('埋め込みプレビューの位置を見つけられませんでした。');

const embedded = preview.trimEnd() + '\n';
const next = editor.slice(0, from + start.length) + embedded + editor.slice(to);
if (next === editor) {
    console.log('埋め込みプレビューは最新です。');
} else if (process.argv.includes('--check')) {
    console.error('template/preview.html と埋め込みプレビューが一致しません。');
    process.exitCode = 1;
} else {
    await writeFile(editorPath, next);
    console.log('template/preview.html を sweet-type.html へ同期しました。');
}
