#!/usr/bin/env node

var jsonschema = require("jsonschema");
var schema = require("./schemas/shield-schemas.json");
const assert = require('assert');
const randomstring = require("randomstring");
var jsonfile = require('jsonfile');

var deref = require('json-schema-deref');
//deref(schema, (err,thing)=>console.dir(thing.properties.data))


var validStudyStates =   schema.definitions.shieldStudy.properties.study_state.enum;
var validErrorSource =   schema.definitions.shieldStudyError.properties.error_source.enum;
var validErrorSeverity = schema.definitions.shieldStudyError.properties.severity.enum;

/* [a, b] or  [1, a] */
function randInt(a, b) {
  if (b === undefined) {
    b=a;
    a=1;
  }
  return Math.floor(Math.random()*(b-a-1) + a)
}

function codepoint() {
   return "\\u" + randomstring.generate({length:4, charset: "hex"})
}

function genString (length) {
  return randomstring.generate(length);
}

function generateValidCommon () {
  return {
    version: 3,
    study_name: genString(randInt(1,30)),
    branch: genString(randInt(1,30)),
    addon_version: "0.1.1",
    shield_version: "1.2.3",
  }
}

function validate (thing) {
  return jsonschema.validate(thing, schema);
}

function jcopy (thing) {
  return JSON.parse(JSON.stringify(thing));
}
function combine (common, dataField) {
  var a = jcopy(common);
  a.data = jcopy(dataField);
  return a;
}


function noErrors(validationResult) {
  //console.log(validationResult.errors.length, validationResult.errors.length == 0 )
  return validationResult.errors.length == 0;
}


function simpleTest(data, msg, ok=true) {
  var d = combine(generateValidCommon(), data )
  debugger;
  let validation = validate(d, schema);
  let val = noErrors(validate(d, schema));
  if (!ok) {
    val = !val;
  }
  assert.ok(val, `${msg} :: ${validation.errors}`)
}


var tests = {};
tests.only = {};

tests['test empty doesnt validate'] = function () {
  //console.log(validate({}));
  assert.equal(noErrors(validate({})), false)
}

tests['test shield-study MINIMAL is okay'] = function () {
  return validStudyStates.map(function (state) {
    var data = {
      study_state: state,
      packet: "shield-study"
    };
    debugger;
    simpleTest(data, `study_state: ${state} should be valid MINIMAL, ${JSON.stringify(data)}`)
  })
}

tests['test shield-study FULL is okay'] = function () {
  return validStudyStates.map(function (state) {
    var data = {
      packet: "shield-study",
      study_state: state,
      study_state_fullname: "a string",
      attributes:  {
        a: "a"
      }
    };
    debugger;
    simpleTest(data, `study_state: ${state} should be valid MINIMAL, ${JSON.stringify(data)}`)
  })
}

tests['test shield-study-addon MINIMAL is okay'] = function () {
  var data = {
    packet: "shield-study-addon",
    attributes: {}
  }
  simpleTest(data, `${JSON.stringify(data)}`)
}


tests['test shield-study-addon FULL is okay'] = function () {
  var data = {
    packet: "shield-study-addon",
    attributes: {
      some: "thing",
      other: "another"
    }
  }
  simpleTest(data, `${JSON.stringify(data)}`)
}

tests['test shield-study-error MINIMAL is okay'] = function () {
  return validErrorSeverity.map(function (severity) {
    return validErrorSource.map(function (source) {
      var data = {
        packet: "shield-study-error",
        error_id:  genString(randInt(1,30)),
        error_source: source
      };
      debugger;
      simpleTest(data, `error: ${severity} ${source} should be valid MAXIMAL error, ${JSON.stringify(data)}`)
    })
  })
}

tests['test shield-study-error FULL is okay'] = function () {
  return validErrorSeverity.map(function (severity) {
    return validErrorSource.map(function (source) {
      var data = {
        packet: "shield-study-error",
        error_id:  genString(randInt(1,30)),
        error_source: source,
        severity: severity,
        message:  genString(randInt(1,30)),
        attributes:  {
          a: "a"
        },
        error: {stack: "thing"}
      };
      debugger;
      simpleTest(data, `error: ${severity} ${source} should be valid MAXIMAL error, ${JSON.stringify(data)}`)
    })
  })
}

// todo some faily things
// wrong messages
// missing fields

tests['test empty data is NOT okay'] = function () {
  var data = {
  };
  simpleTest(data, `${JSON.stringify(data)}`, false)
}


function runTests () {
  if (Object.keys(tests.only).length) {
    tests = tests.only;
  }

  Object.keys(tests).forEach((k) => {
    if (k === "only") return;

    try {
      tests[k]();
      console.log("OK", k)
    } catch (err) {
      console.error("ERROR", k, err);
    }
  })
}


function generate () {
  var valid = {};
  valid['shieldStudyFULL'] = combine(generateValidCommon(),{
    packet: "shield-study",
    study_state: "enter",
    study_state_fullname: "a string",
    attributes:  {
      a: "a"
    }
  });
  valid['shieldStudyMINIMAL'] = combine(generateValidCommon(),{
    study_state: "enter",
    packet: "shield-study"
  });

  valid['shieldStudyAddonFULL'] = combine(generateValidCommon(),{
    packet: "shield-study-addon",
    attributes: {
      some: "thing",
      other: "another"
    }
  });

  valid['shieldStudyAddonMINIMAL'] = combine(generateValidCommon(),{
    packet: "shield-study-addon",
    attributes: {}
  });

  valid['shieldStudyErrorFULL'] = combine(generateValidCommon(),{
    packet: "shield-study-error",
    error_id:  genString(randInt(1,30)),
    error_source: "firefox",
    severity: "warn",
    message:  genString(randInt(1,30)),
    attributes:  {
      a: "a"
    },
    error: {stack: "thing"}
  });

  valid['shieldStudyErrorMINIMAL'] = combine(generateValidCommon(), {
    packet: "shield-study-error",
    error_id:  genString(randInt(1,30)),
    error_source: "addon"
  });

  var file = 'example.valid.packets.json';
  // check they are valid
  Object.keys(valid).map((k) => {
    console.log(valid[k])
    assert.ok(noErrors(validate(valid[k],schema)))
  })
  jsonfile.writeFileSync(file, valid, {spaces: 4})
}

var args = process.argv.slice(2);
if (args.includes('create')) {
  generate();
}
if (args.includes('test')) {
  runTests();
}


//const valid = {
//  "test something": combine(generateValidCommon(),  )
//
//};
//
//
//const invalid = {
//  "test no fields is okay"
//
//}



