// ── Тема: Числовые выражения ────────────────────────

const Topic = {
  init(topicId) {
    Round.start({ topicId, rounds: 15, next: () => this.question() });
  },

  question() {
    const q = DB.expressions();
    return { ...q, question: `🧮 ${q.question} = ?` };
  },
};

window.Topic = Topic;
export { Topic };
