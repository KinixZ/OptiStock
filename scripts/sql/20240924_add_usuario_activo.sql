-- Agrega la columna `activo` para controlar el acceso a las cuentas de usuario.
ALTER TABLE usuario
  ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1 AFTER foto_perfil;
