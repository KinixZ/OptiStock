# Crear `incidencias_infraestructura` desde la consola SQL de phpMyAdmin

La siguiente guía te permite copiar y pegar la sentencia que necesitas en la pestaña **SQL** de phpMyAdmin para crear la tabla que almacenará las incidencias reportadas en cada área o zona.

1. Ingresa a phpMyAdmin, selecciona tu base de datos en el panel lateral izquierdo y haz clic en la pestaña **SQL**.
2. Copia y pega el bloque completo de código que aparece a continuación y presiona **Continuar** para ejecutar el script.

```sql
CREATE TABLE IF NOT EXISTS `incidencias_infraestructura` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `id_empresa` INT(11) NOT NULL,
  `area_id` INT(11) DEFAULT NULL,
  `zona_id` INT(11) DEFAULT NULL,
  `id_usuario_reporta` INT(11) NOT NULL,
  `id_usuario_revisa` INT(11) DEFAULT NULL,
  `descripcion` TEXT NOT NULL,
  `estado` ENUM('Pendiente', 'Revisado') NOT NULL DEFAULT 'Pendiente',
  `creado_en` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `revisado_en` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_incidencias_empresa_estado` (`id_empresa`, `estado`),
  KEY `idx_incidencias_area` (`area_id`),
  KEY `idx_incidencias_zona` (`zona_id`),
  KEY `idx_incidencias_reporta` (`id_usuario_reporta`),
  CONSTRAINT `fk_incidencias_empresa` FOREIGN KEY (`id_empresa`)
    REFERENCES `empresa` (`id_empresa`) ON DELETE CASCADE,
  CONSTRAINT `fk_incidencias_area` FOREIGN KEY (`area_id`)
    REFERENCES `areas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_incidencias_zona` FOREIGN KEY (`zona_id`)
    REFERENCES `zonas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_incidencias_usuario_reporta` FOREIGN KEY (`id_usuario_reporta`)
    REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE,
  CONSTRAINT `fk_incidencias_usuario_revisa` FOREIGN KEY (`id_usuario_revisa`)
    REFERENCES `usuario` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

> **Importante:** Ejecuta este script únicamente después de que existan las tablas `empresa`, `areas`, `zonas` y `usuario` con las columnas indicadas en las llaves foráneas y usando el motor InnoDB. Si todavía no están disponibles, puedes quitar temporalmente las cláusulas `FOREIGN KEY`, crear la tabla y añadirlas más tarde con sentencias `ALTER TABLE`.
