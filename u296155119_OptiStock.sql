-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Sep 10, 2025 at 07:01 PM
-- Server version: 10.11.10-MariaDB-log
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
  `id_empresa` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `areas`
--

INSERT INTO `areas` (`id`, `nombre`, `descripcion`, `ancho`, `alto`, `largo`, `volumen`, `id_empresa`) VALUES
(21, 'area', 'mi area', 7.00, 2.50, 6.00, 105.00, 21),
(22, 'Area 1', 'Es el area 1', 5.00, 2.00, 2.00, 20.00, 24),
(23, 'Papeleria', 'ES una papeleria', 5.00, 2.00, 5.00, 50.00, 23),
(24, 'El patolicismo', 'Una religion de patos', 99999999.99, 99999999.99, 99999999.99, 9999999999999.99, 28),
(25, 'Papeleria', 'Descripcion', 8.00, 2.00, 5.00, 80.00, 24),
(26, 'otra area', 'area dos', 20.00, 4.00, 14.00, 1120.00, 21),
(28, 'Area1', 'area1', 20.00, 3.00, 30.00, 1800.00, 30);

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
(25, 'categoria', 'categoria', 21),
(27, 'Lapices', 'si', 23),
(28, 'Casco pastafarista', 'Un colador de espaguetis', 28),
(31, 'plastico', 'plasticos', 21),
(32, 'papel', 'papeles', 21),
(33, 'categoria 1', 'cat1', 24),
(34, 'papeles', 'tipos de papeles', 24);

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
(21, '#ff6b6b', '#2b7a78', '[\"inicio\",\"area_almac_v2\\/gestion_areas_zonas.html\",\"gest_inve\\/inventario_basico.html\",\"admin_usuar\\/administracion_usuarios.html\",\"reports\\/reportes.html\",\"control_log\\/log.html\",\"account_suscrip\\/account_suscrip.html\"]', '2025-09-10 16:05:31'),
(22, '#ff6b6b', '#2b7a78', '[\"area_almac_v2\\/gestion_areas_zonas.html\",\"gest_inve\\/inventario_basico.html\",\"account_suscrip\\/account_suscrip.html\",\"inicio\",\"admin_usuar\\/administracion_usuarios.html\",\"reports\\/reportes.html\",\"control_log\\/log.html\"]', '2025-08-30 02:10:16'),
(23, '#8e44ad', '#2980b9', '[\"inicio\",\"area_almac_v2\\/gestion_areas_zonas.html\",\"gest_inve\\/inventario_basico.html\",\"admin_usuar\\/administracion_usuarios.html\",\"reports\\/reportes.html\",\"control_log\\/log.html\",\"account_suscrip\\/account_suscrip.html\"]', '2025-08-04 13:47:24'),
(24, '#454b52', '#ffa41b', '[\"area_almac_v2\\/gestion_areas_zonas.html\",\"gest_inve\\/inventario_basico.html\",\"inicio\",\"admin_usuar\\/administracion_usuarios.html\",\"reports\\/reportes.html\",\"control_log\\/log.html\",\"account_suscrip\\/account_suscrip.html\"]', '2025-09-10 16:06:02'),
(30, '#ffa41b', '#6c63ff', '[\"inicio\",\"area_almac_v2\\/gestion_areas_zonas.html\",\"gest_inve\\/inventario_basico.html\",\"admin_usuar\\/administracion_usuarios.html\",\"reports\\/reportes.html\",\"control_log\\/log.html\",\"account_suscrip\\/account_suscrip.html\"]', '2025-09-03 16:23:06'),
(31, '#0e9aa7', '#454b52', '[\"inicio\",\"area_almac_v2\\/gestion_areas_zonas.html\",\"gest_inve\\/inventario_basico.html\",\"admin_usuar\\/administracion_usuarios.html\",\"reports\\/reportes.html\",\"control_log\\/log.html\",\"account_suscrip\\/account_suscrip.html\"]', '2025-09-05 00:29:06'),
(32, '#6c63ff', '#ff66c4', '[\"inicio\",\"area_almac_v2\\/gestion_areas_zonas.html\",\"gest_inve\\/inventario_basico.html\",\"admin_usuar\\/administracion_usuarios.html\",\"reports\\/reportes.html\",\"control_log\\/log.html\",\"account_suscrip\\/account_suscrip.html\"]', '2025-09-10 16:12:51');

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
  `fecha_registro` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `empresa`
--

INSERT INTO `empresa` (`id_empresa`, `nombre_empresa`, `logo_empresa`, `sector_empresa`, `usuario_creador`, `fecha_registro`) VALUES
(21, 'Discocks', '/images/logos/logo_21_1755907312.png', 'Comercial', 57, '2025-06-26 19:29:13'),
(22, 'empresa', NULL, 'Industrial', 58, '2025-07-01 01:31:07'),
(23, 'afwfqf', NULL, 'Industrial', 33, '2025-07-01 01:45:04'),
(24, 'EL KINI CORP', '/images/logos/logo_24_1757520273.jpeg', 'Industrial', 60, '2025-07-01 01:45:36'),
(25, 'elkini', NULL, 'Industrial', 56, '2025-07-01 13:17:34'),
(26, 'Salchichas pepe', NULL, 'Comercial', 83, '2025-07-01 14:28:13'),
(27, 'ROMO\'S', NULL, '', 91, '2025-08-02 14:54:20'),
(28, 'Papamovil.net', NULL, '', 93, '2025-08-04 17:06:27'),
(29, 'Optistock', NULL, 'Servicios', 97, '2025-08-08 04:18:41'),
(30, 'KInicorp', '/images/logos/logo_1756916306.jpg', 'Servicios', 101, '2025-09-03 16:18:26'),
(31, 'Discos de Vinilo y CD', NULL, 'Comercial', 102, '2025-09-05 00:27:10'),
(32, 'Empresa.exe', NULL, '', 113, '2025-09-10 16:12:08');

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
(4, 113, 'Usuarios', 'Registro de usuario: lumminary2@gmail.com', '2025-09-10', '16:08:45');

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
(36, 'Lapiz Sharpie', 'SI', 27, 27, 10, 10.00, 2, 2, 1, NULL, 23, 18, '2025-08-04 13:46:16', NULL),
(37, 'Una piedra', '', 28, NULL, 19, 1.30, 0, 0, 0, NULL, 28, 19, '2025-08-04 17:13:27', NULL),
(41, 'plato unicel', '', 31, NULL, 6, 50.00, 2, 2, 2, 'images/qr/41.png', 21, 20, '2025-08-19 23:29:57', NULL),
(43, 'papel a4 marca J', 'Es papel de la marca J de tamaño a4', 34, 36, 990, 400.00, 4, 4, 4, 'images/qr/43.png', 24, 17, '2025-09-03 19:09:02', NULL),
(44, 'si', 'si', 34, NULL, 0, 100.00, 0, 0, 0, 'images/qr/44.png', 24, 17, '2025-09-10 16:01:47', NULL);

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
(116, 113, 'Cierre', '2025-09-10 16:13:18');

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
(24, 25, 'subcategoria', 'subcategoria', 21),
(27, 27, 'Puntillas', 'Lapices de puntillas', 23),
(28, 28, 'Madera de cedro verde', '', 28),
(31, 31, 'botellas', '', 21),
(32, 31, 'vasos', '', 21),
(33, 31, 'tapas', '', 21),
(34, 33, 'sub1', 'cositas', 24),
(35, 34, 'papel a4', 'tamaño a4', 24),
(36, 34, 'papel a4', 'tamaño a4', 24);

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
  `foto_perfil` varchar(255) DEFAULT 'images/profile.jpg'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `usuario`
--

INSERT INTO `usuario` (`id_usuario`, `nombre`, `apellido`, `fecha_nacimiento`, `telefono`, `correo`, `contrasena`, `rol`, `fecha_registro`, `verificacion_cuenta`, `suscripcion`, `intentos_fallidos`, `ultimo_intento`, `foto_perfil`) VALUES
(33, 'Ivan Eduardo', 'Garcia Verduzco', '2005-05-15', '3315634572', 'ivangmgm1290@gmail.com', '31bbc4cb70043dcb8cca35cb837832c419a4caa6', 'Administrador', '2025-04-07 14:32:50', 1, 0, 5, '2025-09-03 13:09:51', 'images/profile.jpg'),
(56, 'kay', 'ro', '2025-12-22', '123456', 'a21100285@ceti.mx', '64b6c7a5060af5e67425be0ca23b3a9df4524d5e', 'Administrador', '2025-04-08 13:46:31', 1, 0, 0, NULL, 'images/profile.jpg'),
(57, 'Emiliano', 'Sanchez Flores', '2005-03-30', '6731350698', 'a21100316@ceti.mx', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Administrador', '2025-04-17 02:28:49', 1, 0, 0, NULL, 'images/profiles/perfil_57_1755646866.jpeg'),
(58, 'Emiliano', 'Sanchez Flores', '2005-03-30', '6731350698', 'tareasdeemi@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Administrador', '2025-04-18 05:39:32', 1, 0, 0, NULL, 'images/profiles/perfil_58_1756914842.jpg'),
(59, 'Esteban Israel', 'Caballero Velázquez', '2006-08-03', '3323859470', 'a21300617@ceti.mx', '851f50aaf59b40156423094ad134cbd4272f399a', 'Administrador', '2025-05-21 12:53:38', 1, 0, 0, NULL, 'images/profile.jpg'),
(60, 'Ivan Eduardo ', 'Garcia Verduzco', '2005-06-15', '3315634573', 'ie.garcia.ve@gmail.com', 'ba46035ced600481626596823e153ceb433fd886', 'Administrador', '2025-06-23 02:23:08', 1, 0, 0, NULL, 'images/profiles/perfil_60_1755183384.jpg'),
(61, 'kini', 'a', '2000-03-12', '331342411', '1234567U@gmail.com', 'fede6a5f0852a4d0d1f56ee296b85a9c227b13bd', 'Administrador', '2025-06-24 14:02:28', 0, 0, 0, NULL, 'images/profile.jpg'),
(62, 'kini', 'a', '2000-03-12', '331342411', 'grasomister642@gmail.com', 'fede6a5f0852a4d0d1f56ee296b85a9c227b13bd', 'Administrador', '2025-06-24 14:03:43', 1, 0, 0, NULL, 'images/profile.jpg'),
(75, 'el pepe', 'Ete sech', '2004-04-12', '1234567890', 'elpepeetesech@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Etiquetador', '2025-07-01 01:32:25', 1, 0, 0, NULL, 'images/profile.jpg'),
(80, 'juan', 'garcia', '2005-06-15', '3351431241242', 'juangarcia@gmail.com', 'ed44bb6085905e93ed20c701fb11a6d58a6c82f0', 'Almacenista', '2025-07-01 14:11:40', 1, 0, 0, NULL, 'images/profile.jpg'),
(81, 'emiliano', 'perez', '1999-09-12', '1414213412', 'emiliano123@gmail.com', 'fede6a5f0852a4d0d1f56ee296b85a9c227b13bd', 'Almacenista', '2025-07-01 14:12:31', 1, 0, 0, NULL, 'images/profile.jpg'),
(83, 'jose', 'vasconcelos', '2005-09-15', '331241412', 'imchatgpt5@gmail.com', 'fede6a5f0852a4d0d1f56ee296b85a9c227b13bd', 'Etiquetador', '2025-07-01 14:25:58', 1, 0, 4, '2025-07-01 14:31:25', 'images/profile.jpg'),
(85, 'elber', 'gadura', '2001-01-10', '6731350698', 'elbergalarza313@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Etiquetador', '2025-07-05 19:00:25', 1, 0, 0, NULL, 'images/profile.jpg'),
(91, 'Papu', 'Josh', '2005-08-07', '3326995066', 'a25110130@ceti.mx', 'a56694c6940386029bc5c36f63f8d64bbe018e90', 'Etiquetador', '2025-08-01 18:41:04', 1, 0, 0, NULL, 'images/profile.jpg'),
(92, 'Uusario 1', 'user', '2005-06-15', '3315634512', 'correoprueba@gmail.com', '41137b4535ac2e5d1b81a9f6a1eca42ddce92916', 'Supervisor', '2025-08-01 23:26:30', 1, 0, 0, NULL, 'images/profile.jpg'),
(93, 'Erick', 'Olguín', '2005-08-05', '3322201713', 'a19300083@ceti.mx', '6241388bba3e129f606bd7e9baeb8c4f76494272', 'Etiquetador', '2025-08-04 17:00:37', 1, 0, 0, NULL, 'images/profile.jpg'),
(96, 'Erick', 'Olguín', '2025-08-04', '3322201713', 'erizo.gamer.781@gmail.com', '1094724d221af7856d7ccee086f1f463885ad572', 'Etiquetador', '2025-08-04 17:03:39', 1, 0, 0, NULL, 'images/profile.jpg'),
(97, 'Vamos', 'Apasar', '2002-08-07', '12345678', 'optistockproject@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Administrador', '2025-08-08 04:17:00', 1, 0, 0, NULL, 'images/profile.jpg'),
(101, 'Ivan Eduardo', 'Garcia Verduzcoo', '2000-01-02', '3315634573', 'juanitoalcachofaro@gmail.com', 'e591c90145d5a1451f8a270e491f5cc1cb6eb43e', 'Administrador', '2025-09-03 16:17:21', 1, 0, 0, NULL, 'images/profile.jpg'),
(102, 'Menga', 'Nito', '2005-03-30', '6731350698', 'disksvinylcdymas@gmail.com', '62d027e4de8205d9da29815b99ea7172e1b42301', 'Administrador', '2025-09-05 00:25:47', 1, 0, 0, NULL, 'images/profile.jpg'),
(104, 'Samuel', 'Etoo', '1996-07-19', '3325278895', 'samuelito@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Almacenista', '2025-09-05 00:32:26', 1, 0, 0, NULL, 'images/almacenista.jpg'),
(105, 'Lionel Andres', 'Messi Cuccittini', '1988-04-02', '928749681', 'lionel.messi@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Etiquetador', '2025-09-05 00:33:49', 1, 0, 0, NULL, 'images/etiquetador.jpg'),
(106, 'Cristiano', 'Ronaldo', '1978-11-05', '77642969', 'cr7@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Supervisor', '2025-09-05 00:35:47', 1, 0, 0, NULL, 'images/supervisor.jpg'),
(107, 'Lamine', 'Tamal', '1994-11-12', '1234567890', 'laminetamal@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Mantenimiento', '2025-09-05 00:36:36', 1, 0, 0, NULL, 'images/mantenimiento.jpg'),
(110, 'Carmen Alicia', 'Flores Inzunza', '2004-03-03', '3321099971', 'carmen.alicia@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Mantenimiento', '2025-09-09 00:14:22', 1, 0, 0, NULL, 'images/mantenimiento.jpg'),
(111, 'hector', 'sanchez lung', '1997-12-21', '12345678', 'hector.lung@gmail.com', '7247638c49b86e6b7fdab59a696f7e90a0363bbc', 'Almacenista', '2025-09-09 01:54:52', 1, 0, 0, NULL, 'images/almacenista.jpg'),
(112, 'juanito', 'garcia', '2000-01-04', '3399988221', 'vipoca7841@certve.com', '3414039fe8ebbb0bc6db4ff54d0ca57016732635', 'Supervisor', '2025-09-10 15:55:38', 1, 0, 0, NULL, 'images/supervisor.jpg'),
(113, 'Fulanito', 'Menganito', '2005-03-30', '3321099971', 'lumminary2@gmail.com', 'ae53da110e755b430ee6285a1ad0b41138b956d0', 'Administrador', '2025-09-10 16:08:45', 1, 0, 0, NULL, 'images/profile.jpg');

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
(75, 22),
(80, 25),
(81, 25),
(92, 23),
(104, 31),
(105, 31),
(106, 31),
(107, 31),
(110, 21),
(111, 21),
(112, 24);

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
  `tipo_almacenamiento` varchar(50) DEFAULT NULL,
  `subniveles` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`subniveles`)),
  `area_id` int(11) DEFAULT NULL,
  `id_empresa` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `zonas`
--

INSERT INTO `zonas` (`id`, `nombre`, `descripcion`, `ancho`, `alto`, `largo`, `volumen`, `tipo_almacenamiento`, `subniveles`, `area_id`, `id_empresa`) VALUES
(16, 'zona', 'mi zona', 3.00, 2.00, 1.00, 6.00, 'rack', '[]', 21, 21),
(17, 'Zona 1', 'es la zona 1', 2.00, 2.00, 2.00, 8.00, 'gabinete', '[]', 22, 24),
(18, 'Mostrador', 'SI', 2.00, 1.00, 2.00, 4.00, 'vitrina', '[]', 23, 23),
(19, 'Iglesia Patólica', 'Una iglesia a nuestro señor y salvador emplumado', 0.00, 1.00, 0.00, 0.00, 'jaula', '[]', 24, 28),
(20, 'rack A', 'rack para cosas pesadas', 1.50, 3.00, 5.00, 22.50, 'rack', '[]', 26, 21),
(21, 'rack B', 'otro rack', 1.50, 3.00, 5.00, 22.50, 'rack', '[]', 26, 21),
(22, 'rack C', 'otro rack', 1.50, 3.00, 5.00, 22.50, 'rack', '[]', 26, 21),
(23, 'Zona1', 'zona1', 2.00, 1.00, 2.00, 4.00, 'cajón', '[]', 28, 30);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `areas`
--
ALTER TABLE `areas`
  ADD PRIMARY KEY (`id`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `categorias`
--
ALTER TABLE `categorias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT for table `empresa`
--
ALTER TABLE `empresa`
  MODIFY `id_empresa` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `log_control`
--
ALTER TABLE `log_control`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `movimientos`
--
ALTER TABLE `movimientos`
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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- AUTO_INCREMENT for table `registro_accesos`
--
ALTER TABLE `registro_accesos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=117;

--
-- AUTO_INCREMENT for table `subcategorias`
--
ALTER TABLE `subcategorias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=37;

--
-- AUTO_INCREMENT for table `usuario`
--
ALTER TABLE `usuario`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=114;

--
-- AUTO_INCREMENT for table `zonas`
--
ALTER TABLE `zonas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- Constraints for dumped tables
--

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
-- Constraints for table `subcategorias`
--
ALTER TABLE `subcategorias`
  ADD CONSTRAINT `subcategorias_ibfk_1` FOREIGN KEY (`categoria_id`) REFERENCES `categorias` (`id`) ON DELETE SET NULL;

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
