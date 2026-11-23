export function initSidebar() {
const $ = id => document.getElementById(id);
const wideLayout = window.matchMedia('(min-width: 1100px)');
const chapterResize=$('chapter-resize'), mapPanel=$('simulator-panel');
let chapterWidth=wideLayout.matches?248:264, chapterDrag=null;
function chapterWidthLimits() {
  const max=Math.max(0,Math.min(480,mapPanel.clientWidth-(wideLayout.matches?720:48)));
  return {min:Math.min(200,max),max};
}
function applyChapterWidth(width=chapterWidth) {
  const {min,max}=chapterWidthLimits();
  const actual=Math.round(Math.max(min,Math.min(max,width)));
  mapPanel.style.setProperty('--chapter-width',`${actual}px`);
  chapterResize.setAttribute('aria-valuemin',String(min));
  chapterResize.setAttribute('aria-valuemax',String(max));
  chapterResize.setAttribute('aria-valuenow',String(actual));
  return actual;
}
function finishChapterDrag() {
  if (!chapterDrag) return;
  const {id}=chapterDrag;
  chapterDrag=null;document.body.classList.remove('chapter-resizing');
  if (chapterResize.hasPointerCapture(id)) chapterResize.releasePointerCapture(id);
}
chapterResize.addEventListener('pointerdown',event=>{
  if (event.button!==0 || !event.isPrimary) return;
  event.preventDefault();chapterResize.focus({preventScroll:true});
  chapterDrag={id:event.pointerId,x:event.clientX,width:$('chapter-sidebar').getBoundingClientRect().width};
  chapterResize.setPointerCapture(event.pointerId);
  document.body.classList.add('chapter-resizing');
});
chapterResize.addEventListener('pointermove',event=>{
  if (!chapterDrag || event.pointerId!==chapterDrag.id) return;
  chapterWidth=applyChapterWidth(chapterDrag.width+event.clientX-chapterDrag.x);
});
chapterResize.addEventListener('pointerup',finishChapterDrag);
chapterResize.addEventListener('pointercancel',finishChapterDrag);
chapterResize.addEventListener('lostpointercapture',finishChapterDrag);
chapterResize.addEventListener('keydown',event=>{
  if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
  event.preventDefault();
  const {min,max}=chapterWidthLimits();
  const current=Number(chapterResize.getAttribute('aria-valuenow'));
  chapterWidth=applyChapterWidth(event.key==='Home'?min:event.key==='End'?max:current+(event.key==='ArrowLeft'?-16:16));
});
new ResizeObserver(()=>{finishChapterDrag();applyChapterWidth();}).observe(mapPanel);
applyChapterWidth();
function setSidebar(open,moveFocus=false) {
  const sidebar=$('chapter-sidebar');
  const restoreFocus=!open && sidebar.contains(document.activeElement);
  if (!open) finishChapterDrag();
  sidebar.hidden=!open;
  document.body.classList.toggle('sidebar-open',open);
  $('chapter-toggle').setAttribute('aria-expanded',String(open));
  $('chapter-backdrop').hidden=!open || wideLayout.matches;
  $('map-workspace').inert=open && !wideLayout.matches;
  $('course-workspace').inert=open && !wideLayout.matches;
  if (moveFocus && open) (sidebar.querySelector('[aria-current=step]') || sidebar.querySelector('[data-lesson]')).focus({preventScroll:true});
  else if (moveFocus || restoreFocus) $('chapter-toggle').focus({preventScroll:true});
}
$('chapter-toggle').addEventListener('click',()=>setSidebar($('chapter-sidebar').hidden,true));
$('chapter-backdrop').addEventListener('click',()=>setSidebar(false,true));
wideLayout.addEventListener('change',()=>setSidebar(wideLayout.matches));
setSidebar(wideLayout.matches);

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape' && !$('chapter-sidebar').hidden && !wideLayout.matches){
      setSidebar(false,true);
    }
  });
  return () => {if (!wideLayout.matches) setSidebar(false);};
}
