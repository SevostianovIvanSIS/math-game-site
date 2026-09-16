// ── Тема: Дроби ─────────────────────────────────────

const Topic = {
  init(topicId) {
    Round.start({ topicId, rounds: 15, next: () => this.question() });
  },

  question() {
    const r = Math.random();
    if (r < 0.25) {
      const q = DB.fractions_compare();
      return { ...q, question: `🍕 ${q.question}` };
    }
    if (r < 0.6) {
      const q = DB.fractions_add();
      return { ...q, question: `🍕 ${q.question} = ?` };
    }
    const q = DB.fractions_visual();
    return {
      ...q,
      question: `🍕 ${q.question}`,
      canvas: { id: 'fraction-canvas', w: 180, h: 180 },
      draw: () => this.drawPie(q),
    };
  },

  // ── Круговая диаграмма дроби ──────────────────────

  drawPie(q) {
    const canvas = document.getElementById('fraction-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cx = 90, cy = 90, r = 75;
    const slice = (Math.PI * 2) / q.parts;
    const start = -Math.PI / 2;

    ctx.clearRect(0, 0, 180, 180);
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#4A90D9';
    for (let i = 0; i < q.filled; i++) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start + i * slice, start + (i + 1) * slice);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 1;
    for (let i = 0; i < q.parts; i++) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + r * Math.cos(start + i * slice), cy + r * Math.sin(start + i * slice));
      ctx.stroke();
    }

    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  },
};

window.Topic = Topic;
export { Topic };
