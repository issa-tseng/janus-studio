const $ = window.$ = require('jquery');
window.tap = (x) => { console.log(x); return x; };

const { App } = require('./lib/model/app');
const app = new App();
require('janus-stdlib').view($).registerWith(app.views);
require('janus-inspect').view($).registerWith(app.views);
require('./lib/view/app').register(app.views);
require('./lib/view/block').register(app.views);
require('./lib/view/chrome').register(app.views);
require('./lib/view/editor').register(app.views);
require('./lib/view/exception').register(app.views);
require('./lib/view/machine').register(app.views);
require('./lib/view/valuator').register(app.views);

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
      "id": "cb77c315-9555-460c-8ca9-af60d6f52fce",
      "name": "TimerView",
      "code": "DomView.build(\n  $('<div class=\"timer\"><span class=\"start\"/><span class=\"end\"/></div>'),\n  template(\n    find('.start').text(from('start').map(x => `${x} sec`)),\n    find('.end').text(from('end'))\n  )\n)"
    }, {
      "id": "df7d4688-b9fe-4116-9585-0e5ce607f42a",
      "name": "timer",
      "code": "new Timer({ start: 10, end: 20, zero: 15, x: new Timer() })"
    }, {
      "id": "795a30f3-ede8-41fd-96a7-06dc945a6fa7",
      "name": "adjusted",
      "code": "timer.with({ start: 3 })"
    }, {
      "id": "27d5de74-5093-4fd4-b8fe-c4bec58d7241",
      "code": "new TimerView(timer, { app })"
    }, {
      "id": "cb77c315-9555-460c-8ca9-af60d6f52fce",
      "code": "new List([ 2, 6, new Model() ])"
    }, {
      "id": "0b988376-27ac-47b5-b14d-4416eb09a755",
      "code": "new Map({ x: Varying.all([ timer.get('start'), timer.get('zero'), timer.get('end').map(x => x * 2) ]).map((s, z, e) => s + z + e) })"
    }, {
      "id": "ceb4bf32-9190-413d-ac39-66a3c2044509",
      "code": "Varying.all([ timer.get('start'), timer.get('zero'), timer.get('end').map(x => x * 2) ]).map((s, z, e) => s + z + e)"
    }],
    "stacks": [{
      "name": "main",
      "blocks": [{
        "type": "reference",
        "to": "df7d4688-b9fe-4116-9585-0e5ce607f42a"
      }, {
        "type": "reference",
        "to": "795a30f3-ede8-41fd-96a7-06dc945a6fa7"
      }, {
        "type": "reference",
        "to": "27d5de74-5093-4fd4-b8fe-c4bec58d7241"
      }]
    }, {
      "name": "second",
      "blocks": [{
        "type": "action",
        "code": "timer.set('start', timer.get_('start') + 1)"
      }, {
        "type": "reference",
        "to": "0b988376-27ac-47b5-b14d-4416eb09a755"
      }]
    }]
  }]
};
const project = Project.deserialize(data)
app.set('project', project);

const tab = project.get_('assemblies').get_(0).shadow();
app.get_('tabs').add(tab);
app.set('active', tab);

const { decorateInspectors } = require('./lib/util/inspect');
decorateInspectors(app);

const view = app.view(app);
app.set('view', view);
$('#main').append(view.artifact());
view.wireEvents();


////////////////////////////////////////
// random jquery things

$.fn.view = function() {
  let ptr = this;
  while (ptr.length > 0) {
    const view = ptr.data('view')
    if (view != null) return view;
    ptr = ptr.parent();
  }
};

$.fn.offsetCenter = function() {
  const offset = this.offset();
  offset.top += (this.height() / 2);
  offset.left += (this.width() / 2);
  return offset;
};

