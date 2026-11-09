// Мини-игры с предметными моделями. Все данные вопроса сериализуются для повторения.
(() => {
  const meta={
    harvest:{icon:'🐰',name:'Пикник для зайчат',desc:'Угости зайчат нужной долей урожая — целыми корзинками.',levels:['Одна корзинка — одна доля','Угощение для зайчат','Делимся с белочкой']},
    motion:{icon:'🐇',name:'Кто встретится у фонтана?',desc:'Двигай героев и наблюдай, как время превращается в путь.',levels:['Путь до флажка','Идём навстречу','Удаление и погоня']},
    geometry:{icon:'🏡',name:'Строим настоящий сад',desc:'Поставь забор, замости грядку и открой калитку.',levels:['Забор · периметр','Плитки · площадь','Калитка · углы']}
  };
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const apples=n=>`${n} ${n%10===1&&n%100!==11?'яблоко':n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?'яблока':'яблок'}`;
  const angleType=a=>a===0?'Нулевой':a<90?'Острый':a===90?'Прямой':a<180?'Тупой':'Развёрнутый';
  const read=()=>{try{const x=JSON.parse(localStorage.getItem('garden_games_v1'));return x&&typeof x==='object'&&!Array.isArray(x)?x:{};}catch{return {};}};
  const status=(kind,level)=>read()[`${kind}_${level}`]||{};
  function make(kind,level,seed=0){
    if(!meta[kind]||!Number.isInteger(level)||level<0||level>2)throw Error('Неизвестная мини-игра');
    let interaction,question,correctAnswer,explanation,rule,hint;
    if(kind==='harvest'){
      const d=level===0?2+seed%2:3+seed%3,unit=2+(seed+level)%3,n=level===0?1:1+seed%(d-1),total=d*unit;
      const take=level===2?d-n:n;
      interaction={kind,total,d,n,take,unit,remaining:level===2};
      question=level===2?`Белочке оставим ${n}/${d} урожая. Отдай зайчатам всё остальное.`:`Угости зайчат: им нужно ${n}/${d} всего урожая.`;
      correctAnswer=`${apples(take*unit)} · ${take} из ${d} корзин`;
      explanation=`Одна доля: ${total} ÷ ${d} = ${unit} яблока. ${level===2?`После доли белочки ${n}/${d} остаётся ${d-n}/${d} для зайчат. `:''}${take}/${d} урожая: ${unit} × ${take} = ${apples(unit*take)}. Знаменатель ${d} — все равные корзины, числитель ${take} — выбранные.`;
      rule='Урожай уже поровну разложен в корзинки. Одна корзинка — одна доля. Снизу в дроби — все корзинки, сверху — сколько нужно отдать.';
      hint=`В каждой корзинке ${apples(unit)}. Отправь зайчатам ${take} из ${d} корзинок${level===2?`, чтобы белочке осталось ${n}/${d}`:''}.`;
    }else if(kind==='motion'){
      const type=level===0?'single':level===1?'meet':['apart','chase','meet'][seed%3];
      const time=2+seed%3,v1=level===2?4+seed%2:2+seed%2,v2=2;
      const gap=type==='meet'?(v1+v2)*time:type==='chase'?(v1-v2)*time:0;
      const start=[0,gap],velocity=[type==='apart'?-v1:v1,type==='meet'?-v2:v2];
      const targetDistance=type==='single'?v1*time:type==='apart'?(v1+v2)*time:0,maxTime=time+1;
      const min=type==='apart'?-v1*maxTime:0;
      const max=type==='apart'?v2*maxTime:type==='single'?v1*maxTime:type==='chase'?Math.max(v1*maxTime,gap+v2*maxTime):Math.max(gap,v1*maxTime);
      interaction={kind,type,v1,v2,time,maxTime,gap,start,velocity,targetDistance,min,max};
      question=type==='single'?`Заяц проходит ${v1} м за минуту. Доведи его до флажка в ${targetDistance} м от старта.`:
        type==='meet'?`Заяц (${v1} м/мин) и ёжик (${v2} м/мин) идут навстречу. Между ними ${gap} м. Найди момент встречи.`:
        type==='chase'?`Заяц (${v1} м/мин) догоняет ёжика (${v2} м/мин). Ёжик впереди на ${gap} м. Когда заяц догонит его?`:
        `Заяц (${v1} м/мин) и ёжик (${v2} м/мин) разошлись от фонтана в разные стороны. Сделай расстояние между ними ${targetDistance} м.`;
      correctAnswer=`${time} мин`;
      explanation=type==='single'?`Путь = скорость × время: ${v1} × ${time} = ${targetDistance} м. Время = ${targetDistance} ÷ ${v1} = ${time} мин.`:
        type==='meet'?`За минуту расстояние уменьшается на ${v1} + ${v2} = ${v1+v2} м. Встреча через ${gap} ÷ ${v1+v2} = ${time} мин.`:
        type==='chase'?`За минуту заяц отыгрывает ${v1} − ${v2} = ${v1-v2} м. Погоня длится ${gap} ÷ ${v1-v2} = ${time} мин.`:
        `За минуту герои удаляются на ${v1} + ${v2} = ${v1+v2} м. Через ${time} мин между ними (${v1} + ${v2}) × ${time} = ${targetDistance} м.`;
      rule=type==='single'?'За каждую минуту герой проходит расстояние, равное скорости. Путь = скорость × время.':type==='chase'?'При погоне быстрее идущий отыгрывает РАЗНОСТЬ скоростей за минуту.':'Когда оба идут навстречу или в разные стороны, изменение расстояния за минуту равно СУММЕ скоростей.';
      hint=`Поставь время ${time} мин. Сравни путь героев и расстояние между ними.`;
    }else{
      const a=2+seed%3,b=2+(seed+1)%3;
      if(level<2){
        interaction={kind,type:level===0?'fence':'area',a,b};
        question=level===0?`Участок ${a} м на ${b} м. Поставь забор ТОЛЬКО по его границе. Каждый отрезок — 1 метр.`:
          `Грядка ${a} м на ${b} м. Замости только грядку квадратами 1 м × 1 м. Траву за краем оставь свободной.`;
        correctAnswer=level===0?`${2*(a+b)} м забора`:`${a*b} м² плиток`;
        explanation=level===0?`Две стороны по ${a} м и две по ${b} м. P = ${a} + ${b} + ${a} + ${b} = 2 × (${a} + ${b}) = ${2*(a+b)} м. Это длина границы.`:
          `В ряду ${a} квадратов, рядов ${b}. S = ${a} × ${b} = ${a*b} м². Считаем квадраты внутри, а не длину границы.`;
        rule=level===0?'Периметр — длина всей границы. Забор идёт вокруг участка, а не внутри. P = 2 × (длина + ширина).':'Площадь — число единичных квадратов внутри фигуры. Один квадрат 1 м × 1 м имеет площадь 1 м². S = длина × ширина.';
        hint=level===0?`Выдели ${2*a} горизонтальных и ${2*b} вертикальных метров по внешнему краю.`:`Нужны ${b} полных ряда по ${a} плитки. Не занимай траву.`;
      }else{
        const target=[45,90,135][seed%3];interaction={kind,type:'angle',target};
        question=`Открой калитку на ${target}° и выбери тип получившегося угла.`;
        correctAnswer=`${target}° · ${angleType(target).toLowerCase()} угол`;
        explanation=`${target}° ${target<90?'меньше 90° — острый угол':target===90?'ровно 90° — прямой угол':'больше 90°, но меньше 180° — тупой угол'}. Угол показывает поворот створки относительно закрытого положения.`;
        rule='Угол — величина поворота. Прямой угол 90°. Меньше 90° — острый; больше 90°, но меньше 180° — тупой; 180° — развёрнутый.';
        hint=`Перемести створку или ползунок к ${target}°. Выбери «${angleType(target)}».`;
      }
    }
    return {id:`mini_${kind}_${level}_${seed}`,miniGame:kind,level,interaction,question,correctAnswer,explanation,rule,hint,type:'interactive',pace:'calm'};
  }
  function positions(model,time){return model.start.map((x,i)=>x+model.velocity[i]*time);}
  function expectedEdges(a,b){const e=[];for(let x=0;x<a;x++)e.push(`h_${x}_0`,`h_${x}_${b}`);for(let y=0;y<b;y++)e.push(`v_0_${y}`,`v_${a}_${y}`);return e;}
  function harvestResult(model,locations,selected){
    const counts=Array.from({length:model.d},(_,i)=>locations.filter(v=>v===i).length);
    return {counts,equal:locations.length===model.total&&locations.every(v=>Number.isInteger(v)&&v>=0&&v<model.d)&&counts.every(n=>n===model.unit),
      chosen:selected.length===model.take&&new Set(selected).size===model.take&&selected.every(i=>Number.isInteger(i)&&i>=0&&i<model.d)};
  }
  window.GardenGames={meta,make,positions,expectedEdges,harvestResult,angleType,status,
    cards(){return `<div class="mini-home"><h3>Потрогай математику руками</h3><p>Не только ответы: раскладывай, двигай, строй. Правила объясняются прямо в игре.</p><div class="mini-home-grid">${Object.entries(meta).map(([kind,m])=>`<button class="mini-home-card" onclick="GardenGames.open('${kind}')"><span aria-hidden="true">${m.icon}</span><b>${m.name}</b><small>${m.desc}</small><em>${m.levels.filter((_,i)=>status(kind,i).passed).length}/3 уровней · играть →</em></button>`).join('')}</div></div>`;},
    lessonLink(lesson){const kind=/fraction|mixed/.test(lesson.id)?'harvest':/motion|formulas|ray/.test(lesson.id)?'motion':/geometry|angles/.test(lesson.id)?'geometry':null;
      return kind?`<button class="mini-lesson-link" onclick="GardenGames.open('${kind}')">${meta[kind].icon} Попробуй руками: ${meta[kind].name} →</button>`:'';},
    prepare(kind){Round.stop();Round.hidePopup();Engine.stopGame();App.currentMode='garden';App.currentTopic=`mini_${kind}`;localStorage.setItem('mathgame_mode','garden');
      document.getElementById('home-screen').hidden=true;document.getElementById('game-screen').hidden=false;document.body.classList.add('playing','curriculum-mode','mini-game-mode');
      Round.baseRounds=3;GAME_MODES.garden.init();Round.mode=GAME_MODES.garden;document.querySelector('#game-screen .btn-back').textContent='← В сад открытий';},
    open(kind){if(!meta[kind])return;this.prepare(kind);const m=meta[kind];
      document.getElementById('score-display').textContent=m.name;
      document.getElementById('game-content').innerHTML=`<div class="lesson-intro mini-intro"><div class="lesson-eyebrow">${m.icon} МАТЕМАТИКА В ДЕЙСТВИИ</div><h2>${m.name}</h2><p>${m.desc}</p><div class="lesson-rule"><b>Как играть</b><p>${kind==='harvest'?'Урожай уже разложен поровну. Отправляй целые корзинки зайчатам: нажми «Угостить» или перетащи корзинку на полянку. Нажми «Вернуть», если передумала. Когда угощение готово, проверь его.':kind==='motion'?'Передвигай героя, меняй ползунок времени или нажимай «+1 мин». Оба героя всегда проживают одинаковое время. Остановись в нужный момент и проверь.':'Поставь забор нажатием на отрезки границы. Замости грядку нажатием на квадраты. Калитку поворачивай за ручку или ползунком.'}</p><p>Здесь нет таймера. В уровне 3 задания. Три самостоятельных решения — цветок уровня. Подсказки и ошибки вернутся на повторение.</p></div><div class="lesson-stages">${m.levels.map((name,i)=>`<button class="lesson-stage" onclick="GardenGames.start('${kind}',${i})"><b>${status(kind,i).passed?'🌸':m.icon} ${name}</b><span>Нажимай, исследуй и проверяй</span><small>${status(kind,i).passed?'Пройден · повторить':'3 задания · без спешки'}</small></button>`).join('')}</div></div>`;
      document.getElementById('game-content').scrollTop=0;},
    start(kind,level){if(!meta[kind]||!Number.isInteger(level)||level<0||level>2)return;this.prepare(kind);
      const topicId=`mini_${kind}_${level}`,review=Object.values(Learning.read(topicId)).filter(v=>v.needsReview&&v.question.miniGame===kind).slice(0,1).map(v=>make(kind,level,Number(v.question.id.split('_').at(-1))||0)),deck=[...review];
      const offset=Math.floor(Math.random()*12)*3;
      for(let n=0;deck.length<3;n++){const q=make(kind,level,offset+n);if(!deck.some(old=>old.id===q.id))deck.push(q);}
      let index=0;window.Topic={init:()=>this.start(kind,level)};
      Round.start({topicId,rounds:3,review:false,next:()=>structuredClone(deck[index++%deck.length]),onFinish:(round,state)=>{
        const data=read(),key=`${kind}_${level}`,old=data[key]||{},passed=round.independent===3;
        data[key]={passed:!!old.passed||passed,best:Math.max(old.best||0,round.independent),plays:(old.plays||0)+1};localStorage.setItem('garden_games_v1',JSON.stringify(data));
        state.headline=passed?'🌸 Математика ожила!':'🌱 Попробуем ещё раз';state.sub=`Самостоятельно: ${round.independent} из 3. ${passed?'Ты справилась с моделью и правилом.':'Подсказки помогают разобраться. Для цветка реши все три без помощи.'}`;
        state.continueLabel=passed&&level<2?'Следующий уровень →':'К выбору мини-игры →';Peterson.nextAction=()=>passed&&level<2?this.start(kind,level+1):this.open(kind);
      }});},
    unmount(){this.abort?.abort();this.abort=null;clearInterval(this.playTimer);this.playTimer=null;this.ghost?.remove();this.ghost=null;this.drag=null;this.active=null;},
    mount(q){this.unmount();const host=document.getElementById('mini-game');if(!host)return;
      this.active={q,host,locations:Array.from({length:q.interaction.total||0},(_,i)=>Math.floor(i/q.interaction.unit)),selected:[],time:0,chosen:[],angle:0,type:'',message:''};
      this.abort=new AbortController();const opts={signal:this.abort.signal};
      host.addEventListener('click',e=>this.click(e),opts);host.addEventListener('input',e=>{if(Round.locked)return;if(e.target.id==='mini-time')this.setTime(Number(e.target.value));if(e.target.id==='mini-angle')this.setAngle(Number(e.target.value));},opts);
      host.addEventListener('pointerdown',e=>this.pointerDown(e),opts);
      window.addEventListener('pointermove',e=>this.pointerMove(e),opts);window.addEventListener('pointerup',e=>this.pointerUp(e),opts);window.addEventListener('pointercancel',()=>this.clearDrag(),opts);
      host.addEventListener('keydown',e=>{if(Round.locked)return;const edge=e.target.closest('[data-edge]');if(edge&&['Enter',' '].includes(e.key)){e.preventDefault();this.toggle(edge.dataset.edge);}
        const actor=e.target.closest('[data-actor]');if(actor&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();this.setTime(this.active.time+(e.key==='ArrowRight'?1:-1)*Math.sign(q.interaction.velocity[Number(actor.dataset.actor)]));}
        if(e.target.closest('[data-angle-handle]')&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();this.setAngle(this.active.angle+(e.key==='ArrowRight'?5:-5));}},opts);
      this.render();},
    render(){const s=this.active;if(!s)return;const m=s.q.interaction;s.host.innerHTML=m.kind==='harvest'?this.harvestHTML():m.kind==='motion'?this.motionHTML():m.type==='angle'?this.angleHTML():this.geometryHTML();
      if(m.kind==='motion')this.updateMotion();if(m.type==='angle')this.updateAngle();},
    basket(id){const s=this.active,m=s.q.interaction,given=s.selected.includes(id);
      return `<button class="picnic-basket ${given?'given':''}" data-choice="${id}" aria-pressed="${given}" aria-label="Корзинка ${id+1}, ${apples(m.unit)}. ${given?'Вернуть в сад':'Угостить зайчат'}"><span class="picnic-basket-icon" aria-hidden="true">🧺</span><span class="picnic-apples" aria-hidden="true">${'🍎'.repeat(m.unit)}</span><b>1/${m.d} урожая</b><small>${given?'↩ Вернуть':'Угостить →'}</small></button>`;},
    harvestHTML(){const s=this.active,m=s.q.interaction;
      return `<div class="picnic-goal"><span aria-hidden="true">🐰</span><div><b>${m.remaining?`Белочке ${m.n}/${m.d}, зайчатам — остальное`:`Зайчатам нужно ${m.n}/${m.d} урожая`}</b><p>Нажимай «Угостить» или перетаскивай корзинки на полянку.</p></div></div>
        <div class="picnic-orchard" data-serve="garden"><div class="picnic-heading"><b>🌳 В саду осталось: ${apples((m.d-s.selected.length)*m.unit)}</b><span>Всего урожая: ${apples(m.total)} · корзинок: ${m.d}</span></div><p class="mini-instruction">По ${apples(m.unit)} в каждой корзинке — это 1/${m.d} урожая.${!m.remaining&&s.q.level===0?` Дай зайчатам одну такую долю.`:''}</p><div class="picnic-baskets">${Array.from({length:m.d},(_,i)=>!s.selected.includes(i)?this.basket(i):'').join('')||'<p class="picnic-empty">Все корзинки на полянке. Здесь их можно оставить, если вернёшь.</p>'}</div></div>
        <div class="rabbit-picnic" data-serve="rabbit"><div class="picnic-heading"><b>🐰 Полянка зайчат</b><span>Отдали ${s.selected.length}/${m.d} урожая = ${apples(s.selected.length*m.unit)}</span></div><div class="picnic-portion" aria-label="Отдали ${s.selected.length} из ${m.d} равных долей">${Array.from({length:m.d},(_,i)=>`<span class="${i<s.selected.length?'filled':''}">🧺</span>`).join('')}</div><div class="picnic-baskets">${s.selected.map(i=>this.basket(i)).join('')||'<p class="picnic-empty">Перенеси сюда угощение для зайчат 🐾</p>'}</div></div>
        <button class="submit-btn mini-check" data-action="check">Угощение готово — проверить 🐰</button>`;},
    serve(id,give){const s=this.active,m=s?.q.interaction;if(!s||Round.locked||m.kind!=='harvest'||!Number.isInteger(id)||id<0||id>=m.d)return;
      if(give&&!s.selected.includes(id))s.selected.push(id);if(!give)s.selected=s.selected.filter(i=>i!==id);this.render();s.host.querySelector(`[data-choice="${id}"]`)?.focus({preventScroll:true});},
    motionHTML(){const m=this.active.q.interaction;return `<div class="mini-coach" id="motion-coach" role="status"></div><p class="mini-instruction">Перетащи героя по дорожке или меняй время. Оба героя двигаются за одно и то же время.</p><div class="motion-world"><div class="motion-landmarks"><span>🌳 Старт</span><span>${m.type==='single'?'🚩 Флажок':'⛲ Садовая дорожка'}</span></div>${(m.type==='single'?[0]:[0,1]).map((i)=>`<div class="motion-lane" data-lane="${i}"><div class="motion-travel" id="travel-${i}"></div>${m.type==='single'?`<span class="motion-flag" style="left:${this.percent(m.targetDistance)}%" aria-label="Флажок ${m.targetDistance} метров">🚩</span>`:''}<button class="motion-actor" data-actor="${i}" aria-label="${i?'Ёжик':'Заяц'}, перетащи или используй стрелки">${i?'🦔':'🐇'}</button></div><div class="motion-caption"><b>${i?'Ёжик':'Заяц'} · ${i?m.v2:m.v1} м/мин</b><span id="distance-${i}"></span></div>`).join('')}</div><div class="motion-clock"><b>⏱ <output id="motion-time">0</output> мин</b><label for="mini-time">Передвинь время</label><input type="range" id="mini-time" min="0" max="${m.maxTime}" step="1" value="0"><div class="mini-controls"><button data-action="back">−1 мин</button><button data-action="play" id="motion-play">▶ Пустить</button><button data-action="forward">+1 мин</button><button data-action="reset">Сначала</button></div></div><p class="mini-readout" id="motion-readout"></p><button class="submit-btn mini-check" data-action="check">Сейчас нужный момент — проверить</button>`;},
    percent(x){const m=this.active.q.interaction;return 8+84*(x-m.min)/(m.max-m.min);},
    setTime(time){if(!this.active||Round.locked)return;this.active.time=clamp(Math.round(time),0,this.active.q.interaction.maxTime);this.updateMotion();},
    updateMotion(){const s=this.active,m=s.q.interaction,p=positions(m,s.time),distance=Math.abs(p[1]-p[0]);
      s.host.querySelectorAll('[data-actor]').forEach((el,i)=>{el.style.left=this.percent(p[i])+'%';el.setAttribute('aria-label',`${i?'Ёжик':'Заяц'}: прошёл ${Math.abs(m.velocity[i])*s.time} м за ${s.time} мин`);const travel=s.host.querySelector(`#travel-${i}`);const start=this.percent(m.start[i]),end=this.percent(p[i]);travel.style.left=Math.min(start,end)+'%';travel.style.width=Math.abs(start-end)+'%';s.host.querySelector(`#distance-${i}`).textContent=`Путь: ${Math.abs(m.velocity[i])} × ${s.time} = ${Math.abs(m.velocity[i])*s.time} м`;});
      s.host.querySelector('#motion-time').textContent=s.time;s.host.querySelector('#mini-time').value=s.time;
      s.host.querySelector('#motion-readout').textContent=m.type==='single'?`До флажка: ${Math.abs(m.targetDistance-p[0])} м`:`Между героями: ${distance} м${distance===0?' · Они встретились!':''}`;
      s.host.querySelector('#motion-coach').textContent=m.type==='single'?`За минуту заяц проходит ${m.v1} м. Передвинули время на ${s.time} мин — путь стал ${m.v1*s.time} м.`:m.type==='chase'?`За минуту заяц догоняет на ${m.v1} − ${m.v2} = ${m.v1-m.v2} м. Оба прожили ${s.time} мин.`:`Каждая минута меняет расстояние на ${m.v1} + ${m.v2} = ${m.v1+m.v2} м. ${m.type==='meet'?'До встречи пути складываются.':'Герои расходятся от одного старта.'}`;
    },
    play(){if(this.playTimer){clearInterval(this.playTimer);this.playTimer=null;this.active.host.querySelector('#motion-play').textContent='▶ Пустить';return;}
      if(this.active.time===this.active.q.interaction.maxTime)this.setTime(0);
      this.active.host.querySelector('#motion-play').textContent='❚❚ Пауза';this.playTimer=setInterval(()=>{if(!this.active||Round.locked){clearInterval(this.playTimer);this.playTimer=null;return;}this.setTime(this.active.time+1);if(this.active.time>=this.active.q.interaction.maxTime)this.play();},850);},
    geometryHTML(){const s=this.active,m=s.q.interaction;let model='';
      if(m.type==='area'){model=`<div class="area-measure">← ${m.a} м → · ${m.b} ряда по высоте</div><div class="area-grid" style="--cols:${m.a+1}">${Array.from({length:(m.a+1)*(m.b+1)},(_,i)=>{const x=i%(m.a+1),y=Math.floor(i/(m.a+1)),inside=x<m.a&&y<m.b;return `<button class="area-tile ${inside?'plot':'grass'} ${s.chosen.includes(String(i))?'laid':''}" data-tile="${i}" aria-pressed="${s.chosen.includes(String(i))}" aria-label="Квадрат ${x+1}, ряд ${y+1}${inside?', грядка':', трава за грядкой'}">${s.chosen.includes(String(i))?'🌼':inside?'·':'🌱'}</button>`;}).join('')}</div>`;}
      else{const scale=44,edge=(key,x1,y1,x2,y2)=>`<g role="button" tabindex="0" data-edge="${key}" aria-pressed="${s.chosen.includes(key)}" aria-label="Метр забора ${key}"><line class="fence-hit" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><line class="fence-rail ${s.chosen.includes(key)?'built':''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/></g>`;
        let rails='';for(let y=0;y<=m.b;y++)for(let x=0;x<m.a;x++)rails+=edge(`h_${x}_${y}`,30+x*scale,30+y*scale,30+(x+1)*scale,30+y*scale);
        for(let x=0;x<=m.a;x++)for(let y=0;y<m.b;y++)rails+=edge(`v_${x}_${y}`,30+x*scale,30+y*scale,30+x*scale,30+(y+1)*scale);
        model=`<svg class="fence-map" viewBox="0 0 ${m.a*scale+60} ${m.b*scale+65}" role="group" aria-label="Участок ${m.a} на ${m.b} метра, выбери границу"><rect x="30" y="30" width="${m.a*scale}" height="${m.b*scale}" rx="5" fill="#d7ebcf"/><text x="${30+m.a*scale/2}" y="15" text-anchor="middle">${m.a} м</text><text x="${m.a*scale+38}" y="${30+m.b*scale/2}" font-size="12">${m.b} м</text>${rails}</svg>`;}
      return `<div class="mini-coach" role="status">${m.type==='area'?'Площадь — покрытие внутри. Каждая плитка занимает 1 м². Трава за грядкой не считается.':'Периметр — прогулка вокруг границы. Нажимай на отрезки, чтобы ставить и убирать забор.'}</div>${model}<p class="mini-readout">${m.type==='area'?'Уложено':'Поставлено'}: ${s.chosen.length} ${m.type==='area'?'м²':'м'}</p><button class="submit-btn mini-check" data-action="check">Проверить ${m.type==='area'?'покрытие':'забор'}</button>`;},
    angleHTML(){const m=this.active.q.interaction;return `<div class="mini-coach" id="angle-coach" role="status">Угол показывает, насколько повернулась калитка.</div><p class="mini-instruction">Потяни ручку калитки или передвинь ползунок к ${m.target}°. Затем выбери тип угла.</p><svg class="angle-map" viewBox="0 0 320 190" role="group" aria-label="Поворот калитки от 0 до 180 градусов"><path d="M35 160H285" stroke="#c4d5ca" stroke-width="3"/><path d="M160 160H280" stroke="#abb8ad" stroke-dasharray="5 4"/><path id="angle-arc" fill="#c6dced80" stroke="#6394b7"/><line id="gate-leaf" x1="160" y1="160" x2="280" y2="160" stroke="#7a583a" stroke-width="11" stroke-linecap="round"/><circle cx="160" cy="160" r="8" fill="#55775d"/><g data-angle-handle role="slider" tabindex="0" aria-label="Ручка калитки" aria-valuemin="0" aria-valuemax="180" aria-valuenow="0"><circle id="gate-handle-hit" cx="280" cy="160" r="22" fill="transparent"/><circle id="gate-handle" cx="280" cy="160" r="11" fill="#d59a36" stroke="white" stroke-width="3"/></g><text x="283" y="183">0°</text><text x="146" y="25">90°</text><text x="15" y="183">180°</text></svg><label class="angle-control" for="mini-angle">Открыта на <output id="angle-value">0°</output><input id="mini-angle" type="range" min="0" max="180" step="5" value="0"></label><div class="angle-types">${['Острый','Прямой','Тупой','Развёрнутый'].map(t=>`<button data-type="${t}" aria-pressed="false">${t}</button>`).join('')}</div><button class="submit-btn mini-check" data-action="check">Проверить калитку и тип угла</button>`;},
    setAngle(value){if(!this.active||Round.locked)return;this.active.angle=clamp(Math.round(value/5)*5,0,180);this.updateAngle();},
    updateAngle(){const s=this.active,a=s.angle,rad=a*Math.PI/180,x=160+120*Math.cos(rad),y=160-120*Math.sin(rad);
      const line=s.host.querySelector('#gate-leaf');line.setAttribute('x2',x);line.setAttribute('y2',y);
      for(const id of ['gate-handle','gate-handle-hit']){const c=s.host.querySelector('#'+id);c.setAttribute('cx',x);c.setAttribute('cy',y);}
      s.host.querySelector('[data-angle-handle]').setAttribute('aria-valuenow',a);
      s.host.querySelector('#angle-arc').setAttribute('d',`M160 160L200 160A40 40 0 0 0 ${160+40*Math.cos(rad)} ${160-40*Math.sin(rad)}Z`);
      s.host.querySelector('#angle-value').textContent=a+'°';s.host.querySelector('#mini-angle').value=a;
      s.host.querySelector('#angle-coach').textContent=`Поворот ${a}°. ${a===0?'Калитка закрыта.':a<90?'Она открыта меньше чем на прямой угол.':a===90?'Створка перпендикулярна закрытому положению.':a<180?'Открыта больше прямого, но меньше развёрнутого угла.':'Калитка развернулась в противоположную сторону.'}`;
    },
    toggle(key){const s=this.active;if(!s||Round.locked)return;s.chosen=s.chosen.includes(key)?s.chosen.filter(x=>x!==key):[...s.chosen,key];this.render();s.host.querySelector(`[data-edge="${key}"],[data-tile="${key}"]`)?.focus({preventScroll:true});},
    click(e){if(!this.active||Round.locked||performance.now()<(this.ignoreClickUntil||0))return;const s=this.active,m=s.q.interaction;
      const choice=e.target.closest('[data-choice]');if(choice){const i=Number(choice.dataset.choice);this.serve(i,!s.selected.includes(i));return;}
      const edge=e.target.closest('[data-edge]'),tile=e.target.closest('[data-tile]');if(edge||tile){this.toggle(edge?edge.dataset.edge:tile.dataset.tile);return;}
      const type=e.target.closest('[data-type]');if(type){s.type=type.dataset.type;s.host.querySelectorAll('[data-type]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.type===s.type)));return;}
      const action=e.target.closest('[data-action]')?.dataset.action;if(action==='check')this.check();if(action==='forward')this.setTime(s.time+1);if(action==='back')this.setTime(s.time-1);if(action==='reset')this.setTime(0);if(action==='play')this.play();},
    check(){const s=this.active;if(!s||Round.locked)return;const m=s.q.interaction;let correct=false;
      if(m.kind==='harvest')correct=harvestResult(m,s.locations,s.selected).chosen;
      else if(m.kind==='motion'){const p=positions(m,s.time);correct=m.type==='single'?p[0]===m.targetDistance:m.type==='apart'?Math.abs(p[1]-p[0])===m.targetDistance:p[0]===p[1];}
      else if(m.type==='angle')correct=s.angle===m.target&&s.type===angleType(m.target);
      else {const expected=m.type==='fence'?expectedEdges(m.a,m.b):Array.from({length:m.a*m.b},(_,i)=>String(Math.floor(i/m.a)*(m.a+1)+i%m.a));correct=s.chosen.length===expected.length&&expected.every(v=>s.chosen.includes(v));}
      clearInterval(this.playTimer);this.playTimer=null;s.host.querySelectorAll('button,input').forEach(b=>b.disabled=true);s.host.querySelectorAll('[tabindex]').forEach(el=>el.setAttribute('tabindex','-1'));this.clearDrag();Round.resolve(correct,false);
    },
    pointerDown(e){if(!this.active||Round.locked||e.button!==0)return;const basket=e.target.closest('[data-choice]'),actor=e.target.closest('[data-actor]'),angle=e.target.closest('[data-angle-handle]');
      if(!basket&&!actor&&!angle)return;this.drag={pointerId:e.pointerId,basket:basket?Number(basket.dataset.choice):null,actor:actor?Number(actor.dataset.actor):null,angle:!!angle,x:e.clientX,y:e.clientY,moved:false};},
    pointerMove(e){const d=this.drag,s=this.active;if(!d||!s||Round.locked||e.pointerId!==d.pointerId)return;if(!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<5)return;d.moved=true;e.preventDefault();
      if(d.basket!==null){if(!this.ghost){this.ghost=document.createElement('div');this.ghost.className='basket-ghost';this.ghost.textContent='🧺';document.body.append(this.ghost);}this.ghost.style.left=e.clientX+'px';this.ghost.style.top=e.clientY+'px';}
      else if(d.actor!==null){const rect=s.host.querySelector(`[data-lane="${d.actor}"]`).getBoundingClientRect(),m=s.q.interaction;const x=m.min+(clamp((e.clientX-rect.left)/rect.width,.08,.92)-.08)/.84*(m.max-m.min);this.setTime((x-m.start[d.actor])/m.velocity[d.actor]);}
      else if(d.angle){const svg=s.host.querySelector('.angle-map'),point=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());this.setAngle(clamp(Math.atan2(160-point.y,point.x-160)*180/Math.PI,0,180));}
    },
    pointerUp(e){const d=this.drag;if(!d||e.pointerId!==d.pointerId)return;if(d.moved){this.ignoreClickUntil=performance.now()+250;if(d.basket!==null){const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-serve]');if(target)this.serve(d.basket,target.dataset.serve==='rabbit');}}this.clearDrag();},
    clearDrag(){this.drag=null;this.ghost?.remove();this.ghost=null;}
  };
})();
