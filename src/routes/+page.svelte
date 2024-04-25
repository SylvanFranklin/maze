<script lang="ts">
    let size = 60;
    let speed = 1000;

    class Cell {
        walls: boolean[] = [true, true, true, true];
        x: number;
        neighbor: boolean = false;
        y: number;
        visited: boolean = false;

        constructor(x: number, y: number) {
            this.x = x;
            this.y = y;
        }

        get tailwind_borders() {
            let style = "";

            if (this.walls[0]) {
                style += " border-t-2 ";
            }

            if (this.walls[1]) {
                style += " border-r-2 ";
            }

            if (this.walls[3]) {
                style += " border-l-2 ";
            }

            if (this.walls[4]) {
                style += " border-b-2 ";
            }

            if (style.length > 0) {
                style += "border-black";
                return style;
            } else {
                return "border-none";
            }
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
                board[x][y].neighbor = true;
                neighbors.push(board[x][y]);
            }
        }
        return neighbors;
    }

    function remove_ajoining_wall(cell: Cell, neighbor: Cell) {
        let x = cell.x - neighbor.x;
        let y = cell.y - neighbor.y;

        if (x === 1) {
            cell.walls[0] = false;
            neighbor.walls[2] = false;
        } else if (x === -1) {
            cell.walls[2] = false;
            neighbor.walls[0] = false;
        }

        if (y === 1) {
            cell.walls[3] = false;
            neighbor.walls[1] = false;
        } else if (y === -1) {
            cell.walls[1] = false;
            neighbor.walls[3] = false;
        }
    }

    let stop = false;
    let current =
        board[Math.floor(Math.random() * size)][
            Math.floor(Math.random() * size)
        ];

    async function generate_maze(cell: Cell) {
        board = board;
        cell.visited = true;
        let neighbors = get_neighbors(cell);
        while (neighbors.length > 0 && !stop) {
            const neighbor =
                neighbors[Math.floor(Math.random() * neighbors.length)];
            current = neighbor;
            remove_ajoining_wall(cell, neighbor);
            if (!stop) {
                board = board;
                await new Promise((r) => setTimeout(r, speed));
                await generate_maze(neighbor);
            }

            neighbors = get_neighbors(cell);
        }
    }

    function get_color(cell: Cell) {
        if (cell.visited) {
            return "bg-red-400";
        } else if (cell.neighbor) {
            return "bg-blue-400";
        } else {
            return "bg-white";
        }
    }
</script>

<main
    class="w-screen h-screen flex bg-white/95 justify-center items-center flex-col gap-4"
>
    <span class="gap-4 flex flex-row">
        <button
            class="p-2 rounded-md shadow-md bg-blue-600/30 font-mono text-center text-white"
            on:click={() => generate_maze(current)}>Generate Maze</button
        >
        <button
            class="p-2 rounded-md shadow-md bg-red-600/30 font-mono text-center text-white"
            on:click={() => (stop = true)}>Stop</button
        >
        <button
            class="p-2 rounded-md shadow-md bg-black font-mono text-center text-white"
            on:click={() => clear_board()}>Clear</button
        >
    </span>
    <div
        class="rounded-lg overflow-clip shadow-lg"
        style={`display: grid; grid-template-columns: repeat(${size}, 1fr); grid-auto-rows: minmax(0, auto); `}
    >
        {#each board as row}
            {#each row as cell}
                <span
                    class={`-m-[2px] w-5 h-5 ${get_color(cell)} ${cell.tailwind_borders}`}
                ></span>
            {/each}
        {/each}
    </div>
</main>
