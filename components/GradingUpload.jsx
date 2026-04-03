// components/GradingUpload.jsx
// 拍照批改 + 文件上传：支持图片/PDF/Word，AI 识别勾叉建立错题

import { useState, useRef, useCallback } from 'react';
import Tesseract from 'tesseract.js';

const ACCEPT_STRING =
  'image/*,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export default function GradingUpload({ students = [], knowledgePoints = [], onGradingComplete }) {
  const [tab, setTab] = useState('upload'); // 'upload' | 'camera'
  const [isProcessing, setIsProcessing] = useState(false);
  const [stage, setStage] = useState('');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [gradingResults, setGradingResults] = useState(null);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');

  // 相机
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── 相机功能 ──────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
      setError('');
    } catch {
      setError('无法访问摄像头，请检查权限，或改用文件上传');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
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

  // ── OCR 处理 ──────────────────────────────────────────────
  const processImageUrl = async (url) => {
    setIsProcessing(true);
    setError('');
    setGradingResults(null);
    setStage('正在识别批改内容（OCR）...');
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
      if (!text || text.trim().length < 3) {
        throw new Error('未识别到文字，请确保图片清晰，或尝试上传文件格式');
      }

      await analyzeGrading(text);
    } catch (err) {
      setError(err.message || 'OCR 识别失败，请重试');
      setIsProcessing(false);
    }
  };

  // ── 文件上传处理 ──────────────────────────────────────────
  const processFile = useCallback(async (file) => {
    if (!file) return;
    setError('');
    setGradingResults(null);
    setPreviewUrl(null);
    setFileName(file.name);

    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    const isWord =
      file.type.includes('wordprocessingml') ||
      file.name.endsWith('.docx') ||
      file.name.endsWith('.doc');

    if (!isImage && !isPDF && !isWord) {
      setError('不支持的文件格式，请上传图片、PDF 或 Word 文档');
      return;
    }

    if (isImage) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      processImageUrl(url);
      return;
    }

    // PDF / Word → 服务端解析
    setIsProcessing(true);
    setStage(isPDF ? '正在解析 PDF...' : '正在解析 Word 文档...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/extract-text', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '文件解析失败');

      await analyzeGrading(data.text);
    } catch (err) {
      setError(err.message || '文件处理失败，请重试');
      setIsProcessing(false);
    }
  }, []);

  // ── DeepSeek 批改分析 ──────────────────────────────────────
  const analyzeGrading = async (text) => {
    setStage('AI 正在分析批改结果...');
    try {
      const response = await fetch('/api/analyze-grading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          studentName: selectedStudent,
          knowledgePoints,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI 分析失败');

      setGradingResults(data);
      setStage('');
      if (onGradingComplete) onGradingComplete(data, selectedStudent);
    } catch (err) {
      setError(err.message || 'AI 分析失败');
    } finally {
      setIsProcessing(false);
      setOcrProgress(0);
    }
  };

  // ── 拖拽 ─────────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const reset = () => {
    setGradingResults(null);
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
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <span className="text-lg">✏️</span>
          作业批改上传
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">AI 识别勾叉，自动建立错题库</p>
      </div>

      {/* 学员选择 */}
      {students.length > 0 && (
        <div className="px-4 pt-3">
          <label className="text-xs font-medium text-gray-500 block mb-1">选择学员（可选）</label>
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
          >
            <option value="">全班 / 未指定</option>
            {students.map((s) => (
              <option key={s.id || s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tab */}
      <div className="flex border-b border-gray-200 mt-3">
        {[
          { key: 'upload', icon: '📁', label: '上传文件' },
          { key: 'camera', icon: '📷', label: '拍照批改' },
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
                ? 'bg-orange-500 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* ── 文件上传 ──────────────────────────────────── */}
        {tab === 'upload' && !isProcessing && !gradingResults && (
          <>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragOver
                  ? 'border-orange-500 bg-orange-50 scale-[1.01]'
                  : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50/30'
              }`}
            >
              <div className="text-4xl mb-3">{isDragOver ? '📂' : '⬆️'}</div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                上传批改后的作业
              </p>
              <p className="text-xs text-gray-500 mb-4">拖拽或点击选择文件</p>
              <div className="flex justify-center gap-2 flex-wrap">
                {[
                  { icon: '🖼️', label: '图片', sub: 'JPG · PNG' },
                  { icon: '📄', label: 'PDF', sub: '扫描件' },
                  { icon: '📝', label: 'Word', sub: '.docx' },
                ].map((t) => (
                  <div
                    key={t.label}
                    className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-center min-w-[76px]"
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

            {previewUrl && (
              <div className="mt-3 rounded-lg overflow-hidden border border-gray-200">
                <img src={previewUrl} alt="预览" className="w-full max-h-48 object-contain bg-gray-50" />
              </div>
            )}
            {fileName && !previewUrl && (
              <div className="mt-3 flex items-center gap-2 bg-orange-50 rounded-lg p-3">
                <span className="text-orange-500">📄</span>
                <span className="text-sm text-orange-700 font-medium truncate">{fileName}</span>
              </div>
            )}
          </>
        )}

        {/* ── 拍照 ──────────────────────────────────────── */}
        {tab === 'camera' && !isProcessing && !gradingResults && (
          <div className="space-y-3">
            {!cameraActive && !previewUrl && (
              <button
                onClick={startCamera}
                className="w-full py-10 border-2 border-dashed border-gray-300 rounded-xl text-center hover:border-orange-400 hover:bg-orange-50/30 transition-all"
              >
                <div className="text-4xl mb-2">📷</div>
                <p className="text-sm font-medium text-gray-700">点击开启摄像头</p>
                <p className="text-xs text-gray-400 mt-1">拍摄批改好的作业，AI 识别错题</p>
              </button>
            )}

            {cameraActive && (
              <div className="space-y-2">
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-64 object-cover" />
                  <div className="absolute inset-0 pointer-events-none border-2 border-orange-400 rounded-xl opacity-60" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={capturePhoto}
                    className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg font-medium text-sm hover:bg-orange-600 transition-colors"
                  >
                    📸 拍照批改
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
                  className="w-full py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
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

            {ocrProgress > 0 && (
              <div className="mx-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>文字识别</span>
                  <span>{ocrProgress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-300"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
              </div>
            )}

            {ocrProgress === 0 && (
              <div className="flex justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-orange-500 animate-bounce"
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
              <button onClick={reset} className="text-xs text-red-500 mt-1 hover:underline">
                重新上传
              </button>
            </div>
          </div>
        )}

        {/* ── 批改结果 ──────────────────────────────────── */}
        {gradingResults && !isProcessing && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-green-500">✅</span>
                <span className="text-sm font-medium text-gray-700">批改分析完成</span>
              </div>
              <button
                onClick={reset}
                className="text-xs text-gray-400 border border-gray-200 rounded px-2 py-1 hover:bg-gray-50 transition-colors"
              >
                重新上传
              </button>
            </div>

            {/* 统计概览 */}
            {gradingResults.summary && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '总题数', value: gradingResults.summary.total, color: 'text-gray-700', bg: 'bg-gray-50' },
                  { label: '正确', value: gradingResults.summary.correct, color: 'text-green-600', bg: 'bg-green-50' },
                  { label: '错误', value: gradingResults.summary.wrong, color: 'text-red-500', bg: 'bg-red-50' },
                ].map((item) => (
                  <div key={item.label} className={`${item.bg} rounded-lg p-2 text-center`}>
                    <div className={`text-xl font-bold ${item.color}`}>{item.value ?? '-'}</div>
                    <div className="text-xs text-gray-500">{item.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* 错题列表 */}
            {gradingResults.wrongItems?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">错题列表</p>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {gradingResults.wrongItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-2.5"
                    >
                      <span className="flex-shrink-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold mt-0.5">
                        ✗
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800">{item.question || item.content || item}</p>
                        {item.knowledgePoint && (
                          <span className="inline-block text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded mt-1">
                            {item.knowledgePoint}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
