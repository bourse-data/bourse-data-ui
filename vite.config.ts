import {defineConfig, loadEnv} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({mode}) => {
    const env = loadEnv(mode, '.', '');
    const codalProxyTarget = env.VITE_CODAL_PROXY_TARGET ?? 'http://localhost:9002';
    const dataProxyTarget = env.VITE_BOURSE_DATA_PROXY_TARGET ?? 'http://localhost:9003';

    return {
        plugins: [react()],
        server: {
            port: 5174,
            proxy: {
                '/api/codal': {
                    target: codalProxyTarget,
                    changeOrigin: true,
                    secure: false,
                    rewrite: (path) => path.replace(/^\/api\/codal/, '/codal/api/v1'),
                },
                '/api/data': {
                    target: dataProxyTarget,
                    changeOrigin: true,
                    secure: false,
                    rewrite: (path) => path.replace(/^\/api\/data/, ''),
                },
            },
        },
    };
});
