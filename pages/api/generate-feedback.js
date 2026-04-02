// pages/api/generate-feedback.js
// 调用 DeepSeek API 生成家校反馈

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 优先用环境变量，其次读取前端传来的 x-api-key header
  const apiKey = process.env.DEEPSEEK_API_KEY || req.headers['x-api-key'] || ''
  if (!apiKey) {
    return res.status(400).json({ error: '未配置 DEEPSEEK_API_KEY，请在 Vercel 环境变量或页面中填写 Key' })
  }

  const { lessonData, students, className, lessonNumber, subject } = req.body

  // 构建每个学生的数据摘要
  const studentSummaries = students.map(s => {
    const record = lessonData.records[s.id] || {}
    const layerMap = { low: '基础薄弱型', mid: '中等提升型', high: '拔高冲刺型' }
    const perfMap = { excellent: '优秀', good: '良好', normal: '一般', poor: '较差' }
    const masteryMap = { full: '完全掌握', basic: '基本掌握', partial: '部分掌握', none: '未掌握' }
    const hwMap = { done: '全部完成', partial: '部分完成', none: '未完成' }
    const checkMap = { pass: '通过', fail: '未通过' }

    return `
学员：${s.name}（${layerMap[s.layer] || '中等'}）
- 上次作业完成情况：${hwMap[record.homework] || '未记录'}
- 进门测成绩：${record.entranceScore !== undefined ? record.entranceScore + '分' : '未录入'}
- 课堂表现：${perfMap[record.performance] || '未记录'}
- 知识点掌握：${masteryMap[record.mastery] || '未记录'}
- 当堂落实：${record.practiceScore !== undefined ? record.practiceScore + '分' : '未记录'}
- 出门检查：${checkMap[record.exitCheck] || '未记录'}
- 老师备注：${record.note || '无'}
- 家长配合事项：${record.parentTask || '无'}
`.trim()
  }).join('\n\n')

  const systemPrompt = `你是一位专业的教培机构AI助教，负责根据课堂记录为老师生成家校沟通反馈文案。

你需要同时生成两个版本：
1. 【群内反馈版】：发到家长群，只包含正向内容和表扬，绝不提及任何学员的问题和不足。即使学员表现不佳，也要找到可以肯定的点（如"认真参与""坚持上课"等）。语气温暖、积极。
2. 【私聊反馈版】（每位学员单独一段）：发给每位家长，包含具体表现、需改进之处和家长配合事项。根据学员分层调整话术：
   - 基础薄弱型：先稳定情绪，肯定进步，强调基础巩固，需家长配合督促
   - 中等提升型：肯定基础，突出突破点，给具体提升建议
   - 拔高冲刺型：直接指出短板，给出高难度挑战建议，激发动力
   
输出格式要求：
- 使用 markdown 标记
- 群内版用 ## 群内反馈版 开头
- 私聊版用 ## 私聊反馈版 开头，每个学员用 ### 学员姓名 分隔
- 语言自然、口语化，像真实老师写的，不要太官方
- 群内版200-300字，私聊版每人150-200字`

  const userPrompt = `课程信息：
班级：${className}
科目：${subject}
第 ${lessonNumber} 次课
课堂内容：${lessonData.topic || '未填写'}

学员本次课情况如下：

${studentSummaries}

请生成群内反馈版和每位学员的私聊反馈版。`

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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return res.status(502).json({ error: `DeepSeek API 错误: ${errText}` })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // 拆分群内版和私聊版
    const groupMatch = content.match(/##\s*群内反馈版([\s\S]*?)(?=##\s*私聊反馈版|$)/)
    const privateMatch = content.match(/##\s*私聊反馈版([\s\S]*)$/)

    return res.status(200).json({
      raw: content,
      groupFeedback: groupMatch ? groupMatch[1].trim() : content,
      privateFeedback: privateMatch ? privateMatch[1].trim() : '',
    })
  } catch (err) {
    return res.status(500).json({ error: `请求失败: ${err.message}` })
  }
}
