// Stoic Journal — Cloud Functions（Claude API プロキシ）
// APIキーは Secret(ANTHROPIC_API_KEY) で管理し、コード・GitHub には一切含めない。

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const Anthropic = require("@anthropic-ai/sdk");

admin.initializeApp();
const db = admin.firestore();

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
const MODEL = "claude-opus-4-8"; // 原価を抑えるなら "claude-sonnet-4-6" / "claude-haiku-4-5" に変更可
const REGION = "asia-northeast1";
const CALL_OPTS = { secrets: [ANTHROPIC_API_KEY], region: REGION, timeoutSeconds: 120 };

// --- 所有者検証つきでジャーナルを取得 ---
async function getOwnedJournal(uid, journalId) {
  const snap = await db.collection("journals").doc(journalId).get();
  if (!snap.exists) throw new HttpsError("not-found", "ジャーナルが見つかりません");
  const data = snap.data();
  if (data.userId !== uid) throw new HttpsError("permission-denied", "このジャーナルへの権限がありません");
  return { id: snap.id, ...data };
}

function journalContext(j) {
  let ctx = `テーマ: ${j.theme || "（未入力）"}\n`;
  (j.questions || []).forEach((q, i) => {
    if (q && (q.question || q.answer)) {
      ctx += `問い${i + 1}: ${q.question || ""}\n私の解答${i + 1}: ${q.answer || ""}\n`;
    }
  });
  if (j.memo) ctx += `メモ: ${j.memo}\n`;
  return ctx;
}

function textOf(msg) {
  return (msg.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

// ============================================================
// (a) 自分との対話に「賢人の声」を返す
//     → dialogue サブコレクションに書き込み、クライアントは onSnapshot で受信
// ============================================================
exports.sageReply = onCall(CALL_OPTS, async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError("unauthenticated", "ログインが必要です");
  const journalId = request.data && request.data.journalId;
  if (!journalId) throw new HttpsError("invalid-argument", "journalId が必要です");

  const journal = await getOwnedJournal(uid, journalId);

  // これまでの書き出し・コメントを文脈として集める
  const dlg = await db.collection("journals").doc(journalId)
    .collection("dialogue").orderBy("createdAt", "asc").get();
  let history = "";
  dlg.forEach((d) => {
    const m = d.data();
    if (m.role === "sage") history += `賢人: ${m.text}\n`;
    else if (m.text) history += `自分: ${m.text}\n`;
    (m.comments || []).forEach((c) => { history += `（自分の追記）: ${c.text}\n`; });
  });

  const system =
    "あなたはストア派の賢人（セネカ、エピクテトス、マルクス・アウレリウスの精神）です。" +
    "相手のジャーナルと書き出しを踏まえ、賢人として一人称で、簡潔に（3〜5文）、対話的に返答してください。" +
    "説教ではなく、ときに問い返しを交え、相手が自分で気づけるよう導きます。賢人の返答本文のみを出力してください。";

  let text;
  try {
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      system,
      messages: [{
        role: "user",
        content: `# ジャーナル\n${journalContext(journal)}\n# これまでの対話\n${history || "（まだありません）"}\n\n上記を踏まえ、賢人として返答してください。`,
      }],
    });
    text = textOf(msg);
  } catch (e) {
    throw new HttpsError("internal", "AI応答の生成に失敗しました: " + (e.message || e));
  }
  if (!text) throw new HttpsError("internal", "AIの応答が空でした");

  await db.collection("journals").doc(journalId).collection("dialogue").add({
    role: "sage",
    text,
    createdAt: new Date().toISOString(),
  });

  return { ok: true };
});

// ============================================================
// (b) AIフィードバックをワンクリック生成 → journals.aiResponse に保存
// ============================================================
exports.generateFeedback = onCall(CALL_OPTS, async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) throw new HttpsError("unauthenticated", "ログインが必要です");
  const journalId = request.data && request.data.journalId;
  if (!journalId) throw new HttpsError("invalid-argument", "journalId が必要です");

  const journal = await getOwnedJournal(uid, journalId);

  const system =
    "あなたはストア派哲学と心理学に通じたメンターです。相手の内省ジャーナルに対し、Markdownで簡潔に返してください。" +
    "構成は (1) ストア派の視点からの分析 (2) 見いだせる強みと成長の機会 (3) 明日に試せる小さな実践を1つ。" +
    "冒頭に `# フィードバック` の見出しを置き、温かく具体的に。";

  let text;
  try {
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      system,
      messages: [{
        role: "user",
        content: `以下の私のジャーナルにフィードバックをください。\n\n${journalContext(journal)}`,
      }],
    });
    text = textOf(msg);
  } catch (e) {
    throw new HttpsError("internal", "フィードバックの生成に失敗しました: " + (e.message || e));
  }
  if (!text) throw new HttpsError("internal", "AIの応答が空でした");

  await db.collection("journals").doc(journalId).set(
    { aiResponse: text, updatedAt: new Date().toISOString() },
    { merge: true }
  );

  return { ok: true, feedback: text };
});
