/**
 * Dedicated Web Worker that runs the image pipeline off the main thread,
 * so batch jobs never freeze the UI.
 *
 * Protocol:
 *   main → worker: { id, fileName, data: ArrayBuffer, settings }
 *   worker → main: { id, ok: true, result } | { id, ok: false, code, message }
 * Buffers are transferred, not copied.
 *
 * Bundled by WXT/Vite as a real worker chunk; no Astro, no import.meta.env.
 */
import {
  processImageBytes,
  ProcessError,
  type ProcessedImage,
  type ProcessSettings,
} from './engine';

interface WorkerRequest {
  id: number;
  fileName: string;
  data: ArrayBuffer;
  settings: ProcessSettings;
}

interface WorkerSuccess {
  id: number;
  ok: true;
  result: Omit<ProcessedImage, 'data'> & { data: ArrayBuffer };
}

interface WorkerFailure {
  id: number;
  ok: false;
  code: string;
  message: string;
}

type WorkerResponse = WorkerSuccess | WorkerFailure;

// Minimal worker-global typing that coexists with the DOM lib
// (no WebWorker lib conflict: tsconfig already includes it, but this
// keeps the handler explicit and portable).
const scope = globalThis as unknown as {
  onmessage: ((ev: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: (message: WorkerResponse, transfer: Transferable[]) => void;
};

scope.onmessage = async (ev: MessageEvent<WorkerRequest>) => {
  const { id, fileName, data, settings } = ev.data;
  try {
    const result = await processImageBytes(new Uint8Array(data), fileName, settings);
    // Copy to an exactly-sized buffer before transferring.
    const outBuffer = result.data.buffer.slice(
      result.data.byteOffset,
      result.data.byteOffset + result.data.byteLength,
    ) as ArrayBuffer;
    const out: WorkerSuccess = {
      id,
      ok: true,
      result: { ...result, data: outBuffer },
    };
    scope.postMessage(out, [outBuffer]);
  } catch (err) {
    const failure: WorkerFailure = {
      id,
      ok: false,
      code: err instanceof ProcessError ? err.code : 'encode-failed',
      message: err instanceof Error ? err.message : 'An unknown processing error occurred.',
    };
    scope.postMessage(failure, []);
  }
};
