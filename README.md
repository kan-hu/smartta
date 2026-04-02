# SmartTA · AI家校沟通助教 MVP

> 教学记录标准化 · AI反馈智能化 · 家校协同闭环化

## 功能说明（MVP v0.1）

| 功能 | 说明 |
|------|------|
| 学员管理 | 添加学员、设置分层标签（基础/中等/拔高） |
| 班级管理 | 创建班级、分配学员 |
| 小循环录入 | 作业、进门测、课堂表现、掌握情况、出门检查 |
| AI反馈生成 | 群内表扬版 + 每位学员私聊版（DeepSeek驱动） |
| 反馈历史 | 查看历次课程记录和反馈文案 |

---

## 快速部署到 Vercel（推荐，5分钟）

### 第一步：获取 DeepSeek API Key

1. 访问 [DeepSeek 开放平台](https://platform.deepseek.com)
2. 注册账号（手机号注册）
3. 进入「API Keys」页面，创建新 Key
4. 复制保存（格式：`sk-xxxxxxxxxxxxxxxx`）

> DeepSeek 价格极低，生成一次反馈约消耗 0.001-0.003 元

### 第二步：上传代码到 GitHub

```bash
# 在本地创建项目目录，把本项目文件放进去，然后：
git init
git add .
git commit -m "SmartTA MVP 初始化"

# 在 GitHub 创建新仓库（github.com/new）
# 按 GitHub 提示推送：
git remote add origin https://github.com/你的用户名/smartta.git
git push -u origin main
```

### 第三步：部署到 Vercel

1. 访问 [vercel.com](https://vercel.com)，用 GitHub 账号登录
2. 点击「New Project」→ 选择你刚创建的 `smartta` 仓库
3. 在 **Environment Variables** 中添加：
   - Key: `DEEPSEEK_API_KEY`
   - Value: `sk-你的deepseek密钥`
4. 点击 **Deploy**，等待约1-2分钟
5. 部署成功后，Vercel 会分配一个域名，如 `smartta-xxx.vercel.app`

✅ 完成！国内可以直接访问（Vercel 在国内可用）

---

## 本地开发运行

```bash
# 1. 安装依赖（需要 Node.js 18+）
npm install

# 2. 配置环境变量
cp .env.local.example .env.local
# 编辑 .env.local，填入你的 DeepSeek Key

# 3. 启动开发服务器
npm run dev

# 4. 打开浏览器访问
# http://localhost:3000
```

---

## 部署到阿里云（进阶选项）

如果需要更稳定的国内访问速度，可以部署到阿里云 ECS：

### 方案A：阿里云函数计算（无服务器，推荐小流量）

1. 开通阿里云函数计算 FC
2. 安装 Serverless Devs 工具：`npm i -g @serverless-devs/s`
3. 运行 `npm run build && npm start` 打包
4. 按阿里云文档部署 Next.js 应用

### 方案B：ECS + PM2（适合中等流量）

```bash
# 在 ECS 服务器上（Ubuntu 22.04）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install -g pm2

# 克隆代码
git clone https://github.com/你的用户名/smartta.git
cd smartta
npm install
npm run build

# 配置环境变量
echo "DEEPSEEK_API_KEY=sk-你的key" > .env.local

# 启动
pm2 start npm --name smartta -- start
pm2 startup && pm2 save

# 配置 Nginx 反向代理（可选，绑定域名）
```

### 方案C：Vercel + 自定义域名（最简单）

在 Vercel 项目设置中添加自定义域名（需要 ICP 备案）

---

## 技术架构

```
前端：Next.js 14 + React 18 + Tailwind CSS
数据存储：localStorage（MVP，后续升级为云数据库）
AI模型：DeepSeek Chat（deepseek-chat）
API：Next.js API Routes → DeepSeek API
```

## 下一步开发计划

- [ ] 接入云数据库（Supabase / 阿里云 RDS）
- [ ] 用户登录 & 机构账号体系
- [ ] 大循环管理（课程生命周期）
- [ ] 多角色权限（老师/教务/校长）
- [ ] 续费跟进看板
- [ ] 微信小程序版本

---

## 常见问题

**Q: 国内能访问 Vercel 吗？**
A: 可以，Vercel 在国内有节点，访问速度正常。

**Q: DeepSeek API 在国内可以用吗？**
A: 可以，`api.deepseek.com` 国内直接访问，无需代理。

**Q: 数据会丢失吗？**
A: MVP 阶段数据存在浏览器本地，换浏览器或清缓存会丢失。后续版本会接入云数据库。

**Q: API Key 安全吗？**
A: 配置在 Vercel 环境变量中时，Key 不会暴露给前端，安全。如果在页面上临时输入，Key 会通过 HTTPS 发到你的 Vercel 服务器（即你自己的 API 路由），不会发到第三方。

**Q: 每次生成费用多少？**
A: DeepSeek-chat 价格约 0.5元/百万Token，生成一次4人班的反馈约 1000-1500 Token，费用约 0.001 元。
