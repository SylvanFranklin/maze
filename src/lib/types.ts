export enum CellType {
    WALL,
    EMPTY,
    SCANNED,
    PATH,
    START,
    END,
}

export class Cell {
    type: CellType = CellType.EMPTY;
    weight: number = 99999;
    x: number;
    y: number;
    visited = false;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}
