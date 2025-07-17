function initAreasZonas() {
    // Elementos principales
    const warehouseMap = document.getElementById('warehouseMap');
    const newAreaBtn = document.getElementById('newAreaBtn');
    const newZoneBtn = document.getElementById('newZoneBtn');
    
    // Variables de estado
    let currentTool = null;
    let isDrawing = false;
    let currentArea = null;
    let zones = [];
    
    // Inicialización del mapa
    function initWarehouseMap() {
        console.log('Mapa del almacén inicializado');
        createDefaultArea();
        
        // Event listeners para herramientas
        document.querySelectorAll('.map-tool').forEach(tool => {
            tool.addEventListener('click', function() {
                document.querySelectorAll('.map-tool').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                currentTool = this.id.replace('Tool', '');
                console.log('Herramienta seleccionada:', currentTool);
            });
        });
        
        // Eventos del mapa (dibujo, selección, etc.)
        warehouseMap.addEventListener('mousedown', startDrawing);
        warehouseMap.addEventListener('mousemove', draw);
        warehouseMap.addEventListener('mouseup', endDrawing);
    }
    
    function createDefaultArea() {
        const empresaNombre = localStorage.getItem('empresa_nombre') || 'Mi Almacén';
        currentArea = {
            id: 'area-' + Date.now(),
            name: empresaNombre,
            lines: [],
            zones: []
        };
        updateUI();
    }
    
    // Funciones de dibujo
    function startDrawing(e) {
        if (!currentTool) return;
        isDrawing = true;
        // Lógica para iniciar el dibujo según la herramienta seleccionada
    }
    
    function draw(e) {
        if (!isDrawing) return;
        // Lógica para dibujar según la herramienta seleccionada
    }
    
    function endDrawing() {
        isDrawing = false;
        // Finalizar el dibujo
    }
    
    // Formularios
    function showAreaForm() {
        // Usar tu sistema de modales existente
        const modalContent = `
            <div class="modal-form">
                <h3><i class="fas fa-map-marked-alt"></i> Nueva Área</h3>
                <div class="form-group">
                    <label>Nombre del Área</label>
                    <input type="text" id="areaName" value="${currentArea.name}">
                </div>
                <div class="form-actions">
                    <button class="btn btn-primary" id="saveArea">Guardar</button>
                    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                </div>
            </div>
        `;
        
        showModal('Nueva Área', modalContent);
        
        document.getElementById('saveArea')?.addEventListener('click', function() {
            const newName = document.getElementById('areaName').value;
            if (newName) {
                currentArea.name = newName;
                updateUI();
                closeModal();
            }
        });
    }
    
    function showZoneForm() {
        if (!currentArea) {
            showAlert('Primero debe crear o seleccionar un área');
            return;
        }
        
        const modalContent = `
            <div class="modal-form">
                <h3><i class="fas fa-layer-group"></i> Nueva Zona</h3>
                <div class="form-group">
                    <label>Nombre de la Zona</label>
                    <input type="text" id="zoneName" placeholder="Ej: Estantería A, Rack de Electrónicos">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Ancho (m)</label>
                        <input type="number" id="zoneWidth" min="0.1" step="0.1" value="1.0">
                    </div>
                    <div class="form-group">
                        <label>Alto (m)</label>
                        <input type="number" id="zoneHeight" min="0.1" step="0.1" value="1.0">
                    </div>
                    <div class="form-group">
                        <label>Largo (m)</label>
                        <input type="number" id="zoneLength" min="0.1" step="0.1" value="1.0">
                    </div>
                </div>
                <div class="form-actions">
                    <button class="btn btn-primary" id="saveZone">Guardar</button>
                    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                </div>
            </div>
        `;
        
        showModal('Nueva Zona', modalContent);
        
        document.getElementById('saveZone')?.addEventListener('click', function() {
            const zoneData = {
                name: document.getElementById('zoneName').value,
                width: parseFloat(document.getElementById('zoneWidth').value),
                height: parseFloat(document.getElementById('zoneHeight').value),
                length: parseFloat(document.getElementById('zoneLength').value),
                type: 'estantería' // Por defecto
            };
            
            if (validateZone(zoneData)) {
                zones.push({
                    ...zoneData,
                    id: 'zone-' + Date.now(),
                    areaId: currentArea.id
                });
                updateUI();
                closeModal();
            }
        });
    }
    
    function validateZone(zone) {
        if (!zone.name) {
            showAlert('El nombre de la zona es requerido');
            return false;
        }
        if (zone.width <= 0 || zone.height <= 0 || zone.length <= 0) {
            showAlert('Las dimensiones deben ser valores positivos');
            return false;
        }
        return true;
    }
    
    function updateUI() {
        document.querySelector('.warehouse-title').textContent = `Área: ${currentArea.name}`;
        renderZonesList();
    }
    
    function renderZonesList() {
        const zonesListContainer = document.querySelector('.zones-list');
        if (!zonesListContainer) return;
        
        if (zones.length === 0) {
            zonesListContainer.innerHTML = `
                <div class="zones-list-header">
                    <h3 class="zones-list-title"><i class="fas fa-layer-group"></i> Zonas del Almacén</h3>
                </div>
                <div class="empty-state">
                    <i class="fas fa-info-circle"></i>
                    <p>No hay zonas registradas en esta área</p>
                </div>
            `;
            return;
        }
        
        let zonesHTML = `
            <div class="zones-list-header">
                <h3 class="zones-list-title"><i class="fas fa-layer-group"></i> Zonas del Almacén</h3>
                <div class="card-actions">
                    <button class="card-action-btn"><i class="fas fa-sync-alt"></i></button>
                    <button class="card-action-btn"><i class="fas fa-filter"></i></button>
                </div>
            </div>
            <div class="zones-table">
                <table>
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Dimensiones</th>
                            <th>Tipo</th>
                            <th>Capacidad</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        zones.forEach(zone => {
            zonesHTML += `
                <tr>
                    <td>${zone.name}</td>
                    <td>${zone.width}m × ${zone.height}m × ${zone.length}m</td>
                    <td>${zone.type}</td>
                    <td><span class="capacity-indicator capacity-high"></span> 100%</td>
                    <td>
                        <button class="btn-icon edit-zone" data-id="${zone.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete-zone" data-id="${zone.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        zonesHTML += `
                    </tbody>
                </table>
            </div>
        `;
        
        zonesListContainer.innerHTML = zonesHTML;
        
        // Event listeners para botones de acción
        document.querySelectorAll('.edit-zone').forEach(btn => {
            btn.addEventListener('click', function() {
                const zoneId = this.getAttribute('data-id');
                editZone(zoneId);
            });
        });
        
        document.querySelectorAll('.delete-zone').forEach(btn => {
            btn.addEventListener('click', function() {
                const zoneId = this.getAttribute('data-id');
                confirmDeleteZone(zoneId);
            });
        });
    }
    
    function editZone(zoneId) {
        const zone = zones.find(z => z.id === zoneId);
        if (!zone) return;
        
        const modalContent = `
            <div class="modal-form">
                <h3><i class="fas fa-edit"></i> Editar Zona</h3>
                <div class="form-group">
                    <label>Nombre de la Zona</label>
                    <input type="text" id="editZoneName" value="${zone.name}">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Ancho (m)</label>
                        <input type="number" id="editZoneWidth" min="0.1" step="0.1" value="${zone.width}">
                    </div>
                    <div class="form-group">
                        <label>Alto (m)</label>
                        <input type="number" id="editZoneHeight" min="0.1" step="0.1" value="${zone.height}">
                    </div>
                    <div class="form-group">
                        <label>Largo (m)</label>
                        <input type="number" id="editZoneLength" min="0.1" step="0.1" value="${zone.length}">
                    </div>
                </div>
                <div class="form-actions">
                    <button class="btn btn-primary" id="updateZone">Actualizar</button>
                    <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                </div>
            </div>
        `;
        
        showModal('Editar Zona', modalContent);
        
        document.getElementById('updateZone')?.addEventListener('click', function() {
            const updatedData = {
                name: document.getElementById('editZoneName').value,
                width: parseFloat(document.getElementById('editZoneWidth').value),
                height: parseFloat(document.getElementById('editZoneHeight').value),
                length: parseFloat(document.getElementById('editZoneLength').value)
            };
            
            if (validateZone(updatedData)) {
                Object.assign(zone, updatedData);
                updateUI();
                closeModal();
            }
        });
    }
    
    function confirmDeleteZone(zoneId) {
        showConfirm(
            'Eliminar Zona',
            '¿Estás seguro de que deseas eliminar esta zona? Esta acción no se puede deshacer.',
            function() {
                zones = zones.filter(z => z.id !== zoneId);
                updateUI();
                showAlert('Zona eliminada correctamente', 'success');
            }
        );
    }
    
    // Inicializar
    newAreaBtn?.addEventListener('click', showAreaForm);
    newZoneBtn?.addEventListener('click', showZoneForm);
    
    initWarehouseMap();
}

// Función para mostrar alertas (usando tu sistema existente)
function showAlert(message, type = 'error') {
    // Implementar usando tu sistema de notificaciones
    alert(message); // Temporal
}

// Función para mostrar modales (integrada con tu sistema)
function showModal(title, content) {
    // Implementar usando tu sistema de modales
    const modal = document.createElement('div');
    modal.className = 'custom-modal';
    modal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <h3>${title}</h3>
                ${content}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeModal() {
    const modal = document.querySelector('.custom-modal');
    if (modal) modal.remove();
}

// Función para confirmaciones
function showConfirm(title, message, confirmCallback) {
    const modalContent = `
        <div class="modal-form">
            <h3><i class="fas fa-exclamation-triangle"></i> ${title}</h3>
            <p>${message}</p>
            <div class="form-actions">
                <button class="btn btn-danger" id="confirmAction">Confirmar</button>
                <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            </div>
        </div>
    `;
    
    showModal(title, modalContent);
    
    document.getElementById('confirmAction')?.addEventListener('click', function() {
        confirmCallback();
        closeModal();
    });
}