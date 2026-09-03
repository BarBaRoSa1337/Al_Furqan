export type RoadmapGeometryKind = 'surah' | 'ayah';

/**
 * Deterministic, non-zigzag horizontal rhythm. Geometry only decorates rows;
 * list order and scrolling never depend on the path.
 */
export function roadmapNodeX(index: number, width: number, kind: RoadmapGeometryKind): number {
  const safeWidth = Math.max(width, 1);
  const edge = kind === 'surah' ? Math.min(88, safeWidth * 0.28) : Math.min(78, safeWidth * 0.25);
  const usable = Math.max(safeWidth - edge * 2, 0);
  return edge + usable * roadmapNodeRatio(index, kind);
}

export function roadmapNodeRatio(index: number, kind: RoadmapGeometryKind): number {
  const phase = kind === 'surah' ? -1.08 : -0.72;
  const primary = Math.sin(index * 1.13 + phase) * 0.68;
  const secondary = Math.sin(index * 0.43 + phase * 0.37) * 0.32;
  return clamp(0.5 + (primary + secondary) * 0.46, 0.06, 0.94);
}

export function roadmapControlX(fromX: number, toX: number, index: number, width: number): number {
  const direction = index % 3 === 0 ? 1 : -1;
  const bend = Math.min(Math.max(width * 0.08, 14), 34) * direction;
  return clamp((fromX + toX) / 2 + bend, 8, Math.max(width - 8, 8));
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
