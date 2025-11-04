// Конфигурация категорий и их паттернов
const CATEGORIES = {
    entertainment: {
        name: "🎬 Развлечения",
        color: "#FF6B6B",
        patterns: [
            'youtube.com', 'netflix.com', 'twitch.tv', 'vk.com', 
            'facebook.com', 'instagram.com', 'tiktok.com', 'reddit.com',
            'twitter.com', 'kinopoisk.ru', 'ivi.ru', 'music.youtube.com',
            'spotify.com', 'soundcloud.com', 'vimeo.com', 'dzen.ru'
        ]
    },
    study: {
        name: "📚 Учеба",
        color: "#4ECDC4", 
        patterns: [
            'github.com', 'stackoverflow.com', 'habr.com', 'medium.com',
            'coursera.org', 'stepik.org', 'geekbrains.ru', 'skillbox.ru',
            'wikipedia.org', 'docs.google.com', 'drive.google.com',
            'translate.google.com', 'scholar.google.com', 'arxiv.org',
            'leetcode.com', 'codewars.com'
        ]
    },
    games: {
        name: "🎮 Игры",
        color: "#45B7D1",
        patterns: [
            'steampowered.com', 'store.steampowered.com', 'epicgames.com',
            'origin.com', 'battle.net', 'xbox.com', 'playstation.com',
            'nintendo.com', 'twitch.tv/directory/game', 'discord.com',
            'roblox.com', 'minecraft.net', 'ea.com', 'ubisoft.com',
            'gog.com', 'rockstargames.com'
        ]
    },
    shopping: {
        name: "🛍️ Шопинг",
        color: "#B06AB3",
        patterns: [
            'amazon.co.uk', 'aliexpress.com', 'ebay.com', 'wildberries.ru',
            'ozon.ru', 'citilink.ru', 'dns-shop.ru', 'mvideo.ru',
            'eldorado.ru', 'lamoda.ru', 'asos.com', 'shein.com',
            'yandex.ru/market', 'beru.ru', 'sbermegamarket.ru',
            'goods.ru', 'emall.ru'
        ]
    }
};

class TabSorter {
    constructor() {
        this.sortButton = document.getElementById('sortButton');
        this.status = document.getElementById('status');
        this.results = document.getElementById('results');
        this.resultsContent = document.getElementById('resultsContent');
        
        this.initEventListeners();
        this.showStatus('Расширение загружено', '');
        console.log('TabSorter initialized');
    }

    initEventListeners() {
        this.sortButton.addEventListener('click', () => this.sortTabs());
    }

    async sortTabs() {
        console.log('=== НАЧАЛО СОРТИРОВКИ ===');
        this.showStatus('⏳ Получаем список вкладок...', '');
        this.sortButton.disabled = true;
        this.sortButton.innerHTML = '<span class="loading"></span> Сортировка...';

        try {
            // Шаг 1: Получаем вкладки
            console.log('1. Запрос вкладок...');
            const tabs = await chrome.tabs.query({ currentWindow: true });
            console.log('Найдено вкладок:', tabs.length);

            if (tabs.length === 0) {
                this.showStatus('❌ Нет открытых вкладок', 'error');
                return;
            }

            // Шаг 2: Получаем выбранные категории
            const selectedCategories = this.getSelectedCategories();
            console.log('2. Выбранные категории:', selectedCategories);
            
            if (selectedCategories.length === 0) {
                this.showStatus('❌ Выберите хотя бы одну категорию', 'error');
                return;
            }

            // Шаг 3: Классифицируем вкладки
            console.log('3. Классификация вкладок...');
            const classifiedTabs = this.classifyTabs(tabs, selectedCategories);
            console.log('Результаты классификации:', classifiedTabs);

            // Шаг 4: Удаляем старые группы
            console.log('4. Очистка старых групп...');
            await this.cleanupExistingGroups();

            // Шаг 5: Создаем новые группы
            console.log('5. Создание новых групп...');
            await this.createTabGroups(classifiedTabs);
            
            // Шаг 6: Показываем результаты
            this.showResults(classifiedTabs);
            this.showStatus('✅ Вкладки успешно отсортированы!', 'success');
            console.log('=== СОРТИРОВКА ЗАВЕРШЕНА ===');

        } catch (error) {
            console.error('❌ ОШИБКА:', error);
            this.showStatus(`❌ Ошибка: ${error.message}`, 'error');
        } finally {
            this.sortButton.disabled = false;
            this.sortButton.textContent = '🔄 Отсортировать вкладки';
        }
    }

    classifyTabs(tabs, selectedCategories) {
        const classified = {
            entertainment: [],
            study: [],
            games: [],
            shopping: [],
            uncategorized: []
        };

        tabs.forEach(tab => {
            let categorized = false;
            
            for (const categoryId of selectedCategories) {
                const category = CATEGORIES[categoryId];
                if (this.isTabInCategory(tab, category)) {
                    classified[categoryId].push(tab);
                    categorized = true;
                    break;
                }
            }

            if (!categorized) {
                classified.uncategorized.push(tab);
            }
        });

        return classified;
    }

    isTabInCategory(tab, category) {
        if (!tab.url) return false;
        
        const url = tab.url.toLowerCase();
        return category.patterns.some(pattern => url.includes(pattern));
    }

    async createTabGroups(classifiedTabs) {
        console.log('Создание новых групп...');
        
        try {
            // Создаем группы для каждой категории
            for (const [categoryId, tabs] of Object.entries(classifiedTabs)) {
                if (categoryId === 'uncategorized' || tabs.length === 0) {
                    console.log(`Пропускаем ${categoryId}: ${tabs.length} вкладок`);
                    continue;
                }
                
                const category = CATEGORIES[categoryId];
                console.log(`Создаем группу для ${category.name}: ${tabs.length} вкладок`);

                // Собираем ID вкладок
                const tabIds = tabs.map(tab => tab.id);

                try {
                    // Создаем группу
                    const groupId = await chrome.tabs.group({ tabIds });
                    console.log(`Группа создана с ID: ${groupId}`);

                    // Обновляем свойства группы
                    await chrome.tabGroups.update(groupId, {
                        title: `${category.name} (${tabs.length})`,
                        color: this.getGroupColor(category.color),
                        collapsed: false
                    });
                    console.log(`Группа ${groupId} обновлена: ${category.name}`);
                } catch (error) {
                    console.error(`Ошибка при создании группы для ${category.name}:`, error);
                }
            }
            
        } catch (error) {
            console.error('Ошибка при создании групп:', error);
            throw error;
        }
    }

    getGroupColor(color) {
        const colorMap = {
            '#FF6B6B': 'red',
            '#4ECDC4': 'cyan', 
            '#45B7D1': 'blue',
            '#B06AB3': 'purple'
        };
        return colorMap[color] || 'grey';
    }

    showResults(classifiedTabs) {
        this.results.style.display = 'block';
        this.resultsContent.innerHTML = '';

        let totalCategorized = 0;
        
        for (const [categoryId, tabs] of Object.entries(classifiedTabs)) {
            if (tabs.length === 0) continue;
            
            if (categoryId === 'uncategorized') {
                this.addResultItem('❓ Не распознано', tabs.length, '#999999');
            } else {
                const category = CATEGORIES[categoryId];
                this.addResultItem(category.name, tabs.length, category.color);
                totalCategorized += tabs.length;
            }
        }

        const totalTabs = Object.values(classifiedTabs).flat().length;
        const uncategorizedCount = classifiedTabs.uncategorized.length;
        
        this.addResultItem('📊 Отсортировано', totalCategorized, '#667eea');
        this.addResultItem('📋 Всего вкладок', totalTabs, '#764ba2');
    }

    addResultItem(name, count, color) {
        const item = document.createElement('div');
        item.className = 'result-item';
        
        item.innerHTML = `
            <span>${name}</span>
            <span class="category-badge" style="background: ${color}">${count}</span>
        `;
        
        this.resultsContent.appendChild(item);
    }

    showStatus(message, type = '') {
        this.status.textContent = message;
        this.status.className = `status ${type}`;
    }
}

// Инициализация при загрузке popup
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing TabSorter...');
    new TabSorter();
});