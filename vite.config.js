import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(function (_a) {
    var _b;
    var mode = _a.mode;
    // Backend dev target is overridable per-machine: some Windows/Hyper-V hosts
    // reserve port 3001 (EACCES on bind), so a dev sets VITE_API_TARGET in
    // frontend/.env (e.g. http://localhost:4000) and PORT to match in backend/.env.
    // Use 127.0.0.1 (not "localhost"): on Node 18+ the proxy resolves localhost to
    // ::1 first and can miss an IPv4-bound backend, causing ECONNREFUSED.
    var env = loadEnv(mode, process.cwd(), "");
    var apiTarget = (_b = env.VITE_API_TARGET) !== null && _b !== void 0 ? _b : "http://127.0.0.1:3001";
    return {
        plugins: [react()],
        resolve: {
            alias: { "@": path.resolve(__dirname, "./src") },
        },
        server: {
            host: true,
            port: 5173,
            proxy: {
                "/api": { target: apiTarget, changeOrigin: true },
            },
        },
    };
});
