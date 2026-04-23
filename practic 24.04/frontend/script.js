const API_URL = 'http://localhost:3000/api';

// Состояние приложения
let state = {
    games: [],
    genres: [],
    platforms: [],
    selectedGenres: [],
    selectedPlatforms: [],
    searchTerm: '',
    sortBy: ''
};

// DOM элементы
const elements = {
    gamesGrid: document.getElementById('games-grid'),
    loading: document.getElementById('loading'),
    noResults: document.getElementById('no-results'),
    connectionError: document.getElementById('connection-error'),
    searchInput: document.getElementById('search'),
    genreFilters: document.getElementById('genre-filters'),
    platformFilters: document.getElementById('platform-filters'),
    sortSelect: document.getElementById('sort-select'),
    resetButton: document.getElementById('reset-filters'),
    modal: document.getElementById('modal'),
    modalBody: document.getElementById('modal-body'),
    closeModal: document.querySelector('.close')
};

// Инициализация приложения
async function init() {
    showLoading(true);
    
    try {
        // Проверка соединения
        const healthCheck = await fetch(`${API_URL}/health`);
        if (!healthCheck.ok) throw new Error('Connection failed');
        
        elements.connectionError.classList.add('hidden');
        
        // Загрузка данных
        await Promise.all([
            loadGames(),
            loadGenres(),
            loadPlatforms()
        ]);
        
        // Настройка обработчиков событий
        setupEventListeners();
        
        // Отображение игр
        renderGames();
        
    } catch (error) {
        console.error('Initialization error:', error);
        elements.connectionError.classList.remove('hidden');
        showLoading(false);
    }
}

// Загрузка игр
async function loadGames() {
    try {
        const params = new URLSearchParams();
        
        if (state.searchTerm) params.append('search', state.searchTerm);
        if (state.selectedGenres.length > 0) {
            state.selectedGenres.forEach(genre => params.append('genre', genre));
        }
        if (state.selectedPlatforms.length > 0) {
            state.selectedPlatforms.forEach(platform => params.append('platform', platform));
        }
        if (state.sortBy) params.append('sort', state.sortBy);
        
        const url = `${API_URL}/games${params.toString() ? '?' + params.toString() : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) throw new Error('Failed to fetch games');
        
        const data = await response.json();
        state.games = data.games;
        
    } catch (error) {
        console.error('Error loading games:', error);
        state.games = [];
    }
}

// Загрузка жанров
async function loadGenres() {
    try {
        const response = await fetch(`${API_URL}/genres`);
        if (!response.ok) throw new Error('Failed to fetch genres');
        state.genres = await response.json();
        renderGenreFilters();
    } catch (error) {
        console.error('Error loading genres:', error);
    }
}

// Загрузка платформ
async function loadPlatforms() {
    try {
        const response = await fetch(`${API_URL}/platforms`);
        if (!response.ok) throw new Error('Failed to fetch platforms');
        state.platforms = await response.json();
        renderPlatformFilters();
    } catch (error) {
        console.error('Error loading platforms:', error);
    }
}

// Отображение фильтров жанров
function renderGenreFilters() {
    elements.genreFilters.innerHTML = state.genres.map(genre => `
        <label>
            <input type="checkbox" value="${genre}" class="genre-checkbox">
            ${genre}
        </label>
    `).join('');
}

// Отображение фильтров платформ
function renderPlatformFilters() {
    elements.platformFilters.innerHTML = state.platforms.map(platform => `
        <label>
            <input type="checkbox" value="${platform}" class="platform-checkbox">
            ${platform}
        </label>
    `).join('');
}

// Отображение карточек игр
function renderGames() {
    showLoading(false);
    
    if (state.games.length === 0) {
        elements.gamesGrid.innerHTML = '';
        elements.noResults.classList.remove('hidden');
        return;
    }
    
    elements.noResults.classList.add('hidden');
    
    elements.gamesGrid.innerHTML = state.games.map(game => `
        <div class="game-card" data-id="${game.id}">
            <img src="${game.cover}" alt="${game.title}" class="game-cover">
            <div class="game-info">
                <h3 class="game-title">${game.title}</h3>
                <div class="game-meta">
                    <span class="game-rating">⭐ ${game.rating}</span>
                    <span class="game-price">$${game.price}</span>
                </div>
                <div class="game-tags">
                    ${(Array.isArray(game.genre) ? game.genre : [game.genre]).map(g => 
                        `<span class="tag genre">${g}</span>`
                    ).join('')}
                    ${(Array.isArray(game.platforms) ? game.platforms : [game.platforms]).map(p => 
                        `<span class="tag platform">${p}</span>`
                    ).join('')}
                </div>
            </div>
        </div>
    `).join('');
    
    // Добавление обработчиков на карточки
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', () => {
            const gameId = parseInt(card.dataset.id);
            showGameDetails(gameId);
        });
    });
}

// Показать детали игры в модальном окне
async function showGameDetails(gameId) {
    try {
        showLoading(true);
        const response = await fetch(`${API_URL}/games/${gameId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                alert('Игра не найдена');
            } else {
                throw new Error('Failed to fetch game details');
            }
            return;
        }
        
        const game = await response.json();
        renderModal(game);
        elements.modal.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading game details:', error);
        alert('Ошибка загрузки деталей игры');
    } finally {
        showLoading(false);
    }
}

// Отображение модального окна
function renderModal(game) {
    elements.modalBody.innerHTML = `
        <div class="modal-header">
            <h2 class="modal-title">${game.title}</h2>
            <div class="modal-meta">
                <span class="modal-meta-item modal-rating">⭐ ${game.rating}</span>
                <span class="modal-meta-item modal-price">$${game.price}</span>
                <span class="modal-meta-item">📅 ${game.releaseDate}</span>
                <span class="modal-meta-item">👨‍💻 ${game.developer}</span>
            </div>
        </div>
        
        <div class="modal-section">
            <h3>Описание</h3>
            <p class="modal-description">${game.description}</p>
        </div>
        
        <div class="modal-section">
            <h3>Системные требования</h3>
            <div class="system-requirements">
                <p><strong>ОС:</strong> ${game.systemRequirements.os}</p>
                <p><strong>Процессор:</strong> ${game.systemRequirements.processor}</p>
                <p><strong>Память:</strong> ${game.systemRequirements.memory}</p>
                <p><strong>Видеокарта:</strong> ${game.systemRequirements.graphics}</p>
                <p><strong>Место на диске:</strong> ${game.systemRequirements.storage}</p>
            </div>
        </div>
        
        <div class="modal-section">
            <h3>Жанры</h3>
            <div class="game-tags">
                ${(Array.isArray(game.genre) ? game.genre : [game.genre]).map(g => 
                    `<span class="tag genre">${g}</span>`
                ).join('')}
            </div>
        </div>
        
        <div class="modal-section">
            <h3>Платформы</h3>
            <div class="game-tags">
                ${(Array.isArray(game.platforms) ? game.platforms : [game.platforms]).map(p => 
                    `<span class="tag platform">${p}</span>`
                ).join('')}
            </div>
        </div>
    `;
}

// Показать/скрыть спиннер загрузки
function showLoading(show) {
    if (show) {
        elements.loading.classList.remove('hidden');
        elements.gamesGrid.innerHTML = '';
        elements.noResults.classList.add('hidden');
    } else {
        elements.loading.classList.add('hidden');
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Поиск
    elements.searchInput.addEventListener('input', debounce(async (e) => {
        state.searchTerm = e.target.value;
        await loadGames();
        renderGames();
    }, 300));
    
    // Фильтры жанров
    elements.genreFilters.addEventListener('change', async (e) => {
        if (e.target.classList.contains('genre-checkbox')) {
            state.selectedGenres = Array.from(
                document.querySelectorAll('.genre-checkbox:checked')
            ).map(cb => cb.value);
            await loadGames();
            renderGames();
        }
    });
    
    // Фильтры платформ
    elements.platformFilters.addEventListener('change', async (e) => {
        if (e.target.classList.contains('platform-checkbox')) {
            state.selectedPlatforms = Array.from(
                document.querySelectorAll('.platform-checkbox:checked')
            ).map(cb => cb.value);
            await loadGames();
            renderGames();
        }
    });
    
    // Сортировка
    elements.sortSelect.addEventListener('change', async (e) => {
        state.sortBy = e.target.value;
        await loadGames();
        renderGames();
    });
    
    // Сброс фильтров
    elements.resetButton.addEventListener('click', async () => {
        state.searchTerm = '';
        state.selectedGenres = [];
        state.selectedPlatforms = [];
        state.sortBy = '';
        
        elements.searchInput.value = '';
        document.querySelectorAll('.genre-checkbox, .platform-checkbox').forEach(cb => cb.checked = false);
        elements.sortSelect.value = '';
        
        await loadGames();
        renderGames();
    });
    
    // Закрытие модального окна
    elements.closeModal.addEventListener('click', () => {
        elements.modal.classList.add('hidden');
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === elements.modal) {
            elements.modal.classList.add('hidden');
        }
    });
}

// Debounce функция для поиска
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', init);