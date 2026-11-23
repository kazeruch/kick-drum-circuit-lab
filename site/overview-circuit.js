import {CIRCUIT_SYMBOLS as S} from './circuit-symbols.js';
import {OVERVIEW_SIZE,OVERVIEW_OPAMP_INPUT_LEAD,OVERVIEW_COMPONENTS as components,OVERVIEW_WIRES as wires,OVERVIEW_AREAS as areas,OVERVIEW_POWER as power,OVERVIEW_TERMINALS as terminals} from './overview-circuit-data.js';
const NS='http://www.w3.org/2000/svg';
const node=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
const line=points=>points.map((p,i)=>`${i?'L':'M'}${p}`).join('');
const colors={trigger:'#80b7df',resonator:'#e0a36a','pitch-decay':'#b69bd8','pitch-envelope':'#9bc68c',tone:'#dec66f','distortion-output':'#d998b2'};
const routeColors={gate:'trigger','trigger-main':'trigger','osc-input':'resonator','envelope-branch':'pitch-envelope','envelope-buffer':'pitch-envelope','envelope-return':'pitch-envelope','osc-output':'resonator','decay-out':'pitch-decay','decay-return':'pitch-decay','tone-output':'tone','final-output':'distortion-output'};
export const WIRE_ROUTES=Object.fromEntries(Object.entries(routeColors).map(([key,part])=>[key,{color:colors[part],d:wires.filter(w=>w.route===key).map(w=>line(w.points)).join(' ')}]));
function componentLeads(component,halfWidth){
 const [start,end]=component.posts;
 const dx=end[0]-start[0],dy=end[1]-start[1],length=Math.hypot(dx,dy);
 const cx=(start[0]+end[0])/2,cy=(start[1]+end[1])/2;
 const x=halfWidth*dx/length,y=halfWidth*dy/length;
 return line([start,[cx-x,cy-y]])+' '+line([[cx+x,cy+y],end]);
}
const resistorLeads=c=>componentLeads(c,S.resistor.halfWidth);
const decayInput=components.find(c=>c.id==='RdecayInput'),decayReturn=components.find(c=>c.id==='Rf');
WIRE_ROUTES['decay-out'].d=line([components.find(c=>c.id==='Uosc').posts[2],[decayInput.posts[0][0],components.find(c=>c.id==='Uosc').posts[2][1]],decayInput.posts[0]])+' '+resistorLeads(decayInput);
WIRE_ROUTES['decay-return'].d+=' '+resistorLeads(decayReturn)+' '+line([decayReturn.posts[0],components.find(c=>c.id==='C1').posts[1]]);
// In the overview lesson each highlight follows only the branch being read.
const device=id=>components.find(c=>c.id===id);
const oscOut=device('Uosc').posts[2],toneIn=device('TONE').posts[0];
const oscillatorMinus=device('Uosc').posts[0];
const minusWire=wires.find(w=>w.net==='a'&&w.points.at(-1).every((v,i)=>v===oscillatorMinus[i]));
WIRE_ROUTES['junction-to-minus']={color:colors.resonator,d:componentLeads(device('C1'),S.capacitor.halfGap)+' '+line(minusWire.points)};
const triggerWire=wires.find(w=>w.net==='trigger'&&w.route==='trigger-main');
const pitch=device('PITCH'),pitchGround=device('Rpitch');
WIRE_ROUTES['trigger-to-divider']={color:colors.trigger,d:line(triggerWire.points)+' '+resistorLeads(device('Rinput'))};
WIRE_ROUTES['pitch-ground']={color:colors['pitch-decay'],d:[
 line([device('C1').posts[1],pitch.posts[0]]),resistorLeads(pitch),resistorLeads(pitchGround),
].join(' ')};
WIRE_ROUTES['osc-to-tone']={color:colors.resonator,d:line([oscOut,[toneIn[0],oscOut[1]],toneIn])+' '+resistorLeads(device('TONE'))};
WIRE_ROUTES['output-jack']={color:colors['distortion-output'],d:line([device('Udist').posts[2],terminals.find(t=>t.net==='out').point])};
// Jump horizontal wires/leads across other nets. A junction is only drawn when
// connected ports/wire ends share the same net; a mere crossing is not a node.
const verticals=[];
for(const w of wires)for(let i=1;i<w.points.length;i++){const a=w.points[i-1],b=w.points[i];if(a[0]===b[0]&&a[1]!==b[1])verticals.push({net:w.net,x:a[0],low:Math.min(a[1],b[1]),high:Math.max(a[1],b[1])});}
function wirePath(points,net){
 let result=`M${points[0]}`;
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i];
  if(a[1]!==b[1]){result+=`L${b}`;continue;}
  const direction=Math.sign(b[0]-a[0]),xs=[...new Set(verticals.filter(v=>v.net!==net&&a[1]>v.low&&a[1]<v.high&&v.x>Math.min(a[0],b[0])+12&&v.x<Math.max(a[0],b[0])-12).map(v=>v.x))].sort((x,y)=>direction*(x-y));
  for(const x of xs)result+=`L${x-direction*10},${a[1]}Q${x},${a[1]-15} ${x+direction*10},${a[1]}`;
  result+=`L${b}`;
 }
 return result;
}
export function overviewBounds(...keys){
 const selected=areas.filter(a=>keys.includes(a.id)||keys.includes(a.part)).map(a=>a.fitBox?{...a,box:a.fitBox}:a);
 if(!selected.length)return {x:0,y:0,width:OVERVIEW_SIZE[0],height:OVERVIEW_SIZE[1]};
 const x=Math.min(...selected.map(a=>a.box[0])),y=Math.min(...selected.map(a=>a.box[1]));
 return {x:x-30,y:y-35,width:Math.max(...selected.map(a=>a.box[0]+a.box[2]))-x+60,height:Math.max(...selected.map(a=>a.box[1]+a.box[3]))-y+70};
}
export function renderOverviewCircuit({chapters,onPart,onComponent,onTerminal,reading=false}){
 const svg=node('svg',{viewBox:`0 0 ${OVERVIEW_SIZE.join(' ')}`,class:'whole-schematic overview-circuit','data-source-page':'2',role:'group','aria-label':'マニュアルp.2の部品と接続を描き直した全体回路図'});
 const background=node('g',{class:'overview-ranges'}),wiring=node('g',{class:'overview-wiring'}),devices=node('g',{class:'overview-devices'}),routes=node('g',{class:'overview-wire-routes','pointer-events':'none'}),junctions=node('g',{class:'overview-junctions','pointer-events':'none'}),markers=node('g',{class:'overview-node-markers','pointer-events':'none'}),labels=node('g',{class:'overview-labels'});
 svg.append(background,wiring,devices,routes,junctions,markers,labels);
 const groups=[],tags=[],portLabels=[],controlBoxes=[];
 const text=(parent,x,y,value,cls='overview-value',anchor='middle')=>{const t=node('text',{x,y,class:cls,'text-anchor':anchor});t.textContent=value;parent.append(t);return t;};
 const path=(parent,d,cls='component',extra={})=>{const p=node('path',{d,class:cls,...extra});parent.append(p);return p;};
 const open=(group,action)=>{group.addEventListener('click',action);group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action();}});};
 for(const chapter of chapters.slice(1)){
  const group=node('g',{class:'part overview-region','data-part':chapter.id,'data-probe':chapter.id}),b=overviewBounds(chapter.id);
  if(!reading){
   group.setAttribute('role','button');group.setAttribute('tabindex','0');group.setAttribute('aria-label',`${chapter.marker}「${chapter.title}」の説明を表示`);
   open(group,()=>onPart(chapter.id));
  }
  group.append(node('rect',{x:b.x,y:b.y,width:b.width,height:b.height,class:'hit-box','pointer-events':'none'}));
  for(const area of areas.filter(a=>a.part===chapter.id)){
   const [x,y,width,height]=area.box;
   const boundary={class:'overview-boundary','data-area':area.id};
   group.append(area.outline?node('path',{...boundary,d:area.outline}):node('rect',{...boundary,x,y,width,height,rx:18}));
   const tag=node('g',{'data-part':chapter.id,class:'overview-range-tag','data-area-label':area.id,role:'button',tabindex:0,'aria-label':`${area.label}の範囲を拡大`});
   const labelWidth=[...area.label].reduce((sum,c)=>sum+(/[\x00-\x7F]/.test(c)?16:28),0)+30;
   const leader=node('path',{class:'overview-range-leader','data-part':chapter.id});labels.append(leader);tag.append(node('rect',{x:-10,y:-28,width:labelWidth,height:42,rx:6}));text(tag,4,2,area.label,'overview-range-title','start');labels.append(tag);open(tag,()=>onPart(chapter.id,area));tags.push({tag,point:area.tag,width:labelWidth,leader,area});
  }
  background.append(group);groups.push(group);
 }
 for(const wire of wires)path(wiring,wirePath(wire.points,wire.net),'component overview-wire',{'data-net':wire.net});
 // Count physical branches, not crossings. Components themselves are never
 // joined through their bodies. The same coordinate can have only one net.
 const positions=new Map();
 function register(point,net){const key=point.join(',');if(!positions.has(key))positions.set(key,{point,net,count:0});const entry=positions.get(key);if(entry.net!==net)throw new Error(`全体図の接続衝突: ${key} (${entry.net}/${net})`);entry.count++;}
 for(const w of wires)for(const p of w.points)register(p,w.net);
 for(const c of components)c.posts.forEach((p,i)=>register(p,c.nets[i]));
 for(const p of power)register(p.point,p.net);
 for(const t of terminals)register(t.point,t.net);
 for(const c of components){
  const group=node('g',{class:'part overview-component','data-part':c.part,'data-component':c.id,'data-probe':c.id,role:'button',tabindex:0,'aria-label':reading?`${c.id}の周辺を拡大`:`${c.id} ${c.value}の電圧と電流を見る`});
  const xs=c.posts.map(p=>p[0]),ys=c.posts.map(p=>p[1]);group.append(node('rect',{x:Math.min(...xs)-22,y:Math.min(...ys)-38,width:Math.max(...xs)-Math.min(...xs)+44,height:Math.max(...ys)-Math.min(...ys)+76,class:'hit-box'}));open(group,()=>onComponent(c));devices.append(group);
  const [a,b]=c.posts,dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1,ux=dx/length,uy=dy/length,m=[(a[0]+b[0])/2,(a[1]+b[1])/2],angle=Math.atan2(dy,dx)*180/Math.PI;
  const lead=(start,end,net)=>path(group,wirePath([start,end],net),'component overview-wire',{'data-net':net});
  const shape=(d,type)=>path(group,d,'component symbol-body',{transform:`translate(${m}) rotate(${angle})`,'data-symbol':type});
  if(['resistor','pot','capacitor','diode'].includes(c.type)){
   group.dataset.focusX=String(m[0]);group.dataset.focusY=String(m[1]);
   const half=c.type==='capacitor'?S.capacitor.halfGap:c.type==='diode'?18:S.resistor.halfWidth;
   lead(a,[m[0]-half*ux,m[1]-half*uy],c.nets[0]);lead([m[0]+half*ux,m[1]+half*uy],b,c.nets[1]);
   if(c.type==='capacitor'){const h=S.capacitor.halfHeight;shape(`M-${half} -${h}V${h} M${half} -${h}V${h}`,'capacitor');}
   else if(c.type==='diode')shape('M-18 -17V17L18 0Z M18 -19V19','diode');
   else shape('M-32 0l8 -9 12 18 12 -18 12 18 12 -18 8 9','resistor');
   const vertical=Math.abs(dy)>Math.abs(dx),side=c.labelSide||1;
   const name=c.type==='pot'?'':c.type==='diode'?'':`${['Cin','Cenv','Cs','C1','C2','Rb','Rf'].includes(c.id)?c.id+' ':''}${c.value}`;
   text(group,m[0]+(vertical?side*28:0),m[1]+(vertical?5:-26),name,'overview-value',vertical?(side>0?'start':'end'):'middle');
   if(c.type==='pot'){
    const tap=c.posts[2],end=m,vx=end[0]-tap[0],vy=end[1]-tap[1],n=Math.hypot(vx,vy)||1;
    path(group,`M${tap}L${end}`);path(group,`M${end}l${-vx/n*12-vy/n*5},${-vy/n*12+vx/n*5} M${end}l${-vx/n*12+vy/n*5},${-vy/n*12-vx/n*5}`);
    const [lx,ly]=c.callout,boxWidth=Math.max(125,c.id.length*12+28),boxHeight=62,label=node('g',{class:'overview-control-label'}),target=[Math.max(lx,Math.min(lx+boxWidth,m[0])),Math.max(ly,Math.min(ly+boxHeight,m[1]))];
    controlBoxes.push({x:lx,y:ly,width:boxWidth,height:boxHeight});
    path(label,`M${m}L${target}`,'component-label-leader');
    label.append(node('rect',{x:lx,y:ly,width:boxWidth,height:boxHeight,rx:5,class:'component-label-box'}));
    text(label,lx+12,ly+24,c.id,'overview-control-name','start');text(label,lx+12,ly+48,c.value,'overview-control-value','start');group.append(label);
   }
  }else if(c.type==='opamp'){
   const [minus,plus,out]=c.posts,x=minus[0]+OVERVIEW_OPAMP_INPUT_LEAD,y=(minus[1]+plus[1])/2,{width,halfHeight}=S.opamp;
   path(group,line([minus,[x,minus[1]]]),'component overview-wire',{'data-net':c.nets[0]});
   path(group,line([plus,[x,plus[1]]]),'component overview-wire',{'data-net':c.nets[1]});
   path(group,`M${x} ${y-halfHeight}V${y+halfHeight}L${x+width} ${y}Z`,'component symbol-body',{'data-symbol':'opamp'});
   text(group,x+16,minus[1]+6,'－','overview-terminal-sign');text(group,x+16,plus[1]+6,'＋','overview-terminal-sign');
  }else if(c.type==='transistor'){
   const [base,collector,emitter]=c.posts,x=base[0]+40,y=base[1];
   path(group,`M${base}H${x} M${x} ${y-28}V${y+28} M${x} ${y+(collector[1]>y?15:-15)}L${collector} M${x} ${y+(emitter[1]>y?15:-15)}L${emitter}`,'component symbol-body',{'data-symbol':c.value.toLowerCase()});
   const start=c.value==='PNP'?emitter:[x,y+15],end=c.value==='PNP'?[x+4,y-17]:emitter,vx=end[0]-start[0],vy=end[1]-start[1],n=Math.hypot(vx,vy)||1,tip=[start[0]+vx*.7,start[1]+vy*.7];
   path(group,`M${tip}l${-vx/n*12-vy/n*5},${-vy/n*12+vx/n*5} M${tip}l${-vx/n*12+vy/n*5},${-vy/n*12-vx/n*5}`);
   text(group,x,y-44,c.value,'overview-value');
  }
 }
 for(const supply of power){const [x,y]=supply.point;if(supply.net==='gnd')path(wiring,`M${x} ${y}v18 M${x-16} ${y+18}h32 M${x-11} ${y+25}h22 M${x-5} ${y+32}h10`,'component ground');else{path(wiring,`M${x} ${y}v-22 M${x-11} ${y-22}l11 -17 11 17Z`);text(wiring,x,y-48,'＋12V','overview-value');}}
 for(const entry of positions.values()){
  // A terminal on a through-wire creates two wire branches at that point.
  const through=wires.some(w=>w.net===entry.net&&w.points.slice(1).some((b,i)=>{const a=w.points[i],p=entry.point;return (p[0]-a[0])*(b[1]-a[1])===(p[1]-a[1])*(b[0]-a[0])&&p[0]>=Math.min(a[0],b[0])&&p[0]<=Math.max(a[0],b[0])&&p[1]>=Math.min(a[1],b[1])&&p[1]<=Math.max(a[1],b[1])&&p.join(',')!==a.join(',')&&p.join(',')!==b.join(',');}));
  if(entry.count>=3||through&&entry.count>=1)junctions.append(node('circle',{cx:entry.point[0],cy:entry.point[1],r:4,'data-net':entry.net}));
 }
 for(const t of terminals){
  const [x,y]=t.point,group=node('g',{class:'part overview-port','data-part':t.part,'data-probe':t.probe||t.net,'data-focus-x':x,'data-focus-y':y,role:'button',tabindex:0,'aria-label':reading?`${t.label}の周辺を拡大`:`${t.label}の電圧を見る`});
  const width=t.probe?112:170;
  const bx=t.side==='left'?x-155:t.probe==='output'?x-width+12:x-8,by=t.side==='left'?y-45:y+44;
  const label=node('g');
  label.append(node('rect',{x:bx-8,y:by-31,width,height:43,rx:5,class:'overview-port-label'}));
  text(label,bx,by,t.label,'overview-port-title','start');
  group.append(label,node('circle',{cx:x,cy:y,r:6,class:'overview-port-point'}));open(group,()=>onTerminal(t));labels.append(group);
  if(t.probe)portLabels.push({label,x,y,left:bx-8,top:by-31,width});
 }
 function setScale(scale,camera){
  svg.classList.toggle('overview-distant',scale<.32);svg.classList.toggle('overview-tiny',scale<.07);
  for(const marker of markers.querySelectorAll('circle'))marker.setAttribute('r',Math.max(24,7/Math.max(.001,scale)));
  const factor=Math.max(1,.44/Math.max(.001,scale)),gap=4/Math.max(.001,scale);
  const placed=[...markers.querySelectorAll('circle')].map(marker=>{const r=Number(marker.getAttribute('r'));return {x:Number(marker.getAttribute('cx'))-r,y:Number(marker.getAttribute('cy'))-r,width:2*r,height:2*r};});
  if(scale>=.32)placed.push(...controlBoxes);
  const frame=camera?.frame,bounds=frame?{left:(frame.x+8-camera.x)/scale,right:(frame.x+frame.width-8-camera.x)/scale,top:(frame.y+8-camera.y)/scale,bottom:(frame.y+frame.height-8-camera.y)/scale}:{left:0,right:OVERVIEW_SIZE[0],top:0,bottom:OVERVIEW_SIZE[1]};
  // Keep the two endpoints legible even when the whole circuit is fitted.
  const portScale=Math.max(1,.55/scale);
  for(const {label,x,y,left,top,width}of portLabels){
   label.setAttribute('transform',`translate(${x} ${y}) scale(${portScale}) translate(${-x} ${-y})`);
   placed.push({x:x+(left-x)*portScale,y:y+(top-y)*portScale,width:width*portScale,height:43*portScale});
  }
  for(const {tag,point,width,leader,area}of tags){
   const [ax,ay,aw,ah]=area.box;
   const anchorOutside=point[0]<bounds.left||point[0]>bounds.right||point[1]<bounds.top||point[1]>bounds.bottom;
   const offscreen=ax+aw<bounds.left||ax>bounds.right||ay+ah<bounds.top||ay>bounds.bottom||(scale>=.32&&anchorOutside);
   tag.style.display=offscreen?'none':'';
   if(offscreen){leader.style.display='none';continue;}
   const w=width*factor,h=42*factor,x=Math.max(bounds.left+10*factor,Math.min(bounds.right-w+10*factor,point[0]));
   let y=point[1];
   for(let attempt=0;attempt<50;attempt++){
    const offset=attempt===0?0:Math.ceil(attempt/2)*(attempt%2?-1:1);
    y=Math.max(bounds.top+28*factor,Math.min(bounds.bottom-14*factor,point[1]+offset*56*factor));
    const box={x:x-10*factor,y:y-28*factor,width:w,height:h};
    if(!placed.some(b=>box.x<b.x+b.width+gap&&box.x+box.width>b.x-gap&&box.y<b.y+b.height+gap&&box.y+box.height>b.y-gap)||attempt===49){placed.push(box);break;}
   }
   tag.setAttribute('transform',`translate(${x} ${y}) scale(${factor})`);
   leader.setAttribute('d',line([point,[Math.max(x-10*factor,Math.min(x+w-10*factor,point[0])),Math.max(y-28*factor,Math.min(y+14*factor,point[1]))]]));
   leader.style.display=Math.abs(x-point[0])+Math.abs(y-point[1])>1?'':'none';
  }
 }
 function highlight(focus=[]){const active=new Set(focus.filter(key=>Object.hasOwn(colors,key)));for(const group of [...groups,...devices.children])group.classList.toggle('overview-muted',active.size>0&&!active.has(group.dataset.part));for(const {tag}of tags)tag.classList.toggle('overview-muted',active.size>0&&!active.has(tag.dataset.part));}
 return {svg,routes,markers,groups,setScale,highlight};
}
