import { useState, useRef, useCallback, useEffect } from 'react';

interface Position {
  x: number;
  y: number;
}

export function useDraggablePanel(key: string, initialPos: Position) {
  const storageKey = `panel_pos_${key}`;
  const pinnedKey = `panel_pin_${key}`;

  const [pos, setPos] = useState<Position>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : initialPos;
    } catch {
      return initialPos;
    }
  });

  const [pinned, setPinned] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(pinnedKey);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const dragging = useRef(false);
  const offset = useRef<Position>({ x: 0, y: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (pinned) return;
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }, [pinned, pos]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const newPos = {
        x: Math.max(0, Math.min(window.innerWidth - 260, e.clientX - offset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 100, e.clientY - offset.current.y)),
      };
      setPos(newPos);
      localStorage.setItem(storageKey, JSON.stringify(newPos));
    };

    const onMouseUp = () => {
      dragging.current = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [storageKey]);

  // Reclampar posicion si el usuario redimensiona la ventana.
  useEffect(() => {
    const onResize = () => {
      setPos((p) => {
        const clamped = {
          x: Math.min(p.x, window.innerWidth - 260),
          y: Math.min(p.y, window.innerHeight - 100),
        };
        localStorage.setItem(storageKey, JSON.stringify(clamped));
        return clamped;
      });
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [storageKey]);

  const togglePin = useCallback(() => {
    setPinned((p) => {
      const next = !p;
      localStorage.setItem(pinnedKey, String(next));
      return next;
    });
  }, [pinnedKey]);

  return { pos, pinned, togglePin, onMouseDown };
}

