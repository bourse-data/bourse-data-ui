/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_CODAL_API_BASE_URL: string;
    readonly VITE_CODAL_PROXY_TARGET?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
