// Fit and manual zoom share one domain, including large source diagrams.
export const MIN_MAP_SCALE = .001;
export const MAX_MAP_SCALE = 2.8;
export const WHEEL_ZOOM_SENSITIVITY = 0.002;
const COMPONENT_FOCUS_SCALE = 0.75;
export function mapScale(value) {
  return Math.max(MIN_MAP_SCALE, Math.min(MAX_MAP_SCALE, value));
}
// Insets shrink with the available frame. Fixed top/bottom reservations could
// leave only a single pixel for a circuit when the waveform was expanded.
export function fitMapCamera(frame,bounds,{controls=false}={}) {
  const left=Math.min(20,frame.width*.04),top=Math.min(controls?76:20,frame.height*.16),bottom=Math.min(24,frame.height*.1);
  const width=Math.max(1,frame.width-left*2),height=Math.max(1,frame.height-top-bottom);
  const scale=mapScale(Math.min(width/bounds.width,height/bounds.height,1.05));
  return {scale,x:frame.x+left+(width-bounds.width*scale)/2-bounds.x*scale,
    y:frame.y+top+(height-bounds.height*scale)/2-bounds.y*scale};
}
export function focusMapTarget(camera, frame, point) {
  const scale = mapScale(Math.max(COMPONENT_FOCUS_SCALE, camera.scale));
  return {scale, x: frame.x + frame.width / 2 - point[0] * scale,
    y: frame.y + frame.height / 2 - point[1] * scale};
}
