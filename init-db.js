import { Pool } from 'pg'; 

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'Lin'
});

async function initDatabase() {
    try {
        // 创建表
        await pool.query(`
            CREATE TABLE IF NOT EXISTS iphones (
                id SERIAL PRIMARY KEY,
                model_name VARCHAR(100) NOT NULL,
                weight_g INTEGER NOT NULL
            );
        `);

        // 检查表是否为空
        const result = await pool.query('SELECT COUNT(*) FROM iphones');
        if (result.rows[0].count === '0') {
            console.log('请手动插入数据');
        } else {
            console.log('表中已有数据，跳过初始化');
        }
    } catch (error) {
        console.error('初始化数据库失败:', error);
    } finally {
        await pool.end();
    }
}

initDatabase(); 