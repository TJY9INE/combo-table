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
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id==id));}
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
async function refresh(){if(!ME||busy)return;busy=true;try{await api('state')}catch(e){if(/Not in this room|Room not found/.test(e.message)){ME=null;saveMe();show('home')}}finally{busy=false}}
async function doAct(a,extra){snd('tap');try{await api(a,extra)}catch(e){toast(e.message)}}
function subscribe(){try{if(chan){chan.unsubscribe();chan=null}const sb=supabase.createClient(SB_URL,SB_KEY);
 chan=sb.channel('rv_'+ME.code).on('postgres_changes',{event:'*',schema:'public',table:'room_ver',filter:'code=eq.'+ME.code},()=>refresh()).subscribe()}catch(e){}
 clearInterval(pollT);pollT=setInterval(()=>{refresh();tickTimer()},2500)}
// local timer: when deadline/until passes, ask server to advance
let tickT=null;function tickTimer(){if(!V||!V.game)return;const g=V.game,skew=Date.now()-V._recv+V.now;const t=g.until||g.deadline;
 const bar=$('tbar').firstChild;if(g.deadline&&!g.until){const tot=(V.settings.timer||30)*1000,left=Math.max(0,g.deadline-skew);bar.style.width=(left/tot*100)+'%'}else bar.style.width='0';
 {const left=g.deadline&&!g.until?Math.max(0,g.deadline-skew):0,tot=(V.settings.timer||30)*1000;document.querySelectorAll('.cdring').forEach(r=>r.style.setProperty('--p',(left/tot*100)+'%'));const dc=$('dclock');if(dc&&g.deadline){const sec=Math.ceil(left/1000);dc.textContent=sec+'s';dc.classList.toggle('hurry',sec<=5)}}
 if(t&&skew>=t+300&&!tickT){tickT=setTimeout(()=>{tickT=null;refresh()},200)}}
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
async function saveSettings(show_){const s={min:+$('sMin').value,max:+$('sMax').value,timer:+$('sTimer').value,bots:+$('sBots').value};if(V.gameNo===0)s.start=+$('sStart').value;
 try{await api('settings',{settings:s});if(show_)toast('Saved')}catch(e){$('rErr').textContent=e.message}}
$('sStartBtn').onclick=async()=>{try{await saveSettings(false);await api('start',{banker:$('sBanker').value})}catch(e){$('rErr').textContent=e.message}};
$('tBack').onclick=()=>{if(V.phase!=='game'||V.game.phase==='summary')renderRoom(true);else toast('Game in progress — room menu after this game')};
let roomOverride=false;
function renderRoom(force){roomOverride=!!force;show('room');const v=V,isHost=v.host===ME.pid;if(isHost&&window._wasHost===false)toast('You are now the host');window._wasHost=isHost;
 $('rCode').textContent=v.code;$('rCount').textContent=`(${v.players.length}/8)`;
 $('rPlayers').innerHTML=v.players.map(p=>`<div class="prow"><span class="dot ${p.online?'on':''}"></span><span>${esc(p.name)}${p.pid===ME.pid?' <span class="tg">YOU</span>':''}${p.pid===v.host?' <span class="tg">HOST</span>':''}${p.bot?' <span class="tg">BOT</span>':''}${p.pid===v.banker&&v.phase==='game'?' <span class="tg bk">BANKER</span>':''}</span><span class="ch">${fmtc(p.chips)}</span>${isHost&&!p.bot&&p.pid!==ME.pid&&!(v.phase==='game'&&v.game.phase!=='summary')?`<button class="ghost" style="padding:3px 8px;font-size:11px" onclick="kick('${p.pid}')">✕</button>`:''}</div>`).join('');
 $('rHost').style.display=isHost?'block':'none';$('rGuest').style.display=isHost?'none':'block';
 const st=v.settings;
 if(isHost&&document.activeElement.tagName!=='INPUT'&&document.activeElement.tagName!=='SELECT'){$('sMin').value=st.min;$('sMax').value=st.max;$('sTimer').value=st.timer;$('sBots').value=st.bots;$('sStart').value=st.start;$('sStart').disabled=v.gameNo>0;
  const sel=$('sBanker'),cur=sel.value;sel.innerHTML=v.players.filter(p=>!p.bot).map(p=>`<option value="${p.pid}">${esc(p.name)}${p.pid===ME.pid?' (you)':''}</option>`).join('');if(cur&&v.players.some(p=>p.pid===cur))sel.value=cur;
  $('sStartBtn').textContent=v.gameNo?'Deal next game ▶':'Deal ▶'}
 $('rSettingsTxt').textContent=`Bets ${st.min}–${st.max} · timer ${st.timer?st.timer+'s':'off'} · start ${st.start} chips`;
 $('rGuestTxt').textContent=v.phase==='game'&&v.game.phase!=='summary'?'A game is running — you will join the next one':'Waiting for the host to deal…';
 {const lb=[...v.players].sort((x,y)=>y.chips-x.chips).map((p,i)=>`<div class="lr ${p.pid===ME.pid?'me':''}"><span>${i==0?'🏆 ':''}${esc(p.name)}</span><b class="${p.chips-st.start>0?'pos':p.chips-st.start<0?'neg':''}">${sgn(p.chips-st.start)}</b></div>`).join('');
  let el=$('rLB');if(!el){el=document.createElement('div');el.className='card2';el.id='rLB';$('rLast').before(el)}el.innerHTML=v.gameNo?`<b>Leaderboard</b> <span class="small">(net chips · ${v.gameNo} game${v.gameNo>1?'s':''})</span><div class="lb">${lb}</div>`:'';el.style.display=v.gameNo?'block':'none'}
 const last=v.game&&v.game.phase==='summary';$('rLast').style.display=last?'block':'none';if(last)$('rLast').innerHTML='<b>Last game</b>'+summaryTable(v)+breakdownHTML();
 if(v.phase==='game'&&v.game.phase!=='summary'&&!force){roomOverride=false;renderTable()}}
window.kick=pid=>doAct('kick',{target:pid});
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}

/* ================= apply view ================= */
function apply(v){v._recv=Date.now();const prev=V;V=v;if(prev&&prev.gameNo!==v.gameNo){roomOverride=false;$('sheet').classList.remove('on')}
 if(prev&&prev.game&&v.game&&prev.gameNo!==v.gameNo){SEEN=new Map();peeked=new Set()}
 if(v.gameNo!==peekGame){peekGame=v.gameNo;peeked=new Set();SEEN=new Map()}
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
 return `<div class="slot ${cls}" style="${cls?`animation:dealIn .4s ${slot*70}ms both`:''}" ${tap?`data-peek="${c}"`:''}><div class="cd ${showFace&&!flipNow?'up':''} ${tap?'tap':''}" ${flipNow?'data-flip="1"':''}><div class="bc"></div>${c!=null?cardFace(c):'<div class="fc"></div>'}</div></div>`}
function seatHand(pid,s,size,mine){const g=V.game;let groups=[s.hand.map((c,i)=>i)];
 // regroup when splits/niu revealed
 if(g.round===3&&s.si!=null&&s.hand.every(c=>c!=null)&&(g.phase==='r3done'||mine)){const sp=skSplits(s.hand)[s.si];groups=[sp.hi.map(c=>s.hand.indexOf(c)),sp.lo.map(c=>s.hand.indexOf(c))]}
 if(g.round===4&&g.phase!=='r4peek'&&s.hand.length===5&&s.hand.every(c=>c!=null)&&!niuAw(s.hand).m){const nk=niuKey(s.hand);if(nk.grp)groups=[nk.grp.three.map(c=>s.hand.indexOf(c)),nk.grp.two.map(c=>s.hand.indexOf(c))]}
 let k=0;return groups.map(gr=>`<div class="grp" style="display:flex">${gr.map(i=>{const c=s.hand[i];const face=c!=null&&(!mine||peeked.has(c));return cardEl(pid+':'+i,c,face,k++,mine&&c!=null&&!peeked.has(c))}).join('')}</div>`).join('<div class="gsep"></div>')}
function seatLabel(pid,s){const g=V.game,h=s.hand,vis=h.every(c=>c!=null)&&(pid!==ME.pid||h.every(c=>peeked.has(c)));
 if(g.round===2&&g.phase!=='r2done'&&!vis)return s.pok?'Pok!':(g.phase==='r2bank'||g.phase==='r2turn')&&s.drew?'3 cards':'';
 if(!vis&&g.round>=2)return g.round===3&&g.phase==='r3set'?(s.set?'Set ✓':'Arranging…'):'';
 if(g.round===1)return `${RN[rk(h[0])]}${SY[st(h[0])]}`;
 if(g.round===2)return bEval(h).lab;
 if(g.round===3){if(s.si==null)return g.phase==='r3set'?(s.set?'Set ✓':'Arranging…'):'';if(allPic(h))return '4 Picture ×7';const sp=skSplits(h)[s.si];return `${skLabN(sp.kh)} / ${skLab(sp.kl)}`}
 if(g.round===4){if(g.phase==='r4peek'&&pid!==ME.pid)return '';const a=niuAw(h);return a.m?`${a.n} ×${a.m}`:niuLab(niuKey(h).k)}
 if(g.round===5)return cLab(best7([...h,...g.comm]));return ''}
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
 $('top').innerHTML=top;
 // centre
 const cen={bet:['Place your bets',`Bets ${v.settings.min}–${v.settings.max}`],r1:['High Card','Higher card wins · ♦<♣<♥<♠'],r2turn:['Thai Baccarat','Min 4 to stand · players take turns'],r2bank:['Thai Baccarat','Banker decides: draw · open · skip'],r2done:['Showdown',''],r3set:['Sikipi','Bottom ≥ Top · set face down'],r3done:['Sikipi reveal',''],r4peek:['Niu Niu','Peek your 5th card'],r4done:['Niu Niu',''],r5done:['Combo Poker','Best 5 of 7 · min pair'],summary:['Game over','']}[g.phase]||['',''];
 $('centre').innerHTML=`<div class="banner" ${$('centre').dataset.k===g.phase?'style="animation:none"':''}>${cen[0]}${cen[1]?`<small>${cen[1]}</small>`:''}</div><div class="comm md" id="comm">${g.comm.map((c,i)=>cardEl('comm:'+i,c,true,i)).join('')}</div><div id="logline">${esc(LOG.slice(-2).join(' · '))}</div>`;$('centre').dataset.k=g.phase;
 // me
 $('mePlq').textContent=SPEC?'WATCHING · joins next game':isB?'YOU · BANKER':'YOU · PLAYER';$('mePlq').className='plq '+(isB?'':'blue');
 $('meBet').innerHTML=isB?'':meS.bet?`<span class="chip c${chipD(meS.bet)}">${meS.bet}</span> <b style="color:var(--gold)">${meS.bet}</b> <span class="delta ${delta(ME.pid)>0?'pos':delta(ME.pid)<0?'neg':''}">${delta(ME.pid)?sgn(delta(ME.pid)*1):''}</span>`:'';
 if(!arranging){$('meZone').innerHTML=`<div class="hand lg" id="meHand">${seatHand(ME.pid,meS,'lg',true)}</div>`;bindPeek()}
 $('meLab').textContent=seatLabel(ME.pid,meS);
 $('me').classList.toggle('actor',g.actor===ME.pid);
 $('btrayWrap').innerHTML=isB?`<div class="btray" id="btray">${trayHTML(meP.chips)}</div><div class="btot">Banker chips ${fmtc(meP.chips)}</div>`:'';
 doFlips();renderActions()}
function delta(pid){const s=V.game.seats[pid];if(!s)return 0;if(pid===V.banker)return -V.game.order.reduce((a,q)=>{const t=V.game.seats[q];return a+t.r.reduce((x,y)=>x+y,0)*t.bet},0);return s.r.reduce((a,b)=>a+b,0)*s.bet}
const chipD=a=>a>=100?100:a>=25?25:a>=10?10:a>=5?5:1;
function seatHTML(pid,isB,dy=0,pos=null){const g=V.game,s=g.seats[pid],p=V.players.find(x=>x.pid===pid)||{name:'?'};const d=delta(pid);
 const rib=!isB&&g.round===2&&s.open!=null&&!s.pok?`<div class="ribbon big ${s.open?'open':'skip'}">${s.open?'OPENED':'SKIPPED'}</div>`:s.pok&&g.round===2?'<div class="ribbon open">POK</div>':'';
 const hd=bankHint(pid);
 return `<div class="seat ${isB?'bk':''} ${g.actor===pid?'actor':''} ${bankUI&&!isB&&bankUI.has(pid)?'':''}" data-pid="${pid}" style="${pos?`left:${pos[0]}%;top:${pos[1]}px`:`margin-top:${dy}px`}" ${bankTap(pid)}>
 ${g.actor===pid&&g.deadline?'<div class="cdring"></div>':''}<div class="av">${p.bot?(p.name.split(' ').pop()):(esc(p.name)[0]||'?').toUpperCase()}</div><div class="nm">${isB?'<span class="plq">BANKER</span> ':''}${esc(p.name.replace(/ \S+$/,p.bot?'':' $&').trim())}${p.online?'':' 💤'}</div>
 <div class="hand sm">${seatHand(pid,s,'sm',false)}</div><div class="lab">${seatLabel(pid,s)}</div>
 ${isB?`<div class="small">${fmtc(p.chips)}</div>`:`<div class="betspot">${s.betDone&&s.bet?`<span class="chip c${chipD(s.bet)}">${s.bet}</span>`:'<span class="small">…</span>'}<span class="delta ${d>0?'pos':d<0?'neg':''}">${d?sgn(d):''}</span></div>`}${rib}${hd}</div>`}
function trayHTML(b){b=Math.round(b);if(b<=0)return `<div class="iou">IOU ${fmtc(b)}</div>`;const cnt={},w={100:.4,25:.25,10:.15,5:.12};let carry=0,used=0;for(const d of[100,25,10,5]){const t=b*w[d]+carry;cnt[d]=Math.floor(t/d);carry=t-cnt[d]*d;used+=cnt[d]*d}cnt[1]=b-used;
 return [100,25,10,5,1].filter(d=>cnt[d]>0).map(d=>`<div class="bcol">${Array.from({length:Math.min(cnt[d],12)},(_,i)=>`<span class="chip c${d}" style="bottom:${i*4}px">${d}</span>`).join('')}<div class="cnt">×${cnt[d]}</div></div>`).join('')}
function bindPeek(){document.querySelectorAll('#meHand [data-peek]').forEach(el=>FX.squeeze(el,()=>{const c=+el.dataset.peek;peeked.add(c);const hi=V.game.seats[ME.pid].hand.indexOf(c);SEEN.set(ME.pid+':'+hi,c);snd('flip');const big=b2like(c);$('meLab').textContent=seatLabel(ME.pid,V.game.seats[ME.pid]);renderActions()}))}
function b2like(c){return 0}
function peekAll(){V.game.seats[ME.pid].hand.forEach(c=>{if(c!=null)peeked.add(c)});renderTable()}
function doFlips(){let n=0,f=0;document.querySelectorAll('[data-flip]').forEach(el=>{f++;requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('up')))});
 document.querySelectorAll('.slot.deal').forEach(()=>n++);if(n)snd('deal',n);else if(f)snd('flip')}

/* ================= actions panel ================= */
let arranging=null,bankUI=null;
function A(h){$('actions').innerHTML=h}
function unpeekedMine(){const s=V.game.seats[ME.pid];return s.hand.filter(c=>c!=null&&!peeked.has(c)).length}
const EMO=['😂','🔥','😭','🧧','😱','👏'];
function emoBar(){return `<div class="emobar">${EMO.map(e=>`<button onclick="sendEmo('${e}')">${e}</button>`).join('')}</div>`}
window.sendEmo=e=>{api('emote',{e}).catch(()=>{})};
function renderActions(){const v=V,g=v.game,s=g.seats[ME.pid],isB=v.banker===ME.pid;shoeOff();
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
 case 'r2bank':if(isB)return bankerUI();return wait('🎩 Banker is opening / skipping players…');
 case 'r2done':return wait('Baccarat settled · next: Sikipi');
 case 'r3set':if(s.si==null&&!s._sent){if(unpeekedMine())return A(`<div class="decide"><div class="dpts">🫣 Squeeze your new card(s) first</div><div class="arow" style="margin-top:8px">${peekBtn}</div></div>`);return arrangeUI()}return wait(`Splits set: ${[v.banker,...g.order].filter(p=>g.seats[p].set).length}/${g.order.length+1}`);
 case 'r3done':return wait('Sikipi settled · next: Niu Niu');
 case 'r4peek':return A(peekBtn?`<div class="decide"><div class="dpts">🫣 Squeeze your 5th card…</div><div class="arow" style="margin-top:8px">${peekBtn}</div></div>`:`<div class="wait">Revealing…</div>${emoBar()}`);
 case 'r4done':return wait('Niu Niu settled · next: Combo Poker');
 case 'r5done':return wait('Final round settled…');
 case 'summary':return A(`<div class="arow"><button class="gold" onclick="showSummary()">Results</button><button class="green" onclick="renderRoom(true)">Room</button></div>${emoBar()}`);
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
  const acts={};act.forEach(p=>acts[p]=BK.ev[p].st<0?'skip':'open');return {draw:false,acts,forced:false,act,after:true}}
 if(!BK||BK.game!==V.gameNo||BK.hk!==s.hand.slice(0,2).join()){const ev={};g.order.filter(p=>!g.seats[p].pok).forEach(p=>ev[p]=bkEV(s.hand.slice(0,2),g.seats[p].hand[0],g.seats[p].drew));BK={game:V.gameNo,hk:s.hand.slice(0,2).join(),ev}}
 const best=(p,d)=>forced?Math.max(0,BK.ev[p].dr):Math.max(0,BK.ev[p].st,d?BK.ev[p].dr:BK.ev[p].st);
 const val=d=>act.reduce((x,p)=>x+g.seats[p].bet*best(p,d),0);const dr=forced?true:val(true)>val(false);
 const acts={};act.forEach(p=>{const e=BK.ev[p],fin=dr?e.dr:e.st;acts[p]=(!forced&&e.st>=fin&&e.st>0)?'open':(!forced&&fin<=0&&e.st<=0)?'skip':'rest'});
 return {draw:dr,acts,forced,act}}
function bankHint(pid){const g=V.game;if(!(g.phase==='r2bank'&&V.banker===ME.pid))return '';const t=g.seats[pid];if(!t||t.pok||t.open!=null)return '';
 const pl=bkPlanC();if(pl.forced)return '';const a=pl.acts[pid];const e=BK.ev[pid];
 const btns=`<div class="obtns"><button class="obtn op" ${pl.forced?'disabled':''} onclick="event.stopPropagation();bkDo('${pid}','open')">OPEN</button><button class="obtn sk" ${pl.forced?'disabled':''} onclick="event.stopPropagation();bkDo('${pid}','skip')">SKIP</button></div>`;
 if(pl.forced||(pl.after&&unpeekedMine()))return btns;return btns+(hints?`<div class="hintdot">💡${a==='open'?'OPEN':a==='skip'?'SKIP':'WAIT'} ${pl.after?'':a==='open'?'+'+Math.round(e.st*100)+'%':a==='rest'?'then '+(pl.draw?'draw':'stand'):''}</div>`:'')}
function bankTap(pid){return ''}
window.bkDo=(pid,mode)=>{snd(mode==='open'?'flip':'tap');doAct('bopen',{target:pid,mode})};
function bankerUI(){const g=V.game,s=g.seats[ME.pid];
 if(unpeekedMine())return A(`<div class="decide"><div class="dpts">🫣 Squeeze your cards first</div><div class="arow" style="margin-top:8px"><button class="ghost" onclick="peekAll()">Reveal my cards</button></div></div>`);
 if(!BK||BK.game!==V.gameNo||BK.hk!==(bkDrew()?'3:'+s.hand.join():s.hand.slice(0,2).join())){A(`<div class="decide"><div class="dpts"><span class="spin"></span>Reading the table…</div></div>`);setTimeout(()=>{bkPlanC();renderTable()},30);return}
 const pl=bkPlanC();const bp=b2(s.hand).p;const left=pl.act.length;
 if(pl.forced){shoeOn(()=>doAct('bfinish',{draw:true}));return A(`<div class="decide"><div class="dtop"><div class="dpts">🎩 Banker · you have<b>${bp}</b>pts</div><div class="dclock" id="dclock"></div></div>
  <div class="hint" style="margin-bottom:8px">Under 4 — you must <b>draw</b> and show down with <b>everyone</b>. No OPEN / SKIP.</div>
  <div class="dbtns"><button class="dbig draw best" onclick="doAct('bfinish',{draw:true})">🂠 DRAW<small>then show down with all ${left}</small></button></div></div>`)}
 if(pl.after){shoeOff();const fp=bEval(s.hand).p;return A(`<div class="decide"><div class="dtop"><div class="dpts">🎩 Banker · 3 cards<b>${fp}</b>pts</div><div class="dclock" id="dclock"></div></div>
  <div class="hint" style="margin-bottom:8px">Tap <b>OPEN</b> / <b>SKIP</b> on players' seats, then settle the rest vs your ${fp}.</div>
  <div class="dbtns"><button class="dbig stand best" onclick="doAct('bfinish',{draw:false})">✅ SETTLE REST<small>${left?`${left} player${left>1?'s':''} vs ${fp}`:'done'}</small></button></div></div>`)}
 shoeOn(()=>doAct('bfinish',{draw:true}));
 A(`<div class="decide"><div class="dtop"><div class="dpts">🎩 Banker · you have<b>${bp}</b>pts</div><div class="dclock" id="dclock"></div></div>
  <div class="hint" style="margin-bottom:8px">${pl.forced?`Under 4 — draw first.`:`Tap <b>OPEN</b> / <b>SKIP</b> on players' seats.${hints?` 💡 Then <b>${pl.draw?'DRAW':'STAND'}</b> for the rest.`:''}`}</div>
  <div class="dbtns"><button class="dbig draw ${hints&&pl.draw?'best':''}" onclick="doAct('bfinish',{draw:true})">🂠 DRAW<small>${left?`then settle ${left} left`:'take a 3rd card'}</small></button>${pl.forced?'':`<button class="dbig stand ${hints&&!pl.draw?'best':''}" onclick="doAct('bfinish',{draw:false})">✋ STAND<small>${left?`settle ${left} on ${bp}`:`keep ${bp}`}</small></button>`}</div></div>`)}

/* ---- sikipi arrange ---- */
function arrangeUI(){if(window.__drag)return;const v=V,g=v.game,s=g.seats[ME.pid],isB=v.banker===ME.pid;if(s.hand.some(c=>c==null))return;let first=false;
 if(!arranging||arranging.game!==v.gameNo){const spl=skSplits(s.hand);let ev;
  if(isB){const Ps=g.order.map(q=>{const t=g.seats[q];return {shownB:t.shownB,vis:t.vis||[],bet:t.bet}});ev=skBankerEV({hand:s.hand,spl},Ps,200)}
  else ev=skEV({hand:s.hand,spl},g.seats[v.banker].vis||[]);
  arranging={game:v.gameNo,spl,ev,bi:skEVBest(ev,spl),pool:[...s.hand],bot:[],top:[]};first=true}
 const ar=arranging,zone=$('meZone');$('prompt').textContent='Drag cards into Bottom and Top (or tap)';
 const lab=(cs,b)=>cs.length==2?(b?skLabN:skLab)(skKey(cs[0],cs[1])):'';const full=ar.bot.length==2&&ar.top.length==2;const best=ar.spl[ar.bi];
 zone.innerHTML=`<div class="pool" data-z="pool">${ar.pool.map(cardBtn).join('')}</div><div class="zones"><div class="zone" data-z="bot"><div class="zt">Bottom (stronger)</div><div class="zc">${ar.bot.map(cardBtn).join('')}</div><div class="zl">${lab(ar.bot,1)}</div></div><div class="zone" data-z="top"><div class="zt">Top</div><div class="zc">${ar.top.map(cardBtn).join('')}</div><div class="zl">${lab(ar.top)}</div></div></div>`;if(first)$('me').scrollIntoView({block:'end',behavior:'smooth'});
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
function playEvents(evs){let mineTot=0,any=false,bestM=0,worstM=0;const nm=pid=>(PN(pid)||'').replace(/ \S+$/,'')||PN(pid);
 for(const e of evs){
  if(e.t==='emote'){const el=e.pid===ME.pid?$('me'):document.querySelector(`.seat[data-pid="${e.pid}"]`);if(el){const d=document.createElement('div');d.className='emo';d.textContent=e.e;el.appendChild(d);setTimeout(()=>d.remove(),1900)}continue}
  if(e.t==='settle'){any=true;const el=document.querySelector(`.seat[data-pid="${e.pid}"]`)||(e.pid===ME.pid?$('me'):null);const bEl=V.banker===ME.pid?($('btray')||$('me')):document.querySelector(`.seat[data-pid="${V.banker}"]`);
   if(el&&bEl){if(e.m>0)fly(bEl,el,Math.min(8,e.m+2));else if(e.m<0)fly(el,bEl,Math.min(8,-e.m+2));floatOn(el,e.m>0?`+${e.m}× ${sgn(e.amt)}`:e.m<0?`${e.m}× ${sgn(e.amt)}`:'Push',e.m>0?'w':e.m<0?'l':'p')}
   if(e.pid===ME.pid&&e.ri===1&&V.game.seats[ME.pid]&&V.game.seats[ME.pid].pok&&e.m>0){FX.big('POK!',`+${e.m}×`);FX.flash('#ffd76a');FX.vibe(120)}
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
 if(V.game&&V.game.actor===ME.pid&&!window._turnPinged){window._turnPinged=true;snd('turn');FX.vibe([80,40,80])}
 if(V.game&&V.game.actor!==ME.pid)window._turnPinged=false}
function fly(a_,b_,n){const a=a_.getBoundingClientRect(),b=b_.getBoundingClientRect();for(let i=0;i<n;i++){if(i<3)setTimeout(()=>snd('chip'),120+i*70);const c=document.createElement('span');c.className='chip c5 fly';c.textContent='';c.style.left=(a.left+a.width/2-12)+'px';c.style.top=(a.top+a.height/2-12)+'px';document.body.appendChild(c);
 setTimeout(()=>{c.style.transform=`translate(${b.left+b.width/2-a.left-a.width/2+(i-1)*6}px,${b.top+b.height/2-a.top-a.height/2}px)`;c.style.opacity='.9'},20+i*70);setTimeout(()=>c.remove(),700+i*70)}}
function floatOn(el,txt,cls){const f=document.createElement('div');f.className='float '+cls;f.textContent=txt;el.appendChild(f);setTimeout(()=>f.remove(),1700)}
function bubble(el,t){const b=document.createElement('div');b.className='bubble';b.textContent=t;el.appendChild(b);setTimeout(()=>b.remove(),1500)}

/* ================= summary ================= */
function summaryTable(v){const g=v.game;const rows=g.order.map(pid=>{const s=g.seats[pid];return `<tr class="${pid===ME.pid?'mine':''}"><td>${esc(PN(pid))} <span class="small">${s.bet}</span></td>${s.r.map(x=>`<td class="${x>0?'pos':x<0?'neg':'zero'}">${x}</td>`).join('')}<td><b>${sgn(s.r.reduce((a,b)=>a+b,0)*s.bet)}</b></td></tr>`}).join('');
 return `<table class="t" style="margin-top:6px"><tr><th>Seat</th><th>HC</th><th>Bac</th><th>SKP</th><th>Niu</th><th>Cmb</th><th>±</th></tr>${rows}<tr class="${v.banker===ME.pid?'mine':''}"><td><b>${esc(PN(v.banker))} (Banker)</b></td><td colspan="5"></td><td><b>${sgn(delta(v.banker))}</b></td></tr></table>`}

function roundHands(pid){const g=V.game,s=g.seats[pid];if(!s)return null;const h=s.hand;if(h.some(c=>c==null)||h.length<5)return null;const isBk=pid===V.banker;
 const bac=isBk?(s.vis&&s.vis.length>=2?s.vis:h.slice(0,2)):h.slice(0,s.drew?3:2);const sk=h.slice(0,4),nn=h.slice(0,5);
 let skt='?';if(allPic(sk))skt='4 Picture';else if(s.si!=null){const sp=skSplits(sk)[s.si];skt=`Bottom ${ctxt(sp.hi)} ${skLabN(sp.kh)} · Top ${ctxt(sp.lo)} <b>${skLab(sp.kl)}</b>`}
 const a=niuAw(nn);
 return [`${ctxt([h[0]])}`,`${ctxt(bac)} ${bEval(bac).lab}`,skt,`${ctxt(nn)} ${a.m?a.n+' ×'+a.m:niuLab(niuKey(nn).k)}`,`${cLab(best7([...nn,...g.comm]))}`]}
function breakdownHTML(){const g=V.game;if(!g)return '';const me=ME.pid,isB=V.banker===me,bk=roundHands(V.banker);if(!bk)return '';
 const res=x=>x>0?`<span class="pos">+${x}×</span>`:x<0?`<span class="neg">${x}×</span>`:'<span class="zero">Push</span>';
 const nm=['High Card','Baccarat','Sikipi','Niu Niu','Combo'];
 if(!isB){const mine=roundHands(me),s=g.seats[me];if(!mine)return '';
  return `<div class="bd"><b>How you were paid</b> <span class="small">(bet ${s.bet})</span>${nm.map((n,i)=>`<div class="bdr"><div class="bdh"><b>${n}</b> ${i==1&&s.open===false?'<span class="zero">Skipped</span>':res(s.r[i])} <span class="small">${sgn(s.r[i]*s.bet)}</span></div><div class="small">You: ${mine[i]}</div><div class="small">Banker: ${bk[i]}</div></div>`).join('')}</div>`}
 return `<div class="bd"><b>Your banker hands</b>${nm.map((n,i)=>`<div class="bdr"><div class="bdh"><b>${n}</b></div><div class="small">${bk[i]}</div></div>`).join('')}</div>`}
window.showSummary=()=>{const v=V;if(!v.game)return;const d=delta(ME.pid);
 $('sheetIn').innerHTML=`<h2>${d>0?'You win!':d<0?'Tough game':'Break even'}</h2><div class="big ${d>0?'pos':d<0?'neg':''}">${sgn(d)}</div>${summaryTable(v)}${breakdownHTML()}
 <div class="small" style="text-align:center;margin:10px 0">Your chips ${fmtc(v.players.find(p=>p.pid===ME.pid).chips)}</div><button class="gold" style="width:100%" onclick="$('sheet').classList.remove('on');renderRoom(true)">Back to room</button>`;
 $('sheet').classList.add('on');snd(d>0?'big':d<0?'lose':'chip')};

/* ================= toggles & boot ================= */
$('rulesBtn').onclick=()=>FX.rules(V&&V.game?V.game.round:0);$('autoBtn').classList.toggle('on',autoReveal);$('autoBtn').onclick=()=>{autoReveal=!autoReveal;localStorage.setItem('ct.auto',autoReveal?'1':'0');$('autoBtn').classList.toggle('on',autoReveal);toast(autoReveal?'👁 Auto-reveal my cards: ON':'Squeeze my own cards: ON');if(V&&V.game)renderTable()};
$('hintBtn').onclick=()=>{hints=!hints;localStorage.setItem('ct.hints',hints?'1':'0');toast(hints?'💡 Hints on':'Hints off');renderTable()};
$('muteBtn').onclick=()=>{mute=!mute;localStorage.setItem('ct.mute',mute?'1':'0');$('muteBtn').textContent=mute?'🔇':'🔊'};
if(ME){if(qs.get('room')&&qs.get('room').toUpperCase()!==ME.code){/* invited elsewhere */ME=null;saveMe()}else{subscribe();refresh()}}

/* safety: never leave a dragged card copy on screen */
function clearGhosts(){setTimeout(()=>{if(!window.__drag)document.querySelectorAll('body>.dragging').forEach(g=>g.remove())},60)}
addEventListener('pointerup',()=>{window.__drag=false;clearGhosts()},true);addEventListener('pointercancel',()=>{window.__drag=false;clearGhosts()},true);
