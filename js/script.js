
/* =============================================================
   1. UTILIDADES
   ============================================================= */

function mostrarMensaje(idContenedor, texto, tipo) {
  const contenedor = document.getElementById(idContenedor);
  if (!contenedor) return;
  contenedor.textContent = texto;
  contenedor.className = 'mensaje ' + (tipo || 'info');
}

function convertirNumero(texto) {
  if (typeof texto !== 'string') return NaN;
  const limpio = texto.trim();
  if (limpio === '') return NaN;
  if (!/^-?\d+(\.\d+)?$/.test(limpio)) return NaN;
  return parseFloat(limpio);
}

function escaparHTML(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function guardarEnStorage(clave, datos) {
  try { localStorage.setItem(clave, JSON.stringify(datos)); } catch (e) {}
}

function leerDeStorage(clave) {
  try {
    const datos = localStorage.getItem(clave);
    return datos ? JSON.parse(datos) : null;
  } catch (e) { return null; }
}

/* =============================================================
   2. ESTADO GLOBAL
   ============================================================= */

let registrosMantenimiento = leerDeStorage('simtele_mantenimiento') || [];
let registrosSensores      = leerDeStorage('simtele_sensores') || [];
let medicionesViento       = [];

const TOTAL_MEDICIONES = 5;
const ETIQUETAS_ESTADO = { normal: 'Normal', revision: 'Revisión', urgente: 'Urgente' };
const REGEX_SENSOR = /^SEN-\d{3}$/;

/* =============================================================
   3. LOGIN
   ============================================================= */

const USUARIO_DEMO = 'operador';
const CLAVE_DEMO   = 'simtelef2026';
const CLAVE_SESION = 'simtele_sesion';

function mostrarLogin() {
  document.getElementById('pantallaLogin').classList.remove('oculto');
  document.getElementById('barraSesion').classList.add('oculto');
}

function ocultarLogin(usuario) {
  document.getElementById('pantallaLogin').classList.add('oculto');
  document.getElementById('barraSesion').classList.remove('oculto');
  document.getElementById('usuarioActivo').textContent = usuario;
}

function manejarLogin(evento) {
  evento.preventDefault();
  const usuario = document.getElementById('usuario').value.trim();
  const clave   = document.getElementById('clave').value;
  const mensaje = document.getElementById('mensajeLogin');

  mensaje.className = 'mensaje error visible';

  if (usuario === '' || clave === '') {
    mensaje.textContent = '❌ Completa usuario y contraseña.';
    return;
  }
  if (usuario === USUARIO_DEMO && clave === CLAVE_DEMO) {
    sessionStorage.setItem(CLAVE_SESION, usuario);
    mensaje.classList.remove('visible');
    document.getElementById('formLogin').reset();
    ocultarLogin(usuario);
    registrarEvento('ok', 'Inicio de sesión: ' + usuario);
  } else {
    mensaje.textContent = '❌ Usuario o contraseña incorrectos.';
    document.getElementById('clave').value = '';
    document.getElementById('clave').focus();
  }
}

function manejarLogout() {
  sessionStorage.removeItem(CLAVE_SESION);
  document.getElementById('usuarioActivo').textContent = '—';
  document.getElementById('relojSesion').textContent = '⏱ --:--:--';
  document.getElementById('formLogin').reset();
  const m = document.getElementById('mensajeLogin');
  m.textContent = '';
  m.className = 'mensaje';
  mostrarLogin();
  registrarEvento('info', 'Sesión cerrada');
}

function actualizarRelojSesion() {
  const reloj = document.getElementById('relojSesion');
  if (!reloj) return;
  reloj.textContent = '⏱ ' + new Date().toLocaleTimeString('es-BO');
}

function verificarSesionAlCargar() {
  const usuario = sessionStorage.getItem(CLAVE_SESION);
  if (usuario) ocultarLogin(usuario);
  else mostrarLogin();
}

/* =============================================================
   4. CONTROL DE MANDO (log, resumen, indicadores)
   ============================================================= */

const logEventos = [];

function registrarEvento(tipo, mensaje) {
  const hora = new Date().toLocaleTimeString('es-BO');
  logEventos.unshift({ tipo: tipo, mensaje: mensaje, hora: hora });
  if (logEventos.length > 10) logEventos.pop();
  renderizarLog();
}

function renderizarLog() {
  const contenedor = document.getElementById('listaEventos');
  if (!contenedor) return;
  if (logEventos.length === 0) {
    contenedor.innerHTML = '<li class="vacio-log">Sin eventos todavía.</li>';
    return;
  }
  contenedor.innerHTML = logEventos.map(function (ev) {
    return '<li class="evento ' + ev.tipo + '">' +
      '<span class="ev-hora">' + ev.hora + '</span>' +
      '<span class="ev-msg">' + escaparHTML(ev.mensaje) + '</span>' +
      '</li>';
  }).join('');
}

function actualizarIndicador(id, estado, texto) {
  const el = document.getElementById('indicador-' + id);
  if (!el) return;
  el.className = 'indicador ' + estado;
  el.textContent = '● ' + texto;
}

function actualizarResumen() {
  const r = document.getElementById('resumenRegistros');
  if (r) r.textContent = registrosMantenimiento.length;

  const alertas = document.getElementById('resumenAlertas');
  if (alertas) {
    const urgentes = registrosMantenimiento.filter(function (x) { return x.estado === 'urgente'; }).length;
    alertas.textContent = urgentes;
    alertas.className = 'resumen-valor ' + (urgentes > 0 ? 'alerta' : '');
  }

  const v = document.getElementById('resumenViento');
  if (v) {
    if (medicionesViento.length === 0) v.textContent = '—';
    else {
      let suma = 0;
      medicionesViento.forEach(function (m) { suma += m; });
      v.textContent = (suma / medicionesViento.length).toFixed(1) + ' km/h';
    }
  }

  const s = document.getElementById('resumenSensores');
  if (s) s.textContent = registrosSensores.length;
}

function actualizarEstadoDetencion(distancia, tipo) {
  const mapa = { ok: ['ok', 'Controlado'], alerta: ['alerta', 'Precaución'], error: ['error', 'Alerta'] };
  const par = mapa[tipo] || ['sin-datos', 'Sin datos'];
  actualizarIndicador('detencion', par[0], par[1]);
  registrarEvento(tipo, 'Detención: ' + distancia.toFixed(2) + ' m');
  actualizarResumen();
}

function actualizarEstadoMantenimiento() {
  if (registrosMantenimiento.length === 0) {
    actualizarIndicador('mantenimiento', 'sin-datos', 'Sin registros');
  } else {
    const urgentes = registrosMantenimiento.filter(function (x) { return x.estado === 'urgente'; }).length;
    if (urgentes > 0) actualizarIndicador('mantenimiento', 'alerta', urgentes + ' urgente(s)');
    else actualizarIndicador('mantenimiento', 'ok', registrosMantenimiento.length + ' registro(s)');
  }
  actualizarResumen();
}

function actualizarEstadoViento() {
  if (medicionesViento.length === 0) {
    actualizarIndicador('viento', 'sin-datos', 'Sin mediciones');
  } else if (medicionesViento.length < 5) {
    actualizarIndicador('viento', 'alerta', medicionesViento.length + '/5');
  } else {
    let suma = 0, max = medicionesViento[0];
    medicionesViento.forEach(function (m) { suma += m; if (m > max) max = m; });
    const prom = suma / medicionesViento.length;
    const estado = prom < 15 ? 'ok' : (prom < 45 ? 'alerta' : 'error');
    actualizarIndicador('viento', estado, 'Prom ' + prom.toFixed(0) + ' km/h');
  }
  actualizarResumen();
}

function actualizarEstadoSensores() {
  if (registrosSensores.length === 0) actualizarIndicador('sensores', 'sin-datos', 'Sin sensores');
  else actualizarIndicador('sensores', 'ok', registrosSensores.length + ' válido(s)');
  actualizarResumen();
}

/* =============================================================
   5. MÓDULO 1 · DETENCIÓN
   ============================================================= */

function calcularDistanciaReaccion(velocidadKmH, tiempoSegundos) {
  return (velocidadKmH / 3.6) * tiempoSegundos;
}

function manejarDetencion(evento) {
  evento.preventDefault();

  const velocidad = convertirNumero(document.getElementById('velocidad').value);
  const tiempo    = convertirNumero(document.getElementById('tiempoReaccion').value);

  if (isNaN(velocidad) || isNaN(tiempo)) {
    mostrarMensaje('resultadoDetencion',
      '❌ Error: debes ingresar números válidos (no vacíos, sin letras).', 'error');
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

  const distancia = calcularDistanciaReaccion(velocidad, tiempo);

  let aviso = '', tipo = 'ok';
  if (distancia < 30) {
    tipo = 'ok';
    aviso = '🟢 Situación controlada.';
  } else if (distancia <= 60) {
    tipo = 'alerta';
    aviso = '🟡 Precaución.';
  } else {
    tipo = 'error';
    aviso = '🔴 Alerta crítica.';
  }

  mostrarMensaje('resultadoDetencion',
    `Distancia recorrida durante la reacción: ${distancia.toFixed(2)} m. ${aviso}`, tipo);

  actualizarEstadoDetencion(distancia, tipo);
}

/* =============================================================
   6. MÓDULO 2 · MANTENIMIENTO
   ============================================================= */

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
  actualizarEstadoMantenimiento();
}

function manejarMantenimiento(evento) {
  evento.preventDefault();

  const componente = document.getElementById('componente').value.trim();
  const horas      = convertirNumero(document.getElementById('horasUso').value);
  const estado     = document.getElementById('estado').value;

  if (componente === '') {
    mostrarMensaje('mensajeMantenimiento',
      '❌ Error: el nombre del componente no puede estar vacío.', 'error'); return;
  }
  if (componente.length < 3) {
    mostrarMensaje('mensajeMantenimiento',
      '❌ Error: el componente debe tener al menos 3 caracteres.', 'error'); return;
  }
  if (isNaN(horas)) {
    mostrarMensaje('mensajeMantenimiento',
      '❌ Error: las horas de uso deben ser un valor numérico.', 'error'); return;
  }
  if (horas < 0 || horas > 100000) {
    mostrarMensaje('mensajeMantenimiento',
      '❌ Error: las horas de uso deben estar entre 0 y 100000.', 'error'); return;
  }

  registrosMantenimiento.push({ componente: componente, horas: horas, estado: estado });

  renderizarMantenimiento();
  mostrarMensaje('mensajeMantenimiento',
    '✅ Registro agregado: ' + componente + ' (' + horas + ' h, ' +
    (ETIQUETAS_ESTADO[estado] || estado) + ').', 'ok');
  registrarEvento('ok', 'Mantenimiento: alta "' + componente + '"');
  evento.target.reset();
}

function eliminarRegistroMantenimiento(indice) {
  if (indice < 0 || indice >= registrosMantenimiento.length) return;
  const nombre = registrosMantenimiento[indice].componente;
  registrosMantenimiento.splice(indice, 1);
  renderizarMantenimiento();
  mostrarMensaje('mensajeMantenimiento', '🗑️ Registro eliminado correctamente.', 'ok');
  registrarEvento('info', 'Mantenimiento: baja "' + nombre + '"');
}

function manejarEliminarMantenimiento(evento) {
  const boton = evento.target.closest('.btn-eliminar');
  if (!boton) return;
  eliminarRegistroMantenimiento(Number(boton.dataset.indice));
}

/* =============================================================
   7. MÓDULO 3 · VIENTO
   ============================================================= */

function calcularEstadisticasViento() {
  let suma = 0, maximo = medicionesViento[0];
  medicionesViento.forEach(function (m) { suma += m; if (m > maximo) maximo = m; });
  const promedio = suma / medicionesViento.length;

  let clasificacion = '', tipo = 'info';
  if (promedio < 15) { clasificacion = 'Brisa suave (simulación)'; tipo = 'ok'; }
  else if (promedio < 30) { clasificacion = 'Viento moderado (simulación)'; tipo = 'info'; }
  else if (promedio < 45) { clasificacion = 'Viento fuerte: revisar oscilación'; tipo = 'alerta'; }
  else { clasificacion = 'Viento muy fuerte: suspender operación simulada'; tipo = 'error'; }

  mostrarMensaje('resultadoViento',
    `Promedio: ${promedio.toFixed(2)} km/h · Máximo: ${maximo.toFixed(2)} km/h · Clasificación: ${clasificacion}`,
    tipo);

  registrarEvento(tipo, 'Viento: prom ' + promedio.toFixed(1) + ' km/h');
}

function manejarViento(evento) {
  evento.preventDefault();

  const valor = convertirNumero(document.getElementById('medicionViento').value);

  if (isNaN(valor)) {
    mostrarMensaje('resultadoViento',
      '❌ Error: la medición debe ser un número válido (no vacío, sin letras).', 'error'); return;
  }
  if (valor < 0 || valor > 150) {
    mostrarMensaje('resultadoViento',
      '❌ Error: la medición debe estar entre 0 y 150 km/h.', 'error'); return;
  }
  if (medicionesViento.length >= TOTAL_MEDICIONES) {
    mostrarMensaje('resultadoViento',
      '⚠️ Ya registraste las 5 mediciones. Usa "Reiniciar mediciones".', 'alerta'); return;
  }

  medicionesViento.push(valor);
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
  actualizarEstadoViento();
}

function reiniciarViento() {
  medicionesViento = [];
  document.getElementById('medicionViento').value = '';
  document.getElementById('progresoViento').textContent = 'Mediciones registradas: 0 de 5';
  mostrarMensaje('resultadoViento', '🔄 Mediciones reiniciadas.', 'info');
  actualizarEstadoViento();
  registrarEvento('info', 'Viento: mediciones reiniciadas');
}

/* =============================================================
   8. MÓDULO 4 · SENSORES
   ============================================================= */

function validarCodigoSensor(codigo) {
  return REGEX_SENSOR.test(codigo);
}

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
  actualizarEstadoSensores();
}

function manejarSensores(evento) {
  evento.preventDefault();

  const codigo  = document.getElementById('codigoSensor').value.trim().toUpperCase();
  const tipo    = document.getElementById('tipoSensor').value;
  const lectura = convertirNumero(document.getElementById('lecturaSensor').value);

  if (codigo === '') {
    mostrarMensaje('mensajeSensores',
      '❌ Error: el código del sensor no puede estar vacío.', 'error'); return;
  }
  if (!validarCodigoSensor(codigo)) {
    mostrarMensaje('mensajeSensores',
      '❌ Error: formato inválido. Debe ser SEN- seguido de 3 dígitos (ej.: SEN-001).', 'error'); return;
  }
  if (registrosSensores.some(function (s) { return s.codigo === codigo; })) {
    mostrarMensaje('mensajeSensores',
      '❌ Error: el código ' + codigo + ' ya fue registrado.', 'error'); return;
  }
  if (isNaN(lectura)) {
    mostrarMensaje('mensajeSensores',
      '❌ Error: la lectura debe ser un número válido.', 'error'); return;
  }
  if (lectura < -100 || lectura > 1000) {
    mostrarMensaje('mensajeSensores',
      '❌ Error: la lectura debe estar entre -100 y 1000.', 'error'); return;
  }

  registrosSensores.push({ codigo: codigo, tipo: tipo, lectura: lectura });
  renderizarSensores();
  mostrarMensaje('mensajeSensores',
    '✅ Sensor ' + codigo + ' (' + tipo + ') registrado con lectura ' + lectura + '.', 'ok');
  registrarEvento('ok', 'Sensor: alta ' + codigo);
  evento.target.reset();
}

function eliminarSensor(indice) {
  if (indice < 0 || indice >= registrosSensores.length) return;
  const codigo = registrosSensores[indice].codigo;
  registrosSensores.splice(indice, 1);
  renderizarSensores();
  mostrarMensaje('mensajeSensores', '🗑️ Sensor eliminado correctamente.', 'ok');
  registrarEvento('info', 'Sensor: baja ' + codigo);
}

function manejarEliminarSensor(evento) {
  const boton = evento.target.closest('.btn-eliminar');
  if (!boton) return;
  eliminarSensor(Number(boton.dataset.indice));
}

/* =============================================================
   9. INICIALIZACIÓN
   ============================================================= */

document.addEventListener('DOMContentLoaded', function () {

  // Login
  document.getElementById('formLogin').addEventListener('submit', manejarLogin);
  document.getElementById('btnLogout').addEventListener('click', manejarLogout);
  verificarSesionAlCargar();
  actualizarRelojSesion();
  setInterval(actualizarRelojSesion, 1000);

  // Módulo 1
  document.getElementById('formDetencion').addEventListener('submit', manejarDetencion);

  // Módulo 2
  document.getElementById('formMantenimiento').addEventListener('submit', manejarMantenimiento);
  document.getElementById('cuerpoMantenimiento').addEventListener('click', manejarEliminarMantenimiento);

  // Módulo 3
  document.getElementById('formViento').addEventListener('submit', manejarViento);
  document.getElementById('btnReiniciarViento').addEventListener('click', reiniciarViento);

  // Módulo 4
  document.getElementById('formSensores').addEventListener('submit', manejarSensores);
  document.getElementById('cuerpoSensores').addEventListener('click', manejarEliminarSensor);

  // Render inicial
  renderizarMantenimiento();
  renderizarSensores();
  actualizarEstadoViento();
  renderizarLog();

  console.log('SIMTELE-WEB iniciado correctamente ✅');
});
