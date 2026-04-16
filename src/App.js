import { auth, db } from "./firebase";
import { useState, useEffect, useRef } from "react";

import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import { doc, getDoc, setDoc } from "firebase/firestore";

const provider = new GoogleAuthProvider();

// UI
const container = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  background: "#0f172a",
  color: "#fff",
  fontFamily: "Arial, sans-serif",
  padding: "20px",
};

const card = {
  background: "#1e293b",
  padding: "30px",
  borderRadius: "20px",
  maxWidth: "420px",
  width: "100%",
  textAlign: "center",
  boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
  cursor: "pointer",
  userSelect: "none",
};

const btn = {
  background: "#ff7a00",
  color: "#fff",
  border: "none",
  padding: "12px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  margin: "6px",
  fontWeight: "bold",
};

function createCards(base, startId) {
  return base.map((c, i) => ({
    id: startId + i,
    ...c,
    level: 0,
    nextReview: Date.now(),
  }));
}

const subjects = {
  Constitucional: createCards([
    { pergunta: "O que é cláusula pétrea?", resposta: "Normas imutáveis." },
    { pergunta: "O que é ADI?", resposta: "Ação Direta de Inconstitucionalidade." },
  ], 1),

  Administrativo: createCards([
    { pergunta: "O que é ato administrativo?", resposta: "Manifestação da Administração Pública." },
    { pergunta: "O que significa LIMPE?", resposta: "Legalidade, Impessoalidade, Moralidade, Publicidade e Eficiência." },
    { pergunta: "O que é poder de polícia?", resposta: "Limitação de direitos em prol do interesse público." },
  ], 100),

  Penal: createCards([
    { pergunta: "O que é crime?", resposta: "Fato típico, ilícito e culpável." },
    { pergunta: "O que é dolo?", resposta: "Vontade consciente de praticar o crime." },
    { pergunta: "O que é culpa?", resposta: "Negligência, imprudência ou imperícia." },
  ], 200),
};

export default function App() {
  const [user, setUser] = useState(null);
  const [subject, setSubject] = useState(null);
  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [show, setShow] = useState(false);
  const [doneToday, setDoneToday] = useState(0);
  const [forceReview, setForceReview] = useState(true);
  const [loading, setLoading] = useState(false);

  const touchStartX = useRef(0);

  async function handleLogin() {
    const result = await signInWithPopup(auth, provider);
    setUser(result.user);
  }

  function handleLogout() {
    signOut(auth);
    setUser(null);
    setSubject(null);
  }

  async function resetProgress() {
    if (!user || !subject) return;

    const ref = doc(db, "users", user.uid);

    const fresh = subjects[subject].map(c => ({
      ...c,
      level: 0,
      nextReview: Date.now()
    }));

    await setDoc(ref, { [subject]: fresh }, { merge: true });

    setCards([...fresh]);
    setIndex(0);
    setDoneToday(0);
    setShow(false);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setIndex(0);
  }, [subject]);

  useEffect(() => {
    if (!user || !subject) return;

    const load = async () => {
      setLoading(true);

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists() && snap.data()[subject]) {
        setCards(snap.data()[subject]);
      } else {
        setCards(subjects[subject].map(c => ({ ...c, nextReview: Date.now() })));
      }

      setIndex(0);
      setShow(false);
      setLoading(false);
    };

    load();
  }, [user, subject]);

  useEffect(() => {
    if (!user || !subject) return;

    const save = async () => {
      const ref = doc(db, "users", user.uid);
      await setDoc(ref, { [subject]: cards }, { merge: true });
    };

    save();
  }, [cards, user, subject]);

  const availableCards = forceReview
    ? cards
    : cards.filter(c => c.nextReview <= Date.now());

  const isFinished = !loading && availableCards.length === 0;

  const current = availableCards[index % (availableCards.length || 1)];

  function updateCard(difficulty) {
    const updated = cards.map(c => {
      if (c.id !== current.id) return c;

      let level = c.level;
      let delay = 0;

      if (difficulty === "hard") {
        level = 0;
        delay = 5 * 60 * 1000;
      }

      if (difficulty === "medium") {
        level = c.level + 1;
        delay = (c.level + 1) * 24 * 60 * 60 * 1000;
      }

      if (difficulty === "easy") {
        level = c.level + 2;
        delay = (c.level + 2) * 2 * 24 * 60 * 60 * 1000;
      }

      return {
        ...c,
        level,
        nextReview: Date.now() + delay
      };
    });

    setCards(updated);
    setShow(false);
    setIndex(prev => prev + 1);
    setDoneToday(prev => prev + 1);
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    const delta = e.changedTouches[0].clientX - touchStartX.current;

    if (!show) {
      setShow(true);
      return;
    }

    if (delta > 50) updateCard("easy");
    if (delta < -50) updateCard("hard");
  }

  if (!user) {
    return (
      <div style={container}>
        <h1>🚀 Foguete Cards</h1>
        <p>Revise rápido. Lembre na prova.</p>
        <button style={btn} onClick={handleLogin}>Entrar com Google</button>
      </div>
    );
  }

  if (!subject) {
    return (
      <div style={container}>
        <h2>Escolha a matéria</h2>

        {Object.keys(subjects).map(subj => (
          <div key={subj} style={card} onClick={() => setSubject(subj)}>
            {subj}
          </div>
        ))}

        <button style={btn} onClick={handleLogout}>Sair</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={container}>
        <h2>Carregando cards...</h2>
      </div>
    );
  }

  return (
    <div style={container}>
      <button style={btn} onClick={() => setSubject(null)}>← Voltar</button>
      <button style={btn} onClick={resetProgress}>Resetar Progresso</button>
      <button style={btn} onClick={() => setForceReview(!forceReview)}>
        {forceReview ? "Modo Inteligente" : "Revisar Tudo"}
      </button>

      <p>
        {Math.min(index + 1, availableCards.length)} / {availableCards.length} • 🔥 {doneToday}
      </p>

      {isFinished ? (
        <div style={card}>
          <h2>🔥 Por hoje acabou</h2>
          <p>Volte amanhã 🚀</p>
        </div>
      ) : (
        <>
          <div
            style={card}
            onClick={() => !show && setShow(true)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <h2>{current?.pergunta}</h2>
            {show && <p style={{ marginTop: "15px" }}>{current?.resposta}</p>}
          </div>

          {show && (
            <div>
              <button style={btn} onClick={() => updateCard("hard")}>Não sei</button>
              <button style={btn} onClick={() => updateCard("medium")}>Médio</button>
              <button style={btn} onClick={() => updateCard("easy")}>Sei</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
