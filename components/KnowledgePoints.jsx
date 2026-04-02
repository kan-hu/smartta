import { useState } from 'react'
import PhotoUpload from './PhotoUpload'

export default function KnowledgePoints({ points, onChange, subject, apiKey, onTopicChange, topic }) {
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [showManualAdd, setShowManualAdd] = useState(false)
  const [newPointText, setNewPointText] = useState('')

  async function handlePhotoAnalyze(base64) {
    if (!base64) return
    setAnalyzing(true)
    setError('')
    try {
      const res = await fetch('/api/analyze-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey || '' },
        body: JSON.stringify({ imageBase64: base64, subject }),
      })
      const data = await res.json()

      if (data.fallback) {
        setError('AI视觉解析暂不可用，请手动输入知识点')
        return
      }
      if (data.error) { setError(data.error); return }

      if (data.topic) onTopicChange && onTopicChange(data.topic)
      if (data.points?.length > 0) {
        onChange(data.points.map((p, i) => ({ id: i + 1, name: p.name, desc: p.desc || '' })))
      }
    } catch (err) {
      setError('解析失败：' + err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  function startEdit(p) {
    setEditingId(p.id)
    setEditText(p.name)
  }

  function saveEdit(id) {
    onChange(points.map(p => p.id === id ? { ...p, name: editText } : p))
    setEditingId(null)
  }

  function removePoint(id) {
    onChange(points.filter(p => p.id !== id))
  }

  function addPoint() {
    if (!newPointText.trim()) return
    const newId = Math.max(0, ...points.map(p => p.id)) + 1
    onChange([...points, { id: newId, name: newPointText.trim(), desc: '' }])
    setNewPointText('')
    setShowManualAdd(false)
  }

  function moveUp(idx) {
    if (idx === 0) return
    const arr = [...points]
    ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
    onChange(arr)
  }

  function moveDown(idx) {
    if (idx === points.length - 1) return
    const arr = [...points]
    ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
    onChange(arr)
  }

  return (
    <div className="space-y-3">
      {/* 拍照上传区 */}
      <PhotoUpload
        label="📷 拍照解析教案/导学案"
        hint="拍摄教案或导学案，AI自动提取知识点"
        onImage={handlePhotoAnalyze}
      />

      {analyzing && (
        <div className="flex items-center gap-2 text-sm text-brand-600 bg-brand-50 rounded-xl p-3">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          AI正在识别知识点...
        </div>
      )}

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">{error}</div>
      )}

      {/* 知识点列表 */}
      {points.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
            <span>知识点列表（{points.length}个）</span>
            <span className="text-gray-400 font-normal">可拖拽排序或点击编辑</span>
          </div>
          {points.map((p, idx) => (
            <div key={p.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveUp(idx)} disabled={idx === 0}
                  className="text-gray-300 hover:text-gray-500 disabled:opacity-20 leading-none text-xs">▲</button>
                <button onClick={() => moveDown(idx)} disabled={idx === points.length - 1}
                  className="text-gray-300 hover:text-gray-500 disabled:opacity-20 leading-none text-xs">▼</button>
              </div>
              <div className="w-6 h-6 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 text-xs font-bold flex-shrink-0">
                {idx + 1}
              </div>
              {editingId === p.id ? (
                <div className="flex-1 flex gap-2">
                  <input
                    className="input flex-1 py-1 text-sm"
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(p.id) }}
                    autoFocus
                  />
                  <button className="btn-primary text-xs py-1 px-3" onClick={() => saveEdit(p.id)}>保存</button>
                  <button className="btn-secondary text-xs py-1 px-2" onClick={() => setEditingId(null)}>取消</button>
                </div>
              ) : (
                <div className="flex-1 text-sm text-gray-700 cursor-pointer hover:text-brand-600"
                  onClick={() => startEdit(p)}>
                  {p.name}
                  {p.desc && <span className="text-xs text-gray-400 ml-2">{p.desc}</span>}
                </div>
              )}
              <button onClick={() => startEdit(p)} className="text-gray-400 hover:text-gray-600 text-sm px-1">✏️</button>
              <button onClick={() => removePoint(p.id)} className="text-gray-300 hover:text-red-400 text-sm px-1">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* 手动添加 */}
      {showManualAdd ? (
        <div className="flex gap-2">
          <input
            className="input flex-1 text-sm"
            value={newPointText}
            onChange={e => setNewPointText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addPoint() }}
            placeholder="输入知识点名称"
            autoFocus
          />
          <button className="btn-primary text-sm px-4" onClick={addPoint}>添加</button>
          <button className="btn-secondary text-sm px-3" onClick={() => setShowManualAdd(false)}>取消</button>
        </div>
      ) : (
        <button
          className="w-full border border-dashed border-gray-300 rounded-xl py-2 text-sm text-gray-400 hover:border-brand-300 hover:text-brand-500 transition-colors"
          onClick={() => setShowManualAdd(true)}
        >
          + 手动添加知识点
        </button>
      )}
    </div>
  )
}
