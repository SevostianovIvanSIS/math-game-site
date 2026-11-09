// Маршрут сада: все темы доступны, следующие ступени рекомендуются по прогрессу.
(() => {
  const stages=[{name:'Разберись',icon:'🌱',desc:'Правило, пример и первые шаги'},
    {name:'Потренируйся',icon:'🌿',desc:'Новые числа и больше самостоятельности'},
    {name:'Собери урожай',icon:'🌸',desc:'Проверь себя и вырасти цветок'}];
  const find=id=>PetersonBank.lessons.find(l=>l.id===id);
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read=()=>{try{const p=JSON.parse(localStorage.getItem('peterson_garden_v1'));return p&&typeof p==='object'&&!Array.isArray(p)?p:{};}catch{return {};}};
  const status=(id,stage)=>read()[`${id}_${stage}`]||{};
  const recommended=lessons=>{for(const lesson of lessons)for(let stage=0;stage<3;stage++)if(!status(lesson.id,stage).passed)return {lesson,stage};return {lesson:lessons[0],stage:2};};
  window.Peterson={
    stages, status,
    renderHome() {
      const box=document.getElementById('peterson-garden');
      if(!box)return;
      box.hidden=App.subject!=='math'||Number(App.grade)<3;
      if(box.hidden)return;
      const lessons=PetersonBank.lessons.filter(l=>l.grade===Number(App.grade));
      const done=lessons.reduce((n,l)=>n+stages.filter((_,i)=>status(l.id,i).passed).length,0);
      const next=recommended(lessons);
      box.innerHTML=`<div class="curriculum-header"><div><div class="curriculum-kicker">МАТЕМАТИКА · ПЕТЕРСОН · ${App.grade} КЛАСС</div><h2>Твой сад открытий <span aria-hidden="true">🌻</span></h2><p>Выбери грядку, разберись в правиле и помоги саду расцвести.</p></div><div class="curriculum-count"><b>${done} / ${lessons.length*3}</b><span>ступеней пройдено</span></div></div>
        <div class="curriculum-guide"><span>🌱 Разберись</span><i>→</i><span>🌿 Потренируйся</span><i>→</i><span>🌸 Собери урожай</span></div>
        <p class="curriculum-help">Без таймера. В каждой ступени 6 задач. Пять самостоятельных ответов — ступень пройдена. Можно выбрать любую тему, которую проходите в школе.</p>
        <button class="practice-start curriculum-continue" onclick="Peterson.open('${next.lesson.id}',${next.stage})">${done?'Продолжить маршрут':'Посадить первую грядку'} · ${next.lesson.name} →</button>
        ${window.GardenGames?.cards() || ''}
        <div class="curriculum-map">${lessons.map((l,i)=>{const complete=stages.filter((_,j)=>status(l.id,j).passed).length;return `<button class="curriculum-bed ${complete===3?'bloomed':''}" onclick="Peterson.open('${l.id}')"><span class="bed-number">Грядка ${i+1}</span><span class="bed-icon" aria-hidden="true">${complete===3?'🌻':l.icon}</span><b>${l.name}</b><span class="bed-skill">${l.skill}</span><span class="bed-progress" aria-label="Пройдено ступеней: ${complete} из 3">${stages.map((st,j)=>`<span class="${status(l.id,j).passed?'done':''}">${status(l.id,j).passed?'✓':st.icon}</span>`).join('')}<small>${complete}/3</small></span></button>`;}).join('')}</div>
        <details class="curriculum-about"><summary>Для родителей: темы и программа</summary><p>Авторские тренировки по основным темам курса «Учусь учиться» Л. Г. Петерсон для 3–5 классов. Порядок в вашем учебнике может отличаться. Здесь можно тренировать отдельную тему и возвращаться к предыдущему классу.</p><p><a href="https://peterson.institute/upload/metodichka-1-4.pdf" target="_blank" rel="noopener">Темы 3–4 классов</a> · <a href="https://peterson.institute/catalogs/metodicheskie-materialy-os/video-konsultacii/3610/" target="_blank" rel="noopener">Темы 5 класса</a></p><p>Прогресс сохраняется в этом браузере. Пройденная ступень означает успешную тренировку, а закрепление отдельных заданий по-прежнему требует повторения.</p></details>`;
    },
    open(id,stage) {
      const lesson=find(id);if(!lesson)return;
      Round.stop();Round.hidePopup();Engine.stopGame();
      App.currentTopic=id;App.currentMode='garden';localStorage.setItem('mathgame_mode','garden');
      document.getElementById('home-screen').hidden=true;document.getElementById('game-screen').hidden=false;
      document.body.classList.remove('mini-game-mode');
      document.body.classList.add('playing','curriculum-mode');
      GAME_MODES.garden.init();Round.mode=GAME_MODES.garden;
      document.querySelector('#game-screen .btn-back').textContent='← В сад открытий';
      document.getElementById('score-display').textContent=`${lesson.grade} класс · ${lesson.name}`;
      document.getElementById('game-content').innerHTML=`<div class="lesson-intro"><div class="lesson-eyebrow">${lesson.icon} ГРЯДКА ЗНАНИЙ · ${lesson.grade} КЛАСС</div><h2>${lesson.name}</h2><p>${lesson.skill}</p><div class="lesson-rule"><b>Давай разберёмся</b><p>${lesson.rule}</p></div><div class="lesson-example"><b>Посмотрим на пример</b>${this.example(lesson.id,stage??0)}</div><h3>Как играть</h3><p>Прочитай задачу. Нажми вариант или впиши ответ и нажми «Ответить». После ответа прочитай разбор и нажми «Дальше». Дроби записывай как 3/4 или 1 1/2, десятичные — с запятой или точкой.</p><p>Подсказки помогают учиться. Задача с подсказкой или ошибкой вернётся в конце. Для прохождения ступени реши самостоятельно хотя бы 5 из первых 6 задач.</p>${window.GardenGames?.lessonLink(lesson) || ''}<div class="lesson-stages">${stages.map((st,i)=>`<button class="lesson-stage ${i===(stage??recommended([lesson]).stage)?'suggested':''}" onclick="Peterson.start('${id}',${i})"><b>${status(id,i).passed?'✓':st.icon} ${i+1}. ${st.name}</b><span>${st.desc}</span><small>${status(id,i).passed?'Пройдена · можно повторить':'6 задач · без спешки'}</small></button>`).join('')}</div></div>`;
      document.getElementById('game-content').scrollTop=0;
    },
    example(id,stage) {
      const q=PetersonBank.make(id,stage,84);
      return `<p>${q.question}</p>${this.visual(q.visual)}<p class="example-answer">Ответ: ${escape(q.correctAnswer)}</p><p>${escape(q.explanation)}</p>`;
    },
    start(id,stage=0) {
      const lesson=find(id);if(!lesson||!Number.isInteger(stage)||stage<0||stage>2)return;
      // Вход возможен и после смены предмета/класса; урок всегда в спокойном саду.
      App.currentTopic=id;App.currentMode='garden';document.body.classList.add('curriculum-mode');
      const topicId=`${id}_step${stage}`;
      const saved=Learning.read(topicId);
      const deck=Object.values(saved).filter(v=>v.needsReview&&v.question.lesson===id&&v.question.stage===stage).slice(0,3).map(v=>structuredClone(v.question));
      const seen=new Set(deck.map(q=>q.question));
      const offset=Math.floor(Math.random()*800)*12;
      for(let n=0;deck.length<6&&n<500;n++){
        const q=PetersonBank.make(id,stage,offset+n);
        if(!seen.has(q.question)){deck.push(q);seen.add(q.question);}
      }
      let index=0;
      window.Topic={init:()=>this.start(id,stage)};
      Round.start({topicId,rounds:deck.length,review:false,onFinish:(round,state)=>this.complete(lesson,stage,round,state),next:()=>{
        const q=structuredClone(deck[index++%deck.length]);
        if(q.options)q.options=q.options.map(v=>({v,r:Math.random()})).sort((a,b)=>a.r-b.r).map(x=>x.v);
        q.rule=lesson.rule;return q;
      }});
      document.querySelector('#game-screen .btn-back').textContent='← В сад открытий';
    },
    complete(lesson,stage,round,state) {
      const passed=round.independent>=5,data=read(),key=`${lesson.id}_${stage}`,old=data[key]||{};
      data[key]={passed:!!old.passed||passed,best:Math.max(old.best||0,round.independent),plays:(old.plays||0)+1};
      localStorage.setItem('peterson_garden_v1',JSON.stringify(data));
      state.headline=passed?`${stages[stage].icon} Ступень пройдена!`:'🌱 Ростку нужна ещё тренировка';
      state.sub=`Самостоятельно с первой попытки: ${round.independent} из ${round.baseRounds}. ${passed?'Отличная работа! Можно перейти дальше.':'Для прохождения нужно 5. Повтори ступень — подсказки помогут разобраться.'}`;
      state.won=true;
      // Round показывает стандартный результат; добавляем понятное продолжение.
      this.nextAction=()=>passed&&stage<2?this.open(lesson.id,stage+1):passed&&stage===2?this.openNext(lesson.id):this.open(lesson.id,stage);
      state.continueLabel=passed&&stage<2?'Следующая ступень →':passed?'К следующей грядке →':'Разобраться и повторить →';
      return state;
    },
    openNext(id) {
      const current=find(id),list=PetersonBank.lessons.filter(l=>l.grade===current.grade),i=list.findIndex(l=>l.id===id);
      if(list[i+1])this.open(list[i+1].id);else App.goHome();
    },
    visual(v) {
      if(!v)return '';
      let body='',label='';
      if(v.kind==='parts'){
        label=`${v.n} из ${v.d} равных частей`;
        body=Array.from({length:v.d},(_,i)=>`<rect x="${12+i*276/v.d}" y="24" width="${276/v.d-2}" height="45" rx="3" fill="${i<v.n?'#69b58c':'#e3ebe6'}"/>`).join('')+`<text x="150" y="94" text-anchor="middle">${label}</text>`;
      }else if(v.kind==='sets'){
        label=`Коллекция A: ${v.A.join(', ')}. Коллекция B: ${v.B.join(', ')}`;
        body=`<rect x="7" y="10" width="138" height="85" rx="25" fill="#e7ddff"/><rect x="155" y="10" width="138" height="85" rx="25" fill="#d4efe2"/><text x="76" y="36" text-anchor="middle">Коллекция A</text><text x="224" y="36" text-anchor="middle">Коллекция B</text><text x="76" y="66" text-anchor="middle">${v.A.join(' · ')}</text><text x="224" y="66" text-anchor="middle">${v.B.join(' · ')}</text>`;
      }else if(v.kind==='bars'){
        label=v.labels.map((l,i)=>`${l}: ${v.values[i]}`).join('. ');
        body=v.values.map((n,i)=>`<text x="8" y="${30+i*47}">${v.labels[i]}</text><rect x="100" y="${13+i*47}" width="${150*n/Math.max(...v.values)}" height="26" rx="5" fill="${i?'#b8a0dc':'#69b58c'}"/><text x="${107+150*n/Math.max(...v.values)}" y="${32+i*47}">${n}</text>`).join('');
      }else if(v.kind==='rectangle'){
        label=`Прямоугольник, стороны ${v.a} м и ${v.b} м`;
        body=`<rect x="65" y="15" width="160" height="65" rx="5" fill="#d4efe2" stroke="#3e7656" stroke-width="2"/><text x="145" y="100" text-anchor="middle">${v.a} м</text><text x="235" y="52">${v.b} м</text>`;
      }else if(v.kind==='ray'){
        label=`Числовой луч от 0 до ${v.b+1}, отмечены ${v.a} и ${v.b}`;
        const max=v.b+1,step=270/max;
        body=`<path d="M12 48H290l-7 -5m7 5l-7 5" stroke="#3e7656" fill="none"/>`+Array.from({length:max+1},(_,i)=>`<path d="M${12+i*step} 43v10" stroke="#3e7656"/><text x="${12+i*step}" y="74" text-anchor="middle" font-size="12">${i}</text>`).join('')+[v.a,v.b].map((n,i)=>`<circle cx="${12+n*step}" cy="48" r="5" fill="${i?'#8454b9':'#37835b'}"/>`).join('');
      }else if(v.kind==='grid'){
        label=`Карта: точка (${v.x}; ${v.y})`;
        body=Array.from({length:6},(_,i)=>`<path d="M${55+i*35} 4v85M55 ${89-i*17}h175" stroke="#cfdbd3"/><text x="${55+i*35}" y="104" text-anchor="middle" font-size="11">${i}</text><text x="44" y="${93-i*17}" font-size="11">${i}</text>`).join('')+`<circle cx="${55+v.x*35}" cy="${89-v.y*17}" r="6" fill="#8454b9"/><text x="242" y="103">x</text><text x="32" y="13">y</text>`;
      }else if(v.kind==='angle'){
        label=`Развёрнутый угол, одна часть ${v.angle} градусов`;
        const rad=v.angle*Math.PI/180;
        body=`<path d="M25 85H275M150 85L${150+65*Math.cos(rad)} ${85-65*Math.sin(rad)}" fill="none" stroke="#3e7656" stroke-width="3"/><text x="210" y="70">${v.angle}°</text><text x="90" y="66">?</text>`;
      }
      return `<svg class="lesson-visual" viewBox="0 0 300 112" role="img" aria-label="${escape(label)}"><title>${escape(label)}</title>${body}</svg>`;
    }
  };
})();
