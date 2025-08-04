// Daily Reminder App - Vanilla JavaScript Logic
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

class DailyReminderApp {
  constructor() {
    this.currentUser = null;
    this.currentView = 'dashboard';
    this.authToken = localStorage.getItem('authToken');
    this.reminders = [];
    this.todos = [];
    this.userSettings = {
      modules: {
        todo: true,
        habits: true,
        notes: true,
        weather: true
      }
    };
    
    this.init();
  }

  async init() {
    // Check if user is authenticated
    if (this.authToken) {
      try {
        await this.loadCurrentUser();
        this.showDashboard();
      } catch (error) {
        this.logout();
        this.showAuthPage();
      }
    } else {
      this.showAuthPage();
    }
    
    this.setupEventListeners();
    this.requestNotificationPermission();
  }

  setupEventListeners() {
    // Navigation events
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-nav]')) {
        e.preventDefault();
        const view = e.target.getAttribute('data-nav');
        this.navigateTo(view);
      }
      
      if (e.target.matches('[data-action]')) {
        e.preventDefault();
        const action = e.target.getAttribute('data-action');
        this.handleAction(action, e.target);
      }
    });

    // Form submissions
    document.addEventListener('submit', (e) => {
      if (e.target.matches('[data-form]')) {
        e.preventDefault();
        const formType = e.target.getAttribute('data-form');
        this.handleFormSubmit(formType, e.target);
      }
    });
  }

  // Authentication Methods
  showAuthPage() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
      <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div class="max-w-md w-full space-y-8">
          <div class="text-center">
            <i class="fas fa-bell text-6xl text-primary-600 mb-4"></i>
            <h2 class="text-3xl font-bold text-gray-900">Daily Reminder</h2>
            <p class="mt-2 text-gray-600">Stay organized and never forget important tasks</p>
          </div>
          
          <div class="bg-white rounded-2xl shadow-xl p-8">
            <!-- Auth Toggle -->
            <div class="flex mb-6">
              <button id="login-tab" class="flex-1 py-2 px-4 text-center font-medium rounded-l-lg bg-primary-600 text-white">
                Login
              </button>
              <button id="register-tab" class="flex-1 py-2 px-4 text-center font-medium rounded-r-lg bg-gray-100 text-gray-700">
                Register
              </button>
            </div>
            
            <!-- Login Form -->
            <form id="login-form" data-form="login" class="space-y-4">
              <div>
                <input type="email" name="email" required placeholder="Email address" 
                       class="form-input w-full">
              </div>
              <div>
                <input type="password" name="password" required placeholder="Password" 
                       class="form-input w-full">
              </div>
              <button type="submit" class="btn-primary w-full">
                <span class="btn-text">Sign In</span>
                <div class="spinner hidden"></div>
              </button>
            </form>
            
            <!-- Register Form -->
            <form id="register-form" data-form="register" class="space-y-4 hidden">
              <div>
                <input type="text" name="full_name" required placeholder="Full Name" 
                       class="form-input w-full">
              </div>
              <div>
                <input type="email" name="email" required placeholder="Email address" 
                       class="form-input w-full">
              </div>
              <div>
                <input type="password" name="password" required placeholder="Password" 
                       class="form-input w-full">
              </div>
              <button type="submit" class="btn-primary w-full">
                <span class="btn-text">Create Account</span>
                <div class="spinner hidden"></div>
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    // Auth tab switching
    document.getElementById('login-tab').addEventListener('click', () => {
      document.getElementById('login-tab').className = "flex-1 py-2 px-4 text-center font-medium rounded-l-lg bg-primary-600 text-white";
      document.getElementById('register-tab').className = "flex-1 py-2 px-4 text-center font-medium rounded-r-lg bg-gray-100 text-gray-700";
      document.getElementById('login-form').classList.remove('hidden');
      document.getElementById('register-form').classList.add('hidden');
    });

    document.getElementById('register-tab').addEventListener('click', () => {
      document.getElementById('register-tab').className = "flex-1 py-2 px-4 text-center font-medium rounded-l-lg bg-primary-600 text-white";
      document.getElementById('login-tab').className = "flex-1 py-2 px-4 text-center font-medium rounded-r-lg bg-gray-100 text-gray-700";
      document.getElementById('register-form').classList.remove('hidden');
      document.getElementById('login-form').classList.add('hidden');
    });
  }

  async handleFormSubmit(formType, form) {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Show loading state
    const button = form.querySelector('button[type="submit"]');
    const btnText = button.querySelector('.btn-text');
    const spinner = button.querySelector('.spinner');
    
    btnText.textContent = 'Loading...';
    spinner.classList.remove('hidden');
    button.disabled = true;

    try {
      switch (formType) {
        case 'login':
          await this.login(data.email, data.password);
          break;
        case 'register':
          await this.register(data.full_name, data.email, data.password);
          break;
        case 'reminder':
          await this.createReminder(data);
          break;
        case 'todo':
          await this.createTodo(data);
          break;
        default:
          console.error('Unknown form type:', formType);
      }
    } catch (error) {
      this.showNotification(error.message, 'error');
    } finally {
      // Reset loading state
      btnText.textContent = formType === 'login' ? 'Sign In' : 
                           formType === 'register' ? 'Create Account' : 'Submit';
      spinner.classList.add('hidden');
      button.disabled = false;
    }
  }

  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const result = await response.json();
    this.authToken = result.access_token;
    this.currentUser = result.user;
    
    localStorage.setItem('authToken', this.authToken);
    this.showNotification('Welcome back!', 'success');
    this.showDashboard();
  }

  async register(fullName, email, password) {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        full_name: fullName, 
        email, 
        password 
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    const result = await response.json();
    this.authToken = result.access_token;
    this.currentUser = result.user;
    
    localStorage.setItem('authToken', this.authToken);
    this.showNotification('Account created successfully!', 'success');
    this.showDashboard();
  }

  async loadCurrentUser() {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${this.authToken}` }
    });

    if (!response.ok) {
      throw new Error('Failed to load user data');
    }

    const result = await response.json();
    this.currentUser = result;
    this.userSettings = result.settings || this.userSettings;
  }

  logout() {
    this.authToken = null;
    this.currentUser = null;
    localStorage.removeItem('authToken');
    this.showAuthPage();
  }

  // Main Application Views
  showDashboard() {
    this.currentView = 'dashboard';
    this.loadReminders();
    this.loadTodos();
    
    const container = document.getElementById('app-container');
    container.innerHTML = `
      <div class="min-h-screen bg-gray-50">
        ${this.renderNavbar()}
        
        <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <!-- Welcome Header -->
          <div class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900">Welcome back, ${this.currentUser.full_name}!</h1>
            <p class="text-gray-600 mt-1">Here's what's happening today</p>
          </div>

          <!-- Dashboard Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <!-- Quick Stats -->
            <div class="widget">
              <div class="widget-header">
                <h3 class="widget-title">Today's Overview</h3>
                <i class="fas fa-chart-line widget-icon"></i>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="text-center">
                  <div class="text-2xl font-bold text-primary-600" id="today-reminders">0</div>
                  <div class="text-sm text-gray-600">Reminders</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-green-600" id="pending-todos">0</div>
                  <div class="text-sm text-gray-600">Pending Tasks</div>
                </div>
              </div>
            </div>

            <!-- Upcoming Reminders -->
            <div class="widget">
              <div class="widget-header">
                <h3 class="widget-title">Upcoming Reminders</h3>
                <i class="fas fa-bell widget-icon"></i>
              </div>
              <div id="upcoming-reminders" class="space-y-2">
                <div class="text-center text-gray-500 py-4">Loading reminders...</div>
              </div>
            </div>

            <!-- Weather Widget -->
            ${this.userSettings.modules.weather ? `
            <div class="weather-card" id="weather-widget">
              <div class="flex items-center justify-between">
                <div>
                  <div class="weather-temp">22°C</div>
                  <div class="weather-condition">Sunny</div>
                </div>
                <i class="fas fa-sun text-4xl opacity-80"></i>
              </div>
              <div class="weather-details">
                <div class="weather-detail">
                  <div class="weather-detail-value">60%</div>
                  <div class="weather-detail-label">Humidity</div>
                </div>
                <div class="weather-detail">
                  <div class="weather-detail-value">8 km/h</div>
                  <div class="weather-detail-label">Wind</div>
                </div>
              </div>
            </div>
            ` : ''}

            <!-- Recent Todos -->
            ${this.userSettings.modules.todo ? `
            <div class="widget">
              <div class="widget-header">
                <h3 class="widget-title">Recent Tasks</h3>
                <i class="fas fa-tasks widget-icon"></i>
              </div>
              <div id="recent-todos" class="space-y-2">
                <div class="text-center text-gray-500 py-4">Loading tasks...</div>
              </div>
            </div>
            ` : ''}

            <!-- Quick Actions -->
            <div class="widget">
              <div class="widget-header">
                <h3 class="widget-title">Quick Actions</h3>
                <i class="fas fa-bolt widget-icon"></i>
              </div>
              <div class="space-y-3">
                <button data-action="new-reminder" class="w-full btn-primary text-left">
                  <i class="fas fa-plus mr-2"></i> Add Reminder
                </button>
                ${this.userSettings.modules.todo ? `
                <button data-action="new-todo" class="w-full btn-secondary text-left">
                  <i class="fas fa-check mr-2"></i> Add Task
                </button>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.updateDashboardStats();
    this.loadWeatherData();
  }

  renderNavbar() {
    return `
      <nav class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex items-center">
              <i class="fas fa-bell text-2xl text-primary-600 mr-3"></i>
              <span class="text-xl font-bold text-gray-900">Daily Reminder</span>
            </div>
            
            <div class="hidden sm:flex items-center space-x-4">
              <a href="#" data-nav="dashboard" class="nav-item ${this.currentView === 'dashboard' ? 'active' : ''}">
                <i class="fas fa-home mr-2"></i> Dashboard
              </a>
              <a href="#" data-nav="reminders" class="nav-item ${this.currentView === 'reminders' ? 'active' : ''}">
                <i class="fas fa-bell mr-2"></i> Reminders
              </a>
              ${this.userSettings.modules.todo ? `
              <a href="#" data-nav="todos" class="nav-item ${this.currentView === 'todos' ? 'active' : ''}">
                <i class="fas fa-tasks mr-2"></i> Tasks
              </a>
              ` : ''}
              ${this.userSettings.modules.habits ? `
              <a href="#" data-nav="habits" class="nav-item ${this.currentView === 'habits' ? 'active' : ''}">
                <i class="fas fa-chart-line mr-2"></i> Habits
              </a>
              ` : ''}
              ${this.userSettings.modules.notes ? `
              <a href="#" data-nav="notes" class="nav-item ${this.currentView === 'notes' ? 'active' : ''}">
                <i class="fas fa-sticky-note mr-2"></i> Notes
              </a>
              ` : ''}
              <a href="#" data-nav="settings" class="nav-item ${this.currentView === 'settings' ? 'active' : ''}">
                <i class="fas fa-cog mr-2"></i> Settings
              </a>
            </div>

            <div class="flex items-center space-x-3">
              <span class="text-sm text-gray-700">Hello, ${this.currentUser.full_name}</span>
              <button data-action="logout" class="text-gray-500 hover:text-gray-700">
                <i class="fas fa-sign-out-alt"></i>
              </button>
            </div>
          </div>
        </div>
      </nav>
    `;
  }

  navigateTo(view) {
    this.currentView = view;
    
    switch (view) {
      case 'dashboard':
        this.showDashboard();
        break;
      case 'reminders':
        this.showRemindersPage();
        break;
      case 'todos':
        this.showTodosPage();
        break;
      case 'habits':
        this.showHabitsPage();
        break;
      case 'notes':
        this.showNotesPage();
        break;
      case 'settings':
        this.showSettingsPage();
        break;
      default:
        this.showDashboard();
    }
    
    // Emit navigation event for React component
    window.dispatchEvent(new CustomEvent('navigate', { detail: { view } }));
  }

  // Reminder Management
  async loadReminders() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reminders`, {
        headers: { 'Authorization': `Bearer ${this.authToken}` }
      });
      
      if (response.ok) {
        this.reminders = await response.json();
        this.updateReminderDisplays();
      }
    } catch (error) {
      console.error('Failed to load reminders:', error);
    }
  }

  async createReminder(data) {
    const response = await fetch(`${API_BASE_URL}/api/reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create reminder');
    }

    this.showNotification('Reminder created successfully!', 'success');
    this.loadReminders();
    this.closeModal();
  }

  showRemindersPage() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
      <div class="min-h-screen bg-gray-50">
        ${this.renderNavbar()}
        
        <div class="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center mb-6">
            <h1 class="text-3xl font-bold text-gray-900">Reminders</h1>
            <button data-action="new-reminder" class="btn-primary">
              <i class="fas fa-plus mr-2"></i> New Reminder
            </button>
          </div>

          <div id="reminders-list" class="space-y-4">
            <div class="text-center py-8 text-gray-500">Loading reminders...</div>
          </div>
        </div>
      </div>
    `;

    this.renderRemindersList();
  }

  renderRemindersList() {
    const container = document.getElementById('reminders-list');
    
    if (this.reminders.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12">
          <i class="fas fa-bell text-4xl text-gray-300 mb-4"></i>
          <p class="text-gray-500">No reminders yet. Create your first one!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.reminders.map(reminder => `
      <div class="reminder-card priority-${reminder.priority.toLowerCase()}" data-id="${reminder.reminder_id}">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="reminder-title">${reminder.title}</h3>
            ${reminder.description ? `<p class="reminder-description">${reminder.description}</p>` : ''}
            <div class="reminder-meta">
              <span><i class="fas fa-clock mr-1"></i> ${this.formatDateTime(reminder.datetime)}</span>
              <span class="priority-badge priority-${reminder.priority.toLowerCase()}">
                ${reminder.priority} Priority
              </span>
            </div>
          </div>
          <div class="flex space-x-2 ml-4">
            <button data-action="edit-reminder" data-id="${reminder.reminder_id}" 
                    class="text-blue-500 hover:text-blue-700">
              <i class="fas fa-edit"></i>
            </button>
            <button data-action="delete-reminder" data-id="${reminder.reminder_id}" 
                    class="text-red-500 hover:text-red-700">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Todo Management
  async loadTodos() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/todos`, {
        headers: { 'Authorization': `Bearer ${this.authToken}` }
      });
      
      if (response.ok) {
        this.todos = await response.json();
        this.updateTodoDisplays();
      }
    } catch (error) {
      console.error('Failed to load todos:', error);
    }
  }

  async createTodo(data) {
    const response = await fetch(`${API_BASE_URL}/api/todos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create task');
    }

    this.showNotification('Task created successfully!', 'success');
    this.loadTodos();
    this.closeModal();
  }

  showTodosPage() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
      <div class="min-h-screen bg-gray-50">
        ${this.renderNavbar()}
        
        <div class="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between items-center mb-6">
            <h1 class="text-3xl font-bold text-gray-900">Tasks</h1>
            <button data-action="new-todo" class="btn-primary">
              <i class="fas fa-plus mr-2"></i> New Task
            </button>
          </div>

          <div id="todos-list" class="space-y-3">
            <div class="text-center py-8 text-gray-500">Loading tasks...</div>
          </div>
        </div>
      </div>
    `;

    this.renderTodosList();
  }

  renderTodosList() {
    const container = document.getElementById('todos-list');
    
    if (this.todos.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12">
          <i class="fas fa-tasks text-4xl text-gray-300 mb-4"></i>
          <p class="text-gray-500">No tasks yet. Add your first one!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.todos.map(todo => `
      <div class="todo-item">
        <input type="checkbox" ${todo.completed ? 'checked' : ''} 
               class="todo-checkbox" data-action="toggle-todo" data-id="${todo.todo_id}">
        <div class="todo-content">
          <div class="todo-title ${todo.completed ? 'completed' : ''}">${todo.title}</div>
          ${todo.description ? `<div class="text-sm text-gray-600">${todo.description}</div>` : ''}
        </div>
        <button data-action="delete-todo" data-id="${todo.todo_id}" 
                class="text-red-500 hover:text-red-700 ml-2">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `).join('');
  }

  // Settings and other methods
  showSettingsPage() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
      <div class="min-h-screen bg-gray-50">
        ${this.renderNavbar()}
        
        <div class="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-6">Settings</h1>
          
          <div class="settings-section">
            <h2 class="settings-title">Module Settings</h2>
            <p class="text-gray-600 mb-4">Enable or disable app modules based on your needs.</p>
            
            <div class="space-y-4">
              <div class="module-toggle">
                <div class="module-info">
                  <div class="module-name">To-Do List</div>
                  <div class="module-description">Manage daily tasks and checklist items</div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" ${this.userSettings.modules.todo ? 'checked' : ''} 
                         class="sr-only peer" data-module="todo">
                  <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
              
              <div class="module-toggle">
                <div class="module-info">
                  <div class="module-name">Habit Tracker</div>
                  <div class="module-description">Track recurring habits and build streaks</div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" ${this.userSettings.modules.habits ? 'checked' : ''} 
                         class="sr-only peer" data-module="habits">
                  <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
              
              <div class="module-toggle">
                <div class="module-info">
                  <div class="module-name">Quick Notes</div>
                  <div class="module-description">Save ideas and thoughts quickly</div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" ${this.userSettings.modules.notes ? 'checked' : ''} 
                         class="sr-only peer" data-module="notes">
                  <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
              
              <div class="module-toggle">
                <div class="module-info">
                  <div class="module-name">Weather Widget</div>
                  <div class="module-description">Display current weather information</div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" ${this.userSettings.modules.weather ? 'checked' : ''} 
                         class="sr-only peer" data-module="weather">
                  <div class="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-primary-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
            </div>
          </div>
          
          <div class="settings-section">
            <h2 class="settings-title">Account</h2>
            <div class="space-y-3">
              <button data-action="logout" class="btn-danger">
                <i class="fas fa-sign-out-alt mr-2"></i> Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Setup module toggle listeners
    document.querySelectorAll('[data-module]').forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const module = e.target.getAttribute('data-module');
        this.userSettings.modules[module] = e.target.checked;
        this.showNotification(`${module.charAt(0).toUpperCase() + module.slice(1)} module ${e.target.checked ? 'enabled' : 'disabled'}`, 'success');
      });
    });
  }

  // Action handlers
  handleAction(action, element) {
    const id = element.getAttribute('data-id');
    
    switch (action) {
      case 'logout':
        this.logout();
        break;
      case 'new-reminder':
        this.showReminderModal();
        break;
      case 'new-todo':
        this.showTodoModal();
        break;
      case 'delete-reminder':
        this.deleteReminder(id);
        break;
      case 'delete-todo':
        this.deleteTodo(id);
        break;
      case 'toggle-todo':
        this.toggleTodo(id);
        break;
      default:
        console.log('Unknown action:', action);
    }
  }

  // Modal Management
  showReminderModal() {
    this.showModal(`
      <div class="modal-header">
        <h3 class="modal-title">New Reminder</h3>
      </div>
      <form data-form="reminder" class="modal-body space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input type="text" name="title" required class="form-input w-full">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea name="description" rows="3" class="form-input w-full"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
            <input type="datetime-local" name="datetime" required class="form-input w-full">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select name="priority" class="form-input w-full">
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" data-action="close-modal" class="btn-secondary">Cancel</button>
          <button type="submit" class="btn-primary">
            <span class="btn-text">Create Reminder</span>
            <div class="spinner hidden"></div>
          </button>
        </div>
      </form>
    `);
  }

  showTodoModal() {
    this.showModal(`
      <div class="modal-header">
        <h3 class="modal-title">New Task</h3>
      </div>
      <form data-form="todo" class="modal-body space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input type="text" name="title" required class="form-input w-full">
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea name="description" rows="3" class="form-input w-full"></textarea>
        </div>
        <div class="modal-footer">
          <button type="button" data-action="close-modal" class="btn-secondary">Cancel</button>
          <button type="submit" class="btn-primary">
            <span class="btn-text">Create Task</span>
            <div class="spinner hidden"></div>
          </button>
        </div>
      </form>
    `);
  }

  showModal(content) {
    const modal = document.createElement('div');
    modal.className = 'modal modal-backdrop flex items-center justify-center';
    modal.innerHTML = `
      <div class="modal-content">
        ${content}
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle close modal
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.getAttribute('data-action') === 'close-modal') {
        this.closeModal();
      }
    });
  }

  closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
      modal.remove();
    }
  }

  // Utility methods
  updateDashboardStats() {
    const today = new Date().toDateString();
    const todayReminders = this.reminders.filter(r => new Date(r.datetime).toDateString() === today);
    const pendingTodos = this.todos.filter(t => !t.completed);
    
    const todayReminderEl = document.getElementById('today-reminders');
    const pendingTodosEl = document.getElementById('pending-todos');
    
    if (todayReminderEl) todayReminderEl.textContent = todayReminders.length;
    if (pendingTodosEl) pendingTodosEl.textContent = pendingTodos.length;
  }

  updateReminderDisplays() {
    this.updateDashboardStats();
    
    // Update upcoming reminders on dashboard
    const upcomingContainer = document.getElementById('upcoming-reminders');
    if (upcomingContainer) {
      const upcoming = this.reminders
        .filter(r => new Date(r.datetime) >= new Date())
        .slice(0, 3);
        
      if (upcoming.length === 0) {
        upcomingContainer.innerHTML = '<div class="text-center text-gray-500 py-4">No upcoming reminders</div>';
      } else {
        upcomingContainer.innerHTML = upcoming.map(reminder => `
          <div class="text-sm border-l-4 border-${this.getPriorityColor(reminder.priority)}-400 pl-3 py-1">
            <div class="font-medium text-gray-800">${reminder.title}</div>
            <div class="text-gray-600">${this.formatDateTime(reminder.datetime)}</div>
          </div>
        `).join('');
      }
    }
  }

  updateTodoDisplays() {
    this.updateDashboardStats();
    
    // Update recent todos on dashboard
    const recentContainer = document.getElementById('recent-todos');
    if (recentContainer) {
      const recent = this.todos.slice(0, 4);
      
      if (recent.length === 0) {
        recentContainer.innerHTML = '<div class="text-center text-gray-500 py-4">No tasks yet</div>';
      } else {
        recentContainer.innerHTML = recent.map(todo => `
          <div class="flex items-center text-sm">
            <input type="checkbox" ${todo.completed ? 'checked' : ''} disabled class="mr-2 text-primary-600">
            <span class="${todo.completed ? 'line-through text-gray-500' : 'text-gray-800'}">${todo.title}</span>
          </div>
        `).join('');
      }
    }
  }

  async loadWeatherData() {
    // Mock weather data for now
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        // In a real app, you'd use the coordinates to fetch weather data
        // For now, we'll just show mock data
        this.displayWeatherData({
          temperature: Math.floor(Math.random() * 30) + 10,
          condition: ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'][Math.floor(Math.random() * 4)],
          humidity: Math.floor(Math.random() * 50) + 40,
          windSpeed: Math.floor(Math.random() * 20) + 5
        });
      });
    }
  }

  displayWeatherData(data) {
    const weatherWidget = document.getElementById('weather-widget');
    if (weatherWidget && data) {
      const iconMap = {
        'Sunny': 'fa-sun',
        'Cloudy': 'fa-cloud',
        'Rainy': 'fa-cloud-rain',
        'Partly Cloudy': 'fa-cloud-sun'
      };
      
      weatherWidget.innerHTML = `
        <div class="flex items-center justify-between">
          <div>
            <div class="weather-temp">${data.temperature}°C</div>
            <div class="weather-condition">${data.condition}</div>
          </div>
          <i class="fas ${iconMap[data.condition] || 'fa-sun'} text-4xl opacity-80"></i>
        </div>
        <div class="weather-details">
          <div class="weather-detail">
            <div class="weather-detail-value">${data.humidity}%</div>
            <div class="weather-detail-label">Humidity</div>
          </div>
          <div class="weather-detail">
            <div class="weather-detail-value">${data.windSpeed} km/h</div>
            <div class="weather-detail-label">Wind</div>
          </div>
        </div>
      `;
    }
  }

  async deleteReminder(id) {
    if (!confirm('Are you sure you want to delete this reminder?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/reminders/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.authToken}` }
      });
      
      if (response.ok) {
        this.showNotification('Reminder deleted successfully!', 'success');
        this.loadReminders();
      } else {
        throw new Error('Failed to delete reminder');
      }
    } catch (error) {
      this.showNotification(error.message, 'error');
    }
  }

  async deleteTodo(id) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/todos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.authToken}` }
      });
      
      if (response.ok) {
        this.showNotification('Task deleted successfully!', 'success');
        this.loadTodos();
      } else {
        throw new Error('Failed to delete task');
      }
    } catch (error) {
      this.showNotification(error.message, 'error');
    }
  }

  async toggleTodo(id) {
    const todo = this.todos.find(t => t.todo_id === id);
    if (!todo) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/todos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          title: todo.title,
          description: todo.description,
          completed: !todo.completed
        })
      });
      
      if (response.ok) {
        this.loadTodos();
      } else {
        throw new Error('Failed to update task');
      }
    } catch (error) {
      this.showNotification(error.message, 'error');
    }
  }

  // Notification System
  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification bg-white rounded-lg shadow-lg border-l-4 p-4 ${
      type === 'success' ? 'border-green-500' : 
      type === 'error' ? 'border-red-500' : 
      'border-blue-500'
    }`;
    
    const iconMap = {
      'success': 'fa-check-circle text-green-500',
      'error': 'fa-exclamation-circle text-red-500',
      'info': 'fa-info-circle text-blue-500'
    };
    
    notification.innerHTML = `
      <div class="flex items-center">
        <i class="fas ${iconMap[type]} mr-3"></i>
        <span class="text-gray-800">${message}</span>
        <button class="ml-auto text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  formatDateTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === -1) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleString();
    }
  }

  getPriorityColor(priority) {
    switch (priority.toLowerCase()) {
      case 'high': return 'red';
      case 'medium': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  }

  // Placeholder methods for missing modules
  showHabitsPage() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
      <div class="min-h-screen bg-gray-50">
        ${this.renderNavbar()}
        
        <div class="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-6">Habit Tracker</h1>
          <div class="text-center py-12">
            <i class="fas fa-chart-line text-4xl text-gray-300 mb-4"></i>
            <p class="text-gray-500">Habit tracking feature coming soon!</p>
          </div>
        </div>
      </div>
    `;
  }

  showNotesPage() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
      <div class="min-h-screen bg-gray-50">
        ${this.renderNavbar()}
        
        <div class="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-6">Quick Notes</h1>
          <div class="text-center py-12">
            <i class="fas fa-sticky-note text-4xl text-gray-300 mb-4"></i>
            <p class="text-gray-500">Notes feature coming soon!</p>
          </div>
        </div>
      </div>
    `;
  }
}

// Initialize the app when the window loads
window.AppLogic = {
  app: null,
  init() {
    if (!this.app) {
      this.app = new DailyReminderApp();
    }
    return this.app;
  }
};