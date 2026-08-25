/** 먼지 닦기 완료 판정 — 같은 영역을 반복해도 한 번만 계산한다. */
export const RUB_COMPLETION_RATIO = 0.78;

export class RubCoverage {
  private readonly cols: number;
  private readonly rows: number;
  private readonly cleared = new Set<number>();

  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly cellSize = 12,
  ) {
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
  }

  markCircle(x: number, y: number, radius: number): number {
    const minCol = Math.max(0, Math.floor((x - radius) / this.cellSize));
    const maxCol = Math.min(this.cols - 1, Math.floor((x + radius) / this.cellSize));
    const minRow = Math.max(0, Math.floor((y - radius) / this.cellSize));
    const maxRow = Math.min(this.rows - 1, Math.floor((y + radius) / this.cellSize));
    const cellReach = radius + this.cellSize * 0.55;
    const reachSquared = cellReach * cellReach;

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const cellX = Math.min(this.width, (col + 0.5) * this.cellSize);
        const cellY = Math.min(this.height, (row + 0.5) * this.cellSize);
        const dx = cellX - x;
        const dy = cellY - y;
        if (dx * dx + dy * dy <= reachSquared) {
          this.cleared.add(row * this.cols + col);
        }
      }
    }

    return this.ratio;
  }

  get ratio(): number {
    return this.cleared.size / (this.cols * this.rows);
  }

  get isComplete(): boolean {
    return this.ratio >= RUB_COMPLETION_RATIO;
  }
}
