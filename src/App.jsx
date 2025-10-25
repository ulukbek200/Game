import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, Lock, Unlock, Sparkles, RefreshCcw } from "lucide-react";

// Love Password — персональная романтическая игра с юмором (адаптирована под мобильные)
// ✔️ Мобильная верстка: компактные отступы, крупные тапы, стек на малых экранах
// ✔️ 100dvh, safe-area, скролл к инпуту при фокусе, enterKeyHint
// ✔️ Сохранение прогресса в localStorage

const STORAGE_KEY = "love_password_progress_v1";

export default function LovePassword() {
  const [idx, setIdx] = useState(() => loadProgress()); // текущий уровень
  const [input, setInput] = useState("");
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState("idle"); // "idle"|"ok"|"err"|"done"
  const [shakes, setShakes] = useState(0); // для анимации сердца
  const inputRef = useRef(null);

  const level = LEVELS[idx];
  const total = LEVELS.length;
  const done = idx >= total;

  useEffect(() => { saveProgress(idx); }, [idx]);

  // Мягкий скролл к полю при фокусе на телефоне (когда открывается клавиатура)
  useEffect(() => {
    const el = inputRef.current; if (!el) return;
    const onFocus = () => {
      setTimeout(() => {
        try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch {}
      }, 100);
    };
    el.addEventListener("focus", onFocus);
    return () => el.removeEventListener("focus", onFocus);
  }, []);

  function normalize(s) {
    return (s || "")
      .toString()
      .trim()
      .toLowerCase()
      .replace(/ё/g, "е")
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
      g.gain.value = 0.04; o.connect(g); g.connect(ctx.destination);
      o.start(); setTimeout(() => { o.stop(); ctx.close(); }, 160);
    } catch {}
  }

  function handleSubmit() {
    if (done) return;
    const ok = normalize(input) === normalize(level.answer);
    if (ok) {
      sfx(true);
      setStatus("ok");
      setMsg(pick(level.reactions.correct));
      setTimeout(() => {
        setInput("");
        if (idx + 1 >= total) setStatus("done");
        setIdx(i => i + 1);
      }, 700);
    } else {
      sfx(false);
      setStatus("err");
      setMsg(pick(level.reactions.wrong));
      setShakes(s => s + 1);
    }
  }

  function resetAll() {
    setIdx(0); setStatus("idle"); setInput(""); setMsg("");
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  const progressPct = useMemo(() => Math.min(100, Math.round((Math.min(idx, total) / total) * 100)), [idx, total]);

  return (
    <div
      className="min-h-[100dvh] w-full bg-gradient-to-b from-rose-100 via-pink-100 to-indigo-100"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto max-w-3xl px-3 sm:px-4 py-4 sm:py-6 md:py-10">
        <Header onReset={resetAll} progressPct={progressPct} idx={Math.min(idx, total)} total={total} />

        <div className="mt-3 sm:mt-4 rounded-3xl border bg-white/80 backdrop-blur p-4 sm:p-6 md:p-6 shadow-sm">
          {!done ? (
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
                  onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                  placeholder="Введи ответ"
                  inputMode="text"
                  enterKeyHint="go"
                  className={`w-full h-12 sm:h-12 text-base rounded-2xl border px-4 py-3 focus:outline-none focus:ring-2 ${status === 'err' ? 'focus:ring-rose-300 border-rose-300' : 'focus:ring-rose-300'}`}
                />
                <button
                  onClick={handleSubmit}
                  className="w-full md:w-auto h-12 px-5 rounded-2xl bg-rose-500 text-white text-base font-medium shadow hover:brightness-110 active:translate-y-px"
                >
                  Проверить
                </button>
              </div>

              {msg && (
                <div className={`mt-2 sm:mt-3 text-sm ${status === 'ok' ? 'text-emerald-700' : status === 'err' ? 'text-rose-700' : 'opacity-70'}`}>{msg}</div>
              )}

              {status === 'err' && level.hint && (
                <div className="mt-2 text-xs sm:text-xs opacity-60">Подсказка: {level.hint}</div>
              )}
            </>
          ) : (
            <Finale onReplay={resetAll} />
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
        <button onClick={onReset} className="h-10 px-3 rounded-xl border hover:bg-white inline-flex items-center gap-1 active:translate-y-px"><RefreshCcw className="size-4"/> Сброс</button>
      </div>
    </div>
  );
}

function HeartLock({ open, shake }) {
  return (
    <div className="flex items-center justify-center">
      <div className={`relative inline-flex items-center justify-center rounded-full border bg-white/80 w-24 h-24 sm:w-28 sm:h-28 shadow ${shake ? 'animate-[wiggle_0.25s_ease-in-out]' : ''}`}>
        {open ? <Unlock className="size-8 sm:size-10 text-rose-500" /> : <Lock className="size-8 sm:size-10 text-rose-500" />}
        <Heart className="absolute -z-10 opacity-30" size={84} />
      </div>
      <style>{`@keyframes wiggle { 0%,100%{ transform: translateX(0);} 25%{ transform: translateX(-4px);} 75%{ transform: translateX(4px);} }`}</style>
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
      <p className="opacity-70 mt-2 text-sm sm:text-base">Теперь у тебя есть мой ключ. Пользуйся аккуратно и по назначению 😏</p>
      <div className="mt-4 sm:mt-5">
        <button onClick={onReplay} className="w-full sm:w-auto h-11 px-5 rounded-2xl border font-medium hover:bg-white active:translate-y-px">Играть сначала</button>
      </div>
    </div>
  );
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function saveProgress(i) { try { localStorage.setItem(STORAGE_KEY, String(i)); } catch {} }
function loadProgress() { try { const v = localStorage.getItem(STORAGE_KEY); return v ? Number(v) : 0; } catch { return 0; } }

// ————————————————————————————————————————
// УРОВНИ: 20 штук с флиртом/подколами и подсказками
// Меняй ответы под себя, подсказки — по желанию
// ————————————————————————————————————————
const LEVELS = [
  lvl({
    prompt: "🌆 Город, где я родился (и где началась моя легенда)",
    answer: "Бишкек",
    hint: "Здесь лучшая шорпо и вид на горы",
    reactions: {
      correct: ["Точно! Мой дом мой бастион 😎", "Вот это знание с любовью 💘"],
      wrong: ["Чуть теплее — и угадаешь", "Город начинается на ту самую букву"]
    }
  }),
  lvl({
    prompt: "☕ Без этого напитка я не человек по утрам",
    answer: "кофе",
    hint: "Аромат, бодрит, иногда с молоком",
    reactions: {
      correct: ["Эспресс-да!", "Как ты меня понимаешь ☕💖"],
      wrong: ["Это не чай… хотя и он мил", "Подумай о зерне и бодрости"]
    }
  }),
  lvl({
    prompt: "💻 Если я молчу — обычно занят…",
    answer: "кодом",
    hint: "То, что превращает идеи в кнопочки",
    reactions: {
      correct: ["0101 — значит да!", "Поймала поток моих мыслей 😏"],
      wrong: ["Не звонки и не сериалы", "Смотри на клавиатуру"]
    }
  }),
  lvl({
    prompt: "🚀 Проект, который я развиваю чаще, чем ем",
    answer: "gopost",
    note: "Ответ на латинице — без пробелов",
    hint: "Go + …",
    reactions: {
      correct: ["Моё детище узнано!", "Похоже, ты читаешь мои мысли и планы 😎"],
      wrong: ["Чуть ближе к моему телеграмму", "Состоит из 6 букв"]
    }
  }),
  lvl({
    prompt: "🍜 Любимое блюдо, после которого я счастлив",
    answer: "лапша",
    reactions: {
      correct: ["Съедим по тарелочке? 😌", "Победный соус!"],
      wrong: ["Не плов (хотя он топ)", "Тонкие и длинные… нити счастья"]
    }
  }),
  lvl({
    prompt: "🎧 Что я слушаю, когда делаю вид, что работаю",
    answer: "лоуфай",
    hint: "Пишется как звучит: л…ф…",
    reactions: {
      correct: ["Лоу-фай — хай-вайб ✨", "Вот это ритм наших сердец"],
      wrong: ["Не рэп (сейчас)", "Фон для сосредоточенности"]
    }
  }),
  lvl({
    prompt: "📱 Где я залипаю больше, чем стоило бы",
    answer: "телеграм",
    reactions: {
      correct: ["Да, мои чаты — моя крепость", "Попался с экранным временем 😅"],
      wrong: ["Не инста (хотя…)", "Мессенджер с каналами"]
    }
  }),
  lvl({
    prompt: "🐝 С чем ассоциируется моя семья",
    answer: "мёд",
    hint: "Сладко, липко, полезно",
    reactions: {
      correct: ["Сладкая правда 🍯", "Пчёлки аплодируют"],
      wrong: ["Сладость на М", "Не сахар"]
    }
  }),
  lvl({
    prompt: "🧳 Страна, куда я рвусь как только смогу",
    answer: "япония",
    reactions: {
      correct: ["Konnichiwa, мечта! 🇯🇵", "Суши и метавселенные ждут"],
      wrong: ["Не Корея", "Острова, аниме, порядок"]
    }
  }),
  lvl({
    prompt: "🕹 Игра, в которой я чувствую себя гением",
    answer: "gta",
    note: "Коротко, латиницей",
    reactions: {
      correct: ["Угоняем сердца 💨", "Миссия пройдена"],
      wrong: ["Не Minecraft", "Три буквы"]
    }
  }),
  lvl({
    prompt: "💬 Фраза, которую я говорю слишком часто",
    answer: "ща сделаю",
    reactions: {
      correct: ["И иногда даже делаю 😅", "Мой фирменный слоган"],
      wrong: ["Две короткие, одна длинная", "Звучит как обещание"]
    }
  }),
  lvl({
    prompt: "😈 Что я делаю, когда хочу впечатлить",
    answer: "шучу",
    reactions: {
      correct: ["Ха-ха, видишь? 😉", "Юмор — моё секретное оружие"],
      wrong: ["Не качаюсь и не кулинарю", "Словесно и остро"]
    }
  }),
  lvl({
    prompt: "💘 Как ты думаешь, что я чувствую, когда ты пишешь мне",
    answer: "радость",
    reactions: {
      correct: ["Вот и сейчас — улыбаюсь", "Ты — мой дофамин"],
      wrong: ["Не тревога", "Позитивное, тёплое"]
    }
  }),
  lvl({
    prompt: "😂 Что я точно не люблю (но многие думают, что люблю)",
    answer: "капусту",
    reactions: {
      correct: ["Победа овощам… но без неё", "Раскрыт секрет моей тарелки"],
      wrong: ["Это не брокколи", "Листья-слои-слёзы"]
    }
  }),
  lvl({
    prompt: "😏 Что обо мне первым делом замечают",
    answer: "улыбку",
    reactions: {
      correct: ["Твою — тоже 😉", "Это оружие массового очарования"],
      wrong: ["Не глаза (хотя…) ", "То, что на фото всегда первое"]
    }
  }),
  lvl({
    prompt: "🧠 Что у меня сильнее — логика или харизма (ответ одним словом)",
    answer: "харизма",
    reactions: {
      correct: ["Очевидно же 😎", "Её у нас хватит на двоих"],
      wrong: ["Не ‘логика’", "Сияет, а не считает"]
    }
  }),
  lvl({
    prompt: "🥶 Как я реагирую, если кто-то тупит в коде",
    answer: "терплю",
    reactions: {
      correct: ["Внешне — да, внутри — огонь", "Спокойствие — мой баг-фикс"],
      wrong: ["Не ‘бомблю’", "Сдержанно… как будто"]
    }
  }),
  lvl({
    prompt: "💭 Что, по-твоему, я думаю прямо сейчас",
    answer: "она умница",
    reactions: {
      correct: ["И это правда 😌", "Смекаешь!"],
      wrong: ["Это комплимент тебе", "Две короткие, одно длинное"]
    }
  }),
  lvl({
    prompt: "🫶 Если бы я был смайликом — каким",
    answer: "😎",
    hint: "Можно вставить сам эмодзи",
    reactions: {
      correct: ["Подтверждаю 😎", "Эта штука мне идёт"],
      wrong: ["С очками…", "Холодный, но стильный"]
    }
  }),
  lvl({
    prompt: "💖 Что я на самом деле ищу — в людях, в жизни, в тебе",
    answer: "понимание",
    reactions: {
      correct: ["Вот оно. Самое ценное", "Наш общий пароль найден 💗"],
      wrong: ["Не ‘идеал’", "Ключ к сердцу начинается на ‘по…’"]
    }
  }),
];

function lvl({ prompt, answer, reactions, note, hint }) {
  return { prompt, answer, reactions, note, hint };
}
