<script lang="ts">
    import { flip } from "svelte/animate";
    import { quintOut } from "svelte/easing";
    import { fly, scale } from "svelte/transition";

    let size = 51;
    let speed = 1;
    let allow_diagonal = true;

    enum CellType {
        WALL,
        EMPTY,
        SCANNED,
        PATH,
        START,
        END,
    }

    class Cell {
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

    let board = Array(size)
        .fill(0)
        .map((_, i) =>
            Array(size)
                .fill(0)
                .map((_, k) => new Cell(i, k)),
        );

    async function clear_board() {
        for (const row of board) {
            for (const cell of row) {
                cell.type = CellType.EMPTY;
                cell.visited = false;
            }
            await new Promise((r) => setTimeout(r, speed));
            board = [...board];
        }
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
        for (const row of board) {
            for (const cell of row) {
                cell.weight = 99999;
                cell.visited = false;
                if (
                    cell.type == CellType.PATH ||
                    cell.type == CellType.SCANNED
                ) {
                    cell.type = CellType.EMPTY;
                }
            }
        }

        board = board;
        start.weight = 0;
        let animate_period = 3;
        let current = start;
        let unvisited = board
            .flat()
            .filter((e) => e.visited == false && e.type !== CellType.WALL);
        let visited = [];
        let i = 0;

        while (current !== end && !stop) {
            i++;
            let neighbors = get_neighbors(current);
            for (const n of neighbors) {
                const distance = Math.sqrt(
                    Math.pow(n.x - current.x, 2) + Math.pow(n.y - current.y, 2),
                );

                if (n.weight > current.weight + distance) {
                    n.weight = current.weight + distance;
                }
            }

            current.visited = true;
            if (current.type != CellType.START) {
                current.type = CellType.SCANNED;
            }
            visited.push(current);
            unvisited = unvisited.filter((e) => e.visited == false);
            // determine if we should stop, because there is no open nodes left

            if (unvisited.length == 0) {
                break;
            }

            current = unvisited.reduce((a, b) => (a.weight < b.weight ? a : b));

            if (speed > 0 && i % animate_period == 0) {
                await new Promise((r) => setTimeout(r, speed)).then(
                    () => (board = [...board]),
                );
            }
            if (get_neighbors(current).filter((e) => e.visited).length == 0) {
                // make sure there are no gaps in scanning animation

                for (const row of board) {
                    for (const cell of row) {
                        if (cell.visited && cell.type == CellType.EMPTY) {
                            cell.type = CellType.SCANNED;
                        }
                    }
                }

                board = board;

                return;
            }
        }
        board = board;

        // backtrace and set the type to path

        let current_cell = end;
        while (current_cell !== start) {
            let neighbors = get_neighbors(current_cell);
            // find next, the lowest weight neighbor

            let next = neighbors.reduce((a, b) =>
                a.weight < b.weight ? a : b,
            );

            if (next) {
                current_cell = next;
                if (
                    current_cell.type === CellType.SCANNED ||
                    current_cell.type == CellType.EMPTY
                ) {
                    current_cell.type = CellType.PATH;
                    if (speed > 0) {
                        await new Promise((r) => setTimeout(r, speed));
                        board = board;
                    }
                }
            } else {
                break;
            }
        }
    }

    function get_neighbors(cell: Cell) {
        let x = cell.x;
        let y = cell.y;
        const chord_pairs = allow_diagonal
            ? [
                  [x - 1, y],
                  [x, y - 1],
                  [x, y + 1],
                  [x + 1, y],
                  [x - 1, y - 1],
                  [x - 1, y + 1],
                  [x + 1, y - 1],
                  [x + 1, y + 1],
              ]
            : [
                  [x - 1, y],
                  [x, y - 1],
                  [x, y + 1],
                  [x + 1, y],
              ];

        let neighbors = [];

        for (const [x, y] of chord_pairs) {
            if (board[x] && board[y] && board[x][y].type !== CellType.WALL) {
                neighbors.push(board[x][y]);
            }
        }
        return neighbors;
    }

    async function recursive_subdivision() {
        function get_orentation() {
            return Math.random() > 0.5 ? "horizontal" : "vertical";
        }

        const halfway_x = Math.floor(size / 2);
        const halfway_y = Math.floor(size / 2);
        const orientation = get_orentation();

        for (let i = 0; i < size; i++) {
            if (orientation === "horizontal") {
                board[halfway_x][i].type = CellType.WALL;
            } else {
                board[i][halfway_y].type = CellType.WALL;
            }
        }

        // make a random hole

        if (orientation === "horizontal") {
            board[halfway_x][Math.floor(Math.random() * size)].type =
                CellType.EMPTY;
        } else {
            board[Math.floor(Math.random() * size)][halfway_y].type =
                CellType.EMPTY;
        }

        // recursive subdivision
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
        switch (cell.type) {
            case CellType.START:
                return "bg-green-400";
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

    let placing: CellType = CellType.WALL;
    let down = false;

    let start: Cell;
    let end: Cell;

    function place_start(cell: Cell) {
        // remove all other starts
        board = board.map((row) =>
            row.map((cell) => {
                if (cell.type === CellType.START) {
                    cell.type = CellType.EMPTY;
                }
                return cell;
            }),
        );

        cell.type = CellType.START;
        start = cell;
        board = board;
    }

    function place_end(cell: Cell) {
        // remove all other ends
        board = board.map((row) =>
            row.map((cell) => {
                if (cell.type === CellType.END) {
                    cell.type = CellType.EMPTY;
                }
                return cell;
            }),
        );

        cell.type = CellType.END;
        end = cell;
        board = board;
    }
</script>

<main
    class="w-screen h-screen flex bg-white/70 justify-center items-center flex-col gap-2"
>
    <div class="flex flex-col gap-2">
        <span class="gap-4 flex flex-row-reverse border-2 rounded-lg p-2">
            <button
                class="p-2 rounded-md shadow-md bg-red-600 font-mono text-center text-white"
                on:click={() => (stop = true)}>Stop</button
            >
            <button
                class={`p-2 rounded-md shadow-md bg-orange-600 font-mono text-center text-white ${speed == 0 && "opacity-30"}`}
                on:click={() => (speed == 0 ? (speed = 1) : (speed = 0))}
                >animate</button
            >
            <button
                class={`p-2 rounded-md shadow-md bg-green-600 font-mono text-center text-white ${!allow_diagonal && "opacity-30"}`}
                on:click={() => (allow_diagonal = !allow_diagonal)}
                >corner cut</button
            >
        </span>
        <div class="grid item-center justify-center grid-flow-col">
            <ol
                class="flex flex-col mr-2 gap-2 relative top-0 left-0 border-2 rounded-md p-2"
            >
                <button
                    class="p-2 rounded-md shadow-md bg-blue-600 font-mono text-center text-white"
                    on:click={() => {
                        board = board.map((row) =>
                            row.map((cell) => {
                                cell.type = CellType.WALL;
                                cell.visited = false;
                                return cell;
                            }),
                        );
                        generate_maze(
                            board[Math.floor(size / 2)][Math.floor(size / 2)],
                        );
                    }}>Maze</button
                >
                <li class="flex flex-col p-2 rounded-lg gap-2 bg-black">
                    <button
                        class={`p-2 rounded-md shadow-md bg-black text-white font-mono text-center  ${placing == CellType.WALL && "scale-110"}`}
                        on:click={() => (placing = CellType.WALL)}>wall</button
                    >
                    <button
                        class={`p-2 rounded-md shadow-md bg-green-400 font-mono text-center text-white ${placing == CellType.START && "scale-110"}`}
                        on:click={() => (placing = CellType.START)}
                        >start</button
                    >
                    <button
                        class={`p-2 rounded-md shadow-md bg-red-400 font-mono text-center text-white ${placing == CellType.END && "scale-110"}`}
                        on:click={() => (placing = CellType.END)}>end</button
                    >
                </li>
                <button
                    class="p-2 rounded-md shadow-md bg-purple-400 font-mono text-center text-white"
                    on:click={() => dijkstra_pathfind(start, end)}>find</button
                >
                <button
                    class="p-2 rounded-md shadow-md bg-black/30 font-mono text-center text-white"
                    on:click={() => clear_board()}>Clear</button
                >
            </ol>

            <div
                class="rounded-lg overflow-clip shadow-lg border-2 border-black/10"
                style={`display: grid; grid-template-columns: repeat(${size}, 1fr); grid-auto-rows: minmax(0, auto); `}
            >
                {#each board as row, x}
                    {#each row as cell, y}
                        <button
                            on:mousedown={() => {
                                down = true;
                                if (placing === CellType.START) {
                                    place_start(cell);
                                } else if (placing === CellType.END) {
                                    place_end(cell);
                                } else {
                                    cell.type = CellType.WALL;
                                }
                            }}
                            on:mouseup={() => (down = false)}
                            on:mouseenter={() => {
                                if (down) {
                                    if (placing === CellType.START) {
                                        place_start(cell);
                                    } else if (placing === CellType.END) {
                                        place_end(cell);
                                    } else {
                                        cell.type = CellType.WALL;
                                    }
                                }
                            }}
                            class={`border-[2px] text-xs border-black/5 -m-[2px] w-[18px] h-[18px] ${get_color(cell)} relative flex items-center justify-center`}
                        >
                            {#if cell.type == CellType.START}
                                <span class="w-4 h-4 rounded-lg bg-green-200 m-2">
                                </span>
                            {:else if cell.type == CellType.END}
                                <span class="w-2 h-2 rounded-lg bg-green-200">
                                </span>
                            {/if}
                        </button>
                    {/each}
                {/each}
            </div>
        </div>
    </div>
</main>
