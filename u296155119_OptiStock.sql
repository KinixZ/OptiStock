-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Nov 07, 2025 at 05:12 PM
-- Server version: 11.8.3-MariaDB-log
-- PHP Version: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u296155119_OptiStock`
--

-- --------------------------------------------------------

--
-- Table structure for table `areas`
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
-- Dumping data for table `areas`
--

INSERT INTO `areas` (`id`, `nombre`, `descripcion`, `ancho`, `alto`, `largo`, `volumen`, `capacidad_utilizada`, `porcentaje_ocupacion`, `productos_registrados`, `id_empresa`) VALUES
(22, 'Area 1', 'Es el area 1', 5.00, 2.00, 2.00, 20.00, 0.00, 0.00, 0, 24),
(24, 'El patolicismo', 'Una religion de patos', 99999999.99, 99999999.99, 99999999.99, 9999999999999.99, 0.00, 0.00, 0, 28),
(28, 'Area1', 'area1', 20.00, 3.00, 30.00, 1800.00, 0.00, 0.00, 0, 30),
(33, 'Papeleria', 'oal', 30.00, 5.00, 20.00, 3000.00, 0.01, 0.00, 1, 23),
(34, 'Almacen 1', 'edsfF', 6.00, 3.00, 5.00, 90.00, 0.10, 0.11, 1, 36),
(35, 'area', 'area de prueba', 2.00, 2.00, 2.00, 8.00, 0.01, 0.13, 1, 38),
(36, 'area', 'q', 10.00, 3.00, 10.00, 300.00, 0.28, 0.09, 4, 21),
(38, 'otra area', 'a', 3.00, 3.00, 3.00, 27.00, 0.00, 0.00, 0, 21),
(39, 'jola', 'iujhiu', 521.00, 9456.00, 844.00, 4158030144.00, 0.00, 0.00, 0, 24);

-- --------------------------------------------------------

--
-- Table structure for table `busquedas_recientes_empresa`
--

CREATE TABLE `busquedas_recientes_empresa` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `id_empresa` int(11) NOT NULL,
  `termino` varchar(255) NOT NULL,
  `ultima_busqueda` datetime NOT NULL DEFAULT current_timestamp(),
  `total_coincidencias` int(10) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `busquedas_recientes_empresa`
--

INSERT INTO `busquedas_recientes_empresa` (`id`, `id_empresa`, `termino`, `ultima_busqueda`, `total_coincidencias`) VALUES
(1, 21, 'Usuarios', '2025-10-07 22:08:26', 5),
(2, 21, 'Ver todo', '2025-10-10 21:43:25', 8),
(3, 21, 'Áreas', '2025-10-07 22:08:30', 3),
(5, 21, 'Movimientos', '2025-10-08 15:54:49', 5),
(19, 34, 'Ver todo', '2025-10-09 20:54:37', 1),
(23, 38, 'Ver todo', '2025-11-01 16:51:32', 1),
(24, 38, 'Productos', '2025-11-01 16:51:52', 3),
(25, 38, 'Áreas', '2025-11-01 16:51:55', 2),
(26, 38, 'Zonas', '2025-11-01 16:51:43', 1),
(27, 38, 'Usuarios', '2025-11-01 16:51:45', 1),
(28, 38, 'Movimientos', '2025-11-01 16:51:54', 3);

-- --------------------------------------------------------

--
-- Table structure for table `categorias`
--

CREATE TABLE `categorias` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `empresa_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categorias`
--

INSERT INTO `categorias` (`id`, `nombre`, `descripcion`, `empresa_id`) VALUES
(24, 'Categoria 1', '21321321', 23),
(25, 'no', 'categoria equis', 21),
(27, 'Lapices', 'si', 23),
(28, 'Casco pastafarista', 'Un colador de espaguetis', 28),
(31, 'plastico', 'plasticos', 21),
(32, 'hoja', 'papeles', 21),
(33, 'categoria 1', 'cat1', 24),
(34, 'papeles', 'tipos de papeles', 24),
(35, 'Nueva categoria', 'Sisiis', 24),
(36, 'Ferreteria', 'unhuevo', 36),
(37, 'categoria', 'categoria de prueba', 38);

-- --------------------------------------------------------

--
-- Table structure for table `configuracion_empresa`
--

CREATE TABLE `configuracion_empresa` (
  `id_empresa` int(11) NOT NULL,
  `color_sidebar` varchar(20) DEFAULT NULL,
  `color_topbar` varchar(20) DEFAULT NULL,
  `orden_sidebar` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`orden_sidebar`)),
  `fecha_actualizacion` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `configuracion_empresa`
--

INSERT INTO `configuracion_empresa` (`id_empresa`, `color_sidebar`, `color_topbar`, `orden_sidebar`, `fecha_actualizacion`) VALUES
(21, '#454b52', '#8e8e8e', '[\"inicio\",\"area_almac_v2\\/gestion_areas_zonas.html\",\"gest_inve\\/inventario_basico.html\",\"admin_usuar\\/administracion_usuarios.html\",\"reports\\/reportes.html\",\"control_log\\/log.html\",\"account_suscrip\\/account_suscrip.html\"]', '2025-10-10 22:26:31'),
(22, '#ff6b6b', '#2b7a78', '[\"area_almac_v2\\/gestion_areas_zonas.html\",\"gest_inve\\/inventario_basico.html\",\"account_suscrip\\/account_suscrip.html\",\"inicio\",\"admin_usuar\\/administracion_usuarios.html\",\"reports\\/reportes.html\",\"control_log\\/log.html\"]', '2025-08-30 02:10:16'),
(23, '#454b52', '#454b52', '[\"inicio\",\"area_almac_v2\\/gestion_areas_zonas.html\",\"gest_inve\\/inventario_basico.html\",\"admin_usuar\\/administracion_usuarios.html\",\"reports\\/reportes.html\",\"control_log\\/log.html\",\"account_suscrip\\/account_suscrip.html\"]', '2025-10-16 13:58:49'),
(24, '#454b52', '#454b52', '[\"area_almac\\/areas_zonas.html\",\"gest_inve\\/inventario_basico.html\",\"inicio\",\"admin_usuar\\/administracion_usuarios.html\",\"reports\\/reportes.html\",\"control_log\\/log.html\",\"account_suscrip\\/account_suscrip.html\"]', '2025-11-07 04:54:44'),
(30, '#ffa41b', '#6c63ff', '[\"inicio\",\"area_almac_v2\\/gestion_areas_zonas.html\",\"gest_inve\\/inventario_basico.html\",\"admin_usuar\\/administracion_usuarios.html\",\"reports\\/reportes.html\",\"control_log\\/log.html\",\"account_suscrip\\/account_suscrip.html\"]', '2025-09-03 16:23:06'),
(31, '#0e9aa7', '#454b52', '[\"inicio\",\"area_almac_v2\\/gestion_areas_zonas.html\",\"gest_inve\\/inventario_basico.html\",\"admin_usuar\\/administracion_usuarios.html\",\"reports\\/reportes.html\",\"control_log\\/log.html\",\"account_suscrip\\/account_suscrip.html\"]', '2025-09-05 00:29:06'),
(32, '#6c63ff', '#ff66c4', '[\"inicio\",\"area_almac_v2\\/gestion_areas_zonas.html\",\"gest_inve\\/inventario_basico.html\",\"admin_usuar\\/administracion_usuarios.html\",\"reports\\/reportes.html\",\"control_log\\/log.html\",\"account_suscrip\\/account_suscrip.html\"]', '2025-09-10 16:12:51'),
(36, '#454b52', '#6c63ff', '[\"inicio\",\"area_almac_v2\\/gestion_areas_zonas.html\",\"gest_inve\\/inventario_basico.html\",\"admin_usuar\\/administracion_usuarios.html\",\"reports\\/reportes.html\",\"control_log\\/log.html\",\"account_suscrip\\/account_suscrip.html\"]', '2025-10-17 18:00:25'),
(38, '#6c63ff', '#ffa41b', '[\"inicio\",\"area_almac_v2\\/gestion_areas_zonas.html\",\"gest_inve\\/inventario_basico.html\",\"admin_usuar\\/administracion_usuarios.html\",\"reports\\/reportes.html\",\"control_log\\/log.html\",\"account_suscrip\\/account_suscrip.html\"]', '2025-10-31 00:11:59');

-- --------------------------------------------------------

--
-- Table structure for table `empresa`
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
-- Dumping data for table `empresa`
--

INSERT INTO `empresa` (`id_empresa`, `nombre_empresa`, `logo_empresa`, `sector_empresa`, `usuario_creador`, `fecha_registro`, `capacidad_maxima_m3`, `umbral_alerta_capacidad`) VALUES
(21, 'Discocks - CDs y Vinilos', 'images/logos/logo_21_1760134034.png', 'Comercial', 57, '2025-06-26 19:29:13', 0.00, 90.00),
(22, 'empresa', NULL, 'Industrial', 58, '2025-07-01 01:31:07', 0.00, 90.00),
(23, 'Papeleria Ely', NULL, 'Comercial', 33, '2025-07-01 01:45:04', 0.00, 90.00),
(24, 'EL KINI CORP', 'images/logos/logo_24_1760165299.jpg', 'Industrial', 60, '2025-07-01 01:45:36', 0.00, 90.00),
(25, 'elkini', NULL, 'Industrial', 56, '2025-07-01 13:17:34', 0.00, 90.00),
(26, 'Salchichas pepe', NULL, 'Comercial', 83, '2025-07-01 14:28:13', 0.00, 90.00),
(27, 'ROMO\'S', NULL, '', 91, '2025-08-02 14:54:20', 0.00, 90.00),
(28, 'Papamovil.net', NULL, '', 93, '2025-08-04 17:06:27', 0.00, 90.00),
(29, 'Optistock', NULL, 'Servicios', 97, '2025-08-08 04:18:41', 0.00, 90.00),
(30, 'KInicorp', '/images/logos/logo_1756916306.jpg', 'Servicios', 101, '2025-09-03 16:18:26', 0.00, 90.00),
(31, 'Discos de Vinilo y CD', NULL, 'Comercial', 102, '2025-09-05 00:27:10', 0.00, 90.00),
(32, 'Empresa.exe', NULL, '', 113, '2025-09-10 16:12:08', 0.00, 90.00),
(33, 'Ely', NULL, 'Comercial', 116, '2025-10-02 19:44:57', 0.00, 90.00),
(34, 'Elber Empresa', NULL, 'Servicios', 121, '2025-10-09 20:53:47', 0.00, 90.00),
(35, 'tony kawk ', '/images/logos/logo_1760224649.png', 'Comercial', 125, '2025-10-11 23:17:29', 0.00, 90.00),
(36, 'Momazos Kini', '/images/logos/logo_1760722944.jpg', 'Industrial', 130, '2025-10-17 17:42:24', 0.00, 90.00),
(38, 'Empresa de prueba', NULL, 'financiero', 132, '2025-10-27 18:04:22', 0.00, 90.00);

-- --------------------------------------------------------

--
-- Table structure for table `historial_busquedas`
--

CREATE TABLE `historial_busquedas` (
  `id` int(11) NOT NULL,
  `id_empresa` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `termino` varchar(255) NOT NULL,
  `fecha_busqueda` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `historial_busquedas`
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
(16, 21, 57, 'Movimientos', '2025-10-07 22:21:29'),
(17, 21, 57, 'Ver todo', '2025-10-08 15:54:47'),
(18, 21, 57, 'Movimientos', '2025-10-08 15:54:49'),
(19, 34, 121, 'Ver todo', '2025-10-09 20:54:37'),
(20, 21, 57, 'Ver todo', '2025-10-10 21:43:20'),
(21, 21, 57, 'Ver todo', '2025-10-10 21:43:21'),
(22, 21, 57, 'Ver todo', '2025-10-10 21:43:25'),
(23, 38, 132, 'Ver todo', '2025-11-01 16:51:32'),
(24, 38, 132, 'Productos', '2025-11-01 16:51:37'),
(25, 38, 132, 'Áreas', '2025-11-01 16:51:41'),
(26, 38, 132, 'Zonas', '2025-11-01 16:51:43'),
(27, 38, 132, 'Usuarios', '2025-11-01 16:51:45'),
(28, 38, 132, 'Movimientos', '2025-11-01 16:51:48'),
(29, 38, 132, 'Productos', '2025-11-01 16:51:50'),
(30, 38, 132, 'Productos', '2025-11-01 16:51:52'),
(31, 38, 132, 'Movimientos', '2025-11-01 16:51:53'),
(32, 38, 132, 'Movimientos', '2025-11-01 16:51:54'),
(33, 38, 132, 'Áreas', '2025-11-01 16:51:55');

-- --------------------------------------------------------

--
-- Table structure for table `log_control`
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
-- Dumping data for table `log_control`
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
(145, 57, 'Inventario', 'Ingreso de 2 unidad(es) del producto 46', '2025-10-07', '22:14:40'),
(146, 57, 'Reportes', 'Eliminó reporte: primer reporte automatico - 2025-10-07 18-10.pdf', '2025-10-08', '00:05:21'),
(147, 57, 'Reportes', 'Eliminó reporte: primer reporte automatico - 2025-10-08 18-10.pdf', '2025-10-08', '00:05:25'),
(148, 57, 'Reportes', 'Eliminó reporte: primer reporte automatico - 2025-10-09 18-10.pdf', '2025-10-08', '00:05:29'),
(149, 57, 'Reportes', 'Eliminó reporte: primer reporte automatico - 2025-10-10 18-10.pdf', '2025-10-08', '00:05:32'),
(150, 57, 'Reportes', 'Eliminó reporte: primer reporte automatico - 2025-10-07 18-06.pdf', '2025-10-08', '00:06:26'),
(151, 57, 'Reportes', 'Eliminó reporte: primer reporte automatico - 2025-10-13 18-10.pdf', '2025-10-08', '00:09:17'),
(152, 57, 'Reportes', 'Eliminó reporte: primer reporte automatico - 2025-10-12 18-10.pdf', '2025-10-08', '00:09:20'),
(153, 57, 'Reportes', 'Eliminó reporte: primer reporte automatico - 2025-10-11 18-10.pdf', '2025-10-08', '00:09:24'),
(154, 57, 'Reportes', 'Eliminó reporte: primer reporte automatico - 2025-10-10 18-10.pdf', '2025-10-08', '00:09:27'),
(155, 57, 'Reportes', 'Eliminó reporte: primer reporte automatico - 2025-10-09 18-10.pdf', '2025-10-08', '00:09:30'),
(156, 57, 'Reportes', 'Eliminó reporte: primer reporte automatico - 2025-10-08 18-10.pdf', '2025-10-08', '00:09:34'),
(157, 57, 'Reportes', 'Eliminó reporte: primer reporte automatico - 2025-10-07 18-10.pdf', '2025-10-08', '00:09:37'),
(158, 57, 'Reportes', 'Eliminó reporte: primer reporte automatico - 2025-10-14 18-10.pdf', '2025-10-08', '00:09:41'),
(159, 57, 'Reportes', 'Eliminó reporte: primer reporte automatico - 2025-10-11 18-10.pdf', '2025-10-08', '00:09:45'),
(160, 57, 'Reportes', 'Eliminó reporte: primer reporte automatico - 2025-10-12 18-10.pdf', '2025-10-08', '00:09:48'),
(161, 57, 'Reportes', 'Eliminó reporte: primer reporte automatico - 2025-10-13 18-10.pdf', '2025-10-08', '00:09:51'),
(162, 57, 'Reportes', 'Eliminó reporte: primer reporte automatico - 2025-10-14 18-10.pdf', '2025-10-08', '00:09:54'),
(163, 57, 'Inventario', 'Ingreso de 5 unidad(es) del producto 41', '2025-10-08', '00:51:08'),
(164, 57, 'Inventario', 'Egreso de 1 unidad(es) del producto 50', '2025-10-08', '00:51:13'),
(165, 57, 'Inventario', 'Ingreso de 3 unidad(es) del producto 41', '2025-10-08', '00:51:18'),
(166, 57, 'Inventario', 'Ingreso de 12 unidad(es) del producto 46', '2025-10-08', '00:51:23'),
(167, 57, 'Inventario', 'Ingreso de 10 unidad(es) del producto 50', '2025-10-08', '00:51:28'),
(168, 57, 'Inventario', 'Egreso de 4 unidad(es) del producto 45', '2025-10-08', '00:51:33'),
(169, 57, 'Inventario', 'Egreso de 5 unidad(es) del producto 50', '2025-10-08', '00:51:42'),
(170, 57, 'Inventario', 'Ingreso de 9 unidad(es) del producto 45', '2025-10-08', '00:51:47'),
(171, 57, 'Áreas', 'Creación de área: cocina', '2025-10-08', '15:58:47'),
(172, 57, 'Zonas', 'Creación de zona: refri', '2025-10-08', '15:59:22'),
(173, 57, 'Usuarios', 'Solicitud de código de recuperación de contraseña', '2025-10-09', '20:41:16'),
(174, 57, 'Usuarios', 'Solicitud de código de recuperación de contraseña', '2025-10-09', '20:42:29'),
(175, 57, 'Usuarios', 'Solicitud de código de recuperación de contraseña', '2025-10-09', '20:43:17'),
(176, 57, 'Usuarios', 'Solicitud de código de recuperación de contraseña', '2025-10-09', '20:44:23'),
(177, 121, 'Usuarios', 'Registro de usuario: ktota6235@gmail.com', '2025-10-09', '20:45:35'),
(178, 121, 'Usuarios', 'Reenvío de código de verificación de cuenta', '2025-10-09', '20:46:53'),
(179, 121, 'Usuarios', 'Reenvío de código de verificación de cuenta', '2025-10-09', '20:48:18'),
(180, 121, 'Usuarios', 'Reenvío de código de verificación de cuenta', '2025-10-09', '20:49:49'),
(181, 121, 'Usuarios', 'Reenvío de código de verificación de cuenta', '2025-10-09', '20:49:49'),
(182, 121, 'Usuarios', 'Solicitud de código de recuperación de contraseña', '2025-10-09', '20:52:09'),
(183, 121, 'Usuarios', 'Reenvío de código de verificación de cuenta', '2025-10-09', '20:53:08'),
(184, 121, 'Usuarios', 'Verificación de cuenta completada', '2025-10-09', '20:53:21'),
(185, 121, 'Empresas', 'Registro de empresa: Elber Empresa', '2025-10-09', '20:53:47'),
(186, 57, 'Reportes', 'Eliminó reporte: reporte automatico - 2025-10-09 15-03.pdf', '2025-10-09', '21:03:57'),
(187, 57, 'Reportes', 'Eliminó reporte: auto - 2025-10-08 11-00.pdf', '2025-10-09', '21:04:05'),
(188, 57, 'Reportes', 'Eliminó reporte: auto - 2025-10-08 11-00.pdf', '2025-10-09', '21:04:10'),
(189, 57, 'Reportes', 'Eliminó reporte: auto - 2025-10-08 11-00.pdf', '2025-10-09', '21:04:13'),
(190, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-09 15-11.pdf', '2025-10-09', '21:12:23'),
(191, 121, 'Usuarios', 'Solicitud de código de recuperación de contraseña', '2025-10-09', '21:23:33'),
(192, 57, 'Usuarios', 'Solicitud de código de recuperación de contraseña', '2025-10-09', '22:56:54'),
(193, 57, 'Empresas', 'Actualización de empresa ID: 21', '2025-10-10', '00:51:38'),
(194, 57, 'Usuarios', 'Desactivación de usuario empresa: 110', '2025-10-10', '00:55:47'),
(195, 57, 'Usuarios', 'Activación de usuario empresa: 110', '2025-10-10', '00:55:50'),
(196, 57, 'Usuarios', 'Actualización de usuario: 57', '2025-10-10', '01:00:49'),
(197, 57, 'Inventario', 'Ingreso de 1 unidad(es) del producto 45', '2025-10-10', '02:51:50'),
(198, 111, 'Usuarios', 'Actualización de usuario: 111', '2025-10-10', '02:55:39'),
(199, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-10-10', '02:57:17'),
(200, 127, 'Usuarios', 'Actualización de datos por registro con Google', '2025-10-10', '17:46:49'),
(201, 57, 'Reportes', 'Eliminó reporte: historial_notificaciones.xlsx', '2025-10-10', '20:51:09'),
(202, 57, 'Zonas', 'Eliminación aprobada de la zona ID 26', '2025-10-10', '20:51:26'),
(203, 57, 'Usuarios', 'Edición aprobada del usuario ID 119', '2025-10-10', '21:39:27'),
(204, 57, 'Inventario', 'Ingreso de 1 unidad(es) del producto 45', '2025-10-10', '21:42:11'),
(205, 57, 'Subcategorías', 'Eliminación de subcategoría ID: 33', '2025-10-10', '21:42:26'),
(206, 57, 'Áreas', 'Actualización aprobada del área ID 32', '2025-10-10', '21:42:59'),
(207, 57, 'Empresa', 'Actualización aprobada de la empresa ID 21', '2025-10-10', '22:07:14'),
(208, 57, 'Inventario', 'Egreso de 6 unidad(es) del producto 50', '2025-10-10', '22:12:24'),
(209, 57, 'Inventario', 'Ingreso de 2 unidad(es) del producto 50', '2025-10-10', '22:12:51'),
(210, 57, 'Inventario', 'Egreso de 2 unidad(es) del producto 50', '2025-10-10', '22:12:59'),
(211, 57, 'Inventario', 'Ingreso de 2 unidad(es) del producto 50', '2025-10-10', '22:13:31'),
(212, 57, 'Usuarios', 'Actualización aprobada del usuario ID 57', '2025-10-10', '22:23:28'),
(213, 57, 'Configuración', 'Actualización de configuración para empresa 21', '2025-10-10', '22:26:31'),
(214, 57, 'Usuarios', 'Desactivación aprobada del usuario ID 110', '2025-10-10', '23:48:22'),
(215, 57, 'Usuarios', 'Activación aprobada del usuario ID 110', '2025-10-10', '23:48:34'),
(216, 57, 'Usuarios', 'Asignación de área aprobada (usuario 110, área 32)', '2025-10-10', '23:49:01'),
(217, 57, 'Usuarios', 'Revocación de acceso aprobada (usuario 111, área 21)', '2025-10-10', '23:49:06'),
(218, 111, 'Usuarios', 'Actualización aprobada del usuario ID 111', '2025-10-10', '23:51:48'),
(219, 57, 'Usuarios', 'Revocación de acceso aprobada (usuario 110, área 32)', '2025-10-11', '00:00:23'),
(220, 60, 'Empresa', 'Actualización aprobada de la empresa ID 24', '2025-10-11', '06:48:19'),
(221, 60, 'Usuarios', 'Actualización aprobada del usuario ID 60', '2025-10-11', '06:49:00'),
(222, 60, 'Usuarios', 'Actualización aprobada del usuario ID 60', '2025-10-11', '06:49:03'),
(223, 60, 'Configuración', 'Actualización de configuración para empresa 24', '2025-10-11', '06:49:22'),
(224, 57, 'Usuarios', 'Edición aprobada del usuario ID 119', '2025-10-11', '19:30:52'),
(225, 57, 'Usuarios', 'Edición aprobada del usuario ID 119', '2025-10-11', '19:30:53'),
(226, 57, 'Usuarios', 'Edición aprobada del usuario ID 119', '2025-10-11', '19:31:01'),
(227, 57, 'Usuarios', 'Edición aprobada del usuario ID 119', '2025-10-11', '19:31:01'),
(228, 57, 'Usuarios', 'Edición aprobada del usuario ID 119', '2025-10-11', '19:31:02'),
(229, 57, 'Usuarios', 'Edición aprobada del usuario ID 119', '2025-10-11', '19:31:02'),
(230, 57, 'Usuarios', 'Edición aprobada del usuario ID 119', '2025-10-11', '19:31:02'),
(231, 57, 'Usuarios', 'Desactivación aprobada del usuario ID 119', '2025-10-11', '19:55:38'),
(232, 57, 'Usuarios', 'Activación aprobada del usuario ID 119', '2025-10-11', '19:55:45'),
(233, 57, 'Usuarios', 'Actualización aprobada del usuario ID 57', '2025-10-11', '19:56:23'),
(234, 57, 'Usuarios', 'Actualización aprobada del usuario ID 57', '2025-10-11', '19:56:23'),
(235, 57, 'Empresa', 'Actualización aprobada de la empresa ID 21', '2025-10-11', '19:56:40'),
(236, 57, 'Empresa', 'Actualización aprobada de la empresa ID 21', '2025-10-11', '19:56:50'),
(237, 57, 'Empresa', 'Actualización aprobada de la empresa ID 21', '2025-10-11', '19:56:51'),
(238, 57, 'Empresa', 'Actualización aprobada de la empresa ID 21', '2025-10-11', '19:56:51'),
(239, 57, 'Empresa', 'Actualización aprobada de la empresa ID 21', '2025-10-11', '19:56:51'),
(240, 57, 'Empresa', 'Actualización aprobada de la empresa ID 21', '2025-10-11', '19:56:51'),
(241, 57, 'Empresa', 'Actualización aprobada de la empresa ID 21', '2025-10-11', '19:56:51'),
(242, 57, 'Empresa', 'Actualización aprobada de la empresa ID 21', '2025-10-11', '19:56:51'),
(243, 57, 'Usuarios', 'Edición aprobada del usuario ID 119', '2025-10-11', '19:59:59'),
(244, 57, 'Usuarios', 'Edición aprobada del usuario ID 119', '2025-10-11', '20:00:00'),
(245, 57, 'Usuarios', 'Edición aprobada del usuario ID 119', '2025-10-11', '21:13:22'),
(246, 57, 'Usuarios', 'Edición aprobada del usuario ID 119', '2025-10-11', '21:13:35'),
(247, 57, 'Productos', 'Actualización aprobada del producto ID 46', '2025-10-11', '21:14:23'),
(248, 57, 'Áreas', 'Actualización aprobada del área ID 21', '2025-10-11', '21:14:41'),
(249, 57, 'Usuarios', 'Desactivación aprobada del usuario ID 110', '2025-10-11', '21:14:48'),
(250, 57, 'Usuarios', 'Activación aprobada del usuario ID 110', '2025-10-11', '21:14:53'),
(251, 57, 'Áreas', 'Actualización aprobada del área ID 32', '2025-10-11', '21:23:40'),
(252, 57, 'Productos', 'Actualización aprobada del producto ID 46', '2025-10-11', '21:24:04'),
(253, 57, 'Usuarios', 'Desactivación aprobada del usuario ID 119', '2025-10-11', '21:36:33'),
(254, 57, 'Usuarios', 'Activación aprobada del usuario ID 119', '2025-10-11', '21:36:39'),
(255, 57, 'Usuarios', 'Solicitud de código de recuperación de contraseña', '2025-10-11', '23:14:50'),
(256, 57, 'Usuarios', 'Código de recuperación validado', '2025-10-11', '23:15:19'),
(257, 57, 'Usuarios', 'Recuperación de contraseña completada', '2025-10-11', '23:15:27'),
(258, 125, 'Usuarios', 'Reenvío de código de verificación de cuenta', '2025-10-11', '23:16:11'),
(259, 125, 'Usuarios', 'Verificación de cuenta completada', '2025-10-11', '23:16:31'),
(260, 125, 'Empresas', 'Registro de empresa: tony kawk ', '2025-10-11', '23:17:29'),
(261, 129, 'Categorías', 'Creación de categoría: Nueva categoria', '2025-10-12', '18:32:11'),
(262, 57, 'Inventario', 'Egreso de 2 unidad(es) del producto 50', '2025-10-13', '19:42:48'),
(263, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-13 14-06.pdf', '2025-10-13', '20:07:40'),
(264, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-13 14-08.pdf', '2025-10-13', '20:08:17'),
(265, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-13 14-08.pdf', '2025-10-13', '20:08:20'),
(266, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-13 14-08.pdf', '2025-10-13', '20:08:23'),
(267, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-13 14-08.pdf', '2025-10-13', '20:13:24'),
(268, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-13 14-08.pdf', '2025-10-13', '20:13:28'),
(269, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-13 14-08.pdf', '2025-10-13', '20:13:31'),
(270, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-13 14-08.pdf', '2025-10-13', '20:13:34'),
(271, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-13 14-08.pdf', '2025-10-13', '20:13:37'),
(272, 57, 'Inventario', 'Ingreso de 3 unidad(es) del producto 50', '2025-10-13', '20:20:57'),
(273, 57, 'Reportes', 'Eliminó reporte: otro reporte - 2025-10-13 14-20.pdf', '2025-10-13', '20:22:50'),
(274, 57, 'Reportes', 'Eliminó reporte: semanal - 2025-10-13 14-36.pdf', '2025-10-13', '20:36:53'),
(275, 57, 'Reportes', 'Eliminó reporte: semanal - 2025-10-13 14-30.pdf', '2025-10-13', '20:36:57'),
(276, 57, 'Inventario', 'Ingreso de 1 unidad(es) del producto 50', '2025-10-13', '23:13:13'),
(277, 57, 'Inventario', 'Ingreso de 12 unidad(es) del producto 41', '2025-10-13', '23:13:18'),
(278, 57, 'Inventario', 'Egreso de 3 unidad(es) del producto 50', '2025-10-13', '23:13:22'),
(279, 57, 'Inventario', 'Egreso de 10 unidad(es) del producto 46', '2025-10-13', '23:13:29'),
(280, 57, 'Inventario', 'Ingreso de 4 unidad(es) del producto 45', '2025-10-13', '23:13:33'),
(281, 57, 'Inventario', 'Egreso de 10 unidad(es) del producto 41', '2025-10-13', '23:13:39'),
(282, 57, 'Inventario', 'Ingreso de 5 unidad(es) del producto 50', '2025-10-13', '23:13:44'),
(283, 57, 'Inventario', 'Egreso de 4 unidad(es) del producto 50', '2025-10-13', '23:13:49'),
(284, 57, 'Inventario', 'Ingreso de 10 unidad(es) del producto 41', '2025-10-13', '23:13:54'),
(285, 57, 'Inventario', 'Ingreso de 10 unidad(es) del producto 45', '2025-10-13', '23:13:59'),
(286, 57, 'Inventario', 'Egreso de 20 unidad(es) del producto 41', '2025-10-13', '23:14:05'),
(287, 57, 'Inventario', 'Ingreso de 3 unidad(es) del producto 41', '2025-10-13', '23:14:09'),
(288, 57, 'Inventario', 'Egreso de 2 unidad(es) del producto 46', '2025-10-13', '23:14:14'),
(289, 57, 'Inventario', 'Ingreso de 9 unidad(es) del producto 50', '2025-10-13', '23:14:20'),
(290, 57, 'Inventario', 'Egreso de 10 unidad(es) del producto 45', '2025-10-13', '23:14:29'),
(291, 57, 'Inventario', 'Egreso de 2 unidad(es) del producto 45', '2025-10-13', '23:14:38'),
(292, 57, 'Inventario', 'Ingreso de 3 unidad(es) del producto 46', '2025-10-13', '23:14:43'),
(293, 57, 'Inventario', 'Egreso de 7 unidad(es) del producto 50', '2025-10-13', '23:14:51'),
(294, 57, 'Inventario', 'Ingreso de 2 unidad(es) del producto 50', '2025-10-13', '23:15:00'),
(295, 57, 'Inventario', 'Ingreso de 20 unidad(es) del producto 50', '2025-10-13', '23:15:07'),
(296, 57, 'Inventario', 'Egreso de 15 unidad(es) del producto 50', '2025-10-13', '23:15:15'),
(297, 57, 'Reportes', 'Eliminó reporte: mkm - 2025-10-13 17-15.pdf', '2025-10-13', '23:16:09'),
(298, 57, 'Reportes', 'Eliminó reporte: otro reporte - 2025-10-13 17-18.pdf', '2025-10-13', '23:18:29'),
(299, 57, 'Reportes', 'Eliminó reporte: ocupacion_zonas.pdf', '2025-10-14', '00:33:56'),
(300, 57, 'Reportes', 'Eliminó reporte: ocupacion_zonas.pdf', '2025-10-14', '01:11:14'),
(301, 57, 'Reportes', 'Eliminó reporte: ocupacion_zonas.pdf', '2025-10-14', '01:11:19'),
(302, 57, 'Reportes', 'Eliminó reporte: inventario_productos.pdf', '2025-10-14', '01:11:23'),
(303, 57, 'Reportes', 'Eliminó reporte: historial_notificaciones.xlsx', '2025-10-14', '01:11:27'),
(304, 57, 'Reportes', 'Eliminó reporte: usuarios_empresa.pdf', '2025-10-14', '01:11:35'),
(305, 57, 'Reportes', 'Eliminó reporte: inventario_productos.pdf', '2025-10-14', '01:40:58'),
(306, 57, 'Productos', 'Actualización aprobada del producto ID 45', '2025-10-14', '01:52:34'),
(307, 57, 'Reportes', 'Eliminó reporte: inventario_productos.pdf', '2025-10-14', '01:53:20'),
(308, 57, 'Usuarios', 'Actualización aprobada del usuario ID 57', '2025-10-14', '01:56:48'),
(309, 57, 'Usuarios', 'Revocación de acceso aprobada (usuario 111, área 31)', '2025-10-14', '01:57:09'),
(310, 57, 'Reportes', 'Eliminó reporte: ocupacion_zonas.pdf', '2025-10-14', '01:58:36'),
(311, 57, 'Reportes', 'Eliminó reporte: inventario_productos.pdf', '2025-10-14', '01:58:42'),
(312, 57, 'Reportes', 'Eliminó reporte: inventario_productos.pdf', '2025-10-14', '01:58:46'),
(313, 57, 'Reportes', 'Eliminó reporte: usuarios_empresa.pdf', '2025-10-14', '01:58:50'),
(314, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-13 20-00.pdf', '2025-10-14', '02:07:33'),
(315, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-13 20-00.pdf', '2025-10-14', '02:07:36'),
(316, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-13 20-00.pdf', '2025-10-14', '02:07:39'),
(317, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-13 20-00.pdf', '2025-10-14', '02:07:43'),
(318, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-13 20-00.pdf', '2025-10-14', '02:07:48'),
(319, 60, 'Usuarios', 'Asignación de área aprobada (usuario 129, área 30)', '2025-10-14', '17:16:29'),
(320, 57, 'Reportes', 'Eliminó reporte: otro reporte - 2025-10-14 08-00.pdf', '2025-10-14', '20:14:17'),
(321, 57, 'Reportes', 'Eliminó reporte: otro reporte - 2025-10-14 08-00.pdf', '2025-10-14', '20:14:25'),
(322, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-13 20-00.pdf', '2025-10-14', '20:14:35'),
(323, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-14 14-16.csv', '2025-10-14', '22:25:03'),
(324, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-14 16-25.csv', '2025-10-14', '22:25:11'),
(325, 57, 'Reportes', 'Eliminó reporte: otro reporte - 2025-10-14 16-25.pdf', '2025-10-14', '22:25:19'),
(326, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-14 16-50.csv', '2025-10-14', '22:50:11'),
(327, 57, 'Reportes', 'Eliminó reporte: otro reporte - 2025-10-14 16-50.pdf', '2025-10-14', '23:05:13'),
(328, 57, 'Reportes', 'Eliminó reporte: otro reporte - 2025-10-14 17-05.pdf', '2025-10-14', '23:05:23'),
(329, 57, 'Reportes', 'Eliminó reporte: otro reporte - 2025-10-14 17-06.pdf', '2025-10-14', '23:24:02'),
(330, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-14 17-24.csv', '2025-10-14', '23:24:08'),
(331, 57, 'Reportes', 'Eliminó reporte: otro reporte - 2025-10-14 17-24.pdf', '2025-10-14', '23:24:13'),
(332, 57, 'Reportes', 'Eliminó reporte: otro reporte - 2025-10-14 17-24.pdf', '2025-10-14', '23:24:35'),
(333, 57, 'Reportes', 'Eliminó reporte: inventario_productos.pdf', '2025-10-14', '23:28:48'),
(334, 57, 'Reportes', 'Eliminó reporte: inventario_productos.pdf', '2025-10-14', '23:28:51'),
(335, 57, 'Reportes', 'Eliminó reporte: historial_solicitudes.pdf', '2025-10-14', '23:53:50'),
(336, 57, 'Reportes', 'Eliminó reporte: ocupacion_zonas.pdf', '2025-10-14', '23:54:27'),
(337, 57, 'Usuarios', 'Desactivación aprobada del usuario ID 110', '2025-10-15', '15:54:10'),
(338, 57, 'Usuarios', 'Activación aprobada del usuario ID 110', '2025-10-15', '15:55:16'),
(339, 57, 'Inventario', 'Egreso de 5 unidad(es) del producto 46', '2025-10-15', '15:56:53'),
(340, 33, 'Empresa', 'Actualización aprobada de la empresa ID 23', '2025-10-15', '18:17:59'),
(341, 33, 'Productos', 'Eliminación aprobada del producto ID 36', '2025-10-15', '18:18:58'),
(342, 33, 'Zonas', 'Eliminación aprobada de la zona ID 18 (Mostrador)', '2025-10-15', '18:19:05'),
(343, 33, 'Áreas', 'Eliminación aprobada del área ID 23', '2025-10-15', '18:19:11'),
(344, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-15 20-00.csv', '2025-10-16', '02:49:51'),
(345, 57, 'Reportes', 'Eliminó reporte: otro reporte - 2025-10-15 17-06.pdf', '2025-10-16', '02:49:56'),
(346, 33, 'Áreas', 'Creación aprobada del área \"Papeleria\" (ID 33)', '2025-10-16', '13:51:28'),
(347, 33, 'Zonas', 'Creación aprobada de la zona \"zona 1\" (ID 27)', '2025-10-16', '13:52:02'),
(348, 33, 'Productos', 'Creación aprobada del producto \"NADYA\" (ID 53)', '2025-10-16', '13:53:24'),
(349, 33, 'Configuración', 'Actualización de configuración para empresa 23', '2025-10-16', '13:58:49'),
(350, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-14 20-00.csv', '2025-10-16', '18:48:08'),
(351, 57, 'Reportes', 'Eliminó reporte: historial_solicitudes.pdf', '2025-10-16', '18:48:34'),
(352, 57, 'Reportes', 'Eliminó reporte: historial_solicitudes.pdf', '2025-10-16', '18:48:38'),
(353, 57, 'Reportes', 'Eliminó reporte: otro reporte - 2025-10-16 12-48.pdf', '2025-10-16', '18:48:53'),
(354, 57, 'Reportes', 'Eliminó reporte: otro reporte - 2025-10-16 12-48.pdf', '2025-10-16', '18:50:26'),
(355, 57, 'Reportes', 'Eliminó reporte: otro reporte - 2025-10-16 12-55.pdf', '2025-10-16', '18:57:31'),
(356, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-16 13-00.csv', '2025-10-16', '19:00:18'),
(357, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-16 13-00.pdf', '2025-10-16', '19:00:31'),
(358, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-16 13-00.pdf', '2025-10-16', '19:24:09'),
(359, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-16 13-26.pdf', '2025-10-16', '19:26:58'),
(360, 57, 'Reportes', 'Eliminó reporte: otro reporte - 2025-10-16 13-26.pdf', '2025-10-16', '20:35:44'),
(361, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-16 14-35.pdf', '2025-10-16', '20:36:00'),
(362, 57, 'Reportes', 'Eliminó reporte: otro reporte - 2025-10-16 14-36.pdf', '2025-10-16', '20:36:12'),
(363, 57, 'Reportes', 'Eliminó reporte: otro reporte - 2025-10-16 14-38.pdf', '2025-10-16', '20:49:28'),
(364, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-16 14-49.pdf', '2025-10-16', '20:49:56'),
(365, 57, 'Inventario', 'Ingreso de 1 unidad(es) del producto 46', '2025-10-16', '21:12:21'),
(366, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-16 21-25.pdf', '2025-10-16', '21:25:22'),
(367, 57, 'Reportes', 'Eliminó reporte: otro reporte - 2025-10-16 21-26.pdf', '2025-10-16', '21:26:40'),
(368, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-16 21-25.pdf', '2025-10-16', '21:26:43'),
(369, 57, 'Reportes', 'Eliminó reporte: usuarios_empresa.pdf', '2025-10-16', '21:29:46'),
(370, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-16 21-28.pdf', '2025-10-16', '21:31:08'),
(371, 57, 'Inventario', 'Ingreso de 20 unidad(es) del producto 45', '2025-10-16', '21:31:19'),
(372, 57, 'Inventario', 'Egreso de 1 unidad(es) del producto 50', '2025-10-16', '21:31:23'),
(373, 57, 'Inventario', 'Ingreso de 3 unidad(es) del producto 41', '2025-10-16', '21:31:28'),
(374, 57, 'Inventario', 'Ingreso de 1 unidad(es) del producto 46', '2025-10-16', '21:31:31'),
(375, 57, 'Inventario', 'Egreso de 2 unidad(es) del producto 45', '2025-10-16', '21:31:35'),
(376, 57, 'Inventario', 'Egreso de 13 unidad(es) del producto 45', '2025-10-16', '21:31:40'),
(377, 57, 'Reportes', 'Eliminó reporte: usuarios - 2025-10-16 21-33.pdf', '2025-10-16', '21:34:07'),
(378, 57, 'Reportes', 'Eliminó reporte: otro reporte - 2025-10-16 21-31.pdf', '2025-10-16', '21:44:03'),
(379, 57, 'Inventario', 'Ingreso de 20 unidad(es) del producto 45', '2025-10-16', '21:58:53'),
(380, 57, 'Inventario', 'Egreso de 1 unidad(es) del producto 50', '2025-10-16', '21:58:57'),
(381, 57, 'Inventario', 'Egreso de 7 unidad(es) del producto 50', '2025-10-16', '21:59:03'),
(382, 57, 'Reportes', 'Eliminó reporte: ingresos y egresos - 2025-10-16 21-57.pdf', '2025-10-16', '21:59:25'),
(383, 57, 'Reportes', 'Eliminó reporte: ingresos - 2025-10-16 21-58.pdf', '2025-10-16', '21:59:29'),
(384, 57, 'Reportes', 'Eliminó reporte: histoial - 2025-10-16 21-56.pdf', '2025-10-16', '21:59:33'),
(385, 57, 'Reportes', 'Eliminó reporte: egresos - 2025-10-16 22-00.pdf', '2025-10-16', '22:01:04'),
(386, 57, 'Reportes', 'Eliminó reporte: sdg - 2025-10-16 21-54.pdf', '2025-10-16', '22:01:09'),
(387, 57, 'Reportes', 'Eliminó reporte: ingresos y egresos - 2025-10-16 21-47.pdf', '2025-10-16', '22:01:13'),
(388, 57, 'Reportes', 'Eliminó reporte: usuarios - 2025-10-16 21-44.pdf', '2025-10-16', '22:01:18'),
(389, 57, 'Reportes', 'Eliminó reporte: solicitudes - 2025-10-16 22-02.pdf', '2025-10-16', '22:02:34'),
(390, 57, 'Usuarios', 'Asignación de área aprobada (usuario 119, área 32)', '2025-10-16', '22:04:20'),
(391, 57, 'Reportes', 'Eliminó reporte: historial_solicitudes.pdf', '2025-10-16', '22:04:52'),
(392, 57, 'Reportes', 'Eliminó reporte: accesos - 2025-10-16 22-05.pdf', '2025-10-16', '22:05:41'),
(393, 57, 'Reportes', 'Eliminó reporte: when - 2025-10-16 23-00.pdf', '2025-10-16', '23:01:35'),
(394, 57, 'Reportes', 'Eliminó reporte: sdg - 2025-10-16 23-00.pdf', '2025-10-16', '23:01:52'),
(395, 57, 'Reportes', 'Eliminó reporte: ingresos - 2025-10-16 23-02.pdf', '2025-10-16', '23:02:53'),
(396, 57, 'Reportes', 'Eliminó reporte: egresos - 2025-10-16 23-01.pdf', '2025-10-16', '23:02:56'),
(397, 57, 'Reportes', 'Eliminó reporte: egresos - 2025-10-16 23-16.pdf', '2025-10-16', '23:17:02'),
(398, 57, 'Reportes', 'Eliminó reporte: ingresos - 2025-10-16 23-16.pdf', '2025-10-16', '23:17:18'),
(399, 57, 'Reportes', 'Eliminó reporte: ingresos y egresos - 2025-10-16 23-17.pdf', '2025-10-16', '23:36:28'),
(400, 57, 'Reportes', 'Eliminó reporte: ingresos y egresos - 2025-10-16 23-36.pdf', '2025-10-16', '23:37:16'),
(401, 57, 'Reportes', 'Eliminó reporte: usuarios - 2025-10-16 23-37.pdf', '2025-10-16', '23:37:28'),
(402, 57, 'Reportes', 'Eliminó reporte: sdg - 2025-10-16 23-37.pdf', '2025-10-16', '23:37:47'),
(403, 57, 'Reportes', 'Eliminó reporte: actividades - 2025-10-16 23-37.pdf', '2025-10-16', '23:38:07'),
(404, 57, 'Reportes', 'Eliminó reporte: solicitudes - 2025-10-16 23-38.pdf', '2025-10-16', '23:38:29'),
(405, 57, 'Reportes', 'Eliminó reporte: accesos - 2025-10-16 23-38.pdf', '2025-10-16', '23:38:48'),
(406, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-10-16 23-38.pdf', '2025-10-16', '23:39:31'),
(407, 57, 'Inventario', 'Egreso de 40 unidad(es) del producto 45', '2025-10-16', '23:39:45'),
(408, 57, 'Inventario', 'Ingreso de 20 unidad(es) del producto 45', '2025-10-16', '23:39:51'),
(409, 57, 'Inventario', 'Ingreso de 2 unidad(es) del producto 41', '2025-10-16', '23:39:55'),
(410, 57, 'Inventario', 'Egreso de 1 unidad(es) del producto 46', '2025-10-16', '23:40:00'),
(411, 57, 'Reportes', 'Eliminó reporte: ingresos y egresos - 2025-10-16 23-40.pdf', '2025-10-16', '23:40:33'),
(412, 57, 'Reportes', 'Eliminó reporte: a - 2025-10-16 23-40.pdf', '2025-10-16', '23:40:55'),
(413, 57, 'Reportes', 'Eliminó reporte: b - 2025-10-16 23-41.pdf', '2025-10-16', '23:41:17'),
(414, 57, 'Reportes', 'Eliminó reporte: ingresos y egresos - 2025-10-16 23-41.pdf', '2025-10-16', '23:41:25'),
(415, 57, 'Inventario', 'Ingreso de 1 unidad(es) del producto 41', '2025-10-16', '23:41:34'),
(416, 57, 'Inventario', 'Egreso de 1 unidad(es) del producto 50', '2025-10-16', '23:41:39'),
(417, 57, 'Reportes', 'Eliminó reporte: usuarios - 2025-10-16 19-00.pdf', '2025-10-17', '01:13:43'),
(418, 57, 'Reportes', 'Eliminó reporte: usuarios - 2025-10-16 19-00.pdf', '2025-10-17', '01:13:50'),
(419, 57, 'Reportes', 'Eliminó reporte: usuarios - 2025-10-16 19-00.pdf', '2025-10-17', '01:13:53'),
(420, 57, 'Reportes', 'Eliminó reporte: usuarios - 2025-10-16 19-00.pdf', '2025-10-17', '01:13:56'),
(421, 57, 'Reportes', 'Eliminó reporte: inventario_productos.pdf', '2025-10-17', '01:15:50'),
(422, 57, 'Reportes', 'Eliminó reporte: sdg - 2025-10-17 01-13.pdf', '2025-10-17', '01:15:57'),
(423, 57, 'Reportes', 'Eliminó reporte: usuarios - 2025-10-17 01-14.pdf', '2025-10-17', '01:16:03'),
(424, 57, 'Reportes', 'Eliminó reporte: sdg - 2025-10-17 01-30.pdf', '2025-10-17', '01:30:43'),
(425, 57, 'Inventario', 'Ingreso de 1 unidad(es) del producto 50', '2025-10-17', '02:04:05'),
(426, 57, 'Reportes', 'Eliminó reporte: sdg - 2025-10-17 02-04.pdf', '2025-10-17', '02:05:06'),
(427, 57, 'Reportes', 'Eliminó reporte: usuarios_empresa.pdf', '2025-10-17', '02:09:06'),
(428, 57, 'Reportes', 'Eliminó reporte: inventario_productos.pdf', '2025-10-17', '02:09:09'),
(429, 57, 'Reportes', 'Eliminó reporte: ocupacion_zonas.pdf', '2025-10-17', '02:09:12'),
(430, 130, 'Usuarios', 'Actualización de datos por registro con Google', '2025-10-17', '17:39:24'),
(431, 130, 'Empresas', 'Registro de empresa: Momazos Kini', '2025-10-17', '17:42:24'),
(432, 130, 'Áreas', 'Creación aprobada del área \"Almacen 1\" (ID 34)', '2025-10-17', '17:45:28'),
(433, 130, 'Zonas', 'Creación aprobada de la zona \"Rack1\" (ID 28)', '2025-10-17', '17:47:02'),
(434, 130, 'Categorías', 'Creación de categoría: Ferreteria', '2025-10-17', '17:48:10'),
(435, 130, 'Subcategorías', 'Creación de subcategoría: Tornillos', '2025-10-17', '17:48:34'),
(436, 130, 'Productos', 'Creación aprobada del producto \"Pq tornillo 50 pz\" (ID 54)', '2025-10-17', '17:51:31'),
(437, 130, 'Inventario', 'Egreso de 8 unidad(es) del producto 54', '2025-10-17', '17:53:51'),
(438, 130, 'Configuración', 'Actualización de configuración para empresa 36', '2025-10-17', '18:00:25'),
(439, 57, 'Reportes', 'Eliminó reporte: usuarios_empresa.pdf', '2025-10-18', '00:12:05'),
(440, 57, 'Reportes', 'Eliminó reporte: usuarios - 2025-10-18 00-10.pdf', '2025-10-18', '00:12:08'),
(441, 60, 'Productos', 'Eliminación aprobada del producto ID 51', '2025-10-19', '00:47:29'),
(442, 60, 'Áreas', 'Eliminación aprobada del área ID 25', '2025-10-19', '00:48:40'),
(443, 57, 'Reportes', 'Eliminó reporte: d - 2025-10-21 08-00.csv', '2025-10-21', '18:08:59'),
(444, 57, 'Reportes', 'Eliminó reporte: d - 2025-10-20 08-00.csv', '2025-10-21', '18:09:02'),
(445, 57, 'Reportes', 'Eliminó reporte: d - 2025-10-19 08-00.csv', '2025-10-21', '18:09:06'),
(446, 57, 'Reportes', 'Eliminó reporte: d - 2025-10-18 14-00.csv', '2025-10-21', '18:09:10'),
(447, 57, 'Reportes', 'Eliminó reporte: usuarios - 2025-10-21 18-08.pdf', '2025-10-21', '18:09:35'),
(448, 60, 'Configuración', 'Actualización de configuración para empresa 24', '2025-10-22', '14:43:12'),
(449, 60, 'Configuración', 'Actualización de configuración para empresa 24', '2025-10-22', '15:41:42'),
(450, 60, 'Configuración', 'Actualización de configuración para empresa 24', '2025-10-22', '15:42:04'),
(451, 60, 'Usuarios', 'Actualización aprobada del usuario ID 60', '2025-10-22', '15:42:51'),
(452, 131, 'Usuarios', 'Registro de usuario: cuentadeprueba@gmail.com', '2025-10-24', '23:03:26'),
(453, 131, 'Usuarios', 'Reenvío de código de verificación de cuenta', '2025-10-24', '23:03:42'),
(454, 131, 'Usuarios', 'Reenvío de código de verificación de cuenta', '2025-10-24', '23:03:44'),
(455, 131, 'Usuarios', 'Solicitud de código de recuperación de contraseña', '2025-10-24', '23:36:44'),
(456, 131, 'Usuarios', 'Solicitud de código de recuperación de contraseña', '2025-10-24', '23:36:46'),
(457, 57, 'Usuarios', 'Solicitud de código de recuperación de contraseña', '2025-10-24', '23:36:59'),
(458, 57, 'Usuarios', 'Código de recuperación validado', '2025-10-24', '23:37:16'),
(459, 57, 'Usuarios', 'Recuperación de contraseña completada', '2025-10-24', '23:37:41'),
(460, 132, 'Usuarios', 'Actualización de datos por registro con Google', '2025-10-27', '17:06:57'),
(461, 132, 'Empresas', 'Registro de empresa: Empresa de prueba', '2025-10-27', '17:07:15'),
(462, 132, 'Configuración', 'Actualización de configuración para empresa 37', '2025-10-27', '17:07:39'),
(463, 132, 'Empresas', 'Registro de empresa: Empresa de prueba', '2025-10-27', '18:04:22'),
(464, 60, 'Zonas', 'Eliminación aprobada de la zona ID 25 (vitrina)', '2025-10-29', '13:42:37'),
(465, 60, 'Áreas', 'Actualización aprobada del área ID 22', '2025-10-29', '13:42:47'),
(466, 57, 'Áreas', 'Eliminación aprobada del área ID 32', '2025-10-29', '15:43:53'),
(467, 57, 'Áreas', 'Eliminación aprobada del área ID 31', '2025-10-29', '15:44:11'),
(468, 60, 'Áreas', 'Eliminación aprobada del área ID 30', '2025-10-29', '15:45:59'),
(469, 132, 'Configuración', 'Actualización de configuración para empresa 38', '2025-10-31', '00:11:59'),
(470, 132, 'Áreas', 'Creación aprobada del área \"area\" (ID 35)', '2025-11-01', '14:56:45'),
(471, 132, 'Zonas', 'Creación aprobada de la zona \"zona\" (ID 29)', '2025-11-01', '14:57:24'),
(472, 132, 'Categorías', 'Creación de categoría: categoria', '2025-11-01', '14:57:53'),
(473, 132, 'Subcategorías', 'Creación de subcategoría: subcategoria', '2025-11-01', '14:58:12'),
(474, 132, 'Productos', 'Creación aprobada del producto \"producto\" (ID 55)', '2025-11-01', '14:58:47'),
(475, 132, 'Inventario', 'Ingreso de 1 unidad(es) del producto 55', '2025-11-01', '14:59:14'),
(476, 132, 'Inventario', 'Egreso de 2 unidad(es) del producto 55', '2025-11-01', '14:59:20'),
(477, 132, 'Configuración', 'Actualización de configuración para empresa 38', '2025-11-01', '16:53:13'),
(478, 57, 'Productos', 'Actualización aprobada del producto ID 45', '2025-11-02', '06:19:28'),
(479, 57, 'Productos', 'Actualización aprobada del producto ID 50', '2025-11-02', '06:19:57'),
(480, 57, 'Zonas', 'Eliminación aprobada de la zona ID 16 (zona)', '2025-11-02', '06:20:40'),
(481, 57, 'Áreas', 'Eliminación aprobada del área ID 21', '2025-11-02', '06:20:47'),
(482, 57, 'Zonas', 'Actualización aprobada de la zona ID 24', '2025-11-02', '06:21:01'),
(483, 57, 'Usuarios', 'Registro de usuario empresa: otracuentadeprueba@gmail.com', '2025-11-03', '02:48:14'),
(484, 57, 'Usuarios', 'Eliminación de usuario aprobada: otracuentadeprueba@gmail.com', '2025-11-03', '02:48:27'),
(485, 57, 'Usuarios', 'Registro de usuario empresa: a@gmail.com', '2025-11-03', '02:49:44'),
(486, 57, 'Usuarios', 'Eliminación de usuario aprobada: a@gmail.com', '2025-11-03', '02:50:46'),
(487, 57, 'Usuarios', 'Registro de usuario empresa: cuentapruba@gmail.com', '2025-11-03', '16:18:15'),
(490, 57, 'Áreas', 'Eliminación aprobada del área ID 26', '2025-11-03', '16:38:20'),
(491, 57, 'Áreas', 'Creación aprobada del área \"area\" (ID 36)', '2025-11-03', '16:39:26'),
(492, 57, 'Zonas', 'Actualización aprobada de la zona ID 20', '2025-11-03', '16:39:37'),
(493, 57, 'Zonas', 'Actualización aprobada de la zona ID 21', '2025-11-03', '16:39:48'),
(494, 57, 'Zonas', 'Actualización aprobada de la zona ID 22', '2025-11-03', '16:39:56'),
(495, 57, 'Zonas', 'Actualización aprobada de la zona ID 24', '2025-11-03', '16:40:01'),
(496, 57, 'Empresa', 'Actualización aprobada de la empresa ID 21', '2025-11-03', '18:02:59'),
(497, 57, 'Empresa', 'Actualización aprobada de la empresa ID 21', '2025-11-03', '18:03:06'),
(498, 57, 'Áreas', 'Creación aprobada del área \"otra area\" (ID 37)', '2025-11-03', '18:03:41'),
(499, 57, 'Zonas', 'Creación aprobada de la zona \"zona de la otra area\" (ID 30)', '2025-11-03', '18:04:21'),
(500, 57, 'Áreas', 'Eliminación aprobada del área ID 37', '2025-11-03', '18:04:33'),
(501, 57, 'Usuarios', 'Eliminación de usuario aprobada: cuentapruba@gmail.com', '2025-11-03', '18:38:41'),
(502, 57, 'Usuarios', 'Eliminación de usuario aprobada: supervisor@gmail.com', '2025-11-03', '18:38:52'),
(503, 57, 'Usuarios', 'Registro de usuario empresa: menganito@gmail.com', '2025-11-03', '18:40:45'),
(504, 57, 'Usuarios', 'Edición aprobada del usuario ID 136', '2025-11-03', '18:41:00'),
(505, 57, 'Usuarios', 'Edición aprobada del usuario ID 136', '2025-11-03', '18:41:06'),
(506, 57, 'Usuarios', 'Desactivación aprobada del usuario ID 110', '2025-11-03', '18:43:16'),
(507, 57, 'Usuarios', 'Activación aprobada del usuario ID 110', '2025-11-03', '18:43:24'),
(508, 57, 'Usuarios', 'Desactivación aprobada del usuario ID 110', '2025-11-03', '18:44:15'),
(509, 57, 'Usuarios', 'Activación aprobada del usuario ID 110', '2025-11-03', '18:45:22'),
(510, 57, 'Áreas', 'Creación aprobada del área \"otra area\" (ID 38)', '2025-11-03', '18:50:26'),
(511, 111, 'Inventario', 'Ingreso de 1 unidad(es) del producto 45', '2025-11-03', '18:51:58'),
(512, 57, 'Reportes', 'Eliminó reporte: d - 2025-11-03 22-02.csv', '2025-11-03', '22:02:11'),
(513, 57, 'Reportes', 'Eliminó reporte: reporte - 2025-11-03 22-26.pdf', '2025-11-03', '22:39:41'),
(514, 60, 'Configuración', 'Actualización de configuración para empresa 24', '2025-11-07', '04:54:44'),
(515, 60, 'Usuarios', 'Registro de usuario empresa: usuario1@gmail.com', '2025-11-07', '04:56:01'),
(516, 60, 'Áreas', 'Creación aprobada del área \"jola\" (ID 39)', '2025-11-07', '16:53:54'),
(517, 60, 'Usuarios', 'Registro de usuario empresa: hola.123@gmail.com', '2025-11-07', '16:58:44'),
(518, 139, 'Usuarios', 'Solicitud de código de recuperación de contraseña', '2025-11-07', '16:59:38'),
(519, 139, 'Usuarios', 'Solicitud de código de recuperación de contraseña', '2025-11-07', '16:59:41');

-- --------------------------------------------------------

--
-- Table structure for table `movimientos`
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
-- Dumping data for table `movimientos`
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
(35, 21, 45, 'egreso', 20, 57, '2025-10-05 00:44:52'),
(36, 21, 50, 'ingreso', 30, 57, '2025-10-05 00:45:11'),
(37, 21, 50, 'egreso', 60, 57, '2025-10-05 00:45:28'),
(38, 21, 50, 'ingreso', 5, 57, '2025-10-07 22:14:24'),
(39, 21, 45, 'egreso', 4, 57, '2025-10-07 22:14:30'),
(40, 21, 46, 'egreso', 10, 57, '2025-10-07 22:14:35'),
(41, 21, 46, 'ingreso', 2, 57, '2025-10-07 22:14:40'),
(42, 21, 41, 'ingreso', 5, 57, '2025-10-08 00:51:08'),
(43, 21, 50, 'egreso', 1, 57, '2025-10-08 00:51:13'),
(44, 21, 41, 'ingreso', 3, 57, '2025-10-08 00:51:18'),
(45, 21, 46, 'ingreso', 12, 57, '2025-10-08 00:51:23'),
(46, 21, 50, 'ingreso', 10, 57, '2025-10-08 00:51:28'),
(47, 21, 45, 'egreso', 4, 57, '2025-10-08 00:51:33'),
(48, 21, 50, 'egreso', 5, 57, '2025-10-08 00:51:42'),
(49, 21, 45, 'ingreso', 9, 57, '2025-10-08 00:51:47'),
(50, 21, 45, 'ingreso', 1, 57, '2025-10-10 02:51:50'),
(51, 21, 45, 'ingreso', 1, 57, '2025-10-10 21:42:11'),
(52, 21, 50, 'egreso', 6, 57, '2025-10-10 22:12:24'),
(53, 21, 50, 'ingreso', 2, 57, '2025-10-10 22:12:51'),
(54, 21, 50, 'egreso', 2, 57, '2025-10-10 22:12:59'),
(55, 21, 50, 'ingreso', 2, 57, '2025-10-10 22:13:31'),
(56, 21, 50, 'egreso', 2, 57, '2025-10-13 19:42:48'),
(57, 21, 50, 'ingreso', 3, 57, '2025-10-13 20:20:57'),
(58, 21, 50, 'ingreso', 1, 57, '2025-10-13 23:13:13'),
(59, 21, 41, 'ingreso', 12, 57, '2025-10-13 23:13:18'),
(60, 21, 50, 'egreso', 3, 57, '2025-10-13 23:13:22'),
(61, 21, 46, 'egreso', 10, 57, '2025-10-13 23:13:29'),
(62, 21, 45, 'ingreso', 4, 57, '2025-10-13 23:13:33'),
(63, 21, 41, 'egreso', 10, 57, '2025-10-13 23:13:39'),
(64, 21, 50, 'ingreso', 5, 57, '2025-10-13 23:13:44'),
(65, 21, 50, 'egreso', 4, 57, '2025-10-13 23:13:49'),
(66, 21, 41, 'ingreso', 10, 57, '2025-10-13 23:13:54'),
(67, 21, 45, 'ingreso', 10, 57, '2025-10-13 23:13:59'),
(68, 21, 41, 'egreso', 20, 57, '2025-10-13 23:14:05'),
(69, 21, 41, 'ingreso', 3, 57, '2025-10-13 23:14:09'),
(70, 21, 46, 'egreso', 2, 57, '2025-10-13 23:14:14'),
(71, 21, 50, 'ingreso', 9, 57, '2025-10-13 23:14:20'),
(72, 21, 45, 'egreso', 10, 57, '2025-10-13 23:14:29'),
(73, 21, 45, 'egreso', 2, 57, '2025-10-13 23:14:38'),
(74, 21, 46, 'ingreso', 3, 57, '2025-10-13 23:14:43'),
(75, 21, 50, 'egreso', 7, 57, '2025-10-13 23:14:51'),
(76, 21, 50, 'ingreso', 2, 57, '2025-10-13 23:15:00'),
(77, 21, 50, 'ingreso', 20, 57, '2025-10-13 23:15:07'),
(78, 21, 50, 'egreso', 15, 57, '2025-10-13 23:15:15'),
(79, 21, 46, 'egreso', 5, 57, '2025-10-15 15:56:53'),
(80, 21, 46, 'ingreso', 1, 57, '2025-10-16 21:12:21'),
(81, 21, 45, 'ingreso', 20, 57, '2025-10-16 21:31:19'),
(82, 21, 50, 'egreso', 1, 57, '2025-10-16 21:31:23'),
(83, 21, 41, 'ingreso', 3, 57, '2025-10-16 21:31:28'),
(84, 21, 46, 'ingreso', 1, 57, '2025-10-16 21:31:31'),
(85, 21, 45, 'egreso', 2, 57, '2025-10-16 21:31:35'),
(86, 21, 45, 'egreso', 13, 57, '2025-10-16 21:31:40'),
(87, 21, 45, 'ingreso', 20, 57, '2025-10-16 21:58:53'),
(88, 21, 50, 'egreso', 1, 57, '2025-10-16 21:58:57'),
(89, 21, 50, 'egreso', 7, 57, '2025-10-16 21:59:03'),
(90, 21, 45, 'egreso', 40, 57, '2025-10-16 23:39:45'),
(91, 21, 45, 'ingreso', 20, 57, '2025-10-16 23:39:51'),
(92, 21, 41, 'ingreso', 2, 57, '2025-10-16 23:39:55'),
(93, 21, 46, 'egreso', 1, 57, '2025-10-16 23:40:00'),
(94, 21, 41, 'ingreso', 1, 57, '2025-10-16 23:41:34'),
(95, 21, 50, 'egreso', 1, 57, '2025-10-16 23:41:39'),
(96, 21, 50, 'ingreso', 1, 57, '2025-10-17 02:04:05'),
(97, 36, 54, 'egreso', 8, 130, '2025-10-17 17:53:51'),
(98, 38, 55, 'ingreso', 1, 132, '2025-11-01 14:59:14'),
(99, 38, 55, 'egreso', 2, 132, '2025-11-01 14:59:20'),
(102, 21, 45, 'ingreso', 1, 111, '2025-11-03 18:51:58');

-- --------------------------------------------------------

--
-- Table structure for table `notificaciones`
--

CREATE TABLE `notificaciones` (
  `id` int(10) UNSIGNED NOT NULL,
  `id_empresa` int(10) UNSIGNED NOT NULL,
  `titulo` varchar(150) NOT NULL,
  `mensaje` text NOT NULL,
  `tipo_destinatario` enum('General','Rol','Usuario') NOT NULL DEFAULT 'General',
  `rol_destinatario` varchar(60) DEFAULT NULL,
  `id_usuario_destinatario` int(10) UNSIGNED DEFAULT NULL,
  `id_usuario_creador` int(10) UNSIGNED DEFAULT NULL,
  `ruta_destino` varchar(255) DEFAULT NULL,
  `estado` enum('Pendiente','Enviada','Leida','Archivada') NOT NULL DEFAULT 'Pendiente',
  `prioridad` enum('Baja','Media','Alta') NOT NULL DEFAULT 'Media',
  `fecha_disponible_desde` datetime NOT NULL DEFAULT current_timestamp(),
  `fecha_expira` datetime DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notificaciones`
--

INSERT INTO `notificaciones` (`id`, `id_empresa`, `titulo`, `mensaje`, `tipo_destinatario`, `rol_destinatario`, `id_usuario_destinatario`, `id_usuario_creador`, `ruta_destino`, `estado`, `prioridad`, `fecha_disponible_desde`, `fecha_expira`, `creado_en`, `actualizado_en`) VALUES
(1, 21, 'Zona con espacio crítico: refri', 'La zona refri del área cocina presenta un nivel crítico de ocupación (0.0% ocupado). Espacio libre: 0.84 m³.', 'Usuario', NULL, 57, 57, 'area_almac_v2/gestion_areas_zonas.html', 'Archivada', 'Media', '2025-10-10 20:23:31', NULL, '2025-10-10 20:23:31', '2025-10-10 20:38:29'),
(5, 21, 'Zona con espacio crítico: refri', 'La zona refri del área cocina presenta un nivel crítico de ocupación (0.0% ocupado). Espacio libre: 0.84 m³.', 'Usuario', NULL, 57, 57, 'area_almac_v2/gestion_areas_zonas.html', 'Archivada', 'Media', '2025-10-10 20:38:26', NULL, '2025-10-10 20:38:26', '2025-10-10 20:38:30'),
(55, 24, 'Stock crítico: si', 'Quedan 0 unidades disponibles en Zona 1 · Area 1. Límite configurado: 10 unidades.', 'Usuario', NULL, 129, 129, 'gest_inve/inventario_basico.html', 'Enviada', 'Alta', '2025-10-14 17:15:08', NULL, '2025-10-14 17:15:09', '2025-10-14 17:15:09'),
(56, 24, 'Stock crítico: Objeto de prueba', 'Quedan 3 unidades disponibles en Zona 1 · Area 1. Límite configurado: 10 unidades.', 'Usuario', NULL, 129, 129, 'gest_inve/inventario_basico.html', 'Enviada', 'Alta', '2025-10-14 17:15:08', NULL, '2025-10-14 17:15:09', '2025-10-14 17:15:09'),
(57, 24, 'Stock crítico: cyuaderno norma', 'Quedan 10 unidades disponibles en vitrina · Papeleria Ely. Límite configurado: 10 unidades.', 'Usuario', NULL, 129, 129, 'gest_inve/inventario_basico.html', 'Enviada', 'Alta', '2025-10-14 17:15:08', NULL, '2025-10-14 17:15:09', '2025-10-14 17:15:09'),
(58, 24, 'Stock crítico: si', 'Quedan 0 unidades disponibles en Zona 1 · Area 1. Límite configurado: 10 unidades.', 'Usuario', NULL, 129, 129, 'gest_inve/inventario_basico.html', 'Enviada', 'Alta', '2025-10-14 17:15:20', NULL, '2025-10-14 17:15:21', '2025-10-14 17:15:21'),
(59, 24, 'Stock crítico: Objeto de prueba', 'Quedan 3 unidades disponibles en Zona 1 · Area 1. Límite configurado: 10 unidades.', 'Usuario', NULL, 129, 129, 'gest_inve/inventario_basico.html', 'Enviada', 'Alta', '2025-10-14 17:15:20', NULL, '2025-10-14 17:15:21', '2025-10-14 17:15:21'),
(60, 24, 'Stock crítico: cyuaderno norma', 'Quedan 10 unidades disponibles en vitrina · Papeleria Ely. Límite configurado: 10 unidades.', 'Usuario', NULL, 129, 129, 'gest_inve/inventario_basico.html', 'Enviada', 'Alta', '2025-10-14 17:15:20', NULL, '2025-10-14 17:15:21', '2025-10-14 17:15:21'),
(67, 24, 'Stock crítico: si', 'Quedan 0 unidades disponibles en Zona 1 · Area 1. Límite configurado: 10 unidades.', 'Usuario', NULL, 115, 115, 'gest_inve/inventario_basico.html', 'Enviada', 'Alta', '2025-10-15 13:43:46', NULL, '2025-10-15 13:43:01', '2025-10-15 13:43:01'),
(68, 24, 'Stock crítico: Objeto de prueba', 'Quedan 3 unidades disponibles en Zona 1 · Area 1. Límite configurado: 10 unidades.', 'Usuario', NULL, 115, 115, 'gest_inve/inventario_basico.html', 'Enviada', 'Alta', '2025-10-15 13:43:46', NULL, '2025-10-15 13:43:01', '2025-10-15 13:43:01'),
(69, 24, 'Stock crítico: cyuaderno norma', 'Quedan 10 unidades disponibles en vitrina · Papeleria Ely. Límite configurado: 10 unidades.', 'Usuario', NULL, 115, 115, 'gest_inve/inventario_basico.html', 'Enviada', 'Alta', '2025-10-15 13:43:46', NULL, '2025-10-15 13:43:01', '2025-10-15 13:43:01'),
(72, 24, 'Stock crítico: si', 'Quedan 0 unidades disponibles en Zona 1 · Area 1. Límite configurado: 10 unidades.', 'Usuario', NULL, 115, 115, 'gest_inve/inventario_basico.html', 'Enviada', 'Alta', '2025-10-15 16:09:39', NULL, '2025-10-15 16:08:54', '2025-10-15 16:08:54'),
(73, 24, 'Stock crítico: Objeto de prueba', 'Quedan 3 unidades disponibles en Zona 1 · Area 1. Límite configurado: 10 unidades.', 'Usuario', NULL, 115, 115, 'gest_inve/inventario_basico.html', 'Enviada', 'Alta', '2025-10-15 16:09:39', NULL, '2025-10-15 16:08:54', '2025-10-15 16:08:54'),
(74, 24, 'Stock crítico: cyuaderno norma', 'Quedan 10 unidades disponibles en vitrina · Papeleria Ely. Límite configurado: 10 unidades.', 'Usuario', NULL, 115, 115, 'gest_inve/inventario_basico.html', 'Enviada', 'Alta', '2025-10-15 16:09:39', NULL, '2025-10-15 16:08:54', '2025-10-15 16:08:54'),
(106, 23, 'Stock crítico: NADYA', 'Quedan 1 unidad disponibles en zona 1 · Papeleria. Límite configurado: 10 unidades.', 'Usuario', NULL, 33, 33, 'gest_inve/inventario_basico.html', 'Enviada', 'Alta', '2025-10-18 01:14:54', NULL, '2025-10-18 01:14:08', '2025-10-18 01:14:08'),
(107, 23, 'Stock crítico: NADYA', 'Quedan 1 unidad disponibles en zona 1 · Papeleria. Límite configurado: 10 unidades.', 'Usuario', NULL, 33, 33, 'gest_inve/inventario_basico.html', 'Enviada', 'Alta', '2025-10-18 01:30:22', NULL, '2025-10-18 01:29:36', '2025-10-18 01:29:36'),
(111, 23, 'Stock crítico: si', 'Quedan 0 unidades disponibles en Zona 1 · Area 1. Límite configurado: 10 unidades.', 'Usuario', NULL, 33, 33, 'gest_inve/inventario_basico.html', 'Enviada', 'Alta', '2025-10-19 00:23:05', NULL, '2025-10-19 00:22:18', '2025-10-19 00:22:18'),
(112, 23, 'Stock crítico: Objeto de prueba', 'Quedan 3 unidades disponibles en Zona 1 · Area 1. Límite configurado: 10 unidades.', 'Usuario', NULL, 33, 33, 'gest_inve/inventario_basico.html', 'Enviada', 'Alta', '2025-10-19 00:23:05', NULL, '2025-10-19 00:22:18', '2025-10-19 00:22:18'),
(113, 23, 'Stock crítico: cyuaderno norma', 'Quedan 10 unidades disponibles en vitrina · Papeleria Ely. Límite configurado: 10 unidades.', 'Usuario', NULL, 33, 33, 'gest_inve/inventario_basico.html', 'Enviada', 'Alta', '2025-10-19 00:23:05', NULL, '2025-10-19 00:22:18', '2025-10-19 00:22:18'),
(297, 24, 'Stock crítico: si', 'Quedan 0 unidades disponibles en Zona 1 · Area 1. Límite configurado: 10 unidades.', 'Usuario', NULL, 60, 60, 'gest_inve/inventario_basico.html', 'Enviada', 'Alta', '2025-11-07 16:54:00', NULL, '2025-11-07 16:52:57', '2025-11-07 16:52:57'),
(298, 24, 'Stock crítico: Objeto de prueba', 'Quedan 3 unidades disponibles en Zona 1 · Area 1. Límite configurado: 10 unidades.', 'Usuario', NULL, 60, 60, 'gest_inve/inventario_basico.html', 'Enviada', 'Alta', '2025-11-07 16:54:00', NULL, '2025-11-07 16:52:57', '2025-11-07 16:52:57'),
(299, 24, 'Stock crítico: si', 'Quedan 0 unidades disponibles en Zona 1 · Area 1. Límite configurado: 10 unidades.', 'Usuario', NULL, 60, 60, 'gest_inve/inventario_basico.html', 'Enviada', 'Alta', '2025-11-07 16:59:48', NULL, '2025-11-07 16:58:46', '2025-11-07 16:58:46'),
(300, 24, 'Stock crítico: Objeto de prueba', 'Quedan 3 unidades disponibles en Zona 1 · Area 1. Límite configurado: 10 unidades.', 'Usuario', NULL, 60, 60, 'gest_inve/inventario_basico.html', 'Enviada', 'Alta', '2025-11-07 16:59:48', NULL, '2025-11-07 16:58:46', '2025-11-07 16:58:46'),
(301, 24, 'Stock crítico: si', 'Quedan 0 unidades disponibles en Zona 1 · Area 1. Límite configurado: 10 unidades.', 'Usuario', NULL, 139, 139, 'gest_inve/inventario_basico.html', 'Enviada', 'Alta', '2025-11-07 17:00:51', NULL, '2025-11-07 16:59:49', '2025-11-07 16:59:49'),
(302, 24, 'Stock crítico: Objeto de prueba', 'Quedan 3 unidades disponibles en Zona 1 · Area 1. Límite configurado: 10 unidades.', 'Usuario', NULL, 139, 139, 'gest_inve/inventario_basico.html', 'Enviada', 'Alta', '2025-11-07 17:00:51', NULL, '2025-11-07 16:59:49', '2025-11-07 16:59:49'),
(303, 24, 'Stock crítico: si', 'Quedan 0 unidades disponibles en Zona 1 · Area 1. Límite configurado: 10 unidades.', 'Usuario', NULL, 139, 139, 'gest_inve/inventario_basico.html', 'Enviada', 'Alta', '2025-11-07 17:02:21', NULL, '2025-11-07 17:01:19', '2025-11-07 17:01:19'),
(304, 24, 'Stock crítico: Objeto de prueba', 'Quedan 3 unidades disponibles en Zona 1 · Area 1. Límite configurado: 10 unidades.', 'Usuario', NULL, 139, 139, 'gest_inve/inventario_basico.html', 'Enviada', 'Alta', '2025-11-07 17:02:21', NULL, '2025-11-07 17:01:19', '2025-11-07 17:01:19');

-- --------------------------------------------------------

--
-- Table structure for table `incidencias_infraestructura`
--

CREATE TABLE `incidencias_infraestructura` (
  `id` int(11) NOT NULL,
  `id_empresa` int(11) NOT NULL,
  `area_id` int(11) DEFAULT NULL,
  `zona_id` int(11) DEFAULT NULL,
  `id_usuario_reporta` int(11) NOT NULL,
  `id_usuario_revisa` int(11) DEFAULT NULL,
  `descripcion` text NOT NULL,
  `estado` enum('Pendiente','Revisado') NOT NULL DEFAULT 'Pendiente',
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `revisado_en` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pass_resets`
--

CREATE TABLE `pass_resets` (
  `id_pass_reset` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `token` varchar(64) NOT NULL,
  `expira` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pass_resets`
--

INSERT INTO `pass_resets` (`id_pass_reset`, `id_usuario`, `token`, `expira`) VALUES
(1, 57, 'c6a2c587d2c82af27bde8ddbc0cab735de2d332ecb732510d265d6b7bfb52c4c', '2025-04-18 05:17:25'),
(2, 57, '4f455f944adb286f7739f69449e790d5414029a3d7cd265c29d4a5d03d02fecb', '2025-04-18 05:18:43'),
(3, 56, '3e22bddaa45722e338a6f476ff1023b356f0cb722549ac9fc229db23b63f060b', '2025-04-18 05:19:08'),
(4, 57, '90c34c3f7985339b833d1e0351e4cf274b23776b79e485c68d9ba6ea17a99beb', '2025-04-18 06:32:31'),
(5, 58, 'f413ebdc81ae28a41ef4fd9a30b4f9c5b7ffd30a0ffc14e832b9944d54cb3a53', '2025-04-18 06:40:11');

-- --------------------------------------------------------

--
-- Table structure for table `productos`
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
-- Dumping data for table `productos`
--

INSERT INTO `productos` (`id`, `nombre`, `descripcion`, `categoria_id`, `subcategoria_id`, `stock`, `precio_compra`, `dim_x`, `dim_y`, `dim_z`, `codigo_qr`, `empresa_id`, `zona_id`, `last_movimiento`, `last_tipo`) VALUES
(37, 'Una piedra', '', 28, NULL, 19, 1.30, 0, 0, 0, NULL, 28, 19, '2025-08-04 17:13:27', NULL),
(41, 'plato unicel', '', 31, 38, 21, 50.00, 30, 2, 30, 'images/qr/41.png', 21, 22, '2025-10-16 23:41:34', NULL),
(43, 'papel a4 marca J', 'Es papel de la marca J de tamaño a4', 34, 36, 990, 400.00, 4, 4, 4, 'images/qr/43.png', 24, 17, '2025-09-03 19:09:02', NULL),
(44, 'si', 'si', 34, NULL, 0, 100.00, 0, 0, 0, 'images/qr/44.png', 24, 17, '2025-09-10 16:01:47', NULL),
(45, 'Conos de papel', 'conos de papel para tomar awa', 32, 37, 17, 2.00, 12, 12, 8, 'images/qr/45.png', 21, 20, '2025-11-03 18:51:58', NULL),
(46, 'platos unicel royal prestige', 'plato de royal prestige para los chalanes', 31, 38, 11, 50.00, 12, 12, 2, 'images/qr/46.png', 21, 20, '2025-10-16 23:40:00', NULL),
(48, 'Objeto de prueba', 'Sisisis', 33, 34, 3, 12.00, 2, 2, 2, 'images/qr/48.png', 24, 17, '2025-10-01 16:13:46', NULL),
(50, 'Perfil Ventana M4 roble', '', 25, NULL, 11, 300.00, 200, 10, 10, 'images/qr/50.png', 21, 22, '2025-11-02 06:19:57', NULL),
(53, 'NADYA', 'FNWIFNIWNFIWNFIWMF', 27, 27, 1, 99999999.99, 20, 10, 50, 'images/qr/53.png', 23, 27, '2025-10-16 13:53:24', NULL),
(54, 'Pq tornillo 50 pz', 'nose es un tornillo', 36, 40, 92, 10.00, 10, 10, 10, 'images/qr/54.png', 36, 28, '2025-10-17 17:53:51', NULL),
(55, 'producto', 'producto de prueba', 37, 41, 9, 3.00, 10, 10, 10, 'images/qr/55.png', 38, 29, '2025-11-01 14:59:20', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `registro_accesos`
--

CREATE TABLE `registro_accesos` (
  `id` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `accion` enum('Inicio','Cierre','Intento') NOT NULL,
  `fecha` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `registro_accesos`
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
(479, 57, 'Inicio', '2025-10-05 00:44:06'),
(480, 57, 'Inicio', '2025-10-05 00:56:44'),
(481, 57, 'Cierre', '2025-10-05 00:57:24'),
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
(527, 57, 'Inicio', '2025-10-07 22:58:38'),
(528, 57, 'Inicio', '2025-10-08 00:03:10'),
(529, 57, 'Inicio', '2025-10-08 00:09:03'),
(530, 57, 'Inicio', '2025-10-08 00:13:31'),
(531, 57, 'Inicio', '2025-10-08 00:13:45'),
(532, 57, 'Cierre', '2025-10-08 00:25:30'),
(533, 57, 'Inicio', '2025-10-08 00:27:41'),
(534, 57, 'Inicio', '2025-10-08 00:50:14'),
(535, 57, 'Inicio', '2025-10-08 01:03:15'),
(536, 57, 'Inicio', '2025-10-08 01:15:22'),
(537, 57, 'Inicio', '2025-10-08 01:19:07'),
(538, 57, 'Inicio', '2025-10-08 01:35:47'),
(539, 57, 'Inicio', '2025-10-08 15:49:55'),
(540, 60, 'Inicio', '2025-10-08 16:19:11'),
(541, 57, 'Inicio', '2025-10-08 23:17:58'),
(542, 57, 'Inicio', '2025-10-09 00:05:43'),
(543, 57, 'Inicio', '2025-10-09 20:43:51'),
(544, 57, 'Cierre', '2025-10-09 20:44:02'),
(545, 121, 'Inicio', '2025-10-09 20:49:14'),
(546, 121, 'Inicio', '2025-10-09 20:52:44'),
(547, 121, 'Cierre', '2025-10-09 20:54:48'),
(548, 57, 'Inicio', '2025-10-09 20:54:50'),
(549, 57, 'Inicio', '2025-10-09 21:03:21'),
(550, 57, 'Inicio', '2025-10-09 21:10:43'),
(551, 57, 'Inicio', '2025-10-09 21:15:01'),
(552, 57, 'Inicio', '2025-10-09 21:20:20'),
(553, 57, 'Cierre', '2025-10-09 21:21:25'),
(554, 57, 'Inicio', '2025-10-09 21:21:28'),
(555, 57, 'Inicio', '2025-10-09 21:21:45'),
(558, 57, 'Inicio', '2025-10-09 21:42:04'),
(559, 57, 'Cierre', '2025-10-09 21:42:21'),
(564, 102, 'Inicio', '2025-10-09 22:45:16'),
(565, 102, 'Cierre', '2025-10-09 22:45:31'),
(566, 83, 'Inicio', '2025-10-09 22:45:40'),
(567, 83, 'Cierre', '2025-10-09 22:45:52'),
(568, 97, 'Inicio', '2025-10-09 22:46:03'),
(569, 97, 'Cierre', '2025-10-09 22:46:14'),
(570, 57, 'Inicio', '2025-10-09 22:46:17'),
(572, 57, 'Inicio', '2025-10-10 00:49:36'),
(573, 57, 'Cierre', '2025-10-10 00:54:06'),
(574, 57, 'Inicio', '2025-10-10 00:54:11'),
(575, 57, 'Cierre', '2025-10-10 00:54:15'),
(576, 57, 'Inicio', '2025-10-10 00:54:17'),
(577, 57, 'Inicio', '2025-10-10 00:54:46'),
(578, 57, 'Cierre', '2025-10-10 00:56:22'),
(579, 57, 'Inicio', '2025-10-10 00:57:20'),
(580, 57, 'Inicio', '2025-10-10 01:00:18'),
(581, 57, 'Inicio', '2025-10-10 01:03:35'),
(582, 57, 'Cierre', '2025-10-10 01:06:56'),
(583, 57, 'Inicio', '2025-10-10 02:51:13'),
(584, 57, 'Inicio', '2025-10-10 02:51:13'),
(585, 57, 'Inicio', '2025-10-10 02:51:13'),
(586, 57, 'Cierre', '2025-10-10 02:54:23'),
(587, 111, 'Inicio', '2025-10-10 02:54:34'),
(588, 111, 'Cierre', '2025-10-10 02:55:48'),
(589, 57, 'Inicio', '2025-10-10 02:55:51'),
(590, 57, 'Cierre', '2025-10-10 02:57:23'),
(591, 57, 'Inicio', '2025-10-10 03:07:29'),
(592, 57, 'Cierre', '2025-10-10 03:07:44'),
(593, 127, 'Inicio', '2025-10-10 17:46:35'),
(594, 57, 'Inicio', '2025-10-10 18:20:56'),
(595, 57, 'Cierre', '2025-10-10 18:21:50'),
(596, 57, 'Inicio', '2025-10-10 20:23:19'),
(597, 57, 'Cierre', '2025-10-10 20:25:20'),
(598, 111, 'Inicio', '2025-10-10 20:25:29'),
(599, 111, 'Cierre', '2025-10-10 20:25:46'),
(600, 110, 'Inicio', '2025-10-10 20:25:57'),
(601, 110, 'Cierre', '2025-10-10 20:26:08'),
(602, 57, 'Inicio', '2025-10-10 20:26:10'),
(603, 57, 'Inicio', '2025-10-10 20:38:25'),
(604, 57, 'Inicio', '2025-10-10 20:41:02'),
(605, 57, 'Inicio', '2025-10-10 20:46:17'),
(606, 57, 'Cierre', '2025-10-10 20:47:21'),
(607, 57, 'Inicio', '2025-10-10 20:47:24'),
(608, 57, 'Inicio', '2025-10-10 20:58:48'),
(609, 57, 'Inicio', '2025-10-10 21:00:53'),
(610, 57, 'Inicio', '2025-10-10 21:17:58'),
(611, 57, 'Inicio', '2025-10-10 21:37:03'),
(612, 57, 'Inicio', '2025-10-10 22:01:04'),
(613, 57, 'Inicio', '2025-10-10 22:11:21'),
(614, 57, 'Cierre', '2025-10-10 22:13:11'),
(615, 57, 'Inicio', '2025-10-10 22:13:13'),
(616, 57, 'Inicio', '2025-10-10 22:22:44'),
(617, 57, 'Cierre', '2025-10-10 22:23:46'),
(618, 57, 'Inicio', '2025-10-10 22:23:48'),
(619, 57, 'Inicio', '2025-10-10 22:38:15'),
(620, 57, 'Inicio', '2025-10-10 23:14:25'),
(621, 57, 'Inicio', '2025-10-10 23:20:01'),
(622, 57, 'Inicio', '2025-10-10 23:26:40'),
(623, 57, 'Inicio', '2025-10-10 23:33:39'),
(624, 57, 'Inicio', '2025-10-10 23:48:09'),
(625, 57, 'Cierre', '2025-10-10 23:51:02'),
(626, 111, 'Inicio', '2025-10-10 23:51:13'),
(627, 111, 'Cierre', '2025-10-10 23:51:59'),
(628, 111, 'Inicio', '2025-10-10 23:52:08'),
(629, 111, 'Cierre', '2025-10-10 23:52:48'),
(630, 57, 'Inicio', '2025-10-10 23:52:51'),
(631, 57, 'Inicio', '2025-10-11 00:00:16'),
(632, 57, 'Inicio', '2025-10-11 00:13:30'),
(633, 57, 'Cierre', '2025-10-11 00:13:57'),
(634, 60, 'Inicio', '2025-10-11 06:44:46'),
(635, 60, 'Inicio', '2025-10-11 06:47:34'),
(636, 60, 'Cierre', '2025-10-11 06:50:07'),
(637, 57, 'Inicio', '2025-10-11 19:30:32'),
(638, 57, 'Inicio', '2025-10-11 19:32:21'),
(639, 57, 'Inicio', '2025-10-11 19:32:56'),
(640, 57, 'Cierre', '2025-10-11 19:35:32'),
(641, 57, 'Inicio', '2025-10-11 19:55:32'),
(642, 57, 'Inicio', '2025-10-11 19:59:29'),
(643, 57, 'Inicio', '2025-10-11 21:13:13'),
(644, 57, 'Inicio', '2025-10-11 21:36:20'),
(645, 57, 'Cierre', '2025-10-11 21:36:51'),
(646, 111, 'Inicio', '2025-10-11 21:37:04'),
(647, 111, 'Cierre', '2025-10-11 21:37:48'),
(648, 57, 'Inicio', '2025-10-11 21:37:59'),
(649, 125, 'Inicio', '2025-10-11 22:39:40'),
(650, 125, 'Inicio', '2025-10-11 22:44:26'),
(651, 125, 'Inicio', '2025-10-11 22:58:12'),
(652, 125, 'Inicio', '2025-10-11 23:15:59'),
(653, 125, 'Cierre', '2025-10-11 23:18:21'),
(654, 57, 'Inicio', '2025-10-12 05:50:53'),
(655, 60, 'Inicio', '2025-10-12 06:05:29'),
(656, 129, 'Inicio', '2025-10-12 18:31:45'),
(657, 57, 'Inicio', '2025-10-13 18:28:22'),
(658, 57, 'Cierre', '2025-10-13 18:39:59'),
(659, 57, 'Inicio', '2025-10-13 19:08:18'),
(660, 57, 'Inicio', '2025-10-13 19:41:17'),
(661, 57, 'Inicio', '2025-10-13 19:52:35'),
(662, 57, 'Inicio', '2025-10-13 20:06:06'),
(663, 57, 'Inicio', '2025-10-13 20:14:00'),
(664, 57, 'Cierre', '2025-10-13 20:17:42'),
(665, 57, 'Inicio', '2025-10-13 20:17:44'),
(666, 57, 'Inicio', '2025-10-13 20:20:34'),
(667, 57, 'Cierre', '2025-10-13 20:21:58'),
(668, 57, 'Inicio', '2025-10-13 20:22:02'),
(669, 57, 'Inicio', '2025-10-13 20:32:47'),
(670, 57, 'Inicio', '2025-10-13 23:12:17'),
(671, 57, 'Cierre', '2025-10-13 23:16:37'),
(672, 57, 'Inicio', '2025-10-13 23:16:40'),
(673, 57, 'Cierre', '2025-10-13 23:16:46'),
(674, 57, 'Inicio', '2025-10-13 23:18:13'),
(675, 57, 'Inicio', '2025-10-13 23:19:02'),
(676, 57, 'Inicio', '2025-10-14 00:01:10'),
(677, 57, 'Inicio', '2025-10-14 00:06:12'),
(678, 57, 'Inicio', '2025-10-14 00:45:59'),
(679, 57, 'Inicio', '2025-10-14 00:49:33'),
(680, 57, 'Inicio', '2025-10-14 00:49:33'),
(681, 57, 'Inicio', '2025-10-14 00:49:33'),
(682, 57, 'Inicio', '2025-10-14 01:10:42'),
(683, 57, 'Inicio', '2025-10-14 01:40:11'),
(684, 57, 'Inicio', '2025-10-14 01:49:13'),
(685, 57, 'Cierre', '2025-10-14 01:49:54'),
(686, 111, 'Inicio', '2025-10-14 01:50:02'),
(687, 111, 'Cierre', '2025-10-14 01:51:17'),
(688, 110, 'Inicio', '2025-10-14 01:51:29'),
(689, 110, 'Cierre', '2025-10-14 01:51:47'),
(692, 57, 'Inicio', '2025-10-14 01:52:18'),
(693, 57, 'Inicio', '2025-10-14 01:55:44'),
(694, 60, 'Inicio', '2025-10-14 17:16:08'),
(695, 57, 'Inicio', '2025-10-14 20:13:45'),
(696, 57, 'Cierre', '2025-10-14 22:25:24'),
(697, 57, 'Inicio', '2025-10-14 22:26:18'),
(698, 57, 'Inicio', '2025-10-14 23:05:03'),
(699, 57, 'Inicio', '2025-10-14 23:06:42'),
(700, 57, 'Inicio', '2025-10-14 23:23:41'),
(701, 57, 'Inicio', '2025-10-14 23:27:22'),
(702, 57, 'Inicio', '2025-10-14 23:44:19'),
(703, 57, 'Inicio', '2025-10-14 23:52:12'),
(704, 57, 'Inicio', '2025-10-15 00:15:43'),
(705, 57, 'Inicio', '2025-10-15 01:10:24'),
(706, 57, 'Cierre', '2025-10-15 01:11:46'),
(707, 57, 'Inicio', '2025-10-15 01:11:51'),
(708, 57, 'Inicio', '2025-10-15 01:12:21'),
(709, 57, 'Inicio', '2025-10-15 05:19:51'),
(710, 57, 'Inicio', '2025-10-15 05:58:12'),
(711, 57, 'Cierre', '2025-10-15 05:58:39'),
(712, 57, 'Inicio', '2025-10-15 15:51:48'),
(713, 57, 'Cierre', '2025-10-15 15:54:17'),
(714, 111, 'Inicio', '2025-10-15 15:54:26'),
(715, 111, 'Cierre', '2025-10-15 15:55:07'),
(716, 57, 'Inicio', '2025-10-15 15:55:09'),
(717, 60, 'Inicio', '2025-10-15 16:14:32'),
(718, 60, 'Cierre', '2025-10-15 16:14:42'),
(719, 60, 'Inicio', '2025-10-15 16:17:16'),
(720, 60, 'Cierre', '2025-10-15 18:16:59'),
(721, 33, 'Inicio', '2025-10-15 18:17:10'),
(722, 57, 'Inicio', '2025-10-16 02:48:22'),
(723, 57, 'Inicio', '2025-10-16 02:48:22'),
(724, 57, 'Inicio', '2025-10-16 18:47:48'),
(725, 57, 'Inicio', '2025-10-16 18:57:00'),
(726, 57, 'Inicio', '2025-10-16 19:00:03'),
(727, 57, 'Inicio', '2025-10-16 19:23:59'),
(728, 57, 'Inicio', '2025-10-16 19:26:33'),
(729, 57, 'Inicio', '2025-10-16 20:24:44'),
(730, 57, 'Inicio', '2025-10-16 20:35:31'),
(731, 57, 'Inicio', '2025-10-16 20:39:41'),
(732, 57, 'Inicio', '2025-10-16 21:04:06'),
(733, 57, 'Inicio', '2025-10-16 21:05:56'),
(734, 57, 'Inicio', '2025-10-16 21:06:40'),
(735, 57, 'Inicio', '2025-10-16 21:25:12'),
(736, 57, 'Inicio', '2025-10-16 21:28:14'),
(737, 57, 'Inicio', '2025-10-16 21:43:55'),
(738, 57, 'Inicio', '2025-10-16 21:43:55'),
(739, 57, 'Inicio', '2025-10-16 21:53:07'),
(740, 57, 'Cierre', '2025-10-16 22:02:37'),
(741, 111, 'Inicio', '2025-10-16 22:02:49'),
(742, 111, 'Cierre', '2025-10-16 22:03:19'),
(743, 57, 'Inicio', '2025-10-16 22:03:22'),
(744, 57, 'Cierre', '2025-10-16 22:05:46'),
(745, 57, 'Inicio', '2025-10-16 22:05:48'),
(746, 57, 'Cierre', '2025-10-16 22:05:50'),
(747, 57, 'Inicio', '2025-10-16 22:05:52'),
(748, 57, 'Cierre', '2025-10-16 22:05:56'),
(749, 110, 'Inicio', '2025-10-16 22:06:10'),
(750, 110, 'Cierre', '2025-10-16 22:06:12'),
(751, 111, 'Inicio', '2025-10-16 22:06:34'),
(752, 111, 'Cierre', '2025-10-16 22:06:38'),
(753, 57, 'Inicio', '2025-10-16 22:06:40'),
(754, 57, 'Inicio', '2025-10-16 22:59:43'),
(755, 57, 'Inicio', '2025-10-16 23:15:37'),
(756, 57, 'Inicio', '2025-10-16 23:36:17'),
(757, 57, 'Inicio', '2025-10-16 23:37:02'),
(758, 57, 'Inicio', '2025-10-17 01:13:21'),
(759, 57, 'Inicio', '2025-10-17 01:30:15'),
(760, 57, 'Inicio', '2025-10-17 02:03:43'),
(761, 57, 'Inicio', '2025-10-17 02:25:19'),
(762, 130, 'Inicio', '2025-10-17 17:38:27'),
(763, 57, 'Inicio', '2025-10-17 19:08:34'),
(764, 57, 'Inicio', '2025-10-17 22:10:35'),
(765, 57, 'Inicio', '2025-10-17 22:13:38'),
(766, 57, 'Inicio', '2025-10-17 22:27:57'),
(767, 57, 'Inicio', '2025-10-17 22:34:12'),
(768, 57, 'Inicio', '2025-10-17 22:40:59'),
(769, 57, 'Inicio', '2025-10-17 22:42:38'),
(770, 57, 'Inicio', '2025-10-17 22:47:20'),
(771, 57, 'Inicio', '2025-10-17 23:05:17'),
(772, 57, 'Inicio', '2025-10-17 23:08:15'),
(773, 57, 'Inicio', '2025-10-17 23:35:43'),
(774, 57, 'Inicio', '2025-10-18 00:05:19'),
(775, 57, 'Inicio', '2025-10-18 00:09:45'),
(776, 57, 'Inicio', '2025-10-18 00:11:57'),
(777, 57, 'Inicio', '2025-10-18 00:14:30'),
(778, 57, 'Inicio', '2025-10-18 00:27:44'),
(779, 57, 'Inicio', '2025-10-18 00:32:07'),
(780, 57, 'Inicio', '2025-10-18 00:42:43'),
(781, 60, 'Inicio', '2025-10-19 00:22:11'),
(782, 60, 'Inicio', '2025-10-19 00:45:41'),
(783, 60, 'Inicio', '2025-10-21 00:49:56'),
(784, 57, 'Inicio', '2025-10-21 18:08:46'),
(785, 57, 'Inicio', '2025-10-21 22:23:33'),
(786, 60, 'Inicio', '2025-10-22 13:27:38'),
(787, 60, 'Inicio', '2025-10-22 13:33:51'),
(788, 60, 'Cierre', '2025-10-22 14:35:24'),
(789, 60, 'Inicio', '2025-10-22 14:40:05'),
(790, 57, 'Inicio', '2025-10-27 03:27:18'),
(791, 57, 'Cierre', '2025-10-27 03:30:07'),
(792, 57, 'Inicio', '2025-10-27 03:30:09'),
(793, 132, 'Inicio', '2025-10-27 17:06:34'),
(794, 132, 'Cierre', '2025-10-27 17:09:31'),
(795, 57, 'Inicio', '2025-10-27 17:09:34'),
(796, 132, 'Inicio', '2025-10-27 18:03:59'),
(797, 132, 'Cierre', '2025-10-27 18:04:28'),
(798, 60, 'Inicio', '2025-10-29 13:41:46'),
(799, 57, 'Inicio', '2025-10-29 15:36:34'),
(800, 57, 'Inicio', '2025-10-29 15:39:49'),
(801, 110, 'Inicio', '2025-10-29 15:40:10'),
(802, 110, 'Cierre', '2025-10-29 15:41:16'),
(804, 57, 'Inicio', '2025-10-29 15:43:33'),
(805, 57, 'Inicio', '2025-10-29 15:45:24'),
(806, 60, 'Inicio', '2025-10-29 15:45:37'),
(807, 57, 'Inicio', '2025-10-29 16:11:47'),
(809, 60, 'Inicio', '2025-10-29 16:13:37'),
(810, 60, 'Inicio', '2025-10-29 16:14:37'),
(811, 57, 'Inicio', '2025-10-30 23:49:46'),
(812, 57, 'Cierre', '2025-10-30 23:52:25'),
(813, 57, 'Inicio', '2025-10-30 23:53:02'),
(814, 57, 'Cierre', '2025-10-30 23:53:08'),
(815, 57, 'Inicio', '2025-10-30 23:53:12'),
(816, 57, 'Cierre', '2025-10-30 23:53:17'),
(817, 57, 'Inicio', '2025-10-31 00:11:13'),
(818, 57, 'Cierre', '2025-10-31 00:11:17'),
(819, 132, 'Inicio', '2025-10-31 00:11:50'),
(820, 132, 'Cierre', '2025-10-31 00:12:12'),
(821, 57, 'Inicio', '2025-10-31 00:12:15'),
(822, 57, 'Cierre', '2025-10-31 00:12:18'),
(823, 132, 'Inicio', '2025-10-31 00:12:22'),
(824, 57, 'Inicio', '2025-11-01 08:03:08'),
(825, 132, 'Inicio', '2025-11-01 14:54:25'),
(826, 132, 'Cierre', '2025-11-01 15:10:28'),
(827, 132, 'Inicio', '2025-11-01 15:10:33'),
(828, 132, 'Cierre', '2025-11-01 15:17:06'),
(829, 57, 'Inicio', '2025-11-01 15:17:46'),
(830, 57, 'Cierre', '2025-11-01 15:18:04'),
(831, 132, 'Inicio', '2025-11-01 15:18:20'),
(832, 132, 'Cierre', '2025-11-01 15:20:58'),
(833, 132, 'Inicio', '2025-11-01 15:21:02'),
(834, 57, 'Inicio', '2025-11-02 06:18:10'),
(835, 57, 'Inicio', '2025-11-02 06:26:05'),
(836, 57, 'Inicio', '2025-11-02 06:49:46'),
(837, 57, 'Cierre', '2025-11-02 06:50:51'),
(838, 57, 'Inicio', '2025-11-02 06:50:53'),
(839, 57, 'Inicio', '2025-11-03 02:45:23'),
(840, 57, 'Inicio', '2025-11-03 02:47:34'),
(841, 57, 'Inicio', '2025-11-03 02:49:07'),
(842, 57, 'Cierre', '2025-11-03 02:50:00'),
(843, 110, 'Inicio', '2025-11-03 02:50:18'),
(844, 110, 'Cierre', '2025-11-03 02:50:36'),
(845, 57, 'Inicio', '2025-11-03 02:50:38'),
(846, 57, 'Inicio', '2025-11-03 16:17:13'),
(847, 57, 'Cierre', '2025-11-03 16:18:49'),
(848, 57, 'Inicio', '2025-11-03 16:19:10'),
(849, 57, 'Cierre', '2025-11-03 16:19:19'),
(852, 57, 'Inicio', '2025-11-03 16:22:03'),
(853, 57, 'Inicio', '2025-11-03 16:37:54'),
(854, 57, 'Inicio', '2025-11-03 16:49:56'),
(855, 57, 'Cierre', '2025-11-03 16:50:50'),
(856, 111, 'Inicio', '2025-11-03 16:50:57'),
(857, 111, 'Cierre', '2025-11-03 16:51:08'),
(858, 57, 'Inicio', '2025-11-03 16:51:11'),
(859, 57, 'Inicio', '2025-11-03 18:02:43'),
(860, 57, 'Inicio', '2025-11-03 18:06:20'),
(861, 57, 'Cierre', '2025-11-03 18:13:41'),
(862, 110, 'Inicio', '2025-11-03 18:14:08'),
(863, 110, 'Cierre', '2025-11-03 18:14:21'),
(864, 57, 'Inicio', '2025-11-03 18:14:23'),
(865, 57, 'Inicio', '2025-11-03 18:29:12'),
(866, 110, 'Inicio', '2025-11-03 18:38:19'),
(867, 110, 'Cierre', '2025-11-03 18:38:33'),
(868, 57, 'Inicio', '2025-11-03 18:38:35'),
(869, 57, 'Cierre', '2025-11-03 18:41:45'),
(870, 110, 'Inicio', '2025-11-03 18:41:55'),
(871, 110, 'Cierre', '2025-11-03 18:42:57'),
(872, 57, 'Inicio', '2025-11-03 18:42:59'),
(873, 57, 'Cierre', '2025-11-03 18:44:17'),
(874, 110, 'Intento', '2025-11-03 18:44:42'),
(875, 110, 'Intento', '2025-11-03 18:44:46'),
(876, 57, 'Inicio', '2025-11-03 18:44:57'),
(877, 57, 'Cierre', '2025-11-03 18:45:06'),
(878, 110, 'Intento', '2025-11-03 18:45:13'),
(879, 57, 'Inicio', '2025-11-03 18:45:18'),
(880, 57, 'Cierre', '2025-11-03 18:49:26'),
(881, 111, 'Inicio', '2025-11-03 18:49:35'),
(882, 111, 'Cierre', '2025-11-03 18:50:10'),
(883, 57, 'Inicio', '2025-11-03 18:50:12'),
(884, 57, 'Cierre', '2025-11-03 18:50:32'),
(885, 111, 'Inicio', '2025-11-03 18:50:49'),
(886, 57, 'Inicio', '2025-11-03 20:41:37'),
(887, 57, 'Inicio', '2025-11-03 21:56:24'),
(888, 57, 'Inicio', '2025-11-03 22:00:19'),
(889, 57, 'Inicio', '2025-11-03 22:01:52'),
(890, 57, 'Inicio', '2025-11-03 22:26:23'),
(891, 57, 'Inicio', '2025-11-03 22:38:23'),
(892, 57, 'Inicio', '2025-11-04 20:11:20'),
(893, 57, 'Inicio', '2025-11-04 20:29:41'),
(894, 57, 'Inicio', '2025-11-04 20:30:54'),
(895, 57, 'Inicio', '2025-11-04 20:42:04'),
(896, 57, 'Inicio', '2025-11-04 20:43:39'),
(897, 60, 'Inicio', '2025-11-05 12:49:30'),
(898, 60, 'Inicio', '2025-11-05 14:23:20'),
(899, 60, 'Inicio', '2025-11-05 14:33:40'),
(900, 60, 'Inicio', '2025-11-05 15:38:30'),
(901, 60, 'Inicio', '2025-11-05 16:23:11'),
(902, 57, 'Inicio', '2025-11-05 21:51:44'),
(903, 60, 'Inicio', '2025-11-07 05:34:28'),
(904, 60, 'Inicio', '2025-11-07 14:08:09'),
(905, 60, 'Inicio', '2025-11-07 14:10:54'),
(906, 60, 'Inicio', '2025-11-07 14:19:53'),
(907, 60, 'Inicio', '2025-11-07 14:39:53'),
(908, 60, 'Inicio', '2025-11-07 16:52:56'),
(909, 60, 'Cierre', '2025-11-07 16:59:12'),
(910, 139, 'Inicio', '2025-11-07 16:59:48'),
(911, 139, 'Inicio', '2025-11-07 17:00:58'),
(912, 139, 'Cierre', '2025-11-07 17:01:10'),
(913, 139, 'Inicio', '2025-11-07 17:01:18'),
(914, 57, 'Inicio', '2025-11-07 17:11:31');

-- --------------------------------------------------------

--
-- Table structure for table `reportes_automatizados`
--

CREATE TABLE `reportes_automatizados` (
  `uuid` varchar(64) NOT NULL,
  `id_empresa` int(11) NOT NULL,
  `nombre` varchar(120) NOT NULL,
  `modulo` enum('inventario','usuarios','areas_zonas','historial_movimientos','ingresos/egresos','ingresos','egresos','registro_actividades','solicitudes','accesos') DEFAULT NULL,
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
  `actualizado_en` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `reportes_automatizados`
--

INSERT INTO `reportes_automatizados` (`uuid`, `id_empresa`, `nombre`, `modulo`, `formato`, `frecuencia`, `hora_ejecucion`, `dia_semana`, `dia_mes`, `notas`, `activo`, `ultimo_ejecutado`, `proxima_ejecucion`, `creado_en`, `actualizado_en`) VALUES
('auto-1760406974492-16c92z', 21, 'reporte', 'areas_zonas', 'pdf', 'daily', '15:27:00', 1, 1, '0', 0, '2025-11-03 22:26:34', '2025-11-04 21:27:00', '2025-10-14 01:56:14', '2025-11-03 22:39:56'),
('auto-1760650407286-ep8ixz', 21, 'usuarios', 'usuarios', 'pdf', 'daily', '18:45:00', 1, 1, '0', 0, '2025-10-19 00:45:00', '2025-10-22 00:45:00', '2025-10-16 21:33:27', '2025-11-03 22:39:56'),
('auto-1760651673564-ngm266', 21, 'sdg', 'inventario', 'pdf', 'daily', '08:00:00', 1, 1, '0', 0, '2025-11-03 22:39:54', '2025-11-04 14:00:00', '2025-10-16 21:54:33', '2025-11-03 22:39:56'),
('auto-1760652057850-n3zju1', 21, 'actividades', 'registro_actividades', 'pdf', 'daily', '08:00:00', 1, 1, '0', 0, '2025-11-03 20:44:17', '2025-11-04 14:00:00', '2025-10-16 22:00:57', '2025-11-03 22:39:56'),
('auto-1760652124869-2yg8wy', 21, 'solicitudes', 'solicitudes', 'pdf', 'daily', '08:00:00', 1, 1, '0', 0, '2025-11-03 22:38:40', '2025-11-04 14:00:00', '2025-10-16 22:02:04', '2025-11-03 22:39:56'),
('auto-1760652326926-jpovuh', 21, 'accesos', 'accesos', 'pdf', 'daily', '08:00:00', 1, 1, '0', 0, '2025-11-03 21:56:36', '2025-11-04 14:00:00', '2025-10-16 22:05:26', '2025-11-03 22:39:56'),
('auto-1760658041969-d4tsey', 21, 'a', 'ingresos', 'pdf', 'daily', '08:00:00', 1, 1, '0', 0, '2025-10-30 23:51:45', '2025-10-31 14:00:00', '2025-10-16 23:40:41', '2025-11-03 22:39:56'),
('auto-1760658062542-geavha', 21, 'b', 'egresos', 'pdf', 'daily', '08:00:00', 1, 1, '0', 0, '2025-11-03 22:00:28', '2025-11-04 14:00:00', '2025-10-16 23:41:02', '2025-11-03 22:39:56'),
('auto-1760746511424-1cc9qm', 21, 'd', 'inventario', 'excel', 'daily', '08:00:00', 1, 1, '0', 0, '2025-11-03 22:02:02', '2025-11-04 14:00:00', '2025-10-18 00:15:11', '2025-11-03 22:39:56'),
('auto-1762015946200-b22cdl', 38, 'reporte automatico', 'inventario', 'pdf', 'daily', '08:00:00', 1, 1, '0', 0, '2025-11-01 16:52:27', '2025-11-02 14:00:00', '2025-11-01 16:52:26', '2025-11-02 01:52:35');

-- --------------------------------------------------------

--
-- Table structure for table `reportes_automatizados_runs`
--

CREATE TABLE `reportes_automatizados_runs` (
  `id` int(11) NOT NULL,
  `automation_uuid` varchar(64) NOT NULL,
  `empresa_id` int(11) NOT NULL,
  `run_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `reportes_automatizados_runs`
--

INSERT INTO `reportes_automatizados_runs` (`id`, `automation_uuid`, `empresa_id`, `run_at`, `created_at`) VALUES
(1, 'auto-1760746511424-1cc9qm', 21, '2025-10-18 14:00:02', '2025-10-18 14:00:02'),
(2, 'auto-1760746511424-1cc9qm', 21, '2025-10-19 08:00:04', '2025-10-19 08:00:04'),
(3, 'auto-1760746511424-1cc9qm', 21, '2025-10-20 08:00:02', '2025-10-20 08:00:02'),
(4, 'auto-1760746511424-1cc9qm', 21, '2025-10-21 08:00:02', '2025-10-21 08:00:02');

-- --------------------------------------------------------

--
-- Table structure for table `reportes_historial`
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
-- Dumping data for table `reportes_historial`
--

INSERT INTO `reportes_historial` (`id`, `uuid`, `id_empresa`, `original_name`, `storage_name`, `mime_type`, `file_size`, `created_at`, `expires_at`, `source`, `notes`, `created_on`, `updated_on`) VALUES
(2, '6254886e616e07849996628d2171ab63', 21, 'solicitudes - 2025-11-03 22-38.pdf', '1762209522-de0a096a93e357f34a8878a471c5e26c.pdf', 'application/pdf', 37313, '2025-11-03 22:38:42', '2026-01-02 22:38:42', 'Historial de solicitudes', 'Generado manualmente · 0', '2025-11-03 22:38:42', NULL),
(3, '35048eb35fd19332bef8ac8711562369', 21, 'sdg - 2025-11-03 22-39.pdf', '1762209596-e96f1132063e0a0b52da6f8e55cbb560.pdf', 'application/pdf', 41302, '2025-11-03 22:39:56', '2026-01-02 22:39:56', 'Gestión de inventario', 'Generado manualmente · 0', '2025-11-03 22:39:56', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `solicitudes_cambios`
--

CREATE TABLE `solicitudes_cambios` (
  `id` int(11) NOT NULL,
  `id_empresa` int(11) NOT NULL,
  `id_solicitante` int(11) NOT NULL,
  `modulo` varchar(100) NOT NULL,
  `tipo_accion` varchar(100) NOT NULL,
  `resumen` varchar(255) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `estado` enum('en_proceso','aceptada','denegada') NOT NULL DEFAULT 'en_proceso',
  `fecha_creacion` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `solicitudes_cambios_historial`
--

CREATE TABLE `solicitudes_cambios_historial` (
  `id` int(11) NOT NULL,
  `solicitud_id` int(11) NOT NULL,
  `id_empresa` int(11) NOT NULL,
  `id_solicitante` int(11) NOT NULL,
  `id_revisor` int(11) NOT NULL,
  `modulo` varchar(100) NOT NULL,
  `tipo_accion` varchar(100) NOT NULL,
  `resumen` varchar(255) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `estado` enum('aceptada','denegada') NOT NULL,
  `comentario` text DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_resolucion` datetime NOT NULL DEFAULT current_timestamp(),
  `resultado` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `solicitudes_cambios_historial`
--

INSERT INTO `solicitudes_cambios_historial` (`id`, `solicitud_id`, `id_empresa`, `id_solicitante`, `id_revisor`, `modulo`, `tipo_accion`, `resumen`, `descripcion`, `payload`, `estado`, `comentario`, `fecha_creacion`, `fecha_resolucion`, `resultado`) VALUES
(1, 1, 21, 57, 57, 'Zonas', 'zona_eliminar', 'Eliminación de la zona ID #26', 'Solicitud de eliminación de zona.', '{\"zona_id\":26,\"empresa_id\":21,\"area_id\":32,\"productos_en_zona\":0,\"movimientos_recientes\":0}', 'denegada', 'que pendejo ajajajajjaj', '2025-10-10 20:46:56', '2025-10-10 20:47:38', '{\"success\":true}'),
(2, 2, 21, 57, 57, 'Zonas', 'zona_eliminar', 'Eliminación de la zona ID #26', 'Solicitud de eliminación de zona.', '{\"zona_id\":26,\"empresa_id\":21,\"area_id\":32,\"productos_en_zona\":0,\"movimientos_recientes\":0}', 'aceptada', '', '2025-10-10 20:51:19', '2025-10-10 20:51:26', '{\"success\":true}'),
(3, 4, 21, 57, 57, 'Productos', 'producto_eliminar', 'Eliminación del producto ID #50', 'Solicitud de eliminación de producto.', '{\"id_producto\":50,\"empresa_id\":21,\"zona_id\":16,\"movimientos_asociados\":13,\"force_delete\":true}', 'denegada', '', '2025-10-10 21:01:30', '2025-10-10 21:18:12', '{\"success\":true}'),
(4, 3, 21, 57, 57, 'Zonas', 'zona_eliminar', 'Eliminar zona \"rack B\" (ID #21)', 'Solicitud de eliminación de la zona \"rack B\".', '{\"zona_id\":21,\"empresa_id\":21,\"area_id\":26,\"nombre_zona\":\"rack B\",\"productos_en_zona\":0,\"movimientos_recientes\":0}', 'denegada', '', '2025-10-10 21:01:06', '2025-10-10 21:18:22', '{\"success\":true}'),
(5, 5, 21, 57, 57, 'Usuarios', 'usuario_editar_datos', 'Actualizar datos internos del usuario \"Super Vizor\" (ID #119)', 'Solicitud de edición de datos de usuario desde administración.', '{\"id_usuario\":119,\"nombre\":\"Super\",\"apellido\":\"Vizor\",\"nombre_completo\":\"Super Vizor\",\"telefono\":\"123456789\",\"fecha_nacimiento\":\"2001-01-01\",\"rol\":\"Supervisor\"}', 'aceptada', '', '2025-10-10 21:39:14', '2025-10-10 21:39:27', '{\"success\":true,\"message\":\"Usuario actualizado.\"}'),
(6, 6, 21, 57, 57, 'Productos', 'producto_actualizar', 'Actualización del producto \"Conos de papel\" (ID #45)', 'Solicitud registrada desde el gestor de inventario.', '{\"empresa_id\":21,\"nombre\":\"Conos de papel\",\"descripcion\":\"\",\"categoria_id\":32,\"subcategoria_id\":37,\"stock\":17,\"precio_compra\":2,\"dim_x\":12,\"dim_y\":12,\"dim_z\":5,\"zona_id\":16,\"volumen_cm3\":12240,\"id_producto\":45,\"zona_anterior\":16,\"volumen_anterior_m3\":0.011968}', 'denegada', '', '2025-10-10 21:41:37', '2025-10-10 21:41:45', '{\"success\":true}'),
(7, 7, 21, 57, 57, 'Áreas', 'area_actualizar', 'Actualización del área \"cocina\" (ID #32)', 'Solicitud de modificación de área.', '{\"area_id\":32,\"empresa_id\":21,\"nombre\":\"cocina\",\"descripcion\":\"cocina\",\"ancho\":3,\"alto\":2,\"largo\":4,\"volumen\":24}', 'aceptada', '', '2025-10-10 21:42:52', '2025-10-10 21:42:59', '{\"success\":true}'),
(8, 8, 21, 57, 57, 'Usuarios', 'usuario_editar_datos', 'Actualizar datos internos del usuario \"Hector Sanchez\" (ID #111)', 'Solicitud de edición de datos de usuario desde administración.', '{\"id_usuario\":111,\"nombre\":\"Hector\",\"apellido\":\"Sanchez\",\"nombre_completo\":\"Hector Sanchez\",\"telefono\":\"987654321\",\"fecha_nacimiento\":\"1997-12-21\",\"rol\":\"Almacenista\"}', 'denegada', '', '2025-10-10 22:04:16', '2025-10-10 22:04:29', '{\"success\":true}'),
(9, 9, 21, 57, 57, 'Empresa', 'empresa_actualizar', 'Actualización de la empresa \"Discocks - CDs y Vinilos\" (ID #21)', 'Solicitud de actualización de datos de empresa.', '{\"id_empresa\":21,\"nombre_empresa\":\"Discocks - CDs y Vinilos\",\"sector_empresa\":\"Comercial\",\"logo_pendiente\":\"images/pending/logos/logo_21_68e9838aea9219.86723353.png\"}', 'aceptada', '', '2025-10-10 22:07:06', '2025-10-10 22:07:14', '{\"success\":true,\"message\":\"Empresa actualizada.\",\"logo\":\"images/logos/logo_21_1760134034.png\"}'),
(10, 10, 21, 57, 57, 'Usuarios', 'usuario_actualizar', 'Actualización de datos del usuario \"Emiliano Sanchez Flores\" (ID #57)', 'Actualización solicitada desde la edición de perfil.', '{\"id_usuario\":57,\"nombre\":\"Emiliano\",\"apellido\":\"Sanchez Flores\",\"nombre_completo\":\"Emiliano Sanchez Flores\",\"telefono\":\"6731350698\",\"correo\":\"a21100316@ceti.mx\",\"foto_pendiente\":\"images/pending/perfiles/perfil_57_68e987580790c2.06260304.jpg\"}', 'aceptada', '', '2025-10-10 22:23:20', '2025-10-10 22:23:28', '{\"success\":true,\"message\":\"Se aplicó la actualización del usuario.\",\"foto\":\"images/profiles/perfil_57_1760135008.jpg\"}'),
(11, 12, 21, 57, 57, 'Usuarios', 'usuario_editar_datos', 'Actualizar datos internos del usuario \"Carmen Alicia Flores Inzunza\" (ID #110)', 'Solicitud de edición de datos de usuario desde administración.', '{\"id_usuario\":110,\"nombre\":\"Carmen Alicia\",\"apellido\":\"Flores Inzunza\",\"nombre_completo\":\"Carmen Alicia Flores Inzunza\",\"telefono\":\"3321099971\",\"fecha_nacimiento\":\"2004-03-03\",\"rol\":\"Etiquetador\"}', 'denegada', '', '2025-10-10 23:27:08', '2025-10-10 23:29:03', '{\"success\":true}'),
(12, 11, 21, 57, 57, 'Usuarios', 'usuario_editar_datos', 'Actualizar datos internos del usuario \"Carmen Alicia Flores Inzunza\" (ID #110)', 'Solicitud de edición de datos de usuario desde administración.', '{\"id_usuario\":110,\"nombre\":\"Carmen Alicia\",\"apellido\":\"Flores Inzunza\",\"nombre_completo\":\"Carmen Alicia Flores Inzunza\",\"telefono\":\"33210999\",\"fecha_nacimiento\":\"2004-03-03\",\"rol\":\"Mantenimiento\"}', 'denegada', '', '2025-10-10 23:27:01', '2025-10-10 23:29:08', '{\"success\":true}'),
(13, 13, 21, 57, 57, 'Usuarios', 'usuario_cambiar_estado', 'Desactivar usuario \"Carmen Alicia Flores Inzunza\"', 'Cambio de estado de usuario solicitado.', '{\"id_usuario\":110,\"activo\":0,\"id_empresa\":21,\"nombre_usuario\":\"Carmen Alicia Flores Inzunza\"}', 'aceptada', '', '2025-10-10 23:48:15', '2025-10-10 23:48:22', '{\"success\":true,\"message\":\"Estado actualizado.\"}'),
(14, 14, 21, 57, 57, 'Usuarios', 'usuario_cambiar_estado', 'Activar usuario \"Carmen Alicia Flores Inzunza\"', 'Cambio de estado de usuario solicitado.', '{\"id_usuario\":110,\"activo\":1,\"id_empresa\":21,\"nombre_usuario\":\"Carmen Alicia Flores Inzunza\"}', 'aceptada', '', '2025-10-10 23:48:30', '2025-10-10 23:48:34', '{\"success\":true,\"message\":\"Estado actualizado.\"}'),
(15, 16, 21, 57, 57, 'Usuarios', 'usuario_asignar_area', 'Asignar área \"cocina\" (ID #32) al usuario \"Carmen Alicia Flores Inzunza\" (ID #110)', 'Solicitud de asignación de acceso a área.', '{\"id_usuario\":110,\"id_area\":32,\"id_empresa\":21,\"nombre_usuario\":\"Carmen Alicia Flores Inzunza\",\"nombre_area\":\"cocina\"}', 'aceptada', '', '2025-10-10 23:48:52', '2025-10-10 23:49:01', '{\"success\":true,\"message\":\"Asignación realizada.\"}'),
(16, 15, 21, 57, 57, 'Usuarios', 'usuario_eliminar_acceso', 'Revocar acceso del usuario \"Hector Sanchez Lung\" (ID #111) al área \"area\" (ID #21)', 'Solicitud para revocar acceso a área o zona.', '{\"id_usuario\":111,\"id_area\":21,\"id_zona\":null,\"id_empresa\":21,\"nombre_usuario\":\"Hector Sanchez Lung\",\"nombre_area\":\"area\",\"nombre_zona\":null}', 'aceptada', '', '2025-10-10 23:48:44', '2025-10-10 23:49:06', '{\"success\":true,\"message\":\"Asignación eliminada.\"}'),
(17, 18, 21, 57, 57, 'Usuarios', 'usuario_eliminar', 'Eliminar usuario \"Super Vizor\" · ID #119 (correo supervisor@gmail.com)', 'Solicitud de eliminación de cuenta de usuario.', '{\"correo\":\"supervisor@gmail.com\",\"id_usuario\":119,\"nombre_usuario\":\"Super Vizor\",\"id_empresa\":21}', 'denegada', '', '2025-10-10 23:50:36', '2025-10-10 23:50:48', '{\"success\":true}'),
(18, 19, 21, 111, 111, 'Usuarios', 'usuario_actualizar', 'Actualización de datos del usuario \"Hector Sanchez Lung\" (ID #111)', 'Actualización solicitada desde la edición de perfil.', '{\"id_usuario\":111,\"nombre\":\"Hector\",\"apellido\":\"Sanchez Lung\",\"nombre_completo\":\"Hector Sanchez Lung\",\"telefono\":\"987654321\",\"correo\":\"hector.lung@gmail.com\",\"foto_pendiente\":\"images/pending/perfiles/perfil_111_68e99c0d701b78.82224961.jpg\"}', 'aceptada', '', '2025-10-10 23:51:41', '2025-10-10 23:51:48', '{\"success\":true,\"message\":\"Se aplicó la actualización del usuario.\",\"foto\":\"images/profiles/perfil_111_1760140308.jpg\"}'),
(19, 17, 21, 57, 57, 'Usuarios', 'usuario_eliminar_acceso', 'Revocar acceso del usuario \"Carmen Alicia Flores Inzunza\" (ID #110) al área \"cocina\" (ID #32)', 'Solicitud para revocar acceso a área o zona.', '{\"id_usuario\":110,\"id_area\":32,\"id_zona\":null,\"id_empresa\":21,\"nombre_usuario\":\"Carmen Alicia Flores Inzunza\",\"nombre_area\":\"cocina\",\"nombre_zona\":null}', 'aceptada', '', '2025-10-10 23:49:54', '2025-10-11 00:00:23', '{\"success\":true,\"message\":\"Asignación eliminada.\"}'),
(20, 21, 24, 60, 60, 'Empresa', 'empresa_actualizar', 'Actualización de la empresa \"EL KINI CORP\" (ID #24)', 'Solicitud de actualización de datos de empresa.', '{\"id_empresa\":24,\"nombre_empresa\":\"EL KINI CORP\",\"sector_empresa\":\"Industrial\",\"logo_pendiente\":\"images/pending/logos/logo_24_68e9fd990b66a4.60703606.jpg\"}', 'aceptada', '', '2025-10-11 06:47:53', '2025-10-11 06:48:19', '{\"success\":true,\"message\":\"Empresa actualizada.\",\"logo\":\"images/logos/logo_24_1760165299.jpg\"}'),
(21, 22, 21, 57, 57, 'Usuarios', 'usuario_editar_datos', 'Actualizar datos internos del usuario \"Super Viszr\" (ID #119)', 'Solicitud de edición de datos de usuario desde administración.', '{\"id_usuario\":119,\"nombre\":\"Super\",\"apellido\":\"Viszr\",\"nombre_completo\":\"Super Viszr\",\"telefono\":\"123456789\",\"fecha_nacimiento\":\"2001-01-01\",\"rol\":\"Supervisor\",\"id_empresa\":21}', 'denegada', '', '2025-10-11 19:33:09', '2025-10-11 19:33:24', '{\"success\":true}'),
(22, 20, 21, 57, 57, 'Usuarios', 'usuario_cambiar_estado', 'Desactivar usuario \"Carmen Alicia Flores Inzunza\"', 'Cambio de estado de usuario solicitado.', '{\"id_usuario\":110,\"activo\":0,\"id_empresa\":21,\"nombre_usuario\":\"Carmen Alicia Flores Inzunza\"}', 'denegada', '', '2025-10-11 00:00:36', '2025-10-11 19:56:09', '{\"success\":true}'),
(23, 25, 21, 119, 57, 'Productos', 'producto_actualizar', 'Actualización del producto \"Conos de papel\" (ID #45)', 'Solicitud registrada desde el gestor de inventario.', '{\"empresa_id\":21,\"nombre\":\"Conos de papel\",\"descripcion\":\"conos de papel para tomar awa\",\"categoria_id\":32,\"subcategoria_id\":37,\"stock\":20,\"precio_compra\":2,\"dim_x\":12,\"dim_y\":12,\"dim_z\":8,\"zona_id\":16,\"volumen_cm3\":23040,\"id_producto\":45,\"zona_anterior\":16,\"volumen_anterior_m3\":0.01408}', 'aceptada', '', '2025-10-14 01:52:11', '2025-10-14 01:52:34', '{\"success\":true}'),
(24, 23, 21, 111, 57, 'Usuarios', 'usuario_eliminar_acceso', 'Revocar acceso del usuario \"Hector Sanchez Lung\" (ID #111) al área \"nueva area\" (ID #31)', 'Solicitud para revocar acceso a área o zona.', '{\"id_usuario\":111,\"id_area\":31,\"id_zona\":null,\"id_empresa\":21,\"nombre_usuario\":\"Hector Sanchez Lung\",\"nombre_area\":\"nueva area\",\"nombre_zona\":null}', 'aceptada', '', '2025-10-11 21:37:21', '2025-10-14 01:57:09', '{\"success\":true,\"message\":\"Asignación eliminada.\"}'),
(25, 24, 21, 111, 57, 'Zonas', 'zona_eliminar', 'Eliminar zona \"zona nueva\" (ID #24)', 'Solicitud de eliminación de la zona \"zona nueva\".', '{\"zona_id\":24,\"empresa_id\":21,\"area_id\":0,\"nombre_zona\":\"zona nueva\",\"productos_en_zona\":0,\"movimientos_recientes\":0}', 'denegada', '', '2025-10-11 21:37:38', '2025-10-14 01:57:16', '{\"success\":true}'),
(26, 26, 24, 129, 60, 'Usuarios', 'usuario_asignar_area', 'Asignar área \"Papeleria Ely\" (ID #30) al usuario \"Ivan Eduardo García Verduzco\" (ID #129)', 'Solicitud de asignación de acceso a área.', '{\"id_usuario\":129,\"id_area\":30,\"id_empresa\":24,\"nombre_usuario\":\"Ivan Eduardo García Verduzco\",\"nombre_area\":\"Papeleria Ely\"}', 'aceptada', '', '2025-10-14 17:15:45', '2025-10-14 17:16:29', '{\"success\":true,\"message\":\"Asignación realizada.\"}'),
(27, 27, 21, 111, 57, 'Usuarios', 'usuario_cambiar_estado', 'Activar usuario \"Carmen Alicia Flores Inzunza\"', 'Cambio de estado de usuario solicitado.', '{\"id_usuario\":110,\"activo\":1,\"id_empresa\":21,\"nombre_usuario\":\"Carmen Alicia Flores Inzunza\"}', 'aceptada', '', '2025-10-15 15:54:40', '2025-10-15 15:55:16', '{\"success\":true,\"message\":\"Estado actualizado.\"}'),
(28, 30, 21, 111, 57, 'Usuarios', 'usuario_asignar_area', 'Asignar área \"nueva area\" (ID #31) al usuario \"Super Visor\" (ID #119)', 'Solicitud de asignación de acceso a área.', '{\"id_usuario\":119,\"id_area\":31,\"id_empresa\":21,\"nombre_usuario\":\"Super Visor\",\"nombre_area\":\"nueva area\"}', 'denegada', 'jAJAJ lol', '2025-10-16 22:03:15', '2025-10-16 22:04:15', '{\"success\":true}'),
(29, 29, 21, 111, 57, 'Usuarios', 'usuario_asignar_area', 'Asignar área \"cocina\" (ID #32) al usuario \"Super Visor\" (ID #119)', 'Solicitud de asignación de acceso a área.', '{\"id_usuario\":119,\"id_area\":32,\"id_empresa\":21,\"nombre_usuario\":\"Super Visor\",\"nombre_area\":\"cocina\"}', 'aceptada', '', '2025-10-16 22:03:12', '2025-10-16 22:04:20', '{\"success\":true,\"message\":\"Asignación realizada.\"}'),
(30, 31, 21, 119, 57, 'Áreas', 'area_eliminar', 'Eliminación del área \"cocina\" (ID #32)', 'Solicitud de eliminación de área.', '{\"area_id\":32,\"empresa_id\":21,\"nombre_area\":\"cocina\",\"zona_strategy\":\"\",\"zonas_asociadas\":0}', 'aceptada', '', '2025-10-29 15:43:10', '2025-10-29 15:43:53', '{\"success\":true}'),
(31, 32, 21, 110, 57, 'Usuarios', 'usuario_eliminar', 'Eliminar usuario \"Cuenta Prueba\" · ID #134 (correo a@gmail.com)', 'Solicitud de eliminación de cuenta de usuario.', '{\"correo\":\"a@gmail.com\",\"id_usuario\":134,\"nombre_usuario\":\"Cuenta Prueba\",\"id_empresa\":21}', 'aceptada', '', '2025-11-03 02:50:29', '2025-11-03 02:50:46', '{\"success\":true,\"message\":\"Usuario eliminado.\"}'),
(32, 28, 21, 111, 57, 'Usuarios', 'usuario_cambiar_estado', 'Desactivar usuario \"Carmen Alicia Flores Inzunza\"', 'Cambio de estado de usuario solicitado.', '{\"id_usuario\":110,\"activo\":0,\"id_empresa\":21,\"nombre_usuario\":\"Carmen Alicia Flores Inzunza\"}', 'denegada', '', '2025-10-16 22:03:06', '2025-11-03 18:13:13', '{\"success\":true}'),
(33, 33, 21, 110, 57, 'Usuarios', 'usuario_eliminar', 'Eliminar usuario \"cuenta prueba\" · ID #135 (correo cuentapruba@gmail.com)', 'Solicitud de eliminación de cuenta de usuario.', '{\"correo\":\"cuentapruba@gmail.com\",\"id_usuario\":135,\"nombre_usuario\":\"cuenta prueba\",\"id_empresa\":21,\"solicitudes_pendientes\":0}', 'denegada', '', '2025-11-03 18:14:15', '2025-11-03 18:15:15', '{\"success\":true}'),
(34, 34, 21, 110, 57, 'Usuarios', 'usuario_eliminar', 'Eliminar usuario \"cuenta prueba\" · ID #135 (correo cuentapruba@gmail.com)', 'Solicitud de eliminación de cuenta de usuario.', '{\"correo\":\"cuentapruba@gmail.com\",\"id_usuario\":135,\"nombre_usuario\":\"cuenta prueba\",\"id_empresa\":21,\"solicitudes_pendientes\":0}', 'aceptada', '', '2025-11-03 18:38:27', '2025-11-03 18:38:41', '{\"success\":true,\"message\":\"Usuario eliminado. Se eliminaron 2 movimientos de inventario asociados. También se eliminaron 2 registros de actividades asociados.\",\"registros_actividades_eliminados\":2,\"movimientos_eliminados\":2,\"dependencias\":{\"movimientos\":2,\"empresas_creadas\":0,\"tokens_recuperacion\":0,\"movimientos_eliminados\":2}}'),
(35, 35, 21, 110, 57, 'Usuarios', 'usuario_cambiar_estado', 'Desactivar usuario \"Menganito Tilin\"', 'Cambio de estado de usuario solicitado.', '{\"id_usuario\":136,\"activo\":0,\"id_empresa\":21,\"nombre_usuario\":\"Menganito Tilin\"}', 'denegada', '', '2025-11-03 18:42:51', '2025-11-03 18:44:07', '{\"success\":true}');

-- --------------------------------------------------------

--
-- Table structure for table `subcategorias`
--

CREATE TABLE `subcategorias` (
  `id` int(11) NOT NULL,
  `categoria_id` int(11) DEFAULT NULL,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `empresa_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subcategorias`
--

INSERT INTO `subcategorias` (`id`, `categoria_id`, `nombre`, `descripcion`, `empresa_id`) VALUES
(23, 24, 'sadeadada', 'werf23wffsef', 23),
(27, 27, 'Puntillas', 'Lapices de puntillas', 23),
(28, 28, 'Madera de cedro verde', '', 28),
(34, 33, 'sub1', 'cositas', 24),
(35, 34, 'papel a4', 'tamaño a4', 24),
(36, 34, 'papel a4', 'tamaño a4', 24),
(37, 32, 'conos', '', 21),
(38, 31, 'platos', '', 21),
(39, 34, 'china', 'Exclusivo para papeles china', 24),
(40, 36, 'Tornillos', 'tornillos xd', 36),
(41, 37, 'subcategoria', 'subcategoria de prueba', 38);

-- --------------------------------------------------------

--
-- Table structure for table `usuario`
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
-- Dumping data for table `usuario`
--

INSERT INTO `usuario` (`id_usuario`, `nombre`, `apellido`, `fecha_nacimiento`, `telefono`, `correo`, `contrasena`, `rol`, `fecha_registro`, `verificacion_cuenta`, `suscripcion`, `intentos_fallidos`, `ultimo_intento`, `foto_perfil`, `activo`, `tutorial_visto`) VALUES
(33, 'Ivan Eduardo', 'Garcia Verduzco', '2005-05-15', '3315634572', 'ivangmgm1290@gmail.com', '31bbc4cb70043dcb8cca35cb837832c419a4caa6', 'Administrador', '2025-04-07 14:32:50', 1, 0, 7, '2025-10-02 19:23:01', 'images/profile.jpg', 1, 1),
(56, 'kay', 'ro', '2025-12-22', '123456', 'a21100285@ceti.mx', '64b6c7a5060af5e67425be0ca23b3a9df4524d5e', 'Administrador', '2025-04-08 13:46:31', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(57, 'Emiliano', 'Sanchez Flores', '2005-03-30', '6731350698', 'a21100316@ceti.mx', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Administrador', '2025-04-17 02:28:49', 1, 0, 0, NULL, 'images/profiles/perfil_57_1760135008.jpg', 1, 1),
(58, 'Emiliano', 'Sanchez Flores', '2005-03-30', '6731350698', 'tareasdeemi@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Administrador', '2025-04-18 05:39:32', 1, 0, 0, NULL, 'images/profiles/perfil_58_1756914842.jpg', 1, 1),
(59, 'Esteban Israel', 'Caballero Velázquez', '2006-08-03', '3323859470', 'a21300617@ceti.mx', '851f50aaf59b40156423094ad134cbd4272f399a', 'Administrador', '2025-05-21 12:53:38', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(60, 'Ivan Eduardo', 'Garcia Verduzco', '2005-06-15', '3315634573', 'ie.garcia.ve@gmail.com', 'ba46035ced600481626596823e153ceb433fd886', 'Administrador', '2025-06-23 02:23:08', 1, 0, 5, '2025-10-03 04:44:14', 'images/profiles/perfil_60_1761147771.jpg', 1, 1),
(61, 'kini', 'a', '2000-03-12', '331342411', '1234567U@gmail.com', 'fede6a5f0852a4d0d1f56ee296b85a9c227b13bd', 'Administrador', '2025-06-24 14:02:28', 0, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(62, 'kini', 'a', '2000-03-12', '331342411', 'grasomister642@gmail.com', 'fede6a5f0852a4d0d1f56ee296b85a9c227b13bd', 'Administrador', '2025-06-24 14:03:43', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(75, 'el pepe', 'Ete sech', '2004-04-12', '1234567890', 'elpepeetesech@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Etiquetador', '2025-07-01 01:32:25', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(80, 'juan', 'garcia', '2005-06-15', '3351431241242', 'juangarcia@gmail.com', 'ed44bb6085905e93ed20c701fb11a6d58a6c82f0', 'Almacenista', '2025-07-01 14:11:40', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(81, 'emiliano', 'perez', '1999-09-12', '1414213412', 'emiliano123@gmail.com', 'fede6a5f0852a4d0d1f56ee296b85a9c227b13bd', 'Almacenista', '2025-07-01 14:12:31', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(83, 'jose', 'vasconcelos', '2005-09-15', '331241412', 'imchatgpt5@gmail.com', 'fede6a5f0852a4d0d1f56ee296b85a9c227b13bd', 'Etiquetador', '2025-07-01 14:25:58', 1, 0, 4, '2025-07-01 14:31:25', 'images/profile.jpg', 1, 1),
(85, 'elber', 'gadura', '2001-01-10', '6731350698', 'elbergalarza313@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Etiquetador', '2025-07-05 19:00:25', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(91, 'Papu', 'Josh', '2005-08-07', '3326995066', 'a25110130@ceti.mx', 'a56694c6940386029bc5c36f63f8d64bbe018e90', 'Etiquetador', '2025-08-01 18:41:04', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(92, 'Uusario 1', 'user', '2005-06-15', '3315634512', 'correoprueba@gmail.com', '41137b4535ac2e5d1b81a9f6a1eca42ddce92916', 'Supervisor', '2025-08-01 23:26:30', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(93, 'Erick', 'Olguín', '2005-08-05', '3322201713', 'a19300083@ceti.mx', '6241388bba3e129f606bd7e9baeb8c4f76494272', 'Etiquetador', '2025-08-04 17:00:37', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(96, 'Erick', 'Olguín', '2025-08-04', '3322201713', 'erizo.gamer.781@gmail.com', '1094724d221af7856d7ccee086f1f463885ad572', 'Etiquetador', '2025-08-04 17:03:39', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(97, 'Vamos', 'Apasar', '2002-08-07', '12345678', 'optistockproject@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Administrador', '2025-08-08 04:17:00', 1, 0, 0, NULL, 'images/profile.jpg', 1, 1),
(101, 'Ivan Eduardo', 'Garcia Verduzcoo', '2000-01-02', '3315634573', 'juanitoalcachofaro@gmail.com', 'e591c90145d5a1451f8a270e491f5cc1cb6eb43e', 'Administrador', '2025-09-03 16:17:21', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(102, 'Menga', 'Nito', '2005-03-30', '6731350698', 'disksvinylcdymas@gmail.com', '62d027e4de8205d9da29815b99ea7172e1b42301', 'Administrador', '2025-09-05 00:25:47', 1, 0, 0, NULL, 'images/profile.jpg', 1, 1),
(104, 'Samuel', 'Etoo', '1996-07-19', '3325278895', 'samuelito@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Almacenista', '2025-09-05 00:32:26', 1, 0, 0, NULL, 'images/almacenista.jpg', 1, 0),
(105, 'Lionel Andres', 'Messi Cuccittini', '1988-04-02', '928749681', 'lionel.messi@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Etiquetador', '2025-09-05 00:33:49', 1, 0, 0, NULL, 'images/etiquetador.jpg', 1, 0),
(106, 'Cristiano', 'Ronaldo', '1978-11-05', '77642969', 'cr7@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Supervisor', '2025-09-05 00:35:47', 1, 0, 0, NULL, 'images/supervisor.jpg', 1, 0),
(107, 'Lamine', 'Tamal', '1994-11-12', '1234567890', 'laminetamal@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Mantenimiento', '2025-09-05 00:36:36', 1, 0, 0, NULL, 'images/mantenimiento.jpg', 1, 0),
(110, 'Carmen Alicia', 'Flores Inzunza', '2004-03-03', '3321099971', 'carmen.alicia@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Mantenimiento', '2025-09-09 00:14:22', 1, 0, 0, NULL, 'images/mantenimiento.jpg', 1, 1),
(111, 'Hector', 'Sanchez Lung', '1997-12-21', '987654321', 'hector.lung@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Almacenista', '2025-09-09 01:54:52', 1, 0, 0, NULL, 'images/profiles/perfil_111_1760140308.jpg', 1, 1),
(112, 'juanito', 'garcia', '2000-01-04', '3399988221', 'vipoca7841@certve.com', '3414039fe8ebbb0bc6db4ff54d0ca57016732635', 'Almacenista', '2025-09-10 15:55:38', 1, 0, 0, NULL, 'images/supervisor.jpg', 1, 0),
(113, 'Fulanito', 'Menganito', '2005-03-30', '3321099971', 'lumminary2@gmail.com', 'ae53da110e755b430ee6285a1ad0b41138b956d0', 'Administrador', '2025-09-10 16:08:45', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(114, 'OSAMA', 'HOSNI TOUIL TOUIL', '1975-05-26', '679121427', 'osamahosni1975@gmail.com', '135731ba3cd4a9cbe32b530e7c192c69965ba448', 'Administrador', '2025-09-16 17:12:04', 1, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(115, 'rocha', 'alejandro', '2000-05-05', '99999999999999', 'rochamagico.90@gmail.com', '3414039fe8ebbb0bc6db4ff54d0ca57016732635', 'Almacenista', '2025-10-01 02:47:58', 1, 0, 0, NULL, 'images/almacenista.jpg', 1, 1),
(116, 'Mariana Yatzil ', 'García Verduzco ', '2008-05-11', '33-11006257', 'mariyatgar@gmail.com', '1d732453f23aae921d779a393c1bbfa34facbeb4', 'Administrador', '2025-10-02 19:43:43', 1, 0, 0, NULL, 'images/profile.jpg', 1, 1),
(117, 'Mario', 'Garcia', '2025-01-01', '3329658948', 'mario.garciadelacruz@forvia.com', '151bb728245d7f2877ea67505dabb1df033fd54c', 'Administrador', '2025-10-02 19:46:54', 0, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(121, 'Elber', 'Galarza', '2004-03-30', '12233445', 'ktota6235@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Administrador', '2025-10-09 20:45:34', 1, 0, 0, NULL, 'images/profile.jpg', 1, 1),
(125, 'Carlos', 'Roberto', '2004-03-30', '12345678', 'ycarlosroberto215@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Administrador', '2025-10-10 02:33:17', 1, 0, 0, NULL, 'images/profile.jpg', 1, 1),
(127, 'cris', 'cris', '1991-06-18', '5567583161', 'christian180691@gmail.com', '6d09fdec663cf39b5800e4f6fc1d5ebd95e80690', 'Administrador', '2025-10-10 17:46:35', 1, 0, 0, NULL, 'images/profile.jpg', 1, 1),
(128, 'playboi', 'carti', '1998-04-20', '12345689', 'putyclub10@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Administrador', '2025-10-11 22:40:53', 0, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(129, 'Ivan Eduardo', 'García Verduzco', '2000-10-12', '339999992', 'ivancito@gmail.com', 'fede6a5f0852a4d0d1f56ee296b85a9c227b13bd', 'Etiquetador', '2025-10-12 18:31:30', 1, 0, 0, NULL, 'images/etiquetador.jpg', 1, 1),
(130, 'Jama', 'Anzaldo', '2025-03-03', '3346044746', 'manolo4real@gmail.com', '0f85a9797fedbdacc9850017abe64f31b3957ae8', 'Administrador', '2025-10-17 17:38:27', 1, 0, 0, NULL, 'images/profile.jpg', 1, 1),
(131, 'Cuenta', 'de Prueba', '2001-01-01', '00000000', 'cuentadeprueba@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Administrador', '2025-10-24 23:03:22', 0, 0, 0, NULL, 'images/profile.jpg', 1, 0),
(132, 'Cuenta', 'de Prueba', '2001-01-01', '12345678', 'cuentadeprueba129834@gmail.com', 'afd947c27346ada5f9246d07d1bcb380481407e1', 'Administrador', '2025-10-27 17:06:34', 1, 0, 0, NULL, 'images/profile.jpg', 1, 1),
(136, 'Menganito', 'Tilin', '2003-04-12', '11111111', 'menganito@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Supervisor', '2025-11-03 18:40:45', 1, 0, 0, NULL, 'images/mantenimiento.jpg', 1, 0),
(138, 'usuario1', 'usuario1ap', '2000-01-15', '999912312', 'usuario1@gmail.com', '7af2d10b73ab7cd8f603937f7697cb5fe432c7ff', 'Supervisor', '2025-11-07 04:56:00', 1, 0, 0, NULL, 'images/supervisor.jpg', 1, 0),
(139, 'Nadya', 'Diaz', '2007-05-21', '3123213121', 'hola.123@gmail.com', '7af2d10b73ab7cd8f603937f7697cb5fe432c7ff', 'Supervisor', '2025-11-07 16:58:44', 1, 0, 0, NULL, 'images/supervisor.jpg', 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `usuario_area_zona`
--

CREATE TABLE `usuario_area_zona` (
  `id_usuario` int(11) NOT NULL,
  `id_area` int(11) NOT NULL,
  `id_zona` int(11) DEFAULT NULL,
  `fecha_asignacion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `usuario_area_zona`
--

INSERT INTO `usuario_area_zona` (`id_usuario`, `id_area`, `id_zona`, `fecha_asignacion`) VALUES
(111, 36, NULL, '2025-11-03 16:50:32');

-- --------------------------------------------------------

--
-- Table structure for table `usuario_empresa`
--

CREATE TABLE `usuario_empresa` (
  `id_usuario` int(11) NOT NULL,
  `id_empresa` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `usuario_empresa`
--

INSERT INTO `usuario_empresa` (`id_usuario`, `id_empresa`) VALUES
(110, 21),
(111, 21),
(136, 21),
(75, 22),
(92, 23),
(112, 24),
(115, 24),
(129, 24),
(138, 24),
(139, 24),
(80, 25),
(81, 25),
(104, 31),
(105, 31),
(106, 31),
(107, 31);

-- --------------------------------------------------------

--
-- Table structure for table `zonas`
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
-- Dumping data for table `zonas`
--

INSERT INTO `zonas` (`id`, `nombre`, `descripcion`, `ancho`, `alto`, `largo`, `volumen`, `capacidad_utilizada`, `porcentaje_ocupacion`, `productos_registrados`, `tipo_almacenamiento`, `subniveles`, `area_id`, `id_empresa`) VALUES
(17, 'Zona 1', 'es la zona 1', 2.00, 2.00, 2.00, 8.00, 0.00, 0.00, 0, 'gabinete', '[]', 22, 24),
(19, 'Iglesia Patólica', 'Una iglesia a nuestro señor y salvador emplumado', 0.00, 1.00, 0.00, 0.00, 0.00, 0.00, 0, 'jaula', '[]', 24, 28),
(20, 'rack A', 'rack para cosas pesadas', 1.50, 3.00, 5.00, 22.50, 0.02, 0.10, 2, 'rack', NULL, 36, 21),
(21, 'rack B', 'otro rack', 1.50, 3.00, 5.00, 22.50, 0.00, 0.00, 0, 'rack', NULL, 36, 21),
(22, 'rack C', 'otro rack', 1.50, 3.00, 5.00, 22.50, 0.26, 1.15, 2, 'rack', NULL, 36, 21),
(23, 'Zona1', 'zona1', 2.00, 1.00, 2.00, 4.00, 0.00, 0.00, 0, 'cajón', '[]', 28, 30),
(24, 'zona nueva', 'zona que no quiero con area', 10.00, 2.00, 10.00, 200.00, 0.00, 0.00, 0, 'jaula', NULL, 36, 21),
(27, 'zona 1', 'JOSNFIOSWNFIWENUIFEW', 2.00, 10.00, 3.00, 60.00, 0.01, 0.02, 1, 'carro', NULL, 33, 23),
(28, 'Rack1', 'fafFEWFfFtu mama', 3.00, 2.00, 2.00, 12.00, 0.10, 0.83, 1, 'armario', NULL, 34, 36),
(29, 'zona', 'zona de la area de prueba', 2.00, 1.00, 1.00, 2.00, 0.01, 0.50, 1, 'rack', NULL, 35, 38);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `areas`
--
ALTER TABLE `areas`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `busquedas_recientes_empresa`
--
ALTER TABLE `busquedas_recientes_empresa`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_empresa_termino` (`id_empresa`,`termino`);

--
-- Indexes for table `categorias`
--
ALTER TABLE `categorias`
  ADD PRIMARY KEY (`id`),
  ADD KEY `empresa_id` (`empresa_id`);

--
-- Indexes for table `configuracion_empresa`
--
ALTER TABLE `configuracion_empresa`
  ADD PRIMARY KEY (`id_empresa`);

--
-- Indexes for table `empresa`
--
ALTER TABLE `empresa`
  ADD PRIMARY KEY (`id_empresa`),
  ADD KEY `usuario_creador` (`usuario_creador`);

--
-- Indexes for table `historial_busquedas`
--
ALTER TABLE `historial_busquedas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_empresa_fecha` (`id_empresa`,`fecha_busqueda`),
  ADD KEY `fk_historial_usuario` (`id_usuario`);

--
-- Indexes for table `log_control`
--
ALTER TABLE `log_control`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_usuario` (`id_usuario`);

--
-- Indexes for table `movimientos`
--
ALTER TABLE `movimientos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `producto_id` (`producto_id`),
  ADD KEY `fk_movimientos_usuario` (`id_usuario`);

--
-- Indexes for table `notificaciones`
--
ALTER TABLE `notificaciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notificaciones_empresa_fecha` (`id_empresa`,`fecha_disponible_desde`),
  ADD KEY `idx_notificaciones_destinatario` (`tipo_destinatario`,`rol_destinatario`,`id_usuario_destinatario`);

--
-- Indexes for table `incidencias_infraestructura`
--
ALTER TABLE `incidencias_infraestructura`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_incidencias_empresa_estado` (`id_empresa`,`estado`),
  ADD KEY `idx_incidencias_area` (`area_id`),
  ADD KEY `idx_incidencias_zona` (`zona_id`),
  ADD KEY `idx_incidencias_reporta` (`id_usuario_reporta`);

--
-- Indexes for table `pass_resets`
--
ALTER TABLE `pass_resets`
  ADD PRIMARY KEY (`id_pass_reset`),
  ADD KEY `id_usuario` (`id_usuario`);

--
-- Indexes for table `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `ux_productos_nombre_empresa` (`empresa_id`,`nombre`),
  ADD KEY `categoria_id` (`categoria_id`),
  ADD KEY `subcategoria_id` (`subcategoria_id`),
  ADD KEY `fk_producto_zona` (`zona_id`),
  ADD KEY `empresa_id` (`empresa_id`);

--
-- Indexes for table `registro_accesos`
--
ALTER TABLE `registro_accesos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_usuario` (`id_usuario`);

--
-- Indexes for table `reportes_automatizados`
--
ALTER TABLE `reportes_automatizados`
  ADD PRIMARY KEY (`uuid`),
  ADD KEY `idx_empresa_proxima` (`id_empresa`,`proxima_ejecucion`);

--
-- Indexes for table `reportes_automatizados_runs`
--
ALTER TABLE `reportes_automatizados_runs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_automation_run` (`automation_uuid`,`empresa_id`,`run_at`),
  ADD KEY `idx_empresa_run` (`empresa_id`,`run_at`);

--
-- Indexes for table `reportes_historial`
--
ALTER TABLE `reportes_historial`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_reportes_historial_uuid` (`uuid`),
  ADD KEY `idx_reportes_historial_empresa_fecha` (`id_empresa`,`created_at`);

--
-- Indexes for table `solicitudes_cambios`
--
ALTER TABLE `solicitudes_cambios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_solicitudes_empresa` (`id_empresa`),
  ADD KEY `idx_solicitudes_estado` (`estado`);

--
-- Indexes for table `solicitudes_cambios_historial`
--
ALTER TABLE `solicitudes_cambios_historial`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_historial_empresa` (`id_empresa`),
  ADD KEY `idx_historial_estado` (`estado`);

--
-- Indexes for table `subcategorias`
--
ALTER TABLE `subcategorias`
  ADD PRIMARY KEY (`id`),
  ADD KEY `categoria_id` (`categoria_id`),
  ADD KEY `empresa_id` (`empresa_id`);

--
-- Indexes for table `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `correo` (`correo`);

--
-- Indexes for table `usuario_area_zona`
--
ALTER TABLE `usuario_area_zona`
  ADD KEY `fk_uaz_usuario` (`id_usuario`),
  ADD KEY `fk_uaz_area` (`id_area`),
  ADD KEY `fk_uaz_zona` (`id_zona`);

--
-- Indexes for table `usuario_empresa`
--
ALTER TABLE `usuario_empresa`
  ADD PRIMARY KEY (`id_usuario`,`id_empresa`),
  ADD KEY `id_empresa` (`id_empresa`);

--
-- Indexes for table `zonas`
--
ALTER TABLE `zonas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `area_id` (`area_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `areas`
--
ALTER TABLE `areas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT for table `busquedas_recientes_empresa`
--
ALTER TABLE `busquedas_recientes_empresa`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `categorias`
--
ALTER TABLE `categorias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT for table `empresa`
--
ALTER TABLE `empresa`
  MODIFY `id_empresa` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- AUTO_INCREMENT for table `historial_busquedas`
--
ALTER TABLE `historial_busquedas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `log_control`
--
ALTER TABLE `log_control`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=520;

--
-- AUTO_INCREMENT for table `movimientos`
--
ALTER TABLE `movimientos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=103;

--
-- AUTO_INCREMENT for table `notificaciones`
--
ALTER TABLE `notificaciones`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=305;

--
-- AUTO_INCREMENT for table `incidencias_infraestructura`
--
ALTER TABLE `incidencias_infraestructura`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pass_resets`
--
ALTER TABLE `pass_resets`
  MODIFY `id_pass_reset` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `productos`
--
ALTER TABLE `productos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=56;

--
-- AUTO_INCREMENT for table `registro_accesos`
--
ALTER TABLE `registro_accesos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=915;

--
-- AUTO_INCREMENT for table `reportes_automatizados_runs`
--
ALTER TABLE `reportes_automatizados_runs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `reportes_historial`
--
ALTER TABLE `reportes_historial`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `solicitudes_cambios`
--
ALTER TABLE `solicitudes_cambios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `solicitudes_cambios_historial`
--
ALTER TABLE `solicitudes_cambios_historial`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `subcategorias`
--
ALTER TABLE `subcategorias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT for table `usuario`
--
ALTER TABLE `usuario`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=140;

--
-- AUTO_INCREMENT for table `zonas`
--
ALTER TABLE `zonas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `busquedas_recientes_empresa`
--
ALTER TABLE `busquedas_recientes_empresa`
  ADD CONSTRAINT `fk_busquedas_recientes_empresa` FOREIGN KEY (`id_empresa`) REFERENCES `empresa` (`id_empresa`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `configuracion_empresa`
--
ALTER TABLE `configuracion_empresa`
  ADD CONSTRAINT `configuracion_empresa_ibfk_1` FOREIGN KEY (`id_empresa`) REFERENCES `empresa` (`id_empresa`);

--
-- Constraints for table `empresa`
--
ALTER TABLE `empresa`
  ADD CONSTRAINT `empresa_ibfk_1` FOREIGN KEY (`usuario_creador`) REFERENCES `usuario` (`id_usuario`);

--
-- Constraints for table `historial_busquedas`
--
ALTER TABLE `historial_busquedas`
  ADD CONSTRAINT `fk_historial_empresa` FOREIGN KEY (`id_empresa`) REFERENCES `empresa` (`id_empresa`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_historial_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE;

--
-- Constraints for table `log_control`
--
ALTER TABLE `log_control`
  ADD CONSTRAINT `log_control_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`);

--
-- Constraints for table `movimientos`
--
ALTER TABLE `movimientos`
  ADD CONSTRAINT `fk_mov_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`),
  ADD CONSTRAINT `fk_movimientos_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`),
  ADD CONSTRAINT `movimientos_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`);

--
-- Constraints for table `incidencias_infraestructura`
--
ALTER TABLE `incidencias_infraestructura`
  ADD CONSTRAINT `fk_incidencias_area` FOREIGN KEY (`area_id`) REFERENCES `areas` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_incidencias_empresa` FOREIGN KEY (`id_empresa`) REFERENCES `empresa` (`id_empresa`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_incidencias_usuario_reporta` FOREIGN KEY (`id_usuario_reporta`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_incidencias_usuario_revisa` FOREIGN KEY (`id_usuario_revisa`) REFERENCES `usuario` (`id_usuario`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_incidencias_zona` FOREIGN KEY (`zona_id`) REFERENCES `zonas` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `pass_resets`
--
ALTER TABLE `pass_resets`
  ADD CONSTRAINT `pass_resets_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`);

--
-- Constraints for table `productos`
--
ALTER TABLE `productos`
  ADD CONSTRAINT `fk_producto_zona` FOREIGN KEY (`zona_id`) REFERENCES `zonas` (`id`),
  ADD CONSTRAINT `productos_ibfk_1` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `productos_ibfk_2` FOREIGN KEY (`subcategoria_id`) REFERENCES `subcategorias` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `registro_accesos`
--
ALTER TABLE `registro_accesos`
  ADD CONSTRAINT `registro_accesos_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE;

--
-- Constraints for table `reportes_automatizados`
--
ALTER TABLE `reportes_automatizados`
  ADD CONSTRAINT `fk_reportes_automatizados_empresa` FOREIGN KEY (`id_empresa`) REFERENCES `empresa` (`id_empresa`) ON DELETE CASCADE;

--
-- Constraints for table `subcategorias`
--
ALTER TABLE `subcategorias`
  ADD CONSTRAINT `subcategorias_ibfk_1` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `usuario_area_zona`
--
ALTER TABLE `usuario_area_zona`
  ADD CONSTRAINT `fk_uaz_area` FOREIGN KEY (`id_area`) REFERENCES `areas` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_uaz_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_uaz_zona` FOREIGN KEY (`id_zona`) REFERENCES `zonas` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `usuario_empresa`
--
ALTER TABLE `usuario_empresa`
  ADD CONSTRAINT `usuario_empresa_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE,
  ADD CONSTRAINT `usuario_empresa_ibfk_2` FOREIGN KEY (`id_empresa`) REFERENCES `empresa` (`id_empresa`) ON DELETE CASCADE;

--
-- Constraints for table `zonas`
--
ALTER TABLE `zonas`
  ADD CONSTRAINT `zonas_ibfk_1` FOREIGN KEY (`area_id`) REFERENCES `areas` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
