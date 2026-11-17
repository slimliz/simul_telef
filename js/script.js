/* =============================================================
   SIMTELE-WEB · JavaScript principal
   Programación Web I — Desafío grupal (simulación educativa)
   Módulos:
     1) Detención de emergencia
     2) Mantenimiento de componentes
     3) Viento y oscilación
     4) Sensores
   ============================================================= */

/* =============================================================
   1. UTILIDADES GENERALES
   ============================================================= */

// Muestra un mensaje dentro de un contenedor, con color según el tipo
// tipo: 'info' | 'ok' | 'alerta' | 'error'
function mostrarMensaje(idContenedor, texto, tipo) {
  const contenedor = document.getElementById(idContenedor);
  if (!contenedor) return;
  contenedor.textContent = texto;
  contenedor.className = 'mensaje ' + (tipo || 'info');
}

// Convierte texto a número y rechaza vacíos y valores no numéricos
function convertirNumero(texto) {
  if (typeof texto !== 'string') return NaN;
  const limpio = texto.trim();
  if (limpio === '') return NaN;                    // campo vacío
  if (!/^-?\d+(\.\d+)?$/.test(limpio)) return NaN;  // "abc", "12abc", "1,5"
  return parseFloat(limpio);
}

// Evita inyección de HTML al pintar datos del usuario en tablas
function escaparHTML(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* --- Persistencia opcional con localStorage (puntos extra) --- */
function guardarEnStorage(clave, datos) {
  try {
    localStorage.setItem(clave, JSON.stringify(datos));
  } catch (error) {
    console.warn('No se pudo guardar en localStorage:', error);
  }
}

function leerDeStorage(clave) {
  try {
    const datos = localStorage.getItem(clave);
    return datos ? JSON.parse(datos) : null;
  } catch (error) {
    return null;
  }
}


/* =============================================================
   MÓDULO 1 · DETENCIÓN DE EMERGENCIA
   Fórmula: d = (v / 3.6) × t
   ============================================================= */

const UMBRAL_1_DETENCION = 30; // metros (umbral DIDÁCTICO)
const UMBRAL_2_DETENCION = 60; // metros (umbral DIDÁCTICO)

// Calcula la distancia recorrida durante el tiempo de reacción
function calcularDistanciaReaccion(velocidadKmH, tiempoSegundos) {
  return (velocidadKmH / 3.6) * tiempoSegundos;
}

function manejarDetencion(evento) {
  evento.preventDefault(); // evita que la página se recargue

  const velocidad = convertirNumero(document.getElementById('velocidad').value);
  const tiempo = convertirNumero(document.getElementById('tiempoReaccion').value);

  // --- Validaciones ---
  if (isNaN(velocidad) || isNaN(tiempo)) {
    mostrarMensaje('resultadoDetencion',
      '❌ Error: debes ingresar números válidos (no vacíos, sin letras) en velocidad y tiempo de reacción.',
      'error');
    return;
  }
  if (velocidad < 0 || velocidad > 120) {
    mostrarMensaje('resultadoDetencion',
      '❌ Error: la velocidad debe estar entre 0 y 120 km/h.', 'error');
    return;
  }
  if (tiempo < 0 || tiempo > 10) {
    mostrarMensaje('resultadoDetencion',
      '❌ Error: el tiempo de reacción debe estar entre 0 y 10 segundos.', 'error');
    return;
  }

  // --- Cálculo ---
  const distancia = calcularDistanciaReaccion(velocidad, tiempo);

  let aviso = '';
  let tipo = 'ok';

  if (distancia < UMBRAL_1_DETENCION) {
    tipo = 'ok';
    aviso = '🟢 Situación controlada: distancia corta de reacción.';
  } else if (distancia <= UMBRAL_2_DETENCION) {
    tipo = 'alerta';
    aviso = '🟡 Precaución: la distancia supera los 30 m de simulación.';
  } else {
    tipo = 'error';
    aviso = '🔴 Alerta: distancia crítica (más de 60 m). Revisar el protocolo simulado.';
  }

  mostrarMensaje('resultadoDetencion',
    `Distancia recorrida durante la reacción: ${distancia.toFixed(2)} m. ${aviso}`,
    tipo);
}


/* =============================================================
   MÓDULO 2 · MANTENIMIENTO
   Arreglo de objetos + push + splice + tabla dinámica
   ============================================================= */

const ETIQUETAS_ESTADO = {
  normal: 'Normal',
  revision: 'Revisión',
  urgente: 'Urgente'
};

// Arreglo de objetos (se recupera de localStorage si existe)
let registrosMantenimiento = leerDeStorage('simtele_mantenimiento') || [];

// Dibuja la tabla completa en el DOM
function renderizarMantenimiento() {
  const cuerpo = document.getElementById('cuerpoMantenimiento');
  cuerpo.innerHTML = '';

  if (registrosMantenimiento.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="5" class="vacio">Sin registros todavía.</td></tr>';
  } else {
    registrosMantenimiento.forEach(function (registro, indice) {
      const fila = document.createElement('tr');
      fila.innerHTML =
        '<td>' + (indice + 1) + '</td>' +
        '<td>' + escaparHTML(registro.componente) + '</td>' +
        '<td>' + registro.horas + '</td>' +
        '<td><span class="etiqueta ' + registro.estado + '">' +
          (ETIQUETAS_ESTADO[registro.estado] || registro.estado) + '</span></td>' +
        '<td><button type="button" class="btn-eliminar" data-indice="' + indice + '">Eliminar</button></td>';
      cuerpo.appendChild(fila);
    });
  }

  document.getElementById('contadorMantenimiento').textContent =
    'Total de registros: ' + registrosMantenimiento.length;

  guardarEnStorage('simtele_mantenimiento', registrosMantenimiento);
}

// Agrega un registro nuevo
function manejarMantenimiento(evento) {
  evento.preventDefault();

  const componente = document.getElementById('componente').value.trim();
  const horas = convertirNumero(document.getElementById('horasUso').value);
  const estado = document.getElementById('estado').value;

  // --- Validaciones ---
  if (componente === '') {
    mostrarMensaje('mensajeMantenimiento',
      '❌ Error: el nombre del componente no puede estar vacío.', 'error');
    return;
  }
  if (componente.length < 3) {
    mostrarMensaje('mensajeMantenimiento',
      '❌ Error: el componente debe tener al menos 3 caracteres.', 'error');
    return;
  }
  if (isNaN(horas)) {
    mostrarMensaje('mensajeMantenimiento',
      '❌ Error: las horas de uso deben ser un valor numérico.', 'error');
    return;
  }
  if (horas < 0 || horas > 100000) {
    mostrarMensaje('mensajeMantenimiento',
      '❌ Error: las horas de uso deben estar entre 0 y 100000.', 'error');
    return;
  }

  // --- Alta en el arreglo de objetos ---
  registrosMantenimiento.push({
    componente: componente,
    horas: horas,
    estado: estado
  });

  renderizarMantenimiento();
  mostrarMensaje('mensajeMantenimiento',
    '✅ Registro agregado: ' + componente + ' (' + horas + ' h, ' +
    (ETIQUETAS_ESTADO[estado] || estado) + ').', 'ok');

  evento.target.reset();
}

// Elimina un registro usando splice
function eliminarRegistroMantenimiento(indice) {
  if (indice < 0 || indice >= registrosMantenimiento.length) return;

  registrosMantenimiento.splice(indice, 1); // eliminación real del arreglo

  renderizarMantenimiento();
  mostrarMensaje('mensajeMantenimiento', '🗑️ Registro eliminado correctamente.', 'ok');
}

// Delegación de eventos: un solo listener para todos los botones "Eliminar"
function manejarEliminarMantenimiento(evento) {
  const boton = evento.target.closest('.btn-eliminar');
  if (!boton) return;
  const indice = Number(boton.dataset.indice);
  eliminarRegistroMantenimiento(indice);
}


/* =============================================================
   MÓDULO 3 · VIENTO Y OSCILACIÓN
   Arreglo de números + forEach + promedio y máximo
   ============================================================= */

const TOTAL_MEDICIONES = 5;
let medicionesViento = [];

// Calcula promedio, máximo y clasificación descriptiva
function calcularEstadisticasViento() {
  let suma = 0;
  let maximo = medicionesViento[0];

  medicionesViento.forEach(function (medicion) {
    suma += medicion;
    if (medicion > maximo) maximo = medicion;
  });

  const promedio = suma / medicionesViento.length;

  let clasificacion = '';
  let tipo = 'info';

  if (promedio < 15) {
    clasificacion = 'Brisa suave (simulación)';
    tipo = 'ok';
  } else if (promedio < 30) {
    clasificacion = 'Viento moderado (simulación)';
    tipo = 'info';
  } else if (promedio < 45) {
    clasificacion = 'Viento fuerte: revisar oscilación (simulación)';
    tipo = 'alerta';
  } else {
    clasificacion = 'Viento muy fuerte: suspender operación simulada';
    tipo = 'error';
  }

  mostrarMensaje('resultadoViento',
    `Promedio: ${promedio.toFixed(2)} km/h · Máximo: ${maximo.toFixed(2)} km/h · ` +
    `Clasificación: ${clasificacion}`,
    tipo);
}

// Registra una medición
function manejarViento(evento) {
  evento.preventDefault();

  const valor = convertirNumero(document.getElementById('medicionViento').value);

  if (isNaN(valor)) {
    mostrarMensaje('resultadoViento',
      '❌ Error: la medición debe ser un número válido (no vacío, sin letras).', 'error');
    return;
  }
  if (valor < 0 || valor > 150) {
    mostrarMensaje('resultadoViento',
      '❌ Error: la medición debe estar entre 0 y 150 km/h.', 'error');
    return;
  }
  if (medicionesViento.length >= TOTAL_MEDICIONES) {
    mostrarMensaje('resultadoViento',
      '⚠️ Ya registraste las 5 mediciones. Usa "Reiniciar mediciones" para empezar de nuevo.',
      'alerta');
    return;
  }

  medicionesViento.push(valor); // alta en el arreglo de números
  document.getElementById('medicionViento').value = '';

  document.getElementById('progresoViento').textContent =
    `Mediciones registradas: ${medicionesViento.length} de ${TOTAL_MEDICIONES} → [${medicionesViento.join(', ')}]`;

  if (medicionesViento.length === TOTAL_MEDICIONES) {
    calcularEstadisticasViento();
  } else {
    mostrarMensaje('resultadoViento',
      `Medición ${valor} km/h registrada. Faltan ${TOTAL_MEDICIONES - medicionesViento.length}.`,
      'info');
  }
}

// Reinicia el arreglo de mediciones
function reiniciarViento() {
  medicionesViento = [];
  document.getElementById('medicionViento').value = '';
  document.getElementById('progresoViento').textContent = 'Mediciones registradas: 0 de 5';
  mostrarMensaje('resultadoViento', '🔄 Mediciones reiniciadas. Ingresa 5 nuevas mediciones.', 'info');
}


/* =============================================================
   MÓDULO 4 · SENSORES
   Expresión regular /^SEN-\d{3}$/ + validaciones + tabla dinámica
   ============================================================= */

const REGEX_SENSOR = /^SEN-\d{3}$/; // SEN- + exactamente 3 dígitos

// Arreglo de objetos de sensores
let registrosSensores = leerDeStorage('simtele_sensores') || [];

// Valida el código con la expresión regular
function validarCodigoSensor(codigo) {
  return REGEX_SENSOR.test(codigo);
}

// Dibuja la tabla de sensores
function renderizarSensores() {
  const cuerpo = document.getElementById('cuerpoSensores');
  cuerpo.innerHTML = '';

  if (registrosSensores.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="5" class="vacio">Sin sensores registrados.</td></tr>';
  } else {
    registrosSensores.forEach(function (sensor, indice) {
      const fila = document.createElement('tr');
      fila.innerHTML =
        '<td>' + (indice + 1) + '</td>' +
        '<td>' + escaparHTML(sensor.codigo) + '</td>' +
        '<td>' + escaparHTML(sensor.tipo) + '</td>' +
        '<td>' + sensor.lectura + '</td>' +
        '<td><button type="button" class="btn-eliminar" data-indice="' + indice + '">Eliminar</button></td>';
      cuerpo.appendChild(fila);
    });
  }

  guardarEnStorage('simtele_sensores', registrosSensores);
}

// Registra un sensor nuevo
function manejarSensores(evento) {
  evento.preventDefault();

  const codigo = document.getElementById('codigoSensor').value.trim().toUpperCase();
  const tipo = document.getElementById('tipoSensor').value;
  const lectura = convertirNumero(document.getElementById('lecturaSensor').value);

  // --- Validaciones ---
  if (codigo === '') {
    mostrarMensaje('mensajeSensores',
      '❌ Error: el código del sensor no puede estar vacío.', 'error');
    return;
  }
  if (!validarCodigoSensor(codigo)) {
    mostrarMensaje('mensajeSensores',
      '❌ Error: formato inválido. El código debe ser SEN- seguido de 3 dígitos (ej.: SEN-001).',
      'error');
    return;
  }
  if (registrosSensores.some(function (s) { return s.codigo === codigo; })) {
    mostrarMensaje('mensajeSensores',
      '❌ Error: el código ' + codigo + ' ya fue registrado.', 'error');
    return;
  }
  if (isNaN(lectura)) {
    mostrarMensaje('mensajeSensores',
      '❌ Error: la lectura debe ser un número válido (no vacío, sin letras).', 'error');
    return;
  }
  if (lectura < -100 || lectura > 1000) {
    mostrarMensaje('mensajeSensores',
      '❌ Error: la lectura debe estar entre -100 y 1000.', 'error');
    return;
  }

  // --- Alta en el arreglo de objetos ---
  registrosSensores.push({
    codigo: codigo,
    tipo: tipo,
    lectura: lectura
  });

  renderizarSensores();
  mostrarMensaje('mensajeSensores',
    '✅ Sensor ' + codigo + ' (' + tipo + ') registrado con lectura ' + lectura + '.', 'ok');

  evento.target.reset();
}

// Elimina un sensor del arreglo
function eliminarSensor(indice) {
  if (indice < 0 || indice >= registrosSensores.length) return;

  registrosSensores.splice(indice, 1);

  renderizarSensores();
  mostrarMensaje('mensajeSensores', '🗑️ Sensor eliminado correctamente.', 'ok');
}

// Delegación de eventos para los botones "Eliminar"
function manejarEliminarSensor(evento) {
  const boton = evento.target.closest('.btn-eliminar');
  if (!boton) return;
  const indice = Number(boton.dataset.indice);
  eliminarSensor(indice);
}


/* =============================================================
   5. INICIALIZACIÓN Y EVENTOS (addEventListener)
   ============================================================= */

document.addEventListener('DOMContentLoaded', function () {

  // Módulo 1
  document.getElementById('formDetencion')
    .addEventListener('submit', manejarDetencion);

  // Módulo 2
  document.getElementById('formMantenimiento')
    .addEventListener('submit', manejarMantenimiento);
  document.getElementById('cuerpoMantenimiento')
    .addEventListener('click', manejarEliminarMantenimiento);

  // Módulo 3
  document.getElementById('formViento')
    .addEventListener('submit', manejarViento);
  document.getElementById('btnReiniciarViento')
    .addEventListener('click', reiniciarViento);

  // Módulo 4
  document.getElementById('formSensores')
    .addEventListener('submit', manejarSensores);
  document.getElementById('cuerpoSensores')
    .addEventListener('click', manejarEliminarSensor);

  // Pintado inicial (recupera datos guardados en localStorage)
  renderizarMantenimiento();
  renderizarSensores();

  console.log('SIMTELE-WEB iniciado correctamente ✅');
});