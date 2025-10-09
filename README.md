# OptiStock

OptiStock es una aplicación para la gestión y administración de almacenes. Este proyecto
contiene un frontend estático en HTML/CSS y un backend basado en Node.js y PHP.

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

Inicie el servidor ejecutando:

```bash
node scripts/server/server.js
```

El backend se iniciará en `http://localhost:3000` (o en el puerto definido en
`PORT`).

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

## Documentación adicional

- [Programar el scheduler en Hostinger](docs/hostinger-cron-setup.md)
