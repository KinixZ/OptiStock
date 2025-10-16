# Propuesta de módulo de reportes automáticos

Este documento detalla la organización y las funciones sugeridas para la página de reportes, incluyendo la generación automática de reportes con periodos personalizados. Se busca mantener el uso de herramientas básicas y almacenamiento local.

### 0.1 ¿Por qué un reporte manual sí conserva el diseño y uno automático no?

- **Origen de los datos y estilos**. Cuando exportas manualmente desde la interfaz (`pages/reports/reportes.html`), el navegador ya tiene cargados los estilos `styles/theme/palette.css` y `styles/reports/reportes.css`, además de los datos que renderiza Vue/JavaScript. Por eso, al imprimir o guardar un PDF, el resultado respeta colores, tablas y tipografías definidos en esos archivos.
- **Ejecución en segundo plano**. El generador automático se ejecuta en `scripts/php/scheduler.php`, normalmente desde cron. Allí se arma el HTML en `automation_template.php` y se pasa a Dompdf. Si el script no encuentra los CSS locales o Dompdf está trabajando sin permisos para leer archivos (algo común en hostings compartidos), se queda únicamente con el estilo base inline del template y el PDF se ve plano.【F:scripts/php/scheduler.php†L783-L826】【F:scripts/php/automation_template.php†L1-L318】
- **Solución rápida**. Revisa que los archivos `styles/theme/palette.css` y `styles/reports/reportes.css` estén presentes en el servidor y que PHP pueda leerlos. El planificador concatena su contenido en la variable `$extraCss`; si esos archivos faltan, el template solo usa los colores de respaldo definidos dentro del mismo PHP.【F:scripts/php/scheduler.php†L795-L818】
- **Cuando Dompdf está ausente**. En entornos donde no puedes instalar Dompdf, el planificador salta la generación automática para evitar un PDF vacío. En ese caso verás el mensaje correspondiente en el log (`error_log`) y el historial mostrará que no hubo archivo nuevo.【F:scripts/php/scheduler.php†L783-L785】【F:scripts/php/scheduler.php†L828-L859】
- **Generación manual desde el panel**. Si presionas “Generar ahora” en la lista de automatizaciones, la interfaz llama a `scripts/php/run_automation_now.php` para producir el mismo PDF/CSV estilizado que crea el planificador y lo guarda con el origen manual del módulo correspondiente; así el historial lo registra como si hubiera salido del módulo original.【F:scripts/php/run_automation_now.php†L1-L189】【F:scripts/reports/reportes.js†L2448-L2624】

> **Implementación actual**: el historial centralizado ya guarda de forma automática cada PDF o Excel generado en los módulos principales dentro de `docs/report-history/`. Los archivos permanecen disponibles por 60 días y se sirven a través del script PHP local (`/scripts/php/report_history.php`). La página `pages/reports/reportes.html` ofrece filtros, descargas y carga manual de archivos adicionales.

> **Registro en base de datos**: además del archivo JSON local, cada reporte se registra en la tabla `reportes_historial` para poder filtrar por empresa en consultas SQL. Puedes crearla desde phpMyAdmin copiando el contenido de `docs/report-history/create_table.sql` en la consola SQL y ejecutándolo.

## 1. Organización general de la página de reportes
- **Secciones principales**:
  - *Panel de carga manual*: formulario para subir archivos PDF generados en cualquier sección.
  - *Panel de programación automática*: interfaz para que el usuario defina periodos y condiciones de generación automática.
  - *Historial centralizado*: listado con filtros por fecha, área, tipo de documento y usuario que lo generó.
  - *Detalle de reporte*: vista que muestre metadatos, vista previa del PDF y opciones de descarga.
- **Diseño visual**:
  - Reutilizar los componentes existentes del sitio para conservar la identidad visual.
  - Cargar la paleta de colores definida en la configuración de la empresa y aplicarla a botones, tablas y paneles.
  - Ofrecer la opción de colocar el logotipo de la empresa como marca de agua o en el pie de página del PDF generado.

## 2. Almacenamiento y estructura de datos (local)
- **Archivos**: guardar los PDFs en una estructura por año/mes/área/usuario dentro del servidor, por ejemplo `reportes/<año>/<mes>/<area>/<usuario>/`.
- **Metadatos**: mantener un archivo SQLite o JSON que registre título, descripción, autor, área, fecha de generación, periodo cubierto, estado y ruta del archivo.
- **Control de versiones**: incluir número de versión o un flag de "última versión" para los reportes que se regeneran automáticamente.

## 3. Configuración de reportes automáticos
- **Periodos disponibles**:
  - Predefinidos: semanal, quincenal, mensual.
  - Personalizados: selección de fecha inicial y final.
- **Fuentes de datos**:
  - Movimientos de productos (entradas/salidas, ajustes de inventario).
  - Resumen por áreas o zonas (volumen, rotación, existencias críticas).
  - Actividades de usuarios (acciones realizadas, aprobaciones, incidencias).
- **Plantillas**:
  - Definir plantillas base en HTML/CSS que respeten la paleta de colores actual.
  - Incluir espacios reservados para logotipo (marca de agua o pie de página) y tablas con datos.
- **Programación**:
  - Formulario para seleccionar: tipo de reporte, periodo, área/zona, destinatarios internos y formato de entrega (descarga, correo interno).
  - Guardar la configuración en la base de datos local para que el proceso programado la ejecute.
  - Módulos permitidos para automatización: Inventario actual, Usuarios actuales, Áreas y zonas, Historial de movimientos, Ingresos y egresos, Ingresos registrados, Egresos registrados, Registro de actividades, Accesos de usuarios e Historial de solicitudes. Solo se aceptan opciones que ya existen en la interfaz.

### 3.1 Cómo verificar qué datos se cargan en cada ejecución automática

- El planificador (`scripts/php/scheduler.php`) calcula primero el periodo que cubre el reporte y luego arma el paquete de información con `build_report_payload()`. Además del perfil y la paleta de la empresa, ahora agrega bloques específicos para cada módulo (inventario, usuarios, registro de accesos o actividades) reutilizando funciones como `gather_inventory_report()`, `gather_users_report()`, `gather_activity_log_report()` y `gather_access_log_report()` antes de entregar los datos al template.【F:scripts/php/automation_runtime.php†L732-L980】【F:scripts/php/automation_runtime.php†L1211-L1266】
- Para comprobar qué se guardó en una corrida concreta puedes revisar el array `$payload` antes de generar el PDF/CSV. El propio `scheduler.php` registra mensajes en el log (`error_log`) cuando alguna consulta falla; basta con activar el log de PHP para ver si se están leyendo movimientos, áreas o solicitudes en cada ejecución.【F:scripts/php/scheduler.php†L604-L702】
- Si necesitas auditar resultados sin abrir el archivo final, agrega un volcado temporal a JSON en `scheduler.php` justo después de construir `$payload`. Por ejemplo, escribirlo en `docs/report-history/debug/` usando `file_put_contents` te permite comparar lo que llegó desde la base de datos con lo que ves en el PDF, todo sin depender de servicios externos como Firebase o AWS.【F:scripts/php/scheduler.php†L598-L644】

### 3.2 Asegurar que el PDF conserve el diseño

- El template `scripts/php/automation_template.php` replica el encabezado y las tarjetas que ves en los reportes manuales (logo, colores configurados y meta‑información), y renderiza tablas y métricas distintas según el tipo de reporte programado sin apoyarse en `flexbox` ni `CSS Grid`, lo que mantiene la compatibilidad con Dompdf.【F:scripts/php/automation_template.php†L70-L705】
- Si quieres personalizar colores o tipografías puedes modificar la sección `<style>` del template. Mantén propiedades sencillas (bordes, colores de fondo, márgenes) para que el motor de Dompdf pueda renderizarlas sin generar páginas en blanco.【F:scripts/php/automation_template.php†L139-L242】

## 4. Generación y entrega de reportes sin Node.js

El objetivo principal es que cualquier persona pueda automatizar reportes usando únicamente herramientas básicas disponibles en un hosting compartido (PHP + MySQL) o, en su defecto, desde el propio navegador sin depender de servidores externos como Firebase o AWS.

- **Escenario A – Todo se ejecuta desde el navegador (modo local):**
  1. Desde `pages/reports/reportes.html` crea una automatización. Los datos se guardan en `localStorage` bajo la clave `optistock:automations:<id_empresa>` (si no existe un `id_empresa`, se usa `local`).
  2. El archivo `scripts/reports/reportes.js` ejecuta un temporizador cada minuto (`setInterval`) que revisa si ya llegó la hora de generar el reporte. Cuando corresponde:
     - Genera un PDF sencillo (sin dependencias) o un CSV en el navegador.
     - Lo almacena en `localStorage` dentro de `optistock:automationReports:<id_empresa>` para que aparezca en el historial y pueda descargarse.
  3. No se requiere backend; basta con mantener abierta la página en un navegador encendido. Es ideal para pruebas o demostraciones en equipos sin servidor.

- **Escenario B – Automatización con PHP y base de datos (hosting compartido):**
  1. **Preparar la base de datos**
     - Crea las tablas necesarias ejecutando en phpMyAdmin los archivos:
       - `docs/report-history/create_table.sql` (historial de reportes).
       - `docs/report-history/create_table_automatizaciones.sql` (programaciones).
  2. **Configurar el backend PHP**
     - Asegúrate de subir al servidor los scripts incluidos en el repositorio:
       - `scripts/php/report_history.php` (guarda/descarga reportes).
       - `scripts/php/report_automations.php` (API para CRUD de automatizaciones).
       - `scripts/php/automation_template.php` (plantilla HTML base del PDF).
       - `scripts/php/scheduler.php` (planificador que ejecuta las automatizaciones).
     - Edita las constantes de conexión (servidor, usuario, contraseña y base de datos) o extrae esas credenciales a un `config.php` local no versionado.
  3. **Sincronizar automatizaciones desde la interfaz**
     - Inicia sesión normalmente en la aplicación para que se guarde `id_empresa` en `localStorage`.
     - Crea/edita automatizaciones desde la pestaña “Reportes automáticos”.
     - `reportes.js` sincroniza automáticamente contra `report_automations.php` (se envía un JSON con todas las automatizaciones activas). No necesitas instalar Node.js ni servicios adicionales.
  4. **Programar la tarea automática con cron**
     - En el panel del hosting crea una tarea cron que ejecute cada 5 minutos el archivo PHP del planificador. Ejemplos:
       ```bash
       # Usando wget
       */5 * * * * wget -q -O - "https://tu-dominio.com/scripts/php/scheduler.php" >/dev/null 2>&1

       # Usando PHP CLI si el hosting lo permite
       */5 * * * * /usr/bin/php /home/usuario/public_html/scripts/php/scheduler.php >/dev/null 2>&1
       ```
     - `scheduler.php` consulta las automatizaciones activas cuya `proxima_ejecucion` sea menor o igual a la hora actual, genera el PDF mediante `dompdf` (si está instalado) o con el renderizador minimalista incluido y, por último, lo registra en `report_history.php`.
  5. **Notificaciones opcionales**
     - Puedes reutilizar los mecanismos existentes en el dashboard (alertas visuales) o enviar correos vía SMTP usando `mail_utils.php`. Ninguna de estas opciones requiere Node.js.

Ambos escenarios pueden convivir. Cuando hay conexión con el backend, los reportes generados automáticamente desde PHP se muestran junto con los generados en el navegador. Si el servidor no está disponible, el modo local asegura que la automatización siga funcionando sin servicios externos.

### Checklist de cumplimiento para el Escenario B

- ✅ **Planificación sin servicios externos**: `scripts/php/scheduler.php` consulta la tabla `reportes_automatizados`, respeta los periodos diario, semanal, quincenal y mensual y recalcula la siguiente ejecución tras cada corrida.
- ✅ **Diseño alineado con los reportes existentes**: la plantilla `scripts/php/automation_template.php` reutiliza la paleta configurada por empresa, incorpora el logotipo disponible y replica los componentes visuales (encabezados, tarjetas y tablas) que ya se usan en la página de reportes.
- ✅ **Datos generados automáticamente por módulo**: el scheduler agrega información de movimientos por usuario, historial cronológico, estado de áreas y zonas y solicitudes activas o resueltas durante el periodo configurado.
- ✅ **Historial centralizado**: cada archivo se guarda en `docs/report-history/files`, se registra en `reportes_historial` y se marca la ejecución en `reportes_automatizados_runs` para evitar duplicados accidentales.
- ✅ **Scripts listos para hosting compartido**: el repositorio incluye el SQL `docs/report-history/create_table_automatizaciones.sql` actualizado con la estructura `reportes_automatizados`, compatible con PHP/MySQL sin depender de Node.js, Firebase o AWS.

## 5. Seguridad y control de acceso
- Requerir autenticación antes de acceder a la página de reportes.
- Gestionar roles: usuarios estándar pueden ver sus reportes; administradores o supervisores ven todos los reportes de sus áreas.
- Validar tipo y tamaño de archivo al subir PDFs manualmente.
- Mantener bitácora de quién programa, genera o descarga un reporte.

## 6. Gestión del historial
- Filtros avanzados (fecha, área, estado, autor, tipo de reporte).
- Búsqueda por texto libre (título o descripción).
- Exportación del listado a CSV o Excel con rutas de descarga.
- Opción de archivar reportes antiguos manteniéndolos accesibles bajo una pestaña separada.

## 7. Implementación gradual sugerida
1. Crear la estructura de carpetas para almacenamiento local y la tabla/archivo de metadatos.
2. Construir la vista centralizada de reportes con filtros.
3. Implementar el módulo de subida manual con validaciones.
4. Desarrollar el planificador básico con cron o un proceso Node.js que ejecute tareas periódicas.
5. Añadir plantillas de reportes automáticos para inventario, áreas/zones y actividades de usuarios.
6. Integrar opciones de personalización (periodos personalizados, logotipo como marca de agua o pie).
7. Ajustar estilos para respetar la paleta de colores configurada y probar los flujos completos.
   - Si no cuentas con cron o PHP CLI, mantén abierta la pestaña del navegador en un equipo encendido para que el temporizador de `reportes.js` ejecute las automatizaciones en modo local.

## 8. Mantenimiento y respaldo
- Generar copias de seguridad periódicas de la carpeta de reportes y del archivo de metadatos.
- Documentar cómo agregar nuevos tipos de reportes automáticos.
- Revisar logs para asegurar que el planificador se ejecuta correctamente y solucionar posibles fallos.

Esta propuesta permite consolidar los reportes creados manualmente o de forma automática, manteniendo el uso de herramientas básicas y almacenamiento en el servidor local.

## 9. Despliegue en Hostinger (instrucciones concretas)

- Dependiendo de tu plan en Hostinger usa la opción PHP (compartido):
  1. Instala las dependencias PHP necesarias. Recomiendo usar Composer para Dompdf: `composer require dompdf/dompdf` en tu proyecto (puedes subir el `vendor/` al servidor si no tienes acceso SSH). Si no puedes instalar Dompdf, `scheduler.php` seguirá generando un PDF simple sin estilos avanzados.
  2. Sube los archivos nuevos: `scripts/php/automations.php`, `scripts/php/scheduler.php`, `scripts/php/automation_template.php` y el SQL `docs/report-history/create_table_automatizaciones.sql`.
  3. Crea la tabla `reportes_automatizados` en tu base de datos (ejecuta el SQL con phpMyAdmin usando el archivo actualizado en `docs/report-history/create_table_automatizaciones.sql`).
  4. Configura una tarea cron desde el panel de Hostinger que ejecute cada 5 minutos: `wget -q -O - "https://tu-dominio.com/scripts/php/scheduler.php" >/dev/null 2>&1` o `curl -s "https://tu-dominio.com/scripts/php/scheduler.php" >/dev/null 2>&1`.
  5. Verifica que `Dompdf` esté disponible. Si no puedes instalar Dompdf, alternativa: instalar wkhtmltopdf en el servidor (si el plan lo permite) y modificar `scheduler.php` para invocar `wkhtmltopdf` y capturar el PDF.

### 9.1 Instalar Dompdf cuando trabajas desde VS Code sincronizado con el repositorio

Si editas el proyecto desde Visual Studio Code y lo sincronizas con este repositorio (por ejemplo, usando Git o GitHub Desktop), puedes instalar Dompdf en tu computadora y luego subir la carpeta `vendor/` resultante junto con tus cambios. No necesitas Node.js ni herramientas avanzadas, solo PHP y Composer (el instalador oficial para dependencias PHP).

1. **Verifica que Composer esté instalado**
   - Abre la terminal integrada de VS Code (menú *View → Terminal*).
   - Ejecuta `composer --version`. Si ves un número de versión, ya está listo. Si no, descarga el instalador desde [https://getcomposer.org/download/](https://getcomposer.org/download/) y ejecútalo (en Windows puedes usar `composer-setup.exe`; en Linux/Mac sigue las instrucciones del sitio). Composer es una herramienta básica que corre en consola, no requiere Node.js.
2. **Instala Dompdf dentro del proyecto**
   - En la misma terminal, muévete a la carpeta raíz del proyecto (`cd /ruta/a/tu/proyecto/OptiStock`).
   - Ejecuta:
     ```bash
     composer require dompdf/dompdf
     ```
   - Composer descargará Dompdf y creará/actualizará la carpeta `vendor/` y el archivo `composer.lock` (si no existían).
3. **Sincroniza los archivos con tu repositorio**
   - Asegúrate de que `vendor/` esté incluido en `.gitignore`. Si tu hosting compartido no permite ejecutar Composer, entonces *sí* necesitas subir la carpeta `vendor/` al servidor manualmente. En ese caso, puedes crear un archivo `.gitkeep` dentro de `vendor/` para recordar subirla desde tu cliente FTP, pero evita commitear todo el `vendor/` en Git para que el repositorio se mantenga ligero.
   - Sube los cambios relevantes (`composer.json`, `composer.lock` y ajustes de configuración) a tu repositorio remoto desde VS Code.
4. **Sube Dompdf al hosting sin SSH**
   - Si tu hosting solo ofrece administrador de archivos o FTP, comprime la carpeta `vendor/` en un `.zip` (desde tu PC) y súbela al servidor dentro del mismo directorio del proyecto.
   - Descomprime el `.zip` en el servidor y verifica que la ruta `vendor/autoload.php` exista.
5. **Verifica la instalación**
   - Ejecuta en tu hosting `php -r "require 'vendor/autoload.php'; echo class_exists('Dompdf\\Dompdf') ? 'OK' : 'FAIL';"` desde la consola del panel (si está disponible) o crea un script temporal `test_dompdf.php` con:
     ```php
     <?php
     require __DIR__.'/vendor/autoload.php';
     echo class_exists('Dompdf\\Dompdf') ? 'DOMPDF OK' : 'DOMPDF NO DISPONIBLE';
     ```
   - Abre `https://tu-dominio.com/test_dompdf.php` en el navegador. Si ves `DOMPDF OK`, puedes borrar el archivo.

> **Consejo**: Si prefieres no usar Composer, descarga el paquete oficial `.zip` desde [https://github.com/dompdf/dompdf/releases](https://github.com/dompdf/dompdf/releases), descomprímelo en `vendor/dompdf/` y crea manualmente el `autoload.inc.php` siguiendo la guía incluida. Sin embargo, Composer simplifica la configuración y mantiene las versiones actualizadas sin instalar herramientas pesadas.

- Notas prácticas:
  - Guarda las credenciales de base de datos fuera del repositorio (usa un archivo `config.php` no versionado).
  - Prueba el endpoint `automations.php` con `empresa` param para ver la lista y con `POST` para crear/upsert.
  - Revisa `error_log` del hosting para depurar el `scheduler.php` si no genera PDFs.

## 10. Causa raíz y next steps

- Causa raíz: el scheduler del cliente ejecutaba programaciones futuras por un bug lógico y además el cliente guardaba automatizaciones localmente por lo que, al combinar duplicados y la ejecución incorrecta, se creaban muchos reportes.
- Fix aplicado: evita ejecutar instancias futuras y deduplica automatizaciones en el cliente. Además añadimos endpoints y un `scheduler.php` en PHP para que la generación sea centralizada.
- Next steps recomendados:
  1. Migrar las automatizaciones a la base de datos (ya implementado con `automatizaciones`), y usar el scheduler server-side.
  2. Ajustar `automation_template.php` para extraer datos reales del módulo (consultas SQL) y renderizar tablas con `report_export`-like estilo.
  3. Habilitar Dompdf o wkhtmltopdf en el servidor para obtener PDFs con la misma apariencia exacta; wkhtmltopdf suele dar mejor CSS pero requiere binario.
  4. Añadir pruebas y monitorización del cron para evitar generación masiva accidental.

