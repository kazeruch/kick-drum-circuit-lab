// A side panel grows from its top left; a panel below the diagram grows from its bottom left.
export function bindPopupResize(get, listen = (element, type, handler) => element.addEventListener(type, handler)) {
  const stage = get('map-stage');
  const widthHandle = get('popup-resize-width'), heightHandle = get('popup-resize-height');
  const corner = get('popup-resize-corner');
  const isStacked = () => get('map-content').clientWidth <= 900;
  const sideSize = { width: 520, height: 520 };
  const stackedSize = { width: Infinity, height: 420 };
  const clamp = (value, min, max) => Math.round(Math.max(min, Math.min(max, value)));
  let drag = null;

  function dimensions() {
    const stacked = isStacked(), css = getComputedStyle(stage);
    const px = key => parseFloat(css[key]) || 0;
    const width = stage.clientWidth - px('paddingLeft') - px('paddingRight');
    const height = stage.clientHeight - px('paddingTop') - px('paddingBottom') - (stacked ? px('rowGap') : 0);
    const maxWidth = Math.max(0, stacked ? width : Math.min(640, width - px('columnGap') - 420));
    const maxHeight = Math.max(0, height - (stacked ? Math.min(140, height * .3) : 0));
    return {
      stacked, size: stacked ? stackedSize : sideSize,
      minWidth: Math.min(stacked ? 288 : 320, maxWidth), maxWidth,
      minHeight: Math.min(180, maxHeight), maxHeight,
    };
  }

  function finish(event) {
    if (!drag || (event && event.pointerId !== drag.id)) return;
    const { handle, id, cursor } = drag;
    drag = null;
    document.body.classList.remove(cursor);
    if (handle.hasPointerCapture(id)) handle.releasePointerCapture(id);
  }

  function setDimension(handle, axis, value, min, max) {
    stage.style.setProperty('--explanation-' + axis, value + 'px');
    handle.setAttribute('aria-valuemin', String(Math.round(min)));
    handle.setAttribute('aria-valuemax', String(Math.round(max)));
    handle.setAttribute('aria-valuenow', String(value));
    handle.setAttribute('aria-valuetext', value + 'px');
  }

  function refresh(limits = dimensions()) {
    if (drag && drag.stacked !== limits.stacked) finish();
    const { size, minWidth, maxWidth, minHeight, maxHeight } = limits;
    setDimension(widthHandle, 'width', clamp(size.width, minWidth, maxWidth), minWidth, maxWidth);
    setDimension(heightHandle, 'height', clamp(size.height, minHeight, maxHeight), minHeight, maxHeight);
  }

  for (const [handle, axis] of [[widthHandle, 'width'], [heightHandle, 'height'], [corner, 'corner']]) {
    listen(handle, 'pointerdown', event => {
      if (event.button !== 0 || event.isPrimary === false || drag) return;
      event.preventDefault();
      if (handle !== corner) handle.focus({ preventScroll: true });
      const stacked = isStacked();
      const cursor = axis === 'corner' && stacked ? 'popup-top-corner-resizing' : 'popup-' + axis + '-resizing';
      drag = {
        handle, id: event.pointerId, x: event.clientX, y: event.clientY, stacked, cursor,
        width: Number(widthHandle.getAttribute('aria-valuenow')),
        height: Number(heightHandle.getAttribute('aria-valuenow')),
      };
      handle.setPointerCapture(event.pointerId);
      document.body.classList.add(cursor);
    });
    listen(handle, 'pointermove', event => {
      if (!drag || drag.handle !== handle || drag.id !== event.pointerId) return;
      const limits = dimensions(), { size, stacked } = limits;
      if (stacked !== drag.stacked) { finish(); return; }
      if (axis !== 'height') {
        const width = clamp(drag.width + event.clientX - drag.x, limits.minWidth, limits.maxWidth);
        size.width = stacked && width >= Math.round(limits.maxWidth) ? Infinity : width;
      }
      if (axis !== 'width') {
        const dy = (event.clientY - drag.y) * (stacked ? -1 : 1);
        size.height = clamp(drag.height + dy, limits.minHeight, limits.maxHeight);
      }
      refresh(limits);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(handle, type, finish);
  }

  // The two edge separators expose both dimensions to keyboard and screen-reader users.
  for (const [handle, axis] of [[widthHandle, 'width'], [heightHandle, 'height']]) {
    listen(handle, 'keydown', event => {
      const arrows = axis === 'width' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown'];
      if (![...arrows, 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const limits = dimensions();
      const min = axis === 'width' ? limits.minWidth : limits.minHeight;
      const max = axis === 'width' ? limits.maxWidth : limits.maxHeight;
      const sign = axis === 'height' && limits.stacked ? -1 : 1;
      const step = (event.key === arrows[0] ? -16 : 16) * sign;
      const current = Number(handle.getAttribute('aria-valuenow'));
      const next = event.key === 'Home' ? min : event.key === 'End' ? max : clamp(current + step, min, max);
      limits.size[axis] = axis === 'width' && limits.stacked && next >= Math.round(max) ? Infinity : next;
      refresh(limits);
    });
  }
  return { refresh, finish };
}
