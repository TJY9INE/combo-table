/* Combo Table shared FX: squeeze-peel, juice effects, rules sheet */
(function(){
const FX=window.FX={};
const css=`
.fxlayer{position:fixed;inset:0;pointer-events:none;z-index:120;overflow:hidden}
.conf{position:absolute;width:8px;height:12px;border-radius:2px;will-change:transform,opacity}
.shake{animation:fxshake .45s cubic-bezier(.36,.07,.19,.97) both}
@keyframes fxshake{10%,90%{transform:translate3d(-2px,0,0)}20%,80%{transform:translate3d(4px,0,0)}30%,50%,70%{transform:translate3d(-7px,2px,0)}40%,60%{transform:translate3d(7px,-2px,0)}}
.fxflash{position:fixed;inset:0;pointer-events:none;z-index:119;animation:fxfl .6s ease both}
@keyframes fxfl{0%{opacity:.55}100%{opacity:0}}
.bigtxt{position:fixed;left:50%;top:38%;transform:translate(-50%,-50%);z-index:121;font-family:Georgia,serif;font-style:italic;font-weight:900;font-size:44px;color:#ffd76a;text-shadow:0 3px 0 #6b4b1c,0 0 24px #ffb300;pointer-events:none;animation:fxbig 1.6s cubic-bezier(.2,1.4,.4,1) both;white-space:nowrap}
.bigtxt small{display:block;text-align:center;font-size:20px;font-style:normal;font-family:-apple-system,sans-serif;color:#fff;text-shadow:0 2px 6px #000}
.bigtxt.lose{color:#ff8a80;text-shadow:0 3px 0 #5a1d1d,0 0 20px #ff5252}
@keyframes fxbig{0%{transform:translate(-50%,-50%) scale(.2) rotate(-8deg);opacity:0}20%{transform:translate(-50%,-50%) scale(1.15) rotate(2deg);opacity:1}35%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{transform:translate(-50%,-70%) scale(1);opacity:0}}
/* squeeze peel */
.cd.sq{transform:none!important;transition:none!important}
.cd.sq .fc{transform:none!important;z-index:1}
.cd.sq .bc{z-index:2;clip-path:polygon(0 0,100% 0,100% var(--py,100%),var(--px,100%) 100%,0 100%);transition:none}
.cd.sq::after{content:"";position:absolute;inset:0;z-index:3;border-radius:inherit;pointer-events:none;background:linear-gradient(135deg,transparent calc(var(--fold,100%) - 6%),rgba(0,0,0,.35) var(--fold,100%),rgba(255,255,255,.55) calc(var(--fold,100%) + 1%),transparent calc(var(--fold,100%) + 6%))}
.cd.sqhint .bc{animation:sqwig 1.6s ease-in-out infinite}
@keyframes sqwig{0%,70%,100%{clip-path:polygon(0 0,100% 0,100% 100%,100% 100%,0 100%)}80%{clip-path:polygon(0 0,100% 0,100% 82%,82% 100%,0 100%)}}
.peeltip{position:absolute;left:50%;bottom:-20px;transform:translateX(-50%);font-size:11px;color:#9fd3ff;white-space:nowrap;pointer-events:none}
/* rules sheet */
.rules{position:fixed;inset:0;background:#000b;z-index:130;display:flex;align-items:flex-end;justify-content:center}
.rules .rin{background:#151a17;border-top:2px solid #b8892c;border-radius:20px 20px 0 0;width:100%;max-width:480px;max-height:90vh;overflow:auto;padding:16px 16px calc(20px + env(safe-area-inset-bottom));color:#eef;animation:up .3s ease both}
.rules h2{font-family:Georgia,serif;font-style:italic;color:#e9c46a;margin:0 0 6px;font-size:26px}
.rules h3{color:#e9c46a;margin:14px 0 4px;font-size:16px}
.rules p,.rules li{font-size:13.5px;line-height:1.45;color:#dfe9e3}
.rules ul{margin:4px 0;padding-left:18px}
.rules table{width:100%;border-collapse:collapse;font-size:13px;margin:4px 0}
.rules td{padding:4px 2px;border-bottom:1px solid #2b2418}.rules td:last-child{text-align:right;color:#e9c46a;font-weight:800}
.rules .x{position:sticky;top:0;float:right;background:#26302b;color:#fff;border:0;border-radius:10px;padding:6px 12px;font-size:14px}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
let layer=null;const L=()=>{if(!layer){layer=document.createElement('div');layer.className='fxlayer';document.body.appendChild(layer)}return layer};
FX.confetti=(x,y,n=60)=>{const l=L(),cols=['#ffd76a','#e74c3c','#2ecc71','#3b82f6','#fff','#f39c12'];
 for(let i=0;i<n;i++){const c=document.createElement('div');c.className='conf';c.style.left=x+'px';c.style.top=y+'px';c.style.background=cols[i%cols.length];l.appendChild(c);
  const a=Math.random()*Math.PI*2,v=6+Math.random()*9,vx=Math.cos(a)*v,vy=Math.sin(a)*v-9,r=Math.random()*720;
  c.animate([{transform:'translate(0,0) rotate(0)',opacity:1},{transform:`translate(${vx*22}px,${vy*14+260}px) rotate(${r}deg)`,opacity:0}],{duration:1300+Math.random()*700,easing:'cubic-bezier(.2,.6,.4,1)'}).onfinish=()=>c.remove()}};
FX.shake=(el=document.body)=>{el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake');setTimeout(()=>el.classList.remove('shake'),500)};
FX.flash=(color='#ffd76a')=>{const f=document.createElement('div');f.className='fxflash';f.style.background=color;document.body.appendChild(f);setTimeout(()=>f.remove(),650)};
FX.big=(txt,sub,lose)=>{const d=document.createElement('div');d.className='bigtxt'+(lose?' lose':'');d.innerHTML=txt+(sub?`<small>${sub}</small>`:'');document.body.appendChild(d);setTimeout(()=>d.remove(),1650)};
FX.vibe=p=>{try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};
/* sounds (use host's AudioContext helpers if available) */
FX.tick=(f)=>{try{const a=(window.ac&&window.ac())||null;if(!a||window._fxMute&&window._fxMute())return;const o=a.createOscillator(),g=a.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(.04,a.currentTime);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+.05);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+.06)}catch(e){}};
FX.drum=(ms=900)=>{try{const a=(window.ac&&window.ac())||null;if(!a||window._fxMute&&window._fxMute())return;const n=Math.floor(ms/45);for(let i=0;i<n;i++){const t=a.currentTime+i*0.045,b=a.createBuffer(1,800,a.sampleRate),ch=b.getChannelData(0);for(let k=0;k<800;k++)ch[k]=(Math.random()*2-1)*(1-k/800);const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();f.type='lowpass';f.frequency.value=420;g.gain.value=.05+.25*(i/n);s.buffer=b;s.connect(f);f.connect(g);g.connect(a.destination);s.start(t)}}catch(e){}};
FX.celebrate=(m,amt,anchor)=>{const r=(anchor||document.body).getBoundingClientRect();const x=r.left+r.width/2,y=r.top+r.height/3;
 if(m>=5){FX.big(m>=7?'MASSIVE!':'BIG WIN!',`+${m}× ${amt||''}`);FX.confetti(x,y,90);FX.shake();FX.flash('#ffd76a');FX.vibe([60,40,120])}
 else if(m>=3){FX.big('NICE!',`+${m}×`);FX.confetti(x,y,50);FX.vibe(60)}
 else if(m<=-5){FX.big('OUCH',`${m}×`,true);FX.flash('#ff5252');FX.shake();FX.vibe([30,30,30])}};
/* squeeze-to-peel a face-down card. slot = element containing .cd(.bc,.fc). onReveal called once. */
FX.squeeze=(slot,onReveal)=>{const cd=slot.querySelector('.cd');if(!cd||slot._sq)return;slot._sq=1;cd.classList.add('sqhint');
 let sy=null,sx=0,p=0,done=false,lastTick=0;const tip={remove(){}};
 const set=v=>{p=Math.max(0,Math.min(100,v));const q=100-p;cd.style.setProperty('--py',q+'%');cd.style.setProperty('--px',q+'%');cd.style.setProperty('--fold',(100-p*0.5)+'%');if(p-lastTick>8){lastTick=p;FX.tick(300+p*6);FX.vibe(5)}};
 const finish=()=>{if(done)return;done=true;tip.remove();cd.classList.remove('sqhint');
  const end=()=>{cd.classList.remove('sq');cd.style.transition='none';cd.classList.add('up');cd.classList.remove('tap');void cd.offsetWidth;cd.style.transition='';onReveal&&onReveal()};
  if(cd.classList.contains('sq')){const st0=p;const t0=performance.now();const step=t=>{const k=Math.min(1,(t-t0)/180);set(st0+(130-st0)*k);if(k<1)requestAnimationFrame(step);else end()};requestAnimationFrame(step)}
  else{cd.classList.add('up');cd.classList.remove('tap');onReveal&&onReveal()}};
 slot.addEventListener('pointerdown',e=>{if(done)return;sy=e.clientY;sx=e.clientX;slot.setPointerCapture&&slot.setPointerCapture(e.pointerId);cd.classList.remove('sqhint');cd.classList.add('sq');set(0)});
 slot.addEventListener('pointermove',e=>{if(sy==null||done)return;const d=Math.max(sy-e.clientY,sx-e.clientX,(sy-e.clientY+sx-e.clientX)/1.4);set(d/1.1)});
 const up=()=>{if(sy==null||done)return;const moved=p;sy=null;if(moved<4){cd.classList.remove('sq');finish();return}if(moved>=55)finish();else{cd.classList.remove('sq');set(0);cd.classList.add('sqhint')}};
 slot.addEventListener('pointerup',up);slot.addEventListener('pointercancel',up);
 slot._reveal=finish;return finish};
/* rules sheet */
FX.rules=(round)=>{const d=document.createElement('div');d.className='rules';d.innerHTML=`<div class="rin"><button class="x">✕ Close</button><h2>How to play</h2>
<p>One game = 5 rounds vs the banker. Your cards <b>carry over</b> from round to round. Multipliers × your bet are paid by whoever wins the round (banker or player). Ties push.</p>
<h3 id="r1">1 · High Card</h3><p>One card each. Higher rank wins (2 low → A high). Same rank: suit decides ♦ &lt; ♣ &lt; ♥ &lt; ♠. Pays 1×.</p>
<h3 id="r2">2 · Thai Baccarat</h3><ul><li>You get a 2nd card. Points = last digit (A=1, 10/J/Q/K=0).</li><li><b>8 or 9 on two cards = Pok</b> — shows and settles immediately.</li><li>Under 4 must draw; 4–7 choose to draw a 3rd card or stand.</li><li>Banker decides last: <b>OPEN</b> a player (settles now vs banker's 2 cards), <b>SKIP</b> (push), then draws/stands — everyone left settles vs banker's final hand.</li></ul>
<table><tr><td>Win on points</td><td>1×</td></tr><tr><td>Pair / 2-card flush</td><td>2×</td></tr><tr><td>3-card flush</td><td>3×</td></tr><tr><td>Auto-win: Straight or 3 Picture</td><td>3×</td></tr><tr><td>Auto-win: Trips, Straight flush, 3 Pic straight</td><td>5×</td></tr><tr><td>Auto-win: 3 Picture flush</td><td>7×</td></tr></table>
<h3 id="r3">3 · Sikipi</h3><ul><li>Top up to 4 cards. Split into <b>Bottom</b> (stronger) and <b>Top</b> two-card hands.</li><li>Rank: Pair (AA high) &gt; Gong (2+8) &gt; points 9…0. Same points → higher kicker wins (A&gt;K&gt;…&gt;2).</li><li>Win BOTH hands to win; win one = push. Multiplier from the winner's Bottom hand.</li></ul>
<table><tr><td>Points 0–7</td><td>1×</td></tr><tr><td>8 / 9</td><td>2×</td></tr><tr><td>Gong (2+8)</td><td>3×</td></tr><tr><td>Pair</td><td>5×</td></tr><tr><td>4 Pictures (auto-win)</td><td>7×</td></tr></table>
<h3 id="r4">4 · Niu Niu</h3><ul><li>+1 card (5 total). 3 cards must add to a multiple of 10 (J/Q/K=10, 3↔6 swap allowed). Last 2 cards give your score.</li><li>No Niu loses to any Niu; both No Niu = push.</li></ul>
<table><tr><td>Niu 1–6</td><td>1×</td></tr><tr><td>Niu 7 / 8</td><td>2×</td></tr><tr><td>Niu 9 / Niu Niu</td><td>3×</td></tr><tr><td>Pair (after Niu)</td><td>4×</td></tr><tr><td>Triple</td><td>3×</td></tr><tr><td>Straight · 5 cards &lt;10</td><td>5×</td></tr><tr><td>Flush</td><td>6×</td></tr><tr><td>Full house · 5 Picture</td><td>7×</td></tr><tr><td>Quads</td><td>10×</td></tr><tr><td>Straight flush / Royal</td><td>15× / 20×</td></tr></table>
<h3 id="r5">5 · Combo Poker</h3><p>2 community cards. Best 5 of your 5 + 2. Need at least a pair to be paid.</p>
<table><tr><td>Pair</td><td>1×</td></tr><tr><td>Two pair</td><td>2×</td></tr><tr><td>Trips</td><td>3×</td></tr><tr><td>Straight or better</td><td>5×</td></tr></table>
<p style="margin-top:12px">🔒 Cards are shuffled with a cryptographic random generator. Play chips only.</p></div>`;
 document.body.appendChild(d);d.onclick=e=>{if(e.target===d||e.target.classList.contains('x'))d.remove()};
 if(round){const t=d.querySelector('#r'+round);if(t)setTimeout(()=>t.scrollIntoView({block:'start'}),50)}};
})();
