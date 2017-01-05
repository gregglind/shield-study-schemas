const jsonschema = require("jsonschema");
const schemas = {
  common: require("./schemas/shield-schemas.json").common,
  shield: require("./schemas/shield-study.schema.json"),
  study:  require("./schemas/shield-study-addon.schema.json"),
  error:  require("./schemas/shield-study-error.schema.json")
};

const randomstring = require("randomstring");

function codepoint() {
   return "\\u" + randomstring.generate({length:4, charset: "hex"})
}


function genString (length) {
  return "a"
}

function generateValidCommon () {
  return {
    version: 3,
    study_name: "some thing",
    branch: "a branch",
    addon_version: "0.1.1",
    shield_version: "1.2.3",
    data:  {}
  }
}





function jcopy (thing) {
  return JSON.parse(JSON.stringify(thing));
}
function combine (common, special) {
  var a = jcopy(common);
  a.data = jcopy(special);
  return a;
}

function noErrors(thing, schema) {
  return !Boolean(jsonschema.validate(thing, schema))
}

[
  "enter",
  "exit",
  "installed",
  "ineligible",
  "expired",
  "user-disable",
  "ended-positive",
  "ended-neutral",
  "ended-negative",
  "active"
].map(function (state) {
  console.log(`${state} is valid`);
  var d = combine(generateValidCommon(), {
    study_state: state,
    study_state_fullname: "a string",
    attributes:  {
      a: "a"
    }
  })
  console.log(`errors: `,jsonschema.validate(d, schemas.shield).errors);
})




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


