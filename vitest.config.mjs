import {defineConfig} from 'vitest/config';
// Server tests hold 25-second long polls and wait out five-second round countdowns.
export default defineConfig({test:{include:['tests/*.test.mjs'],testTimeout:60000,hookTimeout:30000}});
