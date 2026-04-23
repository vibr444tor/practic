const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Логирование запросов
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
    });
    next();
});

// Загрузка данных
const gamesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'games.json'), 'utf8'));

// Вспомогательные функции
const getGenres = () => {
    const genres = new Set();
    gamesData.games.forEach(game => {
        if (Array.isArray(game.genre)) {
            game.genre.forEach(g => genres.add(g));
        } else {
            genres.add(game.genre);
        }
    });
    return Array.from(genres).sort();
};

const getPlatforms = () => {
    const platforms = new Set();
    gamesData.games.forEach(game => {
        if (Array.isArray(game.platforms)) {
            game.platforms.forEach(p => platforms.add(p));
        } else {
            platforms.add(game.platforms);
        }
    });
    return Array.from(platforms).sort();
};

// Эндпоинты
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.get('/api/games', (req, res) => {
    try {
        let filteredGames = [...gamesData.games];
        
        // Фильтрация по жанру
        if (req.query.genre) {
            const genre = req.query.genre.toLowerCase();
            filteredGames = filteredGames.filter(game => {
                if (Array.isArray(game.genre)) {
                    return game.genre.some(g => g.toLowerCase() === genre);
                }
                return game.genre.toLowerCase() === genre;
            });
        }
        
        // Фильтрация по платформе
        if (req.query.platform) {
            const platform = req.query.platform.toLowerCase();
            filteredGames = filteredGames.filter(game => {
                if (Array.isArray(game.platforms)) {
                    return game.platforms.some(p => p.toLowerCase() === platform);
                }
                return game.platforms.toLowerCase() === platform;
            });
        }
        
        // Поиск по названию
        if (req.query.search) {
            const searchTerm = req.query.search.toLowerCase();
            filteredGames = filteredGames.filter(game => 
                game.title.toLowerCase().includes(searchTerm)
            );
        }
        
        // Сортировка
        if (req.query.sort) {
            const [field, order] = req.query.sort.split(':');
            const sortOrder = order === 'desc' ? -1 : 1;
            
            filteredGames.sort((a, b) => {
                let compareA, compareB;
                
                switch(field) {
                    case 'price':
                        compareA = a.price;
                        compareB = b.price;
                        break;
                    case 'rating':
                        compareA = a.rating;
                        compareB = b.rating;
                        break;
                    case 'title':
                        compareA = a.title.toLowerCase();
                        compareB = b.title.toLowerCase();
                        break;
                    default:
                        return 0;
                }
                
                if (compareA < compareB) return -1 * sortOrder;
                if (compareA > compareB) return 1 * sortOrder;
                return 0;
            });
        }
        
        res.json({
            count: filteredGames.length,
            games: filteredGames
        });
    } catch (error) {
        console.error('Error fetching games:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/games/:id', (req, res) => {
    const id = parseInt(req.params.id);
    
    // Проверка на корректный ID
    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    const game = gamesData.games.find(g => g.id === id);
    
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json(game);
});

app.get('/api/genres', (req, res) => {
    res.json(getGenres());
});

app.get('/api/platforms', (req, res) => {
    res.json(getPlatforms());
});

// Обработка неверных методов
app.all('/api/*', (req, res) => {
    res.status(405).json({ error: 'Method not allowed' });
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`GameStore API running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});