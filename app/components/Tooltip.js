'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Tooltip universel — portail dans <body>, position fixed.
 * Wrapper = <div> (pas <span>) pour accepter n'importe quel enfant.
 */
export default function Tooltip({ text, children, delay = 150, as: Tag = 'div', className = '' }) {
  const [visible, setVisible]   = useState(false);
  const [coords,  setCoords]    = useState({ top: 0, left: 0 });
  const [mounted, setMounted]   = useState(false);
  const triggerRef = useRef(null);
  const timerRef   = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  const show = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!triggerRef.current) return;
      // display:contents n'a pas de boîte CSS — getBoundingClientRect retourne {0,0}
      // On se rabat sur le premier enfant qui a une vraie boîte.
      let el = triggerRef.current;
      if (typeof getComputedStyle !== 'undefined' &&
          getComputedStyle(el).display === 'contents' &&
          el.firstElementChild) {
        el = el.firstElementChild;
      }
      const r = el.getBoundingClientRect();
      setCoords({
        top:  r.top  - 10,
        left: r.left + r.width / 2,
      });
      setVisible(true);
    }, delay);
  }, [delay]);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  if (!text) return children;

  return (
    <>
      <Tag
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className={className || undefined}
        style={{ display: !className && Tag === 'div' ? 'contents' : undefined }}
      >
        {children}
      </Tag>

      {mounted && visible && createPortal(
        <div
          role="tooltip"
          style={{
            position:  'fixed',
            top:       coords.top,
            left:      coords.left,
            transform: 'translate(-50%, -100%)',
            zIndex:    99999,
            pointerEvents: 'none',
            maxWidth: 230,
          }}
          className="bg-slate-900 text-white text-[11px] rounded-lg px-3 py-2 leading-snug shadow-2xl whitespace-normal"
        >
          {text}
          <span style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: 'translateX(-50%)',
            borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
            borderTop: '5px solid #0f172a', width: 0, height: 0,
          }} />
        </div>,
        document.body
      )}
    </>
  );
}
