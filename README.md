# SIMTELE-WEB · Panel interactivo de prevención y monitoreo

Proyecto individual de **Programación Web I** — simulación educativa.
No usa datos reales de Mi Teleférico; todos los umbrales son didácticos.

## 👤 Autora
- **Lima Lizárraga Sarah Elizabeth** — Desarrollo completo (HTML, CSS, JavaScript, validaciones y publicación).

## 🧩 Módulos implementados
1. **Detención de emergencia:** calcula `d = (v/3.6) × t` y avisa según umbrales simulados (30 m / 60 m).
2. **Mantenimiento:** alta, visualización y eliminación de componentes en tabla dinámica (arreglo de objetos con `push` y `splice`).
3. **Viento y oscilación:** registra 5 mediciones y muestra promedio, máximo y clasificación descriptiva (`forEach`).
4. **Sensores:** valida el código con la expresión regular `/^SEN-\d{3}$/`, la lectura numérica y evita duplicados.

## 🚀 Cómo usarlo
1. Abre `index.html` en el navegador o entra a la URL de GitHub Pages.
2. Navega entre los módulos con el menú superior.
3. Completa cada formulario y presiona su botón.
4. Verde = éxito · Amarillo = advertencia · Rojo = error.
5. Los registros se conservan al recargar gracias a `localStorage` (puntos extra).

## 🛠️ Tecnologías
HTML5 semántico · CSS3 (grid + media query) · JavaScript (DOM, arreglos de objetos, RegExp, `addEventListener`, `localStorage`).

## ⚠️ Aviso
Todos los umbrales son **didácticos** y forman parte de una simulación académica, no de límites operativos reales.