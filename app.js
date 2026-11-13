function ringLayout(players,banker){const m=players.length,k=Math.max(1,Math.ceil(m/2)),H=Math.max(440,138*k+130);
 const topY=banker?196:140,botY=H-70,ys=i=>k<=1?Math.round((topY+botY)/2+20):Math.round(botY-(botY-topY)*i/(k-1));
 const out=[];const L=players.slice(0,k),R=players.slice(k);
 L.forEach((p,i)=>out.push({p,x:15+(k>2&&i==k-1?3:0),y:ys(i)}));
 R.forEach((p,j)=>{const i=j;out.push({p,x:85-(k>2&&i==k-1?3:0),y:ys(i)})});
 if(banker)out.push({p:banker,x:50,y:70});return {out,H}}

/* ================= config ================= */
const SB_URL='https://zdikuwkuvnonlytaaera.supabase.co';
const SB_KEY='sb_publishable_6z-CgA9sueQZ-mmN-nnG2w_5Xv2jOlp';
const FN=SB_URL+'/functions/v1/game';
const $=id=>document.getElementById(id);
const fmtc=v=>(v<0?'-':'')+Math.abs(Math.round(v)).toLocaleString();
const sgn=v=>(v>0?'+':v<0?'-':'')+Math.abs(Math.round(v)).toLocaleString();
let ME=null;            // {code,pid,token,name}
let V=null;             // latest view
let lastSeq=0,busy=false,pollT=null,chan=null,hints=true,mute=false,peeked=new Set(),peekGame=0;
try{const s=JSON.parse(localStorage.getItem('ct.session')||'null');if(s)ME=s;hints=localStorage.getItem('ct.hints')!=='0';mute=localStorage.getItem('ct.mute')==='1'}catch(e){}
function saveMe(){try{localStorage.setItem('ct.session',JSON.stringify(ME))}catch(e){}}
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id==id));}
function toast(t,ms=1800){const d=document.createElement('div');d.className='toast';d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),ms)}

/* ================= sound ================= */
let AC=null;function ac(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(AC&&AC.state=='suspended')AC.resume();return AC}
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
 if(t&&skew>=t+300&&!tickT){tickT=setTimeout(()=>{tickT=null;refresh()},200)}}
setInterval(tickTimer,250);

/* ================= home ================= */
$('hName').value=(ME&&ME.name)||localStorage.getItem('ct.name')||'';
const qs=new URLSearchParams(location.search);if(qs.get('room'))$('hCode').value=qs.get('room').toUpperCase();
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
 const last=v.game&&v.game.phase==='summary';$('rLast').style.display=last?'block':'none';if(last)$('rLast').innerHTML='<b>Last game</b>'+summaryTable(v);
 if(v.phase==='game'&&v.game.phase!=='summary'&&v.game.seats[ME.pid]){roomOverride=false;renderTable()}}
window.kick=pid=>doAct('kick',{target:pid});
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}

/* ================= apply view ================= */
function apply(v){v._recv=Date.now();const prev=V;V=v;if(prev&&prev.gameNo!==v.gameNo){roomOverride=false;$('sheet').classList.remove('on')}
 if(prev&&prev.game&&v.game&&prev.gameNo!==v.gameNo){SEEN=new Map();peeked=new Set()}
 if(v.gameNo!==peekGame){peekGame=v.gameNo;peeked=new Set();SEEN=new Map()}
 const inGame=v.phase==='game'&&v.game&&v.game.seats[ME.pid];
 if(!inGame||roomOverride||(v.game.phase==='summary'&&!$('table').classList.contains('on')))renderRoom(roomOverride);else renderTable();
 // events → animations
 const evs=v.events.filter(e=>e.seq>lastSeq);if(lastSeq===0)evs.length=0;lastSeq=v.seq;
 if($('table').classList.contains('on'))playEvents(evs);
 if(v.game&&v.game.phase==='summary'&&prev&&prev.game&&prev.game.phase!=='summary')setTimeout(()=>showSummary(),900)}

/* ================= table rendering ================= */
let SEEN=new Map();
function cardFace(c){const red=(st(c)==0||st(c)==2);return `<div class="fc ${red?'red':''}"><span class="ix">${RN[rk(c)]}<br>${SY[st(c)]}</span><span class="pip">${SY[st(c)]}</span></div>`}
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
 if(g.round===3){if(s.si==null)return g.phase==='r3set'?(s.set?'Set ✓':'Arranging…'):'';if(allPic(h))return '4 Picture ×7';const sp=skSplits(h)[s.si];return `${skLab(sp.kh)} / ${skLab(sp.kl)}`}
 if(g.round===4){if(g.phase==='r4peek'&&pid!==ME.pid)return '';const a=niuAw(h);return a.m?`${a.n} ×${a.m}`:niuLab(niuKey(h).k)}
 if(g.round===5)return cLab(best7([...h,...g.comm]));return ''}
const PN=pid=>{const p=V.players.find(x=>x.pid===pid);return p?p.name:'?'};
const RNM=['Bets','High Card','Thai Baccarat','Sikipi','Niu Niu','Combo Poker'];
function renderTable(){show('table');const v=V,g=v.game,meS=g.seats[ME.pid],isB=v.banker===ME.pid;if(g.phase!=='r2bank'){BK=null}if(g.phase!=='r3set')arranging=null;
 const meP=v.players.find(p=>p.pid===ME.pid);$('hBank').textContent=fmtc(meP.chips);$('hBank').className='v '+(meP.chips<v.settings.start?'neg':'');
 $('hRound').innerHTML=`<small>${g.round?`ROUND ${g.round}/5`:'ROOM '+v.code}</small>${g.phase==='bet'?'Place bets':RNM[g.round]}`;
 $('hintBtn').classList.toggle('on',hints);$('muteBtn').textContent=mute?'🔇':'🔊';
 // top seats
 const others=[v.banker,...g.order].filter(pid=>pid!==ME.pid);
 const pl=others.filter(p=>p!==v.banker);const RL=ringLayout(pl,isB?null:v.banker);$('top').style.height=RL.H+'px';$('centre').style.top=Math.round(RL.H*0.42)+'px';
 let top=RL.out.map(o=>seatHTML(o.p,o.p===v.banker,0,[o.x,o.y])).join('');
 $('top').innerHTML=top;
 // centre
 const cen={bet:['Place your bets',`Bets ${v.settings.min}–${v.settings.max}`],r1:['High Card','Higher card wins · ♦<♣<♥<♠'],r2turn:['Thai Baccarat','Min 4 to stand · players take turns'],r2bank:['Thai Baccarat','Banker decides: draw · open · skip'],r2done:['Showdown',''],r3set:['Sikipi','Bottom ≥ Top · set face down'],r3done:['Sikipi reveal',''],r4peek:['Niu Niu','Peek your 5th card'],r4done:['Niu Niu',''],r5done:['Combo Poker','Best 5 of 7 · min pair'],summary:['Game over','']}[g.phase]||['',''];
 $('centre').innerHTML=`<div class="banner" ${$('centre').dataset.k===g.phase?'style="animation:none"':''}>${cen[0]}${cen[1]?`<small>${cen[1]}</small>`:''}</div><div class="comm md" id="comm">${g.comm.map((c,i)=>cardEl('comm:'+i,c,true,i)).join('')}</div>`;$('centre').dataset.k=g.phase;
 // me
 $('mePlq').textContent=isB?'YOU · BANKER':'YOU · PLAYER';$('mePlq').className='plq '+(isB?'':'blue');
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
 <div class="av">${p.bot?(p.name.split(' ').pop()):(esc(p.name)[0]||'?').toUpperCase()}</div><div class="nm">${isB?'<span class="plq">BANKER</span> ':''}${esc(p.name.replace(/ \S+$/,p.bot?'':' $&').trim())}${p.online?'':' 💤'}</div>
 <div class="hand sm">${seatHand(pid,s,'sm',false)}</div><div class="lab">${seatLabel(pid,s)}</div>
 ${isB?`<div class="small">${fmtc(p.chips)}</div>`:`<div class="betspot">${s.betDone&&s.bet?`<span class="chip c${chipD(s.bet)}">${s.bet}</span>`:'<span class="small">…</span>'}<span class="delta ${d>0?'pos':d<0?'neg':''}">${d?sgn(d):''}</span></div>`}${rib}${hd}</div>`}
function trayHTML(b){b=Math.round(b);if(b<=0)return `<div class="iou">IOU ${fmtc(b)}</div>`;const cnt={},w={100:.4,25:.25,10:.15,5:.12};let carry=0,used=0;for(const d of[100,25,10,5]){const t=b*w[d]+carry;cnt[d]=Math.floor(t/d);carry=t-cnt[d]*d;used+=cnt[d]*d}cnt[1]=b-used;
 return [100,25,10,5,1].filter(d=>cnt[d]>0).map(d=>`<div class="bcol">${Array.from({length:Math.min(cnt[d],12)},(_,i)=>`<span class="chip c${d}" style="bottom:${i*4}px">${d}</span>`).join('')}<div class="cnt">×${cnt[d]}</div></div>`).join('')}
function bindPeek(){document.querySelectorAll('#meHand [data-peek]').forEach(el=>el.onclick=()=>{const c=+el.dataset.peek;peeked.add(c);const hi=V.game.seats[ME.pid].hand.indexOf(c);SEEN.set(ME.pid+':'+hi,c);el.querySelector('.cd').classList.add('up');el.querySelector('.cd').classList.remove('tap');snd('flip');$('meLab').textContent=seatLabel(ME.pid,V.game.seats[ME.pid]);renderActions()})}
function peekAll(){V.game.seats[ME.pid].hand.forEach(c=>{if(c!=null)peeked.add(c)});renderTable()}
function doFlips(){let n=0,f=0;document.querySelectorAll('[data-flip]').forEach(el=>{f++;requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('up')))});
 document.querySelectorAll('.slot.deal').forEach(()=>n++);if(n)snd('deal',n);else if(f)snd('flip')}

/* ================= actions panel ================= */
let arranging=null,bankUI=null;
function A(h){$('actions').innerHTML=h}
function unpeekedMine(){const s=V.game.seats[ME.pid];return s.hand.filter(c=>c!=null&&!peeked.has(c)).length}
function renderActions(){const v=V,g=v.game,s=g.seats[ME.pid],isB=v.banker===ME.pid;shoeOff();
 const wait=t=>A(`<div class="wait">${t}</div>`);
 if(unpeekedMine()&&g.phase!=='summary'){$('prompt').textContent='Tap your card to peek 👆'}else $('prompt').textContent='';
 const peekBtn=unpeekedMine()?`<button class="ghost" onclick="peekAll()">Reveal my cards</button>`:'';
 switch(g.phase){
 case 'bet':if(isB){const n=g.order.filter(p=>!g.seats[p].betDone).length;return wait(n?`Waiting for ${n} bet(s)…`:'Dealing…')}
  if(s.betDone)return wait(`You bet ${s.bet}. Waiting for others…`);return betUI();
 case 'r1':return A(peekBtn?`<div class="arow">${peekBtn}</div>`:'<div class="wait">High card settled</div>');
 case 'r2turn':{if(g.actor===ME.pid){const p=b2(s.hand).p;const forced=p<=3;const best=pdrawsC(s.hand);
   shoeOn(()=>doAct('draw'));
   return A(`${hints?`<div class="hint">💡 ${forced?`You have ${p} — must draw`:best?'Draw':'Stand'}${forced?'':` — ${p==4?'always draw on 4':p==5?'on 5 draw only with 2+3 or 7+8':'stand on 6–7'}`}</div>`:''}<div class="arow"><button class="gold drawbtn" onclick="doAct('draw')">🂠 Draw card</button>${forced?'':`<button class="green drawbtn" onclick="doAct('stand')">✋ Stand</button>`}</div>${peekBtn?`<div class="arow">${peekBtn}</div>`:''}`)}
  return A(`<div class="wait">${esc(PN(g.actor))} is deciding…</div>${peekBtn?`<div class="arow">${peekBtn}</div>`:''}`)}
 case 'r2bank':if(isB)return bankerUI();return wait('Banker is opening / skipping players…');
 case 'r2done':return wait('Baccarat settled · next: Sikipi');
 case 'r3set':if(s.si==null&&!s._sent)return arrangeUI();return wait(`Splits set: ${[v.banker,...g.order].filter(p=>g.seats[p].set).length}/${g.order.length+1}`);
 case 'r3done':return wait('Sikipi settled · next: Niu Niu');
 case 'r4peek':return A(peekBtn?`<div class="arow">${peekBtn}</div>`:'<div class="wait">Revealing…</div>');
 case 'r4done':return wait('Niu Niu settled · next: Combo Poker');
 case 'r5done':return wait('Final round settled…');
 case 'summary':return A(`<div class="arow"><button class="gold" onclick="showSummary()">Results</button><button class="green" onclick="renderRoom(true)">Room</button></div>`);
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
function bkPlanC(){const g=V.game,s=g.seats[ME.pid];const act=g.order.filter(p=>{const t=g.seats[p];return !t.pok&&t.open==null});const forced=b2(s.hand).p<=3;
 if(!BK||BK.game!==V.gameNo||BK.hk!==s.hand.slice(0,2).join()){const ev={};g.order.filter(p=>!g.seats[p].pok).forEach(p=>ev[p]=bkEV(s.hand.slice(0,2),g.seats[p].hand[0],g.seats[p].drew));BK={game:V.gameNo,hk:s.hand.slice(0,2).join(),ev}}
 const best=(p,d)=>forced?Math.max(0,BK.ev[p].dr):Math.max(0,BK.ev[p].st,d?BK.ev[p].dr:BK.ev[p].st);
 const val=d=>act.reduce((x,p)=>x+g.seats[p].bet*best(p,d),0);const dr=forced?true:val(true)>val(false);
 const acts={};act.forEach(p=>{const e=BK.ev[p],fin=dr?e.dr:e.st;acts[p]=(!forced&&e.st>=fin&&e.st>0)?'open':(fin<=0&&(forced||e.st<=0))?'skip':'rest'});
 return {draw:dr,acts,forced,act}}
function bankHint(pid){const g=V.game;if(!(g.phase==='r2bank'&&V.banker===ME.pid))return '';const t=g.seats[pid];if(!t||t.pok||t.open!=null)return '';
 const pl=bkPlanC();const a=pl.acts[pid];const e=BK.ev[pid];
 const btns=`<div class="obtns"><button class="obtn op" ${pl.forced?'disabled':''} onclick="event.stopPropagation();bkDo('${pid}','open')">OPEN</button><button class="obtn sk" onclick="event.stopPropagation();bkDo('${pid}','skip')">SKIP</button></div>`;
 return btns+(hints?`<div class="hintdot">💡${a==='open'?'OPEN':a==='skip'?'SKIP':'WAIT'} ${a==='open'?'+'+Math.round(e.st*100)+'%':a==='rest'?'then '+(pl.draw?'draw':'stand'):''}</div>`:'')}
function bankTap(pid){return ''}
window.bkDo=(pid,mode)=>{snd(mode==='open'?'flip':'tap');doAct('bopen',{target:pid,mode})};
function bankerUI(){const g=V.game,s=g.seats[ME.pid];const pl=bkPlanC();const bp=b2(s.hand).p;const left=pl.act.length;
 if(!pl.forced)shoeOn(()=>doAct('bfinish',{draw:true}));else shoeOn(()=>doAct('bfinish',{draw:true}));
 A(`${hints?`<div class="hint">💡 ${pl.forced?`You have ${bp} — must draw before opening anyone`:`You have ${bp}. Open/skip players on their seats, then <b>${pl.draw?'DRAW':'STAND'}</b> for the rest`}</div>`:`<div class="wait">You have ${bp}. OPEN or SKIP players, then draw or stand for the rest</div>`}
  <div class="arow"><button class="gold drawbtn" onclick="doAct('bfinish',{draw:true})">🂠 Draw${left?` for ${left} left`:''}</button>${pl.forced?'':`<button class="green drawbtn" onclick="doAct('bfinish',{draw:false})">✋ Stand${left?` · settle ${left}`:''}</button>`}</div>`)}

/* ---- sikipi arrange ---- */
function arrangeUI(){const v=V,g=v.game,s=g.seats[ME.pid],isB=v.banker===ME.pid;if(s.hand.some(c=>c==null))return;
 if(!arranging||arranging.game!==v.gameNo){const spl=skSplits(s.hand);let ev;
  if(isB){const Ps=g.order.map(q=>{const t=g.seats[q];return {shownB:t.shownB,vis:t.vis||[],bet:t.bet}});ev=skBankerEV({hand:s.hand,spl},Ps,200)}
  else ev=skEV({hand:s.hand,spl},g.seats[v.banker].vis||[]);
  arranging={game:v.gameNo,spl,ev,bi:skEVBest(ev,spl),pool:[...s.hand],bot:[],top:[]}}
 const ar=arranging,zone=$('meZone');$('prompt').textContent='Drag cards into Bottom and Top (or tap)';
 const lab=cs=>cs.length==2?skLab(skKey(cs[0],cs[1])):'';const full=ar.bot.length==2&&ar.top.length==2;const best=ar.spl[ar.bi];
 zone.innerHTML=`<div class="zones"><div class="zone" data-z="bot"><div class="zt">Bottom (stronger)</div><div class="zc">${ar.bot.map(cardBtn).join('')}</div><div class="zl">${lab(ar.bot)}</div></div><div class="zone" data-z="top"><div class="zt">Top</div><div class="zc">${ar.top.map(cardBtn).join('')}</div><div class="zl">${lab(ar.top)}</div></div></div><div class="pool" data-z="pool">${ar.pool.map(cardBtn).join('')}</div>`;
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
function cardBtn(c){const red=(st(c)==0||st(c)==2);return `<div class="slot lg" data-c="${c}" style="touch-action:none"><div class="cd up" style="width:56px;height:80px;border-radius:8px;font-size:44px"><div class="bc"></div><div class="fc ${red?'red':''}"><span class="ix">${RN[rk(c)]}<br>${SY[st(c)]}</span><span class="pip">${SY[st(c)]}</span></div></div></div>`}
function moveCard(c,to){const ar=arranging;for(const z of['pool','bot','top'])ar[z]=ar[z].filter(x=>x!=c);if(to!='pool'&&ar[to].length>=2)ar.pool.push(ar[to].shift());ar[to].push(c);snd('flip');arrangeUI()}
function bindDrag(el){const c=+el.dataset.c,zone=$('meZone');let sx=null,sy,dragging=false,ghost=null,over=null;
 el.onpointerdown=e=>{sx=e.clientX;sy=e.clientY;dragging=false;el.setPointerCapture(e.pointerId)};
 el.onpointermove=e=>{if(sx==null)return;if(!dragging&&Math.hypot(e.clientX-sx,e.clientY-sy)>8){dragging=true;ghost=el.cloneNode(true);ghost.classList.add('dragging');document.body.appendChild(ghost);el.style.opacity='.3'}
  if(dragging){ghost.style.left=(e.clientX-28)+'px';ghost.style.top=(e.clientY-40)+'px';const t=document.elementFromPoint(e.clientX,e.clientY);const z=t&&t.closest('[data-z]');zone.querySelectorAll('.zone').forEach(x=>x.classList.toggle('over',x===z));over=z}};
 el.onpointerup=()=>{const was=dragging;sx=null;if(ghost){ghost.remove();ghost=null}el.style.opacity='';
  if(was){if(over)moveCard(c,over.dataset.z)}else{const ar=arranging;if(ar.pool.includes(c))moveCard(c,ar.bot.length<2?'bot':'top');else moveCard(c,'pool')}};
 el.onpointercancel=()=>{sx=null;if(ghost){ghost.remove();ghost=null}el.style.opacity=''}}

/* ================= events → chips & sounds ================= */
function playEvents(evs){let mineTot=0,any=false;
 for(const e of evs){if(e.t==='settle'){any=true;const el=document.querySelector(`.seat[data-pid="${e.pid}"]`)||(e.pid===ME.pid?$('me'):null);const bEl=V.banker===ME.pid?($('btray')||$('me')):document.querySelector(`.seat[data-pid="${V.banker}"]`);
   if(el&&bEl){if(e.m>0)fly(bEl,el,Math.min(5,e.m+1));else if(e.m<0)fly(el,bEl,Math.min(5,-e.m+1));floatOn(el,e.m>0?`+${e.m}× ${sgn(e.amt)}`:e.m<0?`${e.m}× ${sgn(e.amt)}`:'Push',e.m>0?'w':e.m<0?'l':'p')}
   if(e.pid===ME.pid)mineTot+=e.amt;if(V.banker===ME.pid)mineTot-=e.amt}
  if(e.t==='act'&&e.pid!==ME.pid){const el=document.querySelector(`.seat[data-pid="${e.pid}"]`);if(el)bubble(el,e.a==='draw'?'Draw':'Stand')}
  if((e.t==='open'||e.t==='skip')&&V.banker!==ME.pid){const el=document.querySelector(`.seat[data-pid="${V.banker}"]`);if(el)bubble(el,(e.t==='open'?'Open ':'Skip ')+PN(e.pid).split(' ')[0]);if(e.pid===ME.pid)toast(e.t==='open'?'Banker OPENED you':'Banker SKIPPED you — push')}
  if(e.t==='bank'&&V.banker!==ME.pid){const el=document.querySelector(`.seat[data-pid="${V.banker}"]`);if(el)bubble(el,e.draw?'Banker draws':'Banker stands')}
  if(e.t==='start')toast(`New game · ${PN(e.banker)} is banker`)}
 if(any){if(mineTot>0)snd(mineTot>=3*(V.game.seats[ME.pid].bet||1)?'big':'win');else if(mineTot<0)snd('lose');else snd('chip')}
 if(V.game&&V.game.actor===ME.pid&&!window._turnPinged){window._turnPinged=true;snd('turn');if(navigator.vibrate)navigator.vibrate(80)}
 if(V.game&&V.game.actor!==ME.pid)window._turnPinged=false}
function fly(a_,b_,n){const a=a_.getBoundingClientRect(),b=b_.getBoundingClientRect();for(let i=0;i<n;i++){const c=document.createElement('span');c.className='chip c5 fly';c.textContent='';c.style.left=(a.left+a.width/2-12)+'px';c.style.top=(a.top+a.height/2-12)+'px';document.body.appendChild(c);
 setTimeout(()=>{c.style.transform=`translate(${b.left+b.width/2-a.left-a.width/2+(i-1)*6}px,${b.top+b.height/2-a.top-a.height/2}px)`;c.style.opacity='.9'},20+i*70);setTimeout(()=>c.remove(),700+i*70)}}
function floatOn(el,txt,cls){const f=document.createElement('div');f.className='float '+cls;f.textContent=txt;el.appendChild(f);setTimeout(()=>f.remove(),1700)}
function bubble(el,t){const b=document.createElement('div');b.className='bubble';b.textContent=t;el.appendChild(b);setTimeout(()=>b.remove(),1500)}

/* ================= summary ================= */
function summaryTable(v){const g=v.game;const rows=g.order.map(pid=>{const s=g.seats[pid];return `<tr class="${pid===ME.pid?'mine':''}"><td>${esc(PN(pid))} <span class="small">${s.bet}</span></td>${s.r.map(x=>`<td class="${x>0?'pos':x<0?'neg':'zero'}">${x}</td>`).join('')}<td><b>${sgn(s.r.reduce((a,b)=>a+b,0)*s.bet)}</b></td></tr>`}).join('');
 return `<table class="t" style="margin-top:6px"><tr><th>Seat</th><th>HC</th><th>Bac</th><th>SKP</th><th>Niu</th><th>Cmb</th><th>±</th></tr>${rows}<tr class="${v.banker===ME.pid?'mine':''}"><td><b>${esc(PN(v.banker))} (Banker)</b></td><td colspan="5"></td><td><b>${sgn(delta(v.banker))}</b></td></tr></table>`}
window.showSummary=()=>{const v=V;if(!v.game)return;const d=delta(ME.pid);
 $('sheetIn').innerHTML=`<h2>${d>0?'You win!':d<0?'Tough game':'Break even'}</h2><div class="big ${d>0?'pos':d<0?'neg':''}">${sgn(d)}</div>${summaryTable(v)}
 <div class="small" style="text-align:center;margin:10px 0">Your chips ${fmtc(v.players.find(p=>p.pid===ME.pid).chips)}</div><button class="gold" style="width:100%" onclick="$('sheet').classList.remove('on');renderRoom(true)">Back to room</button>`;
 $('sheet').classList.add('on');snd(d>0?'big':d<0?'lose':'chip')};

/* ================= toggles & boot ================= */
$('hintBtn').onclick=()=>{hints=!hints;localStorage.setItem('ct.hints',hints?'1':'0');toast(hints?'💡 Hints on':'Hints off');renderTable()};
$('muteBtn').onclick=()=>{mute=!mute;localStorage.setItem('ct.mute',mute?'1':'0');$('muteBtn').textContent=mute?'🔇':'🔊'};
if(ME){if(qs.get('room')&&qs.get('room').toUpperCase()!==ME.code){/* invited elsewhere */ME=null;saveMe()}else{subscribe();refresh()}}
