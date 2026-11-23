# Analise dos resultados do teste de mutacao (StrykerJS) dos 5 modelos.
# Uso: python3 analisar.py
# Saida: mutacao/resultados/ (requer MUT_TRABALHO com as pastas mut/<modelo>)
import json, os, csv, random, shutil, glob, collections
from scipy import stats
import openpyxl

SP = os.environ['MUT_TRABALHO']
EXP = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = f'{EXP}/mutacao/resultados'
INST = f'{EXP}/mutacao/instabilidade'
CONS = f'{EXP}/metricas/casos-consolidados.csv'
MODELOS = ['deepseek', 'gemini', 'glm', 'mimo', 'nemotron']
AREAS = ['backend', 'frontend']
DETECT = {'Killed', 'Timeout'}
UNDET = {'Survived', 'NoCoverage'}
os.makedirs(OUT, exist_ok=True)
random.seed(2026)


def carregar(m, area):
    ps = sorted(glob.glob(f'{SP}/mut/{m}/reports/mutacao/{area}-*.json'))
    if not ps:
        return None
    r = {'files': {}, 'testFiles': {}}
    for p in ps:
        d = json.load(open(p))
        r['files'].update(d['files'])
        for arq, tf in (d.get('testFiles') or {}).items():
            r['testFiles'].setdefault(arq, tf)
    testes = {}
    for arq, tf in (r.get('testFiles') or {}).items():
        rel = arq.split(f'/mut/{m}/')[-1]
        for t in tf.get('tests', []):
            testes[t['id']] = (rel, t['name'])
    muts = {}
    for arq, f in r['files'].items():
        rel = arq.split(f'/mut/{m}/')[-1]
        for mu in f['mutants']:
            loc = mu['location']
            chave = (rel, loc['start']['line'], loc['start']['column'], loc['end']['line'], loc['end']['column'], mu['mutatorName'], mu.get('replacement', ''))
            muts[chave] = {'status': mu['status'], 'killedBy': mu.get('killedBy') or [], 'coveredBy': mu.get('coveredBy') or [], 'tipo': mu['mutatorName']}
    ativos = {t for v in muts.values() for t in v['coveredBy']} | {t for v in muts.values() for t in v['killedBy']}
    return {'muts': muts, 'testes': testes, 'ativos': ativos}


def camada(chave, area):
    partes = chave[0].split('/')
    i = partes.index('src')
    resto = partes[i + 1:]
    return resto[0] if len(resto) > 1 else resto[0]


def score(lista):
    d = sum(1 for s in lista if s in DETECT)
    u = sum(1 for s in lista if s in UNDET)
    surv = sum(1 for s in lista if s == 'Survived')
    return {'detectados': d, 'naoDetectados': u, 'sobreviventes': surv,
            'semCobertura': sum(1 for s in lista if s == 'NoCoverage'),
            'timeout': sum(1 for s in lista if s == 'Timeout'),
            'erros': sum(1 for s in lista if s in ('RuntimeError', 'CompileError')),
            'score': round(100 * d / (d + u), 2) if d + u else None,
            'scoreCoberto': round(100 * d / (d + surv), 2) if d + surv else None}


dados = {m: {a: carregar(m, a) for a in AREAS} for m in MODELOS}
linhas_score, linhas_camada = [], []
resumo = {}
for m in MODELOS:
    resumo[m] = {}
    for a in AREAS:
        r = dados[m][a]
        if not r:
            continue
        st = [v['status'] for v in r['muts'].values()]
        s = score(st)
        s['totalMutantes'] = len(st)
        s['testes'] = len(r['ativos'])
        s['detectadosPorTeste'] = round(s['detectados'] / s['testes'], 3) if s['testes'] else None
        if a == 'frontend':
            s['scoreSemTexto'] = score([v['status'] for v in r['muts'].values() if v['tipo'] != 'StringLiteral'])['score']
        resumo[m][a] = s
        linhas_score.append({'modelo': m, 'area': a, **s})
        por = collections.defaultdict(list)
        for k, v in r['muts'].items():
            por[camada(k, a)].append(v['status'])
        for c, l in sorted(por.items()):
            linhas_camada.append({'modelo': m, 'area': a, 'camada': c, 'mutantes': len(l), **{k: v for k, v in score(l).items() if k in ('detectados', 'score')}})
    tot = [v['status'] for a in AREAS if dados[m][a] for v in dados[m][a]['muts'].values()]
    resumo[m]['geral'] = score(tot)
    linhas_score.append({'modelo': m, 'area': 'geral', **resumo[m]['geral']})

# Exclusivos e uniao (complementaridade)
exclusivos = []
for a in AREAS:
    chaves = set().union(*[set(dados[m][a]['muts']) for m in MODELOS if dados[m][a]])
    det = {k: [m for m in MODELOS if dados[m][a] and dados[m][a]['muts'].get(k, {}).get('status') in DETECT] for k in chaves}
    validos = [k for k in chaves if any(dados[m][a] and dados[m][a]['muts'].get(k, {}).get('status') in DETECT | UNDET for m in MODELOS)]
    uniao = sum(1 for k in validos if det[k])
    resumo.setdefault('_conjunto', {})[a] = {'mutantes': len(validos), 'detectadosPorAlgum': uniao, 'scoreUniao': round(100 * uniao / len(validos), 2) if validos else None,
                                             'naoDetectadosPorNenhum': len(validos) - uniao}
    for m in MODELOS:
        n = sum(1 for k in validos if det[k] == [m])
        exclusivos.append({'modelo': m, 'area': a, 'exclusivos': n})
        if a in resumo[m]:
            resumo[m][a]['exclusivos'] = n

# Normalizacao por tamanho: score esperado com k testes sorteados (k = menor suite com >= 10 testes), 200 sorteios
for a in AREAS:
    tamanhos = [len(dados[m][a]['ativos']) for m in MODELOS if dados[m][a] and len(dados[m][a]['ativos']) >= 10]
    if not tamanhos:
        continue
    k = min(tamanhos)
    for m in MODELOS:
        r = dados[m][a]
        if not r or len(r['ativos']) < k:
            continue
        ids = sorted(r['ativos'])
        validos = [v for v in r['muts'].values() if v['status'] in DETECT | UNDET]
        vals = []
        for _ in range(200):
            sub = set(random.sample(ids, k))
            d = 0
            for v in validos:
                if v['status'] == 'Killed' and sub.intersection(v['killedBy']):
                    d += 1
                elif v['status'] == 'Timeout' and sub.intersection(v['coveredBy']):
                    d += 1
            vals.append(100 * d / len(validos))
        resumo[m][a]['scoreNormalizado'] = round(sum(vals) / len(vals), 2)
        resumo[m][a]['kNormalizacao'] = k

# Mortes por teste -> casos -> correlacao com o juiz
cons = list(csv.DictReader(open(CONS, encoding='utf-8-sig'), delimiter=';'))
idx = collections.defaultdict(list)
for c in cons:
    idx[(c['modelo'], c['arquivo'])].append(c)
por_caso = []
for m in MODELOS:
    for a in AREAS:
        r = dados[m][a]
        if not r:
            continue
        mortes = collections.Counter()
        unicos = collections.Counter()
        for v in r['muts'].values():
            if v['status'] == 'Killed':
                for t in v['killedBy']:
                    mortes[t] += 1
                if len(v['killedBy']) == 1:
                    unicos[v['killedBy'][0]] += 1
        for tid, (arq, nome) in r['testes'].items():
            cands = [c for c in idx[(m, arq)] if nome == c['titulo'] or nome.endswith(' ' + c['titulo'])]
            if len(cands) != 1:
                cands = [c for c in cands if c['status'] == 'passou'][:1] if cands else []
            c = cands[0] if cands else None
            por_caso.append({'modelo': m, 'area': a, 'arquivo': arq, 'teste': nome, 'idAvaliacao': c['idAvaliacao'] if c else '',
                             'nivel': c['nivel'] if c else '', 'statusOriginal': c['status'] if c else '', 'mutantesMortos': mortes[tid], 'mortesUnicas': unicos[tid],
                             'juiz_nota': float(c['juiz_nota']) if c and c['juiz_nota'] else None,
                             **{f'juiz_{k}': float(c[f'juiz_{k}']) if c and c[f'juiz_{k}'] else None for k in ('aderencia', 'correcao', 'oraculo', 'clareza', 'relevancia')}})

correl = []
def corr(rows, rotulo):
    rows = [r for r in rows if r['juiz_nota'] is not None and r['statusOriginal'] == 'passou']
    if len(rows) < 10:
        return
    for crit in ('nota', 'aderencia', 'correcao', 'oraculo', 'clareza', 'relevancia'):
        x = [r[f'juiz_{crit}'] for r in rows]
        y = [r['mutantesMortos'] for r in rows]
        rho, p = stats.spearmanr(x, y)
        correl.append({'grupo': rotulo, 'criterio': crit, 'n': len(rows), 'spearman_rho': round(float(rho), 3), 'p': float(p)})
    mata = [r['juiz_nota'] for r in rows if r['mutantesMortos'] > 0]
    nao = [r['juiz_nota'] for r in rows if r['mutantesMortos'] == 0]
    if mata and nao:
        u, p = stats.mannwhitneyu(mata, nao)
        correl.append({'grupo': rotulo, 'criterio': 'nota: mata>=1 vs mata 0 (Mann-Whitney)', 'n': len(rows), 'spearman_rho': None, 'p': float(p),
                       'media_mata': round(sum(mata) / len(mata), 2), 'media_nao_mata': round(sum(nao) / len(nao), 2), 'n_mata': len(mata), 'n_nao_mata': len(nao)})
corr(por_caso, 'todos')
for m in MODELOS:
    corr([r for r in por_caso if r['modelo'] == m], m)
for a in AREAS:
    corr([r for r in por_caso if r['area'] == a], a)
casados = sum(1 for r in por_caso if r['idAvaliacao'])
resumo['_juiz'] = {'testesComMutacao': len(por_caso), 'casadosComCaso': casados}

# Instabilidade: testes cujo status muda entre as 3 repeticoes
instab = []
for m in MODELOS:
    for a, pref in (('backend', 'back'), ('frontend', 'front')):
        execs = []
        for i in (1, 2, 3):
            p = f'{INST}/{m}-{pref}-{i}.json'
            if not os.path.exists(p):
                continue
            try:
                d = json.load(open(p))
            except Exception:
                continue
            st = {}
            for f in d.get('testResults', []):
                for t in f.get('assertionResults', []):
                    st[(f['name'].split(f'/mut/{m}/')[-1], t.get('fullName') or t['title'])] = t['status']
            execs.append(st)
        if len(execs) < 2:
            continue
        chaves = set().union(*execs)
        osc = [k for k in chaves if len({e.get(k) for e in execs} - {'pending', 'skipped', None}) > 1]
        instab.append({'modelo': m, 'area': a, 'repeticoes': len(execs), 'testes': len(chaves), 'instaveis': len(osc), 'exemplos': '; '.join(f'{k[0]} :: {k[1]}' for k in sorted(osc)[:5])})
        resumo[m].setdefault(a, {})['instaveis'] = len(osc)

# Saidas
json.dump({'resumo': resumo, 'correlacaoJuiz': correl, 'instabilidade': instab}, open(f'{OUT}/resumo.json', 'w'), ensure_ascii=False, indent=1)
wb = openpyxl.Workbook()
def aba(nome, linhas):
    ws = wb.create_sheet(nome)
    if not linhas:
        return
    cols = list(dict.fromkeys(k for l in linhas for k in l))
    ws.append(cols)
    for l in linhas:
        ws.append([l.get(c) for c in cols])
wb.remove(wb.active)
tabela = []
for m in MODELOS:
    for a in AREAS + ['geral']:
        if a in resumo[m] and 'score' in resumo[m][a]:
            tabela.append({'modelo': m, 'area': a, **resumo[m][a]})
aba('scores', tabela)
aba('por-camada', linhas_camada)
aba('exclusivos', exclusivos)
aba('conjunto', [{'area': a, **v} for a, v in resumo['_conjunto'].items()])
aba('juiz-x-mutacao', correl)
aba('por-teste', por_caso)
aba('instabilidade', instab)
wb.save(f'{OUT}/mutacao.xlsx')
with open(f'{OUT}/por-teste.csv', 'w', newline='', encoding='utf-8-sig') as f:
    if por_caso:
        w = csv.DictWriter(f, fieldnames=list(por_caso[0]), delimiter=';')
        w.writeheader(); w.writerows(por_caso)
for m in MODELOS:
    for a in AREAS:
        for h in glob.glob(f'{SP}/mut/{m}/reports/mutacao/{a}-*.html'):
            os.makedirs(f'{OUT}/html', exist_ok=True)
            shutil.copy(h, f'{OUT}/html/{m}-' + os.path.basename(h))
print(json.dumps({m: {a: {k: resumo[m][a].get(k) for k in ('score', 'scoreCoberto', 'scoreSemTexto', 'scoreNormalizado', 'testes', 'exclusivos', 'instaveis')} for a in resumo[m]} for m in MODELOS}, ensure_ascii=False, indent=1))
print(json.dumps(resumo['_conjunto'], ensure_ascii=False), json.dumps(resumo['_juiz']))
for c in correl:
    if c['grupo'] == 'todos' or c['criterio'] == 'nota':
        print(c)

# Lacunas: mutantes que nenhum modelo detectou (comportamentos do Clinica+ sem teste eficaz)
lac = []
src_root = f'{SP}/mut/deepseek'
for a in AREAS:
    chaves = set().union(*[set(dados[m][a]['muts']) for m in MODELOS if dados[m][a]])
    for k in sorted(chaves):
        sts = {m: dados[m][a]['muts'][k]['status'] for m in MODELOS if dados[m][a] and k in dados[m][a]['muts']}
        if any(s in DETECT for s in sts.values()) or not any(s in UNDET for s in sts.values()):
            continue
        try:
            linha = open(f'{src_root}/{k[0]}', encoding='utf-8').read().split('\n')[k[1] - 1].strip()
        except Exception:
            linha = ''
        lac.append({'area': a, 'arquivo': k[0], 'linha': k[1], 'operador': k[5], 'substituicao': k[6][:120], 'codigoOriginal': linha[:160],
                    **{f'status_{m}': sts.get(m, '') for m in MODELOS}})
with open(f'{OUT}/lacunas-nenhum-modelo-detectou.csv', 'w', newline='', encoding='utf-8-sig') as f:
    if lac:
        w = csv.DictWriter(f, fieldnames=list(lac[0]), delimiter=';'); w.writeheader(); w.writerows(lac)
print('lacunas', len(lac), collections.Counter((l['area'], l['arquivo'].split('/src/')[-1].split('/')[0]) for l in lac).most_common(12))
