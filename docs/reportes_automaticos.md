# Propuesta de módulo de reportes automáticos

Este documento detalla la organización y las funciones sugeridas para la página de reportes, incluyendo la generación automática de reportes con periodos personalizados. Se busca mantener el uso de herramientas básicas y almacenamiento local.

> **Implementación actual**: el historial centralizado ya guarda de forma automática cada PDF o Excel generado en los módulos principales dentro de `docs/report-history/`. Los archivos permanecen disponibles por 60 días y se sirven a través del script PHP local (`/scripts/php/report_history.php`). La página `pages/reports/reportes.html` ofrece filtros, descargas y carga manual de archivos adicionales.

> **Registro en base de datos**: además del archivo JSON local, cada reporte se registra en la tabla `reportes_historial` para poder filtrar por empresa en consultas SQL. Puedes crearla desde phpMyAdmin copiando el contenido de `docs/report-history/create_table.sql` en la consola SQL y ejecutándolo.

### Script SQL para `reportes_automatizaciones`

Si aún no tienes la tabla donde se guardan las configuraciones de los reportes programados, copia y ejecuta el siguiente bloque en la consola SQL de phpMyAdmin. La definición usa únicamente características estándar de MySQL, por lo que funciona sin depender de servicios externos como Firebase o AWS.

```sql
CREATE TABLE `reportes_automatizaciones` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `id_empresa` INT NOT NULL,
  `nombre` VARCHAR(120) NOT NULL,
  `modulo` VARCHAR(120) DEFAULT NULL,
  `formato` ENUM('pdf','excel') NOT NULL DEFAULT 'pdf',
  `frecuencia` ENUM('daily','weekly','biweekly','monthly') NOT NULL DEFAULT 'daily',
  `hora` TIME NOT NULL DEFAULT '08:00:00',
  `dia_semana` TINYINT DEFAULT NULL,
  `dia_mes` TINYINT DEFAULT NULL,
  `notas` TEXT,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `proxima_ejecucion` DATETIME DEFAULT NULL,
  `ultima_ejecucion` DATETIME DEFAULT NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reportes_auto_empresa` (`id_empresa`),
  KEY `idx_reportes_auto_proxima` (`proxima_ejecucion`),
  CONSTRAINT `fk_reportes_auto_empresa`
    FOREIGN KEY (`id_empresa`) REFERENCES `empresa` (`id_empresa`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

> 💡 **Nota**: si prefieres que la tabla se llame `reportes_automatizacion`, simplemente sustituye el nombre en la sentencia `CREATE TABLE` y en las claves/índices asociados antes de ejecutarla.

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

## 4. Generación y entrega de reportes
- **Motor de generación**:
  - Script local (por ejemplo, Node.js con bibliotecas básicas como `pdf-lib` o `jspdf`) que toma los datos y arma el PDF con el estilo definido.
  - Incorporar la marca de agua o logotipo al renderizado del PDF.
- **Planificador**:
  - Uso de `cron` del sistema operativo o un programador interno simple que revise cada hora si existe un reporte pendiente por generar según su configuración.
  - Tras la generación, registrar el reporte en el historial con su metadato y ruta.
- **Notificaciones**:
  - Mostrar alertas dentro del dashboard o enviar correos mediante un servidor SMTP local si se dispone.

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

## 8. Mantenimiento y respaldo
- Generar copias de seguridad periódicas de la carpeta de reportes y del archivo de metadatos.
- Documentar cómo agregar nuevos tipos de reportes automáticos.
- Revisar logs para asegurar que el planificador se ejecuta correctamente y solucionar posibles fallos.

Esta propuesta permite consolidar los reportes creados manualmente o de forma automática, manteniendo el uso de herramientas básicas y almacenamiento en el servidor local.
