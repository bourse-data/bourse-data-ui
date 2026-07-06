import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(function (_a) {
    var _b, _c;
    var mode = _a.mode;
    var env = loadEnv(mode, '.', '');
    var codalProxyTarget = (_b = env.VITE_CODAL_PROXY_TARGET) !== null && _b !== void 0 ? _b : 'http://localhost:9002';
    var dataProxyTarget = (_c = env.VITE_BOURSE_DATA_PROXY_TARGET) !== null && _c !== void 0 ? _c : 'http://localhost:9003';
    return {
        plugins: [react()],
        server: {
            port: 5174,
            proxy: {
                '/api/codal': {
                    target: codalProxyTarget,
                    changeOrigin: true,
                    secure: false,
                    rewrite: function (path) { return path.replace(/^\/api\/codal/, '/codal/api/v1'); },
                },
                '/api/data': {
                    target: dataProxyTarget,
                    changeOrigin: true,
                    secure: false,
                    rewrite: function (path) { return path.replace(/^\/api\/data/, ''); },
                },
            },
        },
    };
});
