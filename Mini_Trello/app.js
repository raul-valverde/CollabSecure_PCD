const AUTH_USER = 'admin';
const AUTH_PASS = '1234';
const STORAGE_KEY = 'mini_trello_tasks_v1';

function el(id){return document.getElementById(id)}

function login(){
    const u = el('username').value.trim();
    const p = el('password').value;
    const ok = el('privacy-policy').checked;
    const err = el('error-msg');
    err.textContent = '';
    if(!ok){ err.textContent = 'Debe aceptar la política de privacidad.'; return }
    if(u === AUTH_USER && p === AUTH_PASS){
        el('login-screen').classList.add('hidden');
        el('app-screen').classList.remove('hidden');
        initApp();
    } else {
        err.textContent = 'Credenciales incorrectas. Revise usuario y contraseña.';
    }
}

function logout(){
    el('app-screen').classList.add('hidden');
    el('login-screen').classList.remove('hidden');
    el('password').value = '';
}

function newId(){return Date.now().toString(36) + Math.random().toString(36).slice(2,7)}

function loadTasks(){
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return {todo:[], doing:[], done:[]};
    try { return JSON.parse(raw) } catch(e){ return {todo:[], doing:[], done:[]} }
}

function saveTasks(state){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function initApp(){
    el('new-task').value = '';
    el('new-task').removeAttribute('disabled');
    el('new-task').placeholder = 'Ej: Redactar informe final...';
    el('list-todo').innerHTML = '';
    el('list-doing').innerHTML = '';
    el('list-done').innerHTML = '';
    const tasks = loadTasks();
    if(tasks.todo.length===0 && tasks.doing.length===0 && tasks.done.length===0){
        tasks.todo.push({id:newId(), title:'Planificar la presentación', created:Date.now()});
        tasks.todo.push({id:newId(), title:'Revisar requisitos del cliente', created:Date.now()});
        tasks.doing.push({id:newId(), title:'Desarrollo del prototipo', created:Date.now()});
        saveTasks(tasks);
    }
    renderTasks(tasks);
    setupDropZones();
}

function renderTasks(state){
    const map = {todo:'list-todo', doing:'list-doing', done:'list-done'};
    Object.keys(map).forEach(k=>{
        const container = el(map[k]);
        container.innerHTML = '';
        state[k].forEach(t=>{
            const card = document.createElement('div');
            card.className = 'task-card';
            card.draggable = true;
            card.dataset.id = t.id;
            card.dataset.col = k;
            const title = document.createElement('div');
            title.className = 'task-title';
            title.textContent = t.title;
            const meta = document.createElement('div');
            meta.className = 'task-meta';
            const date = new Date(t.created);
            meta.textContent = date.toLocaleString();
            const actions = document.createElement('div');
            actions.style.display = 'flex';
            actions.style.gap = '8px';
            const del = document.createElement('button');
            del.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:6px;">
                    <path d="M3 6h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M8 6v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                Eliminar`;
            del.style.background='#ef4444'; del.style.color='white'; del.style.padding='6px 8px'; del.style.borderRadius='8px'; del.onclick = ()=>{ removeTask(t.id); };
            actions.appendChild(del);
            card.appendChild(title);
            card.appendChild(meta);
            card.appendChild(actions);
            card.addEventListener('dragstart', onDragStart);
            container.appendChild(card);
        })
    })
}

function addTask(){
    const val = el('new-task').value.trim();
    if(!val) return;
    const state = loadTasks();
    state.todo.unshift({id:newId(), title:val, created:Date.now()});
    saveTasks(state);
    renderTasks(state);
    el('new-task').value = '';
}

function removeTask(id){
    const state = loadTasks();
    ['todo','doing','done'].forEach(k=>{ state[k] = state[k].filter(t=>t.id !== id) });
    saveTasks(state);
    renderTasks(state);
}

function onDragStart(e){
    e.dataTransfer.setData('text/plain', e.target.dataset.id);
}

function setupDropZones(){
    ['list-todo','list-doing','list-done'].forEach(zoneId=>{
        const zone = el(zoneId);
        zone.addEventListener('dragover', e=>{ e.preventDefault(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', e=>{ zone.classList.remove('drag-over'); });
        zone.addEventListener('drop', e=>{
            e.preventDefault(); zone.classList.remove('drag-over');
            const id = e.dataTransfer.getData('text/plain');
            if(!id) return;
            moveTaskToColumn(id, zoneId);
        })
    })
}

function moveTaskToColumn(id, zoneId){
    const colMap = { 'list-todo':'todo', 'list-doing':'doing', 'list-done':'done' };
    const targetCol = colMap[zoneId];
    const state = loadTasks();
    let moved = null;
    ['todo','doing','done'].forEach(k=>{
        const idx = state[k].findIndex(t=>t.id===id);
        if(idx>-1){ moved = state[k].splice(idx,1)[0]; }
    });
    if(moved){ state[targetCol].unshift(moved); saveTasks(state); renderTasks(state); }
}

document.addEventListener('DOMContentLoaded', ()=>{
    if(el('app-screen') && !el('app-screen').classList.contains('hidden')) initApp();
    const addBtn = document.querySelector('.btn-add');
    if(addBtn) addBtn.addEventListener('click', addTask);
    el('new-task').addEventListener('keyup', e=>{ if(e.key==='Enter') addTask(); });
    // theme toggle removed per design: no dark mode
});
/* ==========================================
   MINI TRELLO - LÓGICA DE LA APLICACIÓN
   Autor: Equipo 5
   Descripción: Gestión de tareas con validación y LocalStorage.
   ========================================== */

// ESTADO GLOBAL
// Cargamos las tareas guardadas en el navegador o iniciamos un array vacío.
// JSON.parse convierte el texto guardado de nuevo a un objeto JavaScript.
let tasks = JSON.parse(localStorage.getItem('myTasks')) || [];

/* -----------------------------------------------------
   MÓDULO DE SEGURIDAD Y AUTENTICACIÓN
   ----------------------------------------------------- */

/**
 * Función login()
 * Valida credenciales y consentimiento ético.
 */
function login() {
    // 1. Obtener valores del DOM (HTML)
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const privacyCheck = document.getElementById('privacy-policy').checked;
    const errorMsg = document.getElementById('error-msg');

    // 2. REQUISITO ÉTICO: Validar que aceptó la política
    if (!privacyCheck) {
        errorMsg.innerText = "⚠️ Error: Debe aceptar la política de privacidad para continuar.";
        return; // Detiene la ejecución
    }

    // 3. REQUISITO DE SEGURIDAD: Validación de credenciales
    // Nota: En un entorno real, esto se validaría contra una base de datos encriptada.
    if (user === "admin" && pass === "1234") {
        // Credenciales correctas: Ocultar login, mostrar app
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');
        errorMsg.innerText = "";
        
        // Cargar las tareas existentes
        renderTasks(); 
    } else {
        // Credenciales incorrectas
        errorMsg.innerText = "❌ Usuario o contraseña incorrectos.";
    }
}

/**
 * Función logout()
 * Cierra la sesión recargando la página.
 */
function logout() {
    location.reload(); 
}

/* -----------------------------------------------------
   MÓDULO DE GESTIÓN DE TAREAS (CRUD)
   ----------------------------------------------------- */

/**
 * Función addTask()
 * Crea una nueva tarea y la guarda.
 */
function addTask() {
    const taskInput = document.getElementById('new-task');
    const text = taskInput.value.trim(); // .trim() elimina espacios vacíos al inicio/final

    // Validación básica: No permitir tareas vacías
    if (text === '') {
        alert("Por favor, escribe el nombre de la tarea.");
        return;
    }

    // Objeto Tarea
    const newTask = {
        id: Date.now(), // Usamos la fecha como ID único
        text: text,
        status: 'todo'  // Estado inicial: 'todo' (Pendiente)
    };

    // Agregar al array y guardar
    tasks.push(newTask);
    saveAndRender();
    
    // Limpiar el campo de texto
    taskInput.value = '';
}

/**
 * Función moveTask(id, newStatus)
 * Cambia el estado de una tarea (Mueve la tarjeta de columna).
 */
function moveTask(id, newStatus) {
    // Buscar el índice de la tarea por su ID
    const taskIndex = tasks.findIndex(task => task.id === id);
    
    if (taskIndex !== -1) {
        tasks[taskIndex].status = newStatus; // Actualizar estado
        saveAndRender(); // Guardar cambios
    }
}

/**
 * Función deleteTask(id)
 * Elimina una tarea permanentemente.
 */
function deleteTask(id) {
    if(confirm("¿Estás seguro de borrar esta tarea?")) {
        // Filtrar el array para dejar fuera la tarea con ese ID
        tasks = tasks.filter(task => task.id !== id);
        saveAndRender();
    }
}

/* -----------------------------------------------------
   MÓDULO DE PERSISTENCIA Y RENDERIZADO
   ----------------------------------------------------- */

/**
 * Función saveAndRender()
 * Guarda en LocalStorage y redibuja la pantalla.
 */
function saveAndRender() {
    // Guardar en el navegador (Persistencia de datos)
    localStorage.setItem('myTasks', JSON.stringify(tasks));
    renderTasks();
}

/**
 * Función renderTasks()
 * Convierte el array de tareas en elementos HTML visibles.
 */
function renderTasks() {
    // 1. Limpiar las columnas antes de redibujar
    document.getElementById('list-todo').innerHTML = '';
    document.getElementById('list-doing').innerHTML = '';
    document.getElementById('list-done').innerHTML = '';

    // 2. Recorrer cada tarea y crear su tarjeta HTML
    tasks.forEach(task => {
        const card = document.createElement('div');
        card.className = 'task-card';
        
        // Generar botones dinámicamente según el estado de la tarea
        let actionButtons = '';
        
        if (task.status === 'todo') {
            // Si está pendiente -> Botón para iniciar
            actionButtons = `<button onclick="moveTask(${task.id}, 'doing')" style="background:#ffc107; color:black;">Iniciar ▶️</button>`;
        } else if (task.status === 'doing') {
            // Si está en proceso -> Botones para devolver o terminar
            actionButtons = `
                <button onclick="moveTask(${task.id}, 'todo')" style="background:#6c757d;">⏮️</button>
                <button onclick="moveTask(${task.id}, 'done')" style="background:#28a745;">Terminar ✅</button>
            `;
        } else {
            // Si está terminada -> Botón para borrar
            actionButtons = `<button onclick="deleteTask(${task.id})" style="background:#dc3545;">Eliminar 🗑️</button>`;
        }

        // Insertar HTML dentro de la tarjeta
        card.innerHTML = `
            <p style="margin: 0 0 10px 0;">${task.text}</p>
            <div style="display: flex; gap: 5px; justify-content: flex-end;">
                ${actionButtons}
            </div>
        `;

        // 3. Insertar la tarjeta en la columna correspondiente del DOM
        const columnId = `list-${task.status}`;
        document.getElementById(columnId).appendChild(card);
    });
}