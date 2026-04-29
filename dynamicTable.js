/**
 * dynamicTable.js
 * Builds a fully interactive editable table (for TC) or a read-only
 * data table (for regular users) from a headers[] + rows[][] structure.
 *
 * Usage:
 *   const el = DynamicTable.build({
 *     headers, rows, editable,
 *     onAddRow, onAddCol, onDeleteRow, onDeleteCol,
 *   });
 *   container.appendChild(el);
 */

'use strict';

const DynamicTable = {

  /**
   * @param {object} opts
   * @param {string[]}   opts.headers
   * @param {string[][]} opts.rows
   * @param {boolean}    opts.editable     – true for TC, false for users
   * @param {Function}   opts.onAddRow     – called when "+ Row" clicked
   * @param {Function}   opts.onAddCol     – called when "+ Column" clicked
   * @param {Function}   opts.onDeleteRow  – called with (rowIndex)
   * @param {Function}   opts.onDeleteCol  – called with (colIndex)
   * @returns {HTMLElement}  wrapper div containing the table
   */
  build({ headers, rows, editable, onAddRow, onAddCol, onDeleteRow, onDeleteCol }) {
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';

    const tbl = document.createElement('table');
    tbl.className = editable ? 'edit-table' : 'data-table';

    /* ── THEAD ─────────────────────────────────────────────── */
    const thead = tbl.createTHead();
    const hr    = thead.insertRow();

    if (editable) {
      // Placeholder cell above row-delete buttons
      const spaceTh = document.createElement('th');
      spaceTh.style.cssText = 'width:30px;background:transparent;border-color:transparent';
      hr.appendChild(spaceTh);
    }

    headers.forEach((h, ci) => {
      const th = document.createElement('th');

      if (editable) {
        const inp = document.createElement('input');
        inp.value       = h;
        inp.placeholder = 'Column name';
        inp.addEventListener('input', () => { headers[ci] = inp.value; });

        const delBtn = document.createElement('button');
        delBtn.className   = 'col-del-btn';
        delBtn.title       = 'Remove column';
        delBtn.textContent = '×';
        delBtn.addEventListener('click', () => onDeleteCol(ci));

        th.appendChild(inp);
        th.appendChild(delBtn);
      } else {
        th.textContent = h;
      }

      hr.appendChild(th);
    });

    if (editable) {
      // "Add column" button as the last header cell
      const addTh  = document.createElement('th');
      addTh.className = 'add-col-th';
      const addBtn = document.createElement('button');
      addBtn.className   = 'add-btn-circle';
      addBtn.title       = 'Add column';
      addBtn.textContent = '+';
      addBtn.addEventListener('click', onAddCol);
      addTh.appendChild(addBtn);
      hr.appendChild(addTh);
    }

    /* ── TBODY ─────────────────────────────────────────────── */
    const tbody = tbl.createTBody();

    rows.forEach((row, ri) => {
      const tr = tbody.insertRow();

      if (editable) {
        // Row-delete button cell
        const delTd  = tr.insertCell();
        delTd.className = 'row-del-td';
        const delBtn = document.createElement('button');
        delBtn.className   = 'row-del-btn';
        delBtn.title       = 'Remove row';
        delBtn.textContent = '×';
        delBtn.addEventListener('click', () => onDeleteRow(ri));
        delTd.appendChild(delBtn);
      }

      headers.forEach((_, ci) => {
        const td = tr.insertCell();
        if (editable) {
          const inp       = document.createElement('input');
          inp.value       = row[ci] !== undefined ? row[ci] : '';
          inp.placeholder = '—';
          inp.addEventListener('input', () => { rows[ri][ci] = inp.value; });
          td.appendChild(inp);
        } else {
          td.textContent = row[ci] !== undefined ? row[ci] : '';
        }
      });

      if (editable) {
        // Empty cell under the "add column" header
        tr.insertCell();
      }
    });

    /* ── Add-Row footer (TC only) ────────────────────────── */
    if (editable) {
      const addTr  = tbody.insertRow();
      addTr.className = 'add-row-tr';
      const addTd  = addTr.insertCell();
      addTd.colSpan = headers.length + 2;

      const addBtn = document.createElement('button');
      addBtn.className   = 'btn btn-secondary btn-sm';
      addBtn.style.margin = '8px 0';
      addBtn.textContent  = '＋ Add Row';
      addBtn.addEventListener('click', onAddRow);
      addTd.appendChild(addBtn);
    }

    wrap.appendChild(tbl);
    return wrap;
  },
};
