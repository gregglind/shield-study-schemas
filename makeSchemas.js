#!/usr/bin/env node

const fs = require('fs');
const schemas = require('../schemas/shield-schemas.json');

function jsoncopy (someJSON) {
  return JSON.parse(JSON.stringify(someJSON));
}

function writeJson (someJson, somePath) {
  fs.writeFileSync(somePath, JSON.stringify(someJson, null, 2));
}

function makeFullSchema(title, subpart, filename) {
  let base = jsoncopy(schemas.common);
  base.title = title +' doc_type schema';
  base.properties.data = jsoncopy(schemas[subpart]);
  delete base.properties.data['$schema'];
  base.description = base.properties.data.description;
  writeJson(base, filename);
  console.log('made:', filename);
}

makeFullSchema('shield-study', 'shield-study-data', '../schemas/shield-study.schema.json');
makeFullSchema('shield-study-addon', 'shield-study-addon-data', '../schemas/shield-study-addon.schema.json');
makeFullSchema('shield-study-error', 'shield-study-error-data', '../schemas/shield-study-error.schema.json');
