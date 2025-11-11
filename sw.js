const VERSION='1.0.0';
const CACHE=`bike-manager-v${VERSION}`;
const ASSETS=['./','./index.html','./manifest.webmanifest'];

self.addEventListener('install',e=>{
self.skipWaiting();
e.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS).catch(err=>console.warn('Cache:',err))));
});

self.addEventListener('activate',e=>{
e.waitUntil((async()=>{
const keys=await caches.keys();
await Promise.all(keys.map(k=>k!==CACHE?caches.delete(k):Promise.resolve()));
await self.clients.claim();
})());
});

self.addEventListener('fetch',e=>{
if(e.request.method!=='GET')return;
const url=new URL(e.request.url);
const isNav=e.request.mode==='navigate';
const isSameOrigin=url.origin===self.location.origin;
if(!isSameOrigin)return e.respondWith(fetch(e.request));
e.respondWith((async()=>{
if(isNav||url.pathname.endsWith('index.html')||url.pathname==='/'){
try{
const res=await fetch(e.request,{cache:'no-cache'});
if(res.ok){
const cache=await caches.open(CACHE);
cache.put(e.request,res.clone());
return res;
}
}catch(err){}
return(await caches.match('./index.html'))||Response.error();
}
const cached=await caches.match(e.request);
if(cached)return cached;
try{
const res=await fetch(e.request);
if(res.ok){
const cache=await caches.open(CACHE);
cache.put(e.request,res.clone());
}
return res;
}catch(err){
return Response.error();
}
})());
});

self.addEventListener('message',e=>{
if(e.data==='SKIP_WAITING')self.skipWaiting();
if(e.data==='CHECK_UPDATE'){
caches.open(CACHE).then(()=>e.ports[0].postMessage({version:VERSION}));
}
});
