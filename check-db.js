const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'Lin'
});

async function checkDatabase() {
    try {
        // 检查表是否存在
        const tableCheckResult = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'iphones'
            );
        `);
        
        if (tableCheckResult.rows[0].exists) {
            console.log('iphones 表已存在');
            
            // 检查表结构
            const columnsResult = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'iphones'
                ORDER BY ordinal_position;
            `);
            
            console.log('表结构:');
            columnsResult.rows.forEach(column => {
                console.log(`- ${column.column_name} (${column.data_type})`);
            });
            
            // 检查数据量
            const countResult = await pool.query('SELECT COUNT(*) FROM iphones');
            console.log(`表中共有 ${countResult.rows[0].count} 条数据`);
            
            // 查看部分数据示例
            const sampleResult = await pool.query('SELECT * FROM iphones ORDER BY id LIMIT 5');
            console.log('数据示例:');
            sampleResult.rows.forEach(row => {
                console.log(row);
            });
        } else {
            console.log('iphones 表不存在');
        }
    } catch (error) {
        console.error('检查数据库失败:', error);
    } finally {
        await pool.end();
    }
}

checkDatabase(); 