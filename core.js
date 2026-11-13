
/* ---------- cards ---------- */
const RN=['A','2','3','4','5','6','7','8','9','10','J','Q','K'],SY=['♦','♣','♥','♠'];
const rk=c=>c>>2, st=c=>c&3;
function cardHTML(c,opts={}){if(c==null)return '';if(opts.back)return '<div class="cd back"></div>';const red=(st(c)==0||st(c)==2);return `<div class="cd ${red?'r':''} ${opts.dim?'dim':''}">${RN[rk(c)]}<small>${SY[st(c)]}</small></div>`}
function shuffle(){const d=[...Array(52).keys()];for(let i=51;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]]}return d}
const cmpArr=(a,b)=>{for(let i=0;i<Math.max(a.length,b.length);i++){const x=a[i]??-1,y=b[i]??-1;if(x!==y)return x>y?1:-1}return 0};

/* ---------- R1 High card: 2 low … A high, ♦<♣<♥<♠ ---------- */
const hcKey=c=>((rk(c)+12)%13)*4+st(c);

/* ---------- R2 Thai baccarat ---------- */
const bp=c=>rk(c)<=8?rk(c)+1:0;
function b2(cs){const p=(bp(cs[0])+bp(cs[1]))%10;const pair=rk(cs[0])==rk(cs[1]),fl=st(cs[0])==st(cs[1]);return{p,m:(pair||fl)?2:1,aw:0,pok:p>=8,lab:(p>=8?'Pok ':'')+p+' pts'+(pair?' · pair ×2':fl?' · flush ×2':'')}}
function b3(cs){const p=cs.reduce((a,c)=>a+bp(c),0)%10;const r=cs.map(rk).sort((a,b)=>a-b);const fl=cs.every(c=>st(c)==st(cs[0]));const tr=r[0]==r[2];const str=(r[1]==r[0]+1&&r[2]==r[1]+1)||(r[0]==0&&r[1]==11&&r[2]==12);const pic=r[0]>=10;
 let aw=0,name='';const chk=(c,v,n)=>{if(c&&v>aw){aw=v;name=n}};
 chk(str,3,'Straight');chk(pic,3,'3 Picture');chk(tr,5,'Trips');chk(str&&fl,5,'Straight flush');chk(pic&&str,5,'3 Picture straight');chk(pic&&fl,7,'3 Picture flush');
 return{p,m:fl?3:1,aw,pok:false,lab:aw?`${name} (auto ×${aw})`:p+' pts'+(fl?' · flush ×3':'')}}
const bEval=cs=>cs.length==3?b3(cs):b2(cs);
function bSettle(P,D){ // + = player wins
 if(P.pok||D.pok){if(P.pok&&D.pok)return P.p>D.p?P.m:D.p>P.p?-D.m:0;return P.pok?P.m:-D.m}
 if(P.aw||D.aw){if(P.aw>D.aw)return P.aw;if(D.aw>P.aw)return -D.aw;return 0}
 return P.p>D.p?P.m:D.p>P.p?-D.m:0}
// banker edge % [player up rank][banker up rank]
const OPEN=[[-2.3,-6.3,-6.8,-6.9,1.1,11.5,16.0,26.8,31.0,-1.3,15.3,18.4,13.9],[3.2,-1.5,-3.1,-0.9,5.5,14.6,19.7,28.6,34.1,2.3,18.9,22.0,17.5],[2.7,-0.04,-2.7,-1.4,5.3,15.2,18.2,28.2,33.6,1.5,18.3,21.5,16.9],[2.4,-1.2,-2.4,-2.9,5.3,14.9,20.2,29.1,33.8,2.2,19.3,22.6,17.9],[-5.3,-8.8,-10.7,-14.9,-2.3,9.4,14.9,23.5,29.4,-5.0,11.8,15.1,10.5],[-19.1,-22.8,-25.3,-27.6,-20.3,-5.9,4.0,13.3,18.0,-19.0,-2.2,1.1,-3.5],[-24.0,-27.8,-28.2,-30.4,-25.2,-15.6,-5.9,9.1,13.6,-24.1,-7.4,-4.1,-8.6],[-35.5,-36.7,-37.6,-38.6,-33.3,-23.9,-18.9,-5.0,5.5,-35.3,-22.2,-19.7,-23.2],[-33.8,-36.3,-37.4,-38.6,-31.8,-23.6,-18.6,-11.2,-1.0,-35.1,-21.7,-18.9,-22.6],[-1.8,-4.8,-6.1,-5.9,2.1,12.6,18.1,27.7,33.3,-0.9,15.7,18.8,14.3],[-18.5,-21.7,-23.0,-23.3,-14.8,-4.3,1.0,14.5,19.9,-17.5,-0.9,2.2,-2.3],[-21.7,-25.1,-26.4,-26.8,-18.2,-7.7,-2.6,11.8,17.1,-20.7,-4.1,-1.0,-5.5],[-17.1,-20.4,-21.7,-22.0,-13.6,-3.1,2.1,15.4,20.8,-16.2,0.4,3.5,-1.0]];
const openEdge=(pu,du)=>OPEN[rk(pu)][rk(du)];
function playerShouldDraw(cs){const p=b2(cs).p;if(p<=4)return true;if(p==5){const r=cs.map(rk).sort((a,b)=>a-b);return (r[0]==1&&r[1]==2)||(r[0]==6&&r[1]==7)}return false}
function dealerShouldDraw(cs,group){ // group: 'stood' | 'drew'
 const p=b2(cs).p;if(p<=3)return true;if(p>=8)return false;
 const r=cs.map(rk).sort((a,b)=>a-b),su=st(cs[0])==st(cs[1]);const is=(a,b)=>r[0]==a&&r[1]==b;
 if(group=='stood'){if(p==4||p==5)return true;if(p==6)return is(6,8);return false}
 if(p==4)return (is(0,2)&&!su)||is(5,7);
 if(p==5)return (is(1,2)&&!su)||is(6,7);
 if(p==7)return (is(2,3)&&!su)||(is(7,8)&&!su);
 return false}

/* ---------- R3 Sikipi ---------- */
const hv=r=>r==0?14:r+1;
function skKey(a,b){const ra=rk(a),rb=rk(b);if(ra==rb)return[3,hv(ra),0];if((ra==1&&rb==7)||(ra==7&&rb==1))return[2,0,0];const p=(bp(a)+bp(b))%10;const k=[hv(ra),hv(rb)].sort((x,y)=>y-x);return[1,p,k[0]*20+k[1]]}
const skLabN=k=>skLab(k).replace(/ ×\d+/,'');const skLab=k=>k[0]==3?`Pair ${RN[(k[1]==14?0:k[1]-1)]}s ×5`:k[0]==2?'Gong (2+8) ×3':`${k[1]} pts${k[1]>=8?' ×2':''}`;
const skMult=k=>k[0]==3?5:k[0]==2?3:(k[1]>=8?2:1);
function skSplits(cs){const out=[];for(const j of[1,2,3]){const a=[cs[0],cs[j]],b=cs.filter((_,i)=>i!=0&&i!=j);const ka=skKey(...a),kb=skKey(...b);const hiA=cmpArr(ka,kb)>=0;out.push({hi:hiA?a:b,lo:hiA?b:a,kh:hiA?ka:kb,kl:hiA?kb:ka})}return out}
function skBestIdx(spl){let bi=0;spl.forEach((s,i)=>{const c=cmpArr(s.kl,spl[bi].kl);if(c>0||(c==0&&cmpArr(s.kh,spl[bi].kh)>0))bi=i});return bi}
const allPic=cs=>cs.every(c=>rk(c)>=10);
function skBestResp(p,D){let bi=skBestIdx(p.spl),bv=skSettle(p.hand,p.spl[bi],D.hand,D.spl[D.si]);
 p.spl.forEach((sp,i)=>{const v=skSettle(p.hand,sp,D.hand,D.spl[D.si]);if(v>bv){bv=v;bi=i}});return{i:bi,v:bv}}
function combos(arr,k){const out=[];const rec=(st,acc)=>{if(acc.length==k){out.push(acc.slice());return}for(let i=st;i<arr.length;i++){acc.push(arr[i]);rec(i+1,acc);acc.pop()}};rec(0,[]);return out}
function skEV(p,Dvis){const k=4-Dvis.length;const known=new Set([...p.hand,...Dvis]);const unk=[...Array(52).keys()].filter(c=>!known.has(c));
 const ev=[0,0,0];let n=0;for(const cb of combos(unk,k)){const Dh=[...Dvis,...cb];const sp=skSplits(Dh);const ds=sp[skBestIdx(sp)];p.spl.forEach((s,i)=>ev[i]+=skSettle(p.hand,s,Dh,ds));n++}
 return ev.map(v=>v/n)}
function skEVBest(ev,spl){let bi=skBestIdx(spl);ev.forEach((v,i)=>{if(v>ev[bi]+1e-9)bi=i});return bi}
function skBankerEV(D,P,M=300){const dset=new Set(D.hand);const ev=[0,0,0];
 const shown=P.filter(p=>p.shownB),hid=P.filter(p=>!p.shownB);
 for(const p of shown){const known=new Set([...D.hand,...p.vis]);const unk=[...Array(52).keys()].filter(c=>!known.has(c));const cbs=combos(unk,4-p.vis.length);
  for(const cb of cbs){const Ph=[...p.vis,...cb];const sp=skSplits(Ph);const ps=sp[skBestIdx(sp)];D.spl.forEach((ds,i)=>ev[i]-=p.bet*skSettle(Ph,ps,D.hand,ds)/cbs.length)}}
 const hb=hid.reduce((a,p)=>a+p.bet,0);
 if(hb>0){const unk=[...Array(52).keys()].filter(c=>!dset.has(c));for(let m=0;m<M;m++){for(let i=unk.length-1;i>unk.length-5;i--){const j=Math.floor(Math.random()*(i+1));[unk[i],unk[j]]=[unk[j],unk[i]]}
  const Ph=unk.slice(-4);const sp=skSplits(Ph);const ps=sp[skBestIdx(sp)];D.spl.forEach((ds,i)=>ev[i]-=hb*skSettle(Ph,ps,D.hand,ds)/M)}}
 return ev}
function skRespond(){const D=S.dealer;S.players.forEach(p=>{p.ev=skEV(p,D.vis);if(!p.me)p.si=skEVBest(p.ev,p.spl)})}
function skSettle(P,Ps,D,Ds){const pa=allPic(P),da=allPic(D);if(pa||da)return pa&&da?0:pa?7:-7;
 const h=cmpArr(Ps.kh,Ds.kh),l=cmpArr(Ps.kl,Ds.kl);if(h>0&&l>0)return skMult(Ps.kl);if(h<0&&l<0)return -skMult(Ds.kl);return 0}

/* ---------- R4 Niu Niu ---------- */
const nv=c=>Math.min(rk(c)+1,10);const nvals=c=>{const v=nv(c);return(v==3||v==6)?[3,6]:[v]};
function niuAw(cs){const r=cs.map(rk).sort((a,b)=>a-b);const cnt={};r.forEach(x=>cnt[x]=(cnt[x]||0)+1);const c=Object.values(cnt).sort((a,b)=>b-a);
 const fl=cs.every(x=>st(x)==st(cs[0]));const roy=r.join()=='0,9,10,11,12';const str=r.every((x,i)=>i==0||x==r[i-1]+1)||roy;
 let m=0,n='';const k=(cond,v,name)=>{if(cond&&v>m){m=v;n=name}};
 k(c[0]>=3,3,'Triple');k(str,5,'Straight');k(fl,6,'Flush');k(c[0]==3&&c[1]==2,7,'Full house');k(c[0]==4,10,'Quads');k(str&&fl,roy?20:15,roy?'Royal flush':'Straight flush');
 k(cs.reduce((a,x)=>a+nv(x),0)<10,5,'5 cards <10');k(cs.every(x=>rk(x)>=10),7,'5 Picture');return{m,n}}
function niuKey(cs){let best=[0,0],grp=null;const idx=[0,1,2,3,4];
 for(let a=0;a<5;a++)for(let b=a+1;b<5;b++)for(let c=b+1;c<5;c++){const t=[cs[a],cs[b],cs[c]];let ok=false;for(const x of nvals(t[0]))for(const y of nvals(t[1]))for(const z of nvals(t[2]))if((x+y+z)%10==0)ok=true;if(!ok)continue;
  const two=idx.filter(i=>i!=a&&i!=b&&i!=c).map(i=>cs[i]);let k;
  if(rk(two[0])==rk(two[1]))k=[11,hv(rk(two[0]))];else{let s=0;for(const x of nvals(two[0]))for(const y of nvals(two[1]))s=Math.max(s,((x+y)%10)||10);k=[s,0]}
  if(cmpArr(k,best)>0){best=k;grp={three:t,two}}}
 return{k:best,grp}}
const niuMult=k=>k[0]==11?4:k[0]>=9?3:k[0]>=7?2:1;
const niuLab=k=>k[0]==0?'No Niu':k[0]==11?`Pair ×4`:k[0]==10?'Niu Niu ×3':`Niu ${k[0]}${k[0]==9?' ×3':k[0]>=7?' ×2':''}`;
function niuSettle(Pa,Pk,Da,Dk){if(Pa.m||Da.m)return Pa.m>Da.m?Pa.m:Da.m>Pa.m?-Da.m:0;if(Pk[0]==0&&Dk[0]==0)return 0;const c=cmpArr(Pk,Dk);return c>0?niuMult(Pk):c<0?-niuMult(Dk):0}

/* ---------- R5 Combo poker ---------- */
function p5(cs){const r=cs.map(c=>hv(rk(c))).sort((a,b)=>b-a);const cnt={};r.forEach(x=>cnt[x]=(cnt[x]||0)+1);
 const g=Object.entries(cnt).map(([k,v])=>[+k,v]).sort((a,b)=>b[1]-a[1]||b[0]-a[0]);const fl=cs.every(c=>st(c)==st(cs[0]));
 const u=[...new Set(r)];let s=null;if(u.length==5){if(u[0]-u[4]==4)s=u[0];else if(u.join()=='14,5,4,3,2')s=5}
 const sh=g.map(x=>x[1]),rs=g.map(x=>x[0]);
 if(s&&fl)return[8,s];if(sh[0]==4)return[7,...rs];if(sh[0]==3&&sh[1]==2)return[6,...rs];if(fl)return[5,...r];if(s)return[4,s];if(sh[0]==3)return[3,...rs];if(sh[0]==2&&sh[1]==2)return[2,...rs];if(sh[0]==2)return[1,...rs];return[0,...r]}
function best7(cs){let b=null;for(let a=0;a<7;a++)for(let c=a+1;c<7;c++){const h=cs.filter((_,i)=>i!=a&&i!=c);const k=p5(h);if(!b||cmpArr(k,b)>0)b=k}return b}
const CN=['High card','Pair','Two pair','Trips','Straight','Flush','Full house','Quads','Straight flush'];
const cMult=k=>k[0]==1?1:k[0]==2?2:k[0]==3?3:k[0]>=4?5:0;
const cLab=k=>CN[k[0]]+(k[0]>=1?` ×${cMult(k)}`:' (no pay)');
function cSettle(Pk,Dk){if(Pk[0]==0&&Dk[0]==0)return 0;const c=cmpArr(Pk,Dk);return c>0?cMult(Pk):c<0?-cMult(Dk):0}

