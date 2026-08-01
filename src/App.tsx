import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrivalsForm } from './components/ArrivalsForm'
import { Assumptions } from './components/Assumptions'
import { BottleneckPanel } from './components/BottleneckPanel'
import { BusinessForm } from './components/BusinessForm'
import { ChartsSection } from './components/ChartsSection'
import { FormField } from './components/FormField'
import { KitchenPricingForm } from './components/KitchenPricingForm'
import { ResultsDashboard } from './components/ResultsDashboard'
import { TablesForm } from './components/TablesForm'
import { clonePreset, DEFAULT_CONFIG, PRESETS } from './presets'
import type { AnalysisResult, SimulatorConfig, TrialCount } from './simulation/types'
import { parseConfigJson, validateConfig } from './simulation/validation'
import { downloadConfig, downloadResultsCsv } from './utils/export'

const STORAGE_KEY = 'restaurant-capacity-simulator:settings:v1'

type WorkerMessage =
  | { type: 'progress'; progress: number }
  | { type: 'complete'; result: AnalysisResult }
  | { type: 'error'; message: string }

function loadInitialConfig(): SimulatorConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = parseConfigJson(saved)
      if (parsed.config) return parsed.config
    }
  } catch {
    // ストレージが無効な環境でも、シミュレーター本体は利用できるよう既定値へ戻す。
  }
  return structuredClone(DEFAULT_CONFIG)
}

export default function App() {
  const [config, setConfig] = useState<SimulatorConfig>(loadInitialConfig)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch {
      setNotice('ブラウザの保存領域を利用できないため、自動保存は無効です。')
    }
  }, [config])

  useEffect(
    () => () => {
      workerRef.current?.terminate()
    },
    [],
  )

  const replaceConfig = (next: SimulatorConfig, message = '') => {
    setConfig(next)
    setResult(null)
    setErrors([])
    setNotice(message)
  }

  const patchConfig = <K extends keyof SimulatorConfig>(key: K, value: SimulatorConfig[K]) => {
    replaceConfig({ ...config, [key]: value })
  }

  const runSimulation = (event: FormEvent) => {
    event.preventDefault()
    const validation = validateConfig(config)
    if (!validation.valid) {
      setErrors(validation.errors)
      setNotice('')
      document.getElementById('validation-errors')?.focus()
      return
    }
    workerRef.current?.terminate()
    const worker = new Worker(new URL('./workers/simulation.worker.ts', import.meta.url), {
      type: 'module',
    })
    workerRef.current = worker
    setRunning(true)
    setProgress(0)
    setErrors([])
    setNotice('')
    worker.onmessage = (message: MessageEvent<WorkerMessage>) => {
      if (message.data.type === 'progress') {
        setProgress(message.data.progress)
      } else if (message.data.type === 'complete') {
        setResult(message.data.result)
        setRunning(false)
        setProgress(100)
        worker.terminate()
        workerRef.current = null
        window.setTimeout(() => document.getElementById('results-heading')?.focus(), 0)
      } else {
        setErrors([message.data.message])
        setRunning(false)
        worker.terminate()
        workerRef.current = null
      }
    }
    worker.onerror = () => {
      setErrors(['Web Workerの実行に失敗しました。ページを再読み込みしてお試しください。'])
      setRunning(false)
      worker.terminate()
      workerRef.current = null
    }
    worker.postMessage(config)
  }

  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const parsed = parseConfigJson(await file.text())
      if (!parsed.config) {
        setErrors(parsed.errors)
        setNotice('')
        return
      }
      replaceConfig(parsed.config, '設定JSONを読み込みました。')
    } catch {
      setErrors(['設定ファイルを読み込めませんでした。'])
    }
  }

  return (
    <>
      <header className="hero">
        <div className="hero-inner">
          <p className="eyebrow">RESTAURANT CAPACITY LAB</p>
          <h1>飲食店 売上キャパシティ・<br className="desktop-break" />シミュレーター</h1>
          <p className="hero-copy">席数だけでは見えない「卓の組み合わせ」「厨房の待ち」「滞在時間」を、1日単位のモンテカルロ・シミュレーションで読み解きます。</p>
          <div className="hero-tags" aria-label="アプリの特徴"><span>ブラウザ内で完結</span><span>シードで再現可能</span><span>データ送信なし</span></div>
        </div>
      </header>

      <main>
        <section className="preset-bar" aria-labelledby="preset-heading">
          <div><h2 id="preset-heading">計算例から始める</h2><p>プリセットは特定業態の標準値ではなく、入力例です。</p></div>
          <div className="preset-actions">
            <label htmlFor="preset-select">プリセット</label>
            <select id="preset-select" defaultValue="" onChange={(event) => {
              const name = event.target.value
              if (name) replaceConfig(clonePreset(name), `${name}を適用しました。`)
              event.target.value = ''
            }}>
              <option value="" disabled>選択してください</option>
              {Object.keys(PRESETS).map((name) => <option key={name}>{name}</option>)}
            </select>
          </div>
        </section>

        <form onSubmit={runSimulation} noValidate>
          <BusinessForm config={config} onChange={(business) => patchConfig('business', business)} />
          <TablesForm config={config} onChange={(tables) => patchConfig('tables', tables)} />
          <ArrivalsForm config={config} onPeriodsChange={(arrivalPeriods) => patchConfig('arrivalPeriods', arrivalPeriods)} onWeightsChange={(partySizeWeights) => patchConfig('partySizeWeights', partySizeWeights)} />
          <KitchenPricingForm config={config} onKitchenChange={(kitchen) => patchConfig('kitchen', kitchen)} onPricingChange={(pricing) => patchConfig('pricing', pricing)} />

          <section className="panel" aria-labelledby="settings-heading">
            <div className="section-heading"><span>06</span><div><h2 id="settings-heading">シミュレーション設定</h2><p>同じ設定・シード・試行回数なら、常に同じ結果になります。</p></div></div>
            <div className="form-grid compact-grid">
              <FormField id="seed" label="シード値" hint="整数を入力" type="number" step="1" value={config.seed} onChange={(event) => patchConfig('seed', Number(event.target.value))} />
              <div className="field"><label htmlFor="trials">試行回数</label><select id="trials" value={config.trials} onChange={(event) => patchConfig('trials', Number(event.target.value) as TrialCount)}><option value="100">100回</option><option value="1000">1,000回（推奨）</option><option value="5000">5,000回</option><option value="10000">10,000回</option></select><small>通常需要と飽和需要をそれぞれ同じ回数試行します。</small></div>
            </div>
            <div className="data-actions" aria-label="設定データ操作">
              <button type="button" className="button secondary" onClick={() => downloadConfig(config)}>設定JSONを保存</button>
              <label className="button secondary file-button" htmlFor="config-file">設定JSONを読み込む</label>
              <input className="visually-hidden" id="config-file" type="file" accept="application/json,.json" onChange={importJson} />
              <button type="button" className="button danger ghost" onClick={() => replaceConfig(structuredClone(DEFAULT_CONFIG), '初期設定に戻しました。')}>初期設定へ戻す</button>
            </div>
          </section>

          {errors.length > 0 && <div id="validation-errors" className="alert error-alert" role="alert" tabIndex={-1}><strong>入力内容を確認してください</strong><ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
          {notice && <p className="alert notice-alert" role="status">{notice}</p>}

          <section className="run-panel" aria-labelledby="run-heading">
            <div><p className="eyebrow">READY TO SIMULATE</p><h2 id="run-heading">この条件で1日の営業を試算</h2><p>通常需要に加え、需要不足の影響を除く飽和需要も同時に計算します。</p></div>
            <button className="button run-button" type="submit" disabled={running}>{running ? `計算中… ${Math.round(progress)}%` : 'シミュレーションを実行'}</button>
            {running && <div className="progress-wrap"><progress max="100" value={progress}>{Math.round(progress)}%</progress><span aria-live="polite">通常・飽和需要をWeb Workerで計算中です。画面はそのまま操作できます。</span></div>}
          </section>
        </form>

        {result && <><ResultsDashboard result={result} onDownloadCsv={() => downloadResultsCsv(result)} /><ChartsSection result={result} /><BottleneckPanel result={result} /></>}
        <Assumptions />
      </main>
      <footer><p>飲食店 売上キャパシティ・シミュレーター — 入力データと計算結果は端末の外へ送信されません。</p></footer>
    </>
  )
}
