// components/KnowledgePoints.jsx
// 导学案知识点提取：支持拍照 / 图片上传 / PDF上传 / Word上传

import { useState, useRef, useCallback } from 'react';
import Tesseract from 'tesseract.js';

const ACCEPTED_TYPES = {
  'image/*': { label: '图片', icon: '🖼️', exts: '.jpg,.jpeg,.png,.webp,.gif,.bmp' },
  'application/pdf': { label: 'PDF', icon: '📄', exts: '.pdf' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    label: 'Word',
    icon: '📝',
    exts: '.docx',
  },
};

const ACCEPT_STRING =
  'image/*,.pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export default function KnowledgePoints({ onKnowledgePointsExtracted, lessonData }) {
  const [tab, setTab] = useState('upload'); // 'camera' | 'upload'
  const [isProcessing, setIsProcessing] = useState(false);
  const [stage, setStage] = useState(''); // 当前处理阶段描述
  const [ocrProgress, setOcrProgress] = useState(0);
  const [knowledgePoints, setKnowledgePoints] = useState([]);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // 相机相关
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── 相机功能 ──────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setError('');
    } catch (err) {
      setError('无法访问摄像头，请检查权限设置，或改用文件上传');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setPreviewUrl(dataUrl);
    setFileName('拍照图片');
    stopCamera();
    processImageUrl(dataUrl);
  };

  // ── 通用图片 OCR ──────────────────────────────────────────
  const processImageUrl = async (url) => {
    setIsProcessing(true);
    setError('');
    setKnowledgePoints([]);
    setStage('正在识别图片文字（OCR）...');
    setOcrProgress(0);

    try {
      const result = await Tesseract.recognize(url, 'chi_sim+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });

      const text = result.data.text;
      if (!text || text.trim().length < 5) {
        throw new Error('未能识别到文字，请确保图片清晰且包含文字内容');
      }

      await analyzeWithAI(text);
    } catch (err) {
      setError(err.message || 'OCR 识别失败，请重试');
      setIsProcessing(false);
    }
  };

  // ── 文件上传处理 ──────────────────────────────────────────
  const processFile = useCallback(async (file) => {
    if (!file) return;
    setError('');
    setKnowledgePoints([]);
    setPreviewUrl(null);
    setFileName(file.name);

    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    const isWord =
      file.type.includes('wordprocessingml') ||
      file.name.endsWith('.docx') ||
      file.name.endsWith('.doc');

    if (!isImage && !isPDF && !isWord) {
      setError('不支持的文件格式，请上传图片（JPG/PNG）、PDF 或 Word 文档（.docx）');
      return;
    }

    // 图片：预览 + Tesseract
    if (isImage) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      processImageUrl(url);
      return;
    }

    // PDF / Word：发送到服务端解析
    setIsProcessing(true);
    setStage(isPDF ? '正在解析 PDF 内容...' : '正在解析 Word 文档...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '文件解析失败');

      setStage('AI 正在提取知识点...');
      await analyzeWithAI(data.text);
    } catch (err) {
      setError(err.message || '文件处理失败，请重试');
      setIsProcessing(false);
    }
  }, []);

  // ── DeepSeek 分析 ─────────────────────────────────────────
  const analyzeWithAI = async (text) => {
    setStage('AI 正在分析知识点...');
    try {
      const response = await fetch('/api/analyze-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lessonData }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI 分析失败');

      const points = data.knowledgePoints || [];
      setKnowledgePoints(points);
      setStage('');
      if (onKnowledgePointsExtracted) onKnowledgePointsExtracted(points);
    } catch (err) {
      setError(err.message || 'AI 分析失败，请检查网络后重试');
    } finally {
      setIsProcessing(false);
      setOcrProgress(0);
    }
  };

  // ── 拖拽处理 ──────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const reset = () => {
    setKnowledgePoints([]);
    setPreviewUrl(null);
    setFileName('');
    setError('');
    setStage('');
    setOcrProgress(0);
    if (cameraActive) stopCamera();
  };

  // ── 渲染 ──────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* 标题 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <span className="text-lg">📚</span>
          导学案知识点提取
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">支持拍照、图片、PDF、Word 四种方式</p>
      </div>

      {/* Tab 切换 */}
      <div className="flex border-b border-gray-200">
        {[
          { key: 'upload', icon: '📁', label: '上传文件' },
          { key: 'camera', icon: '📷', label: '拍照识别' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              reset();
              if (t.key !== 'camera' && cameraActive) stopCamera();
            }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
              tab === t.key
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* ── 文件上传区域 ─────────────────────────────── */}
        {tab === 'upload' && !isProcessing && knowledgePoints.length === 0 && (
          <>
            {/* 拖拽区域 */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={() => setIsDragOver(false)}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragOver
                  ? 'border-blue-500 bg-blue-50 scale-[1.01]'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
              }`}
            >
              <div className="text-4xl mb-3">
                {isDragOver ? '📂' : '⬆️'}
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                点击选择文件，或拖拽到此处
              </p>
              <p className="text-xs text-gray-500 mb-4">
                支持 JPG / PNG / PDF / Word（.docx）
              </p>

              {/* 文件类型说明 */}
              <div className="flex justify-center gap-2 flex-wrap">
                {[
                  { icon: '🖼️', label: '图片', sub: 'JPG · PNG · WebP' },
                  { icon: '📄', label: 'PDF', sub: '文字版 PDF' },
                  { icon: '📝', label: 'Word', sub: '.docx 文档' },
                ].map((t) => (
                  <div
                    key={t.label}
                    className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-center min-w-[80px]"
                  >
                    <div className="text-lg">{t.icon}</div>
                    <div className="text-xs font-medium text-gray-700">{t.label}</div>
                    <div className="text-[10px] text-gray-400">{t.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_STRING}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processFile(file);
                e.target.value = '';
              }}
            />

            {/* 预览（图片选中后） */}
            {previewUrl && (
              <div className="mt-3 rounded-lg overflow-hidden border border-gray-200">
                <img src={previewUrl} alt="预览" className="w-full max-h-48 object-contain bg-gray-50" />
              </div>
            )}

            {/* 文件名显示 */}
            {fileName && !previewUrl && (
              <div className="mt-3 flex items-center gap-2 bg-blue-50 rounded-lg p-3">
                <span className="text-blue-500">📄</span>
                <span className="text-sm text-blue-700 font-medium truncate">{fileName}</span>
              </div>
            )}
          </>
        )}

        {/* ── 拍照区域 ─────────────────────────────────── */}
        {tab === 'camera' && !isProcessing && knowledgePoints.length === 0 && (
          <div className="space-y-3">
            {!cameraActive && !previewUrl && (
              <button
                onClick={startCamera}
                className="w-full py-10 border-2 border-dashed border-gray-300 rounded-xl text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all"
              >
                <div className="text-4xl mb-2">📷</div>
                <p className="text-sm font-medium text-gray-700">点击开启摄像头</p>
                <p className="text-xs text-gray-400 mt-1">拍摄导学案，自动识别知识点</p>
              </button>
            )}

            {cameraActive && (
              <div className="space-y-2">
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full max-h-64 object-cover"
                  />
                  <div className="absolute inset-0 pointer-events-none border-2 border-blue-400 rounded-xl opacity-50" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={capturePhoto}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors"
                  >
                    📸 拍照
                  </button>
                  <button
                    onClick={stopCamera}
                    className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

            {previewUrl && !cameraActive && (
              <div className="space-y-2">
                <img
                  src={previewUrl}
                  alt="拍照预览"
                  className="w-full max-h-56 object-contain rounded-xl border border-gray-200 bg-gray-50"
                />
                <button
                  onClick={() => { setPreviewUrl(null); startCamera(); }}
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  重新拍照
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── 处理进度 ──────────────────────────────────── */}
        {isProcessing && (
          <div className="py-6 text-center space-y-4">
            <div className="text-3xl animate-pulse">
              {stage.includes('OCR') || stage.includes('识别') ? '🔍' :
               stage.includes('PDF') ? '📄' :
               stage.includes('Word') ? '📝' : '🤖'}
            </div>
            <p className="text-sm font-medium text-gray-700">{stage}</p>

            {/* OCR 进度条 */}
            {ocrProgress > 0 && (
              <div className="mx-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>文字识别</span>
                  <span>{ocrProgress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* 通用加载动画（PDF/Word 无进度）*/}
            {ocrProgress === 0 && (
              <div className="flex justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 错误提示 ──────────────────────────────────── */}
        {error && !isProcessing && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
            <span className="text-red-500 flex-shrink-0">⚠️</span>
            <div>
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={reset}
                className="text-xs text-red-500 mt-1 hover:underline"
              >
                重新上传
              </button>
            </div>
          </div>
        )}

        {/* ── 知识点结果 ────────────────────────────────── */}
        {knowledgePoints.length > 0 && !isProcessing && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-green-500">✅</span>
                <span className="text-sm font-medium text-gray-700">
                  提取到 {knowledgePoints.length} 个知识点
                </span>
              </div>
              <button
                onClick={reset}
                className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50 transition-colors"
              >
                重新上传
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {knowledgePoints.map((point, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 bg-blue-50 rounded-lg p-2.5 border border-blue-100"
                >
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-bold mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">{point.name || point}</p>
                    {point.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{point.description}</p>
                    )}
                    {point.difficulty && (
                      <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded mt-1 font-medium ${
                        point.difficulty === '难' ? 'bg-red-100 text-red-600' :
                        point.difficulty === '中' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-600'
                      }`}>
                        {point.difficulty}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* canvas 用于拍照（隐藏） */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
