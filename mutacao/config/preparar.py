# Uso: preparar.py <modelo> <ws>  -> copia testes do modelo para ws e marca como .skip os casos que nao passaram
import csv,sys,os,re,shutil,json
EXP=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
mod,ws=sys.argv[1],sys.argv[2]
res=f'{EXP}/resultados/{mod}'
rows=list(csv.DictReader(open(f'{res}/casos.csv',encoding='utf-8-sig'),delimiter=';'))
for area in ('backend','frontend'):
    shutil.rmtree(f'{ws}/{area}/__testes__',ignore_errors=True)
    src=f'{res}/testes/{area}/__testes__'
    if os.path.isdir(src): shutil.copytree(src,f'{ws}/{area}/__testes__')
excl=[];falt=[];skip=0
erros={r['arquivo'] for r in rows if r['status']=='erro-de-carga'}
for a in erros:
    p=f'{ws}/{a}'
    if os.path.exists(p): os.remove(p); excl.append(a)
for r in rows:
    a=r['arquivo']
    if r['status'] in('passou','erro-de-carga') or not (a.startswith('backend') or a.startswith('frontend')): continue
    p=f'{ws}/{a}'; s=open(p,encoding='utf-8').read()
    t=r['titulo']
    variantes={t, t.replace("'","\\'"), t.replace('"','\\"')}
    ok=False
    for v in variantes:
        pat=re.compile(r'\b(test|it)\s*\(\s*([\'"`])'+re.escape(v)+r'\2')
        s2,n=pat.subn(lambda m:f'{m.group(1)}.skip({m.group(2)}{v}{m.group(2)}',s)
        if n: s=s2; ok=True; skip+=n; break
    if ok: open(p,'w',encoding='utf-8').write(s)
    else: falt.append(f'{a} | {t}')
print(json.dumps({'modelo':mod,'skips':skip,'arquivosExcluidos':excl,'naoEncontrados':falt},ensure_ascii=False,indent=1))
