<?php
header('Content-Type: application/json');

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

$servername = "localhost";
$db_user    = "u296155119_Admin";
$db_pass    = "4Dmin123o";
$database   = "u296155119_OptiStock";

function responder($success, $message = '', $extra = []) {
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $extra));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    responder(false, 'Método no permitido.');
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$rol = isset($input['rol']) ? trim($input['rol']) : '';
$idEmpresa = isset($input['id_empresa']) ? (int) $input['id_empresa'] : 0;
$permisosActivos = isset($input['permisos_activos']) && is_array($input['permisos_activos']) ? $input['permisos_activos'] : [];

if ($rol === '') {
    responder(false, 'El rol es obligatorio.');
}

if ($idEmpresa <= 0) {
    responder(false, 'Debes indicar la empresa a la que aplican los permisos.');
}

$permisosCatalogo = [
    'auth.login' => 'auth_login',
    'auth.logout' => 'auth_logout',
    'auth.password.reset' => 'auth_password_reset',
    'users.read' => 'users_read',
    'users.create' => 'users_create',
    'users.update' => 'users_update',
    'users.disable_enable' => 'users_disable_enable',
    'users.delete' => 'users_delete',
    'roles.assign' => 'roles_assign',
    'roles.permissions.configure' => 'roles_permissions_configure',
    'inventory.products.read' => 'inventory_products_read',
    'inventory.products.create' => 'inventory_products_create',
    'inventory.products.update' => 'inventory_products_update',
    'inventory.products.delete' => 'inventory_products_delete',
    'inventory.categories.read' => 'inventory_categories_read',
    'inventory.categories.create' => 'inventory_categories_create',
    'inventory.categories.update' => 'inventory_categories_update',
    'inventory.categories.delete' => 'inventory_categories_delete',
    'inventory.subcategories.read' => 'inventory_subcategories_read',
    'inventory.subcategories.create' => 'inventory_subcategories_create',
    'inventory.subcategories.update' => 'inventory_subcategories_update',
    'inventory.subcategories.delete' => 'inventory_subcategories_delete',
    'inventory.movements.quick_io' => 'inventory_movements_quick_io',
    'inventory.alerts.receive' => 'inventory_alerts_receive',
    'warehouse.areas.read' => 'warehouse_areas_read',
    'warehouse.areas.create' => 'warehouse_areas_create',
    'warehouse.areas.update' => 'warehouse_areas_update',
    'warehouse.areas.delete' => 'warehouse_areas_delete',
    'warehouse.zones.read' => 'warehouse_zones_read',
    'warehouse.zones.create' => 'warehouse_zones_create',
    'warehouse.zones.update' => 'warehouse_zones_update',
    'warehouse.zones.delete' => 'warehouse_zones_delete',
    'warehouse.assign.products_to_zone' => 'warehouse_assign_products_to_zone',
    'warehouse.alerts.receive' => 'warehouse_alerts_receive',
    'warehouse.incidents.record' => 'warehouse_incidents_record',
    'warehouse.incidents.alerts' => 'warehouse_incidents_alerts',
    'reports.generate' => 'reports_generate',
    'reports.export.pdf' => 'reports_export_pdf',
    'reports.export.xlsx' => 'reports_export_xlsx',
    'reports.schedule' => 'reports_schedule',
    'reports.notify' => 'reports_notify',
    'log.read' => 'log_read',
    'log.export' => 'log_export',
    'log.analytics.view' => 'log_analytics_view',
    'log.flag_records' => 'log_flag_records',
    'dashboard.view.metrics' => 'dashboard_view_metrics',
    'notifications.receive.critical' => 'notifications_receive_critical',
    'account.profile.read' => 'account_profile_read',
    'account.profile.update' => 'account_profile_update',
    'account.theme.configure' => 'account_theme_configure'
];

$permisosValidos = [];
foreach ($permisosActivos as $permiso) {
    if (!is_string($permiso)) {
        continue;
    }
    $permiso = trim($permiso);
    if ($permiso !== '' && isset($permisosCatalogo[$permiso])) {
        $permisosValidos[$permiso] = true;
    }
}

try {
    $conn = new mysqli($servername, $db_user, $db_pass, $database);
    $conn->set_charset('utf8mb4');
} catch (mysqli_sql_exception $e) {
    responder(false, 'No fue posible conectar con la base de datos.');
}

$columnas = array_values($permisosCatalogo);
$columnList = implode(', ', array_map(static function ($col) {
    return "`" . $col . "`";
}, $columnas));

$placeholders = implode(', ', array_fill(0, count($columnas), '?'));
$updates = implode(', ', array_map(static function ($col) {
    return "`{$col}` = VALUES(`{$col}`)";
}, $columnas));

$sql = "INSERT INTO roles_permisos (rol, id_empresa, $columnList) VALUES (?, ?, $placeholders)
        ON DUPLICATE KEY UPDATE $updates";

try {
    $stmt = $conn->prepare($sql);
} catch (mysqli_sql_exception $e) {
    responder(false, 'No fue posible preparar la consulta para guardar los permisos.');
}

$valores = [];
foreach ($permisosCatalogo as $clave => $columna) {
    $valores[] = isset($permisosValidos[$clave]) ? 1 : 0;
}

$tipos = 'si' . str_repeat('i', count($valores));
$parametros = array_merge([$rol, $idEmpresa], $valores);

try {
    $stmt->bind_param($tipos, ...$parametros);
    $stmt->execute();
    $stmt->close();
} catch (mysqli_sql_exception $e) {
    responder(false, 'No fue posible guardar la configuración de permisos.');
}

try {
    $consulta = $conn->prepare('SELECT UNIX_TIMESTAMP(updated_at) AS actualizado FROM roles_permisos WHERE rol = ? AND id_empresa = ? LIMIT 1');
    $consulta->bind_param('si', $rol, $idEmpresa);
    $consulta->execute();
    $resultado = $consulta->get_result();
    $fila = $resultado->fetch_assoc();
    $consulta->close();
    $marcaTiempo = isset($fila['actualizado']) ? ((int) $fila['actualizado']) * 1000 : round(microtime(true) * 1000);
} catch (mysqli_sql_exception $e) {
    $marcaTiempo = round(microtime(true) * 1000);
}

responder(true, 'Permisos guardados correctamente.', ['actualizado' => $marcaTiempo]);
