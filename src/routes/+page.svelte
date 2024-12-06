<script lang="ts">
    import { Cell, CellType } from "$lib/types";
    import { get_color } from "$lib/index";
    import { writable } from "svelte/store";

    let size = 47;
    let settings = false;
    let mazes = false;
    let running = writable(false);
    let speed = 1;
    let animation_lock = false;
    let allow_diagonal = false;
    let placing: CellType = CellType.WALL;
    let down = false;
    let gone: Cell;
    let start: Cell | null = null;
    let end: Cell | null = null;

    let board = Array(size)
        .fill(0)
        .map((_, i) =>
            Array(size)
                .fill(0)
                .map((_, k) => new Cell(i, k)),
        );

    // now updated to show no animation
    async function clear_board() {
        for (const row of board) {
            for (const cell of row) {
                cell.type = CellType.EMPTY;
                cell.visited = false;
            }
        }
        // remove start and end
        start = null;
        end = null;
        board = [...board];
    }

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

        while (current !== end) {
            i++;
            let neighbors = get_neighbors(current);
            for (const n of neighbors) {
                const distance = Math.sqrt(
                    Math.pow(n.x - current.x, 2) + Math.pow(n.y - current.y, 2),
                );

                if (n.weight > current.weight + distance) {
                    if (n.type == CellType.WEIGHT) {
                        n.weight = current.weight + distance + 10;
                    } else {
                        // if it is a weight cell, add 5 to the weight
                        n.weight = current.weight + distance;
                    }
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

                // make the animation period bigger as we get closer to the end
                if (i > animate_period * 10) {
                    animate_period += 2;
                }
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

    async function recursive_subdivision(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        preferredOrientation: "vertical" | "horizontal",
    ) {
        // Determine if we should stop subdividing
        if (x2 - x1 < 4 || y2 - y1 < 4) {
            return;
        }

        // Intelligently choose orientation
        let orientation: "vertical" | "horizontal";
        if (preferredOrientation) {
            orientation = preferredOrientation;
        } else {
            orientation = x2 - x1 > y2 - y1 ? "vertical" : "horizontal";
        }

        if (orientation === "vertical") {
            // Choose a vertical line to divide the space
            const divideX = Math.floor((x1 + x2) / 2);

            // Create a wall along this vertical line
            for (let y = y1; y < y2; y++) {
                board[divideX][y].type = CellType.WALL;

                // Optional: add animation if not locked
                if (!animation_lock && y % 3 === 0) {
                    await new Promise((r) => setTimeout(r, speed)).then(
                        () => (board = [...board]),
                    );
                }
            }

            // Choose a gap in the wall (ensuring it's not at the edges)
            const gapY = Math.floor(Math.random() * (y2 - y1 - 2)) + y1 + 1;
            board[divideX][gapY].type = CellType.EMPTY;

            // Recursively subdivide the two resulting spaces
            await Promise.all([
                recursive_subdivision(
                    x1,
                    y1,
                    divideX,
                    y2,
                    Math.random() > 0.5 ? "vertical" : "horizontal",
                ),
                recursive_subdivision(
                    divideX,
                    y1,
                    x2,
                    y2,
                    Math.random() > 0.5 ? "vertical" : "horizontal",
                ),
            ]);
        } else {
            // Choose a horizontal line to divide the space
            const divideY = Math.floor((y1 + y2) / 2);

            // Create a wall along this horizontal line
            for (let x = x1; x < x2; x++) {
                board[x][divideY].type = CellType.WALL;

                // Optional: add animation if not locked
                if (!animation_lock && x % 3 === 0) {
                    await new Promise((r) => setTimeout(r, speed)).then(
                        () => (board = [...board]),
                    );
                }
            }

            // Choose a gap in the wall (ensuring it's not at the edges)
            const gapX = Math.floor(Math.random() * (x2 - x1 - 2)) + x1 + 1;
            board[gapX][divideY].type = CellType.EMPTY;

            // Recursively subdivide the two resulting spaces
            await Promise.all([
                recursive_subdivision(
                    x1,
                    y1,
                    x2,
                    divideY,
                    Math.random() > 0.5 ? "horizontal" : "vertical",
                ),
                recursive_subdivision(
                    x1,
                    divideY,
                    x2,
                    y2,
                    Math.random() > 0.5 ? "horizontal" : "vertical",
                ),
            ]);
        }
    }

    async function generate_maze(cell: Cell) {
        // fill everything in first so that it can be cut through

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
                if (board[x] && board[y] && board[x][y].visited == false) {
                    neighbors.push(board[x][y]);
                }
            }
            return neighbors;
        }
        board = board;
        cell.visited = true;
        board[cell.x][cell.y].type = CellType.EMPTY;
        let neighbors = get_neighbors_maze(cell);
        while (neighbors.length > 0) {
            const neighbor =
                neighbors[Math.floor(Math.random() * neighbors.length)];
            current = neighbor;
            remove_ajoining_wall(cell, neighbor);
            board = [...board];
            if (speed > 0) {
                await new Promise((r) => setTimeout(r, speed));
                await generate_maze(neighbor);
            } else {
                generate_maze(neighbor);
            }

            neighbors = get_neighbors_maze(cell);
        }
    }

    function place_start(cell: Cell) {
        // remove all other starts
        board = board.map((row) =>
            row.map((cell) => {
                if (cell.type === CellType.START) {
                    cell.type = gone.type;
                }
                return cell;
            }),
        );

        gone = { ...cell };
        cell.type = CellType.START;
        start = cell;
        board = board;
    }

    function place_end(cell: Cell) {
        // remove all other ends
        board = board.map((row) =>
            row.map((cell) => {
                if (cell.type === CellType.END) {
                    cell.type = gone.type;
                }
                return cell;
            }),
        );

        gone = { ...cell };
        cell.type = CellType.END;
        end = cell;
        board = board;
    }

    function bubble(node: HTMLElement, { duration }: { duration: number }) {
        return {
            duration,
            css: (t: number) => {
                return `transform: scale(${t});`;
            },
        };
    }

    function bubble_color(
        node: HTMLElement,
        { duration }: { duration: number },
    ) {
        return {
            duration,
            css: (t: number) => {
                const r = 90 * t + 101;
                const g = 19 * t + 200;
                const b = 4 * t + 240;

                return `
					transform: scale(${t});
                    border-radius: ${(1 - t) * 100}%;
                    background-color: rgb(${r}, ${g}, ${b});
					opacity: ${t + 0.5};`;
            },
        };
    }
</script>

<main
    class="w-screen h-screen flex bg-white/70 justify-center items-center flex-col gap-2"
>
    <div class="flex flex-col gap-2">
        <span class="gap-2 flex flex-row-reverse border-2 rounded-lg p-2">
            <!-- <button -->
            <!--     class="p-2 rounded-md shadow-md bg-red-600 font-mono text-center text-white" -->
            <!--     on:click={() => (stop = true)}>stop</button -->
            <!-- > -->

            <button
                class="flex items-center justify-center text-3xl text-white bg-emerald-500 p-2 rounded-md shadow-sm hover:brightness-105 cursor-pointer"
                on:click={() => (settings = !settings)}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1em"
                    height="1em"
                    viewBox="0 0 24 24"
                    {...$$props}
                    ><path
                        fill="currentColor"
                        d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97s-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1s.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64z"
                    /></svg
                >
            </button>

            {#if settings}
                <div
                    class="grid grid-flow-row absolute bg-white border-2 gap-2 p-2 rounded-md mt-16 -mr-3 h-22 z-20"
                >
                    <button
                        class={`p-2 rounded-md shadow-md bg-orange-600 font-mono text-center text-white ${speed == 0 && "opacity-30"}`}
                        on:click={() =>
                            speed == 0 ? (speed = 1) : (speed = 0)}
                        >animate</button
                    >
                    <button
                        class={`p-2 rounded-md shadow-md bg-green-600 font-mono text-center text-white ${!allow_diagonal && "opacity-30"}`}
                        on:click={() => (allow_diagonal = !allow_diagonal)}
                        >corner cut</button
                    >
                </div>
            {/if}
            <button
                class={`${$running && "bg-gray-300"} p-2 rounded-md shadow-md bg-black/30 font-mono text-center text-white bg-emerald-500 hover:brightness-110 px-6`}
                on:click={() => {
                    if (!$running) {
                        clear_board();
                    }
                }}>Clear</button
            >
            <button
                class={`p-2 rounded-md shadow-md bg-green-500 font-mono text-center text-white transition-all duration-200 hover:brightness-110 cursor-pointer mx-auto px-10 ${
                    start && end && !$running ? "bg-green-500" : "bg-gray-300"
                }`}
                on:click={async () => {
                    if (start && end && !$running) {
                        running.set(true);
                        for (const row of board) {
                            for (const cell of row) {
                                cell.visited = false;
                            }
                        }
                        await dijkstra_pathfind(start, end).then(() =>
                            running.set(false),
                        );
                    }
                }}>find</button
            >
            <span class="flex h-full">
                <button
                    class={`p-2 rounded-md shadow-md font-mono text-center text-white bg-emerald-500 hover:brightness-110 cursor-pointer pl-4 flex flex-row items-center justify-center gap-1 ${$running && "bg-gray-300"}`}
                    on:click={() => {
                        if (!$running) mazes = !mazes;
                    }}
                    >mazes

                    <span class="text-3xl">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="1em"
                            height="1em"
                            viewBox="0 0 24 24"
                            {...$$props}
                            ><path
                                fill="currentColor"
                                d="m12 15.4l-6-6L7.4 8l4.6 4.6L16.6 8L18 9.4z"
                            /></svg
                        >
                    </span>
                </button>
                {#if mazes}
                    <div
                        in:bubble={{ duration: 100 }}
                        class="grid grid-flow-row absolute bg-white border-2 gap-2 p-2 rounded-md mt-16 h-22 z-20 -ml-3"
                    >
                        <button
                            class="p-2 rounded-md shadow-md font-mono text-center text-white bg-emerald-500 hover:brightness-110 cursor-pointer px-6"
                            on:click={async () => {
                                // use this to reset the board, making it all wall so that it can be cut through
                                mazes = false;
                                if (!$running) {
                                    $running = !$running;
                                    animation_lock = true;
                                    for (const row of board) {
                                        for (const cell of row) {
                                            cell.visited = false;
                                            cell.type = CellType.WALL;
                                        }
                                    }
                                    board = board;
                                    await generate_maze(
                                        board[Math.floor(size / 2)][
                                            Math.floor(size / 2)
                                        ],
                                    );
                                    animation_lock = false;
                                    $running = !$running;
                                }
                            }}>standard</button
                        >
                        <button
                            class="p-2 rounded-md shadow-md font-mono text-center text-white bg-emerald-500 hover:brightness-110 cursor-pointer px-6"
                            on:click={async () => {
                                // use this to reset the board, making it all wall so that it can be cut through
                                mazes = false;
                                if (!$running) {
                                    $running = !$running;
                                    clear_board();
                                    await recursive_subdivision(
                                        0,
                                        0,
                                        size,
                                        size,
                                        Math.random() > 0.5
                                            ? "vertical"
                                            : "horizontal",
                                    ).then(() => running.set(false));
                                }
                            }}>recursive</button
                        >
                    </div>
                {/if}
            </span>
        </span>
        <div class="grid item-center justify-center grid-flow-col">
            <ol
                class="flex flex-col mr-2 gap-2 relative top-0 left-0 border-2 rounded-md p-2"
            >
                <li
                    class="flex flex-col p-2 rounded-lg gap-2 shadow-md border-2"
                >
                    <button
                        class={`p-2 rounded-md shadow-md bg-black text-white font-mono text-center duration-200 ${placing == CellType.WALL && "scale-110"}`}
                        on:click={() => (placing = CellType.WALL)}>wall</button
                    >
                    <button
                        class={`p-2 rounded-md shadow-md bg-gray-500 font-mono text-center text-white duration-200/50 ${placing == CellType.WEIGHT && "scale-110"}`}
                        on:click={() => (placing = CellType.WEIGHT)}
                        >weight</button
                    >
                    <button
                        class={`p-2 rounded-md shadow-md bg-green-400 font-mono text-center text-white duration-200 ${placing == CellType.START && "scale-110"}`}
                        on:click={() => (placing = CellType.START)}
                        >start</button
                    >
                    <button
                        class={`p-2 rounded-md shadow-md bg-red-400 font-mono text-center text-white duration-200  ${placing == CellType.END && "scale-110"}`}
                        on:click={() => (placing = CellType.END)}>end</button
                    >
                    <button
                        class={`p-2 rounded-md shadow-md bg-pink-300 font-mono text-center text-white duration-200/50 ${placing == CellType.EMPTY && "scale-110"}`}
                        on:click={() => (placing = CellType.EMPTY)}
                        >erase</button
                    >
                </li>
            </ol>

            <div
                class="rounded-lg overflow-clip shadow-lg border-2 border-black/10"
                style={`display: grid; grid-template-columns: repeat(${size}, 1fr); grid-auto-rows: minmax(0, auto); `}
            >
                {#each board as row, x}
                    {#each row as cell, y}
                        <button
                            on:mousedown={() => {
                                if (!$running) {
                                    down = true;
                                    if (placing === CellType.START) {
                                        place_start(cell);
                                    } else if (placing === CellType.END) {
                                        place_end(cell);
                                    } else {
                                        cell.type = placing;
                                    }
                                }
                            }}
                            on:mouseup={() => (down = false)}
                            on:mouseenter={() => {
                                if (down && !$running) {
                                    if (placing === CellType.START) {
                                        place_start(cell);
                                    } else if (placing === CellType.END) {
                                        place_end(cell);
                                    } else {
                                        cell.type = placing;
                                    }
                                }
                            }}
                            class={`border-[2px] text-xs border-black/5 -m-[2px] w-[18px] h-[18px] grid items-center place-items-center relative`}
                        >
                            {#if cell.type == CellType.WALL || cell.type == CellType.START || cell.type == CellType.END || cell.type == CellType.PATH || cell.type == CellType.WEIGHT}
                                <span
                                    class={`${get_color(cell)} w-[18px] h-[18px] text-white text-[7px] `}
                                    in:bubble|local={{
                                        duration: 200,
                                    }}
                                >
                                </span>
                            {:else if cell.type == CellType.SCANNED}
                                <span
                                    class={` w-[18px] h-[18px] ${get_color(cell)}`}
                                    in:bubble_color|local={{
                                        duration: 450,
                                    }}
                                >
                                </span>
                            {:else}
                                <span class={`bg-white w-[18px] h-[18px]`}>
                                </span>
                            {/if}
                        </button>
                    {/each}
                {/each}
            </div>
        </div>
    </div>
</main>
