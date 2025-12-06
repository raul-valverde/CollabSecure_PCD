/* ==========================================
   MINI TRELLO - LÓGICA DE LA APLICACIÓN
   ========================================== */

// 1. CONFIGURACIÓN Y CONSTANTES
const AUTH_USER = 'admin';
const AUTH_PASS = '1234';
const STORAGE_KEY = 'mini_trello_data_v2'; // Clave para guardar en el navegador

// Utilidad rápida para seleccionar elementos por ID
function el(id) { return document.getElementById(id); }

// Generador de ID único
function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }


/* ==========================================
   2. MÓDULO DE AUTENTICACIÓN
   ========================================== */

function login() {
    const u = el('username').value.trim();
    const p = el('password').value;
    const ok = el('privacy-policy').checked;
    const err = el('error-msg');

    err.textContent = ''; // Limpiar errores previos

    // Validación Ética / Política
    if (!ok) {
        err.textContent = '⚠️ Debe aceptar la política de privacidad.';
        return;
    }

    // Validación de Credenciales
    if (u === AUTH_USER && p === AUTH_PASS) {
        el('login-screen').classList.add('hidden');
        el('app-screen').classList.remove('hidden');
        initApp(); // Iniciar la app solo si el login es exitoso
    } else {
        err.textContent = '❌ Credenciales incorrectas.';
    }
}

function logout() {
    // Ocultar app, mostrar login y limpiar campos
    el('app-screen').classList.add('hidden');
    el('login-screen').classList.remove('hidden');
    el('password').value = '';
    el('username').value = '';
    el('error-msg').textContent = '';
}


/* ==========================================
   3. GESTIÓN DE DATOS (STORAGE)
   ========================================== */

function loadTasks() {
    const raw = localStorage.getItem(STORAGE_KEY);
    // Si no hay datos, devolvemos la estructura vacía base
    if (!raw) return { todo: [], doing: [], done: [] };
    
    try {
        return JSON.parse(raw);
    } catch (e) {
        return { todo: [], doing: [], done: [] };
    }
}

function saveTasks(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}


/* ==========================================
   4. LÓGICA PRINCIPAL Y RENDERIZADO
   ========================================== */

function initApp() {
    const input = el('new-task');
    input.value = '';
    
    // Configurar zonas de arrastre
    setupDropZones();

    // Cargar y mostrar tareas
    const tasks = loadTasks();

    // Si es la primera vez que se usa, creamos tareas de ejemplo
    if (tasks.todo.length === 0 && tasks.doing.length === 0 && tasks.done.length === 0) {
        tasks.todo.push({ id: newId(), title: 'Planificar la presentación', created: Date.now() });
        tasks.todo.push({ id: newId(), title: 'Investigar diseño UX', created: Date.now() });
        tasks.doing.push({ id: newId(), title: 'Desarrollar prototipo', created: Date.now() });
        saveTasks(tasks);
    }

    renderTasks(tasks);
}

// Función que dibuja las tareas en el HTML
function renderTasks(state) {
    // Mapeo entre las claves de los datos y los IDs del HTML
    const map = { todo: 'list-todo', doing: 'list-doing', done: 'list-done' };

    Object.keys(map).forEach(key => {
        const listId = map[key];
        const container = el(listId);
        container.innerHTML = ''; // Limpiar lista actual

        state[key].forEach(task => {
            // Crear tarjeta
            const card = document.createElement('div');
            card.className = 'task-card'; // Clase definida en tu CSS (asumido)
            card.draggable = true;        // Hace que sea arrastrable
            card.dataset.id = task.id;    // Guardamos el ID en el elemento
            
            // Contenido de la tarjeta
            // Nota: Usamos una estructura simple para que el CSS funcione bien
            const date = new Date(task.created).toLocaleDateString();
            
            card.innerHTML = `
                <div class="task-title" style="font-weight:bold; margin-bottom:5px;">${task.title}</div>
                <div class="task-meta" style="font-size:0.8em; color:gray; display:flex; justify-content:space-between; align-items:center;">
                    <span>📅 ${date}</span>
                    <button class="btn-delete" style="background:none; border:none; cursor:pointer; font-size:1.2em;" title="Eliminar">🗑️</button>
                </div>
            `;

            // Agregar evento al botón de eliminar dentro de esta tarjeta
            const deleteBtn = card.querySelector('.btn-delete');
            deleteBtn.onclick = function() {
                if(confirm('¿Borrar esta tarea?')) {
                    removeTask(task.id);
                }
            };

            // Evento para iniciar el arrastre
            card.addEventListener('dragstart', onDragStart);

            container.appendChild(card);
        });
    });
}


/* ==========================================
   5. ACCIONES (AGREGAR / ELIMINAR)
   ========================================== */

function addTask() {
    const input = el('new-task');
    const val = input.value.trim();
    
    if (!val) {
        alert("Escribe algo primero");
        return;
    }

    const state = loadTasks();
    // Agregamos siempre a la columna 'todo' (Por hacer)
    state.todo.unshift({ id: newId(), title: val, created: Date.now() });
    
    saveTasks(state);
    renderTasks(state);
    input.value = ''; // Limpiar input
    input.focus();
}

function removeTask(id) {
    const state = loadTasks();
    // Buscamos en las 3 columnas y filtramos para quitar la tarea
    ['todo', 'doing', 'done'].forEach(col => {
        state[col] = state[col].filter(t => t.id !== id);
    });
    saveTasks(state);
    renderTasks(state);
}


/* ==========================================
   6. SISTEMA DE ARRASTRAR Y SOLTAR (DRAG & DROP)
   ========================================== */

function onDragStart(e) {
    // Guardamos el ID de la tarea que estamos arrastrando
    e.dataTransfer.setData('text/plain', e.target.dataset.id);
    e.dataTransfer.effectAllowed = "move";
}

function setupDropZones() {
    const zones = ['list-todo', 'list-doing', 'list-done'];
    
    zones.forEach(id => {
        const zone = el(id);

        // Cuando una tarea pasa por encima
        zone.addEventListener('dragover', e => {
            e.preventDefault(); // Necesario para permitir soltar
            zone.parentElement.style.background = '#f0f0f0'; // Efecto visual (opcional)
        });

        // Cuando la tarea sale de la zona
        zone.addEventListener('dragleave', e => {
            zone.parentElement.style.background = ''; // Quitar efecto visual
        });

        // Cuando soltamos la tarea
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.parentElement.style.background = '';
            
            const taskId = e.dataTransfer.getData('text/plain');
            if (taskId) {
                moveTaskToColumn(taskId, id);
            }
        });
    });
}

function moveTaskToColumn(taskId, targetZoneId) {
    // Mapeo inverso: del ID del HTML a la clave del dato
    const map = { 'list-todo': 'todo', 'list-doing': 'doing', 'list-done': 'done' };
    const targetCol = map[targetZoneId];
    
    const state = loadTasks();
    let taskToMove = null;

    // 1. Encontrar y sacar la tarea de su columna original
    ['todo', 'doing', 'done'].forEach(col => {
        const index = state[col].findIndex(t => t.id === taskId);
        if (index !== -1) {
            taskToMove = state[col].splice(index, 1)[0]; // Sacar del array
        }
    });

    // 2. Ponerla en la nueva columna
    if (taskToMove) {
        state[targetCol].unshift(taskToMove); // Poner al principio de la nueva lista
        saveTasks(state);
        renderTasks(state);
    }
}


/* ==========================================
   7. INICIALIZACIÓN GLOBAL
   ========================================== */

// Detectar tecla Enter en el input
document.addEventListener('DOMContentLoaded', () => {
    const input = el('new-task');
    if(input) {
        input.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') addTask();
        });
    }
});
