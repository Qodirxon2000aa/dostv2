/**
 * Uslubli Excel (.xlsx) — xlsx-js-style
 */
import XLSX from 'xlsx-js-style';

const border = {
  top: { style: 'thin', color: { rgb: '94A3B8' } },
  bottom: { style: 'thin', color: { rgb: '94A3B8' } },
  left: { style: 'thin', color: { rgb: '94A3B8' } },
  right: { style: 'thin', color: { rgb: '94A3B8' } },
};

export function createWorkbook() {
  return XLSX.utils.book_new();
}

/** Oxirgi qator(lar)da JAMI / jami bo‘lsa — jami qator deb belgilaydi */
export function inferTotalRowIndexes(aoa) {
  const idx = [];
  aoa.forEach((row, r) => {
    if (!row || !row.length) return;
    const c0 = String(row[0] ?? '').toUpperCase();
    const c1 = String(row[1] ?? '').toUpperCase();
    if (c0.includes('JAMI') || c1.includes('JAMI') || c0.startsWith('JAMI:')) idx.push(r);
  });
  return idx;
}

/** Bo‘lim sarlavhasi: birinchi ustunda matn, keyingi ustunlar bo‘sh */
export function inferTitleRowIndexes(aoa) {
  const idx = [];
  aoa.forEach((row, r) => {
    if (!row?.length) return;
    const a = row[0];
    const b = row[1];
    if (a != null && String(a).trim() !== '' && (b === '' || b == null)) {
      const s = String(a).trim();
      if (s.length >= 3 && !/^\d+$/.test(s)) idx.push(r);
    }
  });
  return idx;
}

function styleCell({ R, isTitle, isHeader, isTotal, isZebra }) {
  if (isTitle) {
    return {
      font: { bold: true, sz: 11, color: { rgb: '78350F' } },
      fill: { fgColor: { rgb: 'FDE68A' } },
      alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
      border,
    };
  }
  if (isHeader) {
    return {
      font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1D4ED8' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border,
    };
  }
  if (isTotal) {
    return {
      font: { bold: true, sz: 11, color: { rgb: '065F46' } },
      fill: { fgColor: { rgb: 'A7F3D0' } },
      alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
      border,
    };
  }
  const bg = isZebra ? 'EFF6FF' : 'F8FAFC';
  return {
    font: { sz: 10, color: { rgb: '1E293B' } },
    fill: { fgColor: { rgb: bg } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border,
  };
}

/**
 * @param {import('xlsx').WorkBook} wb
 * @param {string} sheetName
 * @param {any[][]} aoa
 * @param {{ headerRowIndex?: number, titleRowIndexes?: number[], totalRowIndexes?: number[], colWidths?: number[] }} options
 */
export function appendSheetStyled(wb, sheetName, aoa, options = {}) {
  const {
    headerRowIndex = 0,
    titleRowIndexes: titleIn = null,
    totalRowIndexes: totalIn = null,
    colWidths = null,
  } = options;

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const ref = ws['!ref'];
  if (!ref) {
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    return;
  }

  const range = XLSX.utils.decode_range(ref);
  const titleSet = new Set(titleIn ?? inferTitleRowIndexes(aoa));
  const totalSet = new Set(totalIn ?? inferTotalRowIndexes(aoa));

  for (let R = range.s.r; R <= range.e.r; R++) {
    let empty = true;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r: R, c });
      const cell = ws[addr];
      if (cell && cell.v !== '' && cell.v != null) empty = false;
    }
    if (empty) continue;

    const isTitle = titleSet.has(R);
    const isHeader =
      headerRowIndex >= 0 && R === headerRowIndex && !isTitle;
    const isTotal = totalSet.has(R);
    const isZebra = !isTitle && !isHeader && !isTotal && R % 2 === 0;

    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!ws[addr]) ws[addr] = { t: 's', v: '' };
      const num = typeof ws[addr].v === 'number';
      let st = styleCell({
        R,
        isTitle,
        isHeader,
        isTotal,
        isZebra,
      });
      if (isTotal && num) {
        st = {
          ...st,
          alignment: { horizontal: 'right', vertical: 'center', wrapText: true },
        };
      }
      if (!isTitle && !isHeader && !isTotal && num) {
        st = {
          ...st,
          alignment: { horizontal: 'right', vertical: 'center', wrapText: true },
        };
      }
      ws[addr].s = st;
    }
  }

  const maxC = range.e.c;
  ws['!cols'] = colWidths
    ? colWidths.map((w) => ({ wch: w }))
    : Array.from({ length: maxC + 1 }, () => ({ wch: 16 }));

  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
}

export function writeWorkbook(wb, filename) {
  const name = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, name);
}

export function downloadStyledTable(aoa, filename, sheetName = 'Hisobot', options = {}) {
  const wb = createWorkbook();
  appendSheetStyled(wb, sheetName, aoa, options);
  writeWorkbook(wb, filename);
}
