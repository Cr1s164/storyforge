/**
 * StoryForge 系列管理器
 * 负责加载和管理系列作品数据
 * 版本: 1.0.0
 * 创建时间: 2026-03-19
 */

class SeriesManager {
    constructor() {
        this.seriesData = null;
        this.currentSeries = null;
        this.currentBook = null;
        this.currentChapter = null;
        
        // 默认配置
        this.config = {
            dataUrl: 'series/series-data.json',
            cacheKey: 'storyforge-series-cache',
            cacheDuration: 24 * 60 * 60 * 1000, // 24小时
            fallbackData: null
        };
        
        // 初始化
        this.init();
    }
    
    /**
     * 初始化管理器
     */
    async init() {
        console.log('📚 StoryForge系列管理器初始化...');
        
        try {
            // 尝试从缓存加载
            const cachedData = this.loadFromCache();
            if (cachedData) {
                this.seriesData = cachedData;
                console.log('✅ 从缓存加载系列数据');
                this.dispatchEvent('seriesDataLoaded', this.seriesData);
                return;
            }
            
            // 从文件加载
            await this.loadFromFile();
            
        } catch (error) {
            console.error('❌ 系列数据加载失败:', error);
            this.useFallbackData();
        }
    }
    
    /**
     * 从缓存加载数据
     */
    loadFromCache() {
        try {
            const cached = localStorage.getItem(this.config.cacheKey);
            if (!cached) return null;
            
            const cachedData = JSON.parse(cached);
            
            // 检查缓存是否过期
            if (cachedData.cacheTime && 
                Date.now() - cachedData.cacheTime > this.config.cacheDuration) {
                console.log('🔄 缓存已过期');
                return null;
            }
            
            return cachedData.data;
            
        } catch (error) {
            console.warn('⚠️ 缓存读取失败:', error);
            return null;
        }
    }
    
    /**
     * 从JSON文件加载数据
     */
    async loadFromFile() {
        try {
            const response = await fetch(this.config.dataUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.seriesData = data;
            
            // 保存到缓存
            this.saveToCache(data);
            
            console.log(`✅ 系列数据加载成功: ${data.series.length} 个系列`);
            this.dispatchEvent('seriesDataLoaded', data);
            
            return data;
            
        } catch (error) {
            console.error('❌ 文件加载失败:', error);
            throw error;
        }
    }
    
    /**
     * 保存数据到缓存
     */
    saveToCache(data) {
        try {
            const cacheData = {
                data: data,
                cacheTime: Date.now(),
                version: '1.0'
            };
            
            localStorage.setItem(this.config.cacheKey, JSON.stringify(cacheData));
            console.log('✅ 系列数据已缓存');
            
        } catch (error) {
            console.warn('⚠️ 缓存保存失败:', error);
        }
    }
    
    /**
     * 使用备用数据
     */
    useFallbackData() {
        if (this.config.fallbackData) {
            this.seriesData = this.config.fallbackData;
            console.log('⚠️ 使用备用数据');
            this.dispatchEvent('seriesDataLoaded', this.seriesData);
        } else {
            console.error('❌ 无可用数据');
            this.dispatchEvent('seriesDataError', new Error('无可用系列数据'));
        }
    }
    
    /**
     * 获取所有系列
     */
    getAllSeries() {
        return this.seriesData?.series || [];
    }
    
    /**
     * 根据ID获取系列
     */
    getSeriesById(seriesId) {
        if (!this.seriesData?.series) return null;
        return this.seriesData.series.find(series => series.id === seriesId);
    }
    
    /**
     * 获取系列中的书籍
     */
    getBooksInSeries(seriesId) {
        const series = this.getSeriesById(seriesId);
        return series?.books || [];
    }
    
    /**
     * 根据ID获取书籍
     */
    getBookById(seriesId, bookId) {
        const books = this.getBooksInSeries(seriesId);
        return books.find(book => book.id === bookId);
    }
    
    /**
     * 获取推荐系列
     */
    getRecommendedSeries(criteria = {}) {
        const allSeries = this.getAllSeries();
        
        if (!criteria.theme && !criteria.difficulty) {
            // 默认返回所有进行中的系列
            return allSeries.filter(series => series.status === 'ongoing');
        }
        
        return allSeries.filter(series => {
            let matches = true;
            
            // 按主题筛选
            if (criteria.theme) {
                const themeRules = this.seriesData?.recommendationRules?.byTheme || {};
                matches = matches && themeRules[criteria.theme]?.includes(series.id);
            }
            
            // 按难度筛选
            if (criteria.difficulty) {
                const difficultyRules = this.seriesData?.recommendationRules?.byDifficulty || {};
                matches = matches && difficultyRules[criteria.difficulty]?.includes(series.id);
            }
            
            return matches;
        });
    }
    
    /**
     * 获取阅读统计
     */
    getReadingStatistics() {
        if (!this.seriesData?.statistics) {
            return {
                totalSeries: 0,
                totalBooks: 0,
                completedBooks: 0,
                totalWords: 0,
                totalChapters: 0
            };
        }
        
        return this.seriesData.statistics;
    }
    
    /**
     * 获取时间线事件
     */
    getTimelineEvents(seriesId = null) {
        if (seriesId) {
            const series = this.getSeriesById(seriesId);
            return series?.timeline || [];
        }
        
        // 所有系列的时间线合并并排序
        const allEvents = [];
        this.getAllSeries().forEach(series => {
            if (series.timeline) {
                series.timeline.forEach(event => {
                    allEvents.push({
                        ...event,
                        seriesId: series.id,
                        seriesTitle: series.title
                    });
                });
            }
        });
        
        // 按日期排序
        return allEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    
    /**
     * 设置当前阅读位置
     */
    setCurrentReading(seriesId, bookId, chapterId = null) {
        this.currentSeries = seriesId;
        this.currentBook = bookId;
        this.currentChapter = chapterId;
        
        // 保存到localStorage
        this.saveReadingPosition();
        
        this.dispatchEvent('readingPositionChanged', {
            seriesId, bookId, chapterId
        });
    }
    
    /**
     * 获取当前阅读位置
     */
    getCurrentReading() {
        try {
            const saved = localStorage.getItem('storyforge-reading-position');
            if (saved) {
                const position = JSON.parse(saved);
                this.currentSeries = position.seriesId;
                this.currentBook = position.bookId;
                this.currentChapter = position.chapterId;
                return position;
            }
        } catch (error) {
            console.warn('⚠️ 阅读位置读取失败:', error);
        }
        
        return {
            seriesId: this.currentSeries,
            bookId: this.currentBook,
            chapterId: this.currentChapter
        };
    }
    
    /**
     * 保存阅读位置
     */
    saveReadingPosition() {
        try {
            const position = {
                seriesId: this.currentSeries,
                bookId: this.currentBook,
                chapterId: this.currentChapter,
                timestamp: Date.now()
            };
            
            localStorage.setItem('storyforge-reading-position', JSON.stringify(position));
            
        } catch (error) {
            console.warn('⚠️ 阅读位置保存失败:', error);
        }
    }
    
    /**
     * 获取阅读进度
     */
    getReadingProgress(seriesId, bookId) {
        const key = `storyforge-progress-${seriesId}-${bookId}`;
        try {
            const progress = localStorage.getItem(key);
            return progress ? JSON.parse(progress) : {
                completedChapters: [],
                lastReadChapter: null,
                lastReadTime: null,
                totalTimeSpent: 0
            };
        } catch (error) {
            console.warn('⚠️ 阅读进度读取失败:', error);
            return {
                completedChapters: [],
                lastReadChapter: null,
                lastReadTime: null,
                totalTimeSpent: 0
            };
        }
    }
    
    /**
     * 更新阅读进度
     */
    updateReadingProgress(seriesId, bookId, chapterId, readingTime = 0) {
        const key = `storyforge-progress-${seriesId}-${bookId}`;
        try {
            const progress = this.getReadingProgress(seriesId, bookId);
            
            // 更新进度
            if (!progress.completedChapters.includes(chapterId)) {
                progress.completedChapters.push(chapterId);
            }
            
            progress.lastReadChapter = chapterId;
            progress.lastReadTime = Date.now();
            progress.totalTimeSpent += readingTime;
            
            localStorage.setItem(key, JSON.stringify(progress));
            
            this.dispatchEvent('readingProgressUpdated', {
                seriesId, bookId, chapterId, progress
            });
            
            return progress;
            
        } catch (error) {
            console.warn('⚠️ 阅读进度保存失败:', error);
            return null;
        }
    }
    
    /**
     * 清除所有数据
     */
    clearAllData() {
        try {
            // 清除缓存
            localStorage.removeItem(this.config.cacheKey);
            
            // 清除阅读位置和进度
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('storyforge-')) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            console.log('✅ 所有StoryForge数据已清除');
            this.dispatchEvent('dataCleared');
            
        } catch (error) {
            console.error('❌ 数据清除失败:', error);
        }
    }
    
    /**
     * 事件分发
     */
    dispatchEvent(eventName, data = null) {
        const event = new CustomEvent(`storyforge:${eventName}`, {
            detail: data
        });
        document.dispatchEvent(event);
    }
    
    /**
     * 事件监听
     */
    on(eventName, callback) {
        document.addEventListener(`storyforge:${eventName}`, (event) => {
            callback(event.detail);
        });
    }
}

// 创建全局实例
window.StoryForgeSeriesManager = new SeriesManager();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SeriesManager;
}