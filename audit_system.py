import glob, json, re, subprocess, openpyxl
cases=[]
jelco_variants=set()
for path in glob.glob('drive-download*/*.xlsx'):
    if path.split('\\')[-1].startswith('~$'): continue
    conc=re.search(r'concentração (\d+)',path).group(1)
    for sheet in openpyxl.load_workbook(path,data_only=True):
        channels=str(int(re.search(r'TC DE (\d+)',sheet.title).group(1)))
        inj='sem' if 'SEM INJETORA' in sheet.title else 'com'
        if inj=='com':
            jelco_variants.add(tuple(str(sheet.cell(r,c).value).replace('.0','') for r in (5,6,7) for c in (9,10)))
        exams={}
        for row in range(5,15):
            for namecol,volcol,flowcol in ([(1,2,None),(3,4,None)] if inj=='sem' else [(1,3,4),(5,7,8)]):
                name=sheet.cell(row,namecol).value; vol=sheet.cell(row,volcol).value
                if not name or not vol: continue
                name=str(name).strip(); base=re.sub(r'\s+ATÉ 80 KG|\s+ACIMA DE 81 KG','',name,flags=re.I).strip()
                exams.setdefault(base,[]).append((name,str(vol),str(sheet.cell(row,flowcol).value) if flowcol else None))
        allnotes=[str(c.value) for row in sheet for c in row if c.value and 'ULTRAPASSAR' in str(c.value).upper()]
        for exam,entries in exams.items():
            for kg in (50,80,80.5,81,81.1,100,200):
                entry=next((e for e in entries if (kg<=80 if 'ATÉ 80 KG' in e[0] else kg>81 if 'ACIMA DE 81 KG' in e[0] else True)),None)
                volume=None; flow=None; limit=None
                if entry:
                    n=float(re.search(r'[\d,.]+',entry[1]).group().replace(',','.'))
                    volume=n*kg if 'ML/KG' in entry[1].upper() else n
                    flow=entry[2]
                    applicable=[x for x in allnotes if x.upper().startswith('OBS') or exam=='ANGIO DE CORONÁRIAS']
                    caps=[int(re.search(r'\d+',x).group()) for x in applicable]
                    limit=min(caps) if caps else None
                cases.append(dict(conc=conc,channels=channels,inj=inj,exam=exam,kg=kg,volume=volume,flow=flow,limit=limit,sheet=sheet.title))
with open('audit_cases.json','w',encoding='utf8') as f: json.dump(cases,f,ensure_ascii=False)
subprocess.run(['node','audit_system.cjs'],check=True)
print('Jelco source variants:', jelco_variants)
