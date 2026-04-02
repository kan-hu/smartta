import { useState } from 'react'
import PhotoUpload from './PhotoUpload'
import { MASTERY_STATUS } from '../lib/store'

export default function GradingUpload({ student, knowledgePoints, lessonId, apiKey, onResult }) {
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  async function handlePhoto(base64) {
    if (!base64) { setResult(null); return }
    setAnalyzing(true)
    setError('')
    try {
      const res = await fetch('/api/analyze-grading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey || '' },
        body: JSON.stringify({
          imageBase64: base64,
          knowledgePoints,
          studentName: student.name,
          subject: '',
        }),
      })
      const data = await res.json()

      if (data.fallback) {
        setError('AI视觉暂不可用，请手动标记掌握情况')
        return
      }
      if (data.error) { setError(data.error); return }

      setResult(data)
      onResult && onResult({
        studentId: student.id,
        studentName: student.name,
        lessonId,
        mastery: data.mastery || [],
        errors: (data.errors || []).map(e => ({
          ...e,
          studentId: student.id,
          studentName: student.name,
          lessonId,
        })),
        overallScore: data.overallScore,
        summary: data.summary,
      })
    } catch (err) {
      setError('解析失败：' + err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  // 手动切换掌握状态
  function toggleMastery(pointId, status) {
    if (!result) return
    const newMastery = (result.mastery || []).map(m =>
      m.id === pointId ? { ...m, status } : m
    )
    const updated = { ...result, mastery: newMastery }
    setResult(updated)
    onResult && onResult({
      studentId: student.id,
      studentName: student.name,
      lessonId,
      mastery: newMastery,
      errors: updated.errors || [],
      overallScore: updated.overallScore,
      summary: updated.summary,
    })
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* 学生标题 */}
      <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold text-sm">
            {student.name[0]}
          </div>
          <span className="font-medium text-gray-700 text-sm">{student.name}</span>
        </div>
        {result?.overallScore != null && (
          <div className="text-sm font-bold text-brand-600">{result.overallScore}分</div>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* 拍照上传 */}
        <PhotoUpload
          hint="拍摄批改后的作业（✓勾/✗叉/△半勾）"
          onImage={handlePhoto}
        />

        {analyzing && (
          <div className="flex items-center gap-2 text-sm text-brand-600 bg-brand-50 rounded-xl p-3">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            AI识别批改标记中...
          </div>
        )}

        {error && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">{error}</div>
        )}

        {/* AI解析结果 */}
        {result && (
          <div className="space-y-2">
            {result.summary && (
              <div className="text-xs text-brand-600 bg-brand-50 rounded-lg p-2">{result.summary}</div>
            )}

            {/* 每个知识点掌握情况 */}
            {result.mastery?.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">各知识点掌握情况</div>
                {result.mastery.map(m => {
                  const st = MASTERY_STATUS[m.status] || MASTERY_STATUS.partial
                  return (
                    <div key={m.id} className="flex items-center gap-2">
                      <div className="text-xs text-gray-600 flex-1">{m.name}</div>
                      <div className="flex gap-1">
                        {Object.entries(MASTERY_STATUS).map(([key, val]) => (
                          <button
                            key={key}
                            onClick={() => toggleMastery(m.id, key)}
                            className={`w-7 h-7 rounded-lg text-sm font-bold border transition-all ${
                              m.status === key
                                ? `${val.color} border-current`
                                : 'bg-white text-gray-300 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {val.icon}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* 错题摘要 */}
            {result.errors?.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 space-y-1">
                <div className="text-xs font-semibold text-red-600">
                  ✗ 错题 / 薄弱点（{result.errors.length}个，已存入错题库）
                </div>
                {result.errors.map((e, i) => (
                  <div key={i} className="text-xs text-red-500 flex items-start gap-1">
                    <span className="flex-shrink-0">{e.type === 'partial' ? '△' : '✗'}</span>
                    <span><span className="font-medium">{e.pointName}</span>：{e.desc}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 如果AI没返回知识点，显示无知识点提示 */}
            {(!result.mastery || result.mastery.length === 0) && knowledgePoints.length === 0 && (
              <div className="text-xs text-gray-400 text-center py-2">
                请先在基本信息中设置知识点，以便精准匹配
              </div>
            )}
          </div>
        )}

        {/* 无照片时的手动快捷录入 */}
        {!result && !analyzing && knowledgePoints.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs text-gray-400">或手动标记（无需拍照）：</div>
            {knowledgePoints.map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <div className="text-xs text-gray-600 flex-1">{p.name}</div>
                <div className="flex gap-1">
                  {Object.entries(MASTERY_STATUS).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => {
                        const current = result?.mastery?.find(m => m.id === p.id)
                        const newStatus = current?.status === key ? null : key
                        const mastery = knowledgePoints.map(kp => ({
                          id: kp.id,
                          name: kp.name,
                          status: kp.id === p.id ? newStatus || 'mastered' : (result?.mastery?.find(m => m.id === kp.id)?.status || 'mastered')
                        }))
                        const fakeResult = { ...(result || {}), mastery, errors: result?.errors || [] }
                        setResult(fakeResult)
                        onResult && onResult({
                          studentId: student.id,
                          studentName: student.name,
                          lessonId,
                          mastery: fakeResult.mastery,
                          errors: fakeResult.errors,
                        })
                      }}
                      className={`w-7 h-7 rounded-lg text-sm font-bold border transition-all ${
                        result?.mastery?.find(m => m.id === p.id)?.status === key
                          ? `${val.color} border-current`
                          : 'bg-white text-gray-300 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {val.icon}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
