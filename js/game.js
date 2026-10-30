/* Helene's Treasure Chest Vol 2: The Grand Journey. Original game code for Peter's Arcade. */
'use strict';
const $=id=>document.getElementById(id);
const Q=new URLSearchParams(location.search);
const SPEED=Math.max(1,Math.min(20,+Q.get('fast')||1));/* test hook: speeds up animations only */
const WORLDS=[
 {id:'rose',name:'Rose Garden',chest:'Rosie',fav:0,mapY:.86,intro:'Roses are blooming and jewels are hiding in every flower bed!'},
 {id:'sea',name:'Seashell Cove',chest:'Shelly',fav:1,mapY:.69,intro:'Waves are washing sparkly sapphires up onto the sand.'},
 {id:'orchard',name:'Apple Orchard',chest:'Pippin',fav:2,mapY:.53,intro:'Emeralds are tucked in among the apple leaves.'},
 {id:'snow',name:'Snowy Village',chest:'Flurry',fav:5,mapY:.40,intro:'Snowflakes are falling and pearls are glowing in the windows.'},
 {id:'lagoon',name:'Moonlit Lagoon',chest:'Luna',fav:4,mapY:.27,intro:'Fireflies are lighting the way to the amethysts.'},
 {id:'palace',name:'Golden Palace',chest:'King Goldie',fav:3,mapY:.12,intro:'The last chest waits in the grand golden hall!'}];
const CNAME=['Ruby Hearts','Sapphires','Emeralds','Topaz','Amethysts','Pearls'];
const LPW=5;/* 4 levels + a challenge chest per world */
function levelDef(w,l){const i=w*LPW+l;
 if(l===LPW-1)return{type:'chest',moves:30,hp:60+w*12,fav:WORLDS[w].fav};
 if(l%2===0)return{type:'score',moves:26,target:Math.round((800+i*28)/50)*50};
 const a=(w*2+l)%6,b=(a+3)%6,n=10+w;return{type:'collect',moves:26,need:[[a,n],[b,n]]}}
/* ---- save ---- */
const SK='htc2_save';
let SV;try{SV=JSON.parse(localStorage.getItem(SK))||{}}catch(e){SV={}}
SV=Object.assign({stars:{},best:{},boost:{h:3,s:3,r:2},music:1,sound:1,saver:1,seen:{},rushBest:0,zenBest:0,total:0},SV);
function persist(){try{localStorage.setItem(SK,JSON.stringify(SV))}catch(e){}}
const lkey=(w,l)=>w+'-'+l;
function unlocked(w,l){if(w===0&&l===0)return true;if(l>0)return SV.stars[lkey(w,l-1)]>0;return SV.stars[lkey(w-1,LPW-1)]>0}
function nextLevel(){for(let w=0;w<WORLDS.length;w++)for(let l=0;l<LPW;l++)if(!SV.stars[lkey(w,l)])return[w,l];return null}
function totalStars(){return Object.values(SV.stars).reduce((a,b)=>a+b,0)}
function journeyTotal(){return Object.values(SV.best).reduce((a,b)=>a+b,0)}
/* ---- settings / perf ---- */
const LOWEND=(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=3;
let PCAP=60,PR=1.5;
function applySaver(){const s=!!SV.saver;PCAP=s?24:(LOWEND?40:70);PR=Math.min(window.devicePixelRatio||1,s?1.5:2);document.body.classList.toggle('drift',!s);layout(true)}
/* ---- state ---- */
let GEN=0;/* bumps whenever a game starts or is left, so moves still animating from an old game stop quietly */
let state='title',G=null,B=null,busy=false,sel=null,hint=null,cursor={r:3,c:3,on:false},armed=null,lastAct=0,hintSaid=0;
const FPS=30,FRAME=1000/FPS;
/* ---- art (lazy per world) ---- */
const IMG={};
function img(src){if(IMG[src])return IMG[src];const p=new Promise(res=>{const i=new Image();i.decoding='async';i.onload=()=>res(i);i.onerror=()=>res(null);i.src=src});IMG[src]=p;return p}
let gemsImg=null,gemSpr=null,gemSprSize=0;img('art/gems.webp').then(i=>{gemsImg=i;gemSpr=null;dirty=true;kick()});
let curBg='';
function setBg(id){const src=id?'art/bg_'+id+'.webp':'';if(src===curBg)return;curBg=src;const el=$('bg');el.classList.remove('on');if(!src){el.style.backgroundImage='';return}
 img(src).then(i=>{if(curBg!==src||!i)return;el.style.backgroundImage='url('+src+')';el.classList.add('on')})}
/* ---- canvas + layout ---- */
const cv=$('cv'),cx=cv.getContext('2d');
let BS=320,CELL=40,W=0,H=0,LAND=false,boardBg=null;
function layout(force){const w=innerWidth,h=innerHeight;if(!force&&w===W&&h===H)return;W=w;H=h;LAND=w>h*1.1;
 const hud=$('hud'),tools=$('tools'),chest=$('chestBox'),wrap=$('wrap'),isChest=G&&G.def&&G.def.type==='chest',m=8,safeT=8;
 if(!LAND){const hudH=56+6+58+6+42,chestH=isChest?96:0,toolsH=G&&G.mode==='rush'?0:62;
  const avail=h-safeT-hudH-(chestH?chestH+8:0)-(toolsH?toolsH+10:0)-24;BS=Math.floor(Math.max(200,Math.min(w-2*m-10,avail,560)));
  const total=hudH+(chestH?chestH+8:0)+BS+10+(toolsH?toolsH+10:0)+8,top=Math.max(safeT,Math.floor((h-total)/2));const cw=Math.min(w-2*m,BS+10+40);
  Object.assign(hud.style,{left:((w-cw)/2)+'px',top:top+'px',width:cw+'px'});let y=top+hudH+8;
  Object.assign(chest.style,{left:((w-cw)/2)+'px',top:y+'px',width:cw+'px',height:'88px'});if(chestH)y+=chestH;
  Object.assign(wrap.style,{left:((w-BS-10)/2)+'px',top:y+'px'});y+=BS+10+10;
  Object.assign(tools.style,{left:((w-cw)/2)+'px',top:y+'px',width:cw+'px',gridTemplateColumns:'1.3fr 1fr 1fr 1fr',display:toolsH?'grid':'none'});$('chestImg').style.width=$('chestImg').style.height='84px'}
 else{BS=Math.floor(Math.max(200,Math.min(h-20,w*.55,560)));const pw=Math.min(380,w-BS-10-36),x0=Math.floor((w-(BS+10+16+pw))/2),top=Math.floor((h-BS-10)/2);
  Object.assign(wrap.style,{left:x0+'px',top:top+'px'});const px=x0+BS+10+16;
  Object.assign(hud.style,{left:px+'px',top:Math.max(6,top)+'px',width:pw+'px'});let y=Math.max(6,top)+56+6+58+6+42+8;
  Object.assign(chest.style,{left:px+'px',top:y+'px',width:pw+'px',height:'72px'});$('chestImg').style.width=$('chestImg').style.height='64px';if(isChest)y+=80;
  Object.assign(tools.style,{left:px+'px',top:y+'px',width:pw+'px',gridTemplateColumns:'1fr 1fr',display:G&&G.mode==='rush'?'none':'grid'})}
 CELL=BS/N;cv.style.width=cv.style.height=BS+'px';cv.width=cv.height=Math.round(BS*PR);gemSpr=null;boardBg=null;dirty=true;
 const at=$('armTip');Object.assign(at.style,{left:tools.style.left,top:tools.style.top,width:tools.style.width,transform:'none',justifyContent:'center'});kick()}
addEventListener('resize',()=>{layout();if(state==='map')placeMap()});
/* pre-render the 8 gem sprites at the exact board size (one cheap drawImage per gem) */
function buildSprites(){if(!gemsImg)return;const s=Math.round(CELL*PR*.92);if(gemSpr&&gemSprSize===s)return;gemSprSize=s;
 const c=document.createElement('canvas');c.width=s*8;c.height=s;const g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(gemsImg,0,0,s*8,s);gemSpr=c}
function buildBoardBg(){const s=cv.width,c=document.createElement('canvas');c.width=c.height=s;const g=c.getContext('2d'),cs=s/N;
 for(let r=0;r<N;r++)for(let k=0;k<N;k++){g.fillStyle=(r+k)%2?'rgba(255,255,255,.06)':'rgba(255,255,255,.13)';g.fillRect(k*cs+1,r*cs+1,cs-2,cs-2)}boardBg=c}
let SPK=null;function sparkSprite(){const c=document.createElement('canvas');c.width=c.height=32;const g=c.getContext('2d');const gr=g.createRadialGradient(16,16,0,16,16,16);
 gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.25,'rgba(255,240,170,.9)');gr.addColorStop(1,'rgba(255,200,80,0)');g.fillStyle=gr;g.fillRect(0,0,32,32);
 g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=2;g.beginPath();g.moveTo(16,1);g.lineTo(16,31);g.moveTo(1,16);g.lineTo(31,16);g.stroke();SPK=c}
sparkSprite();
/* ---- tweens / particles (all time-based on the 30 fps loop so they pause when hidden) ---- */
let tws=[],parts=[],fxs=[],texts=[],dying=[],clock=0,dirty=true,running=false,lastTs=0,frames=0,fpsT=0,fps=0;
const ease={lin:t=>t,out:t=>1-(1-t)*(1-t),back:t=>{const c=1.7;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2)},inq:t=>t*t};
function tween(o,props,d,e){d=d/SPEED;return new Promise(res=>{const from={};for(const k in props)from[k]=o[k];tws.push({o,from,to:props,t:0,d:Math.max(1,d),e:ease[e||'out'],res});kick()})}
function wait(ms){return tween({v:0},{v:1},ms,'lin')}
function sparkle(x,y,n,col){if(parts.length>=PCAP)return;n=Math.min(n,PCAP-parts.length);
 for(let i=0;i<n;i++){const a=Math.random()*6.283,s=(40+Math.random()*120)*CELL/48;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-30,life:0,max:450+Math.random()*350,sz:(.25+Math.random()*.35)*CELL,col})}kick()}
function floatText(x,y,t,col,big){texts.push({x,y,t,col:col||'#fff3a0',life:0,max:900,big});kick()}
const GEMCOL=['#ff4d6d','#4d8bff','#3ddc84','#ffd23f','#b06bff','#f4f0ff'];
/* ---- frame loop: capped at 30 fps; stops completely when nothing moves ---- */
function kick(){if(running||document.hidden)return;running=true;lastTs=0;requestAnimationFrame(loop)}
function animating(){return tws.length||parts.length||fxs.length||texts.length||dying.length||(state==='play'&&(sel||hint||armed||(G&&G.mode==='rush'&&!G.over)))}
function loop(ts){if(document.hidden){running=false;return}
 if(lastTs&&ts-lastTs<FRAME-3){requestAnimationFrame(loop);return}
 const dt=lastTs?Math.min(ts-lastTs,100):FRAME;lastTs=ts;clock+=dt;update(dt);
 if(state==='play'&&(dirty||animating())){draw();frames++}dirty=false;
 fpsT+=dt;if(fpsT>=1000){fps=Math.round(frames*1000/fpsT);frames=0;fpsT=0}
 if(animating()||state==='play'&&G&&G.mode==='rush'&&!G.over)requestAnimationFrame(loop);else{running=false;fps=0}}
function update(dt){
 for(let i=tws.length-1;i>=0;i--){const w=tws[i];w.t+=dt;const p=Math.min(1,w.t/w.d),e=w.e(p);for(const k in w.to)w.o[k]=w.from[k]+(w.to[k]-w.from[k])*e;if(p>=1){tws.splice(i,1);w.res()}}
 const s=dt/1000;for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life+=dt;p.x+=p.vx*s;p.y+=p.vy*s;p.vy+=260*s;if(p.life>=p.max)parts.splice(i,1)}
 for(let i=fxs.length-1;i>=0;i--){fxs[i].life+=dt;if(fxs[i].life>=fxs[i].max)fxs.splice(i,1)}
 for(let i=texts.length-1;i>=0;i--){const t=texts[i];t.life+=dt;t.y-=dt*.03;if(t.life>=t.max)texts.splice(i,1)}
 if(state==='play'&&G&&G.mode==='rush'&&!G.over&&!busy0()){G.time-=dt;if(G.time<=10000&&Math.ceil(G.time/1000)!==G.lastTick){G.lastTick=Math.ceil(G.time/1000);AU.S.tick()}
  if(G.time<=0){G.time=0;rushEnd()}hudTime()}
}
function busy0(){return false}
/* idle check once a second (the draw loop sleeps when nothing moves) */
setInterval(()=>{if(state!=='play'||busy||armed||!G||G.over||document.hidden)return;const idle=performance.now()-lastAct;
 if(!hint&&idle>(G.mode==='rush'?5000:8000))showHint(false);
 if(G.mode!=='rush'&&hint&&idle>20000&&hintSaid<lastAct){hintSaid=performance.now();say(pick(['Psst… try the two glowing jewels!','Take your time, dear. Try the sparkly pair!','Those two glowing ones would match!']),3200)}},1000);
function draw(){buildSprites();if(!boardBg)buildBoardBg();const p=PR,c=CELL*p;cx.setTransform(1,0,0,1,0,0);cx.clearRect(0,0,cv.width,cv.height);cx.drawImage(boardBg,0,0);
 const t=clock/1000;
 if(sel){cx.fillStyle='rgba(255,230,120,.38)';cx.fillRect(sel.c*c+2,sel.r*c+2,c-4,c-4)}
 if(hint){const a=.25+.25*Math.sin(t*6);cx.fillStyle='rgba(120,255,200,'+a+')';for(const h of hint)cx.fillRect(h.c*c+2,h.r*c+2,c-4,c-4)}
 if(B)for(let r=0;r<N;r++)for(let k=0;k<N;k++){const g=B[r][k];if(g)drawGem(g,c,t)}
 for(const g of dying)drawGem(g,c,t);
 for(const f of fxs){const a=1-f.life/f.max;cx.globalAlpha=a;
  if(f.t==='h'){cx.fillStyle='#fff6c0';cx.fillRect(0,f.r*c+c*.3,cv.width,c*.4)}
  else if(f.t==='v'){cx.fillStyle='#fff6c0';cx.fillRect(f.c*c+c*.3,0,c*.4,cv.height)}
  else if(f.t==='b'){cx.strokeStyle='#ffd75e';cx.lineWidth=c*.25;cx.beginPath();cx.arc((f.c+.5)*c,(f.r+.5)*c,c*(f.R+.5)*(1.2-a*.5),0,6.283);cx.stroke()}
  else if(f.t==='x'){cx.strokeStyle='#fff';cx.lineWidth=c*.08;cx.beginPath();for(const k of f.cells.slice(0,24)){cx.moveTo((f.c+.5)*c,(f.r+.5)*c);cx.lineTo((KC(k)+.5)*c,(KR(k)+.5)*c)}cx.stroke()}}
 cx.globalAlpha=1;
 for(const q of parts){const a=1-q.life/q.max,s=q.sz*p*(0.6+a*.6);cx.globalAlpha=a;cx.drawImage(SPK,q.x*p-s/2,q.y*p-s/2,s,s)}cx.globalAlpha=1;
 for(const q of texts){const a=1-q.life/q.max;cx.globalAlpha=Math.min(1,a*2);cx.font='800 '+Math.round((q.big?34:24)*p)+'px system-ui,sans-serif';cx.textAlign='center';cx.lineWidth=5*p;cx.strokeStyle='rgba(40,8,50,.9)';cx.strokeText(q.t,q.x*p,q.y*p);cx.fillStyle=q.col;cx.fillText(q.t,q.x*p,q.y*p)}cx.globalAlpha=1;
 if(cursor.on&&state==='play'){cx.strokeStyle='#ffd400';cx.lineWidth=4*p;cx.strokeRect(cursor.c*c+3*p,cursor.r*c+3*p,c-6*p,c-6*p);cx.strokeStyle='rgba(0,0,0,.6)';cx.lineWidth=2*p;cx.strokeRect(cursor.c*c+7*p,cursor.r*c+7*p,c-14*p,c-14*p)}}
function drawGem(g,c,t){if(!gemSpr)return;const s=gemSprSize,sc=g.sc==null?1:g.sc;if(sc<=.01||g.al<=0.01)return;
 const x=(g.x+.5)*c,y=(g.y+.5)*c,d=s*sc;cx.globalAlpha=g.al==null?1:g.al;
 const idx=g.s==='x'?7:g.c;if(idx>=0)cx.drawImage(gemSpr,idx*s,0,s,s,x-d/2,y-d/2,d,d);
 if(g.s==='h'||g.s==='v'){cx.fillStyle='rgba(255,255,255,.92)';const L=c*.36,w=c*.09;for(const o of[-1,1]){if(g.s==='h')arrow(x+o*L*.15,y+o*c*.13,o,0,L,w);else arrow(x+o*c*.13,y+o*L*.15,0,o,L,w)}}
 else if(g.s==='b'){cx.strokeStyle='rgba(255,215,94,'+(.65+.35*Math.sin(t*5))+')';cx.lineWidth=c*.08;cx.beginPath();cx.arc(x,y,c*.44*sc,0,6.283);cx.stroke()}
 cx.globalAlpha=1}
function arrow(x,y,dx,dy,L,w){cx.beginPath();if(dx){cx.rect(x-L/2,y-w/2,L,w);cx.moveTo(x+dx*(L/2+w*1.6),y);cx.lineTo(x+dx*L/2,y-w*1.4);cx.lineTo(x+dx*L/2,y+w*1.4)}else{cx.rect(x-w/2,y-L/2,w,L);cx.moveTo(x,y+dy*(L/2+w*1.6));cx.lineTo(x-w*1.4,y+dy*L/2);cx.lineTo(x+w*1.4,y+dy*L/2)}cx.fill()}
/* ---- HUD ---- */
const fmt=n=>Math.round(n).toLocaleString();
function hud(){if(!G)return;$('sScore').textContent=fmt(G.score);
 if(G.mode==='journey'){$('sMovesL').textContent='Moves';$('sMoves').textContent=G.moves}else if(G.mode==='zen'){$('sMovesL').textContent='Best';$('sMoves').textContent=fmt(Math.max(SV.zenBest,G.score))}else hudTime();
 const d=G.def,gt=$('gTxt'),gf=$('gFill');
 if(G.mode==='rush'){gf.style.width=(100*G.time/G.T)+'%';gt.textContent='Match fast! Best '+fmt(SV.rushBest)}
 else if(G.mode==='zen'){gf.style.width='0';gt.textContent='Relax, no timer, no limits 🌸'}
 else if(d.type==='score'){const p=Math.min(100,Math.floor(100*G.score/d.target));gf.style.width=p+'%';gt.textContent='Fill the chest: '+p+'%'}
 else if(d.type==='collect'){gf.style.width='0';gt.innerHTML=d.need.map(([c,n],i)=>{const left=Math.max(0,n-G.got[i]);return'<span class="gc'+(left?'':' done')+'"><i class="gi" style="background-position:'+(c*100/7)+'% 0" aria-label="'+CNAME[c]+'"></i>'+(left?left+' left':'✓')+'</span>'}).join('')}
 else{gf.style.width='0';gt.textContent='Open '+WORLDS[G.w].chest+"'s chest!";const left=Math.max(0,d.hp-G.dmg);$('lockFill').style.width=(100*Math.min(1,G.dmg/d.hp))+'%';$('lockTxt').textContent=left?left+' sparkles to unlock':'Unlocked!'}
 updTools()}
function hudTime(){if(G&&G.mode==='rush'){$('sMovesL').textContent='Time';const s=Math.ceil(G.time/1000);$('sMoves').textContent=Math.floor(s/60)+':'+String(s%60).padStart(2,'0');$('gFill').style.width=(100*G.time/G.T)+'%'}}
function updTools(){const b=G&&G.mode==='zen'?{h:'∞',s:'∞',r:'∞'}:SV.boost;$('nHam').textContent=b.h;$('nShuf').textContent=b.s;$('nStar').textContent=b.r;
 const free=G&&G.mode==='zen';$('tHam').disabled=!free&&!SV.boost.h;$('tShuf').disabled=!free&&!SV.boost.s;$('tStar').disabled=!free&&!SV.boost.r;
 ['tHam','tStar'].forEach(id=>$(id).classList.toggle('armed',armed===(id==='tHam'?'h':'r')))}
/* ---- Helene's speech bubble ---- */
let bubT=0;function say(t,ms){const b=$('bubble'),f=$('face').getBoundingClientRect(),pz=$('pauseBtn').getBoundingClientRect();b.textContent=t;
 b.style.left=(f.right+6)+'px';b.style.top=(f.top-2)+'px';b.style.width=Math.max(160,pz.left-f.right-12)+'px';b.classList.add('on');clearTimeout(bubT);bubT=setTimeout(()=>b.classList.remove('on'),ms||2600)}
const pick=a=>a[Math.floor(Math.random()*a.length)];
let banT=0;function banner(t,ms){const b=$('banner');b.textContent=t;b.classList.remove('on');void b.offsetWidth;b.classList.add('on');clearTimeout(banT);banT=setTimeout(()=>b.classList.remove('on'),(ms||1400)/Math.min(SPEED,3))}
function toast(t){const e=$('toast');e.textContent=t;e.classList.add('on');setTimeout(()=>e.classList.remove('on'),2200)}
/* ---- screens ---- */
function show(id){['title','map','play'].forEach(s=>$(s).classList.toggle('on',s===id));$('dock').classList.toggle('on',id==='title');state=id==='play'?'play':id}
function goTitle(){GEN++;closeCard();show('title');G=null;setBg('');AU.play('title');playSub()}
/* ---- map ---- */
function placeMap(){const inner=$('mapIn'),land=innerWidth>innerHeight*1.1;document.body.classList.toggle('land',land);
 Object.assign(inner.style,land?{width:'100%',aspectRatio:'auto',backgroundImage:'none'}:{width:'',aspectRatio:'',backgroundImage:inner.dataset.bg||''});
 inner.querySelectorAll('.wbtn').forEach((b,i)=>{if(land){b.style.left=(18+32*(i%3))+'%';b.style.top=(i<3?40:76)+'%'}else{b.style.left='50%';b.style.top=(WORLDS[i].mapY*100)+'%'}})}
function goMap(focusW){GEN++;closeCard();show('map');setBg('');AU.play('title');const inner=$('mapIn');
 img('art/map.webp').then(i=>{if(i){inner.dataset.bg='url(art/map.webp)';$('map').style.backgroundImage='url(art/map.webp)';placeMap()}});
 inner.innerHTML='';const nx=nextLevel();
 WORLDS.forEach((w,i)=>{const open=unlocked(i,0),st=[0,1,2,3,4].reduce((a,l)=>a+(SV.stars[lkey(i,l)]||0),0);
  const b=document.createElement('button');b.type='button';b.className='wbtn'+(open?'':' lock')+(nx&&nx[0]===i?' cur':'');b.id='w'+i;
  b.innerHTML=(open?'':'🔒 ')+w.name+'<span>'+(open?'★ '+st+' / 15':'Locked')+'</span>';b.disabled=false;
  b.onclick=()=>{if(!open){AU.S.bump();toast('Open '+WORLDS[i-1].chest+"'s chest first!");return}worldCard(i)};inner.appendChild(b)});
 $('mapStars').textContent='★ '+totalStars();placeMap();
 if(focusW!=null)setTimeout(()=>worldCard(focusW),50)}
function worldCard(w){const W_=WORLDS[w];let h='<div class="pic" style="background-image:url(art/chest'+w+'.webp)"></div><h2>'+W_.name+'</h2><p>'+W_.intro+'</p><div class="lvls">';
 for(let l=0;l<LPW;l++){const ok=unlocked(w,l),s=SV.stars[lkey(w,l)]||0,ch=l===LPW-1;h+='<button type="button" class="lv'+(ch?' chest':'')+'" data-l="'+l+'"'+(ok?'':' disabled')+' aria-label="'+(ch?'Challenge chest':'Level '+(l+1))+'">'+(ch?'🎁':(ok?l+1:'🔒'))+'<small>'+(s?'★'.repeat(s):ch?'Chest':'')+'</small></button>'}
 h+='</div>';card(h,[{t:'⬅ Back to the map',cls:'dim',fn:()=>closeCard()}]);
 $('card').querySelectorAll('.lv').forEach(b=>b.onclick=()=>{if(b.disabled)return;startLevel(w,+b.dataset.l)});
 const nx=$('card').querySelector('.lv:not(:disabled):not(.done)');}
/* ---- cards ---- */
let cardBack=null;
function card(html,btns,opt){const c=$('card');c.classList.remove('ls');c.innerHTML='<div class="cbody">'+html+'</div>'+(btns&&btns.length?'<div class="btns'+(btns.length===2&&!(opt&&opt.stack)?' two':'')+(btns.length>=4?' many':'')+'"></div>':'');
 const bx=c.querySelector('.btns');(btns||[]).forEach((b,i)=>{const e=document.createElement('button');e.type='button';e.className='btn '+(b.cls||'')+(i===0?' primary':'');e.innerHTML=b.t;if(b.id)e.id=b.id;e.onclick=()=>{AU.S.sel();b.fn()};bx.appendChild(e)});const cb=c.querySelector('.cbody');if(cb)cb.scrollTop=0;
 cardBack=opt&&opt.back||(btns&&btns.length?btns[btns.length-1].fn:closeCard);$('ov').classList.add('on');c.scrollTop=0}
function closeCard(){$('ov').classList.remove('on')}
function cardOpen(){return $('ov').classList.contains('on')}
/* ---- game start ---- */
function newGame(mode,w,l){GEN++;closeCard();G={mode,w:w||0,l:l||0,score:0,moves:0,got:[0,0],dmg:0,extra:0,over:false,def:null,time:120000,T:120000,lastTick:0};
 if(mode==='journey'){G.def=levelDef(w,l);G.moves=G.def.moves}else G.def={type:mode};
 setNC(6);setSPC(mode==='rush'?0:.02);B=newBoard();
 sel=hint=armed=null;busy=true;lastAct=performance.now();cursor.r=cursor.c=3;show('play');
 const isChest=G.def.type==='chest';$('chestBox').classList.toggle('on',isChest);
 if(isChest){const src='art/chest'+w+'.webp';$('chestImg').style.backgroundImage='url('+src+')';$('chestName').textContent=WORLDS[w].chest+"'s lock"}
 layout(true);setBg(mode==='journey'?WORLDS[w].id:mode==='zen'?WORLDS[(SV.zenW||0)%6].id:'palace');
 $('lvlName').textContent=mode==='journey'?(isChest?'🎁 '+WORLDS[w].chest+"'s Chest":WORLDS[w].name+' · '+(l+1)):mode==='zen'?'🌸 Zen Garden':'⏱️ Treasure Rush';
 AU.play(mode==='journey'?(isChest?'chest':WORLDS[w].id):mode==='zen'?WORLDS[(SV.zenW||0)%6].id:'rush');
 hud();Promise.all(B.flat().map((g,i)=>{const r=Math.floor(i/N);g.y=r-N-1;return tween(g,{y:r},380+g.x*35+(N-r)*20,'out')})).then(()=>{busy=false;lastAct=performance.now()});}
function setNC(n){NC=n}function setSPC(p){SPC=p}
function startLevel(w,l){closeCard();const first=!SV.seen['w'+w]&&l===0;newGame('journey',w,l);
 if(first){SV.seen['w'+w]=1;persist();setTimeout(()=>{if(state==='play')say('Welcome to the '+WORLDS[w].name+'!',3200)},700)}
 else setTimeout(()=>{if(state==='play')say(G.def.type==='chest'?WORLDS[w].chest+' giggles: "Tickle my lock with sparkles!"':G.def.type==='collect'?'Let\u2019s collect the jewels shown up top!':'Let\u2019s fill the treasure chest!',2800)},700)}
/* ---- input: tap-tap or swipe ---- */
let pd=null;
function cellAt(e){const r=cv.getBoundingClientRect();return{c:Math.floor((e.clientX-r.left)/(r.width/N)),r:Math.floor((e.clientY-r.top)/(r.height/N)),x:e.clientX,y:e.clientY}}
const inB=p=>p.r>=0&&p.r<N&&p.c>=0&&p.c<N,adj=(a,b)=>Math.abs(a.r-b.r)+Math.abs(a.c-b.c)===1;
cv.addEventListener('pointerdown',e=>{AU.start();if(state!=='play'||busy)return;const p=cellAt(e);if(!inB(p))return;cursor.on=false;pd=p;try{cv.setPointerCapture(e.pointerId)}catch(_){}});
cv.addEventListener('pointermove',e=>{if(!pd||busy||armed)return;const dx=e.clientX-pd.x,dy=e.clientY-pd.y,th=CELL*.35;if(Math.max(Math.abs(dx),Math.abs(dy))<th)return;
 const t=Math.abs(dx)>Math.abs(dy)?{r:pd.r,c:pd.c+Math.sign(dx)}:{r:pd.r+Math.sign(dy),c:pd.c};const a=pd;pd=null;sel=null;if(inB(t))trySwap(a,t)});
cv.addEventListener('pointerup',e=>{if(!pd)return;const p=pd;pd=null;tapCell(p)});
cv.addEventListener('pointercancel',()=>pd=null);
function tapCell(p){if(state!=='play'||busy)return;lastAct=performance.now();hint=null;dirty=true;kick();
 if(armed){useArmed(p);return}
 if(sel&&sel.r===p.r&&sel.c===p.c){sel=null;return}
 if(sel&&adj(sel,p)){const a=sel;sel=null;trySwap(a,p);return}
 sel={r:p.r,c:p.c};AU.S.sel()}
/* ---- moves ---- */
async function trySwap(a,b){if(busy||state!=='play'||!G||G.over)return;const my=GEN;busy=true;hint=null;sel=null;lastAct=performance.now();
 const A=B[a.r][a.c],Bb=B[b.r][b.c];AU.S.swap();
 await Promise.all([tween(A,{x:b.c,y:b.r},150),tween(Bb,{x:a.c,y:a.r},150)]);if(my!==GEN)return;
 if(!moveValid(B,a,b)){AU.S.bump();await Promise.all([tween(A,{x:a.c,y:a.r},150),tween(Bb,{x:b.c,y:b.r},150)]);if(my!==GEN)return;busy=false;lastAct=performance.now();return}
 swapCells(B,a,b);const pre=swapPre(B,a,b);if(G.mode==='journey')G.moves--;
 if(!await resolve(pre,[K(a.r,a.c),K(b.r,b.c)]))return;await afterMove();if(my!==GEN)return;busy=false;lastAct=performance.now()}
async function resolve(pre,prefer){const my=GEN;let chain=0,st=computeStep(B,prefer,pre);
 while(st){chain++;let n=0,cx0=0,cy0=0;
  for(const k of st.clear){const g=B[KR(k)][KC(k)];if(!g)continue;n++;cx0+=KC(k);cy0+=KR(k);collect(g,k)}
  for(const f of st.fx){fxs.push(Object.assign({life:0,max:420},f));if(f.t==='x')AU.S.star();else if(f.t==='b')AU.S.burst();else AU.S.line();if(G.def.type==='chest')G.dmg+=3}
  if(st.cre.length)AU.S.special();AU.S.match(chain,n);
  const pts=n*10*chain+st.cre.length*30+st.fx.length*40;G.score+=pts;
  const mx=(cx0/n+.5)*CELL,ty=(cy0/n+.5)*CELL;floatText(mx,ty,'+'+pts,chain>1?'#9effc8':'#fff3a0');
  if(chain===2)say(pick(['Lovely!','Ooh, sparkly!','Wonderful!','How pretty!']),1600);
  if(chain>=3){floatText(BS/2,BS*.42,'COMBO x'+chain+'!','#ffd75e',true);if(chain===3)say(pick(['Look at that go!','Goodness gracious!','Treasure galore!']),1800)}
  if(G.def.type==='chest'){$('chestImg').classList.remove('wig');void $('chestImg').offsetWidth;$('chestImg').classList.add('wig');if(Math.random()<.35)AU.S.giggle()}
  const {gone,born}=applyClear(B,st);
  for(const {g} of gone){dying.push(g);sparkle((g.x+.5)*CELL,(g.y+.5)*CELL,SV.saver?2:4,0);tween(g,{sc:.1,al:0},190,'inq')}
  for(const g of born){g.sc=.3;tween(g,{sc:1},260,'back')}
  hud();await wait(200);if(my!==GEN)return false;dying=[];
  const mv=applyGravity(B);await Promise.all(mv.map(m=>tween(m.g,{y:m.to},140+Math.abs(m.to-m.g.y)*55,'inq')));if(my!==GEN)return false;
  st=computeStep(B,null);}
 if(!allMoves(B).length){banner('✨ Fresh shuffle!');await reshuffle();if(my!==GEN)return false}
 dirty=true;kick();return true}
async function reshuffle(){shuffleBoard(B);await Promise.all(B.flat().map((g,i)=>tween(g,{x:i%N,y:Math.floor(i/N)},380,'out')))}
function collect(g,k){if(!G)return;const d=G.def;if(d.type==='collect'&&g.c>=0)d.need.forEach(([c],i)=>{if(g.c===c)G.got[i]++});
 if(d.type==='chest')G.dmg+=g.c===d.fav?2:1}
function goalMet(){const d=G.def;if(d.type==='score')return G.score>=d.target;if(d.type==='collect')return d.need.every(([c,n],i)=>G.got[i]>=n);if(d.type==='chest')return G.dmg>=d.hp;return false}
async function afterMove(){if(!G)return;hud();if(G.mode==='zen'&&G.score>SV.zenBest){SV.zenBest=G.score;persist()}if(G.mode!=='journey')return;
 if(goalMet()){await levelWon();return}
 if(G.moves<=0){G.moves+=5;G.extra++;hud();banner('Keep going! +5 free moves ✨',1800);say(pick(['No rush, dear. Here are 5 more moves!','Almost there! 5 more moves, on the house.']),2600)}}
async function levelWon(){const my=GEN;G.over=true;busy=true;hint=sel=armed=null;const d=G.def,w=G.w,l=G.l;
 if(d.type==='chest'){AU.S.unlock();banner('🔓 '+WORLDS[w].chest+"'s chest is open!",2000);const ci=$('chestImg');ci.classList.remove('wig');
  for(let i=0;i<4;i++){sparkle(BS*(.2+.2*i),BS*.3,SV.saver?5:10,0)}await wait(900);if(my!==GEN)return}
 else{AU.S.win();banner(pick(['Treasure found!','Beautiful!','Well done!'])+' 🎉',1500)}
 /* Treasure Bonus: leftover moves become coins */
 const left=Math.max(0,G.moves);if(left&&!G.extra){for(let i=0;i<Math.min(left,10);i++){if(my!==GEN)return;G.score+=50;AU.S.coin();floatText(BS*(.2+Math.random()*.6),BS*(.3+Math.random()*.4),'+50','#ffd75e');hud();await wait(110)}if(my!==GEN)return;if(left>10){G.score+=(left-10)*50;hud()}}
 await wait(500);if(my!==GEN)return;
 const stars=G.extra?1:(left>=5?3:2),k=lkey(w,l),prev=SV.stars[k]||0;SV.stars[k]=Math.max(prev,stars);SV.best[k]=Math.max(SV.best[k]||0,G.score);
 let gift='';if(d.type==='chest'&&!prev){const b=['s','r','s','r','s','r'][w];SV.boost[b]++;SV.boost.h++;gift='<p>🎁 '+WORLDS[w].chest+' gave you a gift: <b>🔨 Hammer +1</b> and <b>'+({s:'🔀 Shuffle',r:'🌈 Rainbow Star'}[b])+' +1</b></p>'}
 else if(!prev&&stars===3){SV.boost[['h','s','r'][(w+l)%3]]++;gift='<p>⭐ 3 stars! You earned a free booster.</p>'}
 SV.total=journeyTotal();persist();
 const last=w===WORLDS.length-1&&l===LPW-1;state='won';
 if(last){finale();return}
 const nx=l<LPW-1?[w,l+1]:[w+1,0];
 const st='<div class="stars">'+[0,1,2].map(i=>i<stars?'★':'<span class="off">★</span>').join('')+'</div>';
 const head=d.type==='chest'?'<div class="pic" style="background-image:url(art/chest'+w+'.webp)"></div><h2>'+WORLDS[w].chest+' says thank you!</h2>':'<div class="face"></div><h2>Level complete!</h2>';
 card(head+st+'<p>Score <b>'+fmt(G.score)+'</b></p>'+gift+(d.type==='chest'&&w<WORLDS.length-1?'<p>The path to the <b>'+WORLDS[w+1].name+'</b> is open!</p>':''),
  [{t:'▶ Next',cls:'gold',fn:()=>startLevel(nx[0],nx[1])},{t:'🗺️ Levels',cls:'dim',fn:()=>levelSelect({mode:'journey',w:nx[0],l:nx[1]})}]);
 if(d.type==='chest')state='wdone'}
function finale(){state='finale';AU.play('finale');setBg('palace');
 card('<div class="pic hpic" style="background-image:url(art/helene.webp)"></div><h2>The treasure is home!</h2><p>All six chests are open and Helene\u2019s Grand Treasure is back where it belongs. Thank you for the wonderful journey!</p><p>Journey score <b>'+fmt(journeyTotal())+'</b> · ★ '+totalStars()+' / 90</p>',
  [{t:'🌸 Relax in Zen',cls:'teal',fn:()=>newGame('zen')},{t:'🏠 Home',cls:'dim',fn:goTitle}]);
 AU.S.win()}
/* ---- Rush end ---- */
async function rushEnd(){if(G.over)return;G.over=true;hint=sel=null;const wasBest=G.score>SV.rushBest;SV.rushBest=Math.max(SV.rushBest,G.score);persist();AU.S.win();
 const my=GEN;while(busy&&my===GEN)await wait(100);if(my!==GEN)return;state='over';
 card('<div class="face"></div><h2>Time\u2019s up!</h2><p>You scored <b>'+fmt(G.score)+'</b></p><p>'+(wasBest?'🏆 That\u2019s your best ever!':'Your best: '+fmt(SV.rushBest))+'</p>',[{t:'⏱️ Play again',cls:'gold',fn:()=>newGame('rush')},{t:'🏠 Home',cls:'dim',fn:goTitle}])}
/* ---- hints ---- */
function showHint(manual){if(busy||!B)return;const m=findMove(B);if(!m)return;hint=m;dirty=true;kick();if(manual){AU.S.hint();say(pick(['Try these two glowing jewels!','How about these two?']),2000)}}
$('tHint').onclick=()=>{AU.start();lastAct=performance.now()-100000;hint=null;showHint(true)};
/* ---- boosters ---- */
function arm(b){if(busy||state!=='play')return;const free=G.mode==='zen';if(!free&&!SV.boost[b])return;
 if(b==='s'){if(!free){SV.boost.s--;persist()}AU.S.boost();busy=true;banner('🔀 Shuffle!');const my=GEN;reshuffle().then(async()=>{if(my!==GEN||!await resolve(null))return;busy=false;lastAct=performance.now();updTools()});updTools();return}
 armed=armed===b?null:b;sel=null;$('armTip').classList.toggle('on',!!armed);$('armTxt').textContent=b==='h'?'🔨 Tap a jewel to clear it':'🌈 Tap a jewel to make it a Star';updTools();dirty=true;kick()}
function disarm(){armed=null;$('armTip').classList.remove('on');updTools();dirty=true;kick()}
$('tHam').onclick=()=>arm('h');$('tShuf').onclick=()=>arm('s');$('tStar').onclick=()=>arm('r');$('armCancel').onclick=disarm;
async function useArmed(p){const b=armed,g=B[p.r][p.c],my=GEN;if(!g)return;disarm();if(G.mode!=='zen'){SV.boost[b]--;persist()}busy=true;AU.S.boost();
 if(b==='h'){sparkle((p.c+.5)*CELL,(p.r+.5)*CELL,8,0);if(!await resolve({clear:new Set([K(p.r,p.c)]),forced:new Map()}))return}
 else{g.s='x';g.c=-1;g.sc=.4;await tween(g,{sc:1},300,'back');floatText((p.c+.5)*CELL,(p.r+.5)*CELL,'Treasure Star!','#ffd75e');say('Swap the Star with any jewel!',2400)}
 if(my!==GEN)return;await afterMove();if(my!==GEN)return;busy=false;lastAct=performance.now();updTools()}
/* ---- pause / visibility ---- */
function pause(){if(state!=='play'||cardOpen())return;state='pause';disarm();
 card('<h2>Paused</h2><p>Take all the time you like.</p>',[{t:'▶ Resume',cls:'gold',id:'resumeBtn',fn:resume},...(G.mode==='journey'?[{t:'🔄 Restart level',cls:'dim',fn:()=>startLevel(G.w,G.l)},{t:'🗺️ Levels',cls:'dim',fn:()=>levelSelect({mode:'journey',w:G.w,l:G.l},pause)}]:[{t:'🔄 New game',cls:'dim',fn:()=>newGame(G.mode)}]),{t:'⚙️ Settings',cls:'dim',fn:()=>settings(pause)},{t:'🏠 Home',cls:'dim',fn:()=>{if(G.mode==='zen'){SV.zenBest=Math.max(SV.zenBest,G.score);persist()}goTitle()}}],{stack:1,back:resume})}
function resume(){closeCard();if(state==='pause'){state='play';lastAct=performance.now();dirty=true;kick()}}
$('pauseBtn').onclick=()=>{AU.S.sel();pause()};
document.addEventListener('visibilitychange',()=>{if(document.hidden){AU.suspend();if(state==='play'&&G&&!G.over)pause()}else{AU.resume();kick()}});
/* ---- settings / how to play ---- */
function settings(back){const row=(k,l)=>'<div class="set"><span>'+l+'</span><button type="button" data-k="'+k+'" class="'+(SV[k]?'on':'')+'">'+(SV[k]?'On':'Off')+'</button></div>';
 card('<h2>Settings</h2>'+row('music','🎵 Music')+row('sound','🔔 Sounds')+row('saver','🔋 Battery saver')+'<p style="font-size:22px;opacity:.9">Battery saver uses fewer sparkles and keeps the background still. It\u2019s on to start.</p>',[{t:'📖 How to Play',cls:'dim',fn:()=>howTo(()=>settings(back))},{t:'✔ Done',cls:'gold',fn:()=>back?back():closeCard()}],{stack:1,back:()=>back?back():closeCard()});
 $('card').querySelectorAll('.set button').forEach(b=>b.onclick=()=>{const k=b.dataset.k;SV[k]=SV[k]?0:1;persist();b.classList.toggle('on',!!SV[k]);b.textContent=SV[k]?'On':'Off';
  if(k==='music')AU.setMusic(SV.music);if(k==='sound'){AU.setSound(SV.sound);AU.S.sel()}if(k==='saver')applySaver()})}
function howTo(back){card('<h2>How to Play</h2><ul>'+
 '<li><b>Swap</b> two jewels side by side: swipe one, or tap one then its neighbour. Make a line of <b>3 or more</b> of the same kind.</li>'+
 '<li><b>Match 4</b> for a <b>Line Gem</b> (clears a row or column). <b>L or T shape</b> makes a <b>Burst Gem</b>. <b>Match 5</b> makes a <b>Treasure Star</b>: swap it with any jewel to clear that colour.</li>'+
 '<li><b>The Journey:</b> 6 lands, 5 stops each. Fill the chest, collect the jewels shown up top, then open each land\u2019s friendly <b>challenge chest</b> with sparkles. Its favourite jewel counts double!</li>'+
 '<li>You can\u2019t lose. If you run out of moves you get <b>5 free moves</b>. Only Rush has a clock.</li>'+
 '<li><b>Boosters:</b> 🔨 clears one jewel, 🔀 shuffles, 🌈 makes a Treasure Star. Chests give more.</li>'+
 '<li>Stuck? Press <b>💡 Hint</b>, or wait a moment and two jewels will glow.</li>'+
 '<li class="gp-help">🎮 <b>Controller</b> (USB or Bluetooth, computer or phone): stick or D-pad moves the gold box, <b>A</b> picks a jewel, then <b>A</b> on a neighbour swaps. <b>B</b> lets go or goes back, <b>X</b> hint, <b>Start</b> pauses, <b>Select</b> sound. In menus the D-pad moves and <b>A</b> chooses.</li>'+
 '<li>⌨️ <b>Keyboard:</b> arrows move, Enter or Space picks, H hint, P pause, M sound.</li></ul>',[{t:'Got it!',cls:'gold',id:'howClose',fn:()=>back?back():closeCard()}])}
/* ---- keyboard ---- */
addEventListener('keydown',e=>{AU.start();const k=e.key;
 if(cardOpen()){if(k==='Escape'&&cardBack){e.preventDefault();cardBack()}return}
 if(state!=='play')return;
 const mv={ArrowLeft:[0,-1],ArrowRight:[0,1],ArrowUp:[-1,0],ArrowDown:[1,0]}[k];
 if(mv){e.preventDefault();moveCursor(mv[0],mv[1]);return}
 if(k==='Enter'||k===' '){e.preventDefault();padPick();return}
 if(k==='Escape'||k==='p'||k==='P'){if(armed)disarm();else if(sel)sel=null;else pause();dirty=true;kick();return}
 if(k==='h'||k==='H')$('tHint').click();if(k==='m'||k==='M')toggleMute()});
function moveCursor(dr,dc){cursor.on=true;cursor.r=Math.max(0,Math.min(N-1,cursor.r+dr));cursor.c=Math.max(0,Math.min(N-1,cursor.c+dc));lastAct=performance.now();dirty=true;kick()}
function padPick(){if(!cursor.on){cursor.on=true;dirty=true;kick();return}tapCell({r:cursor.r,c:cursor.c})}
function toggleMute(){const on=!(SV.music||SV.sound);SV.music=SV.sound=on?1:0;persist();AU.setMusic(SV.music);AU.setSound(SV.sound);toast(on?'🔔 Sound on':'🔕 Sound off')}
/* ---- title buttons ---- */
/* ---- title: one tap PLAY, one simple LEVEL SELECT screen, settings behind the gear ---- */
function playTarget(){const nx=nextLevel();return nx?{mode:'journey',w:nx[0],l:nx[1]}:{mode:'zen'}}
function playSub(){const t=playTarget(),e=$('bPlaySub');if(e)e.textContent=t.mode==='journey'?(t.l===LPW-1?WORLDS[t.w].chest+"'s Chest":WORLDS[t.w].name+' · Level '+(t.l+1)):'Relax in Zen'}
function playNow(t){AU.start();SV.seen.intro=1;persist();if(t.mode==='journey')startLevel(t.w,t.l);else{if(t.mode==='zen'){SV.zenW=((SV.zenW||0)+1)%6;persist()}newGame(t.mode)}}
let LSel=null;
function levelSelect(pre,back){if(pre)LSel=Object.assign({},pre);if(!LSel)LSel=playTarget();if(LSel.mode==='journey'&&LSel.w==null){const t=playTarget();LSel.w=t.w||0;LSel.l=t.l||0}
 const M=[['journey','🗺️<span>Journey</span>'],['zen','🌸<span>Zen</span>'],['rush','⏱️<span>Rush</span>']];
 let h='<h2>Pick a Level</h2><div class="mrow">'+M.map(m=>'<button type="button" class="mch'+(LSel.mode===m[0]?' sel':'')+'" data-m="'+m[0]+'">'+m[1]+'</button>').join('')+'</div>';
 if(LSel.mode==='journey'){WORLDS.forEach((W_,w)=>{h+='<h3 class="wh">'+W_.name+'</h3><div class="lvls">';
   for(let l=0;l<LPW;l++){const ok=unlocked(w,l),s=SV.stars[lkey(w,l)]||0,ch=l===LPW-1,se=LSel.w===w&&LSel.l===l;
    h+='<button type="button" class="lv'+(ch?' chest':'')+(se?' sel':'')+'" data-w="'+w+'" data-l="'+l+'"'+(ok?'':' disabled')+' aria-label="'+W_.name+' '+(ch?'challenge chest':'level '+(l+1))+'">'+(ch?'🎁':(ok?l+1:'🔒'))+'<small>'+(s?'★'.repeat(s):'')+'</small></button>'}
   h+='</div>'})}
 else h+='<p class="mdesc">'+(LSel.mode==='zen'?'🌸 Zen: relax and match jewels. No moves, no clock, no rush.':'⏱️ Rush: 2 minutes to score as much as you can.')+'</p>';
 const bk=back||(state==='title'?closeCard:goTitle);
 card(h,[{t:'▶ START',cls:'gold',id:'lsStart',fn:()=>playNow(LSel)},{t:'⬅ Back',cls:'dim',fn:bk}],{stack:1,back:bk});
 const c=$('card');c.classList.add('ls');
 c.querySelectorAll('.mch').forEach(b=>b.onclick=()=>{AU.S.sel();LSel={mode:b.dataset.m};levelSelect(null,back)});
 c.querySelectorAll('.lv').forEach(b=>b.onclick=()=>{if(b.disabled){AU.S.bump();toast('Finish the level before it first');return}AU.S.sel();LSel={mode:'journey',w:+b.dataset.w,l:+b.dataset.l};
  c.querySelectorAll('.lv.sel').forEach(x=>x.classList.remove('sel'));b.classList.add('sel')});
 const s=c.querySelector('.lv.sel');if(s)setTimeout(()=>s.scrollIntoView({block:'center'}),0)}
$('bPlay').onclick=()=>{AU.S.sel();playNow(playTarget())};
$('bPick').onclick=()=>{AU.start();AU.S.sel();levelSelect(playTarget())};
$('bSet').onclick=()=>{AU.start();AU.S.sel();settings()};
$('mapHome').onclick=goTitle;
/* share / install */
let deferredInstall=null;addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e});
$('shareBtn').onclick=async()=>{const d={title:"Helene's Treasure Chest: Volume 2",text:"Play Helene's Treasure Chest: Volume 2, a free relaxing jewel game from Peter's Arcade!",url:'https://ploug76.github.io/helenes-treasure-chest-vol-2/'};
 try{if(navigator.share){await navigator.share(d);return}}catch(e){return}try{await navigator.clipboard.writeText(d.url);toast('Link copied!')}catch(e){toast(d.url)}};
$('instBtn').onclick=async()=>{if(deferredInstall){deferredInstall.prompt();deferredInstall=null;return}toast(/iphone|ipad/i.test(navigator.userAgent)?'Tap Share, then "Add to Home Screen"':'Use your browser menu: "Add to Home screen"')};
;(function(){/*swup v1: check for updates on every open*/if(window.__swup)return;window.__swup=1;var S=navigator.serviceWorker;if(!S||!/^https?:$/.test(location.protocol))return;var ARC=0,BUSY=0,had=!!S.controller,inp=0,K='swup:'+location.pathname;['pointerdown','keydown','touchstart','wheel'].forEach(function(t){addEventListener(t,function(){inp=1},{capture:true,passive:true})});function chk(){try{S.getRegistration().then(function(r){if(r)r.update().catch(function(){})},function(){})}catch(e){}}addEventListener('load',function(){setTimeout(chk,800)});document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'){if(ARC)inp=0;chk()}});addEventListener('pageshow',function(e){if(e.persisted){if(ARC)inp=0;chk()}});function pill(){if(document.getElementById('swupPill'))return;var b=document.createElement('button');b.id='swupPill';b.type='button';b.textContent='Update ready \u2013 tap to refresh';b.style.cssText='position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 8px);transform:translateX(-50%);z-index:2147483647;padding:8px 14px;border:0;border-radius:999px;background:#ffd23f;color:#111;font:600 14px system-ui,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.45);cursor:pointer';b.addEventListener('click',function(){location.reload()});(document.body||document.documentElement).appendChild(b)}S.addEventListener('controllerchange',function(){if(!had){had=true;return}var n=Date.now(),l=0,busy=false;try{l=+sessionStorage.getItem(K)||0}catch(e){}try{busy=!!(BUSY&&BUSY())}catch(e){}if(inp||busy||n-l<15000||document.visibilityState!=='visible'){pill();return}try{sessionStorage.setItem(K,String(n))}catch(e){}location.reload()})})();if('serviceWorker' in navigator&&location.protocol==='https:')addEventListener('load',()=>navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).catch(()=>{}));
/* ---- test hooks (used by the automated QA player) ---- */
window.__HTC={get state(){return state},get G(){return G},get B(){return B},get busy(){return busy},get fps(){return fps},get cursor(){return cursor},get armed(){return armed},get sel(){return sel},get dbg(){return{tws:tws.length,running,parts:parts.length,GEN}},
 findMove:()=>findMove(B),trySwap,startLevel,newGame,goMap,goTitle,levelWon:()=>levelWon(),SV,WORLDS,LPW,levelDef,persist,layoutInfo:()=>({BS,CELL,LAND}),kick};
/* ---- boot ---- */
AU.setMusic(SV.music);AU.setSound(SV.sound);applySaver();goTitle();
['pointerdown','keydown','touchend'].forEach(ev=>addEventListener(ev,()=>AU.start(),{capture:true}));
