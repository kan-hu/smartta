import { useEffect, useState } from 'react'
import { getLessons } from '../lib/store'

export default function FeedbackHistory() {
  const [lessons, setLessons] = useState([])
  const [selected, setSelected] = useState(null)
  const [copiedKey, setCopiedKey] = useState('')

  useEffect(() => {
    setLessons(getLessons())
  }, [])

  function copyText(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(''), 2000)
    })
  }

  if (selected) {
    const lesson = lessons.find(l => l.id === selected)
    if (!lesson) return null
    const fb = lesson.feedback || {}
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button className="btn-secondary text-sm" onClick={() => setSelected(null)}>← 返回列表</button>
          <div>
            <div className="font-bold text-gray-800">{lesson.className}</div>
            <div className="text-xs text-gray-400">第{lesson.lessonNumber}次课 · {lesson.date}</div>
          </div>
        </div>

        {/* 群内反馈 */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">📢 群内反馈版</h3>
            <button
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all border ${
                copiedKey === 'group' ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-gray-200 text-gray-600'
              }`}
              onClick={() => copyText(fb.groupFeedback || '', 'group')}
            >
              {copiedKey === 'group' ? '✓ 已复制' : '复制'}
            </button>
          </div>
          <div className="feedback-box">{fb.groupFeedback || '暂无'}</div>
        </div>

        {/* 私聊版 */}
        {fb.privateFeedback && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800">💬 私聊反馈版（全文）</h3>
              <button
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all border ${
                  copiedKey === 'private' ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-gray-200 text-gray-600'
                }`}
                onClick={() => copyText(fb.privateFeedback || '', 'private')}
              >
                {copiedKey === 'private' ? '✓ 已复制' : '复制'}
              </button>
            </div>
            <div className="feedback-box">{fb.privateFeedback}</div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <h1 className="font-bold text-gray-800 text-lg">💬 反馈历史</h1>

      {lessons.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">💬</div>
          <div>暂无记录，完成一次课程记录后会自动保存</div>
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map(l => (
            <div
              key={l.id}
              className="card p-4 flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelected(l.id)}
            >
              <div>
                <div className="font-semibold text-gray-800">{l.className}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  第{l.lessonNumber}次课 · {l.date}
                  {l.topic ? ` · ${l.topic}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                {l.feedback ? (
                  <span className="tag bg-brand-100 text-brand-600">已生成反馈</span>
                ) : (
                  <span className="tag bg-gray-100 text-gray-400">无反馈</span>
                )}
                <span>›</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
