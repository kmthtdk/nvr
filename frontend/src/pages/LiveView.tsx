import { useState } from 'react';
import { CameraGrid } from '../components/grid/CameraGrid';
import { CameraSelector } from '../components/grid/CameraSelector';

export function LiveView() {
  const [selectorCell, setSelectorCell] = useState<number | null>(null);

  return (
    <div className="h-full flex flex-col">
      <CameraGrid onCellClick={(idx) => setSelectorCell(idx)} />

      {selectorCell !== null && (
        <CameraSelector
          cellIndex={selectorCell}
          onClose={() => setSelectorCell(null)}
        />
      )}
    </div>
  );
}
