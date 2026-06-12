const COLLECTION = 'journals';
const DEMO_USER_ID = 'demo_user'; // 本番は認証連携

class FirestoreJournalStorage {
  constructor() {
    this.collection = window.db.collection(COLLECTION);
  }

  // 全ジャーナル取得（認証ユーザーのみ）
  async getAll() {
    const user = window.auth.currentUser;
    if (!user) throw new Error('未認証です');
    const colRef = window.db.collection(COLLECTION);
    const snapshot = await colRef.where('userId', '==', user.uid).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // 追加・更新（idが同じなら上書き）
  async save(entry) {
    const user = window.auth.currentUser;
    if (!user) throw new Error('未認証です');
    const data = { ...entry, userId: user.uid };
    await window.db.collection(COLLECTION).doc(data.id).set(data);
  }

  // 削除
  async delete(id) {
    const user = window.auth.currentUser;
    if (!user) throw new Error('未認証です');
    await window.db.collection(COLLECTION).doc(id).delete();
  }

  // ジャーナルを新規追加
  async addJournal(journal) {
    const user = window.auth.currentUser;
    if (!user) throw new Error('未認証です');
    const doc = {
      ...journal,
      userId: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const ref = await this.collection.add(doc);
    await this.collection.doc(ref.id).set({ id: ref.id }, { merge: true });
    return { ...doc, id: ref.id };
  }

  // ログインユーザーの全ジャーナルを取得
  async getAllJournals() {
    const user = window.auth.currentUser;
    if (!user) throw new Error('未認証です');
    const snap = await this.collection.where('userId', '==', user.uid).orderBy('createdAt', 'desc').get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // ジャーナルを更新
  async updateJournal(id, updateFields) {
    const user = window.auth.currentUser;
    if (!user) throw new Error('未認証です');
    await this.collection.doc(id).set({
      ...updateFields,
      updatedAt: new Date().toISOString(),
      userId: user.uid
    }, { merge: true });
  }

  // ジャーナルを削除
  async deleteJournal(id) {
    const user = window.auth.currentUser;
    if (!user) throw new Error('未認証です');
    await this.collection.doc(id).delete();
  }

  // ===== 賢人との対話（journals/{id}/dialogue サブコレクション） =====

  // 「頭の中」を1件書き出す（自分との対話）
  async addThought(journalId, text) {
    const user = window.auth.currentUser;
    if (!user) throw new Error('未認証です');
    await this.collection.doc(journalId).collection('dialogue').add({
      text: text,
      createdAt: new Date().toISOString(),
      comments: []
    });
  }

  // 書き出した内容に「コメント（自分への対話）」を追加
  async addComment(journalId, thoughtId, text) {
    const user = window.auth.currentUser;
    if (!user) throw new Error('未認証です');
    await this.collection.doc(journalId).collection('dialogue').doc(thoughtId).update({
      comments: firebase.firestore.FieldValue.arrayUnion({
        text: text,
        createdAt: new Date().toISOString()
      })
    });
  }

  // 対話をリアルタイム購読（05の onChildAdded 相当 = Firestore onSnapshot）
  // 変更があるたび onChange(messages) を呼ぶ。戻り値は購読解除関数。
  subscribeDialogue(journalId, onChange) {
    return this.collection.doc(journalId).collection('dialogue')
      .orderBy('createdAt', 'asc')
      .onSnapshot(snapshot => {
        const messages = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        onChange(messages);
      });
  }
}

window.FirestoreJournalStorage = FirestoreJournalStorage; 