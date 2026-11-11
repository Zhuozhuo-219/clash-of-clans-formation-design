import fs from 'node:fs';
const cat=JSON.parse(fs.readFileSync('data/catalog.json','utf8'));
fs.writeFileSync('src/catalog.generated.mjs','// GENERATED from data/catalog.json; run `npm run sync:catalog` after catalog changes.\nexport const CATALOG_RECORDS = '+JSON.stringify(cat.objects)+';\nexport const CAT = Object.fromEntries(CATALOG_RECORDS.map(o=>[o.id,o]));\n');
console.log('Catalog ESM generated:',cat.objects.length,'object types');
