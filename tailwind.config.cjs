/** @type {import('tailwindcss').Config}*/
const config = {
    content: ["./src/**/*.{html,js,svelte,ts}"],

    theme: {
        extend: {},
    },

    safelist: [
        "border-t-2",
        "border-b-2",
        "border-l-2",
        "border-r-2",

    ],
    plugins: [],

};

module.exports = config;
