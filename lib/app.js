////////////////////////////////////////
// exec env setup

// first set up global $ and jquery utils.
require('./lib/util/jquery');

// then before we do anything else, hijack require.
require('./lib/util/require');

// debugging.
window.tap = (x) => { console.log(x); return x; };


////////////////////////////////////////
// init studio

const { App } = require('./lib/model/app');
const app = new App();
require('janus-stdlib').view($).registerWith(app.views);
require('janus-inspect').view($).registerWith(app.views);
require('./lib/view/app').register(app.views);
require('./lib/view/assembly').register(app.views);
require('./lib/view/block').register(app.views);
require('./lib/view/browser').register(app.views);
require('./lib/view/chrome').register(app.views);
require('./lib/view/editor').register(app.views);
require('./lib/view/exception').register(app.views);
require('./lib/view/valuator').register(app.views);

const { decorateInspectors } = require('./lib/util/inspect');
decorateInspectors(app);


////////////////////////////////////////
// init project

const { Project } = require('./lib/model/project');
const project = Project.of('./apollo')
app.set('project', project);

const view = app.view(app);
app.set('view', view);
$('#main').append(view.artifact());
view.wireEvents();

