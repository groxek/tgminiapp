(function(){
  'use strict';

  var tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;
  var data = window.APP_DATA || {subjects:[]};
  var STORE = 'konsp-mini-v1';
  var themes = [
    {id:'midnight',name:'Полночь',bg:'#0b1020',panel:'#121a2b',panel2:'#192238',text:'#f4f7fb',muted:'#9aa7bc',line:'#27334a',a:'#7b6cff',b:'#42cfff',soft:'rgba(123,108,255,.16)'},
    {id:'graphite',name:'Графит',bg:'#0f1115',panel:'#171a20',panel2:'#20242c',text:'#f2f4f7',muted:'#a5abb6',line:'#303641',a:'#b7c0ca',b:'#7d8795',soft:'rgba(183,192,202,.14)'},
    {id:'ocean',name:'Океан',bg:'#06151b',panel:'#0d232c',panel2:'#13323e',text:'#effcff',muted:'#91b4bf',line:'#28505f',a:'#33b6e8',b:'#64e6c7',soft:'rgba(51,182,232,.16)'},
    {id:'emerald',name:'Изумруд',bg:'#07140f',panel:'#0e2018',panel2:'#153126',text:'#effff7',muted:'#8faf9f',line:'#29483a',a:'#49d99a',b:'#b2e86a',soft:'rgba(73,217,154,.16)'},
    {id:'violet',name:'Виолет',bg:'#100a19',panel:'#1b1127',panel2:'#271735',text:'#fbf3ff',muted:'#bea9c9',line:'#3b2950',a:'#b96cff',b:'#6b9cff',soft:'rgba(185,108,255,.16)'},
    {id:'rose',name:'Роза',bg:'#170b12',panel:'#24111b',panel2:'#311724',text:'#fff1f7',muted:'#c9a3b2',line:'#482536',a:'#ff6d9f',b:'#ffb66d',soft:'rgba(255,109,159,.16)'},
    {id:'sunset',name:'Закат',bg:'#1a1009',panel:'#25160d',panel2:'#342014',text:'#fff5ec',muted:'#cdb09b',line:'#4b3020',a:'#ff8a55',b:'#ffd166',soft:'rgba(255,138,85,.16)'},
    {id:'lavender',name:'Лаванда',bg:'#12101a',panel:'#1d1930',panel2:'#28223e',text:'#f7f4ff',muted:'#b4adc6',line:'#3a3453',a:'#9f8cff',b:'#d3a6ff',soft:'rgba(159,140,255,.16)'},
    {id:'mint',name:'Мята',bg:'#071313',panel:'#0d201f',panel2:'#13302e',text:'#effffd',muted:'#91b6b0',line:'#28504b',a:'#50d6c5',b:'#9de7ab',soft:'rgba(80,214,197,.16)'},
    {id:'sky',name:'Небо',bg:'#0a1420',panel:'#101f31',panel2:'#16304a',text:'#eff7ff',muted:'#9bb3c8',line:'#28445f',a:'#61a9ff',b:'#7de0ff',soft:'rgba(97,169,255,.16)'},
    {id:'sand',name:'Песок',bg:'#17130d',panel:'#211b12',panel2:'#2c2518',text:'#fff8ea',muted:'#c0b39d',line:'#493e2c',a:'#d6a35b',b:'#ead18c',soft:'rgba(214,163,91,.16)'},
    {id:'paper',name:'Бумага',bg:'#f3f0e8',panel:'#fffdf8',panel2:'#eee9dd',text:'#1b1a17',muted:'#736f66',line:'#ddd6c7',a:'#6d5ce7',b:'#249ebd',soft:'rgba(109,92,231,.13)'},
    {id:'snow',name:'Снег',bg:'#f3f6f9',panel:'#ffffff',panel2:'#eef2f6',text:'#17202a',muted:'#697585',line:'#d8e0e8',a:'#3d73e8',b:'#26a9c9',soft:'rgba(61,115,232,.12)'}
  ];
  var fonts = [
    {id:'system',name:'System',sample:'Системный — быстро и чисто',stack:'-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif'},
    {id:'humanist',name:'Humanist',sample:'Мягкий и дружелюбный',stack:'Trebuchet MS,Segoe UI,sans-serif'},
    {id:'classic',name:'Classic',sample:'Классический учебный',stack:'Georgia,"Times New Roman",serif'},
    {id:'serif',name:'Serif',sample:'Спокойный книжный',stack:'Palatino Linotype,Georgia,serif'},
    {id:'mono',name:'Mono',sample:'Строгий технический',stack:'"Courier New",monospace'}
  ];
  var state = loadState();
  var route = parseHash();
  var toastTimer = null;
  var tgBackHandler = null;

  function $(id){return document.getElementById(id)}
  function esc(s){var d=document.createElement('div');d.textContent=s==null?'':String(s);return d.innerHTML}
  function getSubject(id){var i,s;for(i=0;i<data.subjects.length;i++){s=data.subjects[i];if(String(s.id)===String(id))return s}return null}
  function getLecture(s,num){var i;if(!s)return null;for(i=0;i<s.lectures.length;i++)if(Number(s.lectures[i].num)===Number(num))return s.lectures[i];return null}
  function getCards(s,num){var out=[],i,c;if(!s)return out;for(i=0;i<s.cards.length;i++){c=s.cards[i];if(Number(c.lecture)===Number(num))out.push(c)}return out}
  function getQuestions(s,num){var out=[],i,q;if(!s)return out;for(i=0;i<(s.questions||[]).length;i++){q=s.questions[i];if(Number(q.lecture)===Number(num))out.push(q)}return out}
  function key(s,l){return s.id+'::'+l.id}
  function isDone(s,l){return !!state.done[key(s,l)]}
  function subjectProgress(s){var done=0,i;for(i=0;i<s.lectures.length;i++)if(isDone(s,s.lectures[i]))done++;return done}
  function totalDone(){var n=0,i,s;for(i=0;i<data.subjects.length;i++){s=data.subjects[i];n+=subjectProgress(s)}return n}
  function totalLectures(){var n=0,i;for(i=0;i<data.subjects.length;i++)n+=data.subjects[i].lectures.length;return n}

  function loadState(){
    var base={theme:'midnight',font:'system',fs:16,done:{}};
    try{var raw=localStorage.getItem(STORE);if(raw){var o=JSON.parse(raw);if(o){for(var k in o)base[k]=o[k]}}}catch(e){}
    return base;
  }
  function save(){try{localStorage.setItem(STORE,JSON.stringify(state))}catch(e){}}
  function applyAppearance(){
    var t=themes.find(function(x){return x.id===state.theme})||themes[0];
    var f=fonts.find(function(x){return x.id===state.font})||fonts[0];
    var r=document.documentElement.style;
    r.setProperty('--bg',t.bg);r.setProperty('--panel',t.panel);r.setProperty('--panel2',t.panel2);r.setProperty('--text',t.text);r.setProperty('--muted',t.muted);r.setProperty('--line',t.line);r.setProperty('--accent',t.a);r.setProperty('--accent2',t.b);r.setProperty('--soft',t.soft);r.setProperty('--font',f.stack);r.setProperty('--fs',(Number(state.fs)||16)+'px');
    if(t.bg.charAt(0)==='#')document.querySelector('meta[name="theme-color"]').setAttribute('content',t.bg);
    if(tg){try{tg.setHeaderColor(t.bg);tg.setBackgroundColor(t.bg);if(tg.setBottomBarColor)tg.setBottomBarColor(t.bg)}catch(e){}}
  }
  function syncTgTheme(){
    if(!tg)return;
    try{tg.ready();tg.expand();if(tg.onEvent)tg.onEvent('themeChanged',function(){})}catch(e){}
  }
  function showToast(msg){clearTimeout(toastTimer);var el=$('toast');el.textContent=msg;el.classList.add('show');toastTimer=setTimeout(function(){el.classList.remove('show')},1600)}
  function go(hash){location.hash=hash}
  function parseHash(){
    var h=location.hash||'#/';
    var p=h.split('/');
    if(p[1]==='subject'&&p[2])return {name:'subject',id:decodeURIComponent(p[2])};
    if(p[1]==='lecture'&&p[2]&&p[3])return {name:'lecture',id:decodeURIComponent(p[2]),num:Number(p[3])};
    if(p[1]==='settings')return {name:'settings'};
    if(p[1]==='search')return {name:'search'};
    return {name:'home'};
  }
  function updateTopbar(){
    route=parseHash();
    var crumb='Конспекты',title='Предметы';
    if(route.name==='subject'){var s=getSubject(route.id);crumb=s?s.name:'Предмет';title='Лекции'}
    if(route.name==='lecture'){var ls=getSubject(route.id),ll=getLecture(ls,route.num);crumb=ls?ls.name:'Лекция';title=ll?ll.title:'Лекция'}
    if(route.name==='settings'){crumb='Конспекты';title='Оформление'}
    if(route.name==='search'){crumb='Конспекты';title='Поиск'}
    $('crumb').textContent=crumb;$('screenTitle').textContent=title;
    var backVisible=route.name!=='home';
    if(tg){try{
      if(tg.BackButton && tg.BackButton.offClick && tgBackHandler) tg.BackButton.offClick(tgBackHandler);
      if(backVisible){
        tgBackHandler=function(){history.back()};
        tg.BackButton.onClick(tgBackHandler);
        tg.BackButton.show();
      }else{
        tgBackHandler=null;
        tg.BackButton.hide();
      }
    }catch(e){}}
    var items=document.querySelectorAll('.bottom-item');for(var i=0;i<items.length;i++){var r=items[i].getAttribute('data-route');items[i].classList.toggle('active',(route.name==='home'&&r==='#/')||(route.name==='search'&&r==='#/search')||(route.name==='settings'&&r==='#/settings'))}
  }
  function render(){
    updateTopbar();
    if(route.name==='home')renderHome();else if(route.name==='subject')renderSubject();else if(route.name==='lecture')renderLecture();else if(route.name==='settings')renderSettings();else renderSearch();
    renderDrawer();
    if(route.name==='home'||route.name==='search'||route.name==='settings') window.scrollTo(0,0);
  }
  function renderHome(){
    var root=$('screen'),html='<div class="page-intro"><h1>Что учим?</h1><p>'+totalLectures()+' лекций · '+totalDone()+' пройдено</p></div><div class="grid">';
    for(var i=0;i<data.subjects.length;i++){var s=data.subjects[i],done=subjectProgress(s),pct=s.lectures.length?Math.round(done/s.lectures.length*100):0;html+='<button class="subject-card" type="button" data-subject="'+esc(s.id)+'"><div class="card-top"><div class="card-icon">'+esc((s.name||'К').slice(0,1))+'</div><div class="card-copy"><div class="card-title">'+esc(s.name)+'</div><div class="card-meta">'+s.lectures.length+' лекц. · '+done+' пройдено</div></div><div class="card-arrow">›</div></div><div class="progress"><i style="width:'+pct+'%"></i></div></button>'}
    html+='</div>';root.innerHTML=html;
    root.querySelectorAll('[data-subject]').forEach(function(b){b.addEventListener('click',function(){go('#/subject/'+encodeURIComponent(b.getAttribute('data-subject')))})});
  }
  function renderSubject(){
    var root=$('screen'),s=getSubject(route.id);if(!s){go('#/');return}
    var done=subjectProgress(s),pct=s.lectures.length?Math.round(done/s.lectures.length*100):0;
    var html='<div class="back-row"><button class="back-btn" id="backSubject">‹ Все предметы</button></div><div class="page-intro"><h1>'+esc(s.name)+'</h1><p>'+s.lectures.length+' лекц. · '+done+' пройдено</p><div class="progress"><i style="width:'+pct+'%"></i></div></div><div class="grid">';
    for(var i=0;i<s.lectures.length;i++){var l=s.lectures[i],cs=getCards(s,l.num),is=isDone(s,l);html+='<button class="lecture-card '+(is?'done':'')+'" type="button" data-lecture="'+l.num+'"><div class="card-top"><div class="card-icon">'+(is?'✓':String(l.num))+'</div><div class="card-copy"><div class="card-title">'+esc(l.title)+'</div><div class="card-meta">'+cs.length+' раздел.'+(l.summary?' · '+esc(l.summary.slice(0,88))+'…':'')+'</div></div><div class="card-arrow">›</div></div></button>'}
    html+='</div>';root.innerHTML=html;
    $('backSubject').addEventListener('click',function(){go('#/')});
    root.querySelectorAll('[data-lecture]').forEach(function(b){b.addEventListener('click',function(){go('#/lecture/'+encodeURIComponent(s.id)+'/'+b.getAttribute('data-lecture'))})});
  }
  function renderLecture(){
    var root=$('screen'),s=getSubject(route.id),l=getLecture(s,route.num);if(!s||!l){go('#/');return}
    var cs=getCards(s,l.num),html='<div class="back-row"><button class="back-btn" id="backLecture">‹ '+esc(s.name)+'</button></div><div class="reader-head"><h1>'+esc(l.title)+'</h1><div class="summary">'+esc(l.summary||'')+'</div></div><div id="readMode">';
    for(var i=0;i<cs.length;i++){var c=cs[i],body=(c.body||'<p>Раздел пуст.</p>');html+='<article class="reader-card"><h2>'+esc(c.title||'Раздел')+'</h2>'+body+'</article>'}
    if(!cs.length)html+='<div class="empty">У лекции пока нет материала.</div>';
    html+='</div><div id="quizMode" class="hidden"></div><div class="reader-actions"><button id="readTab" class="action-btn primary" type="button">Читать</button><button id="quizTab" class="action-btn" type="button">Квиз</button></div>';
    root.innerHTML=html;
    root.querySelectorAll('.reader-card table').forEach(function(t){var w=document.createElement('div');w.className='table-wrap';t.parentNode.insertBefore(w,t);w.appendChild(t)});
    $('backLecture').addEventListener('click',function(){go('#/subject/'+encodeURIComponent(s.id))});
    $('readTab').addEventListener('click',function(){toggleReader('read')});
    $('quizTab').addEventListener('click',function(){toggleReader('quiz')});
    root.dataset.qIndex='0';
    $('readMode').style.display='block';$('quizMode').style.display='none';
  }
  function toggleReader(mode){
    var read=$('readMode'),quiz=$('quizMode'),rb=$('readTab'),qb=$('quizTab');
    if(mode==='quiz'){read.style.display='none';quiz.classList.remove('hidden');rb.classList.remove('primary');qb.classList.add('primary');renderQuiz()}else{read.style.display='block';quiz.classList.add('hidden');rb.classList.add('primary');qb.classList.remove('primary')}
  }
  function renderQuiz(){
    var s=getSubject(route.id),qs=getQuestions(s,route.num),root=$('quizMode');if(!qs.length){root.innerHTML='<div class="empty">Для этой лекции вопросов пока нет.</div>';return}
    var index=Math.max(0,Math.min(Number($('screen').dataset.qIndex)||0,qs.length-1)),q=qs[index],answer=q.hint||'Ответ пока не добавлен.';
    root.innerHTML='<div class="quiz-box"><div class="quiz-count">Вопрос '+(index+1)+' из '+qs.length+'</div><h2>'+((q.q)||'')+'</h2><details class="answer"><summary>Показать ответ</summary><div class="answer-body">'+answer+'</div></details><button class="next-btn" id="nextQ" type="button">'+(index+1<qs.length?'Следующий вопрос':'Начать заново')+'</button></div>';
    $('nextQ').addEventListener('click',function(){$('screen').dataset.qIndex=String((index+1)%qs.length);renderQuiz()});
  }
  function renderSearch(){
    var root=$('screen');root.innerHTML='<div class="page-intro"><h1>Поиск</h1><p>Ищи по предметам и лекциям</p></div><div class="search-box"><span>⌕</span><input id="searchInput" placeholder="Например, кинематика"></div><div id="searchResults"></div>';
    var input=$('searchInput');input.addEventListener('input',runSearch);input.focus();runSearch();
  }
  function runSearch(){
    var q=($('searchInput').value||'').trim().toLowerCase(),html='',found=0;if(!q){$('searchResults').innerHTML='<div class="empty">Начни вводить название предмета или лекции.</div>';return}
    for(var i=0;i<data.subjects.length;i++){var s=data.subjects[i];for(var j=0;j<s.lectures.length;j++){var l=s.lectures[j],hay=(s.name+' '+l.title+' '+(l.summary||'')).toLowerCase();if(hay.indexOf(q)!==-1){found++;html+='<button class="lecture-card" data-result="'+esc(s.id)+'|'+l.num+'" type="button"><div class="card-top"><div class="card-icon">'+esc((s.name||'К').slice(0,1))+'</div><div class="card-copy"><div class="card-title">'+esc(l.title)+'</div><div class="card-meta">'+esc(s.name)+'</div></div><div class="card-arrow">›</div></div></button>'}}}
    $('searchResults').innerHTML=found?'<div class="grid">'+html+'</div>':'<div class="empty">Ничего не найдено.</div>';
    $('searchResults').querySelectorAll('[data-result]').forEach(function(b){b.addEventListener('click',function(){var p=b.getAttribute('data-result').split('|');go('#/lecture/'+encodeURIComponent(p[0])+'/'+p[1])})});
  }
  function renderSettings(){
    var root=$('screen'),html='<div class="back-row"><button class="back-btn" id="settingsBack">‹ На главную</button></div><div class="page-intro"><h1>Оформление</h1><p>Настройки сохраняются на этом устройстве.</p></div>';
    html+='<section class="settings-group"><h2>Темы</h2><div class="theme-grid">';
    themes.forEach(function(t){html+='<button type="button" class="theme-option '+(state.theme===t.id?'active':'')+'" data-theme="'+t.id+'"><div class="swatches"><i style="background:'+t.a+'"></i><i style="background:'+t.b+'"></i></div><b>'+esc(t.name)+'</b><span>Приятная цветовая схема</span></button>'});html+='</div></section>';
    html+='<section class="settings-group"><h2>Шрифт</h2><div class="font-grid">';fonts.forEach(function(f){html+='<button type="button" class="font-option '+(state.font===f.id?'active':'')+'" data-font="'+f.id+'" style="font-family:'+f.stack.replace(/"/g,'&quot;')+'"><b>'+esc(f.name)+'</b><span>'+esc(f.sample)+'</span></button>'});html+='</div></section>';
    html+='<section class="settings-group"><h2>Размер текста</h2><div class="range-row"><span>A</span><input id="fontRange" type="range" min="14" max="21" step="1" value="'+(Number(state.fs)||16)+'"><strong id="fontSizeValue">'+(Number(state.fs)||16)+' px</strong></div></section>';
    html+='<section class="settings-group"><button id="settingsReset" class="danger-btn" type="button">Сбросить прогресс</button></section>';
    root.innerHTML=html;$('settingsBack').addEventListener('click',function(){go('#/')});
    root.querySelectorAll('[data-theme]').forEach(function(b){b.addEventListener('click',function(){state.theme=b.getAttribute('data-theme');applyAppearance();save();render();showToast('Тема изменена')})});
    root.querySelectorAll('[data-font]').forEach(function(b){b.addEventListener('click',function(){state.font=b.getAttribute('data-font');applyAppearance();save();render();showToast('Шрифт изменён')})});
    $('fontRange').addEventListener('input',function(){state.fs=Number(this.value)||16;applyAppearance();save();$('fontSizeValue').textContent=state.fs+' px'});
    $('settingsReset').addEventListener('click',resetProgress);
  }
  function renderDrawer(){
    $('drawerStats').textContent=totalLectures()+' лекций · '+totalDone()+' пройдено';
    var q=$('quickThemes');q.innerHTML='';themes.slice(0,10).forEach(function(t){var b=document.createElement('button');b.type='button';b.className='theme-btn'+(state.theme===t.id?' active':'');b.innerHTML='<div class="theme-dots"><i class="theme-dot" style="background:'+t.a+'"></i><i class="theme-dot" style="background:'+t.b+'"></i></div><span>'+esc(t.name)+'</span>';b.addEventListener('click',function(){state.theme=t.id;applyAppearance();save();render();showToast('Тема изменена')});q.appendChild(b)});
    var f=$('quickFonts');f.innerHTML='';fonts.forEach(function(x){var b=document.createElement('button');b.type='button';b.className='font-btn'+(state.font===x.id?' active':'');b.style.fontFamily=x.stack;b.innerHTML='<b>'+esc(x.name)+'</b><span>'+esc(x.sample)+'</span>';b.addEventListener('click',function(){state.font=x.id;applyAppearance();save();render();showToast('Шрифт изменён')});f.appendChild(b)});
  }
  function resetProgress(){state.done={};save();render();closeDrawer();showToast('Прогресс сброшен')}
  function openDrawer(){var d=$('drawer');d.classList.remove('hidden');d.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'}
  function closeDrawer(){var d=$('drawer');d.classList.add('hidden');d.setAttribute('aria-hidden','true');document.body.style.overflow=''}

  $('menuBtn').addEventListener('click',openDrawer);$('drawerClose').addEventListener('click',closeDrawer);$('drawerShade').addEventListener('click',closeDrawer);$('resetProgress').addEventListener('click',resetProgress);$('searchBtn').addEventListener('click',function(){go('#/search')});
  document.querySelectorAll('.bottom-item,.drawer-link').forEach(function(b){b.addEventListener('click',function(){go(b.getAttribute('data-route'));closeDrawer()})});
  window.addEventListener('hashchange',function(){render()});
  window.addEventListener('load',function(){syncTgTheme();applyAppearance();render()});
})();
