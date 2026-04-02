import { useRef, useState } from 'react'

// 图片压缩到合适大小（避免 API 超限）
function compressImage(file, maxWidth = 1200, quality = 0.85) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width, h = img.height
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function PhotoUpload({ onImage, label, hint, accept = 'image/*', className = '' }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleFile(file) {
    if (!file) return
    setLoading(true)
    const base64 = await compressImage(file)
    setPreview(base64)
    setLoading(false)
    onImage && onImage(base64)
  }

  function handleChange(e) {
    handleFile(e.target.files?.[0])
  }

  function handleDrop(e) {
    e.preventDefault()
    handleFile(e.dataTransfer.files?.[0])
  }

  function clear(e) {
    e.stopPropagation()
    setPreview(null)
    onImage && onImage(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <div
        className={`relative border-2 border-dashed rounded-xl transition-all cursor-pointer overflow-hidden
          ${preview ? 'border-brand-300 bg-brand-50' : 'border-gray-200 bg-gray-50 hover:border-brand-300 hover:bg-brand-50'}`}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          capture="environment"
          className="hidden"
          onChange={handleChange}
        />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <svg className="animate-spin h-6 w-6 text-brand-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <span className="text-sm text-gray-500">处理中...</span>
          </div>
        ) : preview ? (
          <div className="relative">
            <img src={preview} alt="预览" className="w-full max-h-64 object-contain p-2" />
            <button
              onClick={clear}
              className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
            >✕</button>
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded">
              点击重新拍照
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-gray-400">
            <div className="text-4xl">📷</div>
            <div className="text-sm font-medium text-gray-500">点击拍照或上传图片</div>
            {hint && <div className="text-xs text-gray-400 text-center px-4">{hint}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
