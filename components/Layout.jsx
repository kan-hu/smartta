import Link from 'next/link'
import { useRouter } from 'next/router'

const navItems = [
  { href: '/', label: '首页', icon: '⌂' },
  { href: '/students', label: '学员管理', icon: '👥' },
  { href: '/lesson', label: '上课记录', icon: '📝' },
  { href: '/errorbank', label: '错题库', icon: '📚' },
  { href: '/feedback', label: '反馈历史', icon: '💬' },
]

export default function Layout({ children }) {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-brand-500 font-bold text-xl tracking-tight">SmartTA</span>
            <span className="text-xs text-gray-400 hidden sm:inline">AI家校助教</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  router.pathname === item.href
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="mr-1 hidden sm:inline">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* 主内容 */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        {children}
      </main>

      {/* 底部 */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between text-xs text-gray-400">
          <span>SmartTA · AI家校沟通助教</span>
          <span>MVP v0.1</span>
        </div>
      </footer>
    </div>
  )
}
