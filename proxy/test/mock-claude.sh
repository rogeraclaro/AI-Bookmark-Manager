#!/bin/bash
# Generic mock claude binary — inspects args to decide output shape
# Used by proxy/test/proxy.test.mjs to avoid spawning real claude CLI
if echo "$@" | grep -q "Categorize this bookmark"; then
  echo '{"structured_output":{"categories":["IA","Eines"]},"result":"Categoritzat"}'
else
  echo '{"structured_output":{"originalId":"test-id","isAI":true,"title":"Test Tweet","categories":["IA"],"externalLinks":[]},"result":"OK"}'
fi
