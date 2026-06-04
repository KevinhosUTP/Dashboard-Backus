# 🚛 Sistema de Gestión de Patio - Backus 2.0

Este proyecto es un Producto Mínimo Viable (MVP) diseñado para optimizar y simular la asignación de camiones a las distintas bahías de la planta. La aplicación proporciona una interfaz gráfica robusta que funciona sobre un mapa satelital interactivo en tiempo real.

## 🛠 Stack Tecnológico

* **Frontend:** React, TypeScript, Vite, Tailwind CSS.
* **Base de Datos & Autenticación:** Supabase (PostgreSQL).
* **Despliegue:** Vercel.

> **Nota de Arquitectura:** En esta versión se refactorizó la lógica de actualización de estados.

## 🚀 Características Principales

* **Mapa Satelital Interactivo (UI/UX):** La interfaz está estructurada en tres secciones principales utilizando una imagen satelital de la planta de fondo. Las bahías están mapeadas con coordenadas absolutas para reflejar la realidad operativa.
* **Drag & Drop Logístico:** Los usuarios pueden arrastrar las tarjetas de los camiones (mostrando datos como Parihuelero, Bitren, etc.) desde la cola de espera inferior hacia las bahías correspondientes.
* **Sistema de Semáforo de Tiempos:** Monitoreo visual del tiempo en patio con colores dinámicos:
   * 🟢 **Verde** (≤ 60 min).
   * 🟡 **Amarillo** (61 - 120 min).
   * 🔴 **Rojo** (≥ 121 min).
* **Dashboard Central:** Paneles flotantes semitransparentes que exhiben información vital, como la unidad con mayor prioridad, tiempo promedio global en patio y unidades atendidas por turnos (T1, T2, T3).
* **Gestión de Incidencias:** Controles interactivos por unidad para registrar el inicio y fin de una incidencia. El sistema admite un máximo de 3 incidencias por camión antes de emitir una alerta crítica.
* **Administración por Roles:** Distinción estricta entre `Administrador` (con privilegios de edición en rangos de tiempo y configuración) y `Cliente` (modo de solo lectura).

## ⚙️ Instalación y Desarrollo Local

1. Clona el repositorio:
   ```bash
   git clone [https://github.com/KevinhosUTP/Dashboard-Backus.git](https://github.com/KevinhosUTP/Dashboard-Backus.git)

2. Instala las dependencias:

   npm install
3. Configura las variables de entorno:

   Copia el archivo .env.example y renómbralo a .env, asegurándote de colocar tus credenciales de Supabase.

4. Inicia el servidor de desarrollo:
   
   npm run dev
