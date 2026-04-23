/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENWEATHER_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'mapbox-gl-shadow-simulator' {
  export default class ShadeMap {
    constructor(options: {
      date?: Date
      color?: string
      opacity?: number
      apiKey: string
      terrainSource?: {
        maxZoom: number
        tileSize: number
        getSourceUrl: (params: { x: number; y: number; z: number }) => string
        getElevation: (params: { r: number; g: number; b: number; a: number }) => number
      }
      getFeatures?: () => Promise<any[]>
      debug?: (msg: string) => void
    })
    addTo(map: any): this
    remove(): void
    setDate(date: Date): this
    setColor(color: string): this
    setOpacity(opacity: number): this
    isPositionInSun(x: number, y: number): Promise<boolean>
    isPositionInShade(x: number, y: number): Promise<boolean>
    getHoursOfSun(x: number, y: number): number
    on(event: string, listener: (...args: any[]) => void): () => void
    removeAllListeners(): void
  }
}
