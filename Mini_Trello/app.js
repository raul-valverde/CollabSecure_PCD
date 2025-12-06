/* ==========================================
   MINI TRELLO - LÓGICA DE LA APLICACIÓN
   ========================================== */

// 1. CONFIGURACIÓN Y CONSTANTES
const AUTH_USER = 'admin';
const AUTH_PASS = '1234';
const STORAGE_KEY = 'mini_trello_data_v3'; // Clave para guardar en el navegador (actualizada para nueva estructura)

// Utilidad rápida para seleccionar elementos por ID
function el(id) { return document.getElementById(id); }

// Generador de ID único
function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

// Buscar tarea por id: devuelve { task, col, index }
function findTaskById(id) {
    const state = loadTasks();
    const cols = ['pendientes','enproceso','enrevision','hecho'];
    for (let col of cols) {
        const idx = state[col].findIndex(t => t.id === id);
        if (idx !== -1) return { task: state[col][idx], col, index: idx };
    }
    return null;
}


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
    // Si no hay datos, devolvemos la estructura vacía base (4 columnas)
    if (!raw) return { pendientes: [], enproceso: [], enrevision: [], hecho: [] };
    
    try {
        const parsed = JSON.parse(raw);
        // Asegurar compatibilidad: cada tarea tiene comments array
        ['pendientes','enproceso','enrevision','hecho'].forEach(col => {
            if (!Array.isArray(parsed[col])) parsed[col] = [];
            parsed[col].forEach(t => { if (!Array.isArray(t.comments)) t.comments = []; });
        });
        return parsed;
    } catch (e) {
        return { pendientes: [], enproceso: [], enrevision: [], hecho: [] };
    }
}

// Normalización y filtros de texto
function normalizeText(s){
    return (s||'').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[\u0300-\u036f]/g,'');
}

const forbiddenWords = [
    'mierda','puta','pendejo','puto','imbecil','idiota'
];
const informalWords = [
    'xd','jaja','jajaja','lol','nah','q', 'q\''
];

function containsListWords(text, list){
    const t = normalizeText(text);
    return list.some(w => t.includes(w));
}

function validateFormalText(text){
    if (!text || !text.trim()) return { ok:false, reason:'empty' };
    if (containsListWords(text, forbiddenWords)) return { ok:false, reason:'forbidden' };
    if (containsListWords(text, informalWords)) return { ok:false, reason:'informal' };
    return { ok:true };
}

// Actualizar fecha de tarea (dateString en formato yyyy-mm-dd)
function updateTaskDate(taskId, dateString){
    const state = loadTasks();
    const cols = ['pendientes','enproceso','enrevision','hecho'];
    for (let col of cols){
        const idx = state[col].findIndex(t=>t.id===taskId);
        if (idx!==-1){
            const d = new Date(dateString);
            if (isNaN(d.getTime())) return;
            // Mantener la hora actual al fijar la fecha
            const now = new Date();
            d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
            state[col][idx].created = d.getTime();
            saveTasks(state);
            renderTasks(state);
            return;
        }
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
    // No crear tareas de ejemplo automáticamente — dejar el tablero vacío
    renderTasks(tasks);
}

// Función que dibuja las tareas en el HTML
function renderTasks(state) {
    // Mapeo entre las claves de los datos y los IDs del HTML
    const map = { pendientes: 'list-pendientes', enproceso: 'list-enproceso', enrevision: 'list-enrevision', hecho: 'list-hecho' };

    Object.keys(map).forEach(key => {
        const listId = map[key];
        const container = el(listId);
        container.innerHTML = ''; // Limpiar lista actual

        state[key].forEach((task, idx) => {
            // Crear tarjeta
            const card = document.createElement('div');
            card.className = 'task-card';
            card.draggable = true;
            card.dataset.id = task.id;
            card.dataset.col = key;
            card.dataset.index = idx;
            
            // Contenido de la tarjeta
            const date = new Date(task.created).toLocaleDateString();
            
            // Añadimos un panel de detalles con comentarios y control de fecha
            const dateIso = new Date(task.created).toISOString().slice(0,10);
            card.innerHTML = `
                <div class="task-title" style="font-weight:bold; margin-bottom:5px;">${task.title}</div>
                <div class="task-meta" style="font-size:0.8em; color:gray; display:flex; justify-content:space-between; align-items:center;">
                    <span>📅 ${date}</span>
                    <div>
                        <button class="btn-details" style="background:none; border:none; cursor:pointer; font-size:0.9em; margin-right:8px;">Detalles</button>
                        <button class="btn-delete" style="background:none; border:none; cursor:pointer; font-size:1.2em;" title="Eliminar">🗑️</button>
                    </div>
                </div>
                <div class="task-details" style="display:none; margin-top:8px;">
                    <label style="font-size:0.85em;color:var(--muted);">Fecha:</label>
                    <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center;">
                        <input type="date" class="date-input" value="${dateIso}" style="padding:8px;border-radius:8px;border:1px solid rgba(0,0,0,0.06);">
                        <button class="btn-save-date" style="padding:8px;border-radius:8px;">Guardar fecha</button>
                    </div>
                    <div class="comment-list" style="display:flex;flex-direction:column;gap:6px; margin-bottom:8px; max-height:140px; overflow:auto;">
                    </div>
                    <div style="display:flex;gap:8px;">
                        <input class="comment-input" type="text" placeholder="Añadir especificación..." style="flex:1; padding:8px; border-radius:8px; border:1px solid rgba(0,0,0,0.06);">
                        <button class="btn-add-comment" style="padding:8px 10px; border-radius:8px;">Añadir</button>
                    </div>
                </div>
            `;

            // Agregar evento al botón de eliminar dentro de esta tarjeta
            const deleteBtn = card.querySelector('.btn-delete');
            deleteBtn.onclick = function() {
                if(confirm('¿Borrar esta tarea?')) {
                    removeTask(task.id);
                }
            };

            // Detalles / comentarios
            const detailsBtn = card.querySelector('.btn-details');
            const detailsPanel = card.querySelector('.task-details');
            const commentListEl = card.querySelector('.comment-list');
            const commentInput = card.querySelector('.comment-input');
            const addCommentBtn = card.querySelector('.btn-add-comment');

            // Rellenar lista de comentarios
            function renderComments() {
                commentListEl.innerHTML = '';
                (task.comments || []).forEach(c => {
                    const ce = document.createElement('div');
                    ce.className = 'comment';
                    ce.style = 'background:rgba(15,23,36,0.03); padding:6px 8px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;';
                    ce.innerHTML = `<span style="font-size:0.85em;color:var(--text);">${c.text}</span><button class=\"btn-del-comment\" style=\"background:none;border:none;cursor:pointer;margin-left:8px;\">✖</button>`;
                    const del = ce.querySelector('.btn-del-comment');
                    del.onclick = () => { removeComment(task.id, c.id); };
                    commentListEl.appendChild(ce);
                });
            }

            renderComments();

            detailsBtn.onclick = () => {
                const visible = detailsPanel.style.display !== 'none';
                detailsPanel.style.display = visible ? 'none' : 'block';
            };

            const dateInput = card.querySelector('.date-input');
            const saveDateBtn = card.querySelector('.btn-save-date');
            saveDateBtn.onclick = () => {
                const ds = dateInput.value;
                if (!ds) return alert('Fecha inválida');
                updateTaskDate(task.id, ds);
            };

            addCommentBtn.onclick = () => {
                const v = commentInput.value.trim();
                if (!v) return;
                const valid = validateFormalText(v);
                if (!valid.ok){
                    if (valid.reason === 'forbidden') return alert('Comentario contiene palabras no permitidas.');
                    if (valid.reason === 'informal') return alert('Por favor mantén un lenguaje formal en los comentarios.');
                    return alert('Texto inválido');
                }
                addComment(task.id, v);
                commentInput.value = '';
            };

            // Evento para iniciar el arrastre
            card.addEventListener('dragstart', onDragStart);

            container.appendChild(card);
        });
    });
}

// Añadir comentario a una tarea
function addComment(taskId, text) {
    const check = validateFormalText(text);
    if (!check.ok) {
        if (check.reason === 'forbidden') return alert('El comentario contiene palabras no permitidas.');
        if (check.reason === 'informal') return alert('Por favor mantén un lenguaje formal en los comentarios.');
        return alert('Comentario inválido.');
    }

    const state = loadTasks();
    const cols = ['pendientes','enproceso','enrevision','hecho'];
    for (let col of cols) {
        const idx = state[col].findIndex(t => t.id === taskId);
        if (idx !== -1) {
            const comment = { id: newId(), text, created: Date.now() };
            state[col][idx].comments = state[col][idx].comments || [];
            state[col][idx].comments.push(comment);
            saveTasks(state);
            renderTasks(state);
            return;
        }
    }
}

function removeComment(taskId, commentId) {
    const state = loadTasks();
    const cols = ['pendientes','enproceso','enrevision','hecho'];
    for (let col of cols) {
        const t = state[col].find(t => t.id === taskId);
        if (t) {
            t.comments = (t.comments || []).filter(c => c.id !== commentId);
            saveTasks(state);
            renderTasks(state);
            return;
        }
    }
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

    const check = validateFormalText(val);
    if (!check.ok) {
        if (check.reason === 'forbidden') return alert('El título contiene palabras no permitidas.');
        if (check.reason === 'informal') return alert('Por favor usa un lenguaje formal en los títulos.');
        return alert('Título inválido.');
    }

    const state = loadTasks();
    // Agregamos siempre a la columna 'pendientes' (incluyendo array comments)
    state.pendientes.unshift({ id: newId(), title: val, created: Date.now(), comments: [] });
    
    saveTasks(state);
    renderTasks(state);
    input.value = ''; // Limpiar input
    input.focus();
}

function removeTask(id) {
    const state = loadTasks();
    // Buscamos en las 3 columnas y filtramos para quitar la tarea
    ['pendientes', 'enproceso', 'enrevision', 'hecho'].forEach(col => {
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
    const card = e.target.closest('.task-card');
    if (!card) return;
    const payload = { id: card.dataset.id, col: card.dataset.col, index: Number(card.dataset.index) };
    try {
        e.dataTransfer.setData('text/task', JSON.stringify(payload));
    } catch(err){
        e.dataTransfer.setData('text/plain', payload.id);
    }
    e.dataTransfer.effectAllowed = "move";
}

function setupDropZones() {
    const zones = ['list-pendientes', 'list-enproceso', 'list-enrevision', 'list-hecho'];

    zones.forEach(id => {
        const zone = el(id);
        // Helper para manejo de drop (reutilizable desde zone o su contenedor)
        const handleDropOnZone = (e, zoneElement) => {
            e.preventDefault();
            zoneElement.parentElement.style.background = '';

            // Intentar obtener payload con información de origen
            let payload = null;
            try { payload = JSON.parse(e.dataTransfer.getData('text/task') || null); } catch(_) { payload = null; }
            const taskId = (payload && payload.id) || e.dataTransfer.getData('text/plain');
            const sourceCol = payload && payload.col;
            const sourceIndex = payload && (typeof payload.index === 'number' ? payload.index : undefined);

            if (taskId) {
                // Determinar índice de inserción según elemento de referencia dentro de la zona
                // Buscar la tarjeta objetivo que esté dentro de la zona
                let refCard = e.target.closest('.task-card');
                if (refCard && refCard.parentElement !== zoneElement) refCard = null;

                let insertIndex = 0;
                if (refCard) {
                    const rect = refCard.getBoundingClientRect();
                    const after = (e.clientY > (rect.top + rect.height/2));
                    const children = Array.from(zoneElement.children);
                    const refIndex = children.indexOf(refCard);
                    insertIndex = after ? refIndex + 1 : refIndex;
                } else {
                    // Si no hay referencia dentro de esta zona, añadir al final
                    insertIndex = zoneElement.children.length;
                }

                moveTaskToColumn(taskId, id, insertIndex, sourceCol, sourceIndex);
            }
        };

        // Cuando una tarea pasa por encima (en la lista)
        zone.addEventListener('dragover', e => {
            e.preventDefault(); // Necesario para permitir soltar
            zone.parentElement.style.background = '#f0f0f0'; // Efecto visual (opcional)
        });

        // Cuando la tarea sale de la zona
        zone.addEventListener('dragleave', e => {
            zone.parentElement.style.background = ''; // Quitar efecto visual
        });

        // Cuando soltamos la tarea dentro de la lista
        zone.addEventListener('drop', e => handleDropOnZone(e, zone));

        // También permitir soltar sobre el contenedor de la columna (por si el usuario apunta al header o espacio)
        const columnEl = zone.parentElement;
        if (columnEl) {
            columnEl.addEventListener('dragover', e => { e.preventDefault(); columnEl.style.background = '#f0f0f0'; });
            columnEl.addEventListener('dragleave', e => { columnEl.style.background = ''; });
            columnEl.addEventListener('drop', e => {
                // redirigir el drop hacia la zona (task-list)
                columnEl.style.background = '';
                handleDropOnZone(e, zone);
            });
        }
    });
}

function moveTaskToColumn(taskId, targetZoneId, targetIndex, sourceCol, sourceIndex) {
    // Mapeo inverso: del ID del HTML a la clave del dato
    const map = { 'list-pendientes': 'pendientes', 'list-enproceso': 'enproceso', 'list-enrevision': 'enrevision', 'list-hecho': 'hecho' };
    const targetCol = map[targetZoneId];
    
    const state = loadTasks();
    let taskToMove = null;
    // 1. Encontrar y sacar la tarea de su columna original
    let found = false;
    for (let col of ['pendientes', 'enproceso', 'enrevision', 'hecho']) {
        const index = state[col].findIndex(t => t.id === taskId);
        if (index !== -1) {
            taskToMove = state[col].splice(index, 1)[0]; // Sacar del array
            // Si el origen fue informado y es el mismo que el destino, y su índice original es menor que
            // el índice de inserción, reduce targetIndex en 1 porque la extracción desplazó índices.
            if (sourceCol === col && typeof sourceIndex === 'number' && typeof targetIndex === 'number' && sourceIndex < targetIndex) {
                targetIndex = Math.max(0, targetIndex - 1);
            }
            found = true;
            break;
        }
    }

    // 2. Ponerla en la nueva columna en la posición indicada
    if (taskToMove) {
        if (!Array.isArray(state[targetCol])) state[targetCol] = [];
        if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= state[targetCol].length) {
            state[targetCol].splice(targetIndex, 0, taskToMove);
        } else {
            state[targetCol].unshift(taskToMove);
        }
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
