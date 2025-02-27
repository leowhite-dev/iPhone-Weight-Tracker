const { Pool } = require('pg');

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
            // 插入数据
            const iphoneData = require('./iphone_weights.json');
            for (const phone of iphoneData) {
                await pool.query(
                    'INSERT INTO iphones (model_name, weight_g) VALUES ($1, $2)',
                    [phone.model_name, phone.weight_g]
                );
            }
            console.log('数据初始化完成');
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