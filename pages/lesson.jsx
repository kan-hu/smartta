import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import {
  getStudents, getClasses, saveLesson, generateId, initDemoData,
  LAYER_LABELS, PERFORMANCE_OPTIONS, MASTERY_OPTIONS, HOMEWORK_OPTIONS, CHECKIN_OPTIONS,
  addErrors
} from '../lib/store'
import KnowledgePoints from '../components/KnowledgePoints'
import GradingUpload from '../components/GradingUpload'

const STEPS = [
  { key: 'setup',    label: '基本信息', icon: '📋' },
  { key: 'records',  label: '学员记录', icon: '✏️' },
  { key: 'grading',  label: '批改录入', icon: '📷' },
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
    topic: '', lessonNumber: 1, date: new Date().toISOString().slice(0,10), records: {}
  })
  const [knowledgePoints, setKnowledgePoints] = useState([])
  const [gradingResults, setGradingResults] = useState({})
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [activeStudentId, setActiveStudentId] = useState(null)
  const [copiedGroup, setCopiedGroup] = useState(false)
  const [copiedPrivate, setCopiedPrivate] = useState({})
  const [error, setError] = useState('')
  const [apiKey, setApiKey] = useState('')

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
        homework:'', entranceScore:'', performance:'', mastery:'',
        practiceScore:'', exitCheck:'', note:'', parentTask:''
      }
    })
    setLessonData(prev => ({ ...prev, records }))
  }, [selectedClassId, classes, students])

  function updateRecord(studentId, field, value) {
    setLessonData(prev => ({
      ...prev,
      records: { ...prev.records, [studentId]: { ...(prev.records[studentId]||{}), [field]: value } }
    }))
  }

  function handleGradingResult(result) {
    if (!result) return
    setGradingResults(prev => ({ ...prev, [result.studentId]: result }))
    if (result.errors?.length > 0) addErrors(result.errors)
  }

  async function handleGenerate() {
    setError('')
    const cls = classes.find(c => c.id === selectedClassId)
    if (!cls) return
    const key = apiKey.trim()
    if (key) localStorage.setItem('smartta_deepseek_key', key)
    setLoading(true)
    try {
      const res = await fetch('/api/generate-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key },
        body: JSON.stringify({
          lessonData, students: classStudents,
          className: cls.name, lessonNumber: lessonData.lessonNumber,
          subject: cls.subject, knowledgePoints, gradingResults,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '生成失败')
      const privateByStudent = {}
      classStudents.forEach(s => {
        const regex = new RegExp('###\\s*' + s.name + '([\\s\\S]*?)(?=###|$)')
        const match = data.privateFeedback?.match(regex)
        privateByStudent[s.id] = match ? match[1].trim() : data.privateFeedback || ''
      })
      setFeedback({ ...data, privateByStudent })
      saveLesson({
        id: generateId(), classId: selectedClassId, className: cls.name,
        ...lessonData, knowledgePoints, gradingResults, feedback: data,
        createdAt: new Date().toISOString(),
      })
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
      else { setCopiedPrivate(p => ({...p,[key]:true})); setTimeout(() => setCopiedPrivate(p => ({...p,[key]:false})), 2000) }
    })
  }

  const selectedClass = classes.find(c => c.id === selectedClassId)
  const gradedCount = Object.keys(gradingResults).length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1 flex-1">
            <div className={"flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all flex-1 justify-center " + (i===step?'bg-brand-500 text-white':i<step?'bg-brand-100 text-brand-600':'bg-gray-100 text-gray-400')}>
              <span>{s.icon}</span><span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length-1 && <div className={"h-0.5 w-3 flex-shrink-0 "+(i<step?'bg-brand-300':'bg-gray-200')} />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="card p-6 space-y-5">
          <h2 className="font-bold text-gray-800 text-lg">📋 基本信息</h2>
          {classes.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-2">🏫</div>
              <div className="text-sm">暂无班级，请先<a href="/students" className="text-brand-500 underline ml-1">添加班级</a></div>
            </div>
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
                  <input type="date" className="input" value={lessonData.date} onChange={e => setLessonData(p=>({...p,date:e.target.value}))} />
                </div>
                <div>
                  <label className="label">第几次课</label>
                  <input type="number" className="input" min={1} max={99} value={lessonData.lessonNumber} onChange={e => setLessonData(p=>({...p,lessonNumber:parseInt(e.target.value)||1}))} />
                </div>
              </div>
              <div>
                <label className="label">今日课堂内容/主题</label>
                <input className="input" value={lessonData.topic} placeholder="如：二次函数图象与性质" onChange={e => setLessonData(p=>({...p,topic:e.target.value}))} />
              </div>
              <div className="border-t border-gray-100 pt-4">
                <KnowledgePoints
                  points={knowledgePoints}
                  onChange={setKnowledgePoints}
                  subject={selectedClass?.subject}
                  apiKey={apiKey}
                  topic={lessonData.topic}
                  onTopicChange={t => setLessonData(p=>({...p,topic:t}))}
                />
              </div>
              {classStudents.length > 0 && (
                <div className="bg-brand-50 rounded-xl p-3">
                  <div className="text-xs text-brand-600 font-medium mb-2">本次参与学员（{classStudents.length}人）</div>
                  <div className="flex flex-wrap gap-2">
                    {classStudents.map(s => <span key={s.id} className="px-2.5 py-1 bg-white rounded-lg text-xs text-gray-600 border border-brand-200">{s.name}</span>)}
                  </div>
                </div>
              )}
              {classStudents.length === 0 && selectedClassId && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
                  该班级暂无学员，请先在<a href="/students" className="underline font-medium mx-1">学员管理</a>中添加
                </div>
              )}
              <button className="btn-primary w-full" disabled={classStudents.length===0} onClick={() => setStep(1)}>下一步：录入学员数据 →</button>
            </>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-gray-800">✏️ 学员课堂记录</h2>
              <div className="text-xs text-gray-400">{selectedClass?.name} · 第{lessonData.lessonNumber}次课</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {classStudents.map(s => {
                const rec = lessonData.records[s.id]||{}
                const filled = [rec.homework,rec.performance,rec.mastery,rec.exitCheck].filter(Boolean).length
                return (
                  <button key={s.id} onClick={() => setActiveStudentId(s.id)}
                    className={"px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1 "+(activeStudentId===s.id?'bg-brand-500 text-white border-brand-500':'bg-white text-gray-600 border-gray-200')}>
                    {s.name}{filled>0&&<span className={"w-1.5 h-1.5 rounded-full "+(activeStudentId===s.id?'bg-white':'bg-brand-400')} />}
                  </button>
                )
              })}
            </div>
          </div>
          {classStudents.map(s => {
            if (s.id !== activeStudentId) return null
            const rec = lessonData.records[s.id]||{}
            const layerInfo = LAYER_LABELS[s.layer]||LAYER_LABELS.mid
            const si = classStudents.findIndex(x => x.id===s.id)
            return (
              <div key={s.id} className="card p-5 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold">{s.name[0]}</div>
                  <div>
                    <div className="font-bold text-gray-800 flex items-center gap-2">{s.name}<span className={"tag "+layerInfo.color}>{layerInfo.label}</span></div>
                    <div className="text-xs text-gray-400">{s.grade}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">上次作业完成</label>
                    <div className="flex gap-2 flex-wrap">
                      {HOMEWORK_OPTIONS.map(o => <button key={o.value} className={"px-3 py-1.5 rounded-lg text-xs font-medium border transition-all "+(rec.homework===o.value?'bg-brand-500 text-white border-brand-500':'bg-white text-gray-600 border-gray-200')} onClick={() => updateRecord(s.id,'homework',o.value)}>{o.label}</button>)}
                    </div>
                  </div>
                  <div>
                    <label className="label">出门检查</label>
                    <div className="flex gap-2">
                      {CHECKIN_OPTIONS.map(o => <button key={o.value} className={"px-3 py-1.5 rounded-lg text-xs font-medium border transition-all "+(rec.exitCheck===o.value?'bg-brand-500 text-white border-brand-500':'bg-white text-gray-600 border-gray-200')} onClick={() => updateRecord(s.id,'exitCheck',o.value)}>{o.label}</button>)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">进门测成绩（分）</label>
                    <input type="number" className="input" min={0} max={100} value={rec.entranceScore} placeholder="0-100" onChange={e => updateRecord(s.id,'entranceScore',e.target.value)} />
                  </div>
                  <div>
                    <label className="label">当堂落实（分）</label>
                    <input type="number" className="input" min={0} max={100} value={rec.practiceScore} placeholder="0-100" onChange={e => updateRecord(s.id,'practiceScore',e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="label">课堂表现</label>
                  <div className="flex gap-2 flex-wrap">
                    {PERFORMANCE_OPTIONS.map(o => <button key={o.value} className={"px-3 py-1.5 rounded-lg text-xs font-medium border transition-all "+(rec.performance===o.value?'bg-brand-500 text-white border-brand-500':'bg-white text-gray-600 border-gray-200')} onClick={() => updateRecord(s.id,'performance',o.value)}>{o.label}</button>)}
                  </div>
                </div>
                <div>
                  <label className="label">整体掌握情况</label>
                  <div className="flex gap-2 flex-wrap">
                    {MASTERY_OPTIONS.map(o => <button key={o.value} className={"px-3 py-1.5 rounded-lg text-xs font-medium border transition-all "+(rec.mastery===o.value?'bg-brand-500 text-white border-brand-500':'bg-white text-gray-600 border-gray-200')} onClick={() => updateRecord(s.id,'mastery',o.value)}>{o.label}</button>)}
                  </div>
                </div>
                <div>
                  <label className="label">课堂备注</label>
                  <textarea rows={2} className="input resize-none" value={rec.note} placeholder="特殊情况（可选）" onChange={e => updateRecord(s.id,'note',e.target.value)} />
                </div>
                <div>
                  <label className="label">家长配合事项</label>
                  <input className="input" value={rec.parentTask} placeholder="如：监督完成错题本（可选）" onChange={e => updateRecord(s.id,'parentTask',e.target.value)} />
                </div>
                <div className="flex gap-2 pt-2">
                  {si>0 && <button className="btn-secondary text-sm flex-1" onClick={() => setActiveStudentId(classStudents[si-1].id)}>← 上一位</button>}
                  {si<classStudents.length-1
                    ? <button className="btn-primary text-sm flex-1" onClick={() => setActiveStudentId(classStudents[si+1].id)}>下一位 →</button>
                    : <button className="btn-primary text-sm flex-1 bg-purple-600 hover:bg-purple-700" onClick={() => setStep(2)}>完成，去批改 →</button>
                  }
                </div>
              </div>
            )
          })}
          <div className="flex gap-3">
            <button className="btn-secondary" onClick={() => setStep(0)}>← 返回</button>
            <button className="btn-primary flex-1" onClick={() => setStep(2)}>跳过，去批改录入 →</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800">📷 作业批改录入</h2>
              <div className="text-xs text-gray-400">已录入 <span className="font-bold text-brand-600">{gradedCount}</span> / {classStudents.length} 人</div>
            </div>
            {knowledgePoints.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="text-xs text-gray-400">本节知识点：</span>
                {knowledgePoints.map((p,i) => <span key={p.id} className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full">{i+1}. {p.name}</span>)}
              </div>
            )}
          </div>
          {knowledgePoints.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
              💡 在第一步拍照解析知识点后，AI可精准识别批改结果并建立错题库
            </div>
          )}
          <div className="space-y-3">
            {classStudents.map(s => (
              <GradingUpload key={s.id} student={s} knowledgePoints={knowledgePoints}
                lessonId={lessonData.date+'-'+lessonData.lessonNumber} apiKey={apiKey} onResult={handleGradingResult} />
            ))}
          </div>
          <div className="flex gap-3">
            <button className="btn-secondary" onClick={() => setStep(1)}>← 返回</button>
            <button className="btn-primary flex-1" onClick={() => setStep(3)}>
              {gradedCount>0?'已录入'+gradedCount+'人，生成AI反馈 ✨':'跳过，直接生成反馈 ✨'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="font-bold text-gray-800 text-lg mb-4">✨ AI 生成家校反馈</h2>
            {!feedback ? (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 space-y-1">
                  <div>班级：<span className="font-medium">{selectedClass?.name}</span></div>
                  <div>第 <span className="font-medium">{lessonData.lessonNumber}</span> 次课 · {lessonData.date}</div>
                  <div>今日内容：<span className="font-medium">{lessonData.topic||'未填写'}</span></div>
                  {knowledgePoints.length>0 && <div>知识点：<span className="font-medium">{knowledgePoints.map(p=>p.name).join('、')}</span></div>}
                  {gradedCount>0 && <div>批改录入：<span className="font-medium text-brand-600">{gradedCount}人，错题已存入错题库</span></div>}
                </div>
                <div>
                  <label className="label">DeepSeek API Key</label>
                  <input type="password" className="input font-mono text-xs" value={apiKey} placeholder="sk-xxxxxxx（已配置环境变量可留空）" onChange={e => setApiKey(e.target.value)} />
                </div>
                {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>}
                <button className="btn-primary w-full py-3 text-base" disabled={loading} onClick={handleGenerate}>
                  {loading?<span className="flex items-center justify-center gap-2"><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>AI 生成中...</span>:'✨ 生成 AI 家校反馈'}
                </button>
                <button className="btn-secondary w-full text-sm" onClick={() => setStep(2)}>← 返回</button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-sm text-brand-600 bg-brand-50 rounded-xl p-3">
                  <span>✅</span><span>生成成功！{gradedCount>0&&gradedCount+'人错题已存入错题库。'}已自动保存。</span>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-gray-800">📢 群内反馈版</h3>
                    <button className={"text-xs px-3 py-1.5 rounded-lg font-medium transition-all border "+(copiedGroup?'bg-brand-500 text-white border-brand-500':'bg-white border-gray-200 text-gray-600')} onClick={() => copyText(feedback.groupFeedback,'group')}>{copiedGroup?'✓ 已复制':'复制'}</button>
                  </div>
                  <div className="feedback-box">{feedback.groupFeedback}</div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 mb-3">💬 私聊家长版</h3>
                  <div className="space-y-4">
                    {classStudents.map(s => {
                      const text = feedback.privateByStudent?.[s.id]||feedback.privateFeedback||''
                      const copied = copiedPrivate[s.id]
                      return (
                        <div key={s.id} className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">{s.name}（发给 {s.parentName||'家长'}）</span>
                            <button className={"text-xs px-3 py-1 rounded-lg font-medium transition-all border "+(copied?'bg-brand-500 text-white border-brand-500':'bg-white border-gray-200 text-gray-600')} onClick={() => copyText(text,s.id)}>{copied?'✓ 已复制':'复制'}</button>
                          </div>
                          <div className="p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{text}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button className="btn-secondary flex-1" onClick={() => { setFeedback(null); setStep(0); setKnowledgePoints([]); setGradingResults({}) }}>记录新一次课</button>
                  <button className="btn-primary flex-1" onClick={() => router.push('/errors')}>查看错题库 📚</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
