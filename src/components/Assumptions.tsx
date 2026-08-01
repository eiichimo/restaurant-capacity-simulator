export function Assumptions() {
  return (
    <section className="panel assumptions" aria-labelledby="assumptions-heading">
      <div className="section-heading"><span>i</span><div><h2 id="assumptions-heading">計算前提と注意事項</h2><p>結果を読む前に、モデルの範囲をご確認ください。</p></div></div>
      <div className="assumption-grid">
        <div><h3>座席の扱い</h3><p>通常卓の相席・卓連結・店内待ちは扱いません。連続カウンターだけは、同じ列内の隣接空席へグループを案内します。</p></div>
        <div><h3>時間の扱い</h3><p>注文待ちから片付けまで卓を占有します。稼働率は開店〜ラストオーダーのみ、以後は終了後処理として集計します。</p></div>
        <div><h3>需要と厨房</h3><p>来店は時間帯別ポアソン過程の近似です。メニュー別工程、スタッフ差、追加注文、テイクアウトは扱いません。</p></div>
        <div><h3>意思決定</h3><p>入力条件に基づく確率的な試算であり、実際の売上・経営成果・数学的な上限を保証するものではありません。</p></div>
      </div>
    </section>
  )
}
