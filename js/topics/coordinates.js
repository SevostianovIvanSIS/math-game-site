// ── Тема: Координатная плоскость ────────────────────

const Topic = {
  init(topicId) {
    Round.start({ topicId, rounds: 15, next: () => this.question() });
  },

  question() {
    const q = DB.coordinates();
    return {
      ...q,
      question: `📍 ${q.question}`,
      placeholder: 'x, y',
      canvas: { id: 'coord-canvas', w: 300, h: 300 },
      draw: () => this.drawPlane(q),
    };
  },

  // ── Плоскость с точкой ────────────────────────────

  drawPlane(q) {
    const canvas = document.getElementById('coord-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    const step = 25, maxRange = 5;

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = -maxRange; i <= maxRange; i++) {
      ctx.beginPath(); ctx.moveTo(cx + i * step, 0); ctx.lineTo(cx + i * step, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, cy + i * step); ctx.lineTo(w, cy + i * step); ctx.stroke();
    }

    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();

    ctx.fillStyle = '#7f8c8d';
    ctx.font = '11px system-ui';
    for (let i = -maxRange; i <= maxRange; i++) {
      if (i === 0) continue;
      ctx.textAlign = 'center';
      ctx.fillText(i, cx + i * step, cy + 14);
      ctx.textAlign = 'right';
      ctx.fillText(i, cx - 6, cy - i * step + 4);   // ось Y растёт вверх
    }

    const [px, py] = String(q.correctAnswer).split(',').map(v => parseInt(v, 10));
    ctx.fillStyle = '#E74C3C';
    ctx.beginPath();
    ctx.arc(cx + px * step, cy - py * step, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
  },
};

window.Topic = Topic;
export { Topic };
