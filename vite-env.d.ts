 

interface ImportMetaEnv {
  readonly VITE_SPOTIFY_CLIENT_ID: string
  readonly VITE_SPOTIFY_CLIENT_SECRET: string
  readonly VITE_LASTFM_API_KEY?: string
  readonly [key: string]: any
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
