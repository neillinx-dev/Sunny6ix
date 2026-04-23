/// <reference types="vite/client" />
/// <reference types="google.maps" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
