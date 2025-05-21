class TodoApp {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.currentFilter = 'all';
        this.currentPriority = 'all';
        this.currentCategory = 'all';
        this.currentSort = 'date';
        this.editingTaskId = null;
        this.confirmCallback = null;

        // Theme
        this.theme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', this.theme);
        this.themeToggle = document.getElementById('theme-toggle');
        this.themeToggle.checked = this.theme === 'dark';

        // DOM Elements
        this.modal = document.getElementById('task-modal');
        this.confirmModal = document.getElementById('confirm-modal');
        this.taskForm = document.getElementById('task-form');
        this.todoList = document.getElementById('todo-list');
        this.searchInput = document.getElementById('search-tasks');
        this.sortSelect = document.getElementById('sort-tasks');
        this.viewTitle = document.getElementById('view-title');

        // Stats Elements
        this.totalTasksElement = document.getElementById('total-tasks');
        this.completedTasksElement = document.getElementById('completed-tasks');
        this.pendingTasksElement = document.getElementById('pending-tasks');

        this.initializeEventListeners();
        this.render();
    }

    initializeEventListeners() {
        // Modal Controls
        document.getElementById('add-task-btn').addEventListener('click', () => {
            this.editingTaskId = null;
            this.openModal();
        });
        document.querySelector('.close-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancel-task').addEventListener('click', () => this.closeModal());

        // Form Submission
        this.taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (this.editingTaskId) {
                this.updateTask(this.editingTaskId);
            } else {
                this.addTask();
            }
        });

        // Search with debounce
        let searchTimeout;
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.render();
            }, 300);
        });

        // Sorting
        this.sortSelect.addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.render();
        });

        // Filter Buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                const priority = e.target.dataset.priority;
                const category = e.target.dataset.category;

                if (filter) {
                    this.currentFilter = filter;
                    this.currentPriority = 'all';
                    this.currentCategory = 'all';
                } else if (priority) {
                    this.currentPriority = priority;
                    this.currentFilter = 'all';
                } else if (category) {
                    this.currentCategory = category;
                    this.currentFilter = 'all';
                }

                this.updateFilters();
                this.render();
            });
        });

        // Confirmation Modal Controls
        document.getElementById('confirm-cancel').addEventListener('click', () => this.closeConfirmModal());
        document.getElementById('confirm-ok').addEventListener('click', () => {
            if (this.confirmCallback) {
                this.confirmCallback();
                this.closeConfirmModal();
            }
        });

        // Theme Toggle
        this.themeToggle.addEventListener('change', () => this.toggleTheme());
    }

    openModal() {
        this.modal.style.display = 'block';
        if (!this.editingTaskId) {
            this.taskForm.reset();
        }
        document.getElementById('task-title').focus();
    }

    closeModal() {
        this.modal.style.display = 'none';
        this.editingTaskId = null;
    }

    addTask() {
        const task = this.getTaskFromForm();
        this.tasks.push(task);
        this.saveTasks();
        this.closeModal();
        this.render();

        if (task.reminder !== 'none') {
            this.setReminder(task);
        }
    }

    updateTask(id) {
        const taskIndex = this.tasks.findIndex(t => t.id === id);
        if (taskIndex !== -1) {
            const updatedTask = this.getTaskFromForm();
            updatedTask.id = id;
            updatedTask.createdAt = this.tasks[taskIndex].createdAt;
            this.tasks[taskIndex] = updatedTask;
            this.saveTasks();
            this.closeModal();
            this.render();

            if (updatedTask.reminder !== 'none') {
                this.setReminder(updatedTask);
            }
        }
    }

    getTaskFromForm() {
        return {
            id: Date.now(),
            title: document.getElementById('task-title').value,
            description: document.getElementById('task-description').value,
            date: document.getElementById('task-date').value,
            time: document.getElementById('task-time').value,
            priority: document.getElementById('task-priority').value,
            category: document.getElementById('task-category').value,
            location: document.getElementById('task-location').value,
            reminder: document.getElementById('task-reminder').value,
            completed: false,
            createdAt: new Date().toISOString()
        };
    }

    setReminder(task) {
        const dueDate = new Date(`${task.date}T${task.time}`);
        const reminderTime = dueDate.getTime() - (parseInt(task.reminder) * 60 * 1000);

        if (reminderTime > Date.now()) {
            setTimeout(() => {
                this.showNotification(task);
            }, reminderTime - Date.now());
        }
    }

    showNotification(task) {
        if ('Notification' in window) {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification('Task Reminder', {
                        body: `"${task.title}" is due soon!`,
                        icon: '/path/to/icon.png'
                    });
                }
            });
        }
    }

    showConfirmModal(title, message, callback) {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        this.confirmCallback = callback;
        this.confirmModal.style.display = 'block';
    }

    closeConfirmModal() {
        this.confirmModal.style.display = 'none';
        this.confirmCallback = null;
        document.getElementById('confirm-title').textContent = 'Confirm Action';
        document.getElementById('confirm-message').textContent = 'Are you sure you want to perform this action?';
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            const action = task.completed ? 'unmark' : 'mark as complete';
            this.showConfirmModal(
                'Confirm Action',
                `Are you sure you want to ${action} this task?`,
                () => {
                    task.completed = !task.completed;
                    this.saveTasks();
                    this.render();
                }
            );
        }
    }

    deleteTask(id) {
        this.showConfirmModal(
            'Delete Task',
            'Are you sure you want to delete this task? This action cannot be undone.',
            () => {
                this.tasks = this.tasks.filter(task => task.id !== id);
                this.saveTasks();
                this.render();
            }
        );
    }

    editTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            this.editingTaskId = id;
            document.getElementById('task-title').value = task.title;
            document.getElementById('task-description').value = task.description;
            document.getElementById('task-date').value = task.date;
            document.getElementById('task-time').value = task.time;
            document.getElementById('task-priority').value = task.priority;
            document.getElementById('task-category').value = task.category;
            document.getElementById('task-location').value = task.location;
            document.getElementById('task-reminder').value = task.reminder;
            this.openModal();
        }
    }

    updateFilters() {
        // Update status filter buttons
        document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === this.currentFilter) {
                btn.classList.add('active');
            }
        });

        // Update priority filter buttons
        document.querySelectorAll('.filter-btn[data-priority]').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.priority === this.currentPriority) {
                btn.classList.add('active');
            }
        });

        // Update category filter buttons
        document.querySelectorAll('.filter-btn[data-category]').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.category === this.currentCategory) {
                btn.classList.add('active');
            }
        });

        // Update view title
        let title = 'All Tasks';
        if (this.currentFilter !== 'all') {
            title = `${this.currentFilter.charAt(0).toUpperCase() + this.currentFilter.slice(1)} Tasks`;
        } else if (this.currentPriority !== 'all') {
            title = `${this.currentPriority.charAt(0).toUpperCase() + this.currentPriority.slice(1)} Priority Tasks`;
        } else if (this.currentCategory !== 'all') {
            title = `${this.currentCategory.charAt(0).toUpperCase() + this.currentCategory.slice(1)} Tasks`;
        }
        this.viewTitle.textContent = title;
    }

    renderList() {
        let filteredTasks = this.tasks;

        // Apply search filter
        const searchTerm = this.searchInput.value.toLowerCase();
        if (searchTerm) {
            filteredTasks = filteredTasks.filter(task =>
                task.title.toLowerCase().includes(searchTerm) ||
                task.description.toLowerCase().includes(searchTerm) ||
                task.category.toLowerCase().includes(searchTerm) ||
                task.location.toLowerCase().includes(searchTerm)
            );
        }

        // Apply status filter
        if (this.currentFilter === 'active') {
            filteredTasks = filteredTasks.filter(task => !task.completed);
        } else if (this.currentFilter === 'completed') {
            filteredTasks = filteredTasks.filter(task => task.completed);
        }

        // Apply priority filter
        if (this.currentPriority !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.priority === this.currentPriority);
        }

        // Apply category filter
        if (this.currentCategory !== 'all') {
            filteredTasks = filteredTasks.filter(task => task.category === this.currentCategory);
        }

        // Apply sorting
        filteredTasks.sort((a, b) => {
            switch (this.currentSort) {
                case 'date':
                    return new Date(a.date) - new Date(b.date);
                case 'priority':
                    const priorityOrder = { high: 0, medium: 1, low: 2 };
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                case 'category':
                    return a.category.localeCompare(b.category);
                default:
                    return 0;
            }
        });

        this.todoList.innerHTML = filteredTasks.map(task => this.createTaskElement(task)).join('');
        this.updateStats();
    }

    createTaskElement(task) {
        return `
            <div class="todo-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
                <input type="checkbox" class="todo-checkbox" ${task.completed ? 'checked' : ''} onclick="event.preventDefault();">
                <div class="todo-content">
                    <div class="todo-title">${task.title}</div>
                    ${task.description ? `<div class="todo-description">${task.description}</div>` : ''}
                    <div class="todo-meta">
                        ${task.date ? `<span><i class="fas fa-calendar"></i> ${task.date}</span>` : ''}
                        ${task.time ? `<span><i class="fas fa-clock"></i> ${task.time}</span>` : ''}
                        ${task.location ? `<span><i class="fas fa-map-marker-alt"></i> ${task.location}</span>` : ''}
                        <span class="priority-badge priority-${task.priority}">${task.priority}</span>
                        <span class="category-badge">${task.category}</span>
                    </div>
                </div>
                <div class="todo-actions">
                    <button class="edit-btn" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    }

    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(task => task.completed).length;
        const pending = total - completed;

        this.totalTasksElement.textContent = total;
        this.completedTasksElement.textContent = completed;
        this.pendingTasksElement.textContent = pending;
    }

    render() {
        this.renderList();
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.theme);
        localStorage.setItem('theme', this.theme);
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    const app = new TodoApp();

    // Event delegation for dynamic elements
    document.getElementById('todo-list').addEventListener('click', (e) => {
        const taskElement = e.target.closest('.todo-item');
        if (!taskElement) return;

        const taskId = parseInt(taskElement.dataset.id);

        if (e.target.classList.contains('todo-checkbox')) {
            e.preventDefault(); // Prevent default checkbox behavior
            app.toggleTask(taskId);
        } else if (e.target.closest('.edit-btn')) {
            app.editTask(taskId);
        } else if (e.target.closest('.delete-btn')) {
            app.deleteTask(taskId);
        }
    });
}); 