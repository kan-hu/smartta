// pages/api/extract-text.js
// 处理 PDF 和 Word 文档的文字提取
// 图片文字识别由前端 Tesseract.js 处理

import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false, // 必须关闭，让 formidable 接管文件解析
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 解析上传的文件
  const form = formidable({
    maxFileSize: 20 * 1024 * 1024, // 最大 20MB
    keepExtensions: true,
  });

  let file;
  try {
    const [, files] = await form.parse(req);
    file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: '未收到文件，请重新上传' });
    }
  } catch (err) {
    console.error('文件解析失败:', err);
    return res.status(400).json({ error: '文件解析失败，请检查文件格式' });
  }

  const mimeType = file.mimetype || '';
  const fileBuffer = fs.readFileSync(file.filepath);
  let extractedText = '';

  try {
    // ── PDF 文档 ──────────────────────────────────────────────
    if (mimeType === 'application/pdf') {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(fileBuffer);
      extractedText = data.text;

      if (!extractedText || extractedText.trim().length < 10) {
        return res.status(422).json({
          error: '该 PDF 为扫描件或图片 PDF，暂不支持直接解析，建议转换为图片后上传',
        });
      }
    }

    // ── Word 文档（.docx）────────────────────────────────────
    else if (
      mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword' ||
      file.originalFilename?.endsWith('.docx') ||
      file.originalFilename?.endsWith('.doc')
    ) {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      extractedText = result.value;

      if (result.messages?.length > 0) {
        console.warn('Word 解析警告:', result.messages);
      }
    }

    // ── 不支持的类型 ─────────────────────────────────────────
    else {
      return res.status(400).json({
        error: `不支持的文件类型：${mimeType || '未知'}。请上传 PDF 或 Word 文档`,
      });
    }
  } catch (err) {
    console.error('文字提取失败:', err);
    return res.status(500).json({ error: '文字提取失败，请检查文件是否损坏' });
  } finally {
    // 清理临时文件
    try {
      fs.unlinkSync(file.filepath);
    } catch (_) {}
  }

  // 清理文本：去除多余空白行
  const cleanedText = extractedText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');

  return res.status(200).json({
    text: cleanedText,
    charCount: cleanedText.length,
    source: mimeType.includes('pdf') ? 'pdf' : 'word',
  });
}
