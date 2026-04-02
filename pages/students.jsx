import { useEffect, useState } from 'react'
import {
  getStudents, saveStudents, getClasses, saveClasses,
  generateId, LAYER_LABELS, initDemoData
} from '../lib/store'

const SUBJECTS = ['数学','语文','英语','物理','化学','生物','历史','地理','政治','美术','书法','音乐','体育','编程']
const GRADES = ['小学一年级','小学二年级','小学三年级','小学四年级','小学五年级','小学六年级',
  '初一','初二','初三','高一','高二','高三']

export default function Students() {
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [tab, setTab] = useState('students') // students | classes
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [showAddClass, setShowAddClass] = useState(false)
  const [form, setForm] = useState({ name:'', grade:'初一', school:'', layer:'mid', parentName:'', parentPhone:'' })
  const [classForm, setClassForm] = useState({ name:'', subject:'数学', studentIds:[] })
  const [editId, setEditId] = useState(null)

  useEffect(() => {
    initDemoData()
    setStudents(getStudents())
    setClasses(getClasses())
  }, [])

  function handleSaveStudent() {
    if (!form.name.trim()) return alert('请填写学员姓名')
    const list = [...students]
    if (editId) {
      const idx = list.findIndex(s => s.id === editId)
      if (idx >= 0) list[idx] = { ...list[idx], ...form }
    } else {
      list.push({ id: generateId(), ...form })
    }
    saveStudents(list)
    setStudents(list)
    setShowAddStudent(false)
    setEditId(null)
    setForm({ name:'', grade:'初一', school:'', layer:'mid', parentName:'', parentPhone:'' })
  }

  function handleDelete(id) {
    if (!confirm('确定删除该学员？')) return
    const list = students.filter(s => s.id !== id)
    saveStudents(list)
    setStudents(list)
  }

  function handleEdit(s) {
    setForm({ name:s.name, grade:s.grade, school:s.school||'', layer:s.layer||'mid', parentName:s.parentName||'', parentPhone:s.parentPhone||'' })
    setEditId(s.id)
    setShowAddStudent(true)
  }

  function handleSaveClass() {
    if (!classForm.name.trim()) return alert('请填写班级名称')
    const list = [...classes]
    list.push({ id: generateId(), ...classForm })
    saveClasses(list)
    setClasses(list)
    setShowAddClass(false)
    setClassForm({ name:'', subject:'数学', studentIds:[] })
  }

  function handleDeleteClass(id) {
    if (!confirm('确定删除该班级？')) return
    const list = classes.filter(c => c.id !== id)
    saveClasses(list)
    setClasses(list)
  }

  function toggleStudentInClass(classId, studentId) {
    const list = classes.map(c => {
      if (c.id !== classId) return c
      const ids = c.studentIds || []
      return {
        ...c,
        studentIds: ids.includes(studentId)
          ? ids.filter(id => id !== studentId)
          : [...ids, studentId]
      }
    })
    saveClasses(list)
    setClasses(list)
  }

  return (
    <div className="space-y-6">
      {/* 标签切换 */}
      <div className="flex gap-2">
        <button
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === 'students' ? 'bg-brand-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
          onClick={() => setTab('students')}
        >👥 学员 ({students.length})</button>
        <button
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tab === 'classes' ? 'bg-brand-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
          onClick={() => setTab('classes')}
        >🏫 班级 ({classes.length})</button>
      </div>

      {/* 学员管理 */}
      {tab === 'students' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">学员列表</h2>
            <button className="btn-primary text-sm" onClick={() => { setShowAddStudent(true); setEditId(null); setForm({ name:'', grade:'初一', school:'', layer:'mid', parentName:'', parentPhone:'' }) }}>
              + 添加学员
            </button>
          </div>

          {students.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">
              <div className="text-4xl mb-3">👤</div>
              <div>暂无学员，点击右上角添加</div>
            </div>
          ) : (
            <div className="grid gap-3">
              {students.map(s => {
                const layerInfo = LAYER_LABELS[s.layer] || LAYER_LABELS.mid
                return (
                  <div key={s.id} className="card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold text-sm">
                        {s.name[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800 flex items-center gap-2">
                          {s.name}
                          <span className={`tag ${layerInfo.color}`}>{layerInfo.label}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {s.grade}{s.school ? ` · ${s.school}` : ''}{s.parentName ? ` · 家长：${s.parentName}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-secondary text-xs py-1.5 px-3" onClick={() => handleEdit(s)}>编辑</button>
                      <button className="text-xs text-red-400 hover:text-red-600 px-2" onClick={() => handleDelete(s.id)}>删除</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 添加/编辑学员弹窗 */}
          {showAddStudent && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                <h3 className="font-bold text-gray-800 mb-4">{editId ? '编辑学员' : '添加学员'}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="label">姓名 *</label>
                    <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="请输入学员姓名" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">年级</label>
                      <select className="select" value={form.grade} onChange={e => setForm({...form, grade: e.target.value})}>
                        {GRADES.map(g => <option key={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">分层</label>
                      <select className="select" value={form.layer} onChange={e => setForm({...form, layer: e.target.value})}>
                        <option value="low">基础薄弱</option>
                        <option value="mid">中等提升</option>
                        <option value="high">拔高冲刺</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="label">学校</label>
                    <input className="input" value={form.school} onChange={e => setForm({...form, school: e.target.value})} placeholder="就读学校（可选）" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">家长称呼</label>
                      <input className="input" value={form.parentName} onChange={e => setForm({...form, parentName: e.target.value})} placeholder="如：张妈妈" />
                    </div>
                    <div>
                      <label className="label">家长电话</label>
                      <input className="input" value={form.parentPhone} onChange={e => setForm({...form, parentPhone: e.target.value})} placeholder="（可选）" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button className="btn-secondary flex-1" onClick={() => setShowAddStudent(false)}>取消</button>
                  <button className="btn-primary flex-1" onClick={handleSaveStudent}>保存</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 班级管理 */}
      {tab === 'classes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">班级列表</h2>
            <button className="btn-primary text-sm" onClick={() => setShowAddClass(true)}>+ 添加班级</button>
          </div>

          {classes.length === 0 ? (
            <div className="card p-12 text-center text-gray-400">
              <div className="text-4xl mb-3">🏫</div>
              <div>暂无班级，点击右上角添加</div>
            </div>
          ) : (
            <div className="space-y-4">
              {classes.map(c => {
                const classStudents = students.filter(s => (c.studentIds || []).includes(s.id))
                return (
                  <div key={c.id} className="card p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-bold text-gray-800">{c.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{c.subject} · {classStudents.length}名学员</div>
                      </div>
                      <button className="text-xs text-red-400 hover:text-red-600" onClick={() => handleDeleteClass(c.id)}>删除班级</button>
                    </div>
                    <div className="border-t border-gray-100 pt-3">
                      <div className="text-xs text-gray-500 mb-2 font-medium">点击添加/移除学员：</div>
                      <div className="flex flex-wrap gap-2">
                        {students.map(s => {
                          const inClass = (c.studentIds || []).includes(s.id)
                          const layerInfo = LAYER_LABELS[s.layer] || LAYER_LABELS.mid
                          return (
                            <button
                              key={s.id}
                              onClick={() => toggleStudentInClass(c.id, s.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                                inClass
                                  ? 'bg-brand-500 text-white border-brand-500'
                                  : 'bg-white text-gray-500 border-gray-200 hover:border-brand-300'
                              }`}
                            >
                              {inClass ? '✓ ' : ''}{s.name}
                              <span className="ml-1 opacity-70">{s.grade}</span>
                            </button>
                          )
                        })}
                        {students.length === 0 && <span className="text-xs text-gray-400">请先在"学员"标签添加学员</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {showAddClass && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                <h3 className="font-bold text-gray-800 mb-4">添加班级</h3>
                <div className="space-y-3">
                  <div>
                    <label className="label">班级名称 *</label>
                    <input className="input" value={classForm.name} onChange={e => setClassForm({...classForm, name: e.target.value})} placeholder="如：初一数学周末班" />
                  </div>
                  <div>
                    <label className="label">科目</label>
                    <select className="select" value={classForm.subject} onChange={e => setClassForm({...classForm, subject: e.target.value})}>
                      {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">初始学员（可后续修改）</label>
                    <div className="flex flex-wrap gap-2 p-3 border border-gray-200 rounded-xl min-h-[48px]">
                      {students.map(s => {
                        const selected = classForm.studentIds.includes(s.id)
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setClassForm({
                              ...classForm,
                              studentIds: selected
                                ? classForm.studentIds.filter(id => id !== s.id)
                                : [...classForm.studentIds, s.id]
                            })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                              selected ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-500 border-gray-200'
                            }`}
                          >
                            {s.name}
                          </button>
                        )
                      })}
                      {students.length === 0 && <span className="text-xs text-gray-400">请先添加学员</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-5">
                  <button className="btn-secondary flex-1" onClick={() => setShowAddClass(false)}>取消</button>
                  <button className="btn-primary flex-1" onClick={handleSaveClass}>保存</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
