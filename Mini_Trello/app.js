// Mini_Trello - app.js
// Implementación simple: Pila para prioritarios y Cola para regulares.
// Esto unifica comportamientos y evita conflictos en PR.

(function(){
  // Estructuras de datos
  const pilaPrioritario = []; // usaremos push/pop
  const colaRegular = [];     // usaremos push/shift

  // Elementos DOM
  const pedidoInput = document.getElementById('pedidoInput');
  const prioritarioChk = document.getElementById('prioritarioChk');
  const agregarBtn = document.getElementById('agregarBtn');
  const despacharBtn = document.getElementById('despacharBtn');
  const listaPrioritario = document.getElementById('listaPrioritario');
  const listaRegular = document.getElementById('listaRegular');
  const siguientePrioritario = document.getElementById('siguientePrioritario');
  const siguienteRegular = document.getElementById('siguienteRegular');

  // Helpers: renderizado
  function renderList() {
    // Prioritarios (mostrar tope primero)
    listaPrioritario.innerHTML = '';
    // Recorremos la pila desde el final (tope) hasta el principio para mostrar tope arriba
    for (let i = pilaPrioritario.length - 1; i >= 0; i--) {
      const li = document.createElement('li');
      li.textContent = pilaPrioritario[i];
      listaPrioritario.appendChild(li);
    }

    // Regulares (FIFO, mostrar primer en salir arriba)
    listaRegular.innerHTML = '';
    for (let i = 0; i < colaRegular.length; i++) {
      const li = document.createElement('li');
      li.textContent = colaRegular[i];
      listaRegular.appendChild(li);
    }

    // Actualizar indicadores de siguiente
    siguientePrioritario.textContent = pilaPrioritario.length ? pilaPrioritario[pilaPrioritario.length - 1] : '—';
    siguienteRegular.textContent = colaRegular.length ? colaRegular[0] : '—';
  }

  // Agregar pedido (solo permite agregar si prioridad marcada, o si no marcada agrega a cola)
  function agregarPedido() {
    const pedido = pedidoInput.value.trim();
    if (!pedido) {
      alert('Ingresa un número de pedido válido.');
      pedidoInput.focus();
      return;
    }

    if (prioritarioChk.checked) {
      // Pila: LIFO
      pilaPrioritario.push(pedido);
    } else {
      // Cola: FIFO
      colaRegular.push(pedido);
    }

    pedidoInput.value = '';
    prioritarioChk.checked = false;
    pedidoInput.focus();
    renderList();
  }

  // Despachar: prioritarios tienen preferencia (pila), si no hay, despacha de la cola
  function despacharPedido() {
    if (pilaPrioritario.length > 0) {
      const desp = pilaPrioritario.pop();
      alert(`Despachado PRIORITARIO: ${desp}`);
    } else if (colaRegular.length > 0) {
      const desp = colaRegular.shift();
      alert(`Despachado REGULAR: ${desp}`);
    } else {
      alert('No hay pedidos para despachar.');
    }
    renderList();
  }

  // Eventos
  agregarBtn.addEventListener('click', agregarPedido);
  despacharBtn.addEventListener('click', despacharPedido);

  // Soporte tecla Enter para agregar
  pedidoInput.addEventListener('keydown', function(e){
    if (e.key === 'Enter') {
      agregarPedido();
    }
  });

  // Inicial render
  renderList();

  // Export minimal for debugging (optional)
  window._MiniTrello = {
    pilaPrioritario,
    colaRegular,
    renderList
  };

})();
