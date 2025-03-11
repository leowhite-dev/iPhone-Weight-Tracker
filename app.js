// 全局变量存储数据和排序状态
let phoneData = [];
let currentSort = {
    column: 'release_year',  // 默认按发布年份排序
    direction: 'desc'        // 默认降序（新款在前）
};
let currentVersion = 'a'; // 默认版本A

// 加载数据
async function loadData() {
    try {
        const response = await fetch('/api/iphones');
        phoneData = await response.json();
        renderTable();
    } catch (error) {
        console.error('加载数据失败:', error);
        document.getElementById('table-body').innerHTML = 
            '<tr><td colspan="3" style="text-align:center">数据加载失败</td></tr>';
    }
}

// 渲染表格
function renderTable() {
    // 排序数据
    const sortedData = [...phoneData].sort((a, b) => {
        const aValue = a[currentSort.column];
        const bValue = b[currentSort.column];
        
        if (currentSort.column === 'weight_g' || currentSort.column === 'release_year') {
            // 数字排序
            return currentSort.direction === 'asc' 
                ? aValue - bValue 
                : bValue - aValue;
        } else {
            // 字符串排序
            return currentSort.direction === 'asc' 
                ? aValue.localeCompare(bValue)
                : bValue.localeCompare(aValue);
        }
    });

    // 生成表格HTML
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = sortedData.map(phone => `
        <tr>
            <td>${phone.model_name}</td>
            <td>${phone.weight_g}</td>
            <td>${phone.release_year || '未知'}</td>
        </tr>
    `).join('');

    // 更新排序指示器
    updateSortIndicators();
}

// 更新排序指示器
function updateSortIndicators() {
    // 重置所有表头
    document.querySelectorAll('th').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });
    
    // 设置当前排序表头
    const currentHeader = document.querySelector(`th[data-sort="${currentSort.column}"]`);
    currentHeader.classList.add(`sort-${currentSort.direction}`);
}

// 初始化排序功能
function initSorting() {
    document.querySelectorAll('th[data-sort]').forEach(th => {
        // 防止双击选中
        th.addEventListener('mousedown', (e) => {
            if (e.detail > 1) {
                e.preventDefault();
            }
        });
        
        th.addEventListener('click', () => {
            const column = th.dataset.sort;
            
            // 如果是型号列，强制按发布年份降序排序
            if (column === 'model_name') {
                currentSort.column = 'release_year';
                currentSort.direction = 'desc';
            } else {
                // 其他列保持原有排序逻辑
                if (currentSort.column === column) {
                    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.column = column;
                    currentSort.direction = 'asc';
                }
            }
            
            renderTable();
        });
    });
}

// 初始化版本切换
function initVersionSwitcher() {
    const currentVersionBtn = document.getElementById('current-version');
    const versionOptions = document.getElementById('version-options');
    const optionElements = document.querySelectorAll('.version-option');
    
    // 点击当前版本按钮时显示/隐藏下拉选项
    currentVersionBtn.addEventListener('click', () => {
        versionOptions.classList.toggle('show');
    });
    
    // 点击选项时切换版本
    optionElements.forEach(option => {
        option.addEventListener('click', () => {
            const version = option.dataset.version;
            currentVersion = version;
            
            // 更新按钮文本
            currentVersionBtn.textContent = option.textContent;
            
            // 隐藏下拉选项
            versionOptions.classList.remove('show');
            
            // 这里将来会添加不同版本的功能实现
            console.log(`切换到形式 ${version}`);
        });
    });
    
    // 点击页面其他地方时隐藏下拉选项
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.version-selector')) {
            versionOptions.classList.remove('show');
        }
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initSorting();
    initVersionSwitcher();
    loadData();
}); 