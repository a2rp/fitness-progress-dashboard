import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
    base: "/fitness-progress-dashboard/",
    build: { sourcemap: false },
    plugins: [react()],
});