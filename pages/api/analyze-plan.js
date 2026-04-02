// 拍照解析教案/导学案 → 提取知识点列表
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.DEEPSEEK_API_KEY || req.headers['x-api-key'] || ''
  if (!apiKey) return res.status(400).json({ error: '未配置 DEEPSEEK_API_KEY' })

  const { imageBase64, subject } = req.body
  if (!imageBase64) return res.status(400).json({ error: '未上传图片' })

  const prompt = `这是一份${subject || ''}教案或导学案的照片。
请识别并提取本节课的知识点列表。

要求：
1. 提取3-8个核心知识点
2. 每个知识点用简短的名称表示（5-15字以内）
3. 按教学顺序排列
4. 只返回JSON格式，不要其他内容

返回格式：
{
  "topic": "本节课主题（一句话）",
  "points": [
    {"id": 1, "name": "知识点名称", "desc": "简要说明（可选）"},
    {"id": 2, "name": "知识点名称", "desc": "简要说明（可选）"}
  ]
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
        temperature: 0.3,
        max_tokens: 800,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      // DeepSeek 不支持视觉时的降级处理
      if (response.status === 400 || response.status === 422) {
        return res.status(200).json({
          fallback: true,
          topic: '',
          points: []
        })
      }
      return res.status(502).json({ error: `API错误: ${err}` })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // 解析JSON
    try {
      const clean = content.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      return res.status(200).json(parsed)
    } catch {
      // 解析失败则返回原文，让前端手动处理
      return res.status(200).json({ fallback: true, raw: content, topic: '', points: [] })
    }
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
