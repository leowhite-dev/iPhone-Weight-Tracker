// 全局变量存储数据和排序状态
let phoneData = [];
let currentSort = {
    column: 'release_year',  // 默认按发布年份排序
    direction: 'desc'        // 默认降序（新款在前）
};
let currentVersion = 'a'; // 默认版本A
let filteredData = []; // 存储筛选后的数据
let seriesFilters = []; // 系列筛选选项
let versionTypeFilters = []; // 版本类型筛选选项

// 加载数据
async function loadData() {
    try {
        const response = await fetch('/api/iphones');
        phoneData = await response.json();
        filteredData = [...phoneData]; // 初始时筛选数据等于全部数据
        
        // 解析所有手机系列和版本类型
        extractFilters();
        
        // 初始化所有筛选器
        initFilters();
        
        renderTable();
    } catch (error) {
        console.error('加载数据失败:', error);
        document.getElementById('table-body').innerHTML = 
            '<tr><td colspan="3" style="text-align:center">数据加载失败</td></tr>';
    }
}

// 从手机型号中提取系列和版本类型
function extractFilters() {
    const seriesSet = new Set();
    const versionTypeSet = new Set();
    
    phoneData.forEach(phone => {
        // 使用正则表达式匹配iPhone系列号和版本类型
        const match = phone.model_name.match(/iPhone\s*(\d+(?:\.\d+)?)\s*(.*)/i);
        if (match) {
            const series = match[1];
            let versionType = match[2].trim();
            
            // 处理版本类型
            if (versionType) {
                versionTypeSet.add(versionType);
            } else {
                versionTypeSet.add('标准版');
            }
            
            seriesSet.add(series);
        }
    });
    
    // 转换为数组并排序
    seriesFilters = Array.from(seriesSet).sort((a, b) => parseFloat(a) - parseFloat(b));
    versionTypeFilters = Array.from(versionTypeSet);
    
    // 调试信息
    console.log('提取的系列:', seriesFilters);
    console.log('提取的版本类型:', versionTypeFilters);
}

// 初始化所有筛选器
function initFilters() {
    // 初始化形式A的自动完成
    initAutocomplete('search-a', 'autocomplete-a', (model) => {
        // 形式A：过滤以仅显示所选手机
        filterByModel(model);
    });
    
    // 初始化形式B的自动完成
    initAutocomplete('search-b', 'autocomplete-b', (model) => {
        // 形式B：滚动到所选手机
        scrollToModel(model);
    });
    
    // 初始化形式C的复选框
    initCheckboxes('series-filters', seriesFilters, 'series', applyFiltersC);
    initCheckboxes('version-filters', versionTypeFilters, 'version', applyFiltersC);
    
    // 为筛选组添加防止文本选择的事件
    document.querySelectorAll('.filter-group').forEach(group => {
        group.addEventListener('mousedown', (e) => {
            if (e.detail > 1) {
                e.preventDefault();
            }
        });
    });
}

// 初始化自动完成功能
function initAutocomplete(inputId, autocompleteId, onSelect) {
    const input = document.getElementById(inputId);
    const autocomplete = document.getElementById(autocompleteId);
    
    // 显示所有型号的下拉列表，按发布时间降序排序
    function showAllModels() {
        autocomplete.innerHTML = '';
        
        // 按发布时间降序排序
        const sortedPhones = [...phoneData].sort((a, b) => {
            if (a.release_year !== b.release_year) {
                return b.release_year - a.release_year; // 降序排列年份
            }
            // 如果年份相同，按型号名称排序
            return a.model_name.localeCompare(b.model_name);
        });
        
        if (sortedPhones.length > 0) {
            autocomplete.style.display = 'block';
            sortedPhones.forEach(phone => {
                const item = document.createElement('div');
                item.classList.add('autocomplete-item');
                item.textContent = phone.model_name;
                item.addEventListener('click', function(e) {
                    e.stopPropagation(); // 防止冒泡
                    e.preventDefault(); // 防止默认行为
                    
                    // 直接设置输入框值
                    input.value = phone.model_name;
                    autocomplete.style.display = 'none';
                    
                    // 调用回调函数
                    onSelect(phone.model_name);
                });
                autocomplete.appendChild(item);
            });
        }
    }
    
    // 当点击输入框时显示所有型号
    input.addEventListener('click', function(e) {
        e.stopPropagation(); // 防止冒泡到document
        showAllModels();
    });
    
    // 键入时处理
    input.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        autocomplete.innerHTML = '';
        
        if (!value) {
            showAllModels(); // 如果输入框为空，显示所有型号
            if (inputId === 'search-a') {
                // 重置筛选
                filteredData = [...phoneData];
                renderTable();
            }
            return;
        }
        
        // 查找匹配的手机型号
        const matches = phoneData.filter(phone => 
            phone.model_name.toLowerCase().includes(value)
        );
        
        if (matches.length > 0) {
            autocomplete.style.display = 'block';
            matches.forEach(match => {
                const item = document.createElement('div');
                item.classList.add('autocomplete-item');
                item.textContent = match.model_name;
                item.addEventListener('click', function(e) {
                    e.stopPropagation(); // 防止冒泡
                    input.value = match.model_name;
                    autocomplete.style.display = 'none';
                    console.log('点击匹配项，调用onSelect:', match.model_name);
                    onSelect(match.model_name);
                });
                autocomplete.appendChild(item);
            });
        } else {
            autocomplete.style.display = 'none';
        }
    });
    
    // 当点击其他地方时关闭自动完成
    document.addEventListener('click', function(e) {
        if (e.target !== input && e.target !== autocomplete && !autocomplete.contains(e.target)) {
            autocomplete.style.display = 'none';
        }
    });
    
    // 当按下回车键时处理输入
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            // 阻止表单提交
            e.preventDefault();
            
            const value = this.value.trim();
            const firstItem = autocomplete.querySelector('.autocomplete-item');
            
            if (firstItem) {
                // 如果有下拉项，选择第一个
                input.value = firstItem.textContent;
                autocomplete.style.display = 'none';
                console.log('按回车键选择第一项:', firstItem.textContent);
                onSelect(firstItem.textContent);
            }
        }
    });
    
    // 支持鼠标滚轮滚动下拉列表
    autocomplete.addEventListener('wheel', function(e) {
        e.preventDefault(); // 防止页面滚动
        autocomplete.scrollTop += e.deltaY;
    });
}

// 初始化复选框
function initCheckboxes(containerId, items, type, onChange) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    items.forEach(item => {
        const checkboxItem = document.createElement('div');
        checkboxItem.classList.add('checkbox-item');
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `${type}-${item}`;
        checkbox.value = item;
        checkbox.addEventListener('change', onChange);
        
        // 防止双击选中文本
        checkbox.addEventListener('mousedown', (e) => {
            if (e.detail > 1) {
                e.preventDefault();
            }
        });
        
        const label = document.createElement('label');
        label.htmlFor = `${type}-${item}`;
        label.textContent = item;
        
        // 防止双击选中文本
        label.addEventListener('mousedown', (e) => {
            if (e.detail > 1) {
                e.preventDefault();
            }
        });
        
        checkboxItem.appendChild(checkbox);
        checkboxItem.appendChild(label);
        container.appendChild(checkboxItem);
    });
}

// 形式A：按型号筛选
function filterByModel(model) {
    if (!model) {
        filteredData = [...phoneData];
    } else {
        filteredData = phoneData.filter(phone => 
            phone.model_name.toLowerCase() === model.toLowerCase()
        );
    }
    renderTable();
}

// 形式B：滚动到指定型号
function scrollToModel(model) {
    filteredData = [...phoneData]; // 保持显示所有数据
    renderTable();
    
    // 找到匹配的行并滚动到它
    setTimeout(() => {
        const rows = document.querySelectorAll('#table-body tr');
        let foundRow = null;
        
        rows.forEach(row => {
            row.classList.remove('highlight-row');
            const modelCell = row.querySelector('td:first-child');
            if (modelCell && modelCell.textContent === model) {
                foundRow = row;
            }
        });
        
        if (foundRow) {
            foundRow.classList.add('highlight-row');
            foundRow.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }, 100);
}

// 形式C：应用多选筛选
function applyFiltersC() {
    // 获取所有选中的系列
    const selectedSeries = Array.from(document.querySelectorAll('#series-filters input:checked'))
        .map(checkbox => checkbox.value);
    
    // 获取所有选中的版本类型
    const selectedVersions = Array.from(document.querySelectorAll('#version-filters input:checked'))
        .map(checkbox => checkbox.value);
    
    // 如果没有选中任何筛选条件，显示所有数据
    if (selectedSeries.length === 0 && selectedVersions.length === 0) {
        filteredData = [...phoneData];
        renderTable();
        return;
    }
    
    // 根据选中的条件筛选数据
    filteredData = phoneData.filter(phone => {
        const match = phone.model_name.match(/iPhone\s*(\d+(?:\.\d+)?)\s*(.*)/i);
        if (!match) return false;
        
        const series = match[1];
        let versionType = match[2].trim() || '标准版';
        
        // 系列筛选逻辑
        const seriesMatch = selectedSeries.length === 0 || selectedSeries.includes(series);
        
        // 版本类型筛选逻辑
        const versionMatch = selectedVersions.length === 0 || selectedVersions.includes(versionType);
        
        // 如果选择了系列和版本类型，则需要同时满足两个条件
        if (selectedSeries.length > 0 && selectedVersions.length > 0) {
            return seriesMatch && versionMatch;
        }
        
        // 如果只选择了系列，则只需满足系列条件
        if (selectedSeries.length > 0) {
            return seriesMatch;
        }
        
        // 如果只选择了版本类型，则只需满足版本类型条件
        return versionMatch;
    });
    
    renderTable();
}

// 渲染表格
function renderTable() {
    // 排序数据
    const sortedData = [...filteredData].sort((a, b) => {
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
    if (sortedData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center">没有符合条件的结果</td></tr>';
    } else {
        tableBody.innerHTML = sortedData.map(phone => `
            <tr>
                <td>${phone.model_name}</td>
                <td>${phone.weight_g}</td>
                <td>${phone.release_year || '未知'}</td>
            </tr>
        `).join('');
    }

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

// 切换筛选形式
function showVersionForm(version) {
    // 隐藏所有筛选形式
    document.querySelectorAll('.filter-container').forEach(form => {
        form.classList.add('hidden');
    });
    
    // 显示当前版本的筛选形式
    document.getElementById(`filter-form-${version}`).classList.remove('hidden');
    
    // 重置筛选状态并重新渲染表格
    resetFilters();
}

// 重置筛选状态
function resetFilters() {
    // 重置搜索框
    document.querySelectorAll('.search-input').forEach(input => {
        input.value = '';
    });
    
    // 重置复选框
    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // 重置筛选数据
    filteredData = [...phoneData];
    renderTable();
}

// 初始化版本切换
function initVersionSwitcher() {
    // 为每个筛选形式初始化版本切换器
    initSingleVersionSwitcher('current-version', 'version-options', 'a');
    initSingleVersionSwitcher('current-version-b', 'version-options-b', 'b');
    initSingleVersionSwitcher('current-version-c', 'version-options-c', 'c');
}

// 初始化单个版本切换器
function initSingleVersionSwitcher(btnId, optionsId, defaultVersion) {
    const currentVersionBtn = document.getElementById(btnId);
    const versionOptions = document.getElementById(optionsId);
    const optionElements = versionOptions.querySelectorAll('.version-option');
    
    // 点击当前版本按钮时显示/隐藏下拉选项
    currentVersionBtn.addEventListener('click', () => {
        versionOptions.classList.toggle('show');
    });
    
    // 点击选项时切换版本
    optionElements.forEach(option => {
        option.addEventListener('click', () => {
            const version = option.dataset.version;
            currentVersion = version;
            
            // 更新所有按钮文本
            document.querySelectorAll('.version-btn').forEach(btn => {
                btn.textContent = version.toUpperCase();
            });
            
            // 隐藏下拉选项
            document.querySelectorAll('.dropdown-content').forEach(dropdown => {
                dropdown.classList.remove('show');
            });
            
            // 显示对应版本的筛选形式
            showVersionForm(version);
        });
    });
    
    // 点击页面其他地方时隐藏下拉选项
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.version-selector')) {
            document.querySelectorAll('.dropdown-content').forEach(dropdown => {
                dropdown.classList.remove('show');
            });
        }
    });
}

// 在页面加载完成后执行
window.addEventListener('DOMContentLoaded', function() {
    initSorting();
    initVersionSwitcher();
    loadData();
    
    // 添加一些全局事件处理
    document.addEventListener('click', function(event) {
        // 记录点击事件，帮助调试
        if (event.target.tagName === 'INPUT' && event.target.type === 'checkbox') {
            console.log('点击了复选框:', event.target.id);
        }
        
        if (event.target.classList.contains('autocomplete-item')) {
            console.log('点击了自动完成项:', event.target.textContent);
        }
    });
}); 