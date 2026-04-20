import { useState, useCallback } from 'react';
import { ContextMenu } from '../ContextMenu';

interface RowMenuState {
  x: number;
  y: number;
  action: () => void;
}

export function useRowContextMenu() {
  const [rowMenu, setRowMenu] = useState<RowMenuState | null>(null);

  const onRowContextMenu = useCallback((e: React.MouseEvent, action: () => void) => {
    e.preventDefault();
    setRowMenu({ x: e.clientX, y: e.clientY, action });
  }, []);

  const RowContextMenu = rowMenu ? (
    <ContextMenu
      x={rowMenu.x}
      y={rowMenu.y}
      items={[{ label: 'Remove value', onClick: rowMenu.action }]}
      onClose={() => setRowMenu(null)}
    />
  ) : null;

  return { onRowContextMenu, RowContextMenu };
}
