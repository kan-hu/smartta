import { useEffect, useState } from 'react'
import Link from 'next/link'
import { initDemoData, getStudents, getClasses, getLessons } from '../lib/store'

export default function Home() {
  const [stats, setStats] = useState({ students: 0, classes: 0, lessons: 0 })

  useEffect(() => {
    initDemoData()
    setStats({
      students: getStudents().length,
      classes: getClasses().length,
      lessons: getLessons().length,
    })
  }, [])

  const quickActions = [
    {
      href: '/lesson',
      icon: '📝',
      title: '开始上课记录',
      desc: '录入小循环数据，AI生成反馈',
      color: 'bg-brand-500',
    },
    {
      href: '/students',
      icon: '👥',
      title: '管理学员',
      desc: '添加学员、设置分层标签',
      color: 'bg-blue-500',
    },
    {
      href: '/feedback',
      icon: '💬',
      title: '查看反馈历史',
      desc: '历次AI生成的家校反馈',
      color: 'bg-purple-500',
    },
  ]

  const steps = [
    { num: '1', text: '录入学员 & 班级信息', done: stats.students > 0 },
    { num: '2', text: '上课后填写小循环数据', done: stats.lessons > 0 },
    { num: '3', text: 'AI 自动生成群内 & 私聊反馈', done: false },
    { num: '4', text: '一键复制发送给家长', done: false },
  ]

  return (
    <div className="space-y-6">
      {/* 欢迎卡片 */}
      <div className="card p-6 bg-gradient-to-br from-brand-500 to-brand-600 text-white border-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">SmartTA</h1>
            <p className="text-brand-100 text-sm">AI家校沟通助教 · MVP v0.1</p>
            <p className="text-brand-100 text-sm mt-2">
              教学记录标准化 · AI反馈智能化 · 家校协同闭环化
            </p>
          </div>
          <div className="text-5xl opacity-80">🎓</div>
        </div>
      </div>

      {/* 数据统计 */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '在读学员', value: stats.students, unit: '人', color: 'text-brand-500' },
          { label: '班级数', value: stats.classes, unit: '个', color: 'text-blue-500' },
          { label: '课程记录', value: stats.lessons, unit: '次', color: 'text-purple-500' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}<span className="text-gray-400">（{s.unit}）</span></div>
          </div>
        ))}
      </div>

      {/* 快捷操作 */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">快捷操作</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map(action => (
            <Link key={action.href} href={action.href}>
              <div className="card p-5 hover:shadow-md transition-shadow cursor-pointer group">
                <div className={`w-10 h-10 ${action.color} rounded-xl flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform`}>
                  {action.icon}
                </div>
                <div className="font-semibold text-gray-800 text-sm">{action.title}</div>
                <div className="text-xs text-gray-400 mt-1">{action.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 使用流程 */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">使用流程</h2>
        <div className="card p-5">
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  step.done ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {step.done ? '✓' : step.num}
                </div>
                <div className={`text-sm ${step.done ? 'text-brand-600 font-medium' : 'text-gray-600'}`}>
                  {step.text}
                </div>
                {i < steps.length - 1 && (
                  <div className="ml-3.5 border-l border-gray-100 h-4 absolute left-0" style={{display:'none'}} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Link href="/lesson">
              <button className="btn-primary w-full">开始第一次课程记录 →</button>
            </Link>
          </div>
        </div>
      </div>

      {/* 说明 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
        <div className="font-semibold mb-1">💡 MVP 说明</div>
        <div className="text-amber-600 text-xs leading-relaxed">
          当前版本数据保存在浏览器本地（localStorage），换设备或清除缓存后数据会丢失。
          正式版本将接入云端数据库。演示数据已预置4名学员，可直接体验。
        </div>
      </div>
    </div>
  )
}
