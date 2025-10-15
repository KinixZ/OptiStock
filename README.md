# OptiStock

OptiStock es una plataforma web para administrar almacenes con herramientas 100 % basadas en tecnologías básicas: HTML, CSS, JavaScript, PHP y MySQL. El proyecto prioriza entornos compartidos o de bajo costo, por lo que todas las automatizaciones, reportes y módulos funcionan sin depender de Firebase, AWS u otros servicios externos.

## Funcionalidades principales

- **Panel principal** con accesos rápidos, indicadores y alertas operativas.
- **Gestión de inventario** con categorías, subcategorías, movimientos de entrada/salida y reportes descargables.
- **Áreas y zonas de almacenamiento** para mapear ubicaciones físicas y su capacidad disponible.
- **Administración de usuarios** (altas, bajas, roles y restablecimiento de contraseñas).
- **Reportes manuales y automáticos** en PDF/Excel con historial centralizado y retención de 60 días.
- **Bitácora y notificaciones** para seguir actividades, solicitudes y eventos críticos.

## Tecnologías y arquitectura

| Capa | Herramientas | Detalles |
| --- | --- | --- |
| Frontend | HTML5, CSS3, Bootstrap 5, JavaScript vanilla | Páginas estáticas en `index.html` y la carpeta `pages/`. |
| Backend principal | PHP 8+, MySQL 5.7+ | Scripts en `scripts/php/` que atienden formularios, reportes, autenticación y procesos automatizados. |
| Reportes automáticos | PHP (cron) o navegador | Generación de archivos con Dompdf o plantillas HTML simples. |
| Opcional (local/testing) | Node.js, Express, Google Auth Library | Servidor en `scripts/server/server.js` para login con Google o pruebas puntuales; no es obligatorio en producción. |

## Requisitos previos

1. **Servidor web con PHP** (Apache, Nginx o el servidor embebido de PHP).
2. **Motor MySQL/MariaDB** y permisos para crear tablas usando `bd_prueba.sql` y los archivos SQL de `docs/report-history/`.
3. **Composer** si deseas generar PDFs con Dompdf (`composer install`).
4. **Node.js 18+** únicamente si vas a usar el servidor Express opcional.
5. Navegador moderno para consumir el frontend.

## Puesta en marcha rápida

### 1. Preparar el frontend

- Clona o descarga este repositorio.
- Sirve los archivos estáticos desde cualquier hosting básico o en local con un servidor simple, por ejemplo:
  ```bash
  php -S localhost:8000
  ```
  Luego visita `http://localhost:8000/index.html`.

### 2. Configurar el backend PHP + MySQL

1. Crea la base de datos ejecutando `bd_prueba.sql` y, si usarás el historial de reportes, importa también `docs/report-history/create_table.sql` y `docs/report-history/create_table_automatizaciones.sql`.
2. Actualiza las credenciales de conexión (servidor, usuario, contraseña y base) al inicio de los scripts PHP. Están declaradas como variables o constantes en cada archivo, por ejemplo en `scripts/php/login.php`, `scripts/php/report_history.php`, `scripts/php/report_automations.php` y demás controladores de la carpeta.
3. Sube la carpeta `scripts/php/` a tu hosting y configura tu servidor web para que apunte a estos endpoints.
4. Ajusta la configuración de correo opcional editando `scripts/php/mail_config.php` o exponiendo las variables de entorno `MAIL_FROM_EMAIL`, `MAIL_HOST`, `SMTP_USERNAME`, etc.

### 3. (Opcional) Activar servicios de apoyo en Node.js

Solo para pruebas locales o integraciones específicas:

```bash
npm install
node scripts/server/server.js
```

El servidor escucha por defecto en `http://localhost:3000` y ofrece autenticación con Google, almacenamiento temporal de reportes y utilidades para limpiar archivos antiguos. Este paso se puede omitir en entornos donde únicamente se utilicen PHP y MySQL.

## Automatización de reportes sin servicios externos

- La página `pages/reports/reportes.html` permite crear reportes manuales y programados reutilizando componentes del dashboard.
- Los archivos se guardan en `docs/report-history/files` y se registran en `docs/report-history/index.json`, con una retención automática de 60 días manejada por los scripts.
- Para automatizar en un hosting compartido, programa un **cron** que ejecute `scripts/php/scheduler.php` cada pocos minutos. El script genera el PDF/CSV con Dompdf o una plantilla HTML simple y registra el resultado usando `scripts/php/report_history.php`.
- Si no cuentas con cron, deja abierta la página de reportes: `scripts/reports/reportes.js` ejecuta los temporizadores en el navegador y guarda los archivos en `localStorage` con la misma estructura de historial.

Consulta `docs/reportes_automaticos.md` para conocer los módulos soportados, las plantillas disponibles y recomendaciones de personalización.

## Estructura del repositorio

```
OptiStock/
├── index.html                # Landing page pública
├── pages/                    # Módulos internos (login, panel, inventario, reportes, etc.)
├── scripts/
│   ├── php/                  # API en PHP + MySQL
│   ├── reports/              # Lógica del frontend para reportes
│   └── server/               # Servidor Express opcional
├── styles/                   # Hojas de estilo organizadas por módulo
├── images/                   # Recursos gráficos
├── docs/                     # Guías, SQL y soporte para historial de reportes
├── composer.json             # Dependencia Dompdf
├── package.json              # Dependencias Node.js opcionales
└── manifest.json / sw.js     # Configuración PWA básica
```

## Recursos adicionales

- `docs/reportes_automaticos.md`: guía completa para el planificador de reportes, almacenamiento local y despliegue en hosting compartido.
- `docs/usuarios_admin_troubleshooting.md`: notas para dar soporte a cuentas de administradores.
- `logs/`: ejemplos de bitácoras generadas por los scripts PHP.
- `NOTA SOBRE EL INDEX` y `NOTA DE DOMINIO`: recordatorios funcionales del proyecto.

Con esta estructura puedes desplegar OptiStock usando únicamente herramientas esenciales, personalizar la conexión a tu base de datos y extender reportes o automatizaciones sin recurrir a servicios externos.
