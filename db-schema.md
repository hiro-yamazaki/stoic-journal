# ジャーナルデータベース設計

## コレクション（テーブル）名
journals

## ドキュメント（レコード）構造

| フィールド名         | 型           | 説明                                 | 必須 |
|----------------------|--------------|--------------------------------------|------|
| id                   | string       | 一意なID（Firestoreは自動生成可）    | ○    |
| userId               | string       | ユーザーID（認証導入時）             | ○    |
| createdAt            | string/date  | 作成日時（ISO8601推奨）              | ○    |
| updatedAt            | string/date  | 更新日時（ISO8601推奨）              | ○    |
| theme                | string       | テーマ                               | ○    |
| questions            | array        | 問いと解答の配列（下記参照）         | ○    |
| aiResponse           | string       | AIからのフィードバック（Markdown可） | ○    |
| aiResponsePreview    | string       | AI返答のHTMLプレビュー               | ○    |
| memo                 | string       | メモ・自由記述欄                        |      |

### questions配列の要素

| フィールド名 | 型     | 説明         |
|--------------|--------|--------------|
| question     | string | 問い         |
| answer       | string | 解答         |

---

## 例（JSONイメージ）

```json
{
  "id": "2024-06-01T12:34:56.789Z",
  "userId": "user_abc123",
  "createdAt": "2024-06-01T12:34:56.789Z",
  "updatedAt": "2024-06-02T09:10:11.123Z",
  "theme": "Gratitude",
  "questions": [
    { "question": "What are you grateful for today?", "answer": "Support from my family" },
    { "question": "Why could you feel gratitude?", "answer": "Because I noticed small daily kindnesses." }
  ],
  "aiResponse": "### Feedback\n- ...",
  "aiResponsePreview": "<h3>Feedback</h3>..."
}
```

---

## Firestoreの場合
- コレクション名：`journals`
- 各ドキュメントが上記のJSON構造

## PostgreSQLの場合
- テーブル名：`journals`
- `questions`はJSONB型や別テーブルでリレーションも可 