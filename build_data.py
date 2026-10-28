import glob, json, openpyxl, re
data = {}
for f in glob.glob('drive-download*/*.xlsx'):
    concentration = re.search(r'concentração (\d+)', f).group(1)
    data[concentration] = {}
    for s in openpyxl.load_workbook(f, data_only=True):
        channels = str(int(re.search(r'TC DE (\d+)', s.title).group(1)))
        key = channels + ('-sem' if 'SEM INJETORA' in s.title else '-com')
        entries = []
        for row in range(5, 15):
            for col, valuecol, flowcol in ([(1,2,None),(3,4,None)] if key.endswith('sem') else [(1,3,4),(5,7,8)]):
                name, value = s.cell(row,col).value, s.cell(row,valuecol).value
                if name and value:
                    entries.append({'name': str(name).strip(), 'value': str(value).strip(), 'flow': str(s.cell(row,flowcol).value).strip() if flowcol and s.cell(row,flowcol).value else None, 'cell': s.cell(row,valuecol).coordinate})
        notes = [str(c.value) for row in s for c in row if c.value and ('ULTRAPASSAR' in str(c.value).upper())]
        data[concentration][key] = {'sheet':s.title,'entries':entries,'notes':notes}
with open('data.js','w',encoding='utf-8') as out:
    out.write('const TABLES = ' + json.dumps(data,ensure_ascii=False,indent=2) + ';\n')
