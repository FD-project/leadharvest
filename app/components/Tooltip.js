'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Tooltip universel — rendu via portail dans <body> pour ne jamais être coupé.
 * Usage : <Tooltip text="..."><button>...</button></Tooltip>
 */
export default function Tooltip({ text, children, delay = 120 }) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const timerRef   = useRef(null);
  const [mounted, setMounted] = useState(false);

  // Attend le montage côté client pour createPortal
  useEffect(() => { setMounted(true); }, []);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const r = triggerRef.current.getBoundingClientRect();
        setCoords({
          top:  r.top + window.scrollY - 8,   // au-dessus du trigger
          left: r.left + r.width / 2,          // centré horizontalement
        });
      }
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
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="inline-flex"
      >
        {children}
      </span>

      {mounted && visible && createPortal(
        <div
          role="tooltip"
          style={{
            position: 'fixed',
            top:  coords.top,
            left: coords.left,
            transform: 'translate(-50%, -100%)',
            zIndex: 99999,
            pointerEvents: 'none',
          }}
          className="
            max-w-[220px] bg-slate-900 text-white text-[11px]
            rounded-lg px-3 py-2 leading-snug shadow-xl
            whitespace-normal
          "
        >
          {text}
          {/* Flèche en bas */}
          <span
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid #0f172a',
            }}
          />
        </div>,
        document.body
      )}
    </>
  );
}
