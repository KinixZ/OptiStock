# OptiStock

OptiStock es una aplicación para la gestión y administración de almacenes. Este proyecto
contiene un frontend estático en HTML/CSS y un backend que puede trabajar únicamente con PHP/MySQL,
aunque también incluye utilidades opcionales en Node.js para entornos que las necesiten.

## Instalación de dependencias

1. Asegúrese de tener [Node.js](https://nodejs.org/) instalado.
2. Instale las dependencias definidas en `package.json`:
   ```bash
   npm install
   ```
3. Si los módulos `express` y `mysql` no se instalan con el paso anterior, puede
   instalarlos manualmente:
   ```bash
   npm install express mysql
   ```

## Configuración de variables de entorno

Cree un archivo `.env` en la raíz del proyecto con los siguientes valores:

```bash
CLIENT_ID=TU_CLIENT_ID_DE_GOOGLE
DB_HOST=localhost
DB_USER=usuario
DB_PASSWORD=contrasena
DB_NAME=base_de_datos
PORT=3000
```

Ajuste cada valor según la configuración de su entorno (por ejemplo, los datos
para la conexión de MySQL o el puerto en el que se ejecutará la aplicación).

## Ejecución de la aplicación

Si deseas utilizar el servidor Node.js incluido (opcional) ejecuta:

```bash
node scripts/server/server.js
```

El backend se iniciará en `http://localhost:3000` (o en el puerto definido en
`PORT`).

### ¿No quieres usar Node.js?

- Puedes servir el frontend directamente desde tu hosting compartido o entorno local usando solo PHP/Apache.
- Todos los endpoints necesarios para reportes, historial y automatizaciones se encuentran en `scripts/php/`.
- Consulta la guía [docs/reportes_automaticos.md](docs/reportes_automaticos.md) para configurar el planificador con PHP + cron o incluso ejecutar las automatizaciones únicamente desde el navegador utilizando `localStorage`.

## Estructura del proyecto

```
OptiStock/
├── images/            # Recursos de imagen utilizados por el sitio
├── pages/             # Páginas HTML del frontend
├── scripts/           # Archivos JS y PHP para lógica de frontend y backend
├── styles/            # Hojas de estilo CSS
├── optistock.sql      # Script de base de datos
├── package.json       # Dependencias de Node.js
└── ...
```

Cada carpeta dentro de `pages/`, `scripts/` y `styles/` agrupa los recursos
correspondientes para las distintas secciones de la aplicación.
