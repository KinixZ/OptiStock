-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1:3306
-- Tiempo de generación: 07-10-2025 a las 23:26:30
-- Versión del servidor: 11.8.3-MariaDB-log
-- Versión de PHP: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `u296155119_OptiStock`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `areas`
--

CREATE TABLE `areas` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `ancho` decimal(10,2) NOT NULL,
  `alto` decimal(10,2) NOT NULL,
  `largo` decimal(10,2) NOT NULL,
  `volumen` decimal(15,2) NOT NULL,
  `capacidad_utilizada` decimal(15,2) NOT NULL DEFAULT 0.00,
  `porcentaje_ocupacion` decimal(5,2) NOT NULL DEFAULT 0.00,
  `productos_registrados` int(11) NOT NULL DEFAULT 0,
  `id_empresa` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `areas`
--

INSERT INTO `areas` (`id`, `nombre`, `descripcion`, `ancho`, `alto`, `largo`, `volumen`, `capacidad_utilizada`, `porcentaje_ocupacion`, `productos_registrados`, `id_empresa`) VALUES
(21, 'area', 'la area', 7.00, 2.50, 6.00, 105.00, 1.30, 1.24, 2, 21),
(22, 'Area 1', 'Es el area 1', 5.00, 2.00, 2.00, 20.00, 0.00, 0.00, 0, 24),
(23, 'Papeleria', 'ES una papeleria', 5.00, 2.00, 5.00, 50.00, 0.00, 0.00, 0, 23),
(24, 'El patolicismo', 'Una religion de patos', 99999999.99, 99999999.99, 99999999.99, 9999999999999.99, 0.00, 0.00, 0, 28),
(25, 'Papeleria', 'Descripcion', 8.00, 2.00, 5.00, 80.00, 0.00, 0.00, 0, 24),
(26, 'otra area', 'area dos', 20.00, 4.00, 14.00, 1120.00, 0.04, 0.00, 2, 21),
(28, 'Area1', 'area1', 20.00, 3.00, 30.00, 1800.00, 0.00, 0.00, 0, 30),
(30, 'Papeleria Ely', 'es una papeleria', 5.00, 2.00, 4.00, 40.00, 0.05, 0.13, 1, 24),
(31, 'nueva area', 'otra area', 10.00, 3.00, 10.00, 300.00, 0.00, 0.00, 0, 21);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `busquedas_recientes_empresa`
--

CREATE TABLE `busquedas_recientes_empresa` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `id_empresa` int(11) NOT NULL,
  `termino` varchar(255) NOT NULL,
  `ultima_busqueda` datetime NOT NULL DEFAULT current_timestamp(),
  `total_coincidencias` int(10) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `busquedas_recientes_empresa`
--

INSERT INTO `busquedas_recientes_empresa` (`id`, `id_empresa`, `termino`, `ultima_busqueda`, `total_coincidencias`) VALUES
(1, 21, 'Usuarios', '2025-10-07 22:08:26', 5),
(2, 21, 'Ver todo', '2025-10-07 22:21:26', 4),
(3, 21, 'Áreas', '2025-10-07 22:08:30', 3),
(5, 21, 'Movimientos', '2025-10-07 22:21:29', 4);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `categorias`
--

CREATE TABLE `categorias` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `empresa_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `categorias`
--

INSERT INTO `categorias` (`id`, `nombre`, `descripcion`, `empresa_id`) VALUES
(24, 'Categoria 1', '21321321', 23),
(25, 'no', 'categoria equis', 21),
(27, 'Lapices', 'si', 23),
(28, 'Casco pastafarista', 'Un colador de espaguetis', 28),
(31, 'plastico', 'plasticos', 21),
(32, 'hoja', 'papeles', 21),
(33, 'categoria 1', 'cat1', 24),
(34, 'papeles', 'tipos de papeles', 24);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `configuracion_empresa`
--

CREATE TABLE `configuracion_empresa` (
  `id_empresa` int(11) NOT NULL,
  `color_sidebar` varchar(20) DEFAULT NULL,
  `color_topbar` varchar(20) DEFAULT NULL,
  `orden_sidebar` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`orden_sidebar`)),
  `fecha_actualizacion` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `configuracion_empresa`
--

INSERT INTO `configuracion_empresa` (`id_empresa`, `color_sidebar`, `color_topbar`, `orden_sidebar`, `fecha_actualizacion`) VALUES
(21, '#454b52', '#454b52', '[\"inicio\",\"area_almac_v2\\/gestion_areas_zonas.html\",\"gest_inve\\/inventario_basico.html\",\"admin_usuar\\/administracion_usuarios.html\",\"reports\\/reportes.html\",\"control_log\\/log.html\",\"account_suscrip\\/account_suscrip.html\"]', '2025-10-07 16:08:09'),
(22, '#ff6b6b', '#2b7a78', '[\"area_almac_v2\\/gestion_areas_zonas.html\",\"gest_inve\\/inventario_basico.html\",\"account_suscrip\\/account_suscrip.html\",\"inicio\",\"admin_usuar\\/administracion_usuarios.html\",\"reports\\/reportes.html\",\"control_log\\/log.html\"]', '2025-08-30 02:10:16'),
(23, '#8e44ad', '#2980b9', '[\"inicio\",\"area_almac_v2\\/gestion_areas_zonas.html\",\"gest_inve\\/inventario_basico.html\",\"admin_usuar\\/administracion_usuarios.html\",\"reports\\/reportes.html\",\"control_log\\/log.html\",\"account_suscrip\\/account_suscrip.html\"]', '2025-08-04 13:47:24'),
(24, '#454b52', '#454b52', '[\"area_almac_v2\\/gestion_areas_zonas.html\",\"gest_inve\\/inventario_basico.html\",\"inicio\",\"admin_usuar\\/administracion_usuarios.html\",\"reports\\/reportes.html\",\"control_log\\/log.html\",\"account_suscrip\\/account_suscrip.html\"]', '2025-10-02 19:24:35'),
(30, '#ffa41b', '#6c63ff', '[\"inicio\",\"area_almac_v2\\/gestion_areas_zonas.html\",\"gest_inve\\/inventario_basico.html\",\"admin_usuar\\/administracion_usuarios.html\",\"reports\\/reportes.html\",\"control_log\\/log.html\",\"account_suscrip\\/account_suscrip.html\"]', '2025-09-03 16:23:06'),
(31, '#0e9aa7', '#454b52', '[\"inicio\",\"area_almac_v2\\/gestion_areas_zonas.html\",\"gest_inve\\/inventario_basico.html\",\"admin_usuar\\/administracion_usuarios.html\",\"reports\\/reportes.html\",\"control_log\\/log.html\",\"account_suscrip\\/account_suscrip.html\"]', '2025-09-05 00:29:06'),
(32, '#6c63ff', '#ff66c4', '[\"inicio\",\"area_almac_v2\\/gestion_areas_zonas.html\",\"gest_inve\\/inventario_basico.html\",\"admin_usuar\\/administracion_usuarios.html\",\"reports\\/reportes.html\",\"control_log\\/log.html\",\"account_suscrip\\/account_suscrip.html\"]', '2025-09-10 16:12:51');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `empresa`
--

CREATE TABLE `empresa` (
  `id_empresa` int(11) NOT NULL,
  `nombre_empresa` varchar(150) NOT NULL,
  `logo_empresa` varchar(255) DEFAULT NULL,
  `sector_empresa` enum('Industrial','Comercial','Servicios','agropecuario','tecnol?gico','financiero','Construcci?n') DEFAULT NULL,
  `usuario_creador` int(11) DEFAULT NULL,
  `fecha_registro` timestamp NOT NULL DEFAULT current_timestamp(),
  `capacidad_maxima_m3` decimal(15,2) NOT NULL DEFAULT 0.00,
  `umbral_alerta_capacidad` decimal(5,2) NOT NULL DEFAULT 90.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `empresa`
--

INSERT INTO `empresa` (`id_empresa`, `nombre_empresa`, `logo_empresa`, `sector_empresa`, `usuario_creador`, `fecha_registro`, `capacidad_maxima_m3`, `umbral_alerta_capacidad`) VALUES
(21, 'Discocks - CDs y Vinilos', '/images/logos/logo_21_1755907312.png', 'Comercial', 57, '2025-06-26 19:29:13', 0.00, 90.00),
(22, 'empresa', NULL, 'Industrial', 58, '2025-07-01 01:31:07', 0.00, 90.00),
(23, 'afwfqf', NULL, 'Industrial', 33, '2025-07-01 01:45:04', 0.00, 90.00),
(24, 'EL KINI CORP', '/images/logos/logo_24_1757520273.jpeg', 'Industrial', 60, '2025-07-01 01:45:36', 0.00, 90.00),
(25, 'elkini', NULL, 'Industrial', 56, '2025-07-01 13:17:34', 0.00, 90.00),
(26, 'Salchichas pepe', NULL, 'Comercial', 83, '2025-07-01 14:28:13', 0.00, 90.00),
(27, 'ROMO\'S', NULL, '', 91, '2025-08-02 14:54:20', 0.00, 90.00),
(28, 'Papamovil.net', NULL, '', 93, '2025-08-04 17:06:27', 0.00, 90.00),
(29, 'Optistock', NULL, 'Servicios', 97, '2025-08-08 04:18:41', 0.00, 90.00),
(30, 'KInicorp', '/images/logos/logo_1756916306.jpg', 'Servicios', 101, '2025-09-03 16:18:26', 0.00, 90.00),
(31, 'Discos de Vinilo y CD', NULL, 'Comercial', 102, '2025-09-05 00:27:10', 0.00, 90.00),
(32, 'Empresa.exe', NULL, '', 113, '2025-09-10 16:12:08', 0.00, 90.00),
(33, 'Ely', NULL, 'Comercial', 116, '2025-10-02 19:44:57', 0.00, 90.00);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `historial_busquedas`
--

CREATE TABLE `historial_busquedas` (
  `id` int(11) NOT NULL,
  `id_empresa` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `termino` varchar(255) NOT NULL,
  `fecha_busqueda` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `historial_busquedas`
--

INSERT INTO `historial_busquedas` (`id`, `id_empresa`, `id_usuario`, `termino`, `fecha_busqueda`) VALUES
(1, 21, 57, 'Usuarios', '2025-10-07 22:08:09'),
(2, 21, 57, 'Ver todo', '2025-10-07 22:08:10'),
(3, 21, 57, 'Áreas', '2025-10-07 22:08:12'),
(4, 21, 57, 'Usuarios', '2025-10-07 22:08:20'),
(5, 21, 57, 'Movimientos', '2025-10-07 22:08:21'),
(6, 21, 57, 'Usuarios', '2025-10-07 22:08:22'),
(7, 21, 57, 'Usuarios', '2025-10-07 22:08:25'),
(8, 21, 57, 'Usuarios', '2025-10-07 22:08:26'),
(9, 21, 57, 'Movimientos', '2025-10-07 22:08:27'),
(10, 21, 57, 'Áreas', '2025-10-07 22:08:28'),
(11, 21, 57, 'Ver todo', '2025-10-07 22:08:28'),
(12, 21, 57, 'Ver todo', '2025-10-07 22:08:29'),
(13, 21, 57, 'Áreas', '2025-10-07 22:08:30'),
(14, 21, 57, 'Movimientos', '2025-10-07 22:21:25'),
(15, 21, 57, 'Ver todo', '2025-10-07 22:21:26'),
(16, 21, 57, 'Movimientos', '2025-10-07 22:21:29');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `log_control`
--

CREATE TABLE `log_control` (
  `id` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `modulo` varchar(100) NOT NULL,
  `accion` varchar(255) NOT NULL,
  `fecha` date NOT NULL,
  `hora` time NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `log_control`
--

INSERT INTO `log_control` (`id`, `id_usuario`, `modulo`, `accion`, `fecha`, `hora`) VALUES
(1, 57, 'Usuarios', 'Registro de usuario empresa: carmen.alicia@gmail.com', '2025-09-09', '00:14:22'),
(2, 57, 'Usuarios', 'Registro de usuario empresa: hector.lung@gmail.com', '2025-09-09', '01:54:52'),
(3, 60, 'Usuarios', 'Registro de usuario empresa: vipoca7841@certve.com', '2025-09-10', '15:55:38'),
(4, 113, 'Usuarios', 'Registro de usuario: lumminary2@gmail.com', '2025-09-10', '16:08:45'),
(5, 57, 'Usuarios', 'Solicitud de código de recuperación de contraseña', '2025-09-15', '20:46:16'),
(6, 57, 'Usuarios', 'Código de recuperación validado', '2025-09-15', '20:46:34'),
(7, 57, 'Usuarios', 'Recuperación de contraseña completada', '2025-09-15', '20:47:07'),
(8, 57, 'Usuarios', 'Solicitud de código de recuperación de contraseña', '2025-09-15', '22:20:14'),
(9, 57, 'Usuarios', 'Código de recuperación validado', '2025-09-15', '22:20:29'),
(10, 57, 'Usuarios', 'Recuperación de contraseña completada', '2025-09-15', '22:20:39'),
(11, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-09-16', '02:45:56'),
(12, 114, 'Usuarios', 'Actualización de datos por registro con Google', '2025-09-16', '17:12:21'),
(13, 57, 'Inventario', 'Egreso manual de 4 unidad(es) del producto 41', '2025-09-17', '02:06:45'),
(14, 57, 'Inventario', 'Ingreso manual de 6 unidad(es) del producto 41', '2025-09-17', '02:07:49'),
(15, 57, 'Áreas', 'Creación de área: area nueva', '2025-09-17', '05:06:51'),
(16, 57, 'Zonas', 'Creación de zona: zona nueva', '2025-09-17', '05:07:39'),
(17, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-09-17', '05:09:49'),
(18, 57, 'Productos', 'Actualización de producto ID: 41', '2025-09-17', '19:51:08'),
(19, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-09-17', '21:53:21'),
(20, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-09-17', '21:53:36'),
(21, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-09-17', '21:55:35'),
(22, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-09-17', '22:26:14'),
(23, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-09-17', '22:26:56'),
(24, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-09-17', '22:28:32'),
(25, 57, 'Áreas', 'Eliminación de área ID: 29', '2025-09-17', '22:32:54'),
(26, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-09-17', '22:33:23'),
(27, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-09-18', '15:16:04'),
(28, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-09-18', '15:21:12'),
(29, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-09-18', '15:21:32'),
(30, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-09-18', '19:16:55'),
(31, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-09-18', '19:17:22'),
(32, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-09-18', '19:58:58'),
(33, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-09-18', '20:08:57'),
(34, 110, 'Configuración', 'Actualización de configuración para empresa 21', '2025-09-18', '20:22:59'),
(35, 110, 'Subcategorías', 'Creación de subcategoría: platos', '2025-09-18', '20:23:46'),
(36, 110, 'Productos', 'Creación de producto: platos unicel royal prestige (ID 46)', '2025-09-18', '20:24:26'),
(37, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-09-20', '19:43:12'),
(38, 57, 'Productos', 'Creación de producto: producto (ID 47)', '2025-09-20', '20:59:43'),
(39, 57, 'Subcategorías', 'Eliminación de subcategoría ID: 24', '2025-09-20', '22:31:08'),
(40, 57, 'Subcategorías', 'Eliminación de subcategoría ID: 31', '2025-09-20', '22:31:13'),
(41, 57, 'Subcategorías', 'Eliminación de subcategoría ID: 32', '2025-09-20', '22:31:19'),
(42, 111, 'Usuarios', 'Actualización de usuario: 111', '2025-09-20', '22:38:08'),
(43, 111, 'Usuarios', 'Actualización de usuario: 111', '2025-09-20', '22:40:01'),
(44, 111, 'Usuarios', 'Actualización de usuario: 111', '2025-09-20', '22:41:22'),
(45, 57, 'Usuarios', 'Desactivación de usuario empresa: 110', '2025-09-22', '16:35:13'),
(46, 57, 'Usuarios', 'Activación de usuario empresa: 110', '2025-09-22', '16:36:31'),
(47, 57, 'Inventario', 'Egreso manual de 20 unidad(es) del producto 45', '2025-09-22', '22:40:58'),
(48, 57, 'Inventario', 'Ingreso manual de 3 unidad(es) del producto 47', '2025-09-22', '22:41:10'),
(49, 57, 'Inventario', 'Egreso manual de 10 unidad(es) del producto 45', '2025-09-22', '23:18:49'),
(50, 57, 'Inventario', 'Ingreso de 30 unidad(es) del producto 46', '2025-09-23', '00:08:53'),
(51, 57, 'Inventario', 'Egreso de 60 unidad(es) del producto 46', '2025-09-23', '00:09:02'),
(52, 60, 'Configuración', 'Actualización de configuración para empresa 24', '2025-09-23', '20:27:11'),
(53, 60, 'Configuración', 'Actualización de configuración para empresa 24', '2025-09-23', '20:27:16'),
(54, 60, 'Configuración', 'Actualización de configuración para empresa 24', '2025-09-23', '20:27:24'),
(55, 60, 'Productos', 'Creación de producto: Objeto de prueba (ID 48)', '2025-09-23', '20:29:20'),
(56, 60, 'Configuración', 'Actualización de configuración para empresa 24', '2025-09-24', '01:39:00'),
(57, 57, 'Inventario', 'Ingreso de 1 unidad(es) del producto 45', '2025-09-25', '17:55:49'),
(58, 57, 'Inventario', 'Ingreso de 1 unidad(es) del producto 45', '2025-09-25', '17:56:06'),
(59, 57, 'Inventario', 'Ingreso de 13 unidad(es) del producto 45', '2025-09-25', '18:13:42'),
(60, 57, 'Inventario', 'Ingreso de 2 unidad(es) del producto 41', '2025-09-25', '18:17:05'),
(61, 57, 'Inventario', 'Ingreso de 1 unidad(es) del producto 41', '2025-09-25', '18:28:42'),
(62, 57, 'Inventario', 'Egreso de 2 unidad(es) del producto 41', '2025-09-25', '18:29:04'),
(63, 57, 'Inventario', 'Ingreso de 2 unidad(es) del producto 47', '2025-09-25', '20:06:57'),
(64, 57, 'Inventario', 'Egreso de 1 unidad(es) del producto 46', '2025-09-25', '20:07:38'),
(65, 57, 'Categorías', 'Actualización de categoría ID: 25', '2025-09-25', '21:03:14'),
(66, 57, 'Categorías', 'Actualización de categoría ID: 25', '2025-09-25', '21:03:23'),
(67, 57, 'Inventario', 'Ingreso de 1 unidad(es) del producto 46', '2025-09-26', '23:23:51'),
(68, 57, 'Inventario', 'Ingreso de 2 unidad(es) del producto 46', '2025-09-26', '23:24:02'),
(69, 57, 'Inventario', 'Ingreso de 1 unidad(es) del producto 41', '2025-09-27', '00:10:59'),
(70, 57, 'Inventario', 'Egreso de 3 unidad(es) del producto 46', '2025-09-27', '00:11:21'),
(71, 57, 'Categorías', 'Actualización de categoría ID: 25', '2025-09-27', '00:24:21'),
(72, 57, 'Categorías', 'Actualización de categoría ID: 32', '2025-09-27', '00:24:41'),
(73, 57, 'Inventario', 'Ingreso de 2 unidad(es) del producto 46', '2025-09-28', '05:12:55'),
(74, 57, 'Usuarios', 'Desactivación de usuario empresa: 110', '2025-09-28', '20:19:44'),
(75, 57, 'Usuarios', 'Activación de usuario empresa: 110', '2025-09-28', '20:19:48'),
(76, 57, 'Productos', 'Eliminación de producto ID: 47 y 1 movimiento(s) asociados', '2025-09-28', '21:22:45'),
(77, 57, 'Inventario', 'Ingreso de 9 unidad(es) del producto 46', '2025-09-28', '23:43:00'),
(78, 57, 'Inventario', 'Ingreso de 1 unidad(es) del producto 41', '2025-09-28', '23:43:19'),
(79, 57, 'Productos', 'Creación de producto: tapas de plastico (ID 49)', '2025-09-29', '00:15:31'),
(80, 60, 'Inventario', 'Ingreso de 2 unidad(es) del producto 48', '2025-10-01', '02:56:46'),
(81, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-10-01', '15:52:32'),
(82, 57, 'Empresas', 'Actualización de empresa ID: 21', '2025-10-01', '15:53:05'),
(83, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-10-01', '15:59:02'),
(84, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-10-01', '15:59:29'),
(85, 115, 'Inventario', 'Egreso de 1 unidad(es) del producto 48', '2025-10-01', '16:13:46'),
(86, 57, 'Inventario', 'Ingreso de 1 unidad(es) del producto 41', '2025-10-01', '16:14:31'),
(87, 57, 'Inventario', 'Egreso de 3 unidad(es) del producto 41', '2025-10-01', '16:24:03'),
(88, 57, 'Productos', 'Actualización de producto ID: 45', '2025-10-02', '00:34:03'),
(89, 57, 'Productos', 'Actualización de producto ID: 41', '2025-10-02', '00:34:53'),
(90, 57, 'Productos', 'Eliminación de producto ID: 49', '2025-10-02', '00:35:05'),
(91, 57, 'Productos', 'Creación de producto: Perfil Ventana M4 roble (ID 50)', '2025-10-02', '00:36:37'),
(92, 57, 'Inventario', 'Ingreso de 20 unidad(es) del producto 50', '2025-10-02', '00:38:08'),
(93, 57, 'Inventario', 'Ingreso de 5 unidad(es) del producto 50', '2025-10-02', '00:38:27'),
(94, 57, 'Inventario', 'Ingreso de 1 unidad(es) del producto 50', '2025-10-02', '00:38:49'),
(95, 57, 'Inventario', 'Ingreso de 1 unidad(es) del producto 50', '2025-10-02', '00:38:54'),
(96, 57, 'Inventario', 'Ingreso de 1 unidad(es) del producto 50', '2025-10-02', '00:53:25'),
(97, 57, 'Inventario', 'Egreso de 30 unidad(es) del producto 50', '2025-10-02', '17:04:16'),
(98, 57, 'Inventario', 'Ingreso de 30 unidad(es) del producto 50', '2025-10-02', '17:43:53'),
(99, 60, 'Configuración', 'Actualización de configuración para empresa 24', '2025-10-02', '19:24:35'),
(100, 60, 'Subcategorías', 'Creación de subcategoría: china', '2025-10-02', '19:28:19'),
(101, 60, 'Áreas', 'Creación de área: Papeleria Ely', '2025-10-02', '19:31:30'),
(102, 60, 'Zonas', 'Creación de zona: vitrina', '2025-10-02', '19:32:51'),
(103, 60, 'Productos', 'Creación de producto: cyuaderno norma (ID 51)', '2025-10-02', '19:36:18'),
(104, 116, 'Usuarios', 'Actualización de datos por registro con Google', '2025-10-02', '19:44:11'),
(105, 116, 'Empresas', 'Registro de empresa: Ely', '2025-10-02', '19:44:57'),
(106, 117, 'Usuarios', 'Registro de usuario: mario.garciadelacruz@forvia.com', '2025-10-02', '19:46:55'),
(107, 117, 'Usuarios', 'Reenvío de código de verificación de cuenta', '2025-10-02', '19:47:52'),
(108, 57, 'Productos', 'Creación de producto: carro (ID 52)', '2025-10-02', '23:47:30'),
(109, 57, 'Productos', 'Actualización de producto ID: 52', '2025-10-02', '23:49:02'),
(110, 57, 'Productos', 'Actualización de producto ID: 52', '2025-10-03', '00:18:16'),
(111, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-10-03', '00:39:22'),
(112, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-10-03', '00:41:18'),
(113, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-10-03', '18:20:33'),
(114, 57, 'Inventario', 'Ingreso de 1 unidad(es) del producto 41', '2025-10-03', '22:28:24'),
(115, 57, 'Inventario', 'Ingreso de 1 unidad(es) del producto 41', '2025-10-03', '22:28:34'),
(116, 57, 'Inventario', 'Ingreso de 9 unidad(es) del producto 52', '2025-10-03', '23:36:45'),
(117, 57, 'Productos', 'Eliminación de producto ID: 52 y 1 movimiento(s) asociados', '2025-10-03', '23:37:12'),
(118, 57, 'Inventario', 'Egreso de 2 unidad(es) del producto 41', '2025-10-03', '23:37:55'),
(119, 57, 'Inventario', 'Ingreso de 2 unidad(es) del producto 41', '2025-10-04', '00:13:24'),
(120, 57, 'Productos', 'Actualización de producto ID: 46', '2025-10-04', '00:33:25'),
(121, 57, 'Usuarios', 'Registro de usuario empresa: supervisor@gmail.com', '2025-10-04', '19:42:00'),
(122, 119, 'Inventario', 'Ingreso de 1 unidad(es) del producto 41', '2025-10-04', '19:43:10'),
(123, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-10-04', '20:44:22'),
(124, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-10-04', '20:44:31'),
(125, 57, 'Inventario', 'Egreso de 20 unidad(es) del producto 45', '2025-10-05', '00:44:52'),
(126, 57, 'Inventario', 'Ingreso de 30 unidad(es) del producto 50', '2025-10-05', '00:45:11'),
(127, 57, 'Inventario', 'Egreso de 60 unidad(es) del producto 50', '2025-10-05', '00:45:28'),
(128, 57, 'Productos', 'Actualización de producto ID: 41', '2025-10-05', '00:46:32'),
(129, 57, 'Áreas', 'Actualización de área ID: 21', '2025-10-05', '00:46:55'),
(130, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-10-05', '00:57:13'),
(131, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-10-07', '16:08:09'),
(132, 57, 'Reportes', 'Eliminó reporte: usuarios_empresa.pdf', '2025-10-07', '18:01:35'),
(133, 57, 'Reportes', 'Eliminó reporte: logs.pdf', '2025-10-07', '18:01:40'),
(134, 57, 'Reportes', 'Eliminó reporte: usuarios_empresa.pdf', '2025-10-07', '18:01:46'),
(135, 57, 'Reportes', 'Eliminó reporte: usuarios_empresa.pdf', '2025-10-07', '18:01:50'),
(136, 57, 'Reportes', 'Eliminó reporte: usuarios_empresa.xlsx', '2025-10-07', '18:01:54'),
(137, 57, 'Reportes', 'Eliminó reporte: inventario_productos.pdf', '2025-10-07', '18:01:59'),
(138, 57, 'Reportes', 'Eliminó reporte: usuarios_empresa.pdf', '2025-10-07', '18:02:03'),
(139, 57, 'Reportes', 'Eliminó reporte: inventario_productos.xlsx', '2025-10-07', '18:02:08'),
(140, 57, 'Reportes', 'Eliminó reporte: usuarios_empresa.pdf', '2025-10-07', '18:06:13'),
(141, 57, 'Áreas', 'Creación de área: nueva area', '2025-10-07', '21:03:02'),
(142, 57, 'Inventario', 'Ingreso de 5 unidad(es) del producto 50', '2025-10-07', '22:14:24'),
(143, 57, 'Inventario', 'Egreso de 4 unidad(es) del producto 45', '2025-10-07', '22:14:30'),
(144, 57, 'Inventario', 'Egreso de 10 unidad(es) del producto 46', '2025-10-07', '22:14:35'),
(145, 57, 'Inventario', 'Ingreso de 2 unidad(es) del producto 46', '2025-10-07', '22:14:40');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `movimientos`
--

CREATE TABLE `movimientos` (
  `id` int(11) NOT NULL,
  `empresa_id` int(11) NOT NULL,
  `producto_id` int(11) NOT NULL,
  `tipo` enum('ingreso','egreso') NOT NULL,
  `cantidad` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `fecha_movimiento` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `movimientos`
--

INSERT INTO `movimientos` (`id`, `empresa_id`, `producto_id`, `tipo`, `cantidad`, `id_usuario`, `fecha_movimiento`) VALUES
(1, 21, 46, 'ingreso', 30, 57, '2025-09-23 00:08:53'),
(2, 21, 46, 'egreso', 60, 57, '2025-09-23 00:09:02'),
(3, 21, 45, 'ingreso', 1, 57, '2025-09-25 17:55:49'),
(4, 21, 45, 'ingreso', 1, 57, '2025-09-25 17:56:06'),
(5, 21, 45, 'ingreso', 13, 57, '2025-09-25 18:13:42'),
(6, 21, 41, 'ingreso', 2, 57, '2025-09-25 18:17:05'),
(7, 21, 41, 'ingreso', 1, 57, '2025-09-25 18:28:42'),
(8, 21, 41, 'egreso', 2, 57, '2025-09-25 18:29:04'),
(10, 21, 46, 'egreso', 1, 57, '2025-09-25 20:07:38'),
(11, 21, 46, 'ingreso', 1, 57, '2025-09-26 23:23:51'),
(12, 21, 46, 'ingreso', 2, 57, '2025-09-26 23:24:02'),
(13, 21, 41, 'ingreso', 1, 57, '2025-09-27 00:10:59'),
(14, 21, 46, 'egreso', 3, 57, '2025-09-27 00:11:21'),
(15, 21, 46, 'ingreso', 2, 57, '2025-09-28 05:12:55'),
(16, 21, 46, 'ingreso', 9, 57, '2025-09-28 23:43:00'),
(17, 21, 41, 'ingreso', 1, 57, '2025-09-28 23:43:19'),
(18, 24, 48, 'ingreso', 2, 60, '2025-10-01 02:56:46'),
(19, 24, 48, 'egreso', 1, 115, '2025-10-01 16:13:46'),
(20, 21, 41, 'ingreso', 1, 57, '2025-10-01 16:14:31'),
(21, 21, 41, 'egreso', 3, 57, '2025-10-01 16:24:03'),
(22, 21, 50, 'ingreso', 20, 57, '2025-10-02 00:38:08'),
(23, 21, 50, 'ingreso', 5, 57, '2025-10-02 00:38:27'),
(24, 21, 50, 'ingreso', 1, 57, '2025-10-02 00:38:49'),
(25, 21, 50, 'ingreso', 1, 57, '2025-10-02 00:38:54'),
(26, 21, 50, 'ingreso', 1, 57, '2025-10-02 00:53:24'),
(27, 21, 50, 'egreso', 30, 57, '2025-10-02 17:04:16'),
(28, 21, 50, 'ingreso', 30, 57, '2025-10-02 17:43:53'),
(29, 21, 41, 'ingreso', 1, 57, '2025-10-03 22:28:24'),
(30, 21, 41, 'ingreso', 1, 57, '2025-10-03 22:28:34'),
(32, 21, 41, 'egreso', 2, 57, '2025-10-03 23:37:55'),
(33, 21, 41, 'ingreso', 2, 57, '2025-10-04 00:13:24'),
(34, 21, 41, 'ingreso', 1, 119, '2025-10-04 19:43:10'),
(35, 21, 45, 'egreso', 20, 57, '2025-10-05 00:44:52'),
(36, 21, 50, 'ingreso', 30, 57, '2025-10-05 00:45:11'),
(37, 21, 50, 'egreso', 60, 57, '2025-10-05 00:45:28'),
(38, 21, 50, 'ingreso', 5, 57, '2025-10-07 22:14:24'),
(39, 21, 45, 'egreso', 4, 57, '2025-10-07 22:14:30'),
(40, 21, 46, 'egreso', 10, 57, '2025-10-07 22:14:35'),
(41, 21, 46, 'ingreso', 2, 57, '2025-10-07 22:14:40');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `notificaciones`
--

CREATE TABLE `notificaciones` (
  `id` int(11) NOT NULL,
  `id_empresa` int(11) NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `mensaje` text NOT NULL,
  `tipo_destinatario` enum('General','Rol','Usuario') NOT NULL DEFAULT 'General',
  `rol_destinatario` enum('Administrador','Supervisor','Almacenista','Mantenimiento','Etiquetador') DEFAULT NULL,
  `id_usuario_destinatario` int(11) DEFAULT NULL,
  `id_usuario_creador` int(11) DEFAULT NULL,
  `ruta_destino` varchar(255) DEFAULT NULL,
  `estado` enum('Pendiente','Enviada','Leida','Archivada') NOT NULL DEFAULT 'Pendiente',
  `prioridad` enum('Baja','Media','Alta') NOT NULL DEFAULT 'Media',
  `fecha_disponible_desde` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_expira` datetime DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pass_resets`
--

CREATE TABLE `pass_resets` (
  `id_pass_reset` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `token` varchar(64) NOT NULL,
  `expira` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `pass_resets`
--

INSERT INTO `pass_resets` (`id_pass_reset`, `id_usuario`, `token`, `expira`) VALUES
(1, 57, 'c6a2c587d2c82af27bde8ddbc0cab735de2d332ecb732510d265d6b7bfb52c4c', '2025-04-18 05:17:25'),
(2, 57, '4f455f944adb286f7739f69449e790d5414029a3d7cd265c29d4a5d03d02fecb', '2025-04-18 05:18:43'),
(3, 56, '3e22bddaa45722e338a6f476ff1023b356f0cb722549ac9fc229db23b63f060b', '2025-04-18 05:19:08'),
(4, 57, '90c34c3f7985339b833d1e0351e4cf274b23776b79e485c68d9ba6ea17a99beb', '2025-04-18 06:32:31'),
(5, 58, 'f413ebdc81ae28a41ef4fd9a30b4f9c5b7ffd30a0ffc14e832b9944d54cb3a53', '2025-04-18 06:40:11');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id` int(11) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `categoria_id` int(11) DEFAULT NULL,
  `subcategoria_id` int(11) DEFAULT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `precio_compra` decimal(10,2) NOT NULL DEFAULT 0.00,
  `dim_x` double DEFAULT NULL,
  `dim_y` double DEFAULT NULL,
  `dim_z` double DEFAULT NULL,
  `codigo_qr` varchar(255) DEFAULT NULL,
  `empresa_id` int(11) NOT NULL,
  `zona_id` int(11) DEFAULT NULL,
  `last_movimiento` datetime DEFAULT NULL,
  `last_tipo` enum('ingreso','egreso') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id`, `nombre`, `descripcion`, `categoria_id`, `subcategoria_id`, `stock`, `precio_compra`, `dim_x`, `dim_y`, `dim_z`, `codigo_qr`, `empresa_id`, `zona_id`, `last_movimiento`, `last_tipo`) VALUES
(36, 'Lapiz Sharpie', 'SI', 27, 27, 10, 10.00, 2, 2, 1, NULL, 23, 18, '2025-08-04 13:46:16', NULL),
(37, 'Una piedra', '', 28, NULL, 19, 1.30, 0, 0, 0, NULL, 28, 19, '2025-08-04 17:13:27', NULL),
(41, 'plato unicel', '', 31, 38, 12, 50.00, 30, 2, 30, 'images/qr/41.png', 21, 22, '2025-10-05 00:46:32', NULL),
(43, 'papel a4 marca J', 'Es papel de la marca J de tamaño a4', 34, 36, 990, 400.00, 4, 4, 4, 'images/qr/43.png', 24, 17, '2025-09-03 19:09:02', NULL),
(44, 'si', 'si', 34, NULL, 0, 100.00, 0, 0, 0, 'images/qr/44.png', 24, 17, '2025-09-10 16:01:47', NULL),
(45, 'Conos de papel', '', 32, 37, 11, 2.00, 8, 11, 8, 'images/qr/45.png', 21, 16, '2025-10-07 22:14:30', NULL),
(46, 'platos unicel royal prestige', 'plato de royal prestige para los chalanes', 31, 38, 12, 50.00, 20, 20, 3, 'images/qr/46.png', 21, 20, '2025-10-07 22:14:40', NULL),
(48, 'Objeto de prueba', 'Sisisis', 33, 34, 3, 12.00, 2, 2, 2, 'images/qr/48.png', 24, 17, '2025-10-01 16:13:46', NULL),
(50, 'Perfil Ventana M4 roble', '', 25, NULL, 11, 300.00, 20, 20, 400, 'images/qr/50.png', 21, 16, '2025-10-07 22:14:24', NULL),
(51, 'cyuaderno norma', 'cuerno norma tama;o x', 33, 34, 10, 150.00, 30, 30, 5, 'images/qr/51.png', 24, 25, '2025-10-02 19:36:18', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `registro_accesos`
--

CREATE TABLE `registro_accesos` (
  `id` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `accion` enum('Inicio','Cierre','Intento') NOT NULL,
  `fecha` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `registro_accesos`
--

INSERT INTO `registro_accesos` (`id`, `id_usuario`, `accion`, `fecha`) VALUES
(1, 57, 'Cierre', '2025-08-26 23:07:35'),
(2, 57, 'Inicio', '2025-08-26 23:07:38'),
(3, 57, 'Cierre', '2025-08-26 23:08:00'),
(5, 57, 'Inicio', '2025-08-26 23:11:54'),
(6, 57, 'Cierre', '2025-08-26 23:22:17'),
(7, 57, 'Inicio', '2025-08-26 23:22:31'),
(8, 57, 'Cierre', '2025-08-26 23:22:49'),
(9, 57, 'Inicio', '2025-08-26 23:22:52'),
(10, 57, 'Cierre', '2025-08-26 23:38:58'),
(11, 57, 'Inicio', '2025-08-26 23:39:00'),
(12, 57, 'Inicio', '2025-08-26 23:39:22'),
(13, 57, 'Cierre', '2025-08-27 01:04:35'),
(14, 57, 'Inicio', '2025-08-27 01:05:29'),
(15, 57, 'Cierre', '2025-08-27 01:25:15'),
(16, 57, 'Inicio', '2025-08-27 01:25:18'),
(17, 57, 'Inicio', '2025-08-27 01:25:32'),
(18, 57, 'Inicio', '2025-08-27 01:28:41'),
(19, 60, 'Inicio', '2025-08-27 15:40:00'),
(20, 60, 'Inicio', '2025-08-27 16:04:10'),
(21, 57, 'Inicio', '2025-08-27 16:06:59'),
(22, 57, 'Inicio', '2025-08-29 23:51:09'),
(23, 57, 'Cierre', '2025-08-30 00:13:33'),
(24, 57, 'Inicio', '2025-08-30 00:13:36'),
(25, 57, 'Cierre', '2025-08-30 00:22:17'),
(26, 57, 'Inicio', '2025-08-30 00:22:20'),
(27, 57, 'Inicio', '2025-08-30 00:22:49'),
(28, 57, 'Cierre', '2025-08-30 00:23:06'),
(29, 57, 'Inicio', '2025-08-30 00:23:52'),
(30, 57, 'Cierre', '2025-08-30 00:24:02'),
(33, 57, 'Inicio', '2025-08-30 00:24:31'),
(34, 57, 'Cierre', '2025-08-30 00:40:19'),
(35, 57, 'Inicio', '2025-08-30 00:40:21'),
(36, 57, 'Inicio', '2025-08-30 00:40:37'),
(37, 57, 'Inicio', '2025-08-30 00:50:25'),
(38, 57, 'Inicio', '2025-08-30 02:09:30'),
(39, 57, 'Cierre', '2025-08-30 02:09:45'),
(40, 58, 'Inicio', '2025-08-30 02:10:06'),
(41, 58, 'Cierre', '2025-08-30 02:10:39'),
(42, 57, 'Inicio', '2025-08-30 02:10:41'),
(43, 57, 'Cierre', '2025-08-30 02:10:55'),
(46, 57, 'Inicio', '2025-08-30 02:11:15'),
(47, 57, 'Inicio', '2025-08-30 02:22:15'),
(48, 57, 'Cierre', '2025-08-30 02:23:23'),
(49, 33, 'Inicio', '2025-09-01 17:09:18'),
(50, 33, 'Intento', '2025-09-03 13:09:51'),
(51, 60, 'Inicio', '2025-09-03 13:10:05'),
(52, 60, 'Inicio', '2025-09-03 13:12:52'),
(53, 60, 'Inicio', '2025-09-03 13:17:10'),
(54, 60, 'Inicio', '2025-09-03 13:20:59'),
(55, 57, 'Inicio', '2025-09-03 15:49:20'),
(56, 57, 'Cierre', '2025-09-03 15:51:16'),
(57, 57, 'Inicio', '2025-09-03 15:51:20'),
(58, 58, 'Inicio', '2025-09-03 15:52:08'),
(59, 58, 'Cierre', '2025-09-03 15:56:31'),
(60, 57, 'Inicio', '2025-09-03 16:03:41'),
(61, 101, 'Inicio', '2025-09-03 16:17:21'),
(62, 101, 'Inicio', '2025-09-03 16:18:02'),
(63, 57, 'Inicio', '2025-09-03 16:19:24'),
(64, 57, 'Inicio', '2025-09-03 16:19:24'),
(65, 57, 'Inicio', '2025-09-03 16:19:24'),
(66, 57, 'Inicio', '2025-09-03 16:19:24'),
(67, 57, 'Inicio', '2025-09-03 16:19:24'),
(68, 57, 'Inicio', '2025-09-03 16:19:32'),
(69, 60, 'Inicio', '2025-09-03 19:08:20'),
(70, 57, 'Inicio', '2025-09-04 19:03:41'),
(71, 57, 'Inicio', '2025-09-04 19:04:21'),
(72, 57, 'Inicio', '2025-09-04 19:46:54'),
(73, 57, 'Inicio', '2025-09-04 19:47:42'),
(74, 57, 'Inicio', '2025-09-04 20:51:40'),
(75, 57, 'Inicio', '2025-09-04 22:49:04'),
(76, 57, 'Inicio', '2025-09-04 23:28:20'),
(77, 57, 'Cierre', '2025-09-04 23:29:16'),
(80, 57, 'Inicio', '2025-09-04 23:30:23'),
(81, 57, 'Inicio', '2025-09-04 23:32:31'),
(82, 102, 'Inicio', '2025-09-05 00:25:47'),
(83, 102, 'Cierre', '2025-09-05 00:27:40'),
(84, 102, 'Inicio', '2025-09-05 00:27:45'),
(85, 102, 'Cierre', '2025-09-05 00:44:23'),
(86, 57, 'Inicio', '2025-09-05 00:44:25'),
(87, 57, 'Inicio', '2025-09-05 03:27:26'),
(88, 57, 'Inicio', '2025-09-05 23:50:06'),
(89, 57, 'Inicio', '2025-09-06 00:27:49'),
(90, 57, 'Inicio', '2025-09-06 01:14:58'),
(91, 57, 'Inicio', '2025-09-08 23:16:36'),
(92, 57, 'Inicio', '2025-09-09 00:05:54'),
(93, 57, 'Inicio', '2025-09-09 00:13:41'),
(94, 57, 'Inicio', '2025-09-09 01:36:46'),
(95, 57, 'Inicio', '2025-09-09 01:44:05'),
(96, 57, 'Inicio', '2025-09-09 01:54:00'),
(97, 57, 'Inicio', '2025-09-09 23:39:46'),
(98, 57, 'Inicio', '2025-09-10 01:01:35'),
(99, 57, 'Inicio', '2025-09-10 01:41:14'),
(100, 57, 'Inicio', '2025-09-10 02:20:04'),
(101, 60, 'Inicio', '2025-09-10 15:43:12'),
(102, 60, 'Cierre', '2025-09-10 15:46:58'),
(103, 60, 'Inicio', '2025-09-10 15:51:17'),
(104, 57, 'Inicio', '2025-09-10 16:01:20'),
(105, 57, 'Inicio', '2025-09-10 16:01:20'),
(106, 57, 'Inicio', '2025-09-10 16:01:20'),
(107, 57, 'Inicio', '2025-09-10 16:01:20'),
(108, 57, 'Inicio', '2025-09-10 16:01:20'),
(109, 57, 'Inicio', '2025-09-10 16:01:20'),
(110, 57, 'Inicio', '2025-09-10 16:01:20'),
(111, 57, 'Inicio', '2025-09-10 16:01:41'),
(112, 60, 'Cierre', '2025-09-10 16:06:40'),
(113, 57, 'Cierre', '2025-09-10 16:06:48'),
(114, 60, 'Inicio', '2025-09-10 16:06:50'),
(115, 113, 'Inicio', '2025-09-10 16:11:51'),
(116, 113, 'Cierre', '2025-09-10 16:13:18'),
(117, 57, 'Inicio', '2025-09-15 16:32:30'),
(118, 57, 'Inicio', '2025-09-15 18:53:17'),
(119, 57, 'Intento', '2025-09-15 20:47:11'),
(120, 57, 'Inicio', '2025-09-15 20:47:19'),
(121, 57, 'Intento', '2025-09-15 21:01:51'),
(122, 57, 'Intento', '2025-09-15 21:01:54'),
(123, 57, 'Intento', '2025-09-15 21:02:18'),
(124, 57, 'Inicio', '2025-09-15 21:02:38'),
(125, 57, 'Inicio', '2025-09-15 22:20:45'),
(126, 57, 'Inicio', '2025-09-15 23:44:47'),
(127, 57, 'Inicio', '2025-09-16 00:28:13'),
(128, 57, 'Inicio', '2025-09-16 00:53:34'),
(129, 57, 'Inicio', '2025-09-16 00:54:45'),
(130, 57, 'Inicio', '2025-09-16 00:56:55'),
(131, 57, 'Inicio', '2025-09-16 00:58:51'),
(132, 57, 'Inicio', '2025-09-16 01:02:27'),
(133, 57, 'Inicio', '2025-09-16 01:08:02'),
(134, 57, 'Inicio', '2025-09-16 01:25:46'),
(135, 57, 'Inicio', '2025-09-16 01:43:11'),
(136, 57, 'Inicio', '2025-09-16 02:14:24'),
(137, 57, 'Inicio', '2025-09-16 02:32:56'),
(138, 57, 'Inicio', '2025-09-16 02:42:30'),
(139, 57, 'Inicio', '2025-09-16 03:14:16'),
(140, 57, 'Inicio', '2025-09-16 03:15:11'),
(141, 57, 'Inicio', '2025-09-16 03:17:09'),
(142, 114, 'Inicio', '2025-09-16 17:12:04'),
(143, 57, 'Inicio', '2025-09-17 01:12:34'),
(144, 57, 'Inicio', '2025-09-17 01:16:25'),
(145, 57, 'Inicio', '2025-09-17 02:05:01'),
(146, 57, 'Inicio', '2025-09-17 03:02:35'),
(147, 57, 'Inicio', '2025-09-17 03:04:50'),
(148, 57, 'Inicio', '2025-09-17 03:35:06'),
(149, 57, 'Inicio', '2025-09-17 03:54:06'),
(150, 57, 'Inicio', '2025-09-17 03:59:00'),
(151, 57, 'Inicio', '2025-09-17 04:01:09'),
(152, 57, 'Inicio', '2025-09-17 04:12:52'),
(153, 57, 'Inicio', '2025-09-17 04:13:12'),
(154, 57, 'Inicio', '2025-09-17 04:16:43'),
(155, 57, 'Inicio', '2025-09-17 04:18:20'),
(156, 57, 'Inicio', '2025-09-17 04:19:42'),
(157, 57, 'Inicio', '2025-09-17 04:48:12'),
(158, 57, 'Inicio', '2025-09-17 04:49:47'),
(159, 57, 'Inicio', '2025-09-17 04:55:56'),
(160, 57, 'Inicio', '2025-09-17 05:05:38'),
(161, 57, 'Inicio', '2025-09-17 05:17:41'),
(162, 57, 'Cierre', '2025-09-17 05:17:51'),
(163, 57, 'Inicio', '2025-09-17 05:18:13'),
(164, 57, 'Inicio', '2025-09-17 05:18:41'),
(165, 57, 'Inicio', '2025-09-17 15:59:55'),
(166, 33, 'Intento', '2025-09-17 18:13:12'),
(167, 33, 'Intento', '2025-09-17 18:13:16'),
(168, 33, 'Intento', '2025-09-17 18:13:21'),
(169, 60, 'Inicio', '2025-09-17 18:13:35'),
(170, 57, 'Inicio', '2025-09-17 19:47:14'),
(171, 57, 'Inicio', '2025-09-17 20:12:43'),
(172, 57, 'Inicio', '2025-09-17 20:14:59'),
(173, 57, 'Inicio', '2025-09-17 20:16:53'),
(174, 57, 'Inicio', '2025-09-17 20:24:27'),
(175, 57, 'Inicio', '2025-09-17 20:27:52'),
(176, 57, 'Inicio', '2025-09-17 20:48:00'),
(177, 57, 'Inicio', '2025-09-17 20:56:01'),
(178, 57, 'Inicio', '2025-09-17 21:07:54'),
(179, 57, 'Inicio', '2025-09-17 21:22:05'),
(180, 57, 'Inicio', '2025-09-17 21:34:11'),
(181, 57, 'Inicio', '2025-09-17 21:52:04'),
(182, 57, 'Cierre', '2025-09-17 21:55:21'),
(183, 57, 'Inicio', '2025-09-17 21:55:24'),
(184, 57, 'Inicio', '2025-09-17 22:25:55'),
(185, 57, 'Inicio', '2025-09-17 22:38:38'),
(186, 57, 'Inicio', '2025-09-17 22:46:19'),
(187, 57, 'Cierre', '2025-09-17 22:46:31'),
(188, 57, 'Inicio', '2025-09-17 22:46:33'),
(189, 57, 'Inicio', '2025-09-17 22:58:47'),
(190, 57, 'Inicio', '2025-09-17 22:58:47'),
(191, 57, 'Inicio', '2025-09-17 22:59:05'),
(192, 57, 'Inicio', '2025-09-17 23:21:02'),
(193, 57, 'Inicio', '2025-09-17 23:22:41'),
(194, 57, 'Inicio', '2025-09-17 23:31:11'),
(195, 57, 'Inicio', '2025-09-17 23:40:41'),
(196, 57, 'Inicio', '2025-09-17 23:53:29'),
(197, 57, 'Inicio', '2025-09-17 23:56:20'),
(198, 57, 'Inicio', '2025-09-18 00:06:46'),
(199, 57, 'Inicio', '2025-09-18 00:25:13'),
(200, 57, 'Inicio', '2025-09-18 00:37:15'),
(201, 57, 'Inicio', '2025-09-18 15:13:35'),
(202, 57, 'Inicio', '2025-09-18 16:02:42'),
(203, 57, 'Inicio', '2025-09-18 16:17:16'),
(204, 57, 'Inicio', '2025-09-18 16:53:39'),
(205, 57, 'Inicio', '2025-09-18 16:56:31'),
(206, 57, 'Inicio', '2025-09-18 17:09:44'),
(207, 57, 'Inicio', '2025-09-18 17:26:30'),
(208, 57, 'Inicio', '2025-09-18 17:52:48'),
(209, 57, 'Inicio', '2025-09-18 18:18:56'),
(210, 57, 'Inicio', '2025-09-18 18:23:22'),
(211, 57, 'Inicio', '2025-09-18 18:35:27'),
(212, 57, 'Inicio', '2025-09-18 18:50:02'),
(213, 57, 'Inicio', '2025-09-18 18:57:37'),
(214, 57, 'Inicio', '2025-09-18 19:06:58'),
(215, 57, 'Inicio', '2025-09-18 19:14:13'),
(216, 57, 'Inicio', '2025-09-18 19:38:39'),
(217, 57, 'Inicio', '2025-09-18 19:41:57'),
(218, 57, 'Inicio', '2025-09-18 19:44:09'),
(219, 57, 'Inicio', '2025-09-18 19:46:43'),
(220, 57, 'Inicio', '2025-09-18 19:49:38'),
(221, 57, 'Inicio', '2025-09-18 19:54:13'),
(222, 57, 'Inicio', '2025-09-18 19:56:04'),
(223, 57, 'Inicio', '2025-09-18 19:58:34'),
(224, 57, 'Inicio', '2025-09-18 20:04:38'),
(225, 57, 'Inicio', '2025-09-18 20:06:34'),
(226, 57, 'Inicio', '2025-09-18 20:13:58'),
(227, 57, 'Inicio', '2025-09-18 20:14:16'),
(228, 57, 'Inicio', '2025-09-18 20:18:51'),
(229, 57, 'Inicio', '2025-09-18 20:20:04'),
(230, 57, 'Cierre', '2025-09-18 20:22:23'),
(231, 110, 'Inicio', '2025-09-18 20:22:35'),
(232, 110, 'Cierre', '2025-09-18 20:25:31'),
(233, 57, 'Inicio', '2025-09-18 20:25:33'),
(234, 57, 'Inicio', '2025-09-18 22:44:21'),
(235, 57, 'Inicio', '2025-09-18 23:04:15'),
(236, 57, 'Inicio', '2025-09-18 23:49:56'),
(237, 57, 'Inicio', '2025-09-19 00:00:39'),
(238, 57, 'Inicio', '2025-09-19 00:09:38'),
(239, 57, 'Inicio', '2025-09-19 00:28:38'),
(240, 110, 'Inicio', '2025-09-19 00:33:37'),
(241, 110, 'Cierre', '2025-09-19 00:39:51'),
(242, 57, 'Inicio', '2025-09-19 00:43:25'),
(243, 57, 'Inicio', '2025-09-19 01:52:06'),
(244, 57, 'Inicio', '2025-09-19 02:07:17'),
(245, 57, 'Inicio', '2025-09-19 02:17:40'),
(246, 57, 'Inicio', '2025-09-19 02:18:51'),
(247, 57, 'Inicio', '2025-09-19 16:09:21'),
(248, 57, 'Inicio', '2025-09-19 19:05:59'),
(249, 57, 'Inicio', '2025-09-20 18:57:03'),
(250, 57, 'Inicio', '2025-09-20 19:26:36'),
(251, 57, 'Inicio', '2025-09-20 19:33:16'),
(252, 57, 'Inicio', '2025-09-20 19:36:32'),
(253, 57, 'Inicio', '2025-09-20 19:53:17'),
(254, 57, 'Inicio', '2025-09-20 19:54:39'),
(255, 57, 'Inicio', '2025-09-20 20:02:42'),
(256, 57, 'Inicio', '2025-09-20 20:06:35'),
(257, 57, 'Inicio', '2025-09-20 20:20:19'),
(258, 57, 'Inicio', '2025-09-20 20:31:58'),
(259, 57, 'Inicio', '2025-09-20 22:17:47'),
(260, 57, 'Inicio', '2025-09-20 22:24:13'),
(261, 57, 'Cierre', '2025-09-20 22:37:44'),
(262, 111, 'Inicio', '2025-09-20 22:37:52'),
(263, 111, 'Cierre', '2025-09-20 22:41:35'),
(264, 57, 'Inicio', '2025-09-20 22:41:38'),
(265, 57, 'Inicio', '2025-09-20 23:12:39'),
(266, 57, 'Inicio', '2025-09-20 23:16:26'),
(267, 57, 'Inicio', '2025-09-20 23:17:22'),
(268, 57, 'Inicio', '2025-09-20 23:19:43'),
(269, 57, 'Inicio', '2025-09-22 16:34:58'),
(270, 57, 'Cierre', '2025-09-22 16:35:16'),
(271, 57, 'Inicio', '2025-09-22 16:35:34'),
(272, 57, 'Cierre', '2025-09-22 16:35:41'),
(273, 110, 'Intento', '2025-09-22 16:35:53'),
(274, 110, 'Intento', '2025-09-22 16:35:56'),
(275, 57, 'Inicio', '2025-09-22 16:36:03'),
(276, 57, 'Cierre', '2025-09-22 16:36:16'),
(277, 110, 'Intento', '2025-09-22 16:36:21'),
(278, 57, 'Inicio', '2025-09-22 16:36:26'),
(279, 57, 'Cierre', '2025-09-22 16:36:33'),
(280, 110, 'Inicio', '2025-09-22 16:36:38'),
(281, 110, 'Cierre', '2025-09-22 16:36:59'),
(282, 57, 'Inicio', '2025-09-22 16:37:02'),
(283, 57, 'Inicio', '2025-09-22 17:51:01'),
(284, 57, 'Inicio', '2025-09-22 18:32:56'),
(285, 57, 'Inicio', '2025-09-22 18:33:06'),
(286, 57, 'Inicio', '2025-09-22 18:38:48'),
(287, 57, 'Inicio', '2025-09-22 18:48:21'),
(288, 57, 'Inicio', '2025-09-22 22:37:20'),
(289, 57, 'Inicio', '2025-09-22 22:40:33'),
(290, 57, 'Inicio', '2025-09-22 23:18:12'),
(291, 57, 'Inicio', '2025-09-22 23:23:22'),
(292, 57, 'Inicio', '2025-09-22 23:24:46'),
(293, 57, 'Inicio', '2025-09-22 23:35:56'),
(294, 57, 'Inicio', '2025-09-22 23:53:02'),
(295, 57, 'Inicio', '2025-09-23 00:00:02'),
(296, 57, 'Inicio', '2025-09-23 00:07:57'),
(297, 57, 'Inicio', '2025-09-23 01:13:13'),
(298, 57, 'Inicio', '2025-09-23 01:23:28'),
(299, 57, 'Inicio', '2025-09-23 01:49:12'),
(300, 57, 'Inicio', '2025-09-23 02:06:04'),
(301, 57, 'Inicio', '2025-09-23 02:06:04'),
(302, 57, 'Inicio', '2025-09-23 02:26:08'),
(303, 57, 'Inicio', '2025-09-23 02:59:05'),
(304, 57, 'Inicio', '2025-09-23 02:59:27'),
(305, 57, 'Inicio', '2025-09-23 03:04:23'),
(306, 57, 'Inicio', '2025-09-23 04:19:32'),
(307, 57, 'Inicio', '2025-09-23 18:43:13'),
(308, 60, 'Inicio', '2025-09-23 20:23:06'),
(309, 60, 'Inicio', '2025-09-24 01:37:52'),
(310, 60, 'Inicio', '2025-09-24 01:38:06'),
(311, 57, 'Inicio', '2025-09-25 02:36:55'),
(312, 57, 'Inicio', '2025-09-25 17:23:24'),
(313, 57, 'Inicio', '2025-09-25 17:31:47'),
(314, 57, 'Inicio', '2025-09-25 17:35:15'),
(315, 57, 'Inicio', '2025-09-25 17:40:30'),
(316, 57, 'Inicio', '2025-09-25 17:41:51'),
(317, 57, 'Inicio', '2025-09-25 17:55:17'),
(318, 57, 'Inicio', '2025-09-25 17:55:26'),
(319, 57, 'Inicio', '2025-09-25 18:12:53'),
(320, 57, 'Inicio', '2025-09-25 18:12:56'),
(321, 57, 'Inicio', '2025-09-25 18:28:02'),
(322, 57, 'Inicio', '2025-09-25 18:28:16'),
(323, 57, 'Inicio', '2025-09-25 19:01:39'),
(324, 57, 'Inicio', '2025-09-25 19:29:39'),
(325, 57, 'Inicio', '2025-09-25 19:29:43'),
(326, 57, 'Inicio', '2025-09-25 20:05:38'),
(327, 57, 'Inicio', '2025-09-25 20:06:30'),
(328, 57, 'Inicio', '2025-09-25 20:13:49'),
(329, 57, 'Inicio', '2025-09-25 20:53:00'),
(330, 57, 'Inicio', '2025-09-25 20:54:50'),
(331, 57, 'Inicio', '2025-09-25 21:13:07'),
(332, 57, 'Inicio', '2025-09-25 21:22:30'),
(333, 58, 'Inicio', '2025-09-25 21:25:24'),
(334, 58, 'Cierre', '2025-09-25 21:26:59'),
(335, 57, 'Inicio', '2025-09-25 21:27:02'),
(336, 57, 'Inicio', '2025-09-25 21:27:24'),
(337, 57, 'Inicio', '2025-09-25 22:01:51'),
(338, 57, 'Inicio', '2025-09-25 22:12:52'),
(339, 57, 'Cierre', '2025-09-25 22:25:52'),
(340, 57, 'Inicio', '2025-09-25 22:26:19'),
(341, 57, 'Inicio', '2025-09-25 22:28:34'),
(342, 57, 'Inicio', '2025-09-25 23:22:01'),
(343, 57, 'Inicio', '2025-09-25 23:57:56'),
(344, 57, 'Inicio', '2025-09-26 23:20:29'),
(345, 57, 'Inicio', '2025-09-26 23:56:10'),
(346, 57, 'Inicio', '2025-09-27 00:10:42'),
(347, 57, 'Inicio', '2025-09-27 00:15:15'),
(348, 57, 'Inicio', '2025-09-27 00:23:46'),
(349, 57, 'Inicio', '2025-09-28 05:11:43'),
(350, 57, 'Inicio', '2025-09-28 19:22:39'),
(351, 57, 'Inicio', '2025-09-28 19:25:11'),
(352, 57, 'Inicio', '2025-09-28 19:37:16'),
(353, 57, 'Cierre', '2025-09-28 19:38:49'),
(354, 111, 'Inicio', '2025-09-28 19:39:00'),
(355, 57, 'Inicio', '2025-09-28 19:41:19'),
(356, 57, 'Inicio', '2025-09-28 19:54:26'),
(357, 57, 'Cierre', '2025-09-28 19:54:56'),
(358, 110, 'Inicio', '2025-09-28 19:55:31'),
(359, 110, 'Cierre', '2025-09-28 19:57:01'),
(360, 111, 'Inicio', '2025-09-28 19:57:10'),
(361, 111, 'Cierre', '2025-09-28 19:57:59'),
(362, 110, 'Inicio', '2025-09-28 19:58:08'),
(363, 110, 'Cierre', '2025-09-28 19:58:52'),
(364, 57, 'Inicio', '2025-09-28 19:58:57'),
(365, 57, 'Inicio', '2025-09-28 20:02:11'),
(366, 57, 'Inicio', '2025-09-28 20:17:36'),
(367, 57, 'Inicio', '2025-09-28 21:22:34'),
(368, 58, 'Inicio', '2025-09-28 21:46:04'),
(369, 58, 'Cierre', '2025-09-28 21:47:11'),
(370, 57, 'Inicio', '2025-09-28 22:09:32'),
(371, 57, 'Inicio', '2025-09-28 22:29:50'),
(372, 57, 'Inicio', '2025-09-28 23:25:47'),
(373, 57, 'Inicio', '2025-09-28 23:37:49'),
(374, 57, 'Inicio', '2025-09-29 00:12:02'),
(375, 57, 'Inicio', '2025-09-29 00:12:27'),
(376, 57, 'Inicio', '2025-09-29 00:13:45'),
(377, 57, 'Inicio', '2025-09-29 00:27:22'),
(378, 57, 'Inicio', '2025-09-29 00:29:19'),
(379, 57, 'Inicio', '2025-09-29 02:03:59'),
(380, 57, 'Cierre', '2025-09-29 02:04:21'),
(381, 57, 'Inicio', '2025-10-01 00:47:47'),
(382, 57, 'Inicio', '2025-10-01 01:06:47'),
(383, 57, 'Inicio', '2025-10-01 01:16:47'),
(384, 60, 'Inicio', '2025-10-01 02:50:20'),
(385, 60, 'Cierre', '2025-10-01 02:50:30'),
(386, 115, 'Inicio', '2025-10-01 02:50:41'),
(387, 60, 'Inicio', '2025-10-01 02:56:17'),
(388, 57, 'Inicio', '2025-10-01 15:42:27'),
(389, 57, 'Inicio', '2025-10-01 15:48:08'),
(390, 57, 'Inicio', '2025-10-01 15:50:00'),
(391, 57, 'Inicio', '2025-10-01 15:53:43'),
(392, 57, 'Inicio', '2025-10-01 16:04:51'),
(393, 60, 'Inicio', '2025-10-01 16:08:37'),
(394, 60, 'Cierre', '2025-10-01 16:08:41'),
(395, 115, 'Intento', '2025-10-01 16:09:30'),
(396, 115, 'Inicio', '2025-10-01 16:09:47'),
(397, 110, 'Intento', '2025-10-01 16:17:05'),
(398, 110, 'Inicio', '2025-10-01 16:17:10'),
(399, 110, 'Cierre', '2025-10-01 16:18:47'),
(400, 57, 'Inicio', '2025-10-01 22:30:52'),
(401, 57, 'Inicio', '2025-10-02 00:19:15'),
(402, 57, 'Inicio', '2025-10-02 00:21:43'),
(403, 57, 'Inicio', '2025-10-02 00:27:46'),
(404, 57, 'Inicio', '2025-10-02 00:33:26'),
(405, 57, 'Inicio', '2025-10-02 00:42:21'),
(406, 57, 'Inicio', '2025-10-02 00:52:48'),
(407, 57, 'Inicio', '2025-10-02 16:47:59'),
(408, 57, 'Inicio', '2025-10-02 17:00:17'),
(409, 57, 'Inicio', '2025-10-02 17:03:11'),
(410, 57, 'Inicio', '2025-10-02 17:43:27'),
(411, 60, 'Intento', '2025-10-02 19:22:20'),
(412, 60, 'Intento', '2025-10-02 19:22:27'),
(413, 60, 'Intento', '2025-10-02 19:22:36'),
(414, 60, 'Intento', '2025-10-02 19:22:43'),
(415, 60, 'Intento', '2025-10-02 19:22:49'),
(416, 33, 'Intento', '2025-10-02 19:23:01'),
(417, 33, 'Intento', '2025-10-02 19:23:03'),
(418, 33, 'Intento', '2025-10-02 19:23:05'),
(419, 33, 'Intento', '2025-10-02 19:23:09'),
(420, 60, 'Inicio', '2025-10-02 19:23:42'),
(421, 116, 'Inicio', '2025-10-02 19:43:43'),
(422, 57, 'Inicio', '2025-10-02 23:02:03'),
(423, 57, 'Inicio', '2025-10-02 23:24:09'),
(424, 57, 'Inicio', '2025-10-03 00:16:57'),
(425, 57, 'Inicio', '2025-10-03 00:39:08'),
(426, 60, 'Intento', '2025-10-03 04:44:14'),
(427, 60, 'Intento', '2025-10-03 04:44:22'),
(428, 60, 'Intento', '2025-10-03 04:44:26'),
(429, 60, 'Intento', '2025-10-03 04:44:32'),
(430, 60, 'Inicio', '2025-10-03 04:46:33'),
(431, 60, 'Inicio', '2025-10-03 04:47:52'),
(432, 57, 'Inicio', '2025-10-03 18:20:20'),
(433, 57, 'Inicio', '2025-10-03 22:27:52'),
(434, 57, 'Inicio', '2025-10-03 22:43:11'),
(435, 57, 'Inicio', '2025-10-03 22:57:11'),
(436, 57, 'Inicio', '2025-10-03 23:09:36'),
(437, 57, 'Inicio', '2025-10-03 23:26:09'),
(438, 57, 'Inicio', '2025-10-03 23:33:45'),
(439, 57, 'Inicio', '2025-10-03 23:34:27'),
(440, 57, 'Inicio', '2025-10-03 23:35:43'),
(441, 57, 'Inicio', '2025-10-03 23:53:22'),
(442, 57, 'Inicio', '2025-10-03 23:59:12'),
(443, 57, 'Inicio', '2025-10-03 23:59:12'),
(444, 57, 'Inicio', '2025-10-03 23:59:12'),
(445, 57, 'Inicio', '2025-10-03 23:59:38'),
(446, 57, 'Inicio', '2025-10-04 00:12:55'),
(447, 57, 'Cierre', '2025-10-04 00:13:35'),
(448, 57, 'Inicio', '2025-10-04 00:13:38'),
(449, 57, 'Inicio', '2025-10-04 00:30:33'),
(450, 57, 'Inicio', '2025-10-04 01:04:56'),
(451, 57, 'Inicio', '2025-10-04 01:19:53'),
(452, 57, 'Inicio', '2025-10-04 18:41:22'),
(453, 57, 'Inicio', '2025-10-04 19:03:19'),
(454, 57, 'Inicio', '2025-10-04 19:25:29'),
(455, 57, 'Inicio', '2025-10-04 19:41:16'),
(456, 57, 'Cierre', '2025-10-04 19:42:16'),
(457, 119, 'Inicio', '2025-10-04 19:42:25'),
(458, 119, 'Cierre', '2025-10-04 19:44:15'),
(459, 57, 'Inicio', '2025-10-04 19:45:30'),
(460, 57, 'Inicio', '2025-10-04 20:05:59'),
(461, 57, 'Inicio', '2025-10-04 20:12:59'),
(462, 57, 'Inicio', '2025-10-04 20:22:49'),
(463, 57, 'Inicio', '2025-10-04 20:42:02'),
(464, 57, 'Inicio', '2025-10-04 20:57:31'),
(465, 57, 'Inicio', '2025-10-04 20:58:43'),
(466, 57, 'Inicio', '2025-10-04 21:00:49'),
(467, 57, 'Inicio', '2025-10-04 21:06:13'),
(468, 57, 'Inicio', '2025-10-04 21:23:50'),
(469, 57, 'Inicio', '2025-10-04 22:41:30'),
(470, 57, 'Inicio', '2025-10-04 22:56:26'),
(471, 57, 'Inicio', '2025-10-04 23:12:23'),
(472, 57, 'Inicio', '2025-10-04 23:40:00'),
(473, 57, 'Inicio', '2025-10-04 23:47:51'),
(474, 57, 'Inicio', '2025-10-05 00:07:18'),
(475, 57, 'Inicio', '2025-10-05 00:18:51'),
(476, 119, 'Inicio', '2025-10-05 00:30:56'),
(477, 119, 'Inicio', '2025-10-05 00:30:56'),
(478, 119, 'Inicio', '2025-10-05 00:30:56'),
(479, 57, 'Inicio', '2025-10-05 00:44:06'),
(480, 57, 'Inicio', '2025-10-05 00:56:44'),
(481, 57, 'Cierre', '2025-10-05 00:57:24'),
(482, 119, 'Inicio', '2025-10-05 00:57:34'),
(483, 119, 'Cierre', '2025-10-05 00:57:46'),
(484, 57, 'Inicio', '2025-10-05 00:57:48'),
(485, 57, 'Cierre', '2025-10-05 00:58:18'),
(486, 111, 'Inicio', '2025-10-05 00:58:26'),
(487, 57, 'Inicio', '2025-10-06 19:39:31'),
(488, 57, 'Inicio', '2025-10-06 19:43:25'),
(489, 57, 'Inicio', '2025-10-06 22:54:29'),
(490, 57, 'Inicio', '2025-10-06 23:22:00'),
(491, 57, 'Inicio', '2025-10-06 23:34:52'),
(492, 57, 'Inicio', '2025-10-06 23:54:45'),
(493, 57, 'Inicio', '2025-10-07 00:12:39'),
(494, 57, 'Inicio', '2025-10-07 00:21:54'),
(495, 57, 'Inicio', '2025-10-07 00:23:08'),
(496, 57, 'Inicio', '2025-10-07 00:29:36'),
(497, 57, 'Inicio', '2025-10-07 00:49:55'),
(498, 57, 'Inicio', '2025-10-07 00:53:22'),
(499, 57, 'Inicio', '2025-10-07 01:11:11'),
(500, 57, 'Inicio', '2025-10-07 01:41:16'),
(501, 57, 'Inicio', '2025-10-07 01:50:32'),
(502, 57, 'Inicio', '2025-10-07 02:21:11'),
(503, 57, 'Inicio', '2025-10-07 16:06:28'),
(504, 57, 'Inicio', '2025-10-07 16:12:05'),
(505, 57, 'Inicio', '2025-10-07 16:56:21'),
(506, 57, 'Inicio', '2025-10-07 17:13:08'),
(507, 57, 'Inicio', '2025-10-07 17:22:17'),
(508, 57, 'Inicio', '2025-10-07 17:36:57'),
(509, 57, 'Inicio', '2025-10-07 17:43:13'),
(510, 57, 'Inicio', '2025-10-07 17:54:01'),
(511, 57, 'Inicio', '2025-10-07 18:01:24'),
(512, 57, 'Inicio', '2025-10-07 18:05:26'),
(513, 57, 'Inicio', '2025-10-07 18:42:02'),
(514, 57, 'Inicio', '2025-10-07 18:56:51'),
(515, 57, 'Inicio', '2025-10-07 20:51:56'),
(516, 57, 'Inicio', '2025-10-07 21:37:27'),
(517, 57, 'Inicio', '2025-10-07 21:41:14'),
(518, 57, 'Inicio', '2025-10-07 21:42:41'),
(519, 57, 'Inicio', '2025-10-07 22:07:40'),
(520, 57, 'Inicio', '2025-10-07 22:08:04'),
(521, 57, 'Inicio', '2025-10-07 22:11:12'),
(522, 57, 'Inicio', '2025-10-07 22:18:51'),
(523, 57, 'Inicio', '2025-10-07 22:21:09'),
(524, 57, 'Inicio', '2025-10-07 22:21:45'),
(525, 57, 'Inicio', '2025-10-07 22:23:41'),
(526, 57, 'Inicio', '2025-10-07 22:53:52'),
(527, 57, 'Inicio', '2025-10-07 22:58:38');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reportes_historial`
--

CREATE TABLE `reportes_historial` (
  `id` int(10) UNSIGNED NOT NULL,
  `uuid` char(32) NOT NULL,
  `id_empresa` int(10) UNSIGNED NOT NULL,
  `original_name` varchar(255) NOT NULL,
  `storage_name` varchar(255) NOT NULL,
  `mime_type` varchar(120) NOT NULL,
  `file_size` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL,
  `expires_at` datetime NOT NULL,
  `source` varchar(120) NOT NULL DEFAULT '',
  `notes` varchar(240) NOT NULL DEFAULT '',
  `created_on` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_on` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `reportes_historial`
--

INSERT INTO `reportes_historial` (`id`, `uuid`, `id_empresa`, `original_name`, `storage_name`, `mime_type`, `file_size`, `created_at`, `expires_at`, `source`, `notes`, `created_on`, `updated_on`) VALUES
(9, '633b4104617f44ddb2c6359a3bafe500', 21, 'inventario_productos.pdf', '1759859760-69bef8b8cef716c869b8b14e74c8fe9b.pdf', 'application/pdf', 15550, '2025-10-07 17:56:00', '2025-12-06 17:56:00', 'Gestión de inventario', 'Exportación de Productos del inventario a PDF', '2025-10-07 17:56:00', NULL),
(11, '0749048db7d8fb56f839dcae703f6692', 21, 'usuarios_empresa.pdf', '1759863479-31c43006ff0c58b44a87609c9ce57275.pdf', 'application/pdf', 10388, '2025-10-07 18:57:59', '2025-12-06 18:57:59', 'Administración de usuarios', 'Exportación de usuarios a PDF', '2025-10-07 18:57:59', NULL),
(12, 'a6257a6052e6a57fd5424b0b7d10c9b3', 21, 'inventario_productos.pdf', '1759863491-122a73b69a4dbb9ba564107fd44bc06b.pdf', 'application/pdf', 15550, '2025-10-07 18:58:11', '2025-12-06 18:58:11', 'Gestión de inventario', 'Exportación de Productos del inventario a PDF', '2025-10-07 18:58:11', NULL),
(13, '130ba052c1db94f3419e446e64219d9f', 21, 'logs.pdf', '1759864181-f895f0f43c721e9c59119f1c5462f3cb.pdf', 'application/pdf', 19551, '2025-10-07 19:09:41', '2025-12-06 19:09:41', 'Control de registros', 'Exportación del registro a PDF', '2025-10-07 19:09:41', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `subcategorias`
--

CREATE TABLE `subcategorias` (
  `id` int(11) NOT NULL,
  `categoria_id` int(11) DEFAULT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `empresa_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `subcategorias`
--

INSERT INTO `subcategorias` (`id`, `categoria_id`, `nombre`, `descripcion`, `empresa_id`) VALUES
(23, 24, 'sadeadada', 'werf23wffsef', 23),
(27, 27, 'Puntillas', 'Lapices de puntillas', 23),
(28, 28, 'Madera de cedro verde', '', 28),
(33, 31, 'tapas', '', 21),
(34, 33, 'sub1', 'cositas', 24),
(35, 34, 'papel a4', 'tamaño a4', 24),
(36, 34, 'papel a4', 'tamaño a4', 24),
(37, 32, 'conos', '', 21),
(38, 31, 'platos', '', 21),
(39, 34, 'china', 'Exclusivo para papeles china', 24);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario`
--

CREATE TABLE `usuario` (
  `id_usuario` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `fecha_nacimiento` date NOT NULL,
  `telefono` varchar(20) NOT NULL,
  `correo` varchar(100) NOT NULL,
  `contrasena` char(40) NOT NULL,
  `rol` enum('Administrador','Supervisor','Almacenista','Mantenimiento','Etiquetador') DEFAULT 'Administrador',
  `fecha_registro` timestamp NOT NULL DEFAULT current_timestamp(),
  `verificacion_cuenta` tinyint(1) DEFAULT 0,
  `suscripcion` tinyint(1) DEFAULT 0,
  `intentos_fallidos` int(11) DEFAULT 0,
  `ultimo_intento` datetime DEFAULT NULL,
  `foto_perfil` varchar(255) DEFAULT 'images/profile.jpg',
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `tutorial_visto` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuario`
--

INSERT INTO `usuario` (`id_usuario`, `nombre`, `apellido`, `fecha_nacimiento`, `telefono`, `correo`, `contrasena`, `rol`, `fecha_registro`, `verificacion_cuenta`, `suscripcion`, `intentos_fallidos`, `ultimo_intento`, `foto_perfil`, `activo`, `tutorial_visto`) VALUES
(33, 'Ivan Eduardo', 'Garcia Verduzco', '2005-05-15', '3315634572', 'ivangmgm1290@gmail.com', '31bbc4cb70043dcb8cca35cb837832c419a4caa6', 'Administrador', '2025-04-07 14:32:50', 1, 0, 7, '2025-10-02 19:23:01', 'images/profile.jpg', 1, 0),
(56, 'kay', 'ro', '2025-12-22', '123456', 'a21100285@ceti.mx', '64b6c7a5060af5e67425be0ca23b3a9df4524d5e', 'Administrador', '2025-04-08 13:46:31', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(57, 'Emiliano', 'Sanchez Flores', '2005-03-30', '6731350698', 'a21100316@ceti.mx', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Administrador', '2025-04-17 02:28:49', 1, 0, 0, NULL, 'images/profiles/perfil_57_1755646866.jpeg', 1, 1),
(58, 'Emiliano', 'Sanchez Flores', '2005-03-30', '6731350698', 'tareasdeemi@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Administrador', '2025-04-18 05:39:32', 1, 0, 0, NULL, 'images/profiles/perfil_58_1756914842.jpg', 1, 1),
(59, 'Esteban Israel', 'Caballero Velázquez', '2006-08-03', '3323859470', 'a21300617@ceti.mx', '851f50aaf59b40156423094ad134cbd4272f399a', 'Administrador', '2025-05-21 12:53:38', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(60, 'Ivan Eduardo ', 'Garcia Verduzco', '2005-06-15', '3315634573', 'ie.garcia.ve@gmail.com', 'ba46035ced600481626596823e153ceb433fd886', 'Administrador', '2025-06-23 02:23:08', 1, 0, 5, '2025-10-03 04:44:14', 'images/profiles/perfil_60_1755183384.jpg', 1, 1),
(61, 'kini', 'a', '2000-03-12', '331342411', '1234567U@gmail.com', 'fede6a5f0852a4d0d1f56ee296b85a9c227b13bd', 'Administrador', '2025-06-24 14:02:28', 0, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(62, 'kini', 'a', '2000-03-12', '331342411', 'grasomister642@gmail.com', 'fede6a5f0852a4d0d1f56ee296b85a9c227b13bd', 'Administrador', '2025-06-24 14:03:43', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(75, 'el pepe', 'Ete sech', '2004-04-12', '1234567890', 'elpepeetesech@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Etiquetador', '2025-07-01 01:32:25', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(80, 'juan', 'garcia', '2005-06-15', '3351431241242', 'juangarcia@gmail.com', 'ed44bb6085905e93ed20c701fb11a6d58a6c82f0', 'Almacenista', '2025-07-01 14:11:40', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(81, 'emiliano', 'perez', '1999-09-12', '1414213412', 'emiliano123@gmail.com', 'fede6a5f0852a4d0d1f56ee296b85a9c227b13bd', 'Almacenista', '2025-07-01 14:12:31', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(83, 'jose', 'vasconcelos', '2005-09-15', '331241412', 'imchatgpt5@gmail.com', 'fede6a5f0852a4d0d1f56ee296b85a9c227b13bd', 'Etiquetador', '2025-07-01 14:25:58', 1, 0, 4, '2025-07-01 14:31:25', 'images/profile.jpg', 1, 0),
(85, 'elber', 'gadura', '2001-01-10', '6731350698', 'elbergalarza313@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Etiquetador', '2025-07-05 19:00:25', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(91, 'Papu', 'Josh', '2005-08-07', '3326995066', 'a25110130@ceti.mx', 'a56694c6940386029bc5c36f63f8d64bbe018e90', 'Etiquetador', '2025-08-01 18:41:04', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(92, 'Uusario 1', 'user', '2005-06-15', '3315634512', 'correoprueba@gmail.com', '41137b4535ac2e5d1b81a9f6a1eca42ddce92916', 'Supervisor', '2025-08-01 23:26:30', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(93, 'Erick', 'Olguín', '2005-08-05', '3322201713', 'a19300083@ceti.mx', '6241388bba3e129f606bd7e9baeb8c4f76494272', 'Etiquetador', '2025-08-04 17:00:37', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(96, 'Erick', 'Olguín', '2025-08-04', '3322201713', 'erizo.gamer.781@gmail.com', '1094724d221af7856d7ccee086f1f463885ad572', 'Etiquetador', '2025-08-04 17:03:39', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(97, 'Vamos', 'Apasar', '2002-08-07', '12345678', 'optistockproject@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Administrador', '2025-08-08 04:17:00', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(101, 'Ivan Eduardo', 'Garcia Verduzcoo', '2000-01-02', '3315634573', 'juanitoalcachofaro@gmail.com', 'e591c90145d5a1451f8a270e491f5cc1cb6eb43e', 'Administrador', '2025-09-03 16:17:21', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(102, 'Menga', 'Nito', '2005-03-30', '6731350698', 'disksvinylcdymas@gmail.com', '62d027e4de8205d9da29815b99ea7172e1b42301', 'Administrador', '2025-09-05 00:25:47', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(104, 'Samuel', 'Etoo', '1996-07-19', '3325278895', 'samuelito@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Almacenista', '2025-09-05 00:32:26', 1, 0, 0, NULL, 'images/almacenista.jpg', 1, 0),
(105, 'Lionel Andres', 'Messi Cuccittini', '1988-04-02', '928749681', 'lionel.messi@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Etiquetador', '2025-09-05 00:33:49', 1, 0, 0, NULL, 'images/etiquetador.jpg', 1, 0),
(106, 'Cristiano', 'Ronaldo', '1978-11-05', '77642969', 'cr7@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Supervisor', '2025-09-05 00:35:47', 1, 0, 0, NULL, 'images/supervisor.jpg', 1, 0),
(107, 'Lamine', 'Tamal', '1994-11-12', '1234567890', 'laminetamal@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Mantenimiento', '2025-09-05 00:36:36', 1, 0, 0, NULL, 'images/mantenimiento.jpg', 1, 0),
(110, 'Carmen Alicia', 'Flores Inzunza', '2004-03-03', '3321099971', 'carmen.alicia@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Mantenimiento', '2025-09-09 00:14:22', 1, 0, 0, NULL, 'images/mantenimiento.jpg', 1, 1),
(111, 'Hector', 'Sanchez Lung', '1997-12-21', '987654321', 'hector.lung@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Almacenista', '2025-09-09 01:54:52', 1, 0, 0, NULL, 'images/almacenista.jpg', 1, 1),
(112, 'juanito', 'garcia', '2000-01-04', '3399988221', 'vipoca7841@certve.com', '3414039fe8ebbb0bc6db4ff54d0ca57016732635', 'Almacenista', '2025-09-10 15:55:38', 1, 0, 0, NULL, 'images/supervisor.jpg', 1, 0),
(113, 'Fulanito', 'Menganito', '2005-03-30', '3321099971', 'lumminary2@gmail.com', 'ae53da110e755b430ee6285a1ad0b41138b956d0', 'Administrador', '2025-09-10 16:08:45', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(114, 'OSAMA', 'HOSNI TOUIL TOUIL', '1975-05-26', '679121427', 'osamahosni1975@gmail.com', '135731ba3cd4a9cbe32b530e7c192c69965ba448', 'Administrador', '2025-09-16 17:12:04', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(115, 'rocha', 'alejandro', '2000-05-05', '99999999999999', 'rochamagico.90@gmail.com', '3414039fe8ebbb0bc6db4ff54d0ca57016732635', 'Almacenista', '2025-10-01 02:47:58', 1, 0, 0, NULL, 'images/almacenista.jpg', 1, 1),
(116, 'Mariana Yatzil ', 'García Verduzco ', '2008-05-11', '33-11006257', 'mariyatgar@gmail.com', '1d732453f23aae921d779a393c1bbfa34facbeb4', 'Administrador', '2025-10-02 19:43:43', 1, 0, 0, NULL, 'images/profile.jpg', 1, 1),
(117, 'Mario', 'Garcia', '2025-01-01', '3329658948', 'mario.garciadelacruz@forvia.com', '151bb728245d7f2877ea67505dabb1df033fd54c', 'Administrador', '2025-10-02 19:46:54', 0, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(119, 'Super', 'Visor', '2001-01-01', '123456789', 'supervisor@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Supervisor', '2025-10-04 19:42:00', 1, 0, 0, NULL, 'images/supervisor.jpg', 1, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario_area_zona`
--

CREATE TABLE `usuario_area_zona` (
  `id_usuario` int(11) NOT NULL,
  `id_area` int(11) NOT NULL,
  `id_zona` int(11) DEFAULT NULL,
  `fecha_asignacion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuario_area_zona`
--

INSERT INTO `usuario_area_zona` (`id_usuario`, `id_area`, `id_zona`, `fecha_asignacion`) VALUES
(119, 26, NULL, '2025-10-04 19:42:13'),
(111, 21, NULL, '2025-10-05 00:58:15'),
(111, 31, NULL, '2025-10-07 21:03:20');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario_empresa`
--

CREATE TABLE `usuario_empresa` (
  `id_usuario` int(11) NOT NULL,
  `id_empresa` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuario_empresa`
--

INSERT INTO `usuario_empresa` (`id_usuario`, `id_empresa`) VALUES
(110, 21),
(111, 21),
(119, 21),
(75, 22),
(92, 23),
(112, 24),
(115, 24),
(80, 25),
(81, 25),
(104, 31),
(105, 31),
(106, 31),
(107, 31);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `zonas`
--

CREATE TABLE `zonas` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `ancho` decimal(10,2) NOT NULL,
  `alto` decimal(10,2) NOT NULL,
  `largo` decimal(10,2) NOT NULL,
  `volumen` decimal(15,2) NOT NULL,
  `capacidad_utilizada` decimal(15,2) NOT NULL DEFAULT 0.00,
  `porcentaje_ocupacion` decimal(5,2) NOT NULL DEFAULT 0.00,
  `productos_registrados` int(11) NOT NULL DEFAULT 0,
  `tipo_almacenamiento` varchar(50) DEFAULT NULL,
  `subniveles` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`subniveles`)),
  `area_id` int(11) DEFAULT NULL,
  `id_empresa` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `zonas`
--

INSERT INTO `zonas` (`id`, `nombre`, `descripcion`, `ancho`, `alto`, `largo`, `volumen`, `capacidad_utilizada`, `porcentaje_ocupacion`, `productos_registrados`, `tipo_almacenamiento`, `subniveles`, `area_id`, `id_empresa`) VALUES
(16, 'zona', 'mi zona', 3.00, 2.00, 1.00, 6.00, 1.30, 21.74, 2, 'rack', '[]', 21, 21),
(17, 'Zona 1', 'es la zona 1', 2.00, 2.00, 2.00, 8.00, 0.00, 0.00, 0, 'gabinete', '[]', 22, 24),
(18, 'Mostrador', 'SI', 2.00, 1.00, 2.00, 4.00, 0.00, 0.00, 0, 'vitrina', '[]', 23, 23),
(19, 'Iglesia Patólica', 'Una iglesia a nuestro señor y salvador emplumado', 0.00, 1.00, 0.00, 0.00, 0.00, 0.00, 0, 'jaula', '[]', 24, 28),
(20, 'rack A', 'rack para cosas pesadas', 1.50, 3.00, 5.00, 22.50, 0.02, 0.11, 1, 'rack', '[]', 26, 21),
(21, 'rack B', 'otro rack', 1.50, 3.00, 5.00, 22.50, 0.00, 0.00, 0, 'rack', '[]', 26, 21),
(22, 'rack C', 'otro rack', 1.50, 3.00, 5.00, 22.50, 0.02, 0.10, 1, 'rack', '[]', 26, 21),
(23, 'Zona1', 'zona1', 2.00, 1.00, 2.00, 4.00, 0.00, 0.00, 0, 'cajón', '[]', 28, 30),
(24, 'zona nueva', 'zona que no quiero con area', 10.00, 2.00, 10.00, 200.00, 0.00, 0.00, 0, 'jaula', '[]', NULL, 21),
(25, 'vitrina', 'vitrina central', 1.00, 1.00, 1.50, 1.50, 0.05, 3.00, 1, 'vitrina', '[]', 30, 24);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `areas`
--
ALTER TABLE `areas`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `busquedas_recientes_empresa`
--
ALTER TABLE `busquedas_recientes_empresa`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_empresa_termino` (`id_empresa`,`termino`);

--
-- Indices de la tabla `categorias`
--
ALTER TABLE `categorias`
  ADD PRIMARY KEY (`id`),
  ADD KEY `empresa_id` (`empresa_id`);

--
-- Indices de la tabla `configuracion_empresa`
--
ALTER TABLE `configuracion_empresa`
  ADD PRIMARY KEY (`id_empresa`);

--
-- Indices de la tabla `empresa`
--
ALTER TABLE `empresa`
  ADD PRIMARY KEY (`id_empresa`),
  ADD KEY `usuario_creador` (`usuario_creador`);

--
-- Indices de la tabla `historial_busquedas`
--
ALTER TABLE `historial_busquedas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_empresa_fecha` (`id_empresa`,`fecha_busqueda`),
  ADD KEY `fk_historial_usuario` (`id_usuario`);

--
-- Indices de la tabla `log_control`
--
ALTER TABLE `log_control`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_usuario` (`id_usuario`);

--
-- Indices de la tabla `movimientos`
--
ALTER TABLE `movimientos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `producto_id` (`producto_id`),
  ADD KEY `fk_movimientos_usuario` (`id_usuario`);

--
-- Indices de la tabla `notificaciones`
--
ALTER TABLE `notificaciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notificaciones_empresa_fecha` (`id_empresa`,`fecha_disponible_desde`),
  ADD KEY `idx_notificaciones_usuario` (`id_usuario_destinatario`),
  ADD KEY `idx_notificaciones_rol` (`rol_destinatario`);

--
-- Indices de la tabla `pass_resets`
--
ALTER TABLE `pass_resets`
  ADD PRIMARY KEY (`id_pass_reset`),
  ADD KEY `id_usuario` (`id_usuario`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ux_productos_nombre_empresa` (`empresa_id`,`nombre`),
  ADD KEY `categoria_id` (`categoria_id`),
  ADD KEY `subcategoria_id` (`subcategoria_id`),
  ADD KEY `fk_producto_zona` (`zona_id`),
  ADD KEY `empresa_id` (`empresa_id`);

--
-- Indices de la tabla `registro_accesos`
--
ALTER TABLE `registro_accesos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_usuario` (`id_usuario`);

--
-- Indices de la tabla `reportes_historial`
--
ALTER TABLE `reportes_historial`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_reportes_historial_uuid` (`uuid`),
  ADD KEY `idx_reportes_historial_empresa_fecha` (`id_empresa`,`created_at`);

--
-- Indices de la tabla `subcategorias`
--
ALTER TABLE `subcategorias`
  ADD PRIMARY KEY (`id`),
  ADD KEY `categoria_id` (`categoria_id`),
  ADD KEY `empresa_id` (`empresa_id`);

--
-- Indices de la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `correo` (`correo`);

--
-- Indices de la tabla `usuario_area_zona`
--
ALTER TABLE `usuario_area_zona`
  ADD KEY `fk_uaz_usuario` (`id_usuario`),
  ADD KEY `fk_uaz_area` (`id_area`),
  ADD KEY `fk_uaz_zona` (`id_zona`);

--
-- Indices de la tabla `usuario_empresa`
--
ALTER TABLE `usuario_empresa`
  ADD PRIMARY KEY (`id_usuario`,`id_empresa`),
  ADD KEY `id_empresa` (`id_empresa`);

--
-- Indices de la tabla `zonas`
--
ALTER TABLE `zonas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `area_id` (`area_id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `areas`
--
ALTER TABLE `areas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT de la tabla `busquedas_recientes_empresa`
--
ALTER TABLE `busquedas_recientes_empresa`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT de la tabla `categorias`
--
ALTER TABLE `categorias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT de la tabla `empresa`
--
ALTER TABLE `empresa`
  MODIFY `id_empresa` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT de la tabla `historial_busquedas`
--
ALTER TABLE `historial_busquedas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT de la tabla `log_control`
--
ALTER TABLE `log_control`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=146;

--
-- AUTO_INCREMENT de la tabla `movimientos`
--
ALTER TABLE `movimientos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT de la tabla `notificaciones`
--
ALTER TABLE `notificaciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `pass_resets`
--
ALTER TABLE `pass_resets`
  MODIFY `id_pass_reset` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=53;

--
-- AUTO_INCREMENT de la tabla `registro_accesos`
--
ALTER TABLE `registro_accesos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=528;

--
-- AUTO_INCREMENT de la tabla `reportes_historial`
--
ALTER TABLE `reportes_historial`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT de la tabla `subcategorias`
--
ALTER TABLE `subcategorias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT de la tabla `usuario`
--
ALTER TABLE `usuario`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=120;

--
-- AUTO_INCREMENT de la tabla `zonas`
--
ALTER TABLE `zonas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `busquedas_recientes_empresa`
--
ALTER TABLE `busquedas_recientes_empresa`
  ADD CONSTRAINT `fk_busquedas_recientes_empresa` FOREIGN KEY (`id_empresa`) REFERENCES `empresa` (`id_empresa`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `configuracion_empresa`
--
ALTER TABLE `configuracion_empresa`
  ADD CONSTRAINT `configuracion_empresa_ibfk_1` FOREIGN KEY (`id_empresa`) REFERENCES `empresa` (`id_empresa`);

--
-- Filtros para la tabla `empresa`
--
ALTER TABLE `empresa`
  ADD CONSTRAINT `empresa_ibfk_1` FOREIGN KEY (`usuario_creador`) REFERENCES `usuario` (`id_usuario`);

--
-- Filtros para la tabla `historial_busquedas`
--
ALTER TABLE `historial_busquedas`
  ADD CONSTRAINT `fk_historial_empresa` FOREIGN KEY (`id_empresa`) REFERENCES `empresa` (`id_empresa`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_historial_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE;

--
-- Filtros para la tabla `log_control`
--
ALTER TABLE `log_control`
  ADD CONSTRAINT `log_control_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`);

--
-- Filtros para la tabla `movimientos`
--
ALTER TABLE `movimientos`
  ADD CONSTRAINT `fk_mov_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`),
  ADD CONSTRAINT `fk_movimientos_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`),
  ADD CONSTRAINT `movimientos_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`);

--
-- Filtros para la tabla `pass_resets`
--
ALTER TABLE `pass_resets`
  ADD CONSTRAINT `pass_resets_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`);

--
-- Filtros para la tabla `productos`
--
ALTER TABLE `productos`
  ADD CONSTRAINT `fk_producto_zona` FOREIGN KEY (`zona_id`) REFERENCES `zonas` (`id`),
  ADD CONSTRAINT `productos_ibfk_1` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `productos_ibfk_2` FOREIGN KEY (`subcategoria_id`) REFERENCES `subcategorias` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `registro_accesos`
--
ALTER TABLE `registro_accesos`
  ADD CONSTRAINT `registro_accesos_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE;

--
-- Filtros para la tabla `subcategorias`
--
ALTER TABLE `subcategorias`
  ADD CONSTRAINT `subcategorias_ibfk_1` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `usuario_area_zona`
--
ALTER TABLE `usuario_area_zona`
  ADD CONSTRAINT `fk_uaz_area` FOREIGN KEY (`id_area`) REFERENCES `areas` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_uaz_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_uaz_zona` FOREIGN KEY (`id_zona`) REFERENCES `zonas` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `usuario_empresa`
--
ALTER TABLE `usuario_empresa`
  ADD CONSTRAINT `usuario_empresa_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE,
  ADD CONSTRAINT `usuario_empresa_ibfk_2` FOREIGN KEY (`id_empresa`) REFERENCES `empresa` (`id_empresa`) ON DELETE CASCADE;

--
-- Filtros para la tabla `zonas`
--
ALTER TABLE `zonas`
  ADD CONSTRAINT `zonas_ibfk_1` FOREIGN KEY (`area_id`) REFERENCES `areas` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
