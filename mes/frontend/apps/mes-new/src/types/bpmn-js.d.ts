declare module 'bpmn-js/lib/Modeler' {
  export interface ImportResult {
    warnings: unknown[]
  }
  export interface SaveResult {
    xml: string
  }
  export default class Modeler {
    constructor(options?: Record<string, unknown>)
    importXML(xml: string): Promise<ImportResult>
    saveXML(options?: { format?: boolean }): Promise<SaveResult>
    get<T = unknown>(name: string): T
    on(event: string, callback: (event: unknown) => void): void
    destroy(): void
  }
}
