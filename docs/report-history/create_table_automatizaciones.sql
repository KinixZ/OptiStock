-- Tabla para almacenar automatizaciones de reportes (escenario B)
-- Ejecuta este script en la consola SQL de phpMyAdmin.
CREATE TABLE IF NOT EXISTS `reportes_automatizados` (
  `uuid` varchar(64) NOT NULL,
  `id_empresa` int NOT NULL,
  `nombre` varchar(120) NOT NULL,
  `modulo` varchar(120) DEFAULT NULL,
  `formato` enum('pdf','excel') NOT NULL DEFAULT 'pdf',
  `frecuencia` enum('daily','weekly','biweekly','monthly') NOT NULL DEFAULT 'daily',
  `hora_ejecucion` time NOT NULL DEFAULT '08:00:00',
  `dia_semana` tinyint(1) DEFAULT NULL,
  `dia_mes` tinyint(2) DEFAULT NULL,
  `notas` varchar(240) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `ultimo_ejecutado` datetime DEFAULT NULL,
  `proxima_ejecucion` datetime DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp(),
  PRIMARY KEY (`uuid`),
  KEY `idx_empresa_proxima` (`id_empresa`,`proxima_ejecucion`),
  CONSTRAINT `fk_reportes_automatizados_empresa` FOREIGN KEY (`id_empresa`) REFERENCES `empresa` (`id_empresa`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
