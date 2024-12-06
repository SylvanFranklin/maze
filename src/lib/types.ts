
export enum CellType {
    WALL,
    EMPTY,
    WEIGHT,
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

    constructor(x: number, y: number, type?: CellType) {
        this.x = x;
        this.y = y;
        this.type = type || CellType.EMPTY;
    }
}
