const FN='https://zdikuwkuvnonlytaaera.supabase.co/functions/v1/game',KEY='sb_publishable_6z-CgA9sueQZ-mmN-nnG2w_5Xv2jOlp';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('push',e=>{e.waitUntil((async()=>{let m={title:'Combo Table',body:'Your table needs you',url:'/'};
 try{const sub=await self.registration.pushManager.getSubscription();const r=await fetch(FN,{method:'POST',headers:{'Content-Type':'application/json',apikey:KEY},body:JSON.stringify({a:'pushmsg',ep:sub&&sub.endpoint})});const j=await r.json();if(j&&j.title)m=j}catch(x){}
 await self.registration.showNotification(m.title,{body:m.body,icon:'/icon-192.png',badge:'/icon-192.png',data:{url:m.url||'/'},tag:'combo-table',renotify:true})})())});
self.addEventListener('notificationclick',e=>{e.notification.close();const url=(e.notification.data&&e.notification.data.url)||'/';
 e.waitUntil((async()=>{const cs=await clients.matchAll({type:'window',includeUncontrolled:true});for(const c of cs){try{await c.navigate(url)}catch(x){}if('focus' in c)return c.focus()}return clients.openWindow(url)})())});
