// A reading schematic of the COMPLETE circuit on EDU DIY Kick Drum p.2.
// Port order: opamp −,+,out; transistor B,C,E; pot first,end,wiper.
// Each component has an electrical net name per port, independently of layout.
// No numerical waveform for this complete circuit is claimed or generated.
export const OVERVIEW_SIZE=[3300,1800];
// Keep input wiring and ground symbols outside the amplifier body.
export const OVERVIEW_OPAMP_INPUT_LEAD=60;
export const OVERVIEW_COMPONENTS=[];
const add=(id,type,value,part,nets,posts,extra={})=>OVERVIEW_COMPONENTS.push({id,type,value,part,nets,posts,...extra});
const two=(id,type,value,part,nets,a,b,extra)=>add(id,type,value,part,nets,[a,b],extra);
const r=(id,value,part,nets,a,b,extra)=>two(id,'resistor',value,part,nets,a,b,extra);
const c=(id,value,part,nets,a,b,extra)=>two(id,'capacitor',value,part,nets,a,b,extra);
const d=(id,part,nets,a,b)=>two(id,'diode','1N4148',part,nets,a,b);
const pot=(id,value,part,nets,a,b,tap)=>add(id,'pot',value,part,nets,[a,b,tap]);
const amp=(id,part,nets,x,y)=>add(id,'opamp','',part,nets,[[x-OVERVIEW_OPAMP_INPUT_LEAD,y-40],[x-OVERVIEW_OPAMP_INPUT_LEAD,y+40],[x+120,y]]);
const q=(id,polarity,part,nets,x,y)=>add(id,'transistor',polarity,part,nets,[[x,y],[x+60,y+(polarity==='PNP'?70:-70)],[x+60,y+(polarity==='PNP'?-70:70)]]);
// 1. Gate-to-trigger conversion, accent control and output buffer.
c('Cin','10nF','trigger',['gate','rc'],[180,1320],[300,1320]);
r('Rgate','39kΩ','trigger',['rc','gnd'],[360,1320],[360,1480],{labelSide:-1});
d('Dprotect','trigger',['gnd','rc'],[460,1480],[460,1320]);
r('RrefGnd','33kΩ','trigger',['gnd','ref'],[260,1100],[400,1100]);
r('RrefVcc','100kΩ','trigger',['ref','vcc'],[400,1100],[540,1100]);
amp('Utrigger','trigger',['ref','rc','cmp'],540,1280);
r('Rtrigger','100kΩ','trigger',['cmp','accentNode'],[660,1280],[820,1280]);
r('Raccent','22kΩ','trigger',['accentNode','accentE'],[860,1280],[860,1510],{labelSide:-1});
r('RaccentMax','120kΩ','trigger',['accentNode','gnd'],[930,1280],[930,1650]);
q('Qaccent','PNP','trigger',['accentCV','gnd','accentE'],800,1580);
q('QtriggerBuffer','NPN','trigger',['accentNode','vcc','trigger'],980,1280);
// 2. Resonator, including the input divider present in the complete circuit.
r('Rinput','100kΩ','resonator',['trigger','u'],[1560,1380],[1760,1380]);
r('RinputGnd','14kΩ','resonator',['u','gnd'],[1900,1380],[1900,1540]);
c('C1','15nF','resonator',['a','m'],[1940,520],[2200,520]);
c('C2','15nF','resonator',['m','y'],[2200,520],[2440,520]);
r('Rb','1MΩ','resonator',['a','y'],[1940,1120],[2440,1120]);
amp('Uosc','resonator',['a','u','y'],2040,1280);
// 3a. Base pitch. 3b. Adjustable decay feedback, still connected to m.
pot('PITCH','250kΩ','pitch-decay',['m','pitchR','pitchR'],[2200,620],[2200,800],[2140,710]);
r('Rpitch','10kΩ','pitch-decay',['pitchR','gnd'],[2200,800],[2200,980]);
r('RdecayInput','47kΩ','pitch-decay',['y','fbMinus'],[2440,640],[2640,640]);
r('RdecayFixed','47kΩ','pitch-decay',['fbMinus','fb'],[2640,460],[2860,460]);
pot('DECAY','1MΩ','pitch-decay',['fbMinus','fb','fbMinus'],[2640,300],[2860,300],[2780,240]);
amp('Udecay','pitch-decay',['fbMinus','gnd','fb'],2700,680);
r('Rf','470kΩ','pitch-decay',['m','fb'],[2200,160],[2860,160]);
// 4a. Pitch envelope, external pitch CV and emitter follower.
d('Denv','pitch-envelope',['trigger','env'],[1160,700],[1320,700]);
c('Cenv','220nF','pitch-envelope',['env','gnd'],[1370,700],[1370,900],{labelSide:-1});
pot('TUNE DECAY','100kΩ','pitch-envelope',['env','releaseR','releaseR'],[1510,700],[1510,920],[1570,810]);
r('Rrelease','10kΩ','pitch-envelope',['releaseR','releaseE'],[1510,920],[1510,1040]);
q('QpitchCV','PNP','pitch-envelope',['pitchWiper','gnd','releaseE'],1450,1110);
pot('PITCH CV','100kΩ','pitch-envelope',['pitchCV','gnd','pitchWiper'],[1300,1040],[1300,1220],[1360,1130]);
q('QenvBuffer','NPN','pitch-envelope',['env','vcc','follower'],1710,700);
// 4b. Smoothing. Its right-hand end remains connected to the resonator.
c('Cs','5.6nF','pitch-envelope',['follower','smooth'],[1810,240],[1930,240]);
d('Dsmooth','pitch-envelope',['smooth','gnd'],[1960,240],[1960,380]);
r('Rsmooth','1MΩ','pitch-envelope',['smooth','m'],[2020,240],[2200,240]);
// 4c. The transistor collector acts on the same m node as C1/C2/PITCH.
r('Rbase','100kΩ','pitch-envelope',['follower','pitchBase'],[1810,770],[1960,770]);
q('Qpitch','NPN','pitch-envelope',['pitchBase','m','depthR'],2000,770);
pot('TUNE DEPTH','10kΩ','pitch-envelope',['depthR','depthBottom','depthBottom'],[2060,840],[2060,1000],[2000,920]);
r('Rdepth','2kΩ','pitch-envelope',['depthBottom','gnd'],[2060,1000],[2060,1160],{labelSide:-1});
// 5. Tone. The wiper is connected to the input end in the original drawing.
pot('TONE','50kΩ','tone',['y','tone','y'],[2440,1480],[2640,1480],[2540,1420]);
c('Ct','15nF','tone',['tone','gnd'],[2700,1480],[2700,1640]);
// 6. Distortion/output: all four feedback branches have the same two nets.
pot('DISTORTION','100kΩ','distortion-output',['distMinus','out','distMinus'],[2780,920],[3080,920],[2930,860]);
c('Cf','3.3nF','distortion-output',['distMinus','out'],[2780,1040],[3080,1040]);
d('DclipA','distortion-output',['out','distMinus'],[3080,1160],[2780,1160]);
d('DclipB','distortion-output',['distMinus','out'],[2780,1280],[3080,1280]);
r('RdistGnd','33kΩ','distortion-output',['distMinus','gnd'],[2680,1180],[2680,1340],{labelSide:-1});
amp('Udist','distortion-output',['distMinus','tone','out'],2840,1440);

// Named controls get connected labels outside their wiper wiring.
const controlLabels={'PITCH':[2260,820],'DECAY':[2900,330],'TUNE DECAY':[1627,858],'PITCH CV':[1190,1270],'TUNE DEPTH':[1772,1034],'TONE':[2460,1540],'DISTORTION':[3100,850]};
for(const c of OVERVIEW_COMPONENTS)if(controlLabels[c.id])c.callout=controlLabels[c.id];

// Physical wires. Crossings without a terminal/junction remain unconnected.
export const OVERVIEW_WIRES=[];
const w=(net,points,route)=>OVERVIEW_WIRES.push({net,points,route});
w('gate',[[120,1320],[180,1320]],'gate');
w('rc',[[300,1320],[480,1320]]);
w('ref',[[400,1100],[400,1240],[480,1240]]);
w('cmp',[[660,1280],[680,1280]],'trigger-main');
w('accentNode',[[820,1280],[980,1280]],'trigger-main');
w('trigger',[[1040,1350],[1040,1380],[1560,1380]],'trigger-main');
w('trigger',[[1160,1380],[1160,700]],'envelope-branch');
w('env',[[1320,700],[1710,700]],'envelope-branch');
w('releaseR',[[1570,810],[1610,810],[1610,920],[1510,920]]);
w('pitchWiper',[[1360,1130],[1410,1130],[1410,1110],[1450,1110]]);
w('follower',[[1770,770],[1810,770]],'envelope-buffer');
w('follower',[[1810,770],[1810,240]],'envelope-buffer');
w('smooth',[[1930,240],[2020,240]],'envelope-return');
w('pitchBase',[[1960,770],[2000,770]],'envelope-return');
w('m',[[2060,700],[2060,620],[2200,620],[2200,160]],'envelope-return');
w('depthBottom',[[2000,920],[1980,920],[1980,1000],[2060,1000]]);
w('u',[[1760,1380],[1900,1380],[1900,1320],[1980,1320]],'osc-input');
w('a',[[1940,520],[1940,1240],[1980,1240]]);
w('y',[[2440,520],[2440,1480]],'osc-output');
w('y',[[2160,1280],[2440,1280]],'osc-output');
w('pitchR',[[2140,710],[2100,710],[2100,800],[2200,800]]);
w('fbMinus',[[2640,300],[2640,640]]);
w('fbMinus',[[2780,240],[2640,240],[2640,300]]);
w('fb',[[2860,160],[2860,680],[2820,680]],'decay-return');
w('tone',[[2640,1480],[2780,1480]],'tone-output');
w('y',[[2540,1420],[2440,1420],[2440,1480]]);
w('distMinus',[[2780,920],[2780,1400]]);
w('distMinus',[[2680,1180],[2780,1180]]);
w('distMinus',[[2930,860],[2780,860],[2780,920]]);
w('out',[[3080,920],[3080,1440]],'final-output');
w('out',[[2960,1440],[3200,1440]],'final-output');

export const OVERVIEW_TERMINALS=[
  {net:'gate',point:[120,1320],label:'GATE IN',part:'trigger',probe:'gate'},
  {net:'out',point:[3200,1440],label:'OUTPUT',part:'distortion-output',probe:'output'},
  {net:'accentCV',point:[800,1580],label:'ACCENT CV',part:'trigger',side:'left'},
  {net:'pitchCV',point:[1300,1040],label:'PITCH CV',part:'pitch-envelope',side:'left'},
];
export const OVERVIEW_POWER=[
  {net:'gnd',point:[260,1100]}, {net:'vcc',point:[540,1100]},
  {net:'gnd',point:[360,1480]}, {net:'gnd',point:[460,1480]},
  {net:'gnd',point:[860,1650]}, {net:'gnd',point:[930,1650]}, {net:'vcc',point:[1040,1210]},
  {net:'gnd',point:[1370,900]}, {net:'gnd',point:[1510,1180]}, {net:'gnd',point:[1300,1220]}, {net:'vcc',point:[1770,630]},
  {net:'gnd',point:[1960,380]}, {net:'gnd',point:[2060,1160]}, {net:'gnd',point:[2200,980]}, {net:'gnd',point:[1900,1540]},
  {net:'gnd',point:[2640,720]}, {net:'gnd',point:[2700,1640]}, {net:'gnd',point:[2680,1340]},
];
// Outlines mark reading ranges, not electrically independent modules.
export const OVERVIEW_AREAS=[
 {id:'trigger',part:'trigger',label:'1 トリガー',box:[80,1020,1050,710],tag:[100,1050]},
 {id:'resonator',part:'resonator',label:'2 発振回路',box:[1530,1080,990,530],outline:"M2118 1080H2520V1610H1530V1320H1870V1206H2118Z",tag:[1554,1560]},
 {id:'resonator-caps',part:'resonator',label:'2 コンデンサ',box:[1890,430,620,155],tag:[1900,450]},
 {id:'pitch',part:'pitch-decay',label:'3a 音程',box:[2110,650,270,410],fitBox:[2070,460,350,610],tag:[2210,690]},
 {id:'decay',part:'pitch-decay',label:'3b 減衰',box:[2500,210,470,590],fitBox:[2150,80,930,740],tag:[2530,230]},
 {id:'envelope',part:'pitch-envelope',label:'4a エンベロープ',box:[1134,548,662,796],outline:"M1134 548H1796V1010H1540V1344H1134Z",tag:[1156,595]},
 {id:'smoothing',part:'pitch-envelope',label:'4b 平滑化',box:[1730,80,620,360],tag:[1760,110]},
 {id:'pitch-control',part:'pitch-envelope',label:'4c 音程制御',box:[1758,626,349,576],outline:"M1803 626H2107V1202H1758V1017H1803Z",tag:[1822,672]},
 {id:'tone',part:'tone',label:'5 Tone',box:[2390,1390,380,330],tag:[2420,1685]},
 {id:'distortion-output',part:'distortion-output',label:'6 Distortion・出力',box:[2640,810,630,790],tag:[2690,825]},
];
export const OVERVIEW_CONNECTIONS={branch:[1160,1380],oscInput:[1760,1380],junction:[2200,520],crossing:[1940,770]};
// Observation bounds follow the real buffer, divider and marked nodes.
// The view fits these bounds only when the reader presses the focus button.
function focusBounds(ids,extraPoints=[]){
 const points=OVERVIEW_COMPONENTS.filter(c=>ids.includes(c.id)).flatMap(c=>c.posts).concat(extraPoints);
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 return {x:Math.min(...xs)-100,y:Math.min(...ys)-100,width:Math.max(...xs)-Math.min(...xs)+200,height:Math.max(...ys)-Math.min(...ys)+200};
}
export const OVERVIEW_FOCUS_TARGETS={
  'trigger-divider':{caption:'分岐点と分圧後の接続点を拡大',bounds:focusBounds(['QtriggerBuffer','Rinput','RinputGnd'])},
  'trigger-to-oscillator':{caption:'1の分岐点から2の＋端子までを拡大',bounds:focusBounds(['QtriggerBuffer','Rinput','RinputGnd','Uosc'])},
  'oscillator-to-output':{caption:'2の出力からOUTPUTまでを拡大',bounds:focusBounds(['Uosc','TONE','Ct','Udist'],[OVERVIEW_TERMINALS.find(t=>t.net==='out').point])},
};
