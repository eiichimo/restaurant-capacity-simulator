import { useMemo, useState } from 'react'
import { generateOperationalAdvice } from '../simulation/advice'
import type { AnalysisResult, SimulatorConfig } from '../simulation/types'
import { buildChatGptAnalysisPrompt } from '../utils/analysisPrompt'
import { copyText } from '../utils/clipboard'

interface Props {
  config: SimulatorConfig
  result: AnalysisResult
}

export function OperationalAdvicePanel({ config, result }: Props) {
  const advice = useMemo(() => generateOperationalAdvice(config, result), [config, result])
  const prompt = useMemo(() => buildChatGptAnalysisPrompt(config, result), [config, result])
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')

  const copyPrompt = async () => {
    try {
      await copyText(prompt)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('error')
    }
  }

  return (
    <section className="panel advice-panel" aria-labelledby="advice-heading">
      <div className="section-heading">
        <span>→</span>
        <div>
          <h2 id="advice-heading">運営改善の検討候補</h2>
          <p>計算結果から導いた比較試算の候補です。実行を推奨・保証するものではありません。</p>
        </div>
      </div>

      <div className="advice-grid">
        {advice.map((item, index) => (
          <article className="advice-card" key={item.id}>
            <p className="advice-number">仮説 {String(index + 1).padStart(2, '0')}</p>
            <h3>{item.title}</h3>
            <p>{item.rationale}</p>
            <h4>比較する条件</h4>
            <ul>
              {item.experiments.map((experiment) => (
                <li key={experiment}>{experiment}</li>
              ))}
            </ul>
            <p className="advice-caution"><strong>確認事項:</strong> {item.caution}</p>
          </article>
        ))}
      </div>

      <div className="ai-copy-box">
        <div>
          <p className="eyebrow">OPTIONAL AI REVIEW</p>
          <h3>ChatGPTで追加分析する</h3>
          <p>入力設定、主要結果、改善仮説、モデル制約をMarkdownにまとめます。コピーするまでデータはブラウザ外へ送信されません。</p>
        </div>
        <button className="button copy-button" type="button" onClick={copyPrompt}>
          {copyStatus === 'copied' ? 'コピーしました' : 'ChatGPT解析用テキストをコピー'}
        </button>
        <p className={`copy-status${copyStatus === 'error' ? ' copy-error' : ''}`} role="status" aria-live="polite">
          {copyStatus === 'copied' && 'ChatGPTの入力欄へ貼り付けて分析を依頼できます。'}
          {copyStatus === 'error' && '自動コピーに失敗しました。下の内容を手動で選択してコピーしてください。'}
        </p>
        <details className="prompt-preview">
          <summary>コピーする内容を確認・手動コピー</summary>
          <label className="visually-hidden" htmlFor="chatgpt-analysis-prompt">ChatGPT解析用テキスト</label>
          <textarea id="chatgpt-analysis-prompt" readOnly value={prompt} rows={18} onFocus={(event) => event.currentTarget.select()} />
        </details>
      </div>
    </section>
  )
}
