/* Controller wiring for Helene's Treasure Chest Vol 2 (uses the shared gamepad.js v1.1).
   Board: stick/D-pad moves the gold box, A picks then A on a neighbour swaps, B lets go, X hint, Start pause, Select sound.
   Menus/cards/map: D-pad moves the highlight, A selects, B goes back. */
(function(){
 var dir=null,next=0,H=window.__HTC;
 function D(d){return function(p){if(p){dir=d;step(d);next=performance.now()+330}else if(dir===d)dir=null}}
 function step(d){if(H.state!=='play'||document.getElementById('ov').classList.contains('on'))return;var m={l:[0,-1],r:[0,1],u:[-1,0],d:[1,0]}[d];moveCursor(m[0],m[1])}
 GamepadSupport.init({
  keys:{left:D('l'),right:D('r'),up:D('u'),down:D('d'),
   a:function(p){if(p&&H.state==='play'&&!cardOpen())padPick()},
   b:function(p){if(!p||H.state!=='play')return;if(H.armed)disarm();else{sel=null;dirty=true;kick()}},
   x:function(p){if(p&&H.state==='play')document.getElementById('tHint').click()},
   y:function(p){if(p&&H.state==='play')document.getElementById('tHint').click()},
   start:function(p){if(!p)return;if(H.state==='play')pause();else if(H.state==='pause')resume()},
   back:function(p){if(p)toggleMute()}},
  ignoreSel:'#dock,#toast,#bubble,#banner',
  menu:function(){return !!document.querySelector('#palbOv.on')||cardOpen()||H.state!=='play'},
  isPaused:function(){return H.state==='pause'},
  pause:function(){if(H.state==='play')pause()},
  back:function(){if(document.querySelector('#palbOv.on'))return false;if(cardOpen()&&cardBack){cardBack();return true}if(H.state==='map'){goTitle();return true}return false},
  onFrame:function(r,mode){if(mode==='play'&&dir&&performance.now()>next){step(dir);next=performance.now()+140}},
  onMode:function(m){if(m==='play'){cursor.on=true;dirty=true;kick()}},
  hint:{text:'🎮 Controller ready: D-pad picks a button · A selects',style:'top:calc(8px + env(safe-area-inset-top));bottom:auto;font:700 17px/1.25 system-ui,sans-serif;padding:6px 14px',
   when:function(){var g=navigator.getGamepads?navigator.getGamepads():[];var any=false;for(var i=0;i<g.length;i++)if(g[i])any=true;return any&&H.state==='title'&&!cardOpen()}}
 });
})();
