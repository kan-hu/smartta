// 拍照分析批改结果 → 识别勾叉 → 每个知识点掌握情况
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.DEEPSEEK_API_KEY || req.headers['x-api-key'] || ''
  if (!apiKey) return res.status(400).json({ error: '未配置 DEEPSEEK_API_KEY' })

  const { imageBase64, knowledgePoints, studentName, subject } = req.body
  if (!imageBase64) return res.status(400).json({ error: '未上传图片' })

  const pointsList = (knowledgePoints || []).map((p, i) => `${i + 1}. ${p.name}`).join('\n')

  const prompt = `这是学生"${studentName || '该学生'}"的${subject || ''}作业批改照片。

本节课的知识点列表：
${pointsList || '（未提供知识点，请自动识别题目）'}

请分析图片中的批改标记（✓勾=正确，✗叉=错误，△半勾=部分正确），判断每个知识点的掌握情况。

同时提取错题内容（叉和半勾对应的题目或知识点）。

只返回JSON格式：
{
  "mastery": [
    {"id": 1, "name": "知识点名称", "status": "mastered|partial|wrong", "note": "简要说明"}
  ],
  "errors": [
    {"pointId": 1, "pointName": "知识点名称", "desc": "错误描述或题目内容", "type": "wrong|partial"}
  ],
  "overallScore": 85,
  "summary": "一句话总结掌握情况"
}`

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageBase64 }
              },
              { type: 'text', text: prompt }
            ]
          }
        ],
        temperature: 0.2,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      if (response.status === 400 || response.status === 422) {
        return res.status(200).json({ fallback: true, mastery: [], errors: [], overallScore: null, summary: '' })
      }
      return res.status(502).json({ error: `API错误: ${err}` })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    try {
      const clean = content.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      return res.status(200).json(parsed)
    } catch {
      return res.status(200).json({ fallback: true, raw: content, mastery: [], errors: [], overallScore: null, summary: '' })
    }
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
