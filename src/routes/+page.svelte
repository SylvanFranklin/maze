<script lang="ts">
    import { flip } from "svelte/animate";
    import { quintOut } from "svelte/easing";
    import { fly, scale } from "svelte/transition";

    let size = 43;
    let speed = 19;
    enum CellType {
        WALL,
        EMPTY,
        PATH,
        START,
        END,
    }

    class Cell {
        type: CellType = CellType.EMPTY;
        x: number;
        y: number;
        visited = false;

        constructor(x: number, y: number) {
            this.x = x;
            this.y = y;
        }
    }

    let board = Array(size)
        .fill(0)
        .map((_, i) =>
            Array(size)
                .fill(0)
                .map((_, k) => new Cell(i, k)),
        );

    function clear_board() {
        board = Array(size)
            .fill(0)
            .map((_, i) =>
                Array(size)
                    .fill(0)
                    .map((_, k) => new Cell(i, k)),
            );
    }

    function get_neighbors_maze(cell: Cell) {
        let x = cell.x;
        let y = cell.y;
        const chord_pairs = [
            [x - 2, y],
            [x, y - 2],
            [x, y + 2],
            [x + 2, y],
        ];

        let neighbors = [];

        for (const [x, y] of chord_pairs) {
            if (board[x] && board[y] && board[x][y].visited === false) {
                neighbors.push(board[x][y]);
            }
        }
        return neighbors;
    }

    let stop = false;

    // make sure that current, is not an edge cell
    let current = board[Math.floor(size / 2)][Math.floor(size / 2)];

    function remove_ajoining_wall(cell: Cell, neighbor: Cell) {
        let x = (cell.x + neighbor.x) / 2;
        let y = (cell.y + neighbor.y) / 2;
        board[x][y].type = CellType.EMPTY;
    }

    async function dijkstra_pathfind(start: Cell, end: Cell) {
        let unvisited = board.flat();
        let visited = [];
        let current = start;
        let found = false;

        while (current !== end && unvisited.length > 0) {
            unvisited = unvisited.filter((cell) => cell !== current);
            visited.push(current);
            let neighbors = get_neighbors(current);
            for (const neighbor of neighbors) {
                if (visited.includes(neighbor)) {
                    continue;
                }
                if (neighbor.type === CellType.WALL) {
                    continue;
                }
                if (neighbor.type === CellType.END) {
                    found = true;
                    break;
                }
                if (neighbor.type === CellType.EMPTY) {
                    neighbor.type = CellType.PATH;
                    board = board;
                }
            }
            if (found) {
                break;
            }
            let distances = neighbors.map((cell) => {
                return {
                    cell,
                    distance:
                        Math.abs(cell.x - end.x) + Math.abs(cell.y - end.y),
                };
            });
            distances.sort((a, b) => a.distance - b.distance);
            current = distances[0].cell;
            if (speed > 0) {
                await new Promise((r) => setTimeout(r, speed));
            }
        }
    }

    function get_neighbors(cell: Cell) {
        let x = cell.x;
        let y = cell.y;
        const chord_pairs = [
            [x - 1, y],
            [x, y - 1],
            [x, y + 1],
            [x + 1, y],
        ];

        let neighbors = [];

        for (const [x, y] of chord_pairs) {
            if (board[x] && board[y] && board[x][y].visited === false) {
                neighbors.push(board[x][y]);
            }
        }
        return neighbors;
    }

    async function generate_maze(cell: Cell) {
        function get_neighbors_maze(cell: Cell) {
            let x = cell.x;
            let y = cell.y;
            const chord_pairs = [
                [x - 2, y],
                [x, y - 2],
                [x, y + 2],
                [x + 2, y],
            ];

            let neighbors = [];

            for (const [x, y] of chord_pairs) {
                if (board[x] && board[y] && board[x][y].visited === false) {
                    neighbors.push(board[x][y]);
                }
            }
            return neighbors;
        }
        board = board;
        cell.visited = true;
        board[cell.x][cell.y].type = CellType.EMPTY;
        let neighbors = get_neighbors_maze(cell);
        while (neighbors.length > 0 && !stop) {
            const neighbor =
                neighbors[Math.floor(Math.random() * neighbors.length)];
            current = neighbor;
            remove_ajoining_wall(cell, neighbor);
            if (!stop) {
                board = board;
                if (speed > 0) {
                    await new Promise((r) => setTimeout(r, speed));
                    await generate_maze(neighbor);
                } else {
                    generate_maze(neighbor);
                }
            }

            neighbors = get_neighbors_maze(cell);
        }
    }

    function get_color(cell: Cell) {
        if (cell.type == CellType.WALL) {
            return "bg-black";
        } else if (cell.type == CellType.START) {
            return "bg-green-500";
        } else if (cell.type == CellType.END) {
            return "bg-red-500";
        } else if (cell.type == CellType.PATH) {
            return "bg-blue-500";
        } else {
            return "bg-white";
        }
    }

    let placing: CellType = CellType.WALL;
    let start: Cell;
    let end: Cell;
</script>

<main
    class="w-screen h-screen flex bg-white/70 justify-center items-center flex-col gap-4"
>
    <span class="gap-4 flex flex-row">
        <button
            class="p-2 rounded-md shadow-md bg-blue-600/30 font-mono text-center text-white"
            on:click={() => {
                board = board.map((row) =>
                    row.map((cell) => {
                        cell.type = CellType.WALL;
                        return cell;
                    }),
                );
                generate_maze(current);
            }}>Generate Maze</button
        >
        <button
            class="p-2 rounded-md shadow-md bg-red-600/30 font-mono text-center text-white"
            on:click={() => (stop = true)}>Stop</button
        >
        <button
            class="p-2 rounded-md shadow-md bg-black/30 font-mono text-center text-white"
            on:click={() => clear_board()}>Clear</button
        >
        <button
            class="p-2 rounded-md shadow-md bg-green-400/30 font-mono text-center text-white"
            on:click={() => (placing = CellType.START)}>Place Start</button
        >
        <button
            class="p-2 rounded-md shadow-md bg-red-400/30 font-mono text-center text-white"
            on:click={() => (placing = CellType.END)}>Place End</button
        >
        <button
            class="p-2 rounded-md shadow-md bg-orange-400/30 font-mono text-center text-white"
            on:click={() => dijkstra_pathfind(start, end)}>run</button
        >
    </span>
    <div
        class="rounded-lg overflow-clip shadow-lg"
        style={`display: grid; grid-template-columns: repeat(${size}, 1fr); grid-auto-rows: minmax(0, auto); `}
    >
        {#each board as row, i}
            {#each row as cell (cell)}
                <button
                    on:click={() => {
                        cell.type = placing;
                        if (cell.type === CellType.START) {
                            if (start) {
                                start.type = CellType.EMPTY;
                            }
                            start = cell;
                        } else if (cell.type === CellType.END) {
                            if (end) {
                                end.type = CellType.EMPTY;
                            }
                            end = cell;
                        }

                        board = board;
                    }}
                    in:scale={{ start: 2, duration: i, easing: quintOut }}
                    class={`border-2 border-black/10 -m-[1px] w-4 h-4 ${get_color(cell)} `}
                ></button>
            {/each}
        {/each}
    </div>
</main>
