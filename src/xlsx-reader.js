import * as XLSX from 'xlsx';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_SHEETS = 20;
const MAX_ROWS = 2500;
const MAX_COLUMNS = 60;

export async function readWorkbook(file) {
  if (!file || file.size === 0) throw new Error('Selecione uma planilha válida.');
  if (file.size > MAX_FILE_BYTES) throw new Error('A planilha excede o limite de 10 MB.');
  if (!/\.xlsx$/i.test(file.name)) throw new Error('Use uma planilha .xlsx. Arquivos .xls e .xlsm não são aceitos.');

  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: 'array',
    cellDates: false,
    cellHTML: false,
    cellNF: false,
    bookVBA: false,
    sheetRows: MAX_ROWS + 1
  });

  if (!workbook.SheetNames.length) throw new Error('A planilha não contém abas legíveis.');
  if (workbook.SheetNames.length > MAX_SHEETS) throw new Error(`A planilha tem mais de ${MAX_SHEETS} abas. Separe o arquivo e tente novamente.`);

  return workbook.SheetNames.map(name => {
    const sheet = workbook.Sheets[name];
    const range = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : null;
    if (range && range.e.c + 1 > MAX_COLUMNS) throw new Error(`A aba “${name}” tem mais de ${MAX_COLUMNS} colunas.`);
    if (range && range.e.r + 1 > MAX_ROWS) throw new Error(`A aba “${name}” tem mais de ${MAX_ROWS} linhas.`);
    return {
      name,
      rows: XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '', blankrows: true })
    };
  });
}
