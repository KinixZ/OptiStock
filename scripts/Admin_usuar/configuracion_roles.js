(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const rolesListEl = document.getElementById('rolesList');
    const permissionsReferenceEl = document.getElementById('permissionsReference');
    const feedbackEl = document.getElementById('feedbackMessage');
    const rolesCountEl = document.getElementById('rolesCount');
    const lastUpdatedEl = document.getElementById('lastUpdated');

    const availablePermissions = [
      'Gestionar usuarios',
      'Configurar inventario',
      'Ver reportes analíticos',
      'Aprobar ajustes de stock',
      'Registrar entradas de almacén',
      'Generar órdenes de compra',
      'Monitorear indicadores',
      'Administrar catálogos de productos'
    ];

    const rolesData = [
      {
        id: 'administrador',
        name: 'Administrador',
        description: 'Acceso completo al sistema y capacidad de aprobar cambios críticos.',
        permissions: [
          'Gestionar usuarios',
          'Configurar inventario',
          'Ver reportes analíticos',
          'Aprobar ajustes de stock',
          'Monitorear indicadores'
        ]
      },
      {
        id: 'supervisor',
        name: 'Supervisor',
        description: 'Supervisa las operaciones diarias y autoriza tareas de alto impacto.',
        permissions: [
          'Configurar inventario',
          'Ver reportes analíticos',
          'Monitorear indicadores',
          'Registrar entradas de almacén'
        ]
      },
      {
        id: 'almacenista',
        name: 'Almacenista',
        description: 'Gestiona la recepción y salida de mercancías en el almacén.',
        permissions: [
          'Registrar entradas de almacén',
          'Administrar catálogos de productos'
        ]
      },
      {
        id: 'analista',
        name: 'Analista',
        description: 'Evalúa el desempeño y genera reportes de inventario y ventas.',
        permissions: ['Ver reportes analíticos', 'Monitorear indicadores']
      }
    ];

    let feedbackTimeout;

    renderPermissionReference();
    renderRoles();
    updateSummary();
    updateLastUpdated();

    function renderPermissionReference() {
      permissionsReferenceEl.innerHTML = '';
      availablePermissions.forEach((permission) => {
        const item = document.createElement('li');
        item.textContent = permission;
        permissionsReferenceEl.appendChild(item);
      });
    }

    function renderRoles() {
      rolesListEl.innerHTML = '';

      rolesData.forEach((role) => {
        const card = document.createElement('article');
        card.className = 'role-card';

        const header = document.createElement('div');
        header.className = 'role-header';

        const headerMain = document.createElement('div');
        headerMain.className = 'role-header-main';

        const title = document.createElement('h3');
        title.className = 'role-name';
        title.textContent = role.name;

        const description = document.createElement('p');
        description.className = 'role-description';
        description.textContent = role.description;

        const counter = document.createElement('span');
        counter.className = 'role-count';
        counter.textContent = formatPermissionCount(role.permissions.length);

        headerMain.append(title, description, counter);

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'role-toggle';
        toggle.setAttribute('aria-expanded', 'false');

        const toggleText = document.createElement('span');
        toggleText.textContent = 'Ver permisos';
        toggle.appendChild(toggleText);

        const body = document.createElement('div');
        body.className = 'role-body';
        body.hidden = true;
        const bodyId = `role-permissions-${role.id}`;
        body.id = bodyId;
        toggle.setAttribute('aria-controls', bodyId);

        toggle.addEventListener('click', () => {
          const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
          toggle.setAttribute('aria-expanded', String(!isExpanded));
          toggleText.textContent = isExpanded ? 'Ver permisos' : 'Ocultar permisos';
          body.hidden = isExpanded;
        });

        header.append(headerMain, toggle);

        const permissionsGrid = document.createElement('div');
        permissionsGrid.className = 'permissions-grid';

        availablePermissions.forEach((permission, index) => {
          const permissionId = `${role.id}-perm-${index}`;
          const wrapper = document.createElement('label');
          wrapper.className = 'permission-item';
          wrapper.setAttribute('for', permissionId);

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.id = permissionId;
          checkbox.value = permission;
          checkbox.checked = role.permissions.includes(permission);

          checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
              if (!role.permissions.includes(permission)) {
                role.permissions.push(permission);
              }
            } else {
              role.permissions = role.permissions.filter((perm) => perm !== permission);
            }

            counter.textContent = formatPermissionCount(role.permissions.length);
            markCardAsPending(card);
          });

          const labelText = document.createElement('span');
          labelText.className = 'permission-label';
          labelText.textContent = permission;

          wrapper.append(checkbox, labelText);
          permissionsGrid.appendChild(wrapper);
        });

        const actions = document.createElement('div');
        actions.className = 'role-actions';

        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.className = 'role-save';
        saveButton.textContent = 'Guardar cambios';
        saveButton.addEventListener('click', () => {
          card.classList.remove('role-card--dirty');
          showFeedback(`Los permisos del rol «${role.name}» se actualizaron correctamente.`);
          updateLastUpdated();
        });

        actions.appendChild(saveButton);

        body.append(permissionsGrid, actions);
        card.append(header, body);
        rolesListEl.appendChild(card);
      });
    }

    function markCardAsPending(card) {
      card.classList.add('role-card--dirty');
    }

    function showFeedback(message) {
      if (!feedbackEl) return;

      feedbackEl.textContent = message;
      feedbackEl.classList.remove('d-none');
      feedbackEl.classList.remove('alert-warning');
      feedbackEl.classList.add('alert-success');

      clearTimeout(feedbackTimeout);
      feedbackTimeout = window.setTimeout(() => {
        feedbackEl.classList.add('d-none');
      }, 4000);
    }

    function updateSummary() {
      if (rolesCountEl) {
        rolesCountEl.textContent = rolesData.length.toString();
      }
    }

    function updateLastUpdated(date = new Date()) {
      if (!lastUpdatedEl) return;

      const formatted = new Intl.DateTimeFormat('es-PE', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date);

      lastUpdatedEl.textContent = formatted;
    }

    function formatPermissionCount(count) {
      return count === 1 ? '1 permiso' : `${count} permisos`;
    }
  });
})();
