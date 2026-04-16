import { auth, db } from "./firebase";
import { useState, useEffect } from "react";

import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import { doc, getDoc, setDoc } from "firebase/firestore";

const provider = new GoogleAuthProvider();

// UI STYLES
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
    { pergunta: "O que é ato administrativo?", resposta: "Manifestação unilateral da Administração." },
    { pergunta: "O que significa LIMPE?", resposta: "Legalidade, Impessoalidade, Moralidade, Publicidade e Eficiência." },
    { pergunta: "O que é poder de polícia?", resposta: "Restrição de direitos em prol do interesse público." },
  ], 100),

  Penal: createCards([
    { pergunta: "O que é crime?", resposta: "Fato típico, ilícito e culpável." },
    { pergunta: "O que é dolo?", resposta: "Vontade consciente de praticar o crime." },
    { pergunta: "O que é culpa?", resposta: "Conduta sem intenção, mas com negligência, imprudência ou imperícia." },
  ], 200),
};

export default function App() {
  const [user, setUser] = useState(null);
  const [subject, setSubject] = useState(null);
  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [show, setShow] = useState(false);
  const [doneToday, setDoneToday] = useState(0);

  async function handleLogin() {
    const result = await signInWithPopup(auth, provider);
    setUser(result.user);
  }

  function handleLogout() {
    signOut(auth);
    setUser(null);
    setSubject(null);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // RESET INDEX AO TROCAR MATÉRIA
  useEffect(() => {
    setIndex(0);
  }, [subject]);

  useEffect(() => {
    if (!user || !subject) return;

    const load = async () => {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists() && snap.data()[subject]) {
        const saved = snap.data()[subject];

        const fixed = saved.map((c) => ({
          ...c,
          nextReview: Math.min(c.nextReview, Date.now()),
        }));

        setCards(fixed);
      } else {
        // GARANTE QUE TODOS OS CARDS APARECEM NA PRIMEIRA VEZ
        setCards(subjects[subject].map(c => ({
          ...c,
          nextReview: Date.now()
        })));
      }
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

  const availableCards = cards.filter((c) => c.nextReview <= Date.now());
  const finalCards = availableCards.length ? availableCards : cards;

  // CORREÇÃO PRINCIPAL
  const isFinished = availableCards.length === 0;

  const current = finalCards[index % (finalCards.length || 1)];

  function updateCard(difficulty) {
    const updated = cards.map((c) => {
      if (c.id !== current.id) return c;

      let newLevel = c.level;
      let delay = 0;

      if (difficulty === "hard") {
        newLevel = 0;
        delay = 5 * 60 * 1000;
      }

      if (difficulty === "medium") {
        newLevel = c.level + 1;
        delay = (c.level + 1) * 24 * 60 * 60 * 1000;
      }

      if (difficulty === "easy") {
        newLevel = c.level + 2;
        delay = (c.level + 2) * 2 * 24 * 60 * 60 * 1000;
      }

      return {
        ...c,
        level: newLevel,
        nextReview: Date.now() + delay,
      };
    });

    setCards(updated);
    setShow(false);
    setIndex((prev) => prev + 1);
    setDoneToday((prev) => prev + 1);
  }

  if (!user) {
    return (
      <div style={container}>
        <h1>🚀 Foguete Cards</h1>
        <p>Revise rápido. Lembre na prova.</p>
        <button style={btn} onClick={handleLogin}>
          Entrar com Google
        </button>
      </div>
    );
  }

  if (!subject) {
    return (
      <div style={container}>
        <h2>Escolha a matéria</h2>

        {Object.keys(subjects).map((subj) => (
          <div key={subj} style={card} onClick={() => setSubject(subj)}>
            {subj}
          </div>
        ))}

        <button style={btn} onClick={handleLogout}>Sair</button>
      </div>
    );
  }

  return (
    <div style={container}>
      <button style={btn} onClick={() => setSubject(null)}>
        ← Voltar
      </button>

      <p>
        {Math.min(index + 1, finalCards.length)} / {finalCards.length} • 🔥 {doneToday} revisões hoje
      </p>

      {isFinished ? (
        <div style={card}>
          <h2>🔥 Por hoje acabou</h2>
          <p>Volte amanhã para continuar evoluindo 🚀</p>
        </div>
      ) : (
        <>
          <div style={card} onClick={() => !show && setShow(true)}>
            <h2>{current?.pergunta}</h2>

            {show && (
              <p style={{ marginTop: "15px" }}>{current?.resposta}</p>
            )}
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