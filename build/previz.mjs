import { readFileSync, writeFileSync } from 'fs'
const h = readFileSync('../istoria-romaniei.html','utf8')
const tema = process.argv[2] || ''
writeFileSync('previz.html', `<!doctype html><html${tema?` data-theme="${tema}"`:''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${h}</body></html>`)
