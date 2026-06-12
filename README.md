# Stoic Journal（ストイック・ジャーナル）

> 一日の問いに答え、頭の中を書き出し、自分自身と対話して内省を深めるジャーナルアプリ。
> Firebase Authentication（Googleログイン）＋ Cloud Firestore で、あなたのジャーナルはクラウドに、ユーザーごとに分離して安全に保存されます。

---

## ① 課題名

**Stoic Journal** — Firebase（Authentication ＋ Cloud Firestore）を活用した内省ジャーナルアプリ

## ② 課題内容（どんな作品か）

「チャットアプリでなくてOK／＋αの挑戦を」という要件を踏まえ、Firebaseの仕組みをフル活用した内省ジャーナルです。

- **Googleログイン**（未ログインで `index.html` を開くと `login.html` へ自動リダイレクト）
- テーマ・2つの「問いと答え」・メモで**ジャーナルを作成**（Cloud Firestore にユーザー別CRUD）
- **自分との対話**：「頭の中にあるものをすべて書き出す」→ カードが積み上がる → 各書き出しに **「コメント」** で対話的に深掘り。Firestore の **`onSnapshot`** でリアルタイム反映（授業05のチャット `onChildAdded` を応用）
- **初回ログインでサンプルを2〜3件**自動投入（最初の画面を空にしない）
- **AIプロンプトのコピー**：保存 → 省察プロンプトを生成してコピー → 外部AIに貼る（APIキー不要方式）

## ③ デプロイURL

- リポジトリ：https://github.com/hiro-yamazaki/stoic-journal
- GitHub Pages：https://hiro-yamazaki.github.io/stoic-journal/

> ※ 課題ルールに従い **Firebase の Key を GitHub に載せていない**ため、Pages版は動作しません（講師アナウンス「デプロイURLは動かない状態でOK」に準拠）。動作確認は **ローカル**、または **Firebase Hosting にデプロイした版** で行います。

## ④ ログイン用ID または Password

- **Googleアカウントでログイン**（ID/PW の入力は不要）

## ⑤ 工夫した点・こだわった点

- **Firebase Authentication（Googleログイン）** による認証必須化
- **Cloud Firestore のユーザー別データ分離**（全 read/write を `userId == ログインユーザー` に限定）
- **`firestore.rules` をリポジトリに同梱**し、セキュリティモデルを明示（コードだけでなく守りも見せる）
- **自分との対話**を `onSnapshot` のリアルタイム購読で実装（05の学びの応用。書き出し・コメントが即時反映）
- **初回サンプル投入**で「最初の体験」を設計（`localStorage` フラグで再投入を防止、既存ユーザーには影響なし）
- **キーを Git に載せない設計**（`firebase.js` を `.gitignore`、`firebase.example.js` をテンプレートとして同梱）
- **XSS 配慮**（ユーザー入力は `.textContent` で描画）、**DBスキーマ**を `db-schema.md` に明文化

## ⑥ 難しかった点・次回トライしたいこと

- **認証状態の制御**：`onAuthStateChanged` の監視と、ログイン後のデータ取得タイミングの調整
- **Firestore のユーザー別クエリ ＋ サブコレクション設計**（対話を `journals/{id}/dialogue` に分離）
- 次回：日時の相対表記、タグ・検索、エクスポート（JSON）、対話のさらなる深掘り

## ⑦ フリー項目（感想など）

授業の Firebase チャットサンプル（Realtime Database）を出発点に、**Firestore ＋ 認証**へ踏み込み、「毎日の内省を記録し、自分自身と対話して深める」という自分のテーマでアプリに仕立てました。05で学んだ「追記型 ＋ リアルタイム購読 ＝ 会話UI」を、`onSnapshot` で「自分との対話」として再現したのが今回の挑戦です。

---

## 使用技術

- HTML / CSS / JavaScript
- **Firebase 9.22.2**（Authentication / Cloud Firestore, compat SDK / `onSnapshot` リアルタイム）
- marked.js（Markdown 描画）／ yakuhanjp（約物詰め）

## ファイル構成

```text
stoic-journal/
├── index.html            メイン画面（要ログイン）
├── login.html            Googleログイン
├── firebase.example.js   Firebase 設定テンプレート（コピーして firebase.js を作る）
├── journalStorage.js     Firestore CRUD ＋ 対話サブコレクション
├── script.js             UIロジック（ジャーナル／自分との対話／サンプル投入）
├── style.css
├── firestore.rules       セキュリティルール（ユーザー別保護）
├── db-schema.md          DB設計ドキュメント
├── LICENSE               MIT License
└── README.md
  ※ firebase.js（実キー）と firebase.json / .firebaserc（Hosting設定）は .gitignore 済み・非公開
```

## ローカルでの動かし方

1. `cp firebase.example.js firebase.js` で設定ファイルを作成し、自分の Firebase プロジェクトの値を記入
2. Firebase コンソールで **Authentication（Googleプロバイダ）** と **Cloud Firestore** を有効化し、`firestore.rules` の内容をルールに適用
3. ローカルサーバーで起動（例：`python3 -m http.server 8000`）し、`http://localhost:8000/login.html` を開く
   - ※ 認証ポップアップやパスの都合上、`file://` 直開きではなくサーバー経由（localhost）を推奨
4. **Googleでログイン** → ジャーナル作成・自分との対話

## セキュリティ（Firestore ルール）

`firestore.rules` を参照。要点は次のとおり：

- **未ログインユーザーは一切アクセス不可**
- 各ユーザーは **自分の `userId` のジャーナル**と、その配下の**対話**のみ読み書き可能

→ apiKey が（どんなデプロイでも）ブラウザに見える性質のものであっても、**他人のジャーナルは閲覧・改変できません**。データを守るのはルールです。

## Firebase Hosting（動く公開版・任意）

GitHub をキー無しに保ったまま「動く公開URL」が必要な場合は、Firebase Hosting にデプロイします：

```bash
npx firebase-tools login
npx firebase-tools deploy --only hosting
```

`firebase.json` / `.firebaserc` はローカル専用（Gitには含めない）。デプロイ版はランタイムで設定が読み込まれて動作します。

## ライセンス

MIT License（`LICENSE` を参照）
