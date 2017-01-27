#!/usr/bin/env node

/*
message testpilot {
    required binary id (UTF8);
    optional binary clientId (UTF8);
    required group metadata {
        required int64  Timestamp;
        required binary submissionDate (UTF8);
        optional binary Date (UTF8);
        optional binary normalizedChannel (UTF8);
        optional binary geoCountry (UTF8);
        optional binary geoCity (UTF8);
    }
    optional group application {
        optional binary name (UTF8);
    }
    optional group environment {
        optional group system {
            optional group os {
                optional binary name (UTF8);
                optional binary version (UTF8);
            }
        }
    }
    optional group payload {
        optional binary version (UTF8);
        optional binary test (UTF8);
        repeated group events {
            optional int64  timestamp;
            optional binary event (UTF8);
            optional binary object (UTF8);
        }
    }
}

unique page visits
# of open tabs
default search
sync enabled
number of clients desktop/mobile
profile age
os
version
locale

[11:38 AM]
search access point volume
*/

var deref = require('json-schema-deref');
var schema = require('./shield-schemas.incomplete.json');
var jsonfile = require('jsonfile');
var fs = require('fs');
const { Parquet } = require('jsonschema-parquet');

const DIR = './schemas-client';
const TELDIR = './schemas-telemetry';
const PARQUETDIR = './schemas-parquet';

function copy (thing) {
  return JSON.parse(JSON.stringify(thing));
}

[DIR, TELDIR, PARQUETDIR].forEach((k) => {
  if (!fs.existsSync(k)){
    fs.mkdirSync(k);
  }
});


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
  modified.required.push('type');
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

var ENVSCHEMA = require('./telemetry.forShield.schema.json');
ENVSCHEMA.properties = {'$ref': '#/definitions/common'};


function telemetrySchema(partial, envschema) {
  let out = {};
  out.title = partial.title;
  out.description = partial.description;
  out.type = 'object';
  partial = copy(partial);

  // we want title and description to be first
  let e = copy(envschema);
  Object.keys(e).map((k)=>{
    out[k] = e[k];
  });
  out.properties.type = partial.properties.type;
  out.properties.payload = partial;
  out.required.push('payload');
  // TODO check the enum at the top
  // TODO adjust required
  // change the name and stuff
  return out;
}

function toParquetWithMetadata (schema) {
  // add on metadata;
  schema = copy(schema);
  schema.properties.metadata = ENVSCHEMA.definitions.metadata;
  schema.required.push('metadata');
  let p = new Parquet();
  let c = p.convert(schema);
  let w = p.toString(c);
  return w;
}

// deref them to folders
console.log('writing to DIR:', DIR);
deref(ENVSCHEMA, function (err, envschema){
  if (err) console.error(err);

  envschema = copy(envschema).definitions.common;
  allSchemas.map(function (tuple) {
    let key = tuple[0];
    let myschema = tuple[1];
    deref(myschema, function(err, fullSchema) {
      if (err) return;
      let fn = `${DIR}/${key}.schema.json`;
      let telemetryFn = `${TELDIR}/${key}.schema.json`;
      let parquetFn = `${PARQUETDIR}/${key}.parquetmr.txt`;

      // for clients;
      fullSchema = finalMod(copy(fullSchema), key, myschema);
      console.log(`writing ${key} at ${fn}`);
      jsonfile.writeFileSync(fn, fullSchema, {spaces: 4});

      // for telemetry
      console.log(`writing ${key} at ${telemetryFn}`);
      let asTel = telemetrySchema(fullSchema, envschema);
      jsonfile.writeFileSync(telemetryFn, asTel, {spaces: 4});

      // for parquet
      console.log(`writing ${key} at ${parquetFn}`);
      let asParquet = toParquetWithMetadata(asTel);
      fs.writeFileSync(parquetFn, asParquet + '\n');
    });
  });
});








