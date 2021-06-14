type LoggerFn = (...any:[]) => void

export class Logger{
    /**
     * Static setter for debug logger
     */
    static setDefaultDebugLog(loggerFn: LoggerFn): void

    /**
     * Static setter for warn logger
     */
    static setDefaultWarnLog(loggerFn: LoggerFn): void

    /**
     * Static setter for error logger
     */
    static setDefaultErrorLog(loggerFn: LoggerFn): void

    /**
     * Enable debug for namespaces (no namespace = all)
     */
    static enable(...namespaces?:string): void

    /**
     * Disable debug
     */
    static disable(): void

    constructor(prefix: string)

    get debug():void

    get warn():void

    get error():void
}