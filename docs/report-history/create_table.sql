-- Tabla para almacenar las referencias a los reportes guardados localmente.
-- Ejecuta este script en la consola SQL de phpMyAdmin.
CREATE TABLE IF NOT EXISTS `reportes_historial` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` CHAR(32) NOT NULL,
  `id_empresa` INT UNSIGNED NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `storage_name` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(120) NOT NULL,
  `file_size` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `source` VARCHAR(120) NOT NULL DEFAULT '',
  `notes` VARCHAR(240) NOT NULL DEFAULT '',
  `created_on` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_on` TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_reportes_historial_uuid` (`uuid`),
  KEY `idx_reportes_historial_empresa_fecha` (`id_empresa`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
