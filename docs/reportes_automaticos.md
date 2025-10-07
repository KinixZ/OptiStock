# Propuesta de módulo de reportes automáticos

Este documento detalla la organización y las funciones sugeridas para la página de reportes, incluyendo la generación automática de reportes con periodos personalizados. Se busca mantener el uso de herramientas básicas y almacenamiento local.

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
