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
    
    // 初始化形式D的复选框和自动完成
    initCheckboxes('series-filters-d', seriesFilters, 'series-d', applyFiltersD);
    initCheckboxes('version-filters-d', versionTypeFilters, 'version-d', applyFiltersD);
    initAutocomplete('search-d', 'autocomplete-d', (model) => {
        // 根据选择的型号自动勾选对应的系列和版本类型
        console.log('从下拉列表选择了型号，准备更新复选框:', model);
        try {
            // 记录更新前的复选框状态
            const beforeUpdate = [];
            document.querySelectorAll('#series-filters-d input:checked, #version-filters-d input:checked').forEach(cb => {
                beforeUpdate.push(cb.id);
            });
            console.log('更新前的复选框状态:', beforeUpdate);
            
            updateCheckboxesByModel(model);
            
            // 记录更新后的复选框状态
            setTimeout(() => {
                const afterUpdate = [];
                document.querySelectorAll('#series-filters-d input:checked, #version-filters-d input:checked').forEach(cb => {
                    afterUpdate.push(cb.id);
                });
                console.log('更新后的复选框状态:', afterUpdate);
                
                // 如果没有变化，记录异常
                if (beforeUpdate.length === afterUpdate.length && beforeUpdate.every((val, idx) => val === afterUpdate[idx])) {
                    console.error('警告：复选框状态未发生变化！');
                    // 尝试再次应用
                    console.log('尝试再次更新复选框');
                    updateCheckboxesByModel(model);
                }
            }, 50);
            
            // 不要在这里重置搜索输入框，移动到点击事件处理中
            // resetSearchInput();
            
        } catch (error) {
            console.error('更新复选框时出错:', error);
        }
    });
    
    // 为筛选组添加防止文本选择的事件
    document.querySelectorAll('.filter-group').forEach(group => {
        group.addEventListener('mousedown', (e) => {
            if (e.detail > 1) {
                e.preventDefault();
            }
        });
    });
    
    // 为形式D的搜索框添加回车事件
    document.getElementById('search-d').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault(); // 阻止表单提交
            const value = this.value.trim();
            
            if (value) {
                console.log('按回车键处理搜索框输入值:', value);
                try {
                    // 特殊处理纯数字或简单输入
                    if (/^\d+[a-zA-Z]*$/.test(value)) {
                        // 如果是纯数字或数字+字母，自动添加"iPhone "前缀
                        const fullModel = 'iPhone ' + value;
                        console.log('转换为完整型号:', fullModel);
                        updateCheckboxesByModel(fullModel);
                    } else if (value.toLowerCase().startsWith('iphone ')) {
                        // 已经是完整型号
                        updateCheckboxesByModel(value);
                    } else {
                        // 其他情况使用常规处理
                        updateCheckboxesByInput(value);
                    }
                    
                    // 清空输入框并显示提示文本
                    resetSearchInput();
                    // 强制应用筛选
                    setTimeout(applyFiltersD, 10);
                } catch (err) {
                    console.error('处理回车键输入时出错:', err);
                }
            }
        }
    });
    
    // 为形式D的搜索框添加焦点事件，清除提示文本
    document.getElementById('search-d').addEventListener('focus', function() {
        if (this.value === '可以继续添加要查找的iPhone型号') {
            this.value = '';
            this.classList.remove('placeholder-text');
        }
    });
    
    // 为形式D的搜索框添加失焦事件，如果为空则显示提示文本
    document.getElementById('search-d').addEventListener('blur', function() {
        if (this.value.trim() === '') {
            resetSearchInput();
        } else {
            // 尝试处理输入值
            const value = this.value.trim();
            
            // 如果输入不是提示文本，尝试处理
            if (!value.includes('可以继续添加要查找的iPhone型号')) {
                console.log('失焦时处理输入值:', value);
                
                try {
                    // 特殊处理纯数字或简单输入
                    if (/^\d+[a-zA-Z]*$/.test(value)) {
                        // 如果是纯数字或数字+字母，自动添加"iPhone "前缀
                        const fullModel = 'iPhone ' + value;
                        console.log('转换为完整型号:', fullModel);
                        updateCheckboxesByModel(fullModel);
                    } else if (value.toLowerCase().startsWith('iphone ')) {
                        // 已经是完整型号
                        updateCheckboxesByModel(value);
                    }
                    
                    // 延迟重置输入框，让用户先看到他们的输入
                    setTimeout(() => {
                        resetSearchInput();
                        applyFiltersD();
                    }, 300);
                } catch (err) {
                    console.error('处理失焦输入时出错:', err);
                }
            }
        }
    });

    // 为形式D的所有复选框添加一个change事件的通用处理程序
    document.querySelectorAll('#series-filters-d input[type="checkbox"], #version-filters-d input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            console.log('复选框状态改变:', this.id, '选中状态:', this.checked);
            setTimeout(applyFiltersD, 0); // 确保筛选结果更新
        });
    });
    
    // 添加对搜索框输入完成后的处理
    const searchD = document.getElementById('search-d');
    searchD.addEventListener('input', function() {
        const value = this.value.trim();
        // 如果是纯数字或简单输入（如"16"或"16e"），直接尝试处理
        if (/^\d+[a-zA-Z]*$/.test(value) && value.length >= 2) {
            console.log('检测到简化输入:', value);
            // 自动构造完整型号
            const fullModel = 'iPhone ' + value;
            console.log('转换为完整型号:', fullModel);
            
            // 尝试更新复选框
            setTimeout(() => {
                try {
                    updateCheckboxesByModel(fullModel);
                } catch (err) {
                    console.error('处理简化输入时出错:', err);
                }
            }, 100);
        }
        // 如果输入长度超过3个字符，尝试自动匹配
        else if (value && value.length >= 3 && !value.includes('可以继续添加要查找的iPhone型号')) {
            console.log('输入长度超过3，尝试自动匹配:', value);
            // 检查是否有精确匹配
            const exactMatch = phoneData.find(phone => 
                phone.model_name.toLowerCase() === value.toLowerCase()
            );
            
            if (exactMatch) {
                console.log('找到精确匹配项，自动更新复选框:', exactMatch.model_name);
                setTimeout(() => {
                    updateCheckboxesByModel(exactMatch.model_name);
                }, 100);
            }
        }
    });
}

// 清空搜索框并显示提示文本
function resetSearchInput() {
    const searchInput = document.getElementById('search-d');
    searchInput.value = '可以继续添加要查找的iPhone型号';
    searchInput.classList.add('placeholder-text');
    // 隐藏自动完成下拉框
    document.getElementById('autocomplete-d').style.display = 'none';
    console.log('重置搜索输入框');
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
                    
                    // 如果是搜索形式D，确保延迟重置输入框
                    if (inputId === 'search-d') {
                        setTimeout(() => {
                            resetSearchInput();
                        }, 300);
                    }
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
    let typingTimer; // 输入计时器
    const doneTypingInterval = 500; // 输入结束后延迟时间(毫秒)
    
    input.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        autocomplete.innerHTML = '';
        
        if (!value) {
            showAllModels(); // 如果输入框为空，显示所有型号
            if (inputId === 'search-a') {
                // 重置筛选
                filteredData = [...phoneData];
                renderTable();
            } else if (inputId === 'search-d') {
                applyFiltersD();
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
            
            // 形式D的特殊处理 - 当输入足够准确时直接更新复选框
            if (inputId === 'search-d') {
                // 清除之前的计时器
                clearTimeout(typingTimer);
                
                // 设置新的计时器，用户停止输入后执行
                typingTimer = setTimeout(() => {
                    console.log('用户停止输入，准备更新复选框:', value);
                    
                    // 完全匹配优先
                    const exactMatch = matches.find(phone => 
                        phone.model_name.toLowerCase() === value
                    );
                    
                    if (exactMatch) {
                        console.log('找到完全匹配，应用到复选框:', exactMatch.model_name);
                        updateCheckboxesByModel(exactMatch.model_name);
                        return;
                    }
                    
                    // 如果只有一个匹配项
                    if (matches.length === 1) {
                        console.log('只有一个匹配项，应用到复选框:', matches[0].model_name);
                        updateCheckboxesByModel(matches[0].model_name);
                        return;
                    }
                    
                    // 对于多个匹配项，尝试找到最接近的
                    if (value.toLowerCase().startsWith('iphone ')) {
                        const modelInput = value.substring(7).trim(); // 去掉"iPhone "前缀
                        console.log('尝试直接使用输入作为模型:', modelInput);
                        
                        // 直接使用"iPhone " + 输入的内容作为模型名称
                        const constructedModel = 'iPhone ' + modelInput;
                        // 尝试从构造的模型名称中提取系列和版本
                        const match = constructedModel.match(/iPhone\s*(\d+(?:\.\d+)?)\s*(.*)/i);
                        if (match) {
                            console.log('从输入构造的模型可以解析，直接应用:', constructedModel);
                            updateCheckboxesByModel(constructedModel);
                        }
                    }
                }, doneTypingInterval);
            }
        } else {
            autocomplete.style.display = 'none';
            
            // 形式D的特殊处理 - 即使没有匹配项，也尝试解析输入
            if (inputId === 'search-d' && value.toLowerCase().startsWith('iphone ')) {
                clearTimeout(typingTimer);
                
                typingTimer = setTimeout(() => {
                    const modelInput = value.substring(7).trim(); // 去掉"iPhone "前缀
                    console.log('无匹配项，尝试直接使用输入作为模型:', modelInput);
                    
                    // 直接使用"iPhone " + 输入的内容作为模型名称
                    const constructedModel = 'iPhone ' + modelInput;
                    // 尝试从构造的模型名称中提取系列和版本
                    const match = constructedModel.match(/iPhone\s*(\d+(?:\.\d+)?)\s*(.*)/i);
                    if (match) {
                        console.log('从输入构造的模型可以解析，直接应用:', constructedModel);
                        updateCheckboxesByModel(constructedModel);
                    }
                }, doneTypingInterval);
            }
        }
    });
    
    // 当点击其他地方时关闭自动完成
    document.addEventListener('click', function(e) {
        if (e.target !== input && e.target !== autocomplete && !autocomplete.contains(e.target)) {
            autocomplete.style.display = 'none';
            
            // 对于形式D，在失去焦点时尝试应用输入的内容
            if (inputId === 'search-d' && input.value.trim() && !input.value.includes('可以继续添加要查找的iPhone型号')) {
                console.log('失去焦点，处理输入:', input.value.trim());
                
                // 先尝试直接用输入内容构造iPhone型号
                if (input.value.trim().toLowerCase().startsWith('iphone ')) {
                    updateCheckboxesByModel(input.value.trim());
                } else {
                    updateCheckboxesByInput(input.value.trim());
                }
            }
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
            } else if (value && inputId === 'search-d') {
                // 如果没有下拉项，但有输入值，则直接处理输入值
                console.log('按回车键处理直接输入:', value);
                
                // 特殊处理纯数字或简单输入
                if (/^\d+[a-zA-Z]*$/.test(value)) {
                    // 如果是纯数字或数字+字母，自动添加"iPhone "前缀
                    const fullModel = 'iPhone ' + value;
                    console.log('转换为完整型号:', fullModel);
                    updateCheckboxesByModel(fullModel);
                } else if (value.toLowerCase().startsWith('iphone ')) {
                    // 已经是完整型号
                    updateCheckboxesByModel(value);
                } else {
                    // 其他情况使用常规处理
                    updateCheckboxesByInput(value);
                }
                
                // 处理完成后重置搜索框和更新UI
                resetSearchInput();
                setTimeout(applyFiltersD, 0);
            }
        }
    });
    
    // 支持鼠标滚轮滚动下拉列表
    autocomplete.addEventListener('wheel', function(e) {
        e.preventDefault(); // 防止页面滚动
        autocomplete.scrollTop += e.deltaY;
    });
    
    // 如果是形式D，添加失焦时的处理
    if (inputId === 'search-d') {
        input.addEventListener('blur', function() {
            // 设置一个短延迟，避免与点击事件冲突
            setTimeout(() => {
                const value = this.value.trim();
                if (value && !value.includes('可以继续添加要查找的iPhone型号')) {
                    console.log('搜索框失焦，处理输入:', value);
                    
                    // 特殊处理纯数字或简单输入
                    if (/^\d+[a-zA-Z]*$/.test(value)) {
                        // 如果是纯数字或数字+字母，自动添加"iPhone "前缀
                        const fullModel = 'iPhone ' + value;
                        console.log('转换为完整型号:', fullModel);
                        updateCheckboxesByModel(fullModel);
                    } else if (value.toLowerCase().startsWith('iphone ')) {
                        // 已经是完整型号
                        updateCheckboxesByModel(value);
                    } else {
                        // 其他情况使用常规处理
                        updateCheckboxesByInput(value);
                    }
                    
                    resetSearchInput();
                    setTimeout(applyFiltersD, 0);
                }
            }, 200);
        });
    }
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
    
    // 调试信息
    if (containerId === 'series-filters-d' || containerId === 'version-filters-d') {
        console.log(`初始化复选框 ${containerId}:`, items.map(item => `${type}-${item}`));
    }
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

// 形式D：应用多选+搜索筛选
function applyFiltersD() {
    console.log('应用筛选D');
    
    // 获取所有选中的系列
    const selectedSeries = Array.from(document.querySelectorAll('#series-filters-d input:checked'))
        .map(checkbox => checkbox.value);
    
    // 获取所有选中的版本类型
    const selectedVersions = Array.from(document.querySelectorAll('#version-filters-d input:checked'))
        .map(checkbox => checkbox.value);
    
    // 获取搜索输入
    const searchInput = document.getElementById('search-d');
    const searchValue = searchInput.value.toLowerCase();
    
    // 根据选中的条件和搜索值筛选数据
    const beforeFilterCount = filteredData.length;
    filteredData = phoneData.filter(phone => {
        // 如果搜索框中是提示文本，则忽略搜索条件
        const isPlaceholder = searchValue === '可以继续添加要查找的iphone型号' || 
                              searchValue === '可以继续添加要查找的iphone型号'.toLowerCase();
        
        // 如果有搜索值且不是提示文本，先检查是否匹配
        if (searchValue && !isPlaceholder && !phone.model_name.toLowerCase().includes(searchValue)) {
            return false;
        }
        
        // 如果没有选择任何筛选条件，则直接返回搜索结果
        if (selectedSeries.length === 0 && selectedVersions.length === 0) {
            return isPlaceholder ? true : searchValue ? phone.model_name.toLowerCase().includes(searchValue) : true;
        }
        
        const match = phone.model_name.match(/iPhone\s*(\d+(?:\.\d+)?)\s*(.*)/i);
        if (!match) return false; // 如果无法解析，排除它
        
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
    initSingleVersionSwitcher('current-version-d', 'version-options-d', 'd');
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

// 根据选择的型号自动勾选对应的系列和版本类型
function updateCheckboxesByModel(model) {
    console.log('根据型号更新复选框:', model);
    
    if (!model || typeof model !== 'string') {
        console.error('无效的型号:', model);
        return;
    }
    
    // 先取消所有选中状态
    document.querySelectorAll('#series-filters-d input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    document.querySelectorAll('#version-filters-d input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // 解析型号，提取系列和版本类型
    const match = model.match(/iPhone\s*(\d+(?:\.\d+)?)\s*(.*)/i);
    if (match) {
        const series = match[1];
        let versionType = match[2].trim() || '标准版';
        
        console.log('提取的系列:', series);
        console.log('提取的版本类型:', versionType);
        
        // 使用辅助函数设置复选框状态
        const seriesCheckboxId = `series-d-${series}`;
        const versionCheckboxId = `version-d-${versionType}`;
        
        let seriesFound = setCheckboxChecked(seriesCheckboxId);
        let versionFound = setCheckboxChecked(versionCheckboxId);
        
        // 如果直接设置失败，尝试查找并设置（针对系列）
        if (!seriesFound) {
            document.querySelectorAll('#series-filters-d input[type="checkbox"]').forEach(checkbox => {
                if (checkbox.value === series) {
                    seriesFound = setCheckboxChecked(checkbox.id);
                }
            });
            
            if (!seriesFound) {
                document.querySelectorAll('#series-filters-d input[type="checkbox"]').forEach(checkbox => {
                    if (checkbox.value.includes(series) || series.includes(checkbox.value)) {
                        seriesFound = setCheckboxChecked(checkbox.id);
                    }
                });
            }
        }
        
        // 如果直接设置失败，尝试查找并设置（针对版本类型）
        if (!versionFound) {
            document.querySelectorAll('#version-filters-d input[type="checkbox"]').forEach(checkbox => {
                if (checkbox.value === versionType) {
                    versionFound = setCheckboxChecked(checkbox.id);
                }
            });
            
            if (!versionFound) {
                document.querySelectorAll('#version-filters-d input[type="checkbox"]').forEach(checkbox => {
                    if (checkbox.value.includes(versionType) || versionType.includes(checkbox.value)) {
                        versionFound = setCheckboxChecked(checkbox.id);
                    }
                });
            }
        }
        
        // 强制更新筛选结果
        setTimeout(applyFiltersD, 10);
        setTimeout(applyFiltersD, 100);
    } else {
        console.log('无法从型号中提取系列和版本类型:', model);
    }
}

// 根据输入的内容自动勾选对应的系列和版本类型
function updateCheckboxesByInput(input) {
    console.log('根据输入更新复选框 (开始处理):', input);
    const inputLower = input.toLowerCase();
    
    // 先检查是否有完全匹配的型号
    const exactMatch = phoneData.find(phone => 
        phone.model_name.toLowerCase() === inputLower
    );
    
    if (exactMatch) {
        console.log('找到完全匹配的型号:', exactMatch.model_name);
        // 如果有完全匹配的型号，直接使用它
        updateCheckboxesByModel(exactMatch.model_name);
        return;
    }
    
    // 如果没有完全匹配，查找包含输入内容的型号
    const matches = phoneData.filter(phone => 
        phone.model_name.toLowerCase().includes(inputLower)
    );
    
    console.log('找到的匹配型号数量:', matches.length);
    
    if (matches.length > 0) {
        // 如果只有一个匹配项，直接使用它
        if (matches.length === 1) {
            console.log('只有一个匹配项，直接使用:', matches[0].model_name);
            updateCheckboxesByModel(matches[0].model_name);
            return;
        }
        
        // 先取消所有选中状态
        document.querySelectorAll('#series-filters-d input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        document.querySelectorAll('#version-filters-d input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // 收集所有匹配的系列和版本类型
        const matchedSeries = new Set();
        const matchedVersions = new Set();
        
        matches.forEach(phone => {
            const match = phone.model_name.match(/iPhone\s*(\d+(?:\.\d+)?)\s*(.*)/i);
            if (match) {
                const series = match[1];
                let versionType = match[2].trim() || '标准版';
                
                matchedSeries.add(series);
                matchedVersions.add(versionType);
            }
        });
        
        console.log('匹配的系列:', Array.from(matchedSeries));
        console.log('匹配的版本类型:', Array.from(matchedVersions));
        
        let anySeriesFound = false;
        let anyVersionFound = false;
        
        // 勾选所有匹配的系列
        matchedSeries.forEach(series => {
            const seriesCheckbox = document.getElementById(`series-d-${series}`);
            if (seriesCheckbox) {
                console.log('找到系列复选框:', seriesCheckbox.id);
                seriesCheckbox.checked = true;
                anySeriesFound = true;
                
                // 手动触发change事件
                try {
                    const event = new Event('change', { bubbles: true });
                    seriesCheckbox.dispatchEvent(event);
                } catch (err) {
                    console.error('触发系列复选框change事件失败:', err);
                }
                
                // 强制更新DOM
                setTimeout(() => {
                    seriesCheckbox.checked = true;
                }, 0);
            } else {
                console.log(`未找到系列复选框: series-d-${series}`);
                // 尝试查找所有系列复选框，找到最接近的
                document.querySelectorAll('#series-filters-d input[type="checkbox"]').forEach(checkbox => {
                    console.log('检查系列复选框:', checkbox.id, checkbox.value);
                    if (checkbox.value === series) {
                        checkbox.checked = true;
                        anySeriesFound = true;
                        console.log('通过值匹配找到系列复选框:', checkbox.id);
                        
                        // 手动触发change事件
                        try {
                            const event = new Event('change', { bubbles: true });
                            checkbox.dispatchEvent(event);
                        } catch (err) {
                            console.error('触发系列复选框change事件失败:', err);
                        }
                        
                        // 强制更新DOM
                        setTimeout(() => {
                            checkbox.checked = true;
                        }, 0);
                    }
                });
                
                if (!anySeriesFound) {
                    // 尝试模糊匹配
                    document.querySelectorAll('#series-filters-d input[type="checkbox"]').forEach(checkbox => {
                        if (checkbox.value.includes(series) || series.includes(checkbox.value)) {
                            checkbox.checked = true;
                            anySeriesFound = true;
                            console.log('通过模糊匹配找到系列复选框:', checkbox.id);
                            
                            // 手动触发change事件
                            try {
                                const event = new Event('change', { bubbles: true });
                                checkbox.dispatchEvent(event);
                            } catch (err) {
                                console.error('触发系列复选框change事件失败:', err);
                            }
                            
                            // 强制更新DOM
                            setTimeout(() => {
                                checkbox.checked = true;
                            }, 0);
                        }
                    });
                }
            }
        });
        
        // 勾选所有匹配的版本类型
        matchedVersions.forEach(versionType => {
            const versionCheckbox = document.getElementById(`version-d-${versionType}`);
            if (versionCheckbox) {
                console.log('找到版本类型复选框:', versionCheckbox.id);
                versionCheckbox.checked = true;
                anyVersionFound = true;
                
                // 手动触发change事件
                try {
                    const event = new Event('change', { bubbles: true });
                    versionCheckbox.dispatchEvent(event);
                } catch (err) {
                    console.error('触发版本类型复选框change事件失败:', err);
                }
                
                // 强制更新DOM
                setTimeout(() => {
                    versionCheckbox.checked = true;
                }, 0);
            } else {
                console.log(`未找到版本类型复选框: version-d-${versionType}`);
                // 尝试查找所有版本类型复选框，找到最接近的
                document.querySelectorAll('#version-filters-d input[type="checkbox"]').forEach(checkbox => {
                    console.log('检查版本类型复选框:', checkbox.id, checkbox.value);
                    if (checkbox.value === versionType) {
                        checkbox.checked = true;
                        anyVersionFound = true;
                        console.log('通过值匹配找到版本类型复选框:', checkbox.id);
                        
                        // 手动触发change事件
                        try {
                            const event = new Event('change', { bubbles: true });
                            checkbox.dispatchEvent(event);
                        } catch (err) {
                            console.error('触发版本类型复选框change事件失败:', err);
                        }
                        
                        // 强制更新DOM
                        setTimeout(() => {
                            checkbox.checked = true;
                        }, 0);
                    }
                });
                
                if (!anyVersionFound) {
                    // 尝试模糊匹配
                    document.querySelectorAll('#version-filters-d input[type="checkbox"]').forEach(checkbox => {
                        if (checkbox.value.includes(versionType) || versionType.includes(checkbox.value)) {
                            checkbox.checked = true;
                            anyVersionFound = true;
                            console.log('通过模糊匹配找到版本类型复选框:', checkbox.id);
                            
                            // 手动触发change事件
                            try {
                                const event = new Event('change', { bubbles: true });
                                checkbox.dispatchEvent(event);
                            } catch (err) {
                                console.error('触发版本类型复选框change事件失败:', err);
                            }
                            
                            // 强制更新DOM
                            setTimeout(() => {
                                checkbox.checked = true;
                            }, 0);
                        }
                    });
                }
            }
        });
        
        // 记录结果
        console.log('勾选结果 - 系列:', anySeriesFound ? '成功' : '失败', '版本类型:', anyVersionFound ? '成功' : '失败');
        
        // 强制更新筛选结果
        setTimeout(applyFiltersD, 10);
        setTimeout(applyFiltersD, 100);
    }
}

// 重命名forceCheckboxChecked为更简洁的名称并移除详细日志
function setCheckboxChecked(checkboxId, shouldBeChecked = true) {
    const checkbox = document.getElementById(checkboxId);
    if (!checkbox) {
        return false;
    }
    
    // 使用多种方法确保复选框被选中
    checkbox.checked = shouldBeChecked;
    
    if (shouldBeChecked) {
        checkbox.setAttribute('checked', 'checked');
    } else {
        checkbox.removeAttribute('checked');
    }
    
    // 触发change事件
    try {
        const event = new Event('change', { bubbles: true });
        checkbox.dispatchEvent(event);
        
        // 触发click事件以模拟用户点击
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        checkbox.dispatchEvent(clickEvent);
        
        return true;
    } catch (err) {
        console.error(`设置复选框 ${checkboxId} 状态失败:`, err);
        return false;
    }
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