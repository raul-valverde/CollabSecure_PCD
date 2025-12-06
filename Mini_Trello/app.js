// Lógica con persistencia en localStorage para login, logout y manejo de tareas
let tasks = { todo: [], doing: [], done: [] };
const STORAGE_KEY = 'mini-trello-tasks';
const USERS_KEY = 'mini-trello-users';
let currentUser = null;

function getUsers() {
    try {
        const raw = localStorage.getItem(USERS_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function saveUsers(u) {
    try {
        localStorage.setItem(USERS_KEY, JSON.stringify(u));
    } catch (e) {
        console.error('No se pudo guardar users', e);
    }
}

function initUsers() {
    let users = getUsers();
    if (!users) {
        users = { admin: '1234', subadmin: '4321' };
        saveUsers(users);
    } else {
        // ensure default accounts exist
        if (!users.admin) users.admin = '1234';
        if (!users.subadmin) users.subadmin = '4321';
        saveUsers(users);
    }
}

function registerUser() {
    const u = document.getElementById('reg-username').value.trim();
    const p = document.getElementById('reg-password').value;
    const msg = document.getElementById('reg-msg');
    msg.textContent = '';
    if (!u || !p) {
        msg.style.color = 'red';
        msg.textContent = 'Usuario y contraseña requeridos.';
        return;
    }
    const users = getUsers() || {};
    if (users[u]) {
        msg.style.color = 'red';
        msg.textContent = 'Usuario ya existe.';
        return;
    }
    users[u] = p;
    saveUsers(users);
    msg.style.color = 'green';
    msg.textContent = 'Usuario registrado. Ya puede iniciar sesión.';
    document.getElementById('reg-username').value = '';
    document.getElementById('reg-password').value = '';
}

function updateCurrentUserUI() {
    const el = document.getElementById('current-user');
    if (el) {
        el.textContent = currentUser ? `Usuario: ${currentUser}` : '';
    }
}

// Mostrar un toast breve en pantalla
function ensureToastContainer() {
    let c = document.querySelector('.toast-container');
    if (!c) {
        c = document.createElement('div');
        c.className = 'toast-container';
        document.body.appendChild(c);
    }
    return c;
}

function showToast(message, type = 'default', duration = 2000) {
    const container = ensureToastContainer();
    const t = document.createElement('div');
    t.className = 'toast';
    if (type === 'success') t.classList.add('success');
    if (type === 'warn') t.classList.add('warn');
    t.textContent = message;
    container.appendChild(t);
    // Fuerza reflow para transición
    requestAnimationFrame(() => t.classList.add('show'));
    // Ocultar y remover
    setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 260);
    }, duration);
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
        console.error('No se pudo guardar en localStorage', e);
    }
}

function loadTasks() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) tasks = JSON.parse(raw);
    } catch (e) {
        console.error('Error leyendo tareas de localStorage', e);
        tasks = { todo: [], doing: [], done: [] };
    }
    renderTasks();
}

function renderTasks() {
    const map = {
        todo: document.getElementById('list-todo'),
        doing: document.getElementById('list-doing'),
        done: document.getElementById('list-done')
    };

    Object.keys(map).forEach((key) => {
        const container = map[key];
        if (!container) return;
        container.innerHTML = '';
        (tasks[key] || []).forEach((t) => {
            const card = document.createElement('div');
            card.className = 'task-card';

            const content = document.createElement('div');
            content.className = 'task-content';
            content.textContent = t.text;
            card.appendChild(content);

            const actions = document.createElement('div');
            actions.className = 'task-actions';

            // Move left/right buttons
            const cols = ['todo','doing','done'];
            const currentIndex = cols.indexOf(key);

            const btnLeft = document.createElement('button');
            btnLeft.className = 'action-btn small';
            btnLeft.textContent = '◀';
            btnLeft.title = 'Mover izquierda';
            btnLeft.onclick = () => {
                if (currentIndex > 0) moveTask(t.id, cols[currentIndex-1]);
            };

            const btnRight = document.createElement('button');
            btnRight.className = 'action-btn small';
            btnRight.textContent = '▶';
            btnRight.title = 'Mover derecha';
            btnRight.onclick = () => {
                if (currentIndex < cols.length-1) moveTask(t.id, cols[currentIndex+1]);
            };

            const btnEdit = document.createElement('button');
            btnEdit.className = 'action-btn small';
            btnEdit.textContent = 'Editar';
            btnEdit.onclick = () => editTask(t.id);

            const del = document.createElement('button');
            del.className = 'btn-delete';
            del.textContent = 'Eliminar';
            del.onclick = () => removeTask(t.id);

            // Append in logical order
            actions.appendChild(btnLeft);
            actions.appendChild(btnRight);
            actions.appendChild(btnEdit);
            actions.appendChild(del);
            card.appendChild(actions);
            container.appendChild(card);
        });
    });
}

function moveTask(id, toColumn) {
    if (!['todo','doing','done'].includes(toColumn)) return;
    let moved = null;
    Object.keys(tasks).forEach((k) => {
        const idx = tasks[k].findIndex((t) => t.id === id);
        if (idx !== -1) {
            moved = tasks[k].splice(idx,1)[0];
        }
    });
    if (moved) {
        tasks[toColumn].unshift(moved);
        saveTasks();
        renderTasks();
        showToast('Tarea movida', 'success');
    }
}

function editTask(id) {
    // Simple prompt-based edit
    let found = null;
    Object.keys(tasks).forEach((k) => {
        const t = tasks[k].find((x) => x.id === id);
        if (t) found = t;
    });
    if (!found) return;
    const nuevo = prompt('Editar tarea:', found.text);
    if (nuevo === null) return; // cancel
    const text = nuevo.trim();
    if (!text) return showToast('Texto vacío. No se actualizó.', 'warn');
    found.text = text;
    saveTasks();
    renderTasks();
    showToast('Tarea actualizada', 'success');
}

// Export / Import and clear
function exportTasks() {
    try {
        const data = JSON.stringify(tasks, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mini-trello-tasks.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast('Exportado JSON', 'success');
    } catch (e) {
        console.error(e);
        showToast('Error exportando', 'warn');
    }
}

function triggerImport() {
    const input = document.getElementById('import-file');
    if (input) input.click();
}

function handleImport(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const parsed = JSON.parse(reader.result);
            if (parsed && typeof parsed === 'object') {
                // basic validation
                tasks = {
                    todo: Array.isArray(parsed.todo)? parsed.todo: [],
                    doing: Array.isArray(parsed.doing)? parsed.doing: [],
                    done: Array.isArray(parsed.done)? parsed.done: []
                };
                saveTasks();
                renderTasks();
                showToast('Importado correctamente', 'success');
            } else {
                showToast('Formato inválido', 'warn');
            }
        } catch (err) {
            console.error(err);
            showToast('Error leyendo el archivo', 'warn');
        }
    };
    reader.readAsText(f);
    // reset input so same file can be re-imported later
    e.target.value = '';
}

function clearAllTasks() {
    if (!confirm('¿Borrar todas las tareas? Esta acción no se puede deshacer.')) return;
    tasks = { todo: [], doing: [], done: [] };
    saveTasks();
    renderTasks();
    showToast('Todas las tareas eliminadas', 'warn');
}

function removeTask(id) {
    let changed = false;
    Object.keys(tasks).forEach((k) => {
        const idx = tasks[k].findIndex((t) => t.id === id);
        if (idx !== -1) {
            tasks[k].splice(idx, 1);
            changed = true;
        }
    });
    if (changed) {
        saveTasks();
        renderTasks();
        showToast('Tarea eliminada', 'warn');
    }
}

function login() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value;
    const chk = document.getElementById('privacy-policy').checked;
    const err = document.getElementById('error-msg');
    err.textContent = '';
    if (!chk) {
        err.textContent = 'Debe aceptar la política de privacidad.';
        return;
    }
    const users = getUsers() || {};
    if (users[user] && users[user] === pass) {
        currentUser = user;
        sessionStorage.setItem('mini-trello-current-user', currentUser);
        updateCurrentUserUI();
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');
        err.textContent = '';
        document.getElementById('new-task').focus();
        loadTasks();
    } else {
        err.textContent = 'Usuario o contraseña incorrecta.';
    }
}

function logout() {
    currentUser = null;
    sessionStorage.removeItem('mini-trello-current-user');
    updateCurrentUserUI();
    document.getElementById('app-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
}

function addTask() {
    const input = document.getElementById('new-task');
    const text = input.value.trim();
    if (!text) return;

    const newTask = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        text: text,
        createdAt: Date.now()
    };

    tasks.todo.unshift(newTask);
    saveTasks();
    renderTasks();

    input.value = '';
    input.focus();
    showToast('Tarea agregada', 'success');
}

// Inicialización: soporte Enter y carga inmediata (si está ya en la vista)
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('new-task');
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') addTask();
        });
    }
    // Inicializar usuarios por defecto
    initUsers();

    // Auto-login si hay usuario en session
    const su = sessionStorage.getItem('mini-trello-current-user');
    if (su) {
        currentUser = su;
        updateCurrentUserUI();
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');
        document.getElementById('new-task').focus();
    }

    // Cargar tareas
    loadTasks();
});

