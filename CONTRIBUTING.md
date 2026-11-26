# 贡献指南

## 环境

需要 Node.js 18 或更高版本。

```powershell
npm install
npm start
```

浏览器访问 `http://localhost:8787`。

## 常用命令

- `npm run check`：检查服务器和前端 JavaScript 语法。
- `npm test`：运行项目测试。
- `npm run build`：生成 `dist/` 静态发布目录。
- `npm start`：启动本地联机服务器。

## 提交规范

- 不提交真实账号、VJudge Token、房间号或玩家个人数据。
- 用户可见文案优先使用简体中文。
- 修改规则时同步更新 `GAME-RULES.md` 和相关测试。
- 前端文件改动后检查 [index.html](/index.html)、[css/style.css](/css/style.css)、[js/main.js](/js/main.js) 的引用与构建结果。
