function ringLayout(players,banker){const m=players.length,f=document.getElementById('felt'),tp=document.getElementById('top');
 if(f)f.classList.toggle('nobk',!banker);
 if(m>=5){/* big table: compact 3-across grid */
  if(tp)tp.classList.add('dense');if(f)f.classList.add('densef');
  const gap=142,y0=banker?180:132,xs=[17,50,83],out=[];
  players.forEach((p,i)=>{const r=Math.floor(i/3),c=i%3,left=players.length-r*3;
   const x=left>=3?xs[c]:left==2?[30,70][c]:50;out.push({p,x,y:y0+gap*r})});
  const rows=Math.ceil(m/3),H=y0+gap*(rows-1)+150;
  if(banker)out.push({p:banker,x:50,y:62});return {out,H,cy:H-78}}
 if(tp)tp.classList.remove('dense');if(f)f.classList.remove('densef');
 const k=Math.max(1,Math.ceil(m/2)),gap=205;
 const topY=banker?210:128,ys=i=>topY+gap*(k-1-i),H=topY+gap*(k-1)+98;
 const out=[];const L=players.slice(0,k),R=players.slice(k);
 L.forEach((p,i)=>out.push({p,x:16,y:ys(i)}));R.forEach((p,i)=>out.push({p,x:84,y:ys(i)}));
 if(banker)out.push({p:banker,x:50,y:72});
 return {out,H,cy:banker?Math.max(150,Math.round(H*0.5)-30):Math.round(H/2)-30}}

/* ================= config ================= */
const SB_URL='https://zdikuwkuvnonlytaaera.supabase.co';
const SB_KEY='sb_publishable_6z-CgA9sueQZ-mmN-nnG2w_5Xv2jOlp';
const FN=SB_URL+'/functions/v1/game';
const $=id=>document.getElementById(id);
const fmtc=v=>(v<0?'-':'')+Math.abs(Math.round(v)).toLocaleString();
const sgn=v=>(v>0?'+':v<0?'-':'')+Math.abs(Math.round(v)).toLocaleString();
let ME=null;            // {code,pid,token,name}
let V=null;             // latest view
let autoReveal=localStorage.getItem('ct.auto')==='1';let lastSeq=0,busy=false,pollT=null,chan=null,hints=true,mute=false,peeked=new Set(),peekGame=0;
try{const s=JSON.parse(localStorage.getItem('ct.session')||'null');if(s)ME=s;hints=localStorage.getItem('ct.hints')!=='0';mute=localStorage.getItem('ct.mute')==='1'}catch(e){}
function saveMe(){try{localStorage.setItem('ct.session',JSON.stringify(ME))}catch(e){}}
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id==id));if(id==='table')setTimeout(()=>fitTable(true),30)}
const FASTD=()=>!!(typeof V!=='undefined'&&V&&V.settings&&V.settings.fast);
function toast(t,ms=1800){const d=document.createElement('div');d.className='toast';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),ms)}

/* ================= sound ================= */
window._fxMute=()=>mute;let AC=null;window.ac=ac;function ac(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(AC&&AC.state=='suspended')AC.resume();return AC}
document.addEventListener('pointerdown',()=>ac());
function tone(f,t0,d,type='sine',v=0.08){const a=ac();if(!a)return;const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f,a.currentTime+t0);g.gain.setValueAtTime(v,a.currentTime+t0);g.gain.exponentialRampToValueAtTime(0.0001,a.currentTime+t0+d);o.connect(g);g.connect(a.destination);o.start(a.currentTime+t0);o.stop(a.currentTime+t0+d+0.02)}
function noise(t0,d,v=0.12,hp=1800){const a=ac();if(!a)return;const b=a.createBuffer(1,Math.max(1,Math.floor(a.sampleRate*d)),a.sampleRate),ch=b.getChannelData(0);for(let i=0;i<ch.length;i++)ch[i]=(Math.random()*2-1)*(1-i/ch.length);const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();f.type='highpass';f.frequency.value=hp;g.gain.value=v;s.buffer=b;s.connect(f);f.connect(g);g.connect(a.destination);s.start(a.currentTime+t0)}
function snd(k,n=1){if(mute)return;try{
 if(k=='deal')for(let i=0;i<Math.min(n,6);i++)noise(i*0.08,0.06,0.12);
 if(k=='flip')noise(0,0.05,0.1,2600);
 if(k=='chip'){tone(2300,0,0.05,'triangle',0.06);tone(3000,0.05,0.05,'triangle',0.05)}
 if(k=='win')[660,880,1320].forEach((f,i)=>tone(f,i*0.09,0.2,'triangle',0.07));
 if(k=='big')[523,659,784,1046,1318].forEach((f,i)=>tone(f,i*0.08,0.25,'triangle',0.07));
 if(k=='lose'){tone(300,0,0.18,'sawtooth',0.035);tone(200,0.15,0.3,'sawtooth',0.035)}
 if(k=='turn'){tone(880,0,0.12,'sine',0.07);tone(1175,0.12,0.16,'sine',0.07)}
 if(k=='tap')tone(1200,0,0.03,'square',0.03);
}catch(e){}}

/* ================= network ================= */
async function api(a,extra={}){
 const body=Object.assign({a},ME?{code:ME.code,pid:ME.pid,token:ME.token}:{},extra);
 const r=await fetch(FN,{method:'POST',headers:{'Content-Type':'application/json',apikey:SB_KEY},body:JSON.stringify(body)});
 const j=await r.json().catch(()=>({error:'Network error'}));if(j.error)throw new Error(j.error);if(j.view&&ME)apply(j.view);return j}
let pendingR=false;async function refresh(){if(!ME)return;if(busy){pendingR=true;return}busy=true;pendingR=false;try{await api('state')}catch(e){if(/Not in this room|Room not found|removed you/.test(e.message)){if(/removed you/.test(e.message))setTimeout(()=>toast('The host removed you from the room',3500),300);ME=null;saveMe();show('home')}}finally{busy=false;if(pendingR){pendingR=false;setTimeout(refresh,30)}}}
async function doAct(a,extra){snd('tap');try{await api(a,extra)}catch(e){toast(e.message)}}
function subscribe(){try{if(chan){chan.unsubscribe();chan=null}const sb=supabase.createClient(SB_URL,SB_KEY);
 chan=sb.channel('rv_'+ME.code).on('postgres_changes',{event:'*',schema:'public',table:'room_ver',filter:'code=eq.'+ME.code},()=>refresh()).subscribe()}catch(e){}
 clearInterval(pollT);pollT=setInterval(()=>{refresh();tickTimer()},2500)}
// local timer: when deadline/until passes, ask server to advance
let tickT=null;function tickTimer(){if(!V||!V.game)return;const g=V.game,skew=Date.now()-V._recv+V.now;const t=g.until||g.deadline;
 const bar=$('tbar').firstChild;if(g.deadline&&!g.until){const tot=(V.settings.timer||30)*1000,left=Math.max(0,g.deadline-skew);bar.style.width=(left/tot*100)+'%'}else bar.style.width='0';
 {const left=g.deadline&&!g.until?Math.max(0,g.deadline-skew):0,tot=(V.settings.timer||30)*1000;document.querySelectorAll('.cdring').forEach(r=>r.style.setProperty('--p',(left/tot*100)+'%'));const dc=$('dclock');if(dc&&g.deadline){const sec=Math.ceil(left/1000);dc.textContent=sec+'s';dc.classList.toggle('hurry',sec<=5)}}
 if(t&&skew>=t+150&&!tickT){tickT=setTimeout(()=>{tickT=null;refresh()},60+Math.random()*180)}}
setInterval(tickTimer,250);

/* ================= home ================= */
$('hName').value=(ME&&ME.name)||localStorage.getItem('ct.name')||'';
const qs=new URLSearchParams(location.search);if(qs.get('room'))$('hCode').value=qs.get('room').toUpperCase();
$('hCode').addEventListener('input',e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z]/g,'').slice(0,4);if(e.target.value.length===4&&$('hName').value.trim())$('hJoin').click()});
if(ME&&ME.code){const rj=document.createElement('button');rj.className='green';rj.style.cssText='width:100%;margin-top:10px';rj.textContent='↩ Rejoin room '+ME.code;rj.onclick=()=>{subscribe();refresh()};$('hErr').before(rj)}
{const rb=document.createElement('button');rb.className='ghost';rb.style.cssText='width:100%;margin-top:10px';rb.textContent='📖 How to play & payouts';rb.onclick=()=>FX.rules();document.querySelector('#home .card2').after(rb)}
$('hCreate').onclick=async()=>{const name=$('hName').value.trim()||'Host';localStorage.setItem('ct.name',name);
 try{ME=null;const j=await api('create',{name,settings:{}});ME={code:j.code,pid:j.pid,token:j.token,name};saveMe();subscribe();apply(j.view)}catch(e){$('hErr').textContent=e.message}};
$('hJoin').onclick=async()=>{const name=$('hName').value.trim()||'Player';const code=$('hCode').value.trim().toUpperCase();if(code.length!==4){$('hErr').textContent='Enter the 4-letter room code';return}
 if(ME&&ME.code===code){subscribe();refresh();return}
 localStorage.setItem('ct.name',name);
 try{ME=null;const j=await api('join',{code,name});ME={code:j.code,pid:j.pid,token:j.token,name};saveMe();subscribe();apply(j.view)}catch(e){$('hErr').textContent=e.message}};

/* ================= room lobby ================= */
$('rLeave').onclick=async()=>{if(!confirmBox())return;try{await api('leave')}catch(e){}ME=null;saveMe();clearInterval(pollT);show('home')};
function confirmBox(){return true}
$('rShare').onclick=async()=>{const url=location.origin+location.pathname+'?room='+V.code;const txt=`Join my Combo Table room ${V.code}: ${url}`;
 try{if(navigator.share){await navigator.share({title:'Combo Table',text:txt,url});return}}catch(e){}
 try{await navigator.clipboard.writeText(txt);toast('Invite link copied')}catch(e){$('rShareNote').textContent=url}};
$('sSave').onclick=()=>saveSettings(true);
async function saveSettings(show_){const s={league:$('sLeague').value.trim(),fast:$('sFast').value==='1',min:+$('sMin').value,max:+$('sMax').value,timer:+$('sTimer').value,bots:+$('sBots').value,arrange:$('sArr').value};if(V.gameNo===0)s.start=+$('sStart').value;
 try{await api('settings',{settings:s});if(show_)toast('Saved')}catch(e){$('rErr').textContent=e.message}}
$('sStartBtn').onclick=async()=>{try{await saveSettings(false);await api('start',{banker:$('sBanker').value})}catch(e){$('rErr').textContent=e.message}};
$('tBack').onclick=()=>{if(V.phase!=='game'||V.game.phase==='summary')renderRoom(true);else if(V.host===ME.pid)hostControls();else toast('Game in progress — room menu after this game')};
let roomOverride=false;
function renderRoom(force){roomOverride=!!force;show('room');const v=V,isHost=v.host===ME.pid;if(isHost&&window._wasHost===false)toast('You are now the host');window._wasHost=isHost;
 $('rCode').textContent=v.code;pushLabel();if(window.PUSH&&PUSH.state()==='on'&&window._pushRoom!==v.code){window._pushRoom=v.code;PUSH.resync(pushSend)}$('rCount').textContent=`(${v.players.length}/8)`;
 $('rPlayers').innerHTML=v.players.map(p=>`<div class="prow"><span class="dot ${p.online?'on':''}"></span><span>${esc(p.name)}${p.pid===ME.pid?' <span class="tg">YOU</span>':''}${p.pid===v.host?' <span class="tg">HOST</span>':''}${p.bot?' <span class="tg">BOT</span>':''}${p.pid===v.banker&&v.phase==='game'?' <span class="tg bk">BANKER</span>':''}</span><span class="ch">${fmtc(p.chips)}</span>${isHost&&!(v.phase==='game'&&v.game.phase!=='summary')?`<button class="ghost topup" onclick="topUp('${p.pid}')">＋💰</button>`:''}${isHost&&!p.bot&&p.pid!==ME.pid?`<button class="ghost" style="padding:4px 9px;font-size:12px;color:#ff9a90" onclick="kick('${p.pid}')">Kick</button>`:''}</div>`).join('')+(isHost&&!(v.phase==='game'&&v.game.phase!=='summary')?`<button class="ghost resetall" onclick="resetChips()">🔄 Reset everyone's chips…</button>`:'');
 $('rHost').style.display=isHost?'block':'none';$('rGuest').style.display=isHost?'none':'block';
 const st=v.settings;
 if(isHost&&document.activeElement.tagName!=='INPUT'&&document.activeElement.tagName!=='SELECT'){$('sMin').value=st.min;$('sMax').value=st.max;$('sTimer').value=st.timer;$('sLeague').value=st.league||'';$('sFast').value=st.fast?'1':'0';$('sArr').value=st.arrange==='manual'?'manual':'auto';$('sBots').value=st.bots;$('sStart').value=st.start;$('sStart').disabled=v.gameNo>0;
  const sel=$('sBanker'),cur=sel.value;sel.innerHTML=v.players.filter(p=>!p.bot).map(p=>`<option value="${p.pid}">${esc(p.name)}${p.pid===ME.pid?' (you)':''}</option>`).join('');if(cur&&v.players.some(p=>p.pid===cur))sel.value=cur;
  $('sStartBtn').textContent=v.gameNo?'Deal next game ▶':'Deal ▶'}
 $('rSettingsTxt').textContent=`Bets ${st.min}–${st.max} · timer ${st.timer?st.timer+'s':'off'} · ${st.fast?'⚡ Fast deal · ':''}${st.league?'🏰 League '+st.league+' · ':''}start ${st.start} chips · Niu Niu manual · Combo auto`;
 $('rGuestTxt').textContent=v.phase==='game'&&v.game.phase!=='summary'?'A game is running — you will join the next one':'Waiting for the host to deal…';
 {const net=p=>p.chips-st.start-(p.buyin||0);const lb=[...v.players].sort((x,y)=>net(y)-net(x)).map((p,i)=>`<div class="lr ${p.pid===ME.pid?'me':''}"><span>${i==0?'🏆 ':''}${esc(p.name)}${p.buyin?` <span class="small">(bought in ${fmtc(p.buyin)})</span>`:''}</span><b class="${net(p)>0?'pos':net(p)<0?'neg':''}">${sgn(net(p))}</b></div>`).join('');
  let el=$('rLB');if(!el){el=document.createElement('div');el.className='card2';el.id='rLB';$('rLast').before(el)}el.innerHTML=v.gameNo?`<b>Leaderboard</b> <span class="small">(net chips · ${v.gameNo} game${v.gameNo>1?'s':''})</span><div class="lb">${lb}</div>`:'';el.style.display=v.gameNo?'block':'none'}
 const last=v.game&&v.game.phase==='summary';$('rLast').style.display=last?'block':'none';if(last)$('rLast').innerHTML='<b>Last game</b> <button class="ghost" style="padding:3px 10px;font-size:12px;float:right" onclick="showHistory(\'cur\')">📜 Replay</button>'+summaryTable(v)+breakdownHTML();
 if(v.phase==='game'&&v.game.phase!=='summary'&&!force){roomOverride=false;renderTable()}}
/* ---- Niu Niu drag-into-3-and-2 arranger (shared) ---- */
let NIU={key:'',a:[],b:[]},NIU_RR=null,NIU_CARDS=[];
function niuTile(c,i){return `<div class="ntile" data-i="${i}" onpointerdown="niuDown(event,${i})"><div class="slot"><div class="cd up"><div class="bc"></div>${cardFace(c)}</div></div></div>`}
function niuHTML(cards,hint,timer){NIU_CARDS=cards;const pool=[0,1,2,3,4].filter(i=>!NIU.a.includes(i)&&!NIU.b.includes(i));
 const aw=niuAw(cards),full=NIU.a.length===3,k=full?niuKeyPick(cards,NIU.a):null;
 let lab=full?(k[0]===0?"❌ These 3 don't make 10 → No Niu":niuLab(k)):`Tap or drag 3 cards that make 10 (${NIU.a.length}/3)`;
 if(aw.m)lab+=(k&&k[0]&&niuMult(k)>aw.m)?` · beats your ${aw.n} ×${aw.m} ✓`:` · ${aw.n} ×${aw.m} counts`;
 return `<div class="decide"><div class="dtop"><div class="dpts">🐂 Arrange Niu Niu</div>${timer||''}</div>
 <div class="nzones"><div class="nzone three ${full?'full':''}" data-z="a"><div class="nzt">3 · make 10</div><div class="nzc">${NIU.a.map(i=>niuTile(cards[i],i)).join('')}</div></div>
 <div class="nzone two" data-z="b"><div class="nzt">2 · points</div><div class="nzc">${NIU.b.map(i=>niuTile(cards[i],i)).join('')}</div></div></div>
 <div class="nzone pool" data-z="p"><div class="nzc">${pool.length?pool.map(i=>niuTile(cards[i],i)).join(''):'<span class="small">All placed · drag to swap</span>'}</div></div>
 <div class="alab ${full&&k[0]?'ok':''}">${lab}</div>${hint?`<div class="hint" style="margin:4px 0 6px">${hint}</div>`:''}
 <div class="dbtns"><button class="dbig stand" onclick="niuSend(true)">🚫 NO NIU<small>can't make 10</small></button><button class="dbig draw ${full?'best':''}" ${full?'':'disabled'} onclick="niuSend(false)">✅ CONFIRM<small>${full?'lock it in':'place 3 cards'}</small></button></div></div>`}
function niuPlace(i,z,tgt){
 if(tgt!=null&&tgt!==i){const zt=NIU.a.includes(tgt)?'a':NIU.b.includes(tgt)?'b':'p',zi=NIU.a.includes(i)?'a':NIU.b.includes(i)?'b':'p';
  if(zt===z&&zt!=='p'&&(z==='a'?NIU.a.length>=3:NIU.b.length>=2)&&zi!==z){const sw=(arr)=>arr.map(x=>x===tgt?i:x===i?tgt:x);NIU.a=sw(NIU.a);NIU.b=sw(NIU.b);if(zi==='p'){}try{snd&&snd('tap')}catch(e){}if(NIU_RR)NIU_RR();return}}
 const inA=NIU.a.includes(i),inB=NIU.b.includes(i);NIU.a=NIU.a.filter(x=>x!==i);NIU.b=NIU.b.filter(x=>x!==i);
 if(z==='a'){if(NIU.a.length>=3){const out=NIU.a.shift();if(inB)NIU.b.push(out)}NIU.a.push(i)}
 else if(z==='b'){if(NIU.b.length>=2){const out=NIU.b.shift();if(inA)NIU.a.push(out)}NIU.b.push(i)}
 if(NIU.a.length===3)NIU.b=[0,1,2,3,4].filter(x=>!NIU.a.includes(x));
 try{snd&&snd('tap')}catch(e){}if(NIU_RR)NIU_RR()}
window.niuDown=(e,i)=>{e.preventDefault();const el=e.currentTarget,sx=e.clientX,sy=e.clientY;let ghost=null;
 const from=el.closest('.nzone')?.dataset.z||'p';
 const mv=ev=>{const dx=ev.clientX-sx,dy=ev.clientY-sy;if(!ghost&&Math.hypot(dx,dy)>6){ghost=el.cloneNode(true);ghost.classList.add('dragging','nghost');document.body.appendChild(ghost);el.style.opacity='.25';window.__drag=true}
  if(ghost){ghost.style.left=(ev.clientX-25)+'px';ghost.style.top=(ev.clientY-36)+'px';document.querySelectorAll('.nzone').forEach(z=>z.classList.remove('hot'));const t=document.elementFromPoint(ev.clientX,ev.clientY);const z=t&&t.closest&&t.closest('.nzone');if(z)z.classList.add('hot')}};
 const up=ev=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',up);removeEventListener('pointercancel',up);
  if(ghost){ghost.remove();window.__drag=false;const t=document.elementFromPoint(ev.clientX,ev.clientY);const z=t&&t.closest&&t.closest('.nzone');const tt=t&&t.closest&&t.closest('.ntile');niuPlace(i,z?z.dataset.z:from,tt?+tt.dataset.i:null)}
  else niuPlace(i,from==='p'?(NIU.a.length<3?'a':'b'):'p')};
 addEventListener('pointermove',mv);addEventListener('pointerup',up);addEventListener('pointercancel',up)};

window.niuSend=none=>doAct('niu',{pick:none?[]:NIU.a.slice()});
window.kick=pid=>{const p=V.players.find(x=>x.pid===pid);if(!p)return;const mid=V.phase==='game'&&V.game&&V.game.phase!=='summary'&&V.game.seats[pid];
 if(!confirm(`Kick ${p.name}?${mid?' They\'ll be auto-played to the end of this game, then removed.':''} They can't rejoin this room.`))return;doAct('kick',{target:pid});toast(p.name+' removed')};
window.setTimer=v=>{doAct('timer',{timer:+v});toast(+v?`⏱ ${v}s per decision`:'⏱ Timer off')};
window.hostControls=()=>{const v=V;const opts=[10,15,20,30,45,60,90,0];
 $('sheetIn').innerHTML=`<h2>Host controls</h2><div class="rhead" style="margin-top:6px">Decision timer (applies now)</div>
 <div class="tchips">${opts.map(o=>`<button class="ghost ${v.settings.timer===o?'on':''}" onclick="setTimer(${o});setTimeout(hostControls,400)">${o?o+'s':'Off'}</button>`).join('')}</div>
 <div class="rhead" style="margin-top:14px">Players</div>${v.players.filter(p=>!p.bot&&!p.kicked).map(p=>`<div class="prow" style="display:flex;align-items:center;gap:8px;padding:8px 2px;border-top:1px solid #ffffff14"><span class="dot ${p.online?'on':''}"></span><span style="flex:1">${esc(p.name)}${p.pid===ME.pid?' <span class="tg">YOU</span>':''}${p.online?'':' <span class="small">· away</span>'}</span>${p.pid!==ME.pid?`<button class="ghost" style="padding:6px 12px;color:#ff9a90" onclick="kick('${p.pid}');setTimeout(hostControls,500)">Kick</button>`:''}</div>`).join('')}
 <div class="sfoot"><button class="gold play" onclick="$('sheet').classList.remove('on')">Back to game</button></div>`;$('sheet').classList.add('on')};
let ARR={key:'',sel:[]};
function arrPanel(kind){const g=V.game,s=g.seats[ME.pid],cards=kind==='niu'?s.hand:[...s.hand,...g.comm],need=kind==='niu'?3:5,key=kind+V.gameNo;
 if(kind==='niu'){if(NIU.key!==key)NIU={key,a:[],b:[]};NIU_RR=renderActions;let hint='';if(hints){const b=bestNiuPick(cards);hint=`💡 Best: ${b.length?niuLab(niuKeyPick(cards,b)):'No Niu'}`}return niuHTML(cards,hint,'<div class="dclock" id="dclock"></div>')}
 if(ARR.key!==key)ARR={key,sel:[]};const sel=ARR.sel;
 let lab;if(kind==='niu'){const a=niuAw(cards);lab=sel.length===3?niuLab(niuKeyPick(cards,sel)):`Pick 3 cards that make 10 (${sel.length}/3)`;if(a.m)lab+=` · ${a.n} ×${a.m} counts unless this pays more`}
 else lab=sel.length===5?cLab(p5(sel.map(i=>cards[i]))):`Pick 5 cards (${sel.length}/5)`;
 let hint='';if(hints){if(kind==='niu'){const b=bestNiuPick(cards);hint=`💡 Best: ${b.length?niuLab(niuKeyPick(cards,b)):'No Niu'}`}else hint=`💡 Best: ${cLab(best7(cards))}`}
 const tiles=cards.map((c,i)=>`<div class="atile ${sel.includes(i)?'on':''} ${kind==='combo'&&i>=5?'comm':''}" onclick="arrTap(${i},'${kind}')"><div class="slot"><div class="cd up"><div class="bc"></div>${cardFace(c)}</div></div></div>`).join('');
 const ok=sel.length===need;
 return `<div class="decide"><div class="dtop"><div class="dpts">${kind==='niu'?'🐂 Arrange Niu Niu':'🃏 Pick your 5'}</div><div class="dclock" id="dclock"></div></div>
  <div class="atiles">${tiles}</div><div class="alab ${ok?'ok':''}">${lab}</div>${hint?`<div class="hint" style="margin:4px 0 6px">${hint}</div>`:''}
  <div class="dbtns">${kind==='niu'?`<button class="dbig stand" onclick="arrSend('niu',true)">🚫 NO NIU<small>can't make 10</small></button>`:''}<button class="dbig draw ${ok?'best':''}" ${ok?'':'disabled'} onclick="arrSend('${kind}')">✅ CONFIRM<small>${ok?'lock it in':'select '+need}</small></button></div></div>`}
window.arrTap=(i,kind)=>{const need=kind==='niu'?3:5;const k=ARR.sel.indexOf(i);if(k>=0)ARR.sel.splice(k,1);else if(ARR.sel.length<need)ARR.sel.push(i);else{ARR.sel.shift();ARR.sel.push(i)}snd('tap');renderActions()};
window.arrSend=(kind,none)=>{const pick=none?[]:ARR.sel.slice();doAct(kind,{pick})};
window.topUp=pid=>{const p=V.players.find(x=>x.pid===pid);if(!p)return;const a=prompt(`Top up ${p.name} — how many chips?`,String(V.settings.start));if(a==null)return;const n=Math.round(+a);if(!(n>0)){toast('Enter a number');return}api('topup',{target:pid,amount:n}).then(()=>toast(`${p.name} +${n} chips`)).catch(e=>toast(e.message))};
window.resetChips=()=>{const a=prompt("Reset EVERYONE's chips to how many? (leaderboard restarts)",String(V.settings.start));if(a==null)return;const n=Math.round(+a);if(!(n>=10)){toast('Minimum 10');return}if(!confirm(`Set every player to ${n} chips and restart the leaderboard?`))return;api('reset',{amount:n}).then(()=>toast(`Everyone reset to ${n} chips`)).catch(e=>toast(e.message))};
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}

/* ================= apply view ================= */
function apply(v){v._recv=Date.now();const prev=V;V=v;document.body.classList.toggle('fast',!!(v.settings&&v.settings.fast));duelBar(v);if(prev&&prev.gameNo!==v.gameNo){roomOverride=false;$('sheet').classList.remove('on')}
 if(prev&&prev.game&&v.game&&prev.gameNo!==v.gameNo){SEEN=new Map();peeked=new Set()}
 if(v.gameNo!==peekGame){peekGame=v.gameNo;peeked=new Set();SEEN=new Map()}
 if(v.duel&&v.phase==='lobby'){show('dwait');const left=Math.max(0,Math.ceil(((v.duel.wait||0)-(v.now+(Date.now()-v._recv)))/1000));$('dwaitIn').innerHTML=`<div style="font-size:40px">⚔️</div><h2 style="margin:6px 0">Challenging ${esc(v.duel.defName)}</h2><div class="small">for <b>${esc(v.duel.town)}</b> · waiting for them to accept…</div><div class="small" style="margin-top:10px">If they don't answer in ${left}s, their 👻 ghost plays instead.</div>`;clearTimeout(window._dwT);window._dwT=setTimeout(refresh,2000);return}
 const inGame=v.phase==='game'&&v.game&&(v.game.seats[ME.pid]||v.game.phase!=='summary');
 if(!inGame||roomOverride||(v.game.phase==='summary'&&!$('table').classList.contains('on')))renderRoom(roomOverride);else renderTable();
 // events → animations
 const evs=v.events.filter(e=>e.seq>lastSeq);if(lastSeq===0)evs.length=0;lastSeq=v.seq;
 if($('table').classList.contains('on'))playEvents(evs);
 if(v.game&&v.game.phase==='summary'&&prev&&prev.game&&prev.game.phase!=='summary')setTimeout(()=>showSummary(),900)}

/* ================= table rendering ================= */
let SEEN=new Map();let LOG=[],LOGR=null;
function cardFace(c){const red=(st(c)==0||st(c)==2);return `<div class="fc ${red?'red':''}"><span class="ix">${RN[rk(c)]}<br>${SY[st(c)]}</span><span class="pip">${SY[st(c)]}</span><span class="ix2">${RN[rk(c)]}<br>${SY[st(c)]}</span></div>`}
function cardEl(key,c,showFace,slot,tap){const prev=SEEN.get(key);let cls='';
 if(prev===undefined)cls='deal';SEEN.set(key,showFace?c:null);
 const flipNow=prev===null&&showFace;
 return `<div class="slot ${cls}" style="${cls?`animation:dealIn ${FASTD()?'.22s':'.4s'} ${slot*(FASTD()?35:70)}ms both`:''}" ${tap?`data-peek="${c}"`:''}><div class="cd ${showFace&&!flipNow?'up':''} ${tap?'tap':''}" ${flipNow?'data-flip="1"':''}><div class="bc"></div>${c!=null?cardFace(c):'<div class="fc"></div>'}</div></div>`}
function seatHand(pid,s,size,mine){const g=V.game;let groups=[s.hand.map((c,i)=>i)];
 // regroup when splits/niu revealed
 if(g.round===3&&s.si!=null&&s.hand.every(c=>c!=null)&&(g.phase==='r3done'||mine)){const sp=skSplits(s.hand)[s.si];groups=[sp.hi.map(c=>s.hand.indexOf(c)),sp.lo.map(c=>s.hand.indexOf(c))]}
 if(g.round===4&&s.np&&s.np.length===3&&s.hand.every(c=>c!=null)&&g.phase!=='r4set'){groups=[s.np,[0,1,2,3,4].filter(i=>!s.np.includes(i))]}else if(g.round===4&&g.phase!=='r4peek'&&g.phase!=='r4set'&&s.hand.length===5&&s.hand.every(c=>c!=null)&&!niuAw(s.hand).m){const nk=niuKey(s.hand);if(nk.grp)groups=[nk.grp.three.map(c=>s.hand.indexOf(c)),nk.grp.two.map(c=>s.hand.indexOf(c))]}
 let used=null;if(g.round===5&&g.phase!=='r5show'&&s.hand.length===5&&s.hand.every(c=>c!=null)&&g.comm&&g.comm.length===2){const c7=[...s.hand,...g.comm];const cp=s.cp||best7Pick(c7);used=new Set(cp)}
 let k=0;return groups.map(gr=>`<div class="grp" style="display:flex">${gr.map(i=>{const c=s.hand[i];const face=c!=null&&(!mine||peeked.has(c));const el=cardEl(pid+':'+i,c,face,k++,mine&&c!=null&&!peeked.has(c));return used?el.replace('class="slot','class="slot '+(used.has(i)?'cused':'cunused')):el}).join('')}</div>`).join('<div class="gsep"></div>')}
function seatLabel(pid,s){const g=V.game,h=s.hand,vis=h.every(c=>c!=null)&&(pid!==ME.pid||h.every(c=>peeked.has(c)));
 if(g.round===2&&g.phase!=='r2done'&&!vis)return s.pok?'Pok!':(g.phase==='r2bank'||g.phase==='r2turn')&&s.drew?'3 cards':'';
 if(!vis&&g.round>=2)return g.round===3&&g.phase==='r3set'?(s.set?'Set ✓':'Arranging…'):'';
 if(g.round===1)return `${RN[rk(h[0])]}${SY[st(h[0])]}`;
 if(g.round===2)return bEval(h).lab;
 if(g.round===3){if(s.si==null)return g.phase==='r3set'?(s.set?'Set ✓':'Arranging…'):'';if(allPic(h))return '4 Picture ×7';const sp=skSplits(h)[s.si];return `${skLabN(sp.kh)} / ${skLab(sp.kl)}`}
 if(g.round===4){const st_=g.seats[pid];if(g.phase==='r4set')return pid===ME.pid?'':(st_.nset?'✓ arranged':'arranging…');if(g.phase==='r4peek'&&pid!==ME.pid)return '';const a=niuAw(h);return niuLabEff(a,st_.np?niuKeyPick(h,st_.np):niuKey(h).k)}
 if(g.round===5){const st_=g.seats[pid];if(g.phase==='r5show')return pid===ME.pid?'':'…';if(g.phase==='r5set')return pid===ME.pid?'':(st_.cset?'✓ arranged':'arranging…');const c7=[...h,...g.comm];const cp=st_.cp||best7Pick(c7);const nc=cp.filter(i=>i>=5).length;return cLab(p5(cp.map(i=>c7[i])))+` · ${nc?'+'+nc+' comm':'own 5'}`}return ''}
const PN=pid=>{const p=V.players.find(x=>x.pid===pid);return p?p.name:'?'};
const RNM=['Bets','High Card','Thai Baccarat','Sikipi','Niu Niu','Combo Poker'];
function renderTable(){show('table');const v=V,g=v.game;if(g&&(g.round+':'+v.gameNo)!==LOGR){LOGR=g.round+':'+v.gameNo;LOG=[]}clearGhosts();const isB=v.banker===ME.pid;const SPEC=!g.seats[ME.pid];const meS=g.seats[ME.pid]||{hand:[],r:[0,0,0,0,0],bet:0,pub:[]};if(autoReveal&&!SPEC)meS.hand.forEach(c=>{if(c!=null)peeked.add(c)});if(g.phase!=='r2bank'){BK=null}if(g.phase!=='r3set')arranging=null;
 const meP=v.players.find(p=>p.pid===ME.pid);$('hBank').textContent=fmtc(meP.chips);$('hBank').className='v '+(meP.chips<v.settings.start?'neg':'');
 $('hRound').innerHTML=`<small>${g.round?`ROUND ${g.round}/5`:'ROOM '+v.code}</small>${g.phase==='bet'?'Place bets':RNM[g.round]}`;
 $('hintBtn').classList.toggle('on',hints);$('muteBtn').textContent=mute?'🔇':'🔊';
 // top seats
 const others=[v.banker,...g.order].filter(pid=>pid!==ME.pid);
 const pl=others.filter(p=>p!==v.banker);const RL=ringLayout(pl,isB?null:v.banker);$('top').style.height=RL.H+'px';$('centre').style.top=RL.cy+'px';
 let top=RL.out.map(o=>seatHTML(o.p,o.p===v.banker,0,[o.x,o.y])).join('');
 setH($('top'),top);
 // centre
 const cen={r5show:['Combo Poker','Community cards… best 5 of 7 · min pair'],r4set:['Niu Niu','Arrange: 3 cards making 10 + 2'],r5set:['Combo Poker','Pick your best 5 of 7'],bet:['Place your bets',`Bets ${v.settings.min}–${v.settings.max}`],r1:['High Card','Higher card wins · ♦<♣<♥<♠'],r2turn:['Thai Baccarat','Min 4 to stand · players take turns'],r2bank:['Thai Baccarat','Banker decides: draw · open · skip'],r2done:['Showdown',''],r3set:['Sikipi','Bottom ≥ Top · set face down'],r3done:['Sikipi reveal',''],r4peek:['Niu Niu','Peek your 5th card'],r4done:['Niu Niu',''],r5done:['Combo Poker','Best 5 of 7 · min pair'],summary:['Game over','']}[g.phase]||['',''];
 setH($('centre'),`<div class="banner" ${$('centre').dataset.k===g.phase?'style="animation:none"':''}>${cen[0]}${cen[1]?`<small>${cen[1]}</small>`:''}</div><div class="comm md" id="comm">${g.comm.map((c,i)=>cardEl('comm:'+i,c,true,i)).join('')}</div><div id="logline">${esc(LOG.slice(-2).join(' · '))}</div>`);$('centre').dataset.k=g.phase;
 // me
 $('mePlq').textContent=SPEC?'WATCHING · joins next game':isB?'YOU · BANKER':'YOU · PLAYER';$('mePlq').className='plq '+(isB?'':'blue');
 $('meBet').innerHTML=isB?'':meS.bet?`<span class="chip c${chipD(meS.bet)}">${meS.bet}</span> <b style="color:var(--gold)">${meS.bet}</b> <span class="delta ${delta(ME.pid)>0?'pos':delta(ME.pid)<0?'neg':''}">${delta(ME.pid)?sgn(delta(ME.pid)*1):''}</span>`:'';
 if(!arranging){const _z=$('meZone'),_h=`<div class="hand lg" id="meHand">${seatHand(ME.pid,meS,'lg',true)}</div>`;if(_z._h!==_h){_z._h=_h;_z.innerHTML=_h;bindPeek()}}
 $('meLab').textContent=seatLabel(ME.pid,meS);
 $('me').classList.toggle('actor',g.actor===ME.pid);
 setH($('btrayWrap'),isB?`<div class="btray" id="btray">${trayHTML(meP.chips)}</div><div class="btot">Banker chips ${fmtc(meP.chips)}</div>`:'');
 doFlips();renderActions()}
function delta(pid){const s=V.game.seats[pid];if(!s)return 0;if(pid===V.banker)return -V.game.order.reduce((a,q)=>{const t=V.game.seats[q];return a+t.r.reduce((x,y)=>x+y,0)*t.bet},0);return s.r.reduce((a,b)=>a+b,0)*s.bet}
const chipD=a=>a>=100?100:a>=25?25:a>=10?10:a>=5?5:1;
function seatHTML(pid,isB,dy=0,pos=null){const g=V.game,s=g.seats[pid],p=V.players.find(x=>x.pid===pid)||{name:'?'};const d=delta(pid);
 const rib=!isB&&g.round===2&&s.open!=null&&!s.pok?`<div class="ribbon big ${s.open?'open':'skip'}">${s.open?'OPENED':'SKIPPED'}</div>`:s.pok&&g.round===2?'<div class="ribbon open">POK</div>':'';
 const hd=bankHint(pid);
 return `<div class="seat ${isB?'bk':''} ${g.actor===pid?'actor':''} ${bankUI&&!isB&&bankUI.has(pid)?'':''}" data-pid="${pid}" style="${pos?`left:${pos[0]}%;top:${pos[1]}px`:`margin-top:${dy}px`}" ${bankTap(pid)}>
 ${g.actor===pid&&g.deadline?'<div class="cdring"></div>':''}<div class="av">${p.bot?(p.name.split(' ').pop()):(esc(p.name)[0]||'?').toUpperCase()}</div><div class="nm">${isB?'<span class="plq">BANKER</span> ':''}${esc(p.name.replace(/ \S+$/,p.bot?'':' $&').trim())}${p.online?'':' 💤'}</div>
 <div class="hand sm">${seatHand(pid,s,'sm',false)}</div><div class="lab">${seatLabel(pid,s)}</div>
 ${isB?`<div class="small">${fmtc(p.chips)}</div>`:`<div class="betspot">${s.betDone&&s.bet?`<span class="chip c${chipD(s.bet)}">${s.bet}</span>`:'<span class="small">…</span>'}${(()=>{const dv=(V.banker===ME.pid&&!isB)?-d:d;return `<span class="delta ${dv>0?'pos':dv<0?'neg':''}">${dv?sgn(dv):''}</span>`})()}</div>`}${rib}${hd}</div>`}
function trayHTML(b){b=Math.round(b);if(b<=0)return `<div class="iou">IOU ${fmtc(b)}</div>`;const cnt={},w={100:.4,25:.25,10:.15,5:.12};let carry=0,used=0;for(const d of[100,25,10,5]){const t=b*w[d]+carry;cnt[d]=Math.floor(t/d);carry=t-cnt[d]*d;used+=cnt[d]*d}cnt[1]=b-used;
 return [100,25,10,5,1].filter(d=>cnt[d]>0).map(d=>`<div class="bcol">${Array.from({length:Math.min(cnt[d],12)},(_,i)=>`<span class="chip c${d}" style="bottom:${i*4}px">${d}</span>`).join('')}<div class="cnt">×${cnt[d]}</div></div>`).join('')}
function bindPeek(){document.querySelectorAll('#meHand [data-peek]').forEach(el=>FX.squeeze(el,()=>{const c=+el.dataset.peek;peeked.add(c);const hi=V.game.seats[ME.pid].hand.indexOf(c);SEEN.set(ME.pid+':'+hi,c);snd('flip');const big=b2like(c);$('meLab').textContent=seatLabel(ME.pid,V.game.seats[ME.pid]);renderActions()}))}
function b2like(c){return 0}
function peekAll(){V.game.seats[ME.pid].hand.forEach(c=>{if(c!=null)peeked.add(c)});renderTable()}
function doFlips(){let n=0,f=0;document.querySelectorAll('[data-flip]').forEach(el=>{f++;requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('up')))});
 document.querySelectorAll('.slot.deal').forEach(()=>n++);if(n)snd('deal',n);else if(f)snd('flip')}

/* ================= actions panel ================= */
let arranging=null,bankUI=null;
function setH(el,h){if(!el||el._h===h)return false;el._h=h;el.innerHTML=h;return true}
function A(h){const el=$('actions');if(el._h===h)return;const pv=el.querySelector('.decide .dpts');const pt=pv&&pv.textContent;el._h=h;el.innerHTML=h;const d=el.querySelector('.decide');if(d&&pt){const q=d.querySelector('.dpts');if(q&&q.textContent===pt)d.style.animation='none'}fitTable()}
/* fit the table to the screen: no scrolling, scale up on big screens */
let FITK='';function fitTable(force){const t=$('table');if(!t||!t.classList.contains('on'))return;const db=$('duelBar');const k=innerWidth+'x'+innerHeight+(db&&db.style.display)+'|'+$('top').style.height;if(!force&&k===FITK)return;FITK=k;
 const f=$('felt');t.classList.add('fit');t.classList.remove('fill');t.style.zoom=1;t.style.maxWidth='';t.style.height='';f.style.height='';
 const fNat=f.offsetHeight;let other=0;for(const c of t.children){if(c===f||c.id==='actions')continue;const cs=getComputedStyle(c);if(cs.display==='none'||cs.position==='fixed'||cs.position==='absolute')continue;other+=c.offsetHeight+parseFloat(cs.marginTop)+parseFloat(cs.marginBottom)}other+=parseFloat(getComputedStyle(f).marginTop)+parseFloat(getComputedStyle(f).marginBottom);const N=other+fNat,W=innerWidth,H=innerHeight;
 let z=W<=480?Math.min(1,H/N):Math.min(H/N,W/480,1.8);z=Math.max(.85,z);t.style.zoom=z;t.style.maxWidth=(W>560&&W>H*.7)?Math.round(Math.min(W/z-16,820))+'px':'';
 const fill=H/z-other;if(fill>=fNat-2){f.style.height=Math.floor(fill)+'px';t.style.height=Math.floor(H/z)+'px';t.classList.add('fill')}}
addEventListener('resize',()=>fitTable(true));addEventListener('orientationchange',()=>setTimeout(()=>fitTable(true),300));
function unpeekedMine(){const s=V.game.seats[ME.pid];return s.hand.filter(c=>c!=null&&!peeked.has(c)).length}
const EMO=['😂','🔥','😭','🧧','😱','👏'];
function emoBar(){return `<div class="emobar">${EMO.map(e=>`<button onclick="sendEmo('${e}')">${e}</button>`).join('')}</div>`}
window.sendEmo=e=>{api('emote',{e}).catch(()=>{})};
function renderActions(){if(window.__drag)return;const v=V,g=v.game,s=g.seats[ME.pid],isB=v.banker===ME.pid;shoeOff();
 const wait=t=>A(`<div class="wait">${t}</div>${emoBar()}`);
 if(!s){return wait(g.phase==='summary'?'Game over':'You are watching · you’ll be dealt in next game')}
 if(unpeekedMine()&&g.phase!=='summary'){$('prompt').textContent='Squeeze your card: drag up-left ↖ (or tap)'}else $('prompt').textContent='';
 const peekBtn=unpeekedMine()?`<button class="ghost" onclick="peekAll()">Reveal my cards</button>`:'';
 switch(g.phase){
 case 'bet':if(isB){const n=g.order.filter(p=>!g.seats[p].betDone).length;return wait(n?`Waiting for ${n} bet(s)…`:'Dealing…')}
  if(s.betDone)return wait(`You bet ${s.bet}. Waiting for others…`);return betUI();
 case 'r1':return A(peekBtn?`<div class="arow">${peekBtn}</div>`:`<div class="wait">High card settled</div>${emoBar()}`);
 case 'r2turn':{if(g.actor===ME.pid){const p=b2(s.hand).p;const forced=p<=3;const best=pdrawsC(s.hand);
   if(unpeekedMine())return A(`<div class="decide"><div class="dtop"><div class="dpts">🫣 Your turn — squeeze your 2nd card first</div><div class="dclock" id="dclock"></div></div><div class="arow">${peekBtn}</div></div>`);
   shoeOn(()=>doAct('draw'));
   return A(`<div class="decide"><div class="dtop"><div class="dpts">Your turn · you have<b>${p}</b>pts</div><div class="dclock" id="dclock"></div></div>
    ${hints?`<div class="hint" style="margin-bottom:8px">💡 ${forced?`Under 4 — you must draw`:best?'Best: DRAW':'Best: STAND'}${forced?'':` · ${p==4?'always draw on 4':p==5?'on 5 draw only with 2+3 or 7+8':'stand on 6–7'}`}</div>`:''}
    <div class="dbtns"><button class="dbig draw ${hints&&best?'best':''}" onclick="doAct('draw')">🂠 DRAW<small>${forced?'must take a 3rd card':'take a 3rd card · or tap the shoe'}</small></button>${forced?'':`<button class="dbig stand ${hints&&!best?'best':''}" onclick="doAct('stand')">✋ STAND<small>keep ${p} pts</small></button>`}</div></div>`)}
  return A(`<div class="wait">⏳ ${esc(PN(g.actor))} is deciding… <span id="dclock" class="dclock"></span></div>${peekBtn?`<div class="arow">${peekBtn}</div>`:''}${emoBar()}`)}
 case 'r2bank':if(isB)return bankerUI();return wait('🎩 Banker is deciding who to open…');
 case 'r2done':return wait('Baccarat settled · next: Sikipi');
 case 'r3set':if(s.si==null&&!s._sent){if(unpeekedMine())return A(`<div class="decide"><div class="dpts">🫣 Squeeze your new card(s) first</div><div class="arow" style="margin-top:8px">${peekBtn}</div></div>`);return arrangeUI()}return wait(`Splits set: ${[v.banker,...g.order].filter(p=>g.seats[p].set).length}/${g.order.length+1}`);
 case 'r3done':return wait('Sikipi settled · next: Niu Niu');
 case 'r4peek':return A(peekBtn?`<div class="decide"><div class="dpts">🫣 Squeeze your 5th card…</div><div class="arow" style="margin-top:8px">${peekBtn}</div></div>`:`<div class="wait">Revealing…</div>${emoBar()}`);
 case 'r4set':{if(peekBtn)return A(`<div class="decide"><div class="dpts">🫣 Squeeze your 5th card…</div><div class="arow" style="margin-top:8px">${peekBtn}</div></div>`);
   if(!g.seats[ME.pid])return wait('Players are arranging…');if(g.seats[ME.pid].nset)return wait('Arranged ✓ · waiting for others…');return A(arrPanel('niu'))}
 case 'r5set':{if(!g.seats[ME.pid])return wait('Players are arranging…');if(g.seats[ME.pid].cset)return wait('Arranged ✓ · waiting for others…');return A(arrPanel('combo'))}
 case 'r4done':return wait('Niu Niu settled · next: Combo Poker');
 case 'r5show':return wait('🃏 Community cards dealt… revealing hands');
 case 'r5done':return wait('Final round settled…');
 case 'summary':if(v.duel)return A(`<div class="arow"><button class="gold" onclick="showSummary()">Results</button>${v.duel.over?`<button class="green" onclick="toLeague()">🏰 League</button>`:''}</div>${v.duel.over?'':'<div class="small" style="text-align:center;margin-top:6px">Next game deals automatically…</div>'}`);return A(`<div class="arow"><button class="gold" onclick="showSummary()">Results</button><button class="green" onclick="renderRoom(true)">Room</button></div>${emoBar()}`);
 }}
const pdrawsC=cs=>{const v=b2(cs);return !v.pok&&(v.p<=3||playerShouldDraw(cs))};

/* ---- shoe ---- */
function shoeOn(fn){const sh=$('shoe');sh.classList.add('active');sh.onclick=()=>{snd('tap');shoeOff();fn()};if(!$('shoetag')){const t=document.createElement('div');t.className='shoetag';t.id='shoetag';t.textContent='👆 TAP SHOE TO DRAW';$('felt').appendChild(t)}}
function shoeOff(){const sh=$('shoe');sh.classList.remove('active');sh.onclick=null;const t=$('shoetag');if(t)t.remove()}

/* ---- betting ---- */
let myBet=0,lastBet=+(localStorage.getItem('ct.lastBet')||0);
function betUI(){const st=V.settings;const denoms=[1,5,10,25,100].filter(d=>d<=st.max);
 const draw_=()=>{A(`<div class="circle" id="circle" style="margin-top:0"><div class="stack">${chipStack(myBet)}</div><div class="amt">${myBet||'Tap chips'}</div></div><div class="rack" style="margin-top:22px">${denoms.map(d=>`<span class="chip c${d}" data-d="${d}">${d}</span>`).join('')}</div>
  <div class="arow"><button class="ghost" id="bClr">Clear</button>${lastBet?`<button class="ghost" id="bRe">Rebet ${lastBet}</button>`:''}<button class="gold" id="bGo" ${myBet>=st.min&&myBet<=st.max?'':'disabled'}>Bet ${myBet||''}</button></div>`);
  document.querySelectorAll('.rack .chip').forEach(el=>el.onclick=()=>{const d=+el.dataset.d;if(myBet+d>st.max){toast('Max bet '+st.max);return}myBet+=d;snd('chip');draw_()});
  $('bClr').onclick=()=>{myBet=0;draw_()};if($('bRe'))$('bRe').onclick=()=>{myBet=Math.max(st.min,Math.min(st.max,lastBet));snd('chip');draw_()};
  $('bGo').onclick=()=>{lastBet=myBet;localStorage.setItem('ct.lastBet',myBet);doAct('bet',{bet:myBet});myBet=0}};draw_()}
function chipStack(a){const out=[];for(const d of[100,25,10,5,1]){while(a>=d&&out.length<6){out.push(d);a-=d}}return out.map((v,i)=>`<span class="chip lg c${v}" style="top:${-i*4}px">${v}</span>`).join('')}

/* ---- banker decision ---- */
function bkEV(Bh,U,drew){const known=new Set([...Bh,U]);const rem=[...Array(52).keys()].filter(c=>!known.has(c));let st_=0,dr=0,n=0;const B2=b2(Bh);
 for(const c2 of rem){const P2=[U,c2];if(b2(P2).pok||pdrawsC(P2)!==drew)continue;const rest=rem.filter(c=>c!==c2);
  if(!drew){const pv=b2(P2);st_+=-bSettle(pv,B2);let s=0;for(const d3 of rest)s+=-bSettle(pv,b3([...Bh,d3]));dr+=s/rest.length;n++}
  else{for(const p3 of rest){const pv=b3([...P2,p3]);st_+=-bSettle(pv,B2);let s=0,m=0;for(const d3 of rest){if(d3===p3)continue;s+=-bSettle(pv,b3([...Bh,d3]));m++}dr+=s/m;n++}}}
 return n?{st:st_/n,dr:dr/n}:{st:0,dr:0}}
let BK=null;
function bkEV3(Bh,U,drew){const known=new Set([...Bh,U]);const rem=[...Array(52).keys()].filter(c=>!known.has(c));const BV=b3(Bh);let t=0,n=0;
 for(const c2 of rem){const P2=[U,c2];if(b2(P2).pok||pdrawsC(P2)!==drew)continue;
  if(!drew){t+=-bSettle(b2(P2),BV);n++}else{let s=0,m=0;for(const p3 of rem){if(p3===c2)continue;s+=-bSettle(b3([...P2,p3]),BV);m++}t+=s/m;n++}}
 return n?t/n:0}
const bkDrew=()=>{const s=V.game.seats[ME.pid];return s.hand.length>=3&&b2(s.hand.slice(0,2)).p<=3};
function bkPlanC(){const g=V.game,s=g.seats[ME.pid];const act=g.order.filter(p=>{const t=g.seats[p];return !t.pok&&t.open==null});const forced=b2(s.hand).p<=3;
 if(bkDrew()){const hk='3:'+s.hand.join();if(!BK||BK.game!==V.gameNo||BK.hk!==hk){const ev={};g.order.filter(p=>!g.seats[p].pok).forEach(p=>{const e=bkEV3(s.hand,g.seats[p].hand[0],g.seats[p].drew);ev[p]={st:e,dr:e}});BK={game:V.gameNo,hk,ev}}
  const acts={};act.forEach(p=>acts[p]='rest');return {draw:false,acts,forced:false,act,after:true}}
 if(!BK||BK.game!==V.gameNo||BK.hk!==s.hand.slice(0,2).join()){const ev={};g.order.filter(p=>!g.seats[p].pok).forEach(p=>ev[p]=bkEV(s.hand.slice(0,2),g.seats[p].hand[0],g.seats[p].drew));BK={game:V.gameNo,hk:s.hand.slice(0,2).join(),ev}}
 const best=(p,d)=>forced?BK.ev[p].dr:Math.max(BK.ev[p].st,d?BK.ev[p].dr:BK.ev[p].st);
 const val=d=>act.reduce((x,p)=>x+g.seats[p].bet*best(p,d),0);const dr=forced?true:val(true)>val(false);
 const acts={};act.forEach(p=>{const e=BK.ev[p],fin=dr?e.dr:e.st;acts[p]=(!forced&&e.st>fin)?'open':'rest'});
 return {draw:dr,acts,forced,act}}
function bankHint(pid){const g=V.game;if(!(g.phase==='r2bank'&&V.banker===ME.pid))return '';const t=g.seats[pid];if(!t||t.pok||t.open!=null)return '';
 const pl=bkPlanC();if(pl.forced||pl.after)return '';const a=pl.acts[pid];const e=BK.ev[pid];
 const btns=`<div class="obtns"><button class="obtn op" ${pl.forced?'disabled':''} onclick="event.stopPropagation();bkDo('${pid}','open')">OPEN</button></div>`;
 if(pl.forced||(pl.after&&unpeekedMine()))return btns;return btns+(hints?`<div class="hintdot">💡${a==='open'?'OPEN':'WAIT'} ${pl.after?'':a==='open'?'+'+Math.round(e.st*100)+'%':a==='rest'?'then '+(pl.draw?'draw':'stand'):''}</div>`:'')}
function bankTap(pid){return ''}
window.bkDo=(pid,mode)=>{snd(mode==='open'?'flip':'tap');doAct('bopen',{target:pid,mode})};
function bankerUI(){const g=V.game,s=g.seats[ME.pid];
 if(unpeekedMine())return A(`<div class="decide"><div class="dpts">🫣 Squeeze your cards first</div><div class="arow" style="margin-top:8px"><button class="ghost" onclick="peekAll()">Reveal my cards</button></div></div>`);
 if(!BK||BK.game!==V.gameNo||BK.hk!==(bkDrew()?'3:'+s.hand.join():s.hand.slice(0,2).join())){A(`<div class="decide"><div class="dpts"><span class="spin"></span>Reading the table…</div></div>`);setTimeout(()=>{bkPlanC();renderTable()},30);return}
 const pl=bkPlanC();const bp=b2(s.hand).p;const left=pl.act.length;
 if(pl.forced){shoeOn(()=>doAct('bfinish',{draw:true}));return A(`<div class="decide"><div class="dtop"><div class="dpts">🎩 Banker · you have<b>${bp}</b>pts</div><div class="dclock" id="dclock"></div></div>
  <div class="hint" style="margin-bottom:8px">Under 4 — you must <b>draw</b> and show down with <b>everyone</b>. No OPEN.</div>
  <div class="dbtns"><button class="dbig draw best" onclick="doAct('bfinish',{draw:true})">🂠 DRAW<small>then show down with all ${left}</small></button></div></div>`)}
 if(pl.after){shoeOff();const fp=bEval(s.hand).p;return A(`<div class="decide"><div class="dtop"><div class="dpts">🎩 Banker · 3 cards<b>${fp}</b>pts</div><div class="dclock" id="dclock"></div></div>
  <div class="hint" style="margin-bottom:8px">Everyone shows down vs your ${fp}.</div>
  <div class="dbtns"><button class="dbig stand best" onclick="doAct('bfinish',{draw:false})">✅ SETTLE REST<small>${left?`${left} player${left>1?'s':''} vs ${fp}`:'done'}</small></button></div></div>`)}
 shoeOn(()=>doAct('bfinish',{draw:true}));
 A(`<div class="decide"><div class="dtop"><div class="dpts">🎩 Banker · you have<b>${bp}</b>pts</div><div class="dclock" id="dclock"></div></div>
  <div class="hint" style="margin-bottom:8px">${pl.forced?`Under 4 — draw first.`:`Tap <b>OPEN</b> on a seat to settle it vs your 2 cards (optional). Everyone else shows down vs your final hand.${hints?` 💡 Then <b>${pl.draw?'DRAW':'STAND'}</b> for the rest.`:''}`}</div>
  <div class="dbtns"><button class="dbig draw ${hints&&pl.draw?'best':''}" onclick="doAct('bfinish',{draw:true})">🂠 DRAW<small>${left?`then settle ${left} left`:'take a 3rd card'}</small></button>${pl.forced?'':`<button class="dbig stand ${hints&&!pl.draw?'best':''}" onclick="doAct('bfinish',{draw:false})">✋ STAND<small>${left?`settle ${left} on ${bp}`:`keep ${bp}`}</small></button>`}</div></div>`)}

/* ---- sikipi arrange ---- */
function arrangeUI(){if(window.__drag)return;const v=V,g=v.game,s=g.seats[ME.pid],isB=v.banker===ME.pid;if(s.hand.some(c=>c==null))return;let first=false;
 if(!arranging||arranging.game!==v.gameNo){const spl=skSplits(s.hand);let ev;
  if(isB){const Ps=g.order.map(q=>{const t=g.seats[q];return {shownB:t.shownB,vis:t.vis||[],bet:t.bet}});ev=skBankerEV({hand:s.hand,spl},Ps,200)}
  else ev=skEV({hand:s.hand,spl},g.seats[v.banker].vis||[]);
  arranging={game:v.gameNo,spl,ev,bi:skEVBest(ev,spl),pool:[...s.hand],bot:[],top:[]};first=true}
 const ar=arranging,zone=$('meZone');$('prompt').textContent='Drag cards into Bottom and Top (or tap)';
 const lab=(cs,b)=>cs.length==2?(b?skLabN:skLab)(skKey(cs[0],cs[1])):'';const full=ar.bot.length==2&&ar.top.length==2;const best=ar.spl[ar.bi];
 const _html=`<div class="pool" data-z="pool">${ar.pool.map(cardBtn).join('')}</div><div class="zones"><div class="zone" data-z="bot"><div class="zt">Bottom (stronger)</div><div class="zc">${ar.bot.map(cardBtn).join('')}</div><div class="zl">${lab(ar.bot,1)}</div></div><div class="zone" data-z="top"><div class="zt">Top</div><div class="zc">${ar.top.map(cardBtn).join('')}</div><div class="zl">${lab(ar.top)}</div></div></div>`;if(zone._h===_html&&!first)return;zone._h=_html;zone.innerHTML=_html;if(first)$('me').scrollIntoView({block:'end',behavior:'smooth'});
 zone.querySelectorAll('[data-c]').forEach(bindDrag);
 const fmtEV=x=>isB?(x>=0?'+':'')+x.toFixed(2)+' chips':(x>=0?'+':'')+x.toFixed(2)+'×';
 A(`${hints?`<div class="hint">💡 Best: Bottom ${ctxt(best.hi)} · Top ${ctxt(best.lo)} (EV ${fmtEV(ar.ev[ar.bi])})${isB?'':`<br><small>Banker showed ${ctxt(g.seats[v.banker].vis||[])} in Baccarat</small>`}</div>`:''}
  <div class="arow">${hints?'<button class="ghost" id="aHint">Use 💡</button>':''}<button class="ghost" id="aReset">Reset</button><button class="gold" id="aLock" ${full?'':'disabled'}>Lock split</button></div>`);
 if($('aHint'))$('aHint').onclick=()=>{ar.bot=[...best.hi];ar.top=[...best.lo];ar.pool=[];snd('tap');arrangeUI()};
 $('aReset').onclick=()=>{ar.pool=[...s.hand];ar.bot=[];ar.top=[];arrangeUI()};
 $('aLock').onclick=()=>{let kb=skKey(...ar.bot),kt=skKey(...ar.top);if(cmpArr(kt,kb)>0){[ar.bot,ar.top]=[ar.top,ar.bot];toast('Swapped — Bottom must be stronger')}
  const k=ar.spl.findIndex(sp=>sameSet(sp.hi,ar.bot));s._sent=true;arranging=null;doAct('split',{si:k>=0?k:ar.bi})}}
const sameSet=(a,b)=>a.length==b.length&&a.every(x=>b.includes(x));
function ctxt(cs){return cs.map(c=>`<span style="color:${(st(c)==0||st(c)==2)?'#ff8a8a':'inherit'}">${RN[rk(c)]}${SY[st(c)]}</span>`).join(' ')}
function cardBtn(c){const red=(st(c)==0||st(c)==2);return `<div class="slot lg" data-c="${c}" style="touch-action:none"><div class="cd up" style="width:56px;height:80px;border-radius:8px;font-size:44px"><div class="bc"></div><div class="fc ${red?'red':''}"><span class="ix">${RN[rk(c)]}<br>${SY[st(c)]}</span><span class="pip">${SY[st(c)]}</span><span class="ix2">${RN[rk(c)]}<br>${SY[st(c)]}</span></div></div></div>`}
function moveCard(c,to){const ar=arranging;for(const z of['pool','bot','top'])ar[z]=ar[z].filter(x=>x!=c);if(to!='pool'&&ar[to].length>=2)ar.pool.push(ar[to].shift());ar[to].push(c);snd('flip');arrangeUI()}
function bindDrag(el){const c=+el.dataset.c,zone=$('meZone');let sx=null,sy,dragging=false,ghost=null,over=null;
 el.onpointerdown=e=>{sx=e.clientX;sy=e.clientY;dragging=false;el.setPointerCapture(e.pointerId)};
 el.onpointermove=e=>{if(sx==null)return;if(!dragging&&Math.hypot(e.clientX-sx,e.clientY-sy)>8){dragging=true;window.__drag=true;ghost=el.cloneNode(true);ghost.classList.add('dragging');document.body.appendChild(ghost);el.style.opacity='.3'}
  if(dragging){ghost.style.left=(e.clientX-28)+'px';ghost.style.top=(e.clientY-40)+'px';const t=document.elementFromPoint(e.clientX,e.clientY);const z=t&&t.closest('[data-z]');zone.querySelectorAll('.zone').forEach(x=>x.classList.toggle('over',x===z));over=z}};
 el.onpointerup=()=>{const was=dragging;sx=null;window.__drag=false;if(ghost){ghost.remove();ghost=null}el.style.opacity='';
  if(was){if(over)moveCard(c,over.dataset.z)}else{const ar=arranging;if(ar.pool.includes(c))moveCard(c,ar.bot.length<2?'bot':'top');else moveCard(c,'pool')}};
 el.onpointercancel=()=>{sx=null;window.__drag=false;if(ghost){ghost.remove();ghost=null}el.style.opacity=''}}

/* ================= events → chips & sounds ================= */
let BRT={};
function playEvents(evs){BRT={};let mineTot=0,any=false,bestM=0,worstM=0;const nm=pid=>(PN(pid)||'').replace(/ \S+$/,'')||PN(pid);
 for(const e of evs){
  if(e.t==='ach'){if(e.pid===ME.pid){toast('🏆 '+e.keys.map(FX.achName).join(' · '),2600);FX.haptic(3)}else toast(`🏆 ${nm(e.pid)}: ${e.keys.map(FX.achName).join(' · ')}`,2200);continue}
  if(e.t==='season'){toast('🏆 New season started');continue}
  if(e.t==='kick'){if(e.pid!==ME.pid)toast(`${e.name} was removed by the host`);continue}
  if(e.t==='timer'){if(V.host!==ME.pid)toast(e.timer?`⏱ Host set ${e.timer}s per decision`:'⏱ Host turned the timer off');continue}
  if(e.t==='duelend'){const w=e.winner===ME.pid;const att=V.duel&&ME.pid===V.duel.attPid;if(w){FX.big&&FX.big(att?'🏰 CONQUERED!':'🛡 DEFENDED!','');FX.haptic(9)}else FX.big&&FX.big(att?'🛡 THEY HELD':'💥 STATION LOST','',true);continue}
  if(e.t==='emote'&&e.pid==null){const d=document.createElement('div');d.className='specemo';d.style.left=(25+Math.random()*50)+'%';d.innerHTML=esc(e.e)+`<small>👀 ${esc(e.from||'')}</small>`;($('felt')||document.body).appendChild(d);setTimeout(()=>d.remove(),1900);continue}
  if(e.t==='emote'){const el=e.pid===ME.pid?$('me'):document.querySelector(`.seat[data-pid="${e.pid}"]`);if(el){const d=document.createElement('div');d.className='emo';d.textContent=e.e;el.appendChild(d);setTimeout(()=>d.remove(),1900)}continue}
  if(e.t==='settle'){any=true;const el=document.querySelector(`.seat[data-pid="${e.pid}"]`)||(e.pid===ME.pid?$('me'):null);const bEl=V.banker===ME.pid?($('btray')||$('me')):document.querySelector(`.seat[data-pid="${V.banker}"]`);
   if(el&&bEl){if(e.m>0)fly(bEl,el,Math.min(8,e.m+2));else if(e.m<0)fly(el,bEl,Math.min(8,-e.m+2));{const iB=V.banker===ME.pid,am=iB?-e.amt:e.amt;floatOn(el,e.m?FX.money(am)+(Math.abs(e.m)>1?`<span class="fm">×${Math.abs(e.m)}</span>`:''):'Push',am>0?'w':am<0?'l':'p')}if(V.banker!==ME.pid||true){BRT[e.ri]=(BRT[e.ri]||0)-e.amt}}
   if(e.pid===ME.pid&&e.ri===1&&V.game.seats[ME.pid]&&V.game.seats[ME.pid].pok&&e.m>0){FX.big('POK!',`+${e.m}×`);FX.flash('#ffd76a');FX.vibe(120);FX.haptic(2,90)}
   if(e.pid===ME.pid){mineTot+=e.amt;bestM=Math.max(bestM,e.m);worstM=Math.min(worstM,e.m)}if(V.banker===ME.pid){mineTot-=e.amt;bestM=Math.max(bestM,-e.m);worstM=Math.min(worstM,-e.m)}
   if(Math.abs(e.m)>=3&&V.game&&e.ri===V.game.round-1)LOG.push(`${nm(e.pid)} ${e.m>0?'wins':'loses'} ${Math.abs(e.m)}×`);continue}
  if(e.t==='act'){if(V.game&&V.game.round===2)LOG.push(`${nm(e.pid)} ${e.a==='draw'?'draws':'stands'}${e.auto?' (timer)':''}`);if(e.pid!==ME.pid){const el=document.querySelector(`.seat[data-pid="${e.pid}"]`);if(el)bubble(el,e.a==='draw'?'Draw':'Stand')}}
  if(e.t==='open'||e.t==='skip'){if(V.game&&V.game.round===2)LOG.push(`Banker ${e.t==='open'?'opens':'skips'} ${nm(e.pid)}`);if(V.banker!==ME.pid){const el=document.querySelector(`.seat[data-pid="${V.banker}"]`);if(el)bubble(el,(e.t==='open'?'Open ':'Skip ')+nm(e.pid));if(e.pid===ME.pid){toast(e.t==='open'?'Banker OPENED you':'Banker SKIPPED you — push');FX.drum(500)}}}
  if(e.t==='bank'){if(V.game&&V.game.round===2)LOG.push(`Banker ${e.draw?'draws':'stands'}`);if(V.banker!==ME.pid){FX.drum(700);const el=document.querySelector(`.seat[data-pid="${V.banker}"]`);if(el)bubble(el,e.draw?'Banker draws':'Banker stands')}}
  if(e.t==='bpok'){LOG.push('Banker Pok!');FX.flash('#ffd76a');FX.shake()}
  if(e.t==='start'){LOG=[];toast(`New game · ${PN(e.banker)} is banker`)}}
 if(LOG.length>12)LOG=LOG.slice(-12);const ll=$('logline');if(ll)ll.textContent=LOG.slice(-2).join(' · ');
 if(any){if(mineTot>0)snd(bestM>=3?'big':'win');else if(mineTot<0)snd('lose');else snd('chip');
  if(bestM>=3)FX.celebrate(bestM,sgn(mineTot),$('me'));else if(worstM<=-5)FX.celebrate(worstM,'',$('me'))}
 {const bEl=V.banker===ME.pid?$('me'):document.querySelector(`.seat[data-pid="${V.banker}"]`);const ks=Object.keys(BRT);if(bEl&&ks.length){const t=ks.reduce((x,k)=>x+BRT[k],0);setTimeout(()=>floatOn(bEl,(V.banker===ME.pid?'Round ':'Banker ')+(t?FX.money(t):'even'),t>0?'w':t<0?'l':'p'),450)}}
 if(V.game&&V.game.actor===ME.pid&&!window._turnPinged){window._turnPinged=true;snd('turn');FX.vibe([80,40,80])}
 if(V.game&&V.game.actor!==ME.pid)window._turnPinged=false}
function fly(a_,b_,n){const a=a_.getBoundingClientRect(),b=b_.getBoundingClientRect();for(let i=0;i<n;i++){if(i<3)setTimeout(()=>snd('chip'),120+i*70);const c=document.createElement('span');c.className='chip c5 fly';c.textContent='';c.style.left=(a.left+a.width/2-12)+'px';c.style.top=(a.top+a.height/2-12)+'px';document.body.appendChild(c);
 setTimeout(()=>{c.style.transform=`translate(${b.left+b.width/2-a.left-a.width/2+(i-1)*6}px,${b.top+b.height/2-a.top-a.height/2}px)`;c.style.opacity='.9'},20+i*70);setTimeout(()=>c.remove(),700+i*70)}}
function floatOn(el,txt,cls){const f=document.createElement('div');f.className='float '+cls;f.innerHTML=txt;el.appendChild(f);setTimeout(()=>f.remove(),1700)}
function bubble(el,t){const b=document.createElement('div');b.className='bubble';b.textContent=t;el.appendChild(b);setTimeout(()=>b.remove(),1500)}

/* ================= summary ================= */
function summaryTable(v){const g=v.game;const rows=g.order.map(pid=>{const s=g.seats[pid];return `<tr class="${pid===ME.pid?'mine':''}"><td>${esc(PN(pid))} <span class="small">${s.bet}</span></td>${s.r.map(x=>`<td class="${x>0?'pos':x<0?'neg':'zero'}">${x}</td>`).join('')}<td><b>${sgn(s.r.reduce((a,b)=>a+b,0)*s.bet)}</b></td></tr>`}).join('');
 return `<table class="t" style="margin-top:6px"><tr><th>Seat</th><th>HC</th><th>Bac</th><th>SKP</th><th>Niu</th><th>Cmb</th><th>±</th></tr>${rows}<tr class="${v.banker===ME.pid?'mine':''}"><td><b>${esc(PN(v.banker))} (Banker)</b></td><td colspan="5"></td><td><b>${sgn(delta(v.banker))}</b></td></tr></table>`}

function roundHands(pid){const g=V.game,s=g.seats[pid];if(!s)return null;const h=s.hand;if(h.some(c=>c==null)||h.length<5)return null;const isBk=pid===V.banker;
 const bac=isBk?(s.vis&&s.vis.length>=2?s.vis:h.slice(0,2)):h.slice(0,s.drew?3:2);const sk=h.slice(0,4),nn=h.slice(0,5);
 let skt='?';if(allPic(sk))skt='4 Picture';else if(s.si!=null){const sp=skSplits(sk)[s.si];skt=`Bottom ${ctxt(sp.hi)} ${skLabN(sp.kh)} · Top ${ctxt(sp.lo)} <b>${skLab(sp.kl)}</b>`}
 const a=niuAw(nn);
 return [`${ctxt([h[0]])}`,`${ctxt(bac)} ${bEval(bac).lab}`,skt,`${ctxt(nn)} ${niuLabEff(a,s.np?niuKeyPick(nn,s.np):niuKey(nn).k)}`,`${(()=>{const c7=[...nn,...g.comm];return s.cp?ctxt(s.cp.map(i=>c7[i]))+' '+cLab(p5(s.cp.map(i=>c7[i]))):cLab(best7(c7))})()}`]}
const RN5=['High Card','Thai Baccarat','Sikipi','Niu Niu','Combo Poker'];
function resultsHTML(v){const g=v.game,me=ME.pid,isB=v.banker===me,bk=roundHands(v.banker);let html='';
 if(!isB&&g.seats[me]){const s=g.seats[me],mine=roundHands(me);
  html+=FX.roundsHTML(`Your rounds · bet $${s.bet.toLocaleString()}`,RN5.map((n,i)=>({n,mult:s.r[i],amt:s.r[i]*s.bet,detail:mine&&bk?`You ${mine[i]}<br>Banker ${bk[i]}`:''})),delta(me))}
 else if(isB){html+=FX.roundsHTML('Your rounds as banker',RN5.map((n,i)=>{const amt=-g.order.reduce((a,q)=>a+g.seats[q].r[i]*g.seats[q].bet,0);const w=g.order.filter(q=>g.seats[q].r[i]<0).length,l=g.order.filter(q=>g.seats[q].r[i]>0).length;
  return {n,amt,detail:`${bk?bk[i]+'<br>':''}beat ${w} · lost to ${l}`}}),delta(me))}
 const bkR=[0,1,2,3,4].map(i=>-g.order.reduce((a,q)=>a+g.seats[q].r[i]*g.seats[q].bet,0));
 const people=[{name:esc(PN(v.banker)),role:'Banker',net:delta(v.banker),rs:bkR,me:isB},...g.order.map(q=>({name:esc(PN(q)),role:`Bet $${g.seats[q].bet.toLocaleString()}`,net:delta(q),rs:g.seats[q].r,me:q===me}))];
 return html+`<div class="rhead" style="margin-top:12px">Table</div>`+FX.peopleHTML(people)}
function breakdownHTML(){const g=V.game;if(!g)return '';const me=ME.pid,isB=V.banker===me,bk=roundHands(V.banker);if(!bk)return '';
 const res=x=>x>0?`<span class="pos">+${x}×</span>`:x<0?`<span class="neg">${x}×</span>`:'<span class="zero">Push</span>';
 const nm=['High Card','Baccarat','Sikipi','Niu Niu','Combo'];
 if(!isB){const mine=roundHands(me),s=g.seats[me];if(!mine)return '';
  return `<div class="bd"><b>How you were paid</b> <span class="small">(bet ${s.bet})</span>${nm.map((n,i)=>`<div class="bdr"><div class="bdh"><b>${n}</b> ${i==1&&s.open===false?'<span class="zero">Skipped</span>':res(s.r[i])} <span class="small">${sgn(s.r[i]*s.bet)}</span></div><div class="small">You: ${mine[i]}</div><div class="small">Banker: ${bk[i]}</div></div>`).join('')}</div>`}
 return `<div class="bd"><b>Your banker hands</b>${nm.map((n,i)=>`<div class="bdr"><div class="bdh"><b>${n}</b></div><div class="small">${bk[i]}</div></div>`).join('')}</div>`}
/* ================= History / replay ================= */
const RDONE={bet:0,r1:1,r2turn:1,r2bank:1,r2done:2,r3set:2,r3done:3,r4peek:3,r4set:3,r4done:4,r5show:4,r5set:4,r5done:5,summary:5};
let HIST={src:'cur',r:1};
function hCard(c,cls=''){return c==null?`<div class="slot hs ${cls}"><div class="cd"><div class="bc"></div></div></div>`:`<div class="slot hs ${cls}"><div class="cd up"><div class="bc"></div>${cardFace(c)}</div></div>`}
function hRow(cs,cls){return `<div class="hrow">${cs.map((c,i)=>hCard(c,cls?cls(i):'')).join('')}</div>`}
function histRound(G,names,banker,r){const seats=[banker,...G.order].filter(p=>G.seats[p]);const bs=G.seats[banker];
 const out=seats.map(pid=>{const s=G.seats[pid],h=s.hand||[],isB=pid===banker,known=cs=>cs.every(c=>c!=null);let cards='',lab='';
  if(r===1){cards=hRow([h[0]]);}
  else if(r===2){const bh=isB?(s.vis&&s.vis.length>=2?s.vis:h.slice(0,2)):h.slice(0,s.pok?2:(s.drew?3:2));cards=hRow(bh);
   lab=(known(bh)?bEval(bh).lab:'')+(isB?'':s.pok?' · POK':s.open===false?' · SKIPPED':'')}
  else if(r===3){const sk=h.slice(0,4);if(known(sk)&&s.si!=null){const sp=skSplits(sk)[s.si];cards=`<div class="hgrp"><span class="hz">Bottom</span>${hRow(sp.hi)}</div><div class="hgrp"><span class="hz">Top</span>${hRow(sp.lo)}</div>`;lab=allPic(sk)?'4 Picture':`${skLabN(sp.kh)} / ${skLab(sp.kl)}`}else cards=hRow(sk)}
  else if(r===4){const nn=h.slice(0,5);if(known(nn)&&nn.length===5){const a=niuAw(nn);const np=s.np&&s.np.length===3?s.np:null;
    cards=np?`<div class="hgrp">${hRow(np.map(i=>nn[i]))}</div><div class="hgrp">${hRow([0,1,2,3,4].filter(i=>!np.includes(i)).map(i=>nn[i]))}</div>`:hRow(nn);
    lab=niuLabEff(a,np?niuKeyPick(nn,np):(s.np&&s.np.length===0?[0,0]:niuKey(nn).k))}else cards=hRow(nn)}
  else if(r===5){const nn=h.slice(0,5);if(known(nn)&&G.comm&&G.comm.length===2){const c7=[...nn,...G.comm],cp=new Set(s.cp||best7Pick(c7));cards=hRow(c7,i=>(cp.has(i)?'used':'unused')+(i>=5?' comm':''));lab=cLab(p5([...cp].map(i=>c7[i])))}else cards=hRow(nn)}
  let res='';if(isB){const tot=G.order.reduce((a,q)=>a-(G.seats[q].r[r-1]||0)*G.seats[q].bet,0);res=`<b class="${tot>0?'pos':tot<0?'neg':''}">${sgn(tot)}</b>`}
  else{const m=s.r[r-1]||0;res=r===2&&s.open===false?'<span class="zero">push</span>':`<b class="${m>0?'pos':m<0?'neg':''}">${m>0?'+':''}${m}× · ${sgn(m*s.bet)}</b>`}
  return `<div class="hseat ${pid===ME.pid?'me':''}"><div class="hname">${isB?'🎩 ':''}${esc(names[pid]||'?')}${isB?' <span class="small">banker</span>':` <span class="small">bet ${s.bet}</span>`}<span class="hres">${res}</span></div>${cards}${lab?`<div class="hlab">${lab}</div>`:''}</div>`}).join('');
 return out}
function histRender(){const cur=V.game&&V.game.round>=1?{G:V.game,names:Object.fromEntries(V.players.map(p=>[p.pid,p.name])),banker:V.banker,done:RDONE[V.game.phase]||0,t:'This game'}:null;
 const last=V.last?{G:V.last.game,names:V.last.names,banker:V.last.banker,done:5,t:'Last game'}:null;
 let src=HIST.src==='last'&&last?last:(cur&&cur.done?cur:last);if(!src){$('sheetIn').innerHTML=`<h2>📜 History</h2><p class="small" style="text-align:center">Nothing to replay yet — finish a round first.</p><button class="ghost" style="width:100%" onclick="$('sheet').classList.remove('on')">Close</button>`;return}
 HIST.src=src===last?'last':'cur';const r=Math.max(1,Math.min(HIST.r,src.done));HIST.r=r;
 const tabs=[1,2,3,4,5].map(i=>`<button class="htab ${i===r?'on':''}" ${i>src.done?'disabled':''} onclick="HIST.r=${i};histRender()">${['High','Bacc','Siki','Niu','Combo'][i-1]}</button>`).join('');
 const sw=(cur&&cur.done&&last)?`<div class="hsrc"><button class="${HIST.src==='cur'?'on':''}" onclick="HIST.src='cur';HIST.r=99;histRender()">This game</button><button class="${HIST.src==='last'?'on':''}" onclick="HIST.src='last';HIST.r=1;histRender()">Last game</button></div>`:`<div class="small" style="text-align:center">${src.t}</div>`;
 $('sheetIn').innerHTML=`<h2>📜 History</h2>${sw}<div class="htabs">${tabs}</div><div class="hround">${['High Card','Thai Baccarat','Sikipi','Niu Niu','Combo Poker'][r-1]}</div>${r===5&&src.G.comm?`<div class="small" style="text-align:center">Community: ${ctxt(src.G.comm)}</div>`:''}
  <div class="hlist">${histRound(src.G,src.names,src.banker,r)}</div>
  <div class="arow"><button class="ghost" ${r<=1?'disabled':''} onclick="HIST.r--;histRender()">◀ Prev</button><button class="ghost" ${r>=src.done?'disabled':''} onclick="HIST.r++;histRender()">Next ▶</button><button class="gold" onclick="$('sheet').classList.remove('on')">Close</button></div>`}
window.showHistory=(src)=>{HIST={src:src||'cur',r:src==='last'?1:99};histRender();$('sheet').classList.add('on')};
window.HIST=HIST;

const pushSend=sub=>api('rsub',{sub});
function pushLabel(){const st=window.PUSH?PUSH.state():'unsupported';const b=$('rPushBtn');if(b)b.textContent=st==='on'?'🔔 Alerts on':'🔕 Turn on alerts'}
window.pushOn=async()=>{if(!window.PUSH)return;let st=PUSH.state();if(st==='on'){await PUSH.resync(pushSend);toast('🔔 Alerts are on for this room');return}
 try{st=await PUSH.enable(pushSend)}catch(e){toast('Could not turn on alerts: '+e.message);return}
 if(st==='on'){toast('🔔 Alerts on — we\'ll ping you when it\'s your turn');pushLabel()}else{$('sheetIn').innerHTML=PUSH.helpHTML(st)+`<div class="sfoot"><button class="gold play" onclick="$('sheet').classList.remove('on')">OK</button></div>`;$('sheet').classList.add('on')}};
window.showSeason=()=>{const v=V;if(!v)return;const me=v.players.find(p=>p.pid===ME.pid);const isHost=v.host===ME.pid;
 $('sheetIn').innerHTML=`<h2>🏆 Season</h2>${FX.seasonHTML(v.season,me&&me.name,sgn)}<div class="arow" style="margin-top:12px">${isHost?`<button class="ghost" onclick="newSeason()">New season</button>`:''}<button class="gold" onclick="$('sheet').classList.remove('on')">Close</button></div>`;
 $('sheet').classList.add('on')};
window.newSeason=async()=>{if(!confirmBox('Start a new season? Leaderboard and badges reset (chips unchanged).'))return;try{await api('season');showSeason()}catch(e){toast(e.message)}};
function confirmBox(t){try{return window.confirm(t)}catch(e){return true}}
function myNewAch(){const v=V;let i=v.events.length-1;const out=[];for(;i>=0;i--){const e=v.events[i];if(e.t==='start')break;if(e.t==='ach'&&e.pid===ME.pid)out.push(...e.keys)}return out}
function duelBar(v){const el=$('duelBar');if(!el)return;const d=v.duel;if(!d){el.style.display='none';return}const A=v.players.find(p=>p.pid===d.attPid),D=v.players.find(p=>p.pid===d.defPid);if(!A||!D)return;
 el.style.display='flex';el.innerHTML=`<span>⚔️ <b>${esc(d.town)}</b> · game ${Math.min(30,(d.games||0)+(d.over?0:1))} · bet <b>${fmtc(d.stake||d.bet)}</b></span><span>You <b>${fmtc(A.chips)}</b> vs ${esc(D.name)} <b>${fmtc(D.chips)}</b></span>`}
window.toLeague=()=>{ME=null;saveMe();location.href='/league'};
function duelSummaryHTML(v){const d=v.duel;if(!d)return '';const A=v.players.find(p=>p.pid===d.attPid),D=v.players.find(p=>p.pid===d.defPid);
 if(d.over){const att=ME.pid===d.attPid,aw=d.over.winner==='att',won=att?aw:!aw;return `<div class="newach" style="${won?'':'background:#4a1d1d;color:#ffd0cc'}">${att?(aw?`🏰 You conquered ${esc(d.town)}!`:`🛡 ${esc(d.defName)} held ${esc(d.town)}`):(aw?`💥 You lost ${esc(d.town)} to ${esc(d.attName)}`:`🛡 You defended ${esc(d.town)}!`)} · ${d.over.games} game${d.over.games>1?'s':''}</div>`}
 return `<div class="small" style="text-align:center;margin:8px 0">⚔️ Duel for <b>${esc(d.town)}</b> — You ${fmtc(A.chips)} vs ${esc(D.name)} ${fmtc(D.chips)} · next game deals automatically…</div>`}
window.showSummary=()=>{const v=V;if(!v.game)return;const d=delta(ME.pid),g=v.game,isB=v.banker===ME.pid,isHost=v.host===ME.pid;
 const amts=[0,1,2,3,4].map(i=>isB?-g.order.reduce((a,q)=>a+g.seats[q].r[i]*g.seats[q].bet,0):(g.seats[ME.pid]?g.seats[ME.pid].r[i]*g.seats[ME.pid].bet:0));
 const primary=v.duel?(v.duel.over?`<button class="gold play" onclick="toLeague()">🏰 Back to League</button>`:`<button class="gold play" onclick="$('sheet').classList.remove('on')">OK · next game ▶</button>`)
  :isHost?`<button class="gold play" onclick="playAgain()">▶ Play again</button>`:`<button class="gold play" onclick="$('sheet').classList.remove('on');renderRoom(true)">Back to room</button>`;
 $('sheetIn').innerHTML=`<h2>${d>0?'You win!':d<0?'Tough game':'Break even'}</h2><div class="big ${d>0?'pos':d<0?'neg':''}">${FX.money(d)}</div>
 <div class="small" style="text-align:center">${isB?'as Banker':'Bet $'+(g.seats[ME.pid]?g.seats[ME.pid].bet.toLocaleString():'')} · chips ${fmtc(v.players.find(p=>p.pid===ME.pid).chips)}</div>
 ${duelSummaryHTML(v)}${myNewAch().map(k=>`<div class="newach">🏆 Badge unlocked: ${FX.achName(k)}</div>`).join('')}${FX.glance(amts)}${FX.details(resultsHTML(v),'Round details & table')}
 <div class="sfoot">${primary}<div class="sec"><button class="ghost" onclick="showHistory('cur')">📜 Replay</button><button class="ghost" onclick="showSeason()">🏆 Season</button>${!v.duel&&isHost?`<button class="ghost" onclick="$('sheet').classList.remove('on');renderRoom(true)">☰ Room</button>`:''}</div></div>`;
 $('sheet').classList.add('on');$('sheetIn').scrollTop=0;snd(d>0?'big':d<0?'lose':'chip')};
window.playAgain=async()=>{try{$('sheet').classList.remove('on');await api('start',{banker:V.banker})}catch(e){toast(e.message);renderRoom(true)}};

/* ================= toggles & boot ================= */
$('histBtn').onclick=()=>showHistory('cur');$('rPushBtn').onclick=()=>pushOn();$('seasonBtn').onclick=()=>showSeason();$('rSeasonBtn').onclick=()=>showSeason();$('rulesBtn').onclick=()=>FX.rules(V&&V.game?V.game.round:0);$('autoBtn').classList.toggle('on',autoReveal);$('autoBtn').onclick=()=>{autoReveal=!autoReveal;localStorage.setItem('ct.auto',autoReveal?'1':'0');$('autoBtn').classList.toggle('on',autoReveal);toast(autoReveal?'👁 Auto-reveal my cards: ON':'Squeeze my own cards: ON');if(V&&V.game)renderTable()};
$('hintBtn').onclick=()=>{hints=!hints;localStorage.setItem('ct.hints',hints?'1':'0');toast(hints?'💡 Hints on':'Hints off');renderTable()};
$('muteBtn').onclick=()=>{mute=!mute;localStorage.setItem('ct.mute',mute?'1':'0');$('muteBtn').textContent=mute?'🔇':'🔊'};
if(ME){if(qs.get('room')&&qs.get('room').toUpperCase()!==ME.code){/* invited elsewhere */ME=null;saveMe()}else{subscribe();refresh()}}

/* safety: never leave a dragged card copy on screen */
function clearGhosts(){setTimeout(()=>{if(!window.__drag)document.querySelectorAll('body>.dragging').forEach(g=>g.remove())},60)}
addEventListener('pointerup',()=>{window.__drag=false;clearGhosts()},true);addEventListener('pointercancel',()=>{window.__drag=false;clearGhosts()},true);
