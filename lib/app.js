const $ = window.$ = require('jquery');
window.tap = (x) => { console.log(x); return x; };

const { App } = require('./lib/model/app');
const app = new App();
require('janus-stdlib').view($).registerWith(app.views);
require('janus-inspect').view($).registerWith(app.views);
require('./lib/view/editor').register(app.views);
require('./lib/view/exception').register(app.views);
require('./lib/view/machine').register(app.views);
require('./lib/view/project').register(app.views);

const { Project } = require('./lib/model/project');
const data = {
  "context": {
    "env": "return require('./lib/apollo/model');",
    "reset": [ "../apollo/model" ]
  },

  "assemblies": [{
    "id": "a16a6537-db5a-4ce0-b021-6e6d53679bd7",
    "name": "transcript",
    "statements": [{
      "id": "df7d4688-b9fe-4116-9585-0e5ce607f42a",
      "name": "timer",
      "code": "new Timer({ start: 10, end: 20, zero: 15 })"
    }, {
      "id": "795a30f3-ede8-41fd-96a7-06dc945a6fa7",
      "name": "adjusted",
      "code": "timer.with({ start: 3 })"
    }, {
      "id": "27d5de74-5093-4fd4-b8fe-c4bec58d7241",
      "code": "new List()"
    }],
    "stacks": [{
      "name": "main",
      "members": [{
        "type": "reference",
        "to": "df7d4688-b9fe-4116-9585-0e5ce607f42a"
      }, {
        "type": "reference",
        "to": "795a30f3-ede8-41fd-96a7-06dc945a6fa7"
      }, {
        "type": "reference",
        "to": "27d5de74-5093-4fd4-b8fe-c4bec58d7241"
      }, {
        "type": "action",
        "code": "timer.set('start', 5)"
      }]
    }, {
      "name": "second",
      "members": []
    }]
  }]
};
app.set('project', Project.deserialize(data));

const { decorateInspectors } = require('./lib/util/inspect');
decorateInspectors(app);

const view = app.view(app);
$('#main').append(view.artifact());
view.wireEvents();

