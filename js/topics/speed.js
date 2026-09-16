// ── Тема: Скорость, время, расстояние ───────────────

const Topic = {
  init(topicId) {
    Round.start({ topicId, rounds: 15, next: () => this.question() });
  },

  question() {
    const q = Math.random() < 0.7 ? DB.speedProblem() : DB.units();
    return { ...q, question: `🚗 ${q.question}` };
  },
};

window.Topic = Topic;
export { Topic };
