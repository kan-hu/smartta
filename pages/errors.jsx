import { useEffect, useState } from 'react'
import { getErrorBank, getStudents, markErrorCorrected, MASTERY_STATUS } from '../lib/store'

export default function Errors() {
  const [errors, setErrors] = useState([])
  const [students, setStudents] = useState([])
  const [filterStudent, setFilterStudent] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all') // all | pending | corrected
  const [filterType, setFilterType] = useState('all') // all | wrong | partial

  useEffect(() => {
    setErrors(getErrorBank())
    setStudents(getStudents())
  }, [])

  function handleToggleCorrect(id, current) {
    markErrorCorrected(id, !current)
    setErrors(getErrorBank())
  }

  const filtered = errors.filter(e => {
    if (filterStudent !== 'all' && e.studentId !== filterStudent) return false
    if (filterStatus === 'pending' && e.corrected) return false
    if (filterStatus === 'corrected' && !e.corrected) return false
    if (filterType === 'wrong' && e.type !== 'wrong') return false
    if (filterType === 'partial' && e.type !== 'partial') return false
    return true
  })

  // 按学生分组
  const grouped = {}
  filtered.forEach(e => {
    const key = e.studentId || 'unknown'
    if (!grouped[key]) grouped[key] = { name: e.studentName || '未知学员', errors: [] }
    grouped[key].errors.push(e)
  })

  const pendingCount = errors.filter(e => !e.corrected).length
  const correctedCount = errors.filter(e => e.corrected).length

  return (
    <div className="space-y-5">
      {/* 标题 + 统计 */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-bold text-gray-800 text-lg">📚 错题库</h1>
          <p className="text-xs text-gray-400 mt-0.5">基于作业批改照片自动归集</p>
        </div>
        <div className="flex gap-3 text-center">
          <div className="card px-4 py-2">
            <div className="text-xl font-bold text-red-500">{pendingCount}</div>
            <div className="text-xs text-gray-400">待纠错</div>
          </div>
          <div className="card px-4 py-2">
            <div className="text-xl font-bold text-green-500">{correctedCount}</div>
            <div className="text-xs text-gray-400">已纠错</div>
          </div>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="card p-4 space-y-3">
        <div>
          <div className="label">按学员</div>
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${filterStudent === 'all' ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200'}`}
              onClick={() => setFilterStudent('all')}
            >全部学员</button>
            {students.map(s => (
              <button
                key={s.id}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${filterStudent === s.id ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200'}`}
                onClick={() => setFilterStudent(s.id)}
              >
                {s.name}
                <span className="ml-1 opacity-60">
                  ({errors.filter(e => e.studentId === s.id && !e.corrected).length})
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <div>
            <div className="label">状态</div>
            <div className="flex gap-2">
              {[['all','全部'],['pending','待纠错'],['corrected','已纠错']].map(([v,l]) => (
                <button key={v}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${filterStatus === v ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200'}`}
                  onClick={() => setFilterStatus(v)}
                >{l}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="label">类型</div>
            <div className="flex gap-2">
              {[['all','全部'],['wrong','错误 ✗'],['partial','部分 △']].map(([v,l]) => (
                <button key={v}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${filterType === v ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200'}`}
                  onClick={() => setFilterType(v)}
                >{l}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 错题列表 */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <div className="text-4xl mb-3">📚</div>
          <div className="text-sm">
            {errors.length === 0
              ? '暂无错题记录，上传批改照片后自动生成'
              : '当前筛选条件下无错题'}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([studentId, group]) => (
            <div key={studentId} className="card overflow-hidden">
              {/* 学生标题 */}
              <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold text-sm">
                    {group.name[0]}
                  </div>
                  <span className="font-semibold text-gray-800">{group.name}</span>
                  <span className="text-xs text-gray-400">共{group.errors.length}条</span>
                </div>
                <div className="text-xs text-gray-400">
                  待纠错 <span className="text-red-500 font-bold">{group.errors.filter(e => !e.corrected).length}</span>
                </div>
              </div>

              {/* 错题条目 */}
              <div className="divide-y divide-gray-100">
                {group.errors.map(e => (
                  <div key={e.id} className={`px-4 py-3 flex items-start gap-3 transition-colors ${e.corrected ? 'opacity-50' : ''}`}>
                    {/* 类型标记 */}
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5 ${
                      e.type === 'partial'
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {e.type === 'partial' ? '△' : '✗'}
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800">{e.pointName}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{e.desc}</div>
                      <div className="text-xs text-gray-300 mt-1">
                        {e.createdAt ? new Date(e.createdAt).toLocaleDateString('zh-CN') : ''}
                      </div>
                    </div>

                    {/* 纠错按钮 */}
                    <button
                      onClick={() => handleToggleCorrect(e.id, e.corrected)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        e.corrected
                          ? 'bg-green-100 text-green-600 border-green-200'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-brand-300 hover:text-brand-500'
                      }`}
                    >
                      {e.corrected ? '✓ 已纠错' : '标记纠错'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
