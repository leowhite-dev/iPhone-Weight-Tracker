# iPhone-Weight-Tracker
手机重量排行榜项目

## 功能
- 展示所有iPhone型号的重量数据
- 支持按型号名称和重量排序
- 数据存储在PostgreSQL数据库中

## 项目结构
- `server.js`: Node.js服务器，提供API和静态文件服务
- `init-db.js`: 数据库初始化脚本，包含初始数据和表结构
- `index.html`: 前端页面
- `iphone_weights.json`: 数据库当前状态的镜像文件（此文件仅用于展示数据库当前状态，不用于程序读取）

## 使用说明
1. 首次使用时初始化数据库：
   ```bash
   node init-db.js
   ```

2. 启动服务器：
   ```bash
   node server.js
   ```

3. 访问页面：http://localhost:3000
