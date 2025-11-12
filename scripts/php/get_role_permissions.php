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

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$idEmpresa = null;
if (isset($input['id_empresa']) && $input['id_empresa'] !== '' && $input['id_empresa'] !== null) {
    $idEmpresa = (int) $input['id_empresa'];
    if ($idEmpresa <= 0) {
        responder(false, 'El identificador de empresa es inválido.');
    }
}

try {
    $conn = new mysqli($servername, $db_user, $db_pass, $database);
    $conn->set_charset('utf8mb4');
} catch (mysqli_sql_exception $e) {
    responder(false, 'No fue posible conectar con la base de datos.');
}

$permisosFijos = [
    'auth.login' => 'auth_login',
    'auth.logout' => 'auth_logout',
    'auth.password.reset' => 'auth_password_reset'
];

$permisosCatalogo = [
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

$columnasConsulta = array_merge(array_values($permisosFijos), array_values($permisosCatalogo));
$columnList = implode(', ', array_map(static function ($col) {
    return "`" . $col . "`";
}, $columnasConsulta));

$predeterminados = [];
$personalizados = [];
try {
    $sqlBase = "SELECT rol, id_empresa, $columnList, UNIX_TIMESTAMP(updated_at) AS actualizado FROM roles_permisos WHERE id_empresa IS NULL";
    $resultado = $conn->query($sqlBase);
    while ($fila = $resultado->fetch_assoc()) {
        $predeterminados[$fila['rol']] = $fila;
    }
    $resultado->close();

    if ($idEmpresa !== null) {
        $sqlEmpresa = "SELECT rol, id_empresa, $columnList, UNIX_TIMESTAMP(updated_at) AS actualizado FROM roles_permisos WHERE id_empresa = ?";
        $stmt = $conn->prepare($sqlEmpresa);
        $stmt->bind_param('i', $idEmpresa);
        $stmt->execute();
        $resEmpresa = $stmt->get_result();
        while ($fila = $resEmpresa->fetch_assoc()) {
            $personalizados[$fila['rol']] = $fila;
        }
        $stmt->close();
    }
} catch (mysqli_sql_exception $e) {
    responder(false, 'No fue posible consultar los permisos configurados.');
}

$clavesOriginales = array_keys($permisosCatalogo);

$formatear = static function (array $registros, string $origen) use ($permisosCatalogo, $clavesOriginales): array {
    $resultado = [];
    foreach ($registros as $rol => $fila) {
        $activos = [];
        foreach ($permisosCatalogo as $claveOriginal => $columna) {
            if (!array_key_exists($columna, $fila)) {
                continue;
            }
            $valor = (int) $fila[$columna];
            if ($valor === 1) {
                $activos[] = $claveOriginal;
            }
        }

        $resultado[$rol] = [
            'activos' => $activos,
            'conocidos' => $clavesOriginales,
            'actualizado' => isset($fila['actualizado']) ? ((int) $fila['actualizado']) * 1000 : null,
            'origen' => $origen
        ];
    }

    return $resultado;
};

$configPersonalizado = $formatear($personalizados, 'empresa');
$configPredeterminado = $formatear($predeterminados, 'default');
$catalogoPermisos = array_keys($permisosCatalogo);

responder(true, '', [
    'config' => $configPersonalizado,
    'defaults' => $configPredeterminado,
    'catalog' => $catalogoPermisos
]);
