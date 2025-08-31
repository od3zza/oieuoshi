// comments.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, collection, addDoc, getDocs, query, where, orderBy 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCKqfKOLbVIc5mz9bs_6eNBOmC2IdhpFGY",
  authDomain: "comments-app-99587.firebaseapp.com",
  projectId: "comments-app-99587",
  storageBucket: "comments-app-99587.firebasestorage.app",
  messagingSenderId: "440730244153",
  appId: "1:440730244153:web:ef7042ef67041dc971e9e8",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- SELETORES ---
const slug = window.location.pathname;
const commentsList = document.getElementById('comments-list');
const form = document.getElementById('comment-form');

// --- FUNÇÃO PARA RENDERIZAR COMENTÁRIOS ---
function renderComments(comments) {
  commentsList.innerHTML = comments.map(c => `
    <div class="comment">
      <strong>${c.name}</strong> ${c.link ? `<a href="${c.link}" target="_blank">(Link)</a>` : ''}
      <p>${c.comment}</p>
      <small>${new Date(c.timestamp.seconds*1000).toLocaleString()}</small>
    </div>
  `).join('');
}

// --- CARREGAR COMENTÁRIOS ---
async function loadComments() {
  const q = query(
    collection(db, "comments"),
    where("slug", "==", slug),
    orderBy("timestamp", "desc")
  );
  const snapshot = await getDocs(q);
  const comments = snapshot.docs.map(doc => doc.data());
  renderComments(comments);
}

// --- INICIALIZAÇÃO ---
loadComments();

// --- ENVIAR NOVO COMENTÁRIO ---
form.addEventListener('submit', async e => {
  e.preventDefault();
  const name = form.name.value.trim();
  const link = form.link.value.trim();
  const comment = form.comment.value.trim();

  if (!name || !comment) return;

  await addDoc(collection(db, "comments"), {
    slug,
    name,
    link: link || "",
    comment,
    timestamp: new Date()
  });

  form.reset();
  loadComments();
});
