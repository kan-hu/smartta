import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import {
  getStudents, getClasses, saveLesson, generateId, initDemoData,
  LAYER_LABELS, PERFORMANCE_OPTIONS, MASTERY_OPTIONS, HOMEWORK_OPTIONS, CHECKIN_OPTIONS,
  addErrors
} from '../lib/store'
import LessonPlanAnalyzer from '../components/LessonPlanAnalyzer'
import HomeworkAnalyzer from '../components/HomeworkAnalyzer'

const STEPS = [
  { key: 'setup',    label: '基本信息', icon: '📋' },
  { key: 'records',  label: '学员记录', icon: '✏️' },
  { key: 'homework', label: '作业批改', icon: '📷' },
  { key: 'generate', label: 'AI生成',   icon: '✨' },
]

export default function Lesson() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [classStudents, setClassStudents] = useState([])
  const [lessonData, setLessonData] = useState({
    topic: '', lessonNumber: 1, date: new Date().toISOString().slice(0, 10),
    records: {}, knowledgePoints: []
  })
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [activeStudentId, setActiveStudentId] = useState(null)
  const [copiedGroup, setCopiedGroup] = useState(false)
  const [copiedPrivate, setCopiedPrivate] = useState({})
  const [error, setError] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [homeworkResults, setHomeworkResults] = useState({})

  useEffect(() => {
    initDemoData()
    const cls = getClasses()
    const sts = getStudents()
    setClasses(cls)
    setStudents(sts)
    if (cls.length > 0) setSelectedClassId(cls[0].id)
    setApiKey(localStorage.getItem('smartta_deepseek_key') || '')
  }, [])

  useEffect(() => {
    if (!selectedClassId) return
    const cls = classes.find(c => c.id === selectedClassId)
    if (!cls) return
    const sts = students.filter(s => (cls.studentIds || []).includes(s.id))
    setClassStudents(sts)
    if (sts.length > 0) setActiveStudentId(sts[0].id)
    const records = {}
    sts.forEach(s => {
      records[s.id] = lessonData.records[s.id] || {
        homework: '', entranceScore: '', performance: '', mastery: '',
        practiceScore: '', exitCheck: '', note: '', parentTask: ''
      }
    })
    setLessonData(prev => ({ ...prev, records }))
  }, [selectedClassId, classes, students])

  function updateRecord(studentId, field, value) {
    setLessonData(prev => ({
      ...prev,
      records: { ...prev.records, [studentId]: { ...(prev.records[studentId] || {}), [field]: value } }
    }))
  }

  function handlePointsExtracted(points, topic) {
    setLessonData(prev => ({ ...prev, knowledgePoints: points, topic: topic || prev.topic }))
  }

  function handleHomeworkResult(studentId, result) {
    setHomeworkResults(prev => ({ ...prev, [studentId]: result }))
  }

  function saveToErrorBank(lessonId) {
    const entries = []
    classStudents.forEach(student => {
      const hw = homeworkResults[student.id]
      if (!hw?.masteryResults) return
      hw.masteryResults.forEach(r => {
        if (r.status === 'wrong' || r.status === 'partial') {
          entries.push({
            studentId: student.id,
            studentName: student.name,
            lessonId,
            pointId: r.pointId,
            pointName: r.pointName,
            status: r.status,
            note: r.note || '',
            subject: classes.find(c => c.id === selectedClassId)?.subject || '',
          })
        }
      })
    })
    if (entries.length > 0) addErrors(entries)
  }

  async function handleGenerate() {
    setError('')
    const cls = classes.find(c => c.id === selectedClassId)
    if (!cls) return
    const key = apiKey.trim()
    if (key) localStorage.setItem('smartta_deepseek_key', key)
    setLoading(true)
    try {
      const studentsWithMastery = classStudents.map(s => ({
        ...s,
        homeworkMastery: homeworkResults[s.id]?.masteryResults || [],
        homeworkSummary: homeworkResults[s.id]?.summary || '',
      }))
      const res = await fetch('/api/generate-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key },
        body: JSON.stringify({
          lessonData, students: studentsWithMastery,
          className: cls.name, lessonNumber: lessonData.lessonNumber,
          subject: cls.subject, knowledgePoints: lessonData.knowledgePoints,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '生成失败')
      const privateByStudent = {}
      classStudents.forEach(s => {
        const regex = new RegExp(`###\\s*${s.name}([\\s\\S]*?)(?=###|$)`)
        const match = data.privateFeedback?.match(regex)
        privateByStudent[s.id] = match ? match[1].trim() : data.privateFeedback || ''
      })
      setFeedback({ ...data, privateByStudent })
      const lessonId = generateId()
      saveLesson({ id: lessonId, classId: selectedClassId, className: cls.name, ...lessonData, homeworkResults, feedback: data, createdAt: new Date().toISOString() })
      saveToErrorBank(lessonId)
      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function copyText(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      if (key === 'group') { setCopiedGroup(true); setTimeout(() => setCopiedGroup(false), 2000) }
      else { setCopiedPrivate(p => ({ ...p, [key]: true })); setTimeout(() => setCopiedPrivate(p => ({ ...p, [key]: false })), 2000) }
    })
  }

  const selectedClass = classes.find(c => c.id === selectedClassId)
  const hasKnowledgePoints = lessonData.knowledgePoints.length > 0
  const homeworkAnalyzedCount = Object.keys(homeworkResults).length

  return (
    <div className="space-y-6">
      {/* 步骤条 */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1 flex-1">
            <div className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all flex-1 justify-center ${
              i === step ? 'bg-brand-500 text-white' : i < step ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <span>{s.icon}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`h-0.5 w-3 flex-shrink-0 ${i < step ? 'bg-brand-300' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 0: 基本信息 + 知识点提取 */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h2 className="font-bold text-gray-800">📋 基本信息</h2>
            {classes.length === 0 ? (
              <div className="text-center py-8 text-gray-400">暂无班级，请先<a href="/students" className="text-brand-500 underline ml-1">添加班级</a></div>
            ) : (
              <>
                <div>
                  <label className="label">选择班级</label>
                  <select className="select" value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}（{c.subject}，{(c.studentIds||[]).length}人）</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">课程日期</label>
                    <input type="date" className="input" value={lessonData.date} onChange={e => setLessonData(p => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">第几次课</label>
                    <input type="number" className="input" min={1} max={99} value={lessonData.lessonNumber} onChange={e => setLessonData(p => ({ ...p, lessonNumber: parseInt(e.target.value)||1 }))} />
                  </div>
                </div>
              </>
            )}
          </div>

          {selectedClassId && (
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-800">📖 今日知识点</h2>
                {hasKnowledgePoints && <span className="tag bg-brand-100 text-brand-600">{lessonData.knowledgePoints.length} 个知识点</span>}
              </div>
              <p className="text-xs text-gray-500">拍摄教案或导学案，AI自动提取知识点；也可手动输入</p>
              <LessonPlanAnalyzer
                subject={selectedClass?.subject}
                grade={classStudents[0]?.grade}
                apiKey={apiKey}
                onPointsExtracted={handlePointsExtracted}
              />
              {hasKnowledgePoints && (
                <div>
                  <label className="label">课堂主题（可修改）</label>
                  <input className="input" value={lessonData.topic} onChange={e => setLessonData(p => ({ ...p, topic: e.target.value }))} placeholder="本节课主题" />
                </div>
              )}
              {!hasKnowledgePoints && (
                <div>
                  <label className="label">今日内容（手动输入）</label>
                  <input className="input" value={lessonData.topic} onChange={e => setLessonData(p => ({ ...p, topic: e.target.value }))} placeholder="如：二次函数图象与性质" />
                </div>
              )}
            </div>
          )}

          <button className="btn-primary w-full" disabled={classStudents.length === 0} onClick={() => setStep(1)}>
            下一步：学员课堂记录 →
          </button>
        </div>
      )}

      {/* Step 1: 学员课堂记录 */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-800">✏️ 学员课堂记录</h2>
              <div className="text-xs text-gray-400">{selectedClass?.name} · 第{lessonData.lessonNumber}次课</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {classStudents.map(s => {
                const rec = lessonData.records[s.id] || {}
                const filled = [rec.homework, rec.performance, rec.exitCheck].filter(Boolean).length
                return (
                  <button key={s.id} onClick={() => setActiveStudentId(s.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1 ${
                      activeStudentId === s.id ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200'
                    }`}>
                    {s.name}
                    {filled > 0 && <span className={`w-1.5 h-1.5 rounded-full ${activeStudentId === s.id ? 'bg-white' : 'bg-brand-400'}`} />}
                  </button>
                )
              })}
            </div>
          </div>

          {classStudents.map(s => {
            if (s.id !== activeStudentId) return null
            const rec = lessonData.records[s.id] || {}
            const layerInfo = LAYER_LABELS[s.layer] || LAYER_LABELS.mid
            return (
              <div key={s.id} className="card p-5 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold">{s.name[0]}</div>
                  <div>
                    <div className="font-bold text-gray-800 flex items-center gap-2">{s.name}<span className={`tag ${layerInfo.color}`}>{layerInfo.label}</span></div>
                    <div className="text-xs text-gray-400">{s.grade}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">上次作业完成</label>
                    <div className="flex gap-2 flex-wrap">
                      {HOMEWORK_OPTIONS.map(o => (
                        <button key={o.value} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${rec.homework === o.value ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200'}`} onClick={() => updateRecord(s.id, 'homework', o.value)}>{o.label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">出门检查</label>
                    <div className="flex gap-2">
                      {CHECKIN_OPTIONS.map(o => (
                        <button key={o.value} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${rec.exitCheck === o.value ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200'}`} onClick={() => updateRecord(s.id, 'exitCheck', o.value)}>{o.label}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">进门测（分）</label>
                    <input type="number" className="input" min={0} max={100} value={rec.entranceScore} placeholder="0-100" onChange={e => updateRecord(s.id, 'entranceScore', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">当堂落实（分）</label>
                    <input type="number" className="input" min={0} max={100} value={rec.practiceScore} placeholder="0-100" onChange={e => updateRecord(s.id, 'practiceScore', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="label">课堂表现</label>
                  <div className="flex gap-2 flex-wrap">
                    {PERFORMANCE_OPTIONS.map(o => (
                      <button key={o.value} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${rec.performance === o.value ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200'}`} onClick={() => updateRecord(s.id, 'performance', o.value)}>{o.label}</button>
                    ))}
                  </div>
                </div>
                {hasKnowledgePoints ? (
                  <div>
                    <label className="label">知识点课堂掌握（✓良好 △一般 ✗未掌握）</label>
                    <div className="space-y-2">
                      {lessonData.knowledgePoints.map((kp, ki) => {
                        const kpKey = `kp_${kp.id}`
                        const cur = rec[kpKey] || ''
                        return (
                          <div key={kp.id} className="flex items-center gap-2">
                            <span className="text-xs text-gray-600 flex-1 truncate">{ki+1}. {kp.name}</span>
                            <div className="flex gap-1">
                              {[{ v:'full', l:'✓', c:'text-green-600 border-green-300 bg-green-50' },{ v:'partial', l:'△', c:'text-amber-600 border-amber-300 bg-amber-50' },{ v:'none', l:'✗', c:'text-red-600 border-red-300 bg-red-50' }].map(opt => (
                                <button key={opt.v} onClick={() => updateRecord(s.id, kpKey, opt.v)}
                                  className={`w-8 h-8 rounded-lg text-sm font-bold border transition-all ${cur === opt.v ? opt.c : 'bg-white text-gray-300 border-gray-200 hover:border-gray-400'}`}>{opt.l}</button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="label">知识点掌握情况</label>
                    <div className="flex gap-2 flex-wrap">
                      {MASTERY_OPTIONS.map(o => (
                        <button key={o.value} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${rec.mastery === o.value ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200'}`} onClick={() => updateRecord(s.id, 'mastery', o.value)}>{o.label}</button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="label">课堂备注</label>
                  <textarea rows={2} className="input resize-none" value={rec.note} placeholder="课堂特殊情况（可选）" onChange={e => updateRecord(s.id, 'note', e.target.value)} />
                </div>
                <div>
                  <label className="label">家长配合事项</label>
                  <input className="input" value={rec.parentTask} placeholder="如：监督孩子完成错题本（可选）" onChange={e => updateRecord(s.id, 'parentTask', e.target.value)} />
                </div>
                <div className="flex gap-2 pt-2">
                  {classStudents.findIndex(x => x.id === s.id) > 0 && (
                    <button className="btn-secondary text-sm flex-1" onClick={() => { const i = classStudents.findIndex(x => x.id === s.id); setActiveStudentId(classStudents[i-1].id) }}>← 上一位</button>
                  )}
                  {classStudents.findIndex(x => x.id === s.id) < classStudents.length - 1 ? (
                    <button className="btn-primary text-sm flex-1" onClick={() => { const i = classStudents.findIndex(x => x.id === s.id); setActiveStudentId(classStudents[i+1].id) }}>下一位 →</button>
                  ) : (
                    <button className="btn-primary text-sm flex-1 bg-purple-600 hover:bg-purple-700" onClick={() => setStep(2)}>去作业批改 →</button>
                  )}
                </div>
              </div>
            )
          })}
          <div className="flex gap-3">
            <button className="btn-secondary" onClick={() => setStep(0)}>← 返回</button>
            <button className="btn-primary flex-1" onClick={() => setStep(2)}>下一步：作业批改 →</button>
          </div>
        </div>
      )}

      {/* Step 2: 作业批改拍照 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-gray-800">📷 作业批改分析</h2>
              <span className="text-xs text-gray-400">已分析 {homeworkAnalyzedCount}/{classStudents.length} 人</span>
            </div>
            <p className="text-xs text-gray-500">拍摄批改后的作业，AI识别勾叉判断每个知识点掌握情况，自动归入错题库</p>
          </div>
          {!hasKnowledgePoints && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
              💡 建议先在第一步提取知识点，作业分析效果更好。也可直接跳过。
            </div>
          )}
          <div className="space-y-4">
            {classStudents.map(s => (
              <div key={s.id} className="card p-4">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                  <div className="w-9 h-9 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold text-sm">{s.name[0]}</div>
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.grade}</div>
                  </div>
                  {homeworkResults[s.id] && <span className="ml-auto tag bg-brand-100 text-brand-600">✓ 已分析</span>}
                </div>
                <HomeworkAnalyzer
                  student={s}
                  knowledgePoints={lessonData.knowledgePoints}
                  apiKey={apiKey}
                  initialResult={homeworkResults[s.id]}
                  onResult={result => handleHomeworkResult(s.id, result)}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button className="btn-secondary" onClick={() => setStep(1)}>← 返回</button>
            <button className="btn-primary flex-1" onClick={() => setStep(3)}>下一步：AI生成反馈 ✨</button>
          </div>
        </div>
      )}

      {/* Step 3: AI 生成反馈 */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="font-bold text-gray-800 text-lg mb-4">✨ AI 生成家校反馈</h2>
            {!feedback ? (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-1.5">
                  <div>班级：<span className="font-medium">{selectedClass?.name}</span></div>
                  <div>第 <span className="font-medium">{lessonData.lessonNumber}</span> 次课 · {lessonData.date}</div>
                  <div>知识点：<span className="font-medium">{hasKnowledgePoints ? lessonData.knowledgePoints.map(p=>p.name).join('、') : lessonData.topic || '未填写'}</span></div>
                  <div>作业分析：<span className="font-medium">{homeworkAnalyzedCount}/{classStudents.length} 人已分析</span></div>
                  {homeworkAnalyzedCount > 0 && <div className="text-brand-600">✓ 完成后错题自动归入各学员错题库</div>}
                </div>
                <div>
                  <label className="label">DeepSeek API Key</label>
                  <input type="password" className="input font-mono text-xs" value={apiKey} placeholder="sk-xxxxxxx（已在服务器配置则留空）" onChange={e => setApiKey(e.target.value)} />
                </div>
                {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>}
                <button className="btn-primary w-full py-3 text-base" disabled={loading} onClick={handleGenerate}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                      AI 生成中...
                    </span>
                  ) : '✨ 生成 AI 家校反馈'}
                </button>
                <button className="btn-secondary w-full text-sm" onClick={() => setStep(2)}>← 返回补充作业批改</button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-sm text-brand-600 bg-brand-50 rounded-xl p-3">
                  <span>✅</span><span>生成成功！{homeworkAnalyzedCount > 0 ? '错题已自动归入错题库。' : ''}</span>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-800">📢 群内反馈版</h3>
                    <button className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all border ${copiedGroup ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-gray-200 text-gray-600'}`} onClick={() => copyText(feedback.groupFeedback, 'group')}>{copiedGroup ? '✓ 已复制' : '复制'}</button>
                  </div>
                  <div className="feedback-box">{feedback.groupFeedback}</div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-3">💬 私聊家长版</h3>
                  <div className="space-y-4">
                    {classStudents.map(s => {
                      const text = feedback.privateByStudent?.[s.id] || ''
                      const copied = copiedPrivate[s.id]
                      return (
                        <div key={s.id} className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">{s.name}（{s.parentName || '家长'}）</span>
                            <button className={`text-xs px-3 py-1 rounded-lg font-medium border transition-all ${copied ? 'bg-brand-500 text-white border-brand-500' : 'bg-white border-gray-200 text-gray-600'}`} onClick={() => copyText(text, s.id)}>{copied ? '✓ 已复制' : '复制'}</button>
                          </div>
                          <div className="p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{text}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button className="btn-secondary flex-1" onClick={() => router.push('/errorbank')}>📚 查看错题库</button>
                  <button className="btn-primary flex-1" onClick={() => { setFeedback(null); setStep(0); setHomeworkResults({}) }}>记录新一次课</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
