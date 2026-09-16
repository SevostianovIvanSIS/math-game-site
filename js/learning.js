// Прогресс учебных заданий хранится отдельно от рекордов старых игр.
const Learning = {
  read(topic) {
    try { const data=JSON.parse(localStorage.getItem(`learning_v1_${topic}`)); return data && typeof data==='object' ? data : {}; } catch { return {}; }
  },
  record(topic,q,correct,assisted) {
    const data=this.read(topic), old=data[q.id] || {attempts:0,correct:0,streak:0};
    data[q.id]={attempts:old.attempts+1,correct:old.correct+(correct&&!assisted?1:0),
      streak:correct&&!assisted?old.streak+1:0,needsReview:!correct||assisted,
      question:q,at:Date.now()};
    localStorage.setItem(`learning_v1_${topic}`,JSON.stringify(data));
  },
  stats(topic) {
    const entries=Object.values(this.read(topic));
    const attempts=entries.reduce((n,v)=>n+v.attempts,0),correct=entries.reduce((n,v)=>n+v.correct,0);
    return {attempts,correct,accuracy:attempts?Math.round(correct/attempts*100):0,
      mastered:entries.filter(v=>v.streak>=3).length,review:entries.filter(v=>v.needsReview).length};
  },
  start(topicId) {
    const grade=Number(App.grade)||5;
    const saved=this.read(topicId);
    const shuffle=a=>a.map(v=>({v,r:Math.random()})).sort((a,b)=>a.r-b.r).map(x=>x.v);
    const pool=LearningBank.bank[topicId]?.filter(q=>q.grade<=grade);
    const review=Object.values(saved).filter(v=>v.needsReview&&v.question.grade<=grade).map(v=>pool?.find(q=>q.id===v.question.id) || v.question);
    let deck=shuffle(review);
    if(pool)deck.push(...shuffle(pool.filter(q=>!deck.some(d=>d.id===q.id))));
    else {
      for(let tries=0;deck.length<12 && tries<200;tries++) {
        const q=LearningBank.generators[topicId](grade);
        if(!deck.some(existing=>existing.id===q.id))deck.push(q);
      }
    }
    deck=deck.slice(0,10);
    let index=0;
    const Topic={init:()=>this.start(topicId)};
    window.Topic=Topic;
    Round.start({topicId,rounds:deck.length,next:()=> {
      const q=structuredClone(deck[index++ % deck.length]);
      if(q.options)q.options=shuffle(q.options);
      return q;
    }});
  },
};
window.Learning=Learning;

// Спокойная мини-игра: за каждый самостоятельный ответ вырастает цветок.
window.GAME_MODES.garden={
  limitMs:0,manual:true,icon:'🌷',endless:false,
  init(){ this.flowers=0; document.getElementById('game-canvas').hidden=true;
    document.body.classList.add('learning-mode'); this.draw(); },
  draw(){
    let scene=document.getElementById('garden-scene');
    if(!scene){scene=document.createElement('div');scene.id='garden-scene';document.getElementById('game-stage').appendChild(scene);}
    scene.innerHTML=`<div class="garden-caption">САД ЗНАНИЙ · ЦВЕТЫ: ${this.flowers}</div><div class="garden-plants" aria-label="Выращено цветов: ${this.flowers}">${Array.from({length:Round.baseRounds || 10},(_,i)=>`<span>${i<this.flowers?'🌷':'🌱'}</span>`).join('')}</div>`;
    scene.hidden=false;
  },
  onAnswer({correct,assisted}){if(correct&&!assisted)this.flowers++;this.draw();return {};},
  isOver(){return false;},
  hudLabel(){return `🌷 Цветы: ${this.flowers}`;},
  getState(round){const ratio=this.flowers/round.baseRounds; const stars=ratio>=0.8?3:ratio>=0.5?2:this.flowers>0?1:0;
    return {won:true,headline:'Твой сад стал сильнее!',sub:'Ошибки и ответы с подсказкой вернутся на повторение. Три самостоятельных ответа подряд закрепляют задание.',score:this.flowers,stars,scoreLabel:'🌷 Выращено цветов'};},
  stop(){document.body.classList.remove('learning-mode');document.getElementById('game-canvas').hidden=false;
    const scene=document.getElementById('garden-scene');if(scene)scene.hidden=true;}
};
