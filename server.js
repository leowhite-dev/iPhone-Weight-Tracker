const http = require('http');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// 创建数据库连接池
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'Lin'
});

const server = http.createServer(async (req, res) => {
    // API 路由处理
    if (req.url === '/api/iphones') {
        try {
            const result = await pool.query('SELECT id, model_name, weight_g, release_year FROM iphones ORDER BY id');
            res.writeHead(200, { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify(result.rows));
            return;
        } catch (error) {
            console.error('查询数据库失败:', error);
            res.writeHead(500);
            res.end('服务器错误');
            return;
        }
    }

    // 静态文件处理
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    // 获取文件扩展名
    const extname = path.extname(filePath);
    let contentType = 'text/html';

    // 设置不同文件类型的 Content-Type
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.json':
            contentType = 'application/json';
            break;
    }

    // 读取文件
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('文件未找到');
            } else {
                res.writeHead(500);
                res.end('服务器错误: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}/`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    server.close(() => {
        pool.end();
    });
}); 