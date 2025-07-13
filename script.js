class TodoApp {
    constructor() {
        this.todos = [];
        this.history = [];
        this.timers = {};
        this.feedback = {};
        this.currentDate = new Date().toDateString();
        this.selectedHistoryItems = [];
        this.isSelectMode = false;
        this.intervalRefs = {};
        this.currentFeedbackTodoId = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.startDateChecker();
        this.renderTodos();
        this.renderHistory();
    }

    bindEvents() {
        // タブ切り替え
        document.getElementById('todos-tab').addEventListener('click', () => this.switchTab('todos'));
        document.getElementById('history-tab').addEventListener('click', () => this.switchTab('history'));
        
        // TODO追加
        document.getElementById('add-todo').addEventListener('click', () => this.addTodo());
        document.getElementById('new-todo').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });
        
        // 履歴操作
        document.getElementById('select-mode-toggle').addEventListener('click', () => this.toggleSelectMode());
        document.getElementById('select-all-history').addEventListener('click', () => this.selectAllHistory());
        document.getElementById('delete-selected-history').addEventListener('click', () => this.deleteSelectedHistory());
        
        // フィードバックモーダル
        document.getElementById('feedback-cancel').addEventListener('click', () => this.closeFeedbackModal());
        document.getElementById('feedback-submit').addEventListener('click', () => this.submitFeedback());
        
        // モーダル背景クリック
        document.getElementById('feedback-modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('feedback-modal')) {
                this.closeFeedbackModal();
            }
        });
    }

    switchTab(tabName) {
        // タブボタンのアクティブ状態を切り替え
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // タブコンテンツの表示を切り替え
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}-content`).classList.add('active');
    }

    startDateChecker() {
        setInterval(() => {
            const newDate = new Date().toDateString();
            if (newDate !== this.currentDate) {
                this.handleDateChange();
                this.currentDate = newDate;
            }
        }, 60000); // 1分ごとにチェック
    }

    handleDateChange() {
        const incompleteTodos = this.todos.filter(todo => !todo.completed);
        if (incompleteTodos.length > 0) {
            const movedTodos = incompleteTodos.map(todo => ({
                ...todo,
                status: 'incomplete',
                completedAt: this.currentDate,
                totalTime: this.timers[todo.id] || 0
            }));
            this.history = [...movedTodos, ...this.history];
            this.todos = this.todos.filter(todo => todo.completed);
            this.renderTodos();
            this.renderHistory();
        }
    }

    addTodo() {
        const input = document.getElementById('new-todo');
        const text = input.value.trim();
        
        if (text) {
            const todo = {
                id: Date.now(),
                text: text,
                completed: false,
                createdAt: new Date().toISOString(),
                isRunning: false
            };
            
            this.todos.push(todo);
            this.timers[todo.id] = 0;
            input.value = '';
            this.renderTodos();
        }
    }

    startTimer(todoId) {
        if (this.intervalRefs[todoId]) return;
        
        this.intervalRefs[todoId] = setInterval(() => {
            this.timers[todoId] = (this.timers[todoId] || 0) + 1;
            this.updateTimerDisplay(todoId);
        }, 1000);
    }

    pauseTimer(todoId) {
        if (this.intervalRefs[todoId]) {
            clearInterval(this.intervalRefs[todoId]);
            delete this.intervalRefs[todoId];
        }
    }

    resetTimer(todoId) {
        this.pauseTimer(todoId);
        this.timers[todoId] = 0;
        this.updateTimerDisplay(todoId);
    }

    toggleTimer(todoId) {
        const todo = this.todos.find(t => t.id === todoId);
        if (todo.isRunning) {
            this.pauseTimer(todoId);
        } else {
            this.startTimer(todoId);
        }
        
        todo.isRunning = !todo.isRunning;
        this.renderTodos();
    }

    completeTodo(todoId) {
        this.currentFeedbackTodoId = todoId;
        document.getElementById('feedback-modal').classList.remove('hidden');
    }

    deleteTodo(todoId) {
        this.pauseTimer(todoId);
        this.todos = this.todos.filter(t => t.id !== todoId);
        delete this.timers[todoId];
        this.renderTodos();
    }

    closeFeedbackModal() {
        document.getElementById('feedback-modal').classList.add('hidden');
        document.getElementById('feedback-textarea').value = '';
        this.currentFeedbackTodoId = null;
    }

    submitFeedback() {
        const feedbackText = document.getElementById('feedback-textarea').value;
        const todoId = this.currentFeedbackTodoId;
        const todo = this.todos.find(t => t.id === todoId);
        
        if (todo) {
            this.pauseTimer(todoId);
            const completedTodo = {
                ...todo,
                completed: true,
                completedAt: new Date().toISOString(),
                totalTime: this.timers[todoId] || 0,
                feedback: feedbackText,
                status: 'completed'
            };
            
            this.history.unshift(completedTodo);
            this.todos = this.todos.filter(t => t.id !== todoId);
            this.renderTodos();
            this.renderHistory();
        }
        
        this.closeFeedbackModal();
    }

    toggleSelectMode() {
        this.isSelectMode = !this.isSelectMode;
        this.selectedHistoryItems = [];
        
        const toggleBtn = document.getElementById('select-mode-toggle');
        const selectModeButtons = document.getElementById('select-mode-buttons');
        
        if (this.isSelectMode) {
            toggleBtn.textContent = 'キャンセル';
            toggleBtn.classList.add('active');
            selectModeButtons.classList.remove('hidden');
        } else {
            toggleBtn.textContent = '選択削除';
            toggleBtn.classList.remove('active');
            selectModeButtons.classList.add('hidden');
        }
        
        this.renderHistory();
    }

    selectAllHistory() {
        if (this.selectedHistoryItems.length === this.history.length) {
            this.selectedHistoryItems = [];
        } else {
            this.selectedHistoryItems = this.history.map(item => item.id);
        }
        
        this.updateSelectAllButton();
        this.updateDeleteSelectedButton();
        this.renderHistory();
    }

    deleteSelectedHistory() {
        this.history = this.history.filter(item => !this.selectedHistoryItems.includes(item.id));
        this.selectedHistoryItems = [];
        this.isSelectMode = false;
        
        const toggleBtn = document.getElementById('select-mode-toggle');
        const selectModeButtons = document.getElementById('select-mode-buttons');
        
        toggleBtn.textContent = '選択削除';
        toggleBtn.classList.remove('active');
        selectModeButtons.classList.add('hidden');
        
        this.renderHistory();
    }

    deleteHistoryItem(historyId) {
        this.history = this.history.filter(item => item.id !== historyId);
        this.renderHistory();
    }

    toggleHistorySelection(historyId) {
        if (this.selectedHistoryItems.includes(historyId)) {
            this.selectedHistoryItems = this.selectedHistoryItems.filter(id => id !== historyId);
        } else {
            this.selectedHistoryItems.push(historyId);
        }
        
        this.updateSelectAllButton();
        this.updateDeleteSelectedButton();
        this.renderHistory();
    }

    updateSelectAllButton() {
        const selectAllBtn = document.getElementById('select-all-history');
        selectAllBtn.textContent = this.selectedHistoryItems.length === this.history.length ? '全て解除' : '全て選択';
    }

    updateDeleteSelectedButton() {
        const deleteBtn = document.getElementById('delete-selected-history');
        deleteBtn.textContent = `削除 (${this.selectedHistoryItems.length})`;
        deleteBtn.disabled = this.selectedHistoryItems.length === 0;
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    updateTimerDisplay(todoId) {
        const timerElement = document.querySelector(`[data-timer-id="${todoId}"]`);
        if (timerElement) {
            timerElement.textContent = this.formatTime(this.timers[todoId] || 0);
        }
    }

    renderTodos() {
        const todosList = document.getElementById('todos-list');
        
        if (this.todos.length === 0) {
            todosList.innerHTML = '<div class="empty-state">TODOがありません。新しいTODOを追加してください。</div>';
            return;
        }
        
        todosList.innerHTML = this.todos.map(todo => `
            <div class="todo-item">
                <div class="todo-header">
                    <span class="todo-text">${todo.text}</span>
                    <div class="todo-controls">
                        <button class="control-btn ${todo.isRunning ? 'pause' : 'play'}" 
                                onclick="app.toggleTimer(${todo.id})">
                    
