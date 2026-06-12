# Stoic Journal（ストイック・ジャーナル）

> 一日の問いに答え、AIからの新しい視点で内省を深めるジャーナルアプリ。
> Firebase Authentication（Googleログイン）＋ Cloud Firestore で、自分だけのジャーナルがクラウドに安全に残ります。

---

## ① 課題名

**Stoic Journal** — Firebase を活用した内省ジャーナルアプリ

## ② 課題内容（どんな作品か）

「チャットアプリでなくてもOK／＋αの挑戦を」という課題要件を踏まえ、**Firebase の仕組み（Authentication ＋ Cloud Firestore）をフル活用**した内省ジャーナルアプリを制作しました。

- **Googleアカウントでログイン**（Firebase Authentication）。未ログインで `index.html` を開くと `login.html` へ自動リダイレクト
- テーマ・2つの「問いと答え」・メモを入力して **ジャーナルを作成**
- **Cloud Firestore にユーザー別保存**（CRUD：作成・一覧・編集・削除）
- **「保存＆AIプロンプトをコピー」**：内省を深めるためのプロンプトを自動生成してクリップボードへコピー → ChatGPT 等に貼り付け → 返ってきたフィードバックを貼り戻すと **Markdown で整形表示**

## ③ アプリのデプロイURL

https://hiro-yamazaki.github.io/stoic-journal/

> ※ 課題ルールに従い **Firebase の Key を GitHub に載せていない**ため、デプロイURLでは動作しません（講師アナウンス「デプロイURLは動かない状態でOK」に準拠）。動作は **課題発表会でローカルにて**お見せします。

## ④ ログイン用ID または Password

- **Googleアカウントでログイン**（ID/PW の入力は不要）

## ⑤ 工夫した点・こだわった点

- **Firebase Authentication（Googleログイン）** による認証必須化。未ログインアクセスは自動でログイン画面へ
- **Cloud Firestore によるユーザー別データ分離**：全 read/write を `userId == ログインユーザー` に限定（`journalStorage.js`）
- **DBスキーマ設計を明文化**（`db-schema.md`。Firestore / PostgreSQL 両対応で記述）
- **AIフィードバックを外部APIキー不要で実装**：「プロンプト生成 → コピー → 外部AIに貼る」方式により、安全かつ汎用的に内省支援を実現
- **Markdown 整形表示**（marked.js）、ローディング表示・スナックバー等の UX 配慮
- **キーを Git に載せない設計**：`firebase.js` を `.gitignore` し、`firebase.example.js` をテンプレートとして同梱

## ⑥ 難しかった点・次回トライしたいこと

- **認証状態の制御**：`onAuthStateChanged` でログイン状態を監視し、未ログイン時のリダイレクトと、ログイン後のデータ取得タイミングを合わせる部分の理解が必要だった
- **Firestore のユーザー別クエリ**：`where('userId', '==', uid)` ＋ `orderBy('createdAt', 'desc')` の組み合わせと、ドキュメントID設計
- 次回：認証連携のさらなる本番化、複数AIプロバイダ対応、タグ・検索・集計ビューの追加

## ⑦ フリー項目（感想など）

授業の Firebase チャットサンプル（Realtime Database）を出発点に、**Firestore ＋ 認証**へ踏み込み、「毎日の内省を記録し、AIの視点で深める」という自分のテーマでアプリに仕立てました。`localStorage` 課題で感じた「データを安全に・ユーザー別に持ちたい」という欲求が、そのまま Firestore ＋ Auth の学習動機になりました。

---

## 使用技術

- HTML / CSS / JavaScript
- **Firebase 9.22.2**（Authentication / Cloud Firestore, compat SDK）
- marked.js（Markdown 描画）／ yakuhanjp（約物詰め）

## ファイル構成

```text
stoic-journal/
├── index.html            メイン画面（要ログイン）
├── login.html            Googleログイン
├── firebase.example.js   Firebase 設定テンプレート（コピーして firebase.js を作る）
├── journalStorage.js     Firestore CRUD（ユーザー別）
├── script.js             UIロジック
├── style.css
├── db-schema.md          DB設計ドキュメント
└── README.md
  ※ firebase.js（APIキーを含む実設定）は .gitignore 済み・非公開
```

## ローカルでの動かし方

1. `cp firebase.example.js firebase.js` で設定ファイルを作成し、自分の Firebase プロジェクトの値を記入
2. Firebase コンソールで **Authentication（Googleプロバイダ）** と **Cloud Firestore** を有効化
3. ローカルサーバーで起動（例：`python3 -m http.server 8000`）し、`http://localhost:8000/login.html` を開く
   - ※ 認証ポップアップやパスの都合上、`file://` 直開きではなくサーバー経由（localhost）を推奨
4. **Googleでログイン** → ジャーナルを作成・保存

## Firebase の Key の取り扱いについて

本リポジトリは課題ルール「**Firebase の Key は GitHub に載せない**」に従い、実際の設定を持つ `firebase.js` を `.gitignore` で除外しています。動作確認はローカルの `firebase.js`（各自で作成）を用いて行います。
