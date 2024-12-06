import { CellType, type Cell } from "./types";

export function get_color(cell: Cell) {
    switch (cell.type) {
        case CellType.START:
            return "bg-green-400";
        case CellType.WEIGHT:
            return "bg-gray-400";
        case CellType.END:
            return "bg-red-400";
        case CellType.WALL:
            return "bg-black";
        case CellType.EMPTY:
            return "bg-white";
        case CellType.SCANNED:
            return "bg-blue-200";
        case CellType.PATH:
            return "bg-blue-400";
    }
}
