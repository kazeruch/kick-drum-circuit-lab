import {fitMapCamera} from './map-camera.js';
import {createCircuitMapView} from './circuit-map-view.js';
import {renderOverviewCircuit,overviewBounds,WIRE_ROUTES} from './overview-circuit.js';
import {OVERVIEW_AREAS,OVERVIEW_CONNECTIONS as connections,OVERVIEW_FOCUS_TARGETS,OVERVIEW_TERMINALS} from './overview-circuit-data.js';
export {WIRE_ROUTES};

const NS='http://www.w3.org/2000/svg';
const node=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
export function initOverviewMap({container,chapters,onNext,onPrevious}){
  let schematic,fitButton,shown=false,overviewCard=null;
  const wholeBounds=overviewBounds('all');
  const view=createCircuitMapView({container,prefix:'whole-map',onCameraChange(camera){
    schematic?.setScale(camera.scale,camera);
    if(!fitButton)return;
    const full=fitMapCamera(camera.frame,wholeBounds);
    fitButton.hidden=Math.abs(full.scale-camera.scale)<1e-6 && Math.abs(full.x-camera.x)<1 && Math.abs(full.y-camera.y)<1;
    if(fitButton.hidden && document.activeElement===fitButton)get('map-viewport').focus({preventScroll:true});
  }}),get=view.get,root=view.root;
  root.classList.add('whole-circuit-view','overview-reading-map');
  get('core-overview').hidden=true;get('focus-target').hidden=true;root.querySelector('.view-switch').hidden=true;
  get('map-key').hidden=true;
  get('section-outline').hidden=true;get('reading-progress').hidden=true;
  get('comment-tabs').replaceChildren();get('comment-tabs').hidden=true;
  root.querySelector('.core-toolbar').hidden=true;
  get('wave-sheet').hidden=true;get('settings-panel').hidden=true;get('inspect-content').hidden=true;get('lesson-preview').hidden=true;get('lesson-detail').hidden=true;
  get('map-viewport').setAttribute('aria-label','マニュアルp.2に沿って描き直した全体回路図。部品や端子を押すと、その周辺を拡大します。番号付きの範囲名を押すと、その範囲を拡大します。');
  get('circuit-title').textContent='EDU DIY Kick Drumの全体回路図';get('circuit-desc').textContent='左下のGATE INから1のトリガー、2の発振回路へ進み、5のToneと6のDistortionを経て右下のOUTPUTへつながります。3と4は発振回路の音程や減衰に作用します。';
  root.querySelector('.map-hint').remove();
  function focusLandmark(key,label,focus){
    view.setTarget(key,label,focus);
    view.focusTarget();
  }
  schematic=renderOverviewCircuit({chapters,reading:true,
    onPart:(key,area)=>focusLandmark(key,area.label,{bounds:overviewBounds(area.id),caption:area.label+'を拡大'}),
    onComponent:c=>focusLandmark(c.id,c.id),
    onTerminal:t=>focusLandmark(t.probe||t.net,t.label),
  });
  const {svg,routes,markers}=schematic;
  view.mountCircuit(svg);
  const actions=document.createElement('div');
  actions.className='overview-map-actions';
  fitButton=get('fit-circuit');
  fitButton.textContent='全体表示';
  actions.append(get('show-explanation'),fitButton);
  get('circuit-area').append(actions);
  function setCardTarget(card){
    const areas=card.focusAreas;
    const label=card.target==='gate'?'GATE IN':card.target==='output'?'OUTPUT':chapters.find(c=>c.id===card.target)?.shortTitle||'注目箇所';
    const focus=areas?{caption:card.focusCaption||`${OVERVIEW_AREAS.find(a=>a.id===areas[0]).label}を拡大`,bounds:overviewBounds(...areas)}:OVERVIEW_FOCUS_TARGETS[card.focusTarget];
    view.setTarget(card.target,label,focus);
  }
  fitButton.addEventListener('click',()=>{
    if(overviewCard)setCardTarget(overviewCard);
  });
  get('lesson-next-bottom').addEventListener('click',onNext);
  get('lesson-previous-bottom').addEventListener('click',onPrevious);
  const check=document.createElement('details'),question=document.createElement('summary'),answer=document.createElement('p');check.className='chapter-question';check.append(question,answer);get('guided-content').querySelector('.popup-body').append(check);
  function showText(paragraph, card){
    paragraph.replaceChildren();
    if(!card)return;
    if(!card.landmarks){paragraph.textContent=card.text;return;}
    let start=0;
    for(const name of card.landmarks){
      const index=card.text.indexOf(name,start);
      if(index<0)continue;
      const button=document.createElement('button');
      button.type='button';button.className='overview-text-focus';button.textContent=name;
      button.setAttribute('aria-label',`${name}を図で拡大`);
      button.addEventListener('click',()=>{
        const area=OVERVIEW_AREAS.find(a=>a.label===name);
        if(area){
          focusLandmark(area.part,name,{bounds:overviewBounds(area.id),caption:`${name}を拡大`});
          return;
        }
        const terminal=OVERVIEW_TERMINALS.find(t=>t.label===name);
        focusLandmark(terminal?.probe||terminal?.net||name,name);
      });
      paragraph.append(document.createTextNode(card.text.slice(start,index)),button);
      start=index+name.length;
    }
    paragraph.append(document.createTextNode(card.text.slice(start)));
  }
  function setStep(chapter,card,position){
    overviewCard=chapter.kind==='overview'?card:null;
    const section=chapter.sections[position.section],number=position.section+1;
    get('popup-label').textContent=overviewCard?chapter.title:`全体図 · ${section.title}`;
    get('lesson-title').textContent=overviewCard?`0.${number} ${card.title}`:card.title;
    showText(get('lesson-comment-text'),card);get('guided-content').querySelector('.popup-body').scrollTop=0;
    get('lesson-detail').hidden=!card.detail;get('lesson-detail').open=false;get('lesson-detail-summary').textContent=card.detail?.title||'';
    showText(get('lesson-detail-text'),card.detail);
    get('lesson-previous-bottom').textContent=overviewCard&&number>1?`0.${number-1}へ`:'前の説明';
    get('comment-next-caption').textContent=card.nextCaption||(number<chapter.sections.length?`0.${number+1}へ`:'0.1へ戻る');
    routes.replaceChildren();for(const key of card.routes||[]){const route=WIRE_ROUTES[key];routes.append(node('path',{d:route.d,stroke:route.color,'data-route':key}));}
    markers.replaceChildren();for(const key of card.nodes||[]){const [x,y]=connections[key];markers.append(node('circle',{cx:x,cy:y,r:24,'data-node':key}));}
    check.hidden=!card.question;check.open=false;question.textContent=card.question||'';answer.textContent=card.answer||'';
    schematic.highlight(card.focus);
    view.setPopup(true);setCardTarget(card);view.refresh();
  }
  return {setStep,getElement:get,setVisible(value){view.setVisible(value);if(value&&!shown){view.refresh(true);shown=true;}}};
}
