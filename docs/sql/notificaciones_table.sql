-- Tabla para almacenar notificaciones persistentes de la topbar
CREATE TABLE IF NOT EXISTS `notificaciones` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_empresa` INT UNSIGNED NOT NULL,
  `titulo` VARCHAR(150) NOT NULL,
  `mensaje` TEXT NOT NULL,
  `tipo_destinatario` ENUM('General', 'Rol', 'Usuario') NOT NULL DEFAULT 'General',
  `rol_destinatario` VARCHAR(60) DEFAULT NULL,
  `id_usuario_destinatario` INT UNSIGNED DEFAULT NULL,
  `id_usuario_creador` INT UNSIGNED DEFAULT NULL,
  `ruta_destino` VARCHAR(255) DEFAULT NULL,
  `estado` ENUM('Pendiente', 'Enviada', 'Leida', 'Archivada') NOT NULL DEFAULT 'Pendiente',
  `prioridad` ENUM('Baja', 'Media', 'Alta') NOT NULL DEFAULT 'Media',
  `fecha_disponible_desde` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_expira` DATETIME DEFAULT NULL,
  `creado_en` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notificaciones_empresa_fecha` (`id_empresa`, `fecha_disponible_desde`),
  KEY `idx_notificaciones_destinatario` (`tipo_destinatario`, `rol_destinatario`, `id_usuario_destinatario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
