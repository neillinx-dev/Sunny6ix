/**
 * ShadowOverlay — a Google Maps OverlayView that draws all building shadows
 * onto a single HTML canvas. Because shadows are rasterized onto the same
 * canvas and the canvas has a uniform CSS opacity, overlapping shadow
 * polygons FLATTEN into a single uniform shade — no compounding darkness.
 *
 * The alternative (google.maps.Data layer) composites each polygon
 * independently, so two stacked semi-transparent polygons look darker than
 * one. Binary "in shadow or not" is much easier to read.
 */
export function createShadowOverlay(): google.maps.OverlayView & {
  setShadows: (shadows: [number, number][][]) => void
  setOpacity: (opacity: number) => void
} {
  class ShadowOverlay extends google.maps.OverlayView {
    private canvas: HTMLCanvasElement
    private shadows: [number, number][][] = []

    constructor() {
      super()
      this.canvas = document.createElement('canvas')
      this.canvas.style.position = 'absolute'
      this.canvas.style.pointerEvents = 'none'
      this.canvas.style.opacity = '0.45'
      this.canvas.style.willChange = 'transform'
    }

    onAdd() {
      const pane = this.getPanes()?.overlayLayer
      pane?.appendChild(this.canvas)
    }

    onRemove() {
      this.canvas.remove()
    }

    setShadows(shadows: [number, number][][]) {
      this.shadows = shadows
      this.draw()
    }

    setOpacity(opacity: number) {
      this.canvas.style.opacity = String(opacity)
    }

    draw() {
      const projection = this.getProjection()
      const map = this.getMap() as google.maps.Map | undefined
      if (!projection || !map) return

      const bounds = map.getBounds()
      if (!bounds) return

      // Compute the pixel rect for the current map viewport, in the
      // overlayLayer pane's coordinate system.
      const ne = bounds.getNorthEast()
      const sw = bounds.getSouthWest()
      const topLeftLatLng = new google.maps.LatLng(ne.lat(), sw.lng())
      const bottomRightLatLng = new google.maps.LatLng(sw.lat(), ne.lng())
      const topLeft = projection.fromLatLngToDivPixel(topLeftLatLng)
      const bottomRight = projection.fromLatLngToDivPixel(bottomRightLatLng)
      if (!topLeft || !bottomRight) return

      const widthCss = Math.max(1, bottomRight.x - topLeft.x)
      const heightCss = Math.max(1, bottomRight.y - topLeft.y)
      const dpr = window.devicePixelRatio || 1

      // Size canvas (backing store × DPR for sharpness, CSS size for layout)
      if (this.canvas.width !== Math.round(widthCss * dpr)) {
        this.canvas.width = Math.round(widthCss * dpr)
      }
      if (this.canvas.height !== Math.round(heightCss * dpr)) {
        this.canvas.height = Math.round(heightCss * dpr)
      }
      this.canvas.style.width = widthCss + 'px'
      this.canvas.style.height = heightCss + 'px'
      this.canvas.style.left = topLeft.x + 'px'
      this.canvas.style.top = topLeft.y + 'px'

      const ctx = this.canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      ctx.save()
      ctx.scale(dpr, dpr)

      // Draw every shadow polygon at full opacity — the canvas itself is
      // dimmed via CSS opacity, so overlaps don't compound.
      ctx.fillStyle = '#0f172a'
      for (const poly of this.shadows) {
        if (poly.length < 3) continue
        ctx.beginPath()
        for (let i = 0; i < poly.length; i++) {
          const [lng, lat] = poly[i]
          const p = projection.fromLatLngToDivPixel(new google.maps.LatLng(lat, lng))
          if (!p) continue
          const x = p.x - topLeft.x
          const y = p.y - topLeft.y
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.fill()
      }

      ctx.restore()
    }
  }

  return new ShadowOverlay() as google.maps.OverlayView & {
    setShadows: (shadows: [number, number][][]) => void
    setOpacity: (opacity: number) => void
  }
}
