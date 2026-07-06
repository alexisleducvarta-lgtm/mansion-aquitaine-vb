// Service worker Mansion Aquitaine — cache léger du shell
var CACHE='mansion-v1';
self.addEventListener('install',function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(['./index.html']);}).catch(function(){}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));}));
  self.clients.claim();
});
self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET')return;
  var url=new URL(e.request.url);
  // Réseau d'abord (données Firebase toujours fraîches), cache en secours pour le shell
  if(url.origin===location.origin){
    e.respondWith(fetch(e.request).then(function(r){
      var copy=r.clone();caches.open(CACHE).then(function(c){c.put(e.request,copy);});return r;
    }).catch(function(){return caches.match(e.request);}));
  }
});
