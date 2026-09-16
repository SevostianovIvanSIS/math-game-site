// ── Helper-функции ──────────────────────────────────

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function genWrongs(correct, range = 5) {
  const set = new Set();
  while (set.size < 3) {
    const w = correct + rand(-range, range);
    if (w !== correct && w > 0) set.add(w);
  }
  return [...set];
}

// ── Банк вопросов ─────────────────────────────────────

const DB = {

  // ─── Тема 1: Таблица умножения ───

  multiplication() {
    const a = rand(2, 12);
    const b = rand(2, 12);
    return {
      question: `${a} × ${b}`,
      correctAnswer: a * b,
      options: shuffle([a * b, ...genWrongs(a * b, 4)])
    };
  },

  // ─── Тема 2: Дроби ───

  fractions_compare() {
    const a = rand(1, 5);
    const b = rand(2, 9);
    const c = rand(1, 5);
    const d = rand(2, 9);
    const val1 = a / b;
    const val2 = c / d;
    return {
      question: `Сравни: ${a}/${b} и ${c}/${d}`,
      correctAnswer: val1 < val2 ? '<' : (val1 > val2 ? '>' : '='),
      options: ['<', '>', '=']
    };
  },

  fractions_add() {
    const denom = rand(3, 12);
    const num1 = rand(1, denom - 1);
    const num2 = rand(1, denom - num1);
    return {
      question: `${num1}/${denom} + ${num2}/${denom}`,
      correctAnswer: `${num1 + num2}/${denom}`,
      options: shuffle([
        `${num1 + num2}/${denom}`,
        `${num1 + num2}/${denom * 2}`,
        `${Math.abs(num1 - num2)}/${denom}`,
        `${num1 + num2}/${denom + 1}`
      ])
    };
  },

  fractions_visual() {
    const parts = rand(2, 8);
    const filled = rand(1, parts - 1);
    return {
      question: `Какую дробь показывает закрашенная часть?`,
      correctAnswer: `${filled}/${parts}`,
      type: 'visual',
      parts: parts,
      filled: filled,
      options: shuffle([
        `${filled}/${parts}`,
        `${filled + 1}/${parts}`,
        `${filled}/${parts + 1}`,
        `${filled - 1}/${parts}`
      ])
    };
  },

  // ─── Тема 3: Натуральные числа (5 класс) ───

  numbers_round() {
    const num = rand(10, 999);
    const place = pick([10, 100]);
    const label = place === 10 ? 'десятков' : 'сотен';
    const expected = Math.round(num / place) * place;
    const wrongs = shuffle([expected - place, expected + place, expected + place * 2, expected - place * 2]).slice(0, 3);
    const allWrongs = [...new Set([...wrongs, expected])];
    return {
      question: `Округлите ${num} до ${label}`,
      correctAnswer: expected,
      options: shuffle(allWrongs)
    };
  },

  numbers_compare() {
    const a = rand(100, 9999);
    const b = rand(100, 9999);
    return {
      question: `Сравните: ${a} и ${b}`,
      correctAnswer: a > b ? '>' : (a < b ? '<' : '='),
      options: ['>', '<', '=']
    };
  },

  numbers_operations() {
    const a = rand(100, 500);
    const b = rand(10, 99);
    const c = rand(10, 99);
    const templates = [
      { q: `${a} + ${b} - ${c}`, a: a + b - c },
      { q: `${a} - ${b} + ${c}`, a: a - b + c },
      { q: `(${a} + ${b}) × 1`, a: (a + b) },
    ];
    const t = pick(templates);
    return {
      question: t.q,
      correctAnswer: t.a,
      type: 'input'
    };
  },

  // ─── Тема 4: Делимость ───

  divisibility(n) {
    const multiples = [];
    for (let i = 1; i <= 20; i++) multiples.push(n * i);
    const correct = pick(multiples);
    const wrongs = [];
    while (wrongs.length < 3) {
      const w = rand(1, 200);
      if (w % n !== 0 && !wrongs.includes(w)) wrongs.push(w);
    }
    return {
      question: `Какое число делится на ${n}?`,
      correctAnswer: correct,
      options: shuffle([correct, ...wrongs])
    };
  },

  prime_check() {
    const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
    const composite = pick([4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20, 21, 22, 25, 27, 28, 30, 33, 35, 39, 45, 49]);
    const num = Math.random() < 0.5 ? pick(primes) : composite;
    return {
      question: `${num} — простое или составное?`,
      correctAnswer: primes.includes(num) ? 'простое' : 'составное',
      options: ['простое', 'составное']
    };
  },

  // ─── Тема 5: Числовые выражения ───

  expressions() {
    // Каждый шаблон генерирует вопрос и ответ ИЗ ОДНИХ И ТОЖЕ ЧИСЕЛ
    const templates = [
      () => {
        const a = rand(2, 20), b = rand(2, 10), c = rand(2, 9);
        return { q: `${a} + ${b} × ${c}`, a: a + b * c };
      },
      () => {
        const a = rand(2, 10), b = rand(1, 9), c = rand(2, 9);
        return { q: `(${a} + ${b}) × ${c}`, a: (a + b) * c };
      },
      () => {
        const a = rand(10, 99), b = rand(2, 9), c = rand(2, 5);
        return { q: `${a} - ${b} × ${c}`, a: a - b * c };
      },
    ];
    const gen = pick(templates);
    const r = gen();
    return {
      question: r.q,
      correctAnswer: r.a,
      type: 'input'
    };
  },

  // ─── Тема 6: Проценты ───

  percentages() {
    const pct = pick([10, 20, 25, 50, 75]);
    const val = rand(1, 20) * (100 / gcd(pct, 100));
    return {
      question: `${pct}% от ${val}`,
      correctAnswer: val * pct / 100,
      type: 'input'
    };
  },

  percent_discount() {
    const price = pick([100, 200, 300, 500, 1000]);
    const pct = pick([10, 20, 25, 50]);
    return {
      question: `Товар стоит ${price} ₽. Скидка ${pct}%. Цена со скидкой?`,
      correctAnswer: price * (100 - pct) / 100,
      type: 'input'
    };
  },

  // ─── Тема 7: Координатная плоскость ───

  coordinates() {
    const x = rand(-5, 5);
    const y = rand(-5, 5);
    return {
      question: `Какие координаты у точки? (x, y)`,
      correctAnswer: `${x}, ${y}`,
      type: 'input'
    };
  },

  // ─── Тема 8: Скорость — время — расстояние ───

  speedProblem() {
    const speed = pick([40, 60, 80, 100]);
    const time = pick([1, 2, 3, 4]);
    return {
      question: `Автомобиль едет ${speed} км/ч. Сколько км за ${time} ч?`,
      correctAnswer: speed * time,
      type: 'input'
    };
  },

  // ─── Тема 9: Единицы измерения ───

  units() {
    const pairs = [
      { from: 'см', to: 'м', val: pick([10, 20, 50, 100, 200]), answer: (v) => v / 100 },
      { from: 'кг', to: 'ц', val: pick([100, 200, 500, 1000]), answer: (v) => v / 100 },
      { from: 'ч', to: 'мин', val: pick([1, 2, 3, 5]), answer: (v) => v * 60 },
    ];
    const p = pick(pairs);
    return {
      question: `${p.val} ${p.from} = ? ${p.to}`,
      correctAnswer: p.answer(p.val),
      type: 'input'
    };
  }
};

// ── GCD helper ───────────────────────────────────────

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

window.DB = DB;
