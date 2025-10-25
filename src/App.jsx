// src/App.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, Lock, Unlock, Sparkles, RefreshCcw } from "lucide-react";

// Love Password — персональная романтическая игра
// ✔ Мобильная адаптация (100dvh, safe-area, крупные тапы, авто-скролл к инпуту)
// ✔ Жизни + таймер на каждый вопрос
// ✔ Конфетти и пульсация сердца при успехе
// ✔ Синонимы ответов (also), усиленная нормализация
// ✔ Сохранение прогресса по уровню (localStorage)

const STORAGE_KEY = "love_password_progress_v1";
const MAX_LIVES = 3;     // кол-во жизней
const BASE_TIME = 20;    // секунд на вопрос

export default function LovePassword() {
  const [idx, setIdx] = useState(() => loadProgress()); // текущий уровень
  const [input, setInput] = useState("");
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState("idle"); // idle | ok | err | done | gameover
  const [shakes, setShakes] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [timeLeft, setTimeLeft] = useState(BASE_TIME);
  const [burstKey, setBurstKey] = useState(0); // перезапуск конфетти
  const inputRef = useRef(null);

  const total = LEVELS.length;
  const done = idx >= total && status !== "gameover";
  const level = LEVELS[Math.min(idx, total - 1)] || LEVELS[total - 1];

  // сохраняем только индекс уровня
  useEffect(() => { saveProgress(idx); }, [idx]);

  // авто-скролл к инпуту на телефонах (когда всплывает клавиатура)
  useEffect(() => {
    const el = inputRef.current; if (!el) return;
    const onFocus = () => { setTimeout(() => { try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {} }, 100); };
    el.addEventListener("focus", onFocus);
    return () => el.removeEventListener("focus", onFocus);
  }, []);

  // таймер
  useEffect(() => {
    if (done || status === "gameover") return;
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [idx, done, status]);

  useEffect(() => {
    if (done || status === "gameover") return;
    if (timeLeft <= 0) miss("Время вышло ⏳");
  }, [timeLeft, done, status]);

  // ————— логика —————
  function normalize(s) {
    return (s || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[.,;:'"!?()\-_/\\|@#%^&*+=`~]/g, "") // убираем пунктуацию
      .replace(/\s+/g, "");
  }

  function sfx(ok) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const ctx = new AC();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = ok ? "triangle" : "sawtooth";
      o.frequency.value = ok ? 740 : 180;
      g.gain.value = 0.035; o.connect(g); g.connect(ctx.destination);
      o.start(); setTimeout(() => { o.stop(); ctx.close(); }, 160);
    } catch {}
  }

  function nextLevel() {
    setInput("");
    setTimeLeft(BASE_TIME);
    setStatus("idle");
  }

  function miss(customMsg) {
    sfx(false);
    setStatus("err");
    setMsg(customMsg || pick(level.reactions.wrong));
    setShakes(s => s + 1);
    setLives(l => {
      const nl = l - 1;
      if (nl <= 0) {
        setStatus("gameover");
      } else {
        setTimeLeft(BASE_TIME); // перезапуск времени на том же вопросе
      }
      return nl;
    });
  }

  function handleSubmit() {
    if (done || status === "gameover") return;
    const variants = [level.answer, ...(level.also || [])];
    const ok = variants.some(v => normalize(input) === normalize(v));
    if (ok) {
      sfx(true);
      setStatus("ok");
      setMsg(pick(level.reactions.correct));
      setBurstKey(k => k + 1);
      setTimeout(() => {
        if (idx + 1 >= total) {
          setStatus("done");
          setIdx(i => i + 1);
        } else {
          setIdx(i => i + 1);
          nextLevel();
        }
      }, 700);
    } else {
      miss();
    }
  }

  function resetAll() {
    setIdx(0); setStatus("idle"); setInput(""); setMsg("");
    setLives(MAX_LIVES); setTimeLeft(BASE_TIME);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  const progressPct = useMemo(
    () => Math.min(100, Math.round((Math.min(idx, total) / total) * 100)),
    [idx, total]
  );

  // ————— UI —————
  return (
    <div
      className="min-h-[100dvh] w-full bg-gradient-to-b from-rose-100 via-pink-100 to-indigo-100"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto max-w-3xl px-3 sm:px-4 py-4 sm:py-6 md:py-10">
        <Header onReset={resetAll} progressPct={progressPct} idx={Math.min(idx, total)} total={total} />

        <div className="mt-3 sm:mt-4 rounded-3xl border bg-white/80 backdrop-blur p-4 sm:p-6 shadow-sm">
          {/* HUD */}
          {!done && status !== "gameover" && (
            <div className="flex items-center justify-between text-sm mb-3">
              <div className="opacity-70">
                Жизни: {Array.from({ length: Math.max(0, lives) }).map((_, i) => <span key={i}>❤</span>)}
              </div>
              <div className={`opacity-70 ${timeLeft <= 5 ? "text-rose-600 font-semibold" : ""}`}>Время: {timeLeft}s</div>
            </div>
          )}

          {status === "gameover" ? (
            <GameOver onReplay={resetAll} />
          ) : done ? (
            <Finale onReplay={resetAll} />
          ) : (
            <>
              <HeartLock open={status === "ok"} shake={status === "err" ? shakes : 0} />
              <div className="mt-3 sm:mt-4 text-xs sm:text-sm opacity-70">Уровень {idx + 1} / {total}</div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mt-1">{level.prompt}</h2>
              {level.note && <p className="opacity-70 mt-1 text-xs sm:text-sm">{level.note}</p>}

              <div className="grid gap-2 sm:gap-3 mt-4 sm:mt-5 md:grid-cols-[1fr_auto]">
                <input
                  ref={inputRef}
                  autoFocus
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
                  placeholder="Введи ответ"
                  inputMode="text"
                  enterKeyHint="go"
                  className={`w-full h-12 sm:h-12 text-base rounded-2xl border px-4 py-3 focus:outline-none focus:ring-2 ${
                    status === "err" ? "focus:ring-rose-300 border-rose-300" : "focus:ring-rose-300"
                  }`}
                />
                <button
                  onClick={handleSubmit}
                  className="w-full md:w-auto h-12 px-5 rounded-2xl bg-rose-500 text-white text-base font-medium shadow hover:brightness-110 active:translate-y-px"
                >
                  Проверить
                </button>
              </div>

              {msg && (
                <div className={`mt-2 sm:mt-3 text-sm ${status === "ok" ? "text-emerald-700" : status === "err" ? "text-rose-700" : "opacity-70"}`}>
                  {msg}
                </div>
              )}

              {status === "err" && level.hint && (
                <div className="mt-2 text-xs opacity-60">Подсказка: {level.hint}</div>
              )}

              {status === "ok" && <ConfettiBurst key={burstKey} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Header({ onReset, progressPct, idx, total }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
      <div className="flex items-center gap-2">
        <Sparkles className="size-6" />
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold">Love Password</h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="w-32 sm:w-40 md:w-56 h-2 rounded-full bg-black/10 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-rose-400 to-indigo-400" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="text-[11px] sm:text-xs opacity-70 whitespace-nowrap">{idx}/{total}</div>
        <button onClick={onReset} className="h-10 px-3 rounded-xl border hover:bg-white inline-flex items-center gap-1 active:translate-y-px">
          <RefreshCcw className="size-4" /> Сброс
        </button>
      </div>
    </div>
  );
}

function HeartLock({ open, shake }) {
  return (
    <div className="flex items-center justify-center">
      <div className={`relative inline-flex items-center justify-center rounded-full border bg-white/80 w-24 h-24 sm:w-28 sm:h-28 shadow ${shake ? "animate-[wiggle_0.25s_ease-in-out]" : ""}`}>
        {open ? <Unlock className="size-8 sm:size-10 text-rose-500" /> : <Lock className="size-8 sm:size-10 text-rose-500" />}
        <Heart className={`absolute -z-10 opacity-30 ${open ? "animate-[pulseSoft_0.7s_ease-in-out]" : ""}`} size={84} />
      </div>
      <style>{`
        @keyframes wiggle { 0%,100%{ transform: translateX(0);} 25%{ transform: translateX(-4px);} 75%{ transform: translateX(4px);} }
        @keyframes pulseSoft { 0%{ transform: scale(0.9);} 50%{ transform: scale(1.05);} 100%{ transform: scale(1);} }
      `}</style>
    </div>
  );
}

function Finale({ onReplay }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center">
        <div className="relative inline-flex items-center justify-center rounded-full border bg-white/80 w-28 h-28 sm:w-32 sm:h-32 shadow">
          <Heart className="size-12 sm:size-14 text-rose-500" />
        </div>
      </div>
      <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mt-4">Ты отгадал(а) меня 💖</h3>
      <p className="opacity-70 mt-2 text-sm sm:text-base">
        Теперь у тебя есть мой ключ. Пользуйся аккуратно и по назначению 😏
      </p>
      <div className="mt-4 sm:mt-5">
        <button onClick={onReplay} className="w-full sm:w-auto h-11 px-5 rounded-2xl border font-medium hover:bg-white active:translate-y-px">
          Играть сначала
        </button>
      </div>
    </div>
  );
}

function GameOver({ onReplay }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center">
        <div className="relative inline-flex items-center justify-center rounded-full border bg-white/80 w-28 h-28 sm:w-32 sm:h-32 shadow">
          <Lock className="size-12 sm:size-14 text-rose-500" />
        </div>
      </div>
      <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mt-4">Игра окончена 🔒</h3>
      <p className="opacity-70 mt-2 text-sm sm:text-base">Жизни закончились — но можно попробовать снова! 😉</p>
      <div className="mt-4 sm:mt-5">
        <button onClick={onReplay} className="w-full sm:w-auto h-11 px-5 rounded-2xl border font-medium hover:bg-white active:translate-y-px">
          С начала
        </button>
      </div>
    </div>
  );
}

// Простое конфетти без библиотек
function ConfettiBurst() {
  const pieces = Array.from({ length: 22 });
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {pieces.map((_, i) => (
        <span
          key={i}
          className="absolute block"
          style={{
            left: Math.random() * 100 + "%",
            top: "0%",
            width: 6 + Math.random() * 6,
            height: 6 + Math.random() * 10,
            background: randomConfettiColor(),
            transform: `translateY(-20px) rotate(${Math.random() * 180}deg)`,
            borderRadius: 2,
            animation: `fall ${1.2 + Math.random() * 0.8}s ease-out forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes fall { to { transform: translateY(110vh) rotate(360deg); opacity: 0.9; } }
      `}</style>
    </div>
  );
}

function randomConfettiColor() {
  const arr = ["#f43f5e", "#ec4899", "#8b5cf6", "#6366f1", "#06b6d4", "#10b981", "#f59e0b"];
  return arr[Math.floor(Math.random() * arr.length)];
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function saveProgress(i) { try { localStorage.setItem(STORAGE_KEY, String(i)); } catch {} }
function loadProgress() { try { const v = localStorage.getItem(STORAGE_KEY); return v ? Number(v) : 0; } catch { return 0; } }

// ————————————————————————————————————————
// УРОВНИ (20 шт) — меняй под себя; можно добавлять синонимы в also:[]
// ————————————————————————————————————————
const LEVELS = [
  lvl({
    prompt: "🌆 Город, где я родился (и где началась моя легенда)",
    answer: "Бишкек",
    also: ["bishkek", "фрунзе"],
    hint: "Шорпо, горы и правильный вайб",
    reactions: {
      correct: ["Точно! Мой дом — мой бастион 😎", "Вот это знание с любовью 💘"],
      wrong: ["Теплее…", "Название на ‘Б’ (раньше — другое)"]
    }
  }),
  lvl({
    prompt: "☕ Без этого напитка я не человек по утрам",
    answer: "вода",
    also: ["воды", "h2o"],
    hint: "Прозрачно и честно",
    reactions: {
      correct: ["Чисто и по делу 💧", "Организм сказал «спасибо»"],
      wrong: ["Не кофе (удивлён?)", "Начинается с «в…»"]
    }
  }),
  lvl({
    prompt: "💻 Если я молчу — обычно занят…",
    answer: "работой",
    also: ["делами", "работаю"],
    hint: "Не сериалы и не звонки",
    reactions: {
      correct: ["Трудяга-режим активирован 💪", "Невидимый прогресс — самый громкий"],
      wrong: ["Чуть приземлённее", "Одним словом: «р…»"]
    }
  }),
  lvl({
    prompt: "🚀 Проект, который я развиваю чаще, чем ем",
    answer: "gopost",
    also: ["гоpost", "го пост", "го-пост"],
    note: "Ответ латиницей — без пробелов",
    hint: "Go + …",
    reactions: {
      correct: ["Моё детище узнано!", "Похоже, ты читаешь мои планы 😎"],
      wrong: ["Состоит из 6 букв", "Чуть ближе к моему телеграмму"]
    }
  }),
  lvl({
    prompt: "🍜 Любимое блюдо, после которого я счастлив",
    answer: "манты",
    also: ["мантыы", "manti"],
    reactions: {
      correct: ["Съедим по тарелочке? 😌", "Победный соус!"],
      wrong: ["Не плов (хотя он топ)", "Пар, сочность, и вау"]
    }
  }),
  lvl({
    prompt: "🎧 Что я слушаю, когда делаю вид, что работаю",
    answer: "поп",
    also: ["pop", "попмузыка", "поп-музыка"],
    hint: "Просто, бодро и в тему",
    reactions: {
      correct: ["Поп — и всё по полочкам 🎶", "Рабочий вайб включён"],
      wrong: ["Не рэп сейчас", "Короткое слово из трёх букв"]
    }
  }),
  lvl({
    prompt: "📱 Где я залипаю больше, чем стоило бы",
    answer: "тикток",
    also: ["tiktok", "тик ток", "тик-ток"],
    reactions: {
      correct: ["Алгоритмы победили… снова 😅", "Время улетело, как видео"],
      wrong: ["Не инста (хотя…)", "Короткие ролики — длинные вечера"]
    }
  }),
  lvl({
    prompt: "🐾 Какое животное мне нравится больше",
    answer: "кошка",
    also: ["кот", "котик", "киса", "кошка🐱"],
    hint: "Мур-мур-мур",
    reactions: {
      correct: ["Мяу это да 😼", "Затащила своим «мррр»"],
      wrong: ["Не собака", "Усатая, хвостатая, самодостаточная"]
    }
  }),
  lvl({
    prompt: "🧳 Страна, куда я рвусь как только смогу",
    answer: "китай",
    also: ["china", "zhongguo", "чжунго"],
    reactions: {
      correct: ["Нихао, приключения! 🇨🇳", "Техника, уличная еда и мегаполисы"],
      wrong: ["Не Корея", "Иероглифы, чаевая культура, небоскрёбы"]
    }
  }),
  lvl({
    prompt: "🕹 Игра, в которой я чувствую себя гением",
    answer: "gta",
    also: ["гта"],
    note: "Коротко, латиницей",
    reactions: {
      correct: ["Угоняем сердца 💨", "Миссия пройдена"],
      wrong: ["Не Minecraft", "Три буквы"]
    }
  }),
  lvl({
    prompt: "💬 Фраза, которую я говорю слишком часто",
    answer: "все все",
    also: ["всё всё", "всёвсё", "всевсе"],
    reactions: {
      correct: ["И иногда даже делаю 😅", "Мой фирменный слоган"],
      wrong: ["Две короткие, одна длинная", "Звучит как обещание"]
    }
  }),
  lvl({
    prompt: "😈 Что я делаю, когда хочу впечатлить",
    answer: "шучу",
    also: ["юморю", "шутка", "шутить"],
    reactions: {
      correct: ["Ха-ха, видишь? 😉", "Юмор — моё секретное оружие"],
      wrong: ["Не качаюсь и не кулинарю", "Словесно и остро"]
    }
  }),
  lvl({
    prompt: "💘 Как ты думаешь, что я чувствую, когда ты пишешь мне",
    answer: "радость",
    also: ["счастье", "улыбку", "улыбка", "кайф"],
    reactions: {
      correct: ["Вот и сейчас — улыбаюсь 😊", "Ты — мой дофамин"],
      wrong: ["Не тревога", "Тёплое и позитивное"]
    }
  }),
  lvl({
    prompt: "😂 Что я точно не люблю (но многие думают, что люблю)",
    answer: "капусту",
    also: ["капуста"],
    reactions: {
      correct: ["Победа овощам… но без неё", "Раскрыт секрет моей тарелки"],
      wrong: ["Это не брокколи", "Листья-слои-слёзы"]
    }
  }),
  lvl({
    prompt: "😏 Что обо мне первым делом замечают",
    answer: "улыбку",
    also: ["улыбка", "улыбка)"],
    reactions: {
      correct: ["Твою — тоже 😉", "Оружие массового очарования"],
      wrong: ["Не глаза (хотя…)", "То, что на фото видно первым"]
    }
  }),
  lvl({
    prompt: "🧠 Что у меня сильнее — логика или харизма (ответ одним словом)",
    answer: "харизма",
    also: ["харизму"],
    reactions: {
      correct: ["Очевидно же 😎", "Её у нас хватит на двоих"],
      wrong: ["Не «логика»", "Сияет, а не считает"]
    }
  }),
  lvl({
    prompt: "🥶 Как я реагирую, если кто-то тупит в коде",
    answer: "терплю",
    also: ["терпение", "терпеливо", "терплю..."],
    reactions: {
      correct: ["Внешне — да, внутри — огонь", "Спокойствие — мой баг-фикс"],
      wrong: ["Не «бомблю»", "Сдержанно… как будто"]
    }
  }),
  lvl({
    prompt: "💭 Что, по-твоему, я думаю прямо сейчас",
    answer: "она умница",
    also: ["онаумница", "ты умница", "тумница"],
    reactions: {
      correct: ["И это правда 😌", "Смекаешь!"],
      wrong: ["Это комплимент тебе", "Две короткие, одно длинное"]
    }
  }),
  lvl({
    prompt: "🫶 Если бы я был смайликом — каким",
    answer: "😎",
    also: [":sunglasses:", "крутой"],
    hint: "Можно вставить сам эмодзи",
    reactions: {
      correct: ["Подтверждаю 😎", "Эта штука мне идёт"],
      wrong: ["С очками…", "Холодный, но стильный"]
    }
  }),
  lvl({
    prompt: "💖 Что я на самом деле ищу — в людях, в жизни",
    answer: "понимание",
    also: ["понимания"],
    reactions: {
      correct: ["Вот оно. Самое ценное", "Наш общий пароль найден 💗"],
      wrong: ["Не «идеал»", "Ключ к сердцу начинается на «по…»"]
    }
  }),
];

function lvl({ prompt, answer, reactions, note, hint, also }) {
  return { prompt, answer, reactions, note, hint, also };
}
