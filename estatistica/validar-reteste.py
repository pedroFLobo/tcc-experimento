import csv,io,re,sys,os,glob
EXP=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
L=f'{EXP}/avaliacao/lotes'
O=f'{EXP}/avaliacao/juiz-reteste'
def ids(n):
    t=open(f'{L}/{n}.md',encoding='utf-8').read()
    return re.findall(r'^\| ([a-z]+-\d{4}) \|',t,re.M)
def check(n):
    p=f'{O}/{n}.csv'
    if not os.path.exists(p): return 'faltando'
    rows=list(csv.reader(io.StringIO(open(p,encoding='utf-8-sig').read().strip()),delimiter=';'))
    if rows[0][:8]!=['caso','aderencia','correcao','oraculo','clareza','relevancia','nota','justificativa']: return 'cabecalho'
    exp=ids(n); got=[r[0] for r in rows[1:]]
    if got!=exp: return f'ids: esperado {len(exp)} obtido {len(got)} dif {set(exp)^set(got)}'
    for r in rows[1:]:
        if len(r)!=8: return f'colunas {r[0]}'
        s=[int(x) for x in r[1:6]]
        if any(x not in (2,4,6,8,10) for x in s): return f'nota invalida {r[0]}'
        if abs(float(r[6])-sum(s)/5)>0.051: return f'media {r[0]}'
    return 'ok'
ns=sys.argv[1:] or [f'lote-{i:03d}' for i in range(1,194)]
bad=[(n,check(n)) for n in ns]
print([b for b in bad if b[1]!='ok'] or 'tudo ok', sum(1 for b in bad if b[1]=='ok'),'ok')
