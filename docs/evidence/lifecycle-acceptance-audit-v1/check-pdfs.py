from pathlib import Path
import sys,json
sys.path.insert(0,'C:/Users/lenovo/AppData/Local/Temp/contratpro-pdf-tools')
import fitz
folder=Path('C:/Users/lenovo/contratpro/docs/evidence/lifecycle-acceptance-audit-v1')
results={}
for path in folder.glob('*.pdf'):
 doc=fitz.open(path)
 spans=[s for page in doc for block in page.get_text('dict')['blocks'] if 'lines' in block for line in block['lines'] for s in line['spans'] if s['text'].strip()]
 text=''.join(page.get_text() for page in doc)
 sizes=[[round(p.rect.width/72*25.4,3),round(p.rect.height/72*25.4,3)] for p in doc]
 results[path.stem]={'pages':len(doc),'dimensionsMm':sizes,'minimumFontPt':round(min(s['size'] for s in spans),2),'conditionLines':text.count('FULL CONFIGURED CONDITIONS LINE.'),'signatureClient':'Signature client' in text,'signatureAgency':'Signature agence' in text,'legalFooter':'Raison sociale' in text and 'RC' in text and 'IF' in text,'replacementGlyphs':text.count(chr(65533)),'blankPages':[i+1 for i,p in enumerate(doc) if len(p.get_text().strip())<20],'textOutsidePage':sum(1 for p in doc for b in p.get_text('blocks') if b[0]<0 or b[1]<0 or b[2]>p.rect.width or b[3]>p.rect.height)}
 for i,page in enumerate(doc):page.get_pixmap(matrix=fitz.Matrix(1.5,1.5)).save(str(folder/(path.stem+'-page-'+str(i+1)+'.png')))
 assert all(abs(w-210)<.5 and abs(h-297)<.5 for w,h in sizes)
 assert results[path.stem]['minimumFontPt']>=10
 assert not results[path.stem]['blankPages'] and not results[path.stem]['textOutsidePage']
 assert results[path.stem]['signatureClient'] and results[path.stem]['signatureAgency'] and results[path.stem]['legalFooter']
for template in ['classic','luxury','modern','detailed','bilingual']:assert results[template]['pages']==1
assert results['long-conditions']['conditionLines']==180
assert results['historical-classic']['pages']==1
(folder/'pdf-checks.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
print(json.dumps(results,indent=2))
