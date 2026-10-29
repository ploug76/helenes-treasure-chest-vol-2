/* Helene's Treasure Chest Vol 2: original calm WebAudio score (one tune per world) + sound effects.
   Light on CPU: a few oscillators per beat, scheduled 0.4 s ahead; the context is suspended when the app is hidden. */
const AU=(()=>{
let ctx=null,master,comp,musG,sfxG,timer=0,cur=-1,nextT=0,step=0,musicOn=true,soundOn=true;
const mtof=m=>440*Math.pow(2,(m-69)/12);
function init(){if(ctx)return true;const C=window.AudioContext||window.webkitAudioContext;if(!C)return false;
 try{ctx=new C()}catch(e){return false}
 comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=8;comp.attack.value=.004;comp.release.value=.2;
 master=ctx.createGain();master.gain.value=1.5;master.connect(comp);comp.connect(ctx.destination);/* loud but limited: Helene is hard of hearing */
 musG=ctx.createGain();musG.gain.value=musicOn?.3:0;musG.connect(master);sfxG=ctx.createGain();sfxG.gain.value=soundOn?.75:0;sfxG.connect(master);return true}
function tone(f,t,d,type,g,dest,att){const o=ctx.createOscillator(),v=ctx.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);
 v.gain.setValueAtTime(0,t);v.gain.linearRampToValueAtTime(g,t+(att||.012));v.gain.exponentialRampToValueAtTime(.0008,t+d);o.connect(v);v.connect(dest||sfxG);o.start(t);o.stop(t+d+.05);return o}
function bell(m,t,d,g,dest){tone(mtof(m),t,d,'sine',g,dest);tone(mtof(m+12),t,d*.5,'sine',g*.25,dest)}
/* ---- tracks: key root (midi), bpm, beats per bar, chord roots (scale degrees) & quality, seed for the melody ---- */
const MAJ=[0,2,4,5,7,9,11],PENT=[0,2,4,7,9];
const T=[
 {n:'title',root:60,bpm:80,bar:4,ch:[[0,'M'],[5,'m'],[3,'M'],[4,'M']],seed:7},
 {n:'rose',root:60,bpm:84,bar:3,ch:[[0,'M'],[3,'M'],[4,'M'],[0,'M'],[5,'m'],[3,'M'],[1,'m'],[4,'M']],seed:11},/* waltz */
 {n:'sea',root:65,bpm:72,bar:6,ch:[[0,'M'],[3,'M'],[0,'M'],[4,'M']],seed:23},/* gentle 6/8 sway */
 {n:'orchard',root:67,bpm:92,bar:4,ch:[[0,'M'],[4,'M'],[5,'m'],[3,'M'],[0,'M'],[3,'M'],[4,'M'],[0,'M']],seed:31},
 {n:'snow',root:62,bpm:80,bar:4,ch:[[0,'M'],[5,'m'],[1,'m'],[4,'M']],seed:47,box:1},/* music box */
 {n:'lagoon',root:57,bpm:64,bar:4,ch:[[0,'m'],[5,'M'],[2,'M'],[6,'M']],seed:53,minor:1},
 {n:'palace',root:58,bpm:88,bar:4,ch:[[0,'M'],[3,'M'],[4,'M'],[0,'M'],[5,'m'],[1,'m'],[4,'M'],[0,'M']],seed:61},
 {n:'chest',root:63,bpm:100,bar:4,ch:[[0,'M'],[3,'M'],[0,'M'],[4,'M']],seed:71},
 {n:'rush',root:64,bpm:118,bar:4,ch:[[0,'M'],[4,'M'],[5,'m'],[3,'M']],seed:83},
 {n:'finale',root:60,bpm:76,bar:4,ch:[[0,'M'],[3,'M'],[5,'m'],[4,'M'],[0,'M'],[3,'M'],[4,'M'],[0,'M']],seed:97}];
const IDX={};T.forEach((t,i)=>IDX[t.n]=i);
function rng(s){return()=>{s=(s*16807)%2147483647;return s/2147483647}}
/* melody: 4-bar phrases (A A' B A) built from chord tones on strong beats and pentatonic steps between */
function build(t){const r=rng(t.seed),steps=t.bar*2,bars=t.ch.length,mel=[];let last=4;
 const scale=t.minor?[0,2,3,5,7,8,10]:MAJ;
 const phrase=()=>{const p=[];for(let s=0;s<steps;s++){const strong=s%2===0,rest=r()<(strong?.12:.55);if(rest){p.push(null);continue}
   let d=last+Math.round((r()-.5)*3);d=Math.max(0,Math.min(9,d));last=d;p.push(d)}return p};
 const A=[...Array(4)].map(phrase),B=[...Array(4)].map(phrase);
 for(let b=0;b<Math.max(bars,8);b++){const src=(b>=8&&b<12)?B:A;mel.push(src[b%4])}
 t.mel=mel;t.scale=scale}
T.forEach(build);
function deg(t,d,oct){const s=t.scale,n=s.length;return t.root+s[((d%n)+n)%n]+12*(Math.floor(d/n)+(oct||0))}
function chordNotes(t,c){const d=c[0];return[deg(t,d),deg(t,d+2),deg(t,d+4)]}
function schedule(){if(!ctx||cur<0)return;const t=T[cur],spb=60/t.bpm/2;/* eighth notes */
 while(nextT<ctx.currentTime+.45){const steps=t.bar*2,bi=Math.floor(step/steps),s=step%steps,ch=t.ch[bi%t.ch.length];
  if(musicOn){
   if(s===0){const cn=chordNotes(t,ch);tone(mtof(cn[0]-24),nextT,spb*steps*.95,'triangle',.22,musG,.03);/* bass */
    cn.forEach(m=>tone(mtof(m-12),nextT,spb*steps,'sine',.05,musG,.25))}/* soft pad */
   if(t.bar===3&&(s===2||s===4)){const cn=chordNotes(t,ch);cn.slice(1).forEach(m=>tone(mtof(m),nextT,spb*1.4,'triangle',.03,musG))}/* waltz chords */
   if(t.bar===6&&s===3){tone(mtof(chordNotes(t,ch)[0]-12),nextT,spb*3,'triangle',.12,musG)}
   const mp=t.mel[bi%t.mel.length],d=mp&&mp[s];
   if(d!=null){const m=deg(t,d+ch[0]%2,t.box?1:0);if(t.box)bell(m,nextT,spb*2.4,.09,musG);else{tone(mtof(m),nextT,spb*1.8,'triangle',.08,musG);tone(mtof(m+12),nextT,spb*.8,'sine',.02,musG)}}
   if(cur===IDX.rush&&s%2===1)tone(mtof(chordNotes(t,ch)[2]),nextT,spb*.5,'square',.012,musG);}
  nextT+=spb;step++}}
let want='title';
function play(name){want=name;if(!ctx)return;const i=IDX[name]??0;if(i===cur)return;cur=i;step=0;nextT=ctx.currentTime+.08;
 if(!timer)timer=setInterval(schedule,120);schedule()}
function stop(){cur=-1}
/* ---- sound effects ---- */
const PEN=[0,2,4,7,9,12,14,16,19,21,24];
const S={
 swap(){if(!ok())return;const t=ctx.currentTime,o=tone(520,t,.12,'sine',.12);o.frequency.exponentialRampToValueAtTime(780,t+.1)},
 bump(){if(!ok())return;const t=ctx.currentTime;tone(200,t,.14,'triangle',.18);tone(160,t+.07,.14,'triangle',.14)},
 sel(){if(!ok())return;tone(880,ctx.currentTime,.08,'sine',.1)},
 match(chain,n){if(!ok())return;const t=ctx.currentTime,b=72+PEN[Math.min(PEN.length-1,chain-1)];bell(b,t,.45,.2);bell(b+4,t+.06,.4,.12);if(n>4)bell(b+7,t+.12,.5,.12)},
 special(){if(!ok())return;const t=ctx.currentTime;[0,4,7,12].forEach((d,i)=>bell(84+d,t+i*.05,.5,.12))},
 line(){if(!ok())return;const t=ctx.currentTime,o=tone(400,t,.35,'sawtooth',.06);o.frequency.exponentialRampToValueAtTime(1600,t+.3);bell(91,t+.05,.5,.12)},
 burst(){if(!ok())return;const t=ctx.currentTime,o=tone(140,t,.5,'sine',.4);o.frequency.exponentialRampToValueAtTime(60,t+.4);bell(88,t,.5,.12)},
 star(){if(!ok())return;const t=ctx.currentTime;for(let i=0;i<8;i++)bell(79+PEN[i],t+i*.045,.6,.11)},
 coin(){if(!ok())return;const t=ctx.currentTime;bell(95,t,.18,.1);bell(100,t+.06,.25,.1)},
 hint(){if(!ok())return;const t=ctx.currentTime;bell(84,t,.5,.1);bell(88,t+.15,.5,.08)},
 giggle(){if(!ok())return;const t=ctx.currentTime;[0,1,2,3].forEach(i=>{const o=tone(700+i*60,t+i*.07,.08,'sine',.12);o.frequency.exponentialRampToValueAtTime(900+i*60,t+i*.07+.06)})},
 unlock(){if(!ok())return;const t=ctx.currentTime;[0,4,7,12,16,19,24].forEach((d,i)=>bell(72+d,t+i*.08,.9,.16));tone(mtof(48),t,1.2,'triangle',.25)},
 win(){if(!ok())return;const t=ctx.currentTime;[[0,0],[4,.15],[7,.3],[12,.45],[7,.62],[12,.78]].forEach(([d,o])=>bell(72+d,t+o,.7,.18));[48,55,60].forEach(m=>tone(mtof(m),t+.45,1.2,'triangle',.12))},
 boost(){if(!ok())return;const t=ctx.currentTime;bell(76,t,.4,.15);bell(83,t+.08,.5,.15);bell(88,t+.16,.6,.15)},
 tick(){if(!ok())return;tone(1200,ctx.currentTime,.05,'square',.03)},
};
function ok(){return !!ctx&&soundOn&&ctx.state==='running'}
function start(){if(!init())return;resume_();if(cur<0)play(want)}
function resume_(){if(ctx&&ctx.state!=='running')ctx.resume().catch(()=>{})}
return{init,play,stop,S,start,
 setMusic(v){musicOn=!!v;if(musG)musG.gain.setTargetAtTime(v?.3:0,ctx.currentTime,.05)},
 setSound(v){soundOn=!!v;if(sfxG)sfxG.gain.setTargetAtTime(v?.75:0,ctx.currentTime,.05)},
 resume(){if(ctx&&ctx.state!=='running')ctx.resume().catch(()=>{})},
 suspend(){if(ctx&&ctx.state==='running')ctx.suspend().catch(()=>{})},
 get ctx(){return ctx},get track(){return cur<0?null:T[cur].n}};
})();
