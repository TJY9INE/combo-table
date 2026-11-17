/* push alerts helper (shared by table + league) */
window.PUSH=(function(){const VKEY='BOVcbWsxBpKCs6LVniW8bSaWUsP1Rnp12ZV1MKajLReQgKsTkb_bP0KWxmQJZtKJnwi33_l6yRf_WT-D4mnwLvw';
 const isIOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const standalone=window.matchMedia&&matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const supported=()=>'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
 const u8=s=>{s=s.replace(/-/g,'+').replace(/_/g,'/');const b=atob(s+'==='.slice((s.length+3)%4));return Uint8Array.from(b,c=>c.charCodeAt(0))};
 function state(){if(isIOS&&!standalone)return 'install';if(!supported())return 'unsupported';if(Notification.permission==='denied')return 'denied';if(Notification.permission==='granted'&&localStorage.getItem('ct.push')==='1')return 'on';return 'off'}
 async function enable(send){const st=state();if(st==='install'||st==='unsupported'||st==='denied')return st;
  const perm=await Notification.requestPermission();if(perm!=='granted')return 'denied';
  const reg=await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;
  let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:u8(VKEY)});
  await send(sub.toJSON());localStorage.setItem('ct.push','1');return 'on'}
 async function resync(send){try{if(state()!=='on')return;const reg=await navigator.serviceWorker.getRegistration();const sub=reg&&await reg.pushManager.getSubscription();if(sub)await send(sub.toJSON())}catch(e){}}
 function helpHTML(st){if(st==='install')return `<h2>🔔 Turn on alerts</h2><div style="text-align:left;font-size:14.5px;line-height:1.6">On iPhone, alerts only work from the home-screen app:<ol style="padding-left:20px"><li>Tap <b>Share</b> <span style="font-size:17px">⬆️</span> in Safari</li><li>Choose <b>Add to Home Screen</b></li><li>Open <b>Combo Table</b> from your home screen</li><li>Tap <b>🔔 Alerts</b> again and allow</li></ol></div>`;
  if(st==='denied')return `<h2>🔔 Alerts are blocked</h2><div style="font-size:14px">Allow notifications for this site in your phone's Settings, then try again.</div>`;
  return `<h2>🔔 Alerts not supported</h2><div style="font-size:14px">This browser can't receive alerts. Try Chrome on Android or the home-screen app on iPhone.</div>`}
 return {state,enable,resync,helpHTML}})();
