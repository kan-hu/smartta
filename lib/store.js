// 本地存储辅助函数（MVP阶段无需后端）

export function getStudents() {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem('smartta_students') || '[]')
  } catch { return [] }
}

export function saveStudents(students) {
  if (typeof window === 'undefined') return
  localStorage.setItem('smartta_students', JSON.stringify(students))
}

export function getLessons() {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem('smartta_lessons') || '[]')
  } catch { return [] }
}

export function saveLesson(lesson) {
  if (typeof window === 'undefined') return
  const lessons = getLessons()
  const idx = lessons.findIndex(l => l.id === lesson.id)
  if (idx >= 0) lessons[idx] = lesson
  else lessons.unshift(lesson)
  localStorage.setItem('smartta_lessons', JSON.stringify(lessons.slice(0, 200)))
}

export function getClasses() {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem('smartta_classes') || '[]')
  } catch { return [] }
}

export function saveClasses(classes) {
  if (typeof window === 'undefined') return
  localStorage.setItem('smartta_classes', JSON.stringify(classes))
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// 错题库
export function getErrorBank() {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem('smartta_errors') || '[]')
  } catch { return [] }
}

export function saveErrors(errors) {
  if (typeof window === 'undefined') return
  localStorage.setItem('smartta_errors', JSON.stringify(errors))
}

export function addErrors(newErrors) {
  if (typeof window === 'undefined') return
  const existing = getErrorBank()
  newErrors.forEach(e => {
    const idx = existing.findIndex(
      x => x.studentId === e.studentId && x.pointName === e.pointName && x.lessonId === e.lessonId
    )
    if (idx >= 0) existing[idx] = { ...existing[idx], ...e, updatedAt: new Date().toISOString() }
    else existing.unshift({ ...e, id: generateId(), createdAt: new Date().toISOString(), corrected: false })
  })
  localStorage.setItem('smartta_errors', JSON.stringify(existing.slice(0, 2000)))
}

export function markErrorCorrected(errorId, corrected = true) {
  if (typeof window === 'undefined') return
  const errors = getErrorBank().map(e =>
    e.id === errorId ? { ...e, corrected, correctedAt: new Date().toISOString() } : e
  )
  saveErrors(errors)
}

export const MASTERY_STATUS = {
  mastered: { label: '已掌握', color: 'bg-green-100 text-green-700', icon: '✓' },
  partial:  { label: '部分掌握', color: 'bg-amber-100 text-amber-700', icon: '△' },
  wrong:    { label: '未掌握', color: 'bg-red-100 text-red-700', icon: '✗' },
}

// 演示数据（首次使用时初始化）
export function initDemoData() {
  if (typeof window === 'undefined') return
  if (localStorage.getItem('smartta_initialized')) return

  const demoStudents = [
    { id: 's1', name: '王小明', grade: '初一', school: '第一中学', layer: 'mid', parentName: '王妈妈', parentPhone: '' },
    { id: 's2', name: '李晓燕', grade: '初一', school: '第一中学', layer: 'high', parentName: '李爸爸', parentPhone: '' },
    { id: 's3', name: '张浩然', grade: '初一', school: '第一中学', layer: 'low', parentName: '张妈妈', parentPhone: '' },
    { id: 's4', name: '刘思涵', grade: '初一', school: '第一中学', layer: 'mid', parentName: '刘爸爸', parentPhone: '' },
  ]
  const demoClasses = [
    { id: 'c1', name: '初一数学周末班', subject: '数学', studentIds: ['s1','s2','s3','s4'] }
  ]
  saveStudents(demoStudents)
  saveClasses(demoClasses)
  localStorage.setItem('smartta_initialized', '1')
}

export const LAYER_LABELS = {
  low:  { label: '基础薄弱', color: 'bg-orange-100 text-orange-700' },
  mid:  { label: '中等提升', color: 'bg-blue-100 text-blue-700' },
  high: { label: '拔高冲刺', color: 'bg-purple-100 text-purple-700' },
}

export const PERFORMANCE_OPTIONS = [
  { value: 'excellent', label: '优秀' },
  { value: 'good',      label: '良好' },
  { value: 'normal',    label: '一般' },
  { value: 'poor',      label: '较差' },
]

export const MASTERY_OPTIONS = [
  { value: 'full',    label: '完全掌握' },
  { value: 'basic',   label: '基本掌握' },
  { value: 'partial', label: '部分掌握' },
  { value: 'none',    label: '未掌握' },
]

export const HOMEWORK_OPTIONS = [
  { value: 'done',    label: '全部完成' },
  { value: 'partial', label: '部分完成' },
  { value: 'none',    label: '未完成' },
]

export const CHECKIN_OPTIONS = [
  { value: 'pass', label: '通过' },
  { value: 'fail', label: '未通过' },
]
