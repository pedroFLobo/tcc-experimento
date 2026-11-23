#!/bin/bash
# Roda, em sequencia, para os 5 modelos, a execucao de referencia e o Stryker (back + front) dos modelos restantes,
# depois 3 repeticoes de cada suite para medir instabilidade.
# MUT_TRABALHO: pasta de trabalho com uma copia do Clinica+ por modelo em $MUT_TRABALHO/mut/<modelo>
SP=${MUT_TRABALHO:?defina MUT_TRABALHO}; CFG=$(cd "$(dirname "$0")" && pwd); D=$(dirname "$CFG")
log(){ echo "$(TZ=America/Sao_Paulo date '+%d/%m %H:%M:%S') $*" | tee -a $D/logs/orquestrador.log; }
log "inicio/retomada (StrykerJS 10.1.1, em blocos por camada)"
for m in deepseek mimo glm nemotron gemini; do
  W=$SP/mut/$m; cd $W; export CLINICA_AGORA=
  npx jest --config jest.config.cjs --json --outputFile=.jest.json --forceExit >/dev/null 2>&1
  npx vitest run --config vitest.config.mjs --reporter=json --outputFile=.vitest.json >/dev/null 2>&1
  ref=$(python3 -c "
import json
for f in ['.jest.json','.vitest.json']:
  try: d=json.load(open(f)); print(f, 'aprovados',d['numPassedTests'],'falhos',d['numFailedTests'],'skip',d['numPendingTests'],'suitesFalhas',d['numFailedTestSuites'], end=' | ')
  except Exception as e: print(f,'ERRO',e, end=' | ')
")
  log "$m referencia: $ref"
  log "$m stryker iniciando/retomando"; python3 $CFG/rodar-modelo.py $W; log "$m stryker fim: $(tr '\n' ' ' < tempos.txt)"
done
log "repeticoes para instabilidade (3x por modelo)"
for m in deepseek mimo glm nemotron gemini; do
  W=$SP/mut/$m; cd $W; export CLINICA_AGORA=; mkdir -p $D/instabilidade
  for i in 1 2 3; do
    [ -s $D/instabilidade/$m-front-$i.json ] && continue
    npx jest --config jest.config.cjs --json --outputFile=$D/instabilidade/$m-back-$i.json --forceExit >/dev/null 2>&1
    npx vitest run --config vitest.config.mjs --reporter=json --outputFile=$D/instabilidade/$m-front-$i.json >/dev/null 2>&1
  done
  log "$m repeticoes ok"
done
log "TUDO CONCLUIDO"
