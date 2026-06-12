// firebase.example.js
// このファイルをコピーして firebase.js を作成し、ご自身の Firebase プロジェクトの値を入れてください。
//   cp firebase.example.js firebase.js
// ※ firebase.js は .gitignore 済み（APIキーを GitHub に載せないため）。
//    課題ルール「Firebase の Key は GitHub に載せない」に対応しています。

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);

// FirestoreとAuthの参照をwindowに追加
window.db = firebase.firestore();
window.auth = firebase.auth();
