-- Tabla para almacenar automatizaciones de reportes
CREATE TABLE IF NOT EXISTS `automatizaciones` (
  `id` varchar(64) NOT NULL,
  `id_empresa` int NOT NULL DEFAULT 0,
  `name` varchar(120) NOT NULL,
  `module` varchar(120) DEFAULT '',
  `format` enum('pdf','excel') NOT NULL DEFAULT 'pdf',
  `frequency` enum('daily','weekly','monthly') NOT NULL DEFAULT 'daily',
  `weekday` tinyint unsigned DEFAULT 1,
  `monthday` tinyint unsigned DEFAULT 1,
  `time` varchar(5) NOT NULL DEFAULT '08:00',
  `notes` varchar(240) DEFAULT '',
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `next_run_at` datetime DEFAULT NULL,
  `last_run_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_empresa_next` (`id_empresa`,`next_run_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
