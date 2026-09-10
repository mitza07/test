W=/root/.claude/projects/-home-user-test/6e361e55-7b0b-5b16-a301-86894a5363c7/subagents/workflows
for i in $(seq 1 60); do
  n=$(node extrage.mjs $W 2>/dev/null | grep -o '[0-9]* verificate' | grep -o '^[0-9]*')
  if [ "$n" = "28" ]; then echo "GATA: toate 28 verificate"; exit 0; fi
  d=$W/wf_8c2b64da-8db
  varsta=$(( ($(date +%s)-$(stat -c %Y $d/journal.jsonl)) / 60 ))
  if [ "$varsta" -gt 20 ]; then echo "BLOCAT: lotul teme tace de ${varsta} min, verificate=$n"; exit 1; fi
  sleep 30
done
echo "EXPIRAT: verificate=$n"
