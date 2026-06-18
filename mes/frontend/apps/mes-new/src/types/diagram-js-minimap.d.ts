declare module 'diagram-js-minimap' {
  const minimapModule: { __init__: string[]; [key: string]: unknown }
  export default minimapModule
}

declare module 'diagram-js/lib/draw/BaseRenderer' {
  export default class BaseRenderer {
    constructor(eventBus: unknown, priority?: number)
    canRender(element: unknown): boolean
    drawShape(parent: unknown, element: unknown): SVGElement
    drawConnection(parent: unknown, element: unknown): SVGElement
    getShapePath(element: unknown): string
    getConnectionPath(connection: unknown): string
  }
}
