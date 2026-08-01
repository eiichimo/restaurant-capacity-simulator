/// <reference lib="webworker" />
import { runAnalysis } from '../simulation/engine'
import type { SimulatorConfig } from '../simulation/types'

declare const self: DedicatedWorkerGlobalScope

self.onmessage = (event: MessageEvent<SimulatorConfig>) => {
  try {
    const result = runAnalysis(event.data, (progress) => {
      self.postMessage({ type: 'progress', progress })
    })
    self.postMessage({ type: 'complete', result })
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'シミュレーション中に不明なエラーが発生しました。',
    })
  }
}

export {}
