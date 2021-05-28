import { Debug, Debugger } from "debug";

type loggerFn = (...args: any[]) => void

interface JsSIPDebugger extends Debugger {
  isError: boolean
}

interface JsSIPDebug extends Debug {
  (namespace: string): JsSIPDebugger;
  setLogger: (loggerFn) => void
  setErrorLogger: (loggerFn) => void
}

export default JsSIPDebug;
