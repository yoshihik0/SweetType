(function (global) {
    'use strict';

    class ChromeFolderStorage {
        constructor(options = {}) {
            this.dbName = options.dbName || 'chrome-folder-storage';
            this.dbVersion = options.dbVersion || 1;
            this.storeName = options.storeName || 'handles';
            this.handleKey = options.handleKey || 'directory';
            this.pickerId = options.pickerId || 'workspace';
            this.directoryHandle = null;
            this.writeQueue = Promise.resolve();
        }

        static isSupported() {
            // IndexedDB が無くても現在のタブ中の読み書きはできる。
            return typeof global.showDirectoryPicker === 'function';
        }

        openDb() {
            return new Promise((resolve, reject) => {
                if (!global.indexedDB) {
                    reject(new Error('IndexedDB を利用できません'));
                    return;
                }
                const request = global.indexedDB.open(this.dbName, this.dbVersion);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        db.createObjectStore(this.storeName);
                    }
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error || new Error('IndexedDB を開けませんでした'));
            });
        }

        async remember(handle) {
            const db = await this.openDb();
            try {
                await new Promise((resolve, reject) => {
                    const tx = db.transaction(this.storeName, 'readwrite');
                    tx.objectStore(this.storeName).put(handle, this.handleKey);
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => reject(tx.error || new Error('フォルダを記憶できませんでした'));
                    tx.onabort = () => reject(tx.error || new Error('フォルダの記憶が中断されました'));
                });
            } finally {
                db.close();
            }
        }

        async recall() {
            try {
                const db = await this.openDb();
                try {
                    return await new Promise((resolve, reject) => {
                        const tx = db.transaction(this.storeName, 'readonly');
                        const request = tx.objectStore(this.storeName).get(this.handleKey);
                        request.onsuccess = () => resolve(request.result || null);
                        request.onerror = () => reject(request.error || new Error('フォルダを復元できませんでした'));
                    });
                } finally {
                    db.close();
                }
            } catch (error) {
                console.warn('保存済みフォルダの復元に失敗しました:', error);
                return null;
            }
        }

        async ensurePermission(handle, requestPermission) {
            const options = { mode: 'readwrite' };
            let permission = await handle.queryPermission(options);
            if (permission !== 'granted' && requestPermission) {
                permission = await handle.requestPermission(options);
            }
            return permission === 'granted';
        }

        async connect(handle, options = {}) {
            if (!handle) return false;
            const granted = await this.ensurePermission(handle, !!options.requestPermission);
            if (!granted) return false;
            this.directoryHandle = handle;
            // IndexedDB の利用に失敗しても、現在のタブでは保存を続けられる。
            try {
                await this.remember(handle);
            } catch (error) {
                console.warn('フォルダを次回用に記憶できませんでした:', error);
            }
            return true;
        }

        async pick() {
            if (!ChromeFolderStorage.isSupported()) {
                throw new Error('このブラウザはフォルダ保存に対応していません（Chrome を使用してください）');
            }
            const previous = this.directoryHandle || await this.recall();
            const options = { id: this.pickerId, mode: 'readwrite' };
            if (previous) options.startIn = previous;
            try {
                return await global.showDirectoryPicker(options);
            } catch (error) {
                // 古い Chrome では startIn に保存済みハンドルを渡せない場合がある。
                if (!(error instanceof TypeError) || !options.startIn) throw error;
                delete options.startIn;
                return global.showDirectoryPicker(options);
            }
        }

        // 新しい作業フォルダを作るときは、前回の作業フォルダではなく
        // その親になる場所を選んでもらう。
        async pickParent() {
            if (!ChromeFolderStorage.isSupported()) {
                throw new Error('このブラウザはフォルダ保存に対応していません（Chrome を使用してください）');
            }
            return global.showDirectoryPicker({ id: this.pickerId + '-parent', mode: 'readwrite' });
        }

        async readText(name) {
            if (!this.directoryHandle) throw new Error('保存先フォルダが未接続です');
            const handle = await this.directoryHandle.getFileHandle(name, { create: false });
            return (await handle.getFile()).text();
        }

        async writeText(name, contents) {
            if (!this.directoryHandle) throw new Error('保存先フォルダが未接続です');
            const handle = await this.directoryHandle.getFileHandle(name, { create: true });
            const writable = await handle.createWritable();
            try {
                await writable.write(contents);
                await writable.close();
            } catch (error) {
                try { await writable.abort(); } catch (_) { /* close/abort 済み */ }
                throw error;
            }
        }

        writeFiles(files) {
            const entries = Object.entries(files);
            const write = async () => {
                for (const [name, contents] of entries) {
                    await this.writeText(name, contents);
                }
            };
            // 前回の失敗でキューを止めず、次の変更は再度保存できるようにする。
            const pending = this.writeQueue.catch(() => {}).then(write);
            this.writeQueue = pending;
            return pending;
        }
    }

    global.ChromeFolderStorage = ChromeFolderStorage;
})(window);
