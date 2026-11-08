(()=>{

const isTeacher=()=>document.documentElement.dataset.teacher==='on';
let lastOpenSeg=0;
tl.addEventListener('toggle',e=>{const d=e.target.closest('.seg');if(!d)return;if(d.open)lastOpenSeg=+d.dataset.i;if(!window.__applying)window.__pub&&window.__pub()},true);
const curTab=()=>(document.querySelector('section.panel.active')||{}).id||'overview';
const ANCH=':is(h1,.lead,.flow,.bento,.sec-head,.card,.seg,.callout,.ask,details.qa)';
const anchors=()=>[...document.querySelectorAll('section.panel.active '+ANCH)].filter(e=>!e.closest('.teacher-only')&&e.offsetParent!==null);
const headH=()=>document.querySelector('header.top').getBoundingClientRect().bottom;
function scrollPos(){if(scrollY<12)return{i:-1,f:0};const h=headH(),L=anchors();for(let i=0;i<L.length;i++){const r=L[i].getBoundingClientRect();if(r.bottom>h+4){return{i,f:Math.max(0,Math.min(1,(h-r.top)/Math.max(1,r.height)))}}}return{i:L.length-1,f:1}}
function goScroll(sp){if(!sp)return;if(sp.i<0){window.scrollTo({top:0,behavior:'smooth'});return}const L=anchors();const el=L[Math.min(sp.i,L.length-1)];if(!el)return;const r=el.getBoundingClientRect();window.scrollTo({top:Math.max(0,r.top+scrollY-headH()+sp.f*r.height),behavior:'smooth'})}
const state=()=>({v:1,tab:curTab(),seg:lastOpenSeg,open:$$('.seg').map(d=>d.open?1:0),timer:tState,scroll:scrollPos(),at:Date.now()});
let room=qs.get('room');let bc=null;
const topic=c=>'creatup-vibe-w2-'+c;
const newCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(6)),b=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b%32]).join('');
if(!room){/* teacher side */
  let code=store.get('syncCode',null);if(!code){code=newCode();store.set('syncCode',code)}
  let live=false,timer=null;
  const studentLink=()=>location.origin+location.pathname+'?mode=student&room='+code;
  const paint=()=>{$('#syncCode').textContent=code;$('#syncToggle').textContent=live?'연동 멈추기':'연동 시작';$('#syncDot').classList.toggle('live',live)};
  const send=()=>{if(!live||!isTeacher())return;const msg=JSON.stringify(state());try{bc&&bc.postMessage(msg)}catch(e){}fetch('https://ntfy.sh/'+topic(code),{method:'POST',body:msg}).then(r=>{if(r.status===429){clearTimeout(timer);timer=setTimeout(()=>{lastSent=Date.now();send()},5000)}}).catch(()=>toast('연동 전송에 실패했습니다. 인터넷 연결을 확인하세요.'))};
  let lastSent=0;
  const gated=()=>{const wait=Math.max(0,1200-(Date.now()-lastSent));clearTimeout(timer);timer=setTimeout(()=>{lastSent=Date.now();send()},wait)};
  window.__pub=()=>{clearTimeout(timer);timer=setTimeout(()=>{lastSent=Date.now();send()},250)};
  let scT=null;window.addEventListener('scroll',()=>{if(!live||!isTeacher())return;clearTimeout(scT);scT=setTimeout(()=>{if(!live||!isTeacher())return;const msg=JSON.stringify(state());try{bc&&bc.postMessage(msg)}catch(e){}gated()},350)},{passive:true});
  $('#syncBtn').onclick=e=>{e.stopPropagation();const p=$('#syncPop');p.classList.toggle('on');$('#syncBtn').setAttribute('aria-expanded',p.classList.contains('on'))};
  document.addEventListener('click',e=>{if(!e.target.closest('#syncPop,#syncBtn'))$('#syncPop').classList.remove('on')});
  $('#syncToggle').onclick=()=>{live=!live;if(live){bc=('BroadcastChannel' in window)?new BroadcastChannel(topic(code)):null;send();toast('연동을 시작했습니다')}else{bc&&bc.close();bc=null;toast('연동을 멈췄습니다')}paint()};
  $('#syncCopy').onclick=e=>copyText(studentLink(),e.currentTarget);
  $('#syncNew').onclick=()=>{if(live&&!confirm('새 코드를 만들면 지금 연결된 수강생 화면은 더 이상 따라오지 않습니다. 계속할까요?'))return;code=newCode();store.set('syncCode',code);if(live){bc&&bc.close();bc=('BroadcastChannel' in window)?new BroadcastChannel(topic(code)):null;send()}paint()};
  setInterval(()=>{if(live)send()},60000);
  paint();
}else{/* student side */
  room=room.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12);
  let follow=true,lastAt=0;
  const bar=$('#followBar');bar.classList.add('on');$('#tStart').style.display='none';$('#tReset').style.display='none';
  const paint=()=>{bar.classList.toggle('paused',!follow);$('#followTxt').innerHTML=follow?'<span class="dot live"></span>강사 화면을 따라가는 중':'<span class="dot"></span>따라가기를 멈췄습니다';$('#followBtn').textContent=follow?'잠시 멈추기':'다시 따라가기'};
  let pending=null;
  const apply=m=>{let d;try{d=JSON.parse(m)}catch(e){return}if(!d||d.v!==1||d.at<lastAt)return;lastAt=d.at;pending=d;if(!follow)return;
    if(d.timer){tState=d.timer;store.set('timer',tState);tick()}
    const tgt=d.tab&&document.getElementById(d.tab);if(tgt&&!tgt.classList.contains('teacher-only')&&d.tab!==curTab())show(d.tab);
    if(Array.isArray(d.open)){window.__applying=true;$$('.seg').forEach((el,i)=>{const o=!!d.open[i];if(el.open!==o)el.open=o});setTimeout(()=>window.__applying=false,0)}else if(typeof d.seg==='number'){const el=document.querySelector(`.seg[data-i="${d.seg}"]`);if(el&&!el.open)el.open=true}
    if(d.scroll)requestAnimationFrame(()=>requestAnimationFrame(()=>goScroll(d.scroll)))};
  $('#followBtn').onclick=()=>{follow=!follow;paint();if(follow&&pending){lastAt=0;apply(JSON.stringify(pending))}};
  if('BroadcastChannel' in window){const b=new BroadcastChannel(topic(room));b.onmessage=e=>apply(e.data)}
  fetch('https://ntfy.sh/'+topic(room)+'/json?poll=1&since=latest').then(r=>r.text()).then(t=>{const ln=t.trim().split('\n').filter(Boolean).pop();if(ln){const j=JSON.parse(ln);if(j.event==='message')apply(j.message)}}).catch(()=>{});
  const connect=()=>{const es=new EventSource('https://ntfy.sh/'+topic(room)+'/sse');es.onmessage=e=>{try{const j=JSON.parse(e.data);if(j.event==='message')apply(j.message)}catch(_){}};es.onerror=()=>{}};
  connect();paint();
}

})();