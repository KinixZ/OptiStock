(function () {
  const STYLE_ID = 'simple-table-sorter-style';

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) {
      return;
    }
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      table[data-sortable="true"] th.table-sorter__header {
        cursor: pointer;
        user-select: none;
        position: relative;
      }
      table[data-sortable="true"] th.table-sorter__header::after {
        content: '\u2195';
        opacity: 0.35;
        font-size: 0.75em;
        margin-left: 0.35rem;
        transition: opacity 0.2s ease;
      }
      table[data-sortable="true"] th.table-sorter__header[data-sort-state="asc"]::after {
        content: '\u25B4';
        opacity: 0.9;
      }
      table[data-sortable="true"] th.table-sorter__header[data-sort-state="desc"]::after {
        content: '\u25BE';
        opacity: 0.9;
      }
      table[data-sortable="true"] th.table-sorter__header:focus-visible {
        outline: 2px solid var(--accent-color, #4f46e5);
        outline-offset: 2px;
      }
    `;
    document.head.appendChild(style);
  }

  function normalizeString(value) {
    return (value ?? '').toString().trim();
  }

  function extractSortValue(cell) {
    if (!cell) return '';
    const datasetValue = cell.getAttribute('data-sort-value');
    if (datasetValue !== null) {
      return datasetValue;
    }
    return normalizeString(cell.textContent);
  }

  function toNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (value === null || value === undefined) {
      return NaN;
    }
    if (typeof value === 'string') {
      let normalized = value.trim();
      if (!normalized) {
        return NaN;
      }
      if (normalized.includes('|')) {
        const [primary] = normalized.split('|');
        return toNumber(primary);
      }
      normalized = normalized.replace(/%/g, '');
      normalized = normalized.replace(/[^0-9,\.\-]/g, '');
      if (!normalized) {
        return NaN;
      }
      const hasComma = normalized.includes(',');
      const hasDot = normalized.includes('.');
      if (hasComma && !hasDot) {
        normalized = normalized.replace(',', '.');
      } else if (hasComma && hasDot) {
        normalized = normalized.replace(/,/g, '');
      }
      const parsed = Number.parseFloat(normalized);
      return Number.isFinite(parsed) ? parsed : NaN;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  function detectColumnType(table, columnIndex) {
    const bodies = Array.from(table.tBodies || []);
    for (const tbody of bodies) {
      const rows = Array.from(tbody.rows || []);
      for (const row of rows) {
        if (row.classList.contains('empty-row')) {
          continue;
        }
        const cell = row.cells[columnIndex];
        if (!cell) {
          continue;
        }
        const raw = extractSortValue(cell);
        if (!raw) {
          continue;
        }
        const numeric = toNumber(raw);
        if (!Number.isNaN(numeric)) {
          return 'number';
        }
        return 'string';
      }
    }
    return 'string';
  }

  function compareValues(a, b, type, direction) {
    if (type === 'number') {
      const numA = toNumber(a);
      const numB = toNumber(b);
      if (Number.isNaN(numA) && Number.isNaN(numB)) return 0;
      if (Number.isNaN(numA)) return direction === 'asc' ? 1 : -1;
      if (Number.isNaN(numB)) return direction === 'asc' ? -1 : 1;
      return direction === 'asc' ? numA - numB : numB - numA;
    }

    const strA = normalizeString(a).toLocaleString('es-ES');
    const strB = normalizeString(b).toLocaleString('es-ES');
    const result = strA.localeCompare(strB, 'es', { sensitivity: 'accent', numeric: true });
    return direction === 'asc' ? result : -result;
  }

  function getHeaderCells(table) {
    if (!table.tHead) return [];
    const rows = Array.from(table.tHead.rows || []);
    if (!rows.length) return [];
    return Array.from(rows[rows.length - 1].cells || []);
  }

  function updateHeaderState(headers, activeIndex, direction) {
    headers.forEach((th, index) => {
      if (index === activeIndex) {
        th.dataset.sortState = direction;
        th.setAttribute('aria-sort', direction === 'asc' ? 'ascending' : 'descending');
      } else {
        th.removeAttribute('data-sort-state');
        th.removeAttribute('aria-sort');
      }
    });
  }

  function sortTable(table, columnIndex, direction, rememberState = true) {
    const headers = getHeaderCells(table);
    if (!headers.length || columnIndex < 0 || columnIndex >= headers.length) {
      return;
    }

    const type = detectColumnType(table, columnIndex);
    const bodies = Array.from(table.tBodies || []);

    bodies.forEach(tbody => {
      const rows = Array.from(tbody.rows || []);
      const sortableRows = rows.filter(row => !row.dataset.sortFixed);
      const staticRows = rows.filter(row => row.dataset.sortFixed);

      sortableRows.sort((rowA, rowB) => {
        const cellA = rowA.cells[columnIndex];
        const cellB = rowB.cells[columnIndex];
        const valueA = extractSortValue(cellA);
        const valueB = extractSortValue(cellB);
        return compareValues(valueA, valueB, type, direction);
      });

      const fragment = document.createDocumentFragment();
      sortableRows.forEach(row => fragment.appendChild(row));
      staticRows.forEach(row => fragment.appendChild(row));
      tbody.appendChild(fragment);
    });

    updateHeaderState(headers, columnIndex, direction);

    if (rememberState) {
      table.dataset.sortColumn = String(columnIndex);
      table.dataset.sortDirection = direction;
    }
  }

  function toggleSort(table, columnIndex) {
    const currentColumn = table.dataset.sortColumn ? Number(table.dataset.sortColumn) : null;
    const currentDirection = table.dataset.sortDirection || 'asc';
    const newDirection = currentColumn === columnIndex && currentDirection === 'asc' ? 'desc' : 'asc';
    sortTable(table, columnIndex, newDirection, true);
  }

  function attachListeners(table) {
    const headers = getHeaderCells(table);
    headers.forEach((th, index) => {
      if (th.dataset.sortable === 'false') {
        th.classList.remove('table-sorter__header');
        return;
      }
      th.classList.add('table-sorter__header');
      if (th.dataset.sortListenerAttached === 'true') {
        return;
      }
      th.dataset.sortListenerAttached = 'true';
      th.tabIndex = th.tabIndex || 0;
      th.addEventListener('click', () => toggleSort(table, index));
      th.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleSort(table, index);
        }
      });
    });
  }

  function enhance(table) {
    if (!(table instanceof HTMLTableElement)) {
      return;
    }
    ensureStyles();
    table.setAttribute('data-sortable', table.getAttribute('data-sortable') || 'true');
    attachListeners(table);
  }

  function applyCurrentSort(table) {
    if (!(table instanceof HTMLTableElement)) {
      return;
    }
    const columnIndex = table.dataset.sortColumn ? Number(table.dataset.sortColumn) : NaN;
    const direction = table.dataset.sortDirection;
    if (!Number.isInteger(columnIndex) || (direction !== 'asc' && direction !== 'desc')) {
      return;
    }
    sortTable(table, columnIndex, direction, false);
  }

  window.SimpleTableSorter = {
    enhance,
    applyCurrentSort,
    sort(table, columnIndex, direction) {
      if (!(table instanceof HTMLTableElement)) {
        return;
      }
      const dir = direction === 'desc' ? 'desc' : 'asc';
      sortTable(table, Number(columnIndex) || 0, dir, true);
    }
  };
})();
