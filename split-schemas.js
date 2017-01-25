#!/usr/bin/env node

var deref = require('json-schema-deref');
var schema = require('./shield-schemas.incomplete.json');
var jsonfile = require('jsonfile');


const DIR = './schemas';


function copy (thing) {
  return JSON.parse(JSON.stringify(thing));
}

var fs = require('fs');

if (!fs.existsSync(DIR)){
  fs.mkdirSync(DIR);
}

var allSchemas = [];
// do the work to split
/*
> schema.properties.data.oneOf
[ { '$ref': '#/definitions/shieldStudy' },
  { '$ref': '#/definitions/shieldStudyAddon' },
  { '$ref': '#/definitions/shieldStudyError' } ]
*/
schema.properties.data.oneOf[0].$ref.split('/')[2];
schema.properties.data.oneOf.map(function (which) {
  var key = uncamel(which.$ref.split('/')[2]);
  var modified = copy(schema);
  modified.properties.data = {
    type: 'object',
    $ref: which.$ref
  };
  modified.properties['type'] = {
    'type': 'string',
    'description':  'doc_type, restated',
    'enum': [
      key
    ]
  },
  allSchemas.push([key, modified]);
});

function uncamel(camelcase, joinstr='-') {
  return camelcase.split(/(?=[A-Z])/).join(joinstr).toLowerCase();
}


function finalMod(splitSchema, title, oschema) {
  delete splitSchema.definitions;
  splitSchema.description = splitSchema.properties.data.description;
  splitSchema.title = title;
  Object.keys(splitSchema.properties).forEach((k)=>{
    if (k==='data') return;
    splitSchema.properties[k].description = oschema.properties[k].description;

  });

  return splitSchema;
}

// deref them to folders
console.log('writing to DIR:', DIR);
allSchemas.map(function (tuple) {
  let key = tuple[0];
  let myschema = tuple[1];
  deref(myschema, function(err, fullSchema) {
    if (err) return;
    let fn = `${DIR}/${key}.schema.json`;
    console.log(`writing ${key} at ${fn}`);
    fullSchema = finalMod(copy(fullSchema), key, myschema);
    jsonfile.writeFileSync(fn, fullSchema, {spaces: 4});
  });
});




