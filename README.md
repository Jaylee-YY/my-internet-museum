# My Internet Museum

一个用于收藏、整理和再次发现互联网内容的个人信息管理工具。本仓库发布的是可交互的作品集 Demo，不包含站主的私人收藏。

**在线体验：** [my-internet-museum.vercel.app](https://my-internet-museum.vercel.app/)

## 在线 Demo 的数据规则

- 初次打开显示 5 条中性示例内容。
- 访客可以新增、编辑、删除 Exhibit、Tag 和 Collection。
- 所有修改只保存在访客自己的浏览器 `localStorage` 中。
- 不同访客之间不会共享数据，也不会看到站主的私人收藏。
- “恢复 5 条示例”可以随时重置当前浏览器的 Demo。

## 功能

- 搜索框直接粘贴链接，立即打开新增页
- “粘贴并收藏”读取剪贴板中的链接
- 自动识别小红书、Bilibili、抖音、微信公众号和普通网页
- 抓取公开网页标题与封面，失败时生成排版封面
- 手动创建、添加、移除、重命名和批量删除 Tag
- Collection、Favorite、搜索、筛选、详情、编辑与删除
- 无 Tag 的 Exhibit 仍保存在“全部收藏”中
- 响应式桌面端与移动端布局

## 本地运行

需要 Node.js 20 或更高版本：

```bash
npm start
```

访问 <http://127.0.0.1:4173/#museum>。

本地必须通过 `server.js` 启动，标题和封面抓取接口才能工作。部分内容平台可能限制公开抓取；失败时网站会自动使用排版封面。

## 检查 JavaScript

```bash
npm run check
```

## 部署到 Vercel

1. 将本目录提交到 GitHub 仓库。
2. 在 Vercel 中选择 **Add New → Project**。
3. 导入对应 GitHub 仓库。
4. 保持 Framework Preset 为 **Other**，点击 **Deploy**。
5. Vercel 会自动发布静态页面以及 `api/metadata.js`、`api/image.js` 两个 Node.js Functions。

后续向 GitHub 的生产分支推送新提交时，Vercel 会自动重新部署。

## 项目结构

```text
api/            Vercel 线上 API
assets/         品牌头像与静态资源
design/         UI 设计稿
lib/            服务端安全抓取工具
app.js          前端状态和交互
index.html      页面结构
server.js       本地开发服务器
styles.css      视觉与响应式样式
vercel.json     Vercel 部署和安全响应头
```
