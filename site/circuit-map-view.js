// The circuit chapters use the actual chapter-02 DOM structure. This module
// owns only its view interactions; numerical models and lesson content belong
// to the caller. The original workspace and its event listeners are untouched.
import {bindPopupResize} from './popup-resize.js';
import {mapScale,focusMapTarget,fitMapCamera,WHEEL_ZOOM_SENSITIVITY} from './map-camera.js';
const SVG_NS = 'http://www.w3.org/2000/svg';
const WAVE_PEEK = 48;
const ZOOM_STEP = 1.25;
let viewCount = 0;
let pristineWorkspace = null;

function attributesOf(element) {
  if (typeof element.getAttributeNames === 'function') return element.getAttributeNames().map(name => [name, element.getAttribute(name)]);
  return [...element.attributes || []].map(attribute => Array.isArray(attribute) ? attribute : [attribute.name, attribute.value]);
}

function prefixIdentifiers(tree, prefix, lookup) {
  const elements = [tree, ...tree.querySelectorAll('*')];
  const replacements = new Map();
  for (const element of elements) {
    const oldId = element.getAttribute('id') || element.id;
    if (!oldId) continue;
    const id = `${prefix}-${oldId}`;
    replacements.set(oldId, id);
    element.classList.add(oldId);
    element.dataset.ui = oldId;
    element.setAttribute('id', id);
    if (lookup) lookup.set(oldId, element);
  }
  const tokenReferences = new Set(['aria-controls', 'aria-labelledby', 'aria-describedby', 'aria-owns', 'aria-activedescendant', 'aria-details', 'aria-errormessage', 'for', 'list', 'form', 'headers']);
  for (const element of elements) {
    for (const [name, value] of attributesOf(element)) {
      if (typeof value !== 'string') continue;
      let next = value;
      if (tokenReferences.has(name)) next = value.split(/\s+/).map(id => replacements.get(id) || id).join(' ');
      if ((name === 'href' || name === 'xlink:href') && value.startsWith('#')) next = `#${replacements.get(value.slice(1)) || value.slice(1)}`;
      next = next.replace(/url\(\s*['"]?#([^\s)'";]+)['"]?\s*\)/g, (match, id) => replacements.has(id) ? `url(#${replacements.get(id)})` : match);
      if (next !== value) element.setAttribute(name, next);
    }
  }
}

/** Clone chapter 02's workspace, preserving its shared classes and geometry.
 * get() accepts the original ID; public IDs and all local ID references are
 * prefixed. mountCircuit() moves an SVG (or {svg}) into its camera world.
 */
export function createCircuitMapView({ container, prefix = 'part-map', onCameraChange } = {}) {
  if (!container) throw new Error('回路マップの表示先が必要です。');
  const template = document.getElementById('map-workspace');
  if (!template) throw new Error('共通回路マップの原型が見つかりません。');
  // Later experiments can open after the core observation panel has installed
  // its controls. Clone the same untouched workspace used by the first view;
  // cloning the live core would duplicate controls and their identifiers.
  pristineWorkspace ||= template.cloneNode(true);
  const root = pristineWorkspace.cloneNode(true);
  const ids = new Map();
  const instancePrefix = String(prefix).replace(/[^a-zA-Z0-9_-]/g, '-') || `circuit-map-${++viewCount}`;
  prefixIdentifiers(root, instancePrefix, ids);
  root.classList.add('circuit-map-view');
  root.dataset.mode = 'guided';
  root.dataset.mapView = instancePrefix;
  root.hidden = false;
  root.inert = false;
  container.append(root);
  const get = id => ids.get(id) || null;
  const stage = get('map-stage'), viewport = get('map-viewport'), circuitArea = get('circuit-area');
  const diagram = get('circuit-diagram'), world = get('circuit-world');
  const popup = get('map-popup'), connector = get('popup-connector'), connectorPath = get('popup-line');
  const anchor = get('comment-anchor'), waveHandle = get('wave-handle');
  const listeners = [], observers = [];
  let destroyed = false, visible = true, mounted = null, targetKey = null, targetPoint = [400, 220];
  let circuitBounds = { x: 0, y: 0, width: 800, height: 440 };
  let targetBounds = null;
  let mapDrag = null, waveDrag = null, suppressWaveClick = false;
  let waveHeight = WAVE_PEEK, lastWaveHeight, lastWidth = 0, lastHeight = 0, previousFrame='';
  const camera = { x: 0, y: 0, scale: 1, fitted: false };
  const listen = (element, type, callback, options) => {
    if (!element) return;
    element.addEventListener(type, callback, options);
    listeners.push(() => element.removeEventListener(type, callback, options));
  };
  const numeric = value => Number.parseFloat(value) || 0;
  const cssOf = element => typeof getComputedStyle === 'function' ? getComputedStyle(element) : {};
  const capture = (element, id) => element.setPointerCapture?.(id);
  const release = (element, id) => { if (element.hasPointerCapture?.(id)) element.releasePointerCapture(id); };
  const notify = (name, detail) => {
    if (typeof CustomEvent === 'function' && typeof root.dispatchEvent === 'function') root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
  };

  function popupIsStacked() { return get('map-content').clientWidth <= 900; }
  const popupResize = bindPopupResize(get, listen);
  function mapFrame() {
    const view = viewport.getBoundingClientRect(), area = circuitArea.getBoundingClientRect();
    return { x: area.left - view.left, y: area.top - view.top, width: area.width, height: area.height };
  }
  function positionPopup() {
    if (destroyed || !visible || popup.hidden || !anchor) return;
    const [tx, ty] = targetPoint;
    anchor.setAttribute('cx', tx); anchor.setAttribute('cy', ty);
    const stageRect = stage.getBoundingClientRect(), viewRect = viewport.getBoundingClientRect(), popupRect = popup.getBoundingClientRect();
    const width = popup.offsetWidth, height = popup.offsetHeight;
    if (!height || !width) return;
    const ax = viewRect.left - stageRect.left + camera.x + tx * camera.scale;
    const ay = viewRect.top - stageRect.top + camera.y + ty * camera.scale;
    const isVisible = ax >= viewRect.left - stageRect.left && ax <= viewRect.right - stageRect.left && ay >= viewRect.top - stageRect.top && ay <= viewRect.bottom - stageRect.top && !(ax >= popupRect.left - stageRect.left && ax <= popupRect.right - stageRect.left && ay >= popupRect.top - stageRect.top && ay <= popupRect.bottom - stageRect.top);
    connector.toggleAttribute('hidden', !isVisible);
    if (!isVisible) return;
    const p = { x: popupRect.left - stageRect.left, y: popupRect.top - stageRect.top };
    let ex = Math.max(p.x + 14, Math.min(p.x + width - 14, ax));
    let ey = Math.max(p.y + 14, Math.min(p.y + height - 14, ay));
    if (ax >= p.x && ax <= p.x + width) ey = ay < p.y ? p.y : p.y + height;
    else ex = ax < p.x ? p.x : p.x + width;
    const dx = ex - ax, dy = ey - ay;
    const controls = Math.abs(dx) > Math.abs(dy) ? `${ax + Math.sign(dx) * 28} ${ay - 36} ${ex - Math.sign(dx) * 28} ${ey - 36}` : `${ax + 28} ${ay + Math.sign(dy) * 28} ${ex + 28} ${ey - Math.sign(dy) * 28}`;
    connectorPath.setAttribute('d', `M${ax} ${ay}C${controls} ${ex} ${ey}`);
  }
  function drawCamera() {
    world.setAttribute('transform', `translate(${camera.x} ${camera.y}) scale(${camera.scale})`);
    viewport.style.backgroundSize = `${24 * camera.scale}px ${24 * camera.scale}px`;
    viewport.style.backgroundPosition = `${camera.x}px ${camera.y}px`;
    positionPopup();
    onCameraChange?.({...camera,frame:mapFrame()});
  }
  function fit(bounds=circuitBounds) {
    Object.assign(camera,fitMapCamera(mapFrame(),bounds,{controls:root.dataset.mode==='free'&&!root.classList.contains('wave-open')}));
    camera.fitted = true; drawCamera();
  }
  function zoom(factor, x, y) {
    const frame = mapFrame(); x ??= frame.x + frame.width / 2; y ??= frame.y + frame.height / 2;
    const next = mapScale(camera.scale * factor), ratio = next / camera.scale;
    camera.x = x - (x - camera.x) * ratio; camera.y = y - (y - camera.y) * ratio; camera.scale = next; camera.fitted = true; drawCamera();
  }
  function moveOutsidePopup() {
    if (!popup.hidden && mounted) {
      const figure = mounted.getBoundingClientRect(), panel = popup.getBoundingClientRect(), gap = numeric(cssOf(stage).gap);
      const overlap = figure.left < panel.right + gap && figure.right > panel.left - gap && figure.top < panel.bottom + gap && figure.bottom > panel.top - gap;
      if (overlap) {
        if (cssOf(popup).gridRowStart === '2' || popupIsStacked()) camera.y -= figure.bottom - panel.top + gap;
        else camera.x += panel.right + gap - figure.left;
      }
    }
    drawCamera();
  }
  function refresh(refit = false) {
    if (destroyed || !visible) return;
    root.classList.toggle('settings-stacked',root.clientWidth<960);
    const stackedExplanation=popupIsStacked()&&!popup.hidden;root.classList.toggle('stacked-explanation',stackedExplanation);get('map-content').style.minHeight=stackedExplanation?`${waveHeight+600}px`:'0px';
    popupResize.refresh();
    const width = viewport.clientWidth, height = viewport.clientHeight;
    if (!width || !height) return;
    diagram.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const canvasChanged = width !== lastWidth || height !== lastHeight;
    lastWidth = width; lastHeight = height;
    const frameKey=JSON.stringify(mapFrame()),frameChanged=frameKey!==previousFrame;previousFrame=frameKey;
    if (refit || !camera.fitted) fit();
    else if(frameChanged || canvasChanged) revealTarget();
    else drawCamera();
  }
  function revealTarget(){
    const frame=mapFrame(),x=camera.x+targetPoint[0]*camera.scale,y=camera.y+targetPoint[1]*camera.scale;
    const insetX=Math.min(48,frame.width/4),insetY=Math.min(48,frame.height/4);
    camera.x+=Math.max(frame.x+insetX,Math.min(frame.x+frame.width-insetX,x))-x;
    camera.y+=Math.max(frame.y+insetY,Math.min(frame.y+frame.height-insetY,y))-y;
    drawCamera();
  }
  function targetElement(key = targetKey) {
    return [...world.querySelectorAll('[data-probe]')].find(element => element.getAttribute('data-probe') === String(key)) || null;
  }
  function setTarget(key,label,{bounds=null,caption}={}) {
    const nextKey=Array.isArray(key)?key[0]:key;
    if(label||caption||nextKey!==targetKey||bounds)targetBounds=bounds;
    targetKey=nextKey;
    if(label||caption){const text=caption||`${label}の周辺を拡大`;get('focus-target').textContent=text;get('reading-focus').textContent=text;}
    const selected = targetElement();
    if(targetBounds)targetPoint=[targetBounds.x+targetBounds.width/2,targetBounds.y+targetBounds.height/2];
    else if(selected?.dataset.focusX!==undefined&&selected?.dataset.focusY!==undefined)targetPoint=[Number(selected.dataset.focusX),Number(selected.dataset.focusY)];
    else if (selected) {
      const hit = selected.querySelector('.pl-part-hit') || selected.querySelector('.hit-box') || selected.querySelector('rect');
      if (hit && Number.isFinite(Number(hit.getAttribute('x')))) targetPoint = [Number(hit.getAttribute('x')) + Number(hit.getAttribute('width')) / 2, Number(hit.getAttribute('y')) + Number(hit.getAttribute('height')) / 2];
      else if (typeof selected.getBBox === 'function') { const box = selected.getBBox(); targetPoint = [box.x + box.width / 2, box.y + box.height / 2]; }
    } else targetPoint = [circuitBounds.x + circuitBounds.width / 2, circuitBounds.y + circuitBounds.height / 2];
    if (anchor) { anchor.setAttribute('cx', targetPoint[0]); anchor.setAttribute('cy', targetPoint[1]); }
    if (!popup.hidden && camera.fitted) {
      const frame = mapFrame(), x = camera.x + targetPoint[0] * camera.scale, y = camera.y + targetPoint[1] * camera.scale;
      if (x < frame.x + 12 || x > frame.x + frame.width - 12 || y < frame.y + 12 || y > frame.y + frame.height - 60) revealTarget();
    }
    positionPopup();
  }
  function mountCircuit(partSvg,{preserveCamera=false}={}) {
    const svg = partSvg?.svg || partSvg;
    if (!svg) throw new Error('表示する回路SVGが必要です。');
    const box = (svg.getAttribute('viewBox') || '0 0 800 440').split(/[\s,]+/).map(Number);
    circuitBounds = box.length === 4 && box.every(Number.isFinite) && box[2] > 0 && box[3] > 0 ? { x: box[0], y: box[1], width: box[2], height: box[3] } : { x: 0, y: 0, width: 800, height: 440 };
    // The caller's freshly created SVG owns its identifiers. In particular,
    // renderPartCircuit.setValues closes over its unique current-marker ID and
    // updates marker references later. Renaming that ID here would break those
    // updates. All IDs cloned from chapter 02 were already rebased above.
    svg.setAttribute('x', circuitBounds.x); svg.setAttribute('y', circuitBounds.y);
    svg.setAttribute('width', circuitBounds.width); svg.setAttribute('height', circuitBounds.height);
    svg.style.width = `${circuitBounds.width}px`; svg.style.height = `${circuitBounds.height}px`;
    svg.style.overflow = 'visible';
    mounted = svg;
    world.replaceChildren(svg);
    if (anchor) world.append(anchor);
    if(!preserveCamera)camera.fitted=false;setTarget(targetKey);refresh(!preserveCamera);
    return svg;
  }
  function setPopup(open, restoreFocus = false) {
    const changed = popup.hidden === Boolean(open);
    if (!open) popupResize.finish();
    popup.hidden = !open; stage.classList.toggle('explanation-open', Boolean(open));
    get('show-explanation').hidden=Boolean(open);
    connector.toggleAttribute('hidden', !open);
    if (anchor) anchor.style.display = open ? '' : 'none';
    refresh(); setTarget(targetKey);
    if (!open && restoreFocus) targetElement()?.focus?.({ preventScroll: true });
    notify('circuit-map-popup', { open: Boolean(open) });
  }
  function setSettingsOpen(open) {
    const panel = get('settings-panel'); if (!panel) return;
    panel.hidden = !open;root.classList.toggle('settings-open',Boolean(open));refresh(); notify('circuit-map-settings', { open: Boolean(open) });
  }

  function waveMaximum() { return Math.max(WAVE_PEEK, Math.floor(get('map-content').clientHeight * .8)); }
  function waveMinimum() { return Math.min(240, waveMaximum()); }
  function setWaveHeight(height, remember = false) {
    waveHeight = Math.max(WAVE_PEEK, Math.min(waveMaximum(), height));
    const open = waveHeight > WAVE_PEEK;
    root.classList.toggle('wave-open',open);
    root.style.setProperty('--wave-height', `${waveHeight}px`);
    get('measurements').hidden = !open;
    waveHandle.setAttribute('aria-valuemin', String(WAVE_PEEK));
    waveHandle.setAttribute('aria-valuemax', String(waveMaximum()));
    waveHandle.setAttribute('aria-valuenow', String(Math.round(waveHeight)));
    waveHandle.setAttribute('aria-valuetext', open ? `高さ${Math.round(waveHeight)}px` : '波形は閉じています');
    get('wave-caption').textContent = open ? '電圧の波形' : '波形';
    get('wave-toggle').textContent = open ? '波形を閉じる' : '波形を開く';
    get('wave-toggle').setAttribute('aria-expanded', String(open));
    if (remember && open) lastWaveHeight = waveHeight;
    refresh(); notify('circuit-map-wave', { open, height: waveHeight });
  }
  function setWaveOpen(open,{ratio}={}) { setWaveHeight(open ? Math.max(waveMinimum(), ratio?get('map-content').clientHeight*ratio:lastWaveHeight || get('map-content').clientHeight * (root.dataset.mode==='guided'?.4:.56)) : WAVE_PEEK, true); }

  listen(viewport, 'pointerdown', event => {
    if (event.button !== 0 || event.target.closest?.('.part') || event.target.closest?.('.pl-part') || event.target.closest?.('[role="button"]')) return;
    mapDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, cx: camera.x, cy: camera.y };
    capture(viewport, event.pointerId); viewport.classList.add('dragging');
  });
  listen(viewport, 'pointermove', event => {
    if (!mapDrag || mapDrag.id !== event.pointerId) return;
    camera.x = mapDrag.cx + event.clientX - mapDrag.x; camera.y = mapDrag.cy + event.clientY - mapDrag.y; camera.fitted = true; drawCamera();
  });
  const finishMapDrag = () => { const previous = mapDrag; mapDrag = null; if (previous) release(viewport, previous.id); viewport.classList.remove('dragging'); };
  listen(viewport, 'pointerup', finishMapDrag); listen(viewport, 'pointercancel', finishMapDrag); listen(viewport, 'lostpointercapture', finishMapDrag);
  listen(viewport, 'wheel', event => { event.preventDefault(); const rect = viewport.getBoundingClientRect(); zoom(Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY), event.clientX - rect.left, event.clientY - rect.top); }, { passive: false });
  listen(viewport, 'keydown', event => {
    if (event.target !== viewport || !['+', '=', '-', '0','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
    if(event.key.startsWith('Arrow')){event.preventDefault();const step=event.shiftKey?120:40;camera.x+=event.key==='ArrowLeft'?step:event.key==='ArrowRight'?-step:0;camera.y+=event.key==='ArrowUp'?step:event.key==='ArrowDown'?-step:0;camera.fitted=true;drawCamera();return;}
    event.preventDefault(); event.key === '0' ? fit() : zoom(event.key === '-' ? 1 / ZOOM_STEP : ZOOM_STEP);
  });
  listen(waveHandle, 'pointerdown', event => {
    if (event.button !== 0 || event.isPrimary === false) return;
    event.preventDefault(); waveHandle.focus?.({ preventScroll: true }); suppressWaveClick = false;
    waveDrag = { id: event.pointerId, y: event.clientY, height: waveHeight, moved: false }; capture(waveHandle, event.pointerId);
  });
  listen(waveHandle, 'pointermove', event => {
    if (!waveDrag || event.pointerId !== waveDrag.id) return;
    const delta = waveDrag.y - event.clientY;
    if (Math.abs(delta) > 4) waveDrag.moved = true;
    if (!waveDrag.moved) return;
    root.classList.add('wave-resizing'); setWaveHeight(waveDrag.height + delta);
  });
  function finishWaveDrag(event, cancel = false) {
    if (!waveDrag || event.pointerId !== waveDrag.id) return;
    const { id, moved, height } = waveDrag; waveDrag = null; root.classList.remove('wave-resizing'); suppressWaveClick = cancel || moved;
    if (cancel) setWaveHeight(height);
    else if (moved) setWaveHeight(waveHeight < WAVE_PEEK + 32 ? WAVE_PEEK : Math.max(waveMinimum(), waveHeight), true);
    release(waveHandle, id);
  }
  listen(waveHandle, 'pointerup', event => finishWaveDrag(event)); listen(waveHandle, 'pointercancel', event => finishWaveDrag(event, true)); listen(waveHandle, 'lostpointercapture', event => finishWaveDrag(event, true));
  listen(waveHandle, 'click', event => { if (suppressWaveClick && event.detail !== 0) { suppressWaveClick = false; return; } suppressWaveClick = false; setWaveOpen(waveHeight === WAVE_PEEK); });
  listen(get('wave-toggle'), 'click', () => setWaveOpen(waveHeight === WAVE_PEEK));
  listen(waveHandle, 'keydown', event => {
    if (['Enter', ' '].includes(event.key)) { event.preventDefault(); suppressWaveClick = false; setWaveOpen(waveHeight === WAVE_PEEK); return; }
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') setWaveOpen(false);
    else if (event.key === 'End') setWaveHeight(waveMaximum(), true);
    else if (event.key === 'ArrowUp') waveHeight === WAVE_PEEK ? setWaveOpen(true) : setWaveHeight(waveHeight + 40, true);
    else setWaveHeight(waveHeight <= waveMinimum() ? WAVE_PEEK : Math.max(waveMinimum(), waveHeight - 40), true);
  });
  listen(get('popup-close'), 'click', () => setPopup(false, true));
  function focusTarget(){
    if(targetBounds)fit(targetBounds);
    else{Object.assign(camera,focusMapTarget(camera,mapFrame(),targetPoint),{fitted:true});drawCamera();}
  }
  listen(get('focus-target'),'click',focusTarget);
  listen(get('reading-focus'),'click',focusTarget);
  listen(get('fit-circuit'),'click',()=>fit());
  listen(get('show-explanation'),'click',()=>setPopup(true));
  listen(get('settings-close'), 'click', () => setSettingsOpen(false));
  listen(root, 'keydown', event => {
    if (event.key !== 'Escape' || !visible) return;
    if (!get('settings-panel').hidden) setSettingsOpen(false);
    else if (!get('measurements').hidden) { setWaveOpen(false); waveHandle.focus?.({ preventScroll: true }); }
    else if (!popup.hidden) setPopup(false, true);
    else return;
    event.preventDefault(); event.stopPropagation?.();
  });
  if (typeof ResizeObserver === 'function') {
    const observe = (callback, elements) => { const observer = new ResizeObserver(callback); elements.forEach(element => observer.observe(element)); observers.push(observer); };
    observe(() => refresh(), [viewport, circuitArea]);
    observe(positionPopup, [popup]);
    observe(() => refresh(), [stage]);
    observe(() => { setWaveHeight(Math.min(waveHeight, waveMaximum())); }, [root]);
  }
  get('settings-panel').hidden = true;
  setWaveOpen(false); setPopup(true); refresh(true);
  return {
    root, get, mountCircuit, setPopup, setWaveOpen, setSettingsOpen, setTarget, focusTarget, refresh, fitBounds:bounds=>{if(popup.hidden)targetPoint=[bounds.x+bounds.width/2,bounds.y+bounds.height/2];fit(bounds);},
    getCamera:()=>({...camera}),setCamera:value=>{Object.assign(camera,value);drawCamera();},
    setVisible(value) { visible = Boolean(value); root.hidden = !visible; if (!visible) { finishMapDrag(); popupResize.finish(); if (waveDrag) finishWaveDrag({ pointerId: waveDrag.id }, true); } else refresh(); },
    destroy() { if (destroyed) return; finishMapDrag(); popupResize.finish(); if (waveDrag) finishWaveDrag({ pointerId: waveDrag.id }, true); destroyed = true; listeners.forEach(remove => remove()); observers.forEach(observer => observer.disconnect()); root.remove(); ids.clear(); },
  };
}
