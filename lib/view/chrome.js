const $ = require('jquery');
const { DomView, template, find, from, Model, attribute, bind } = require('janus');
const { Project, Assembly } = require('../model');
const { Polymer } = require('../exec/machine');


const ProjectView = DomView.build(
  Model.build(
    attribute('assembly', class extends attribute.Enum {
      _values() { return from.subject('assemblies'); }
    })
  ), $(`
  <header>
    <div id="title"><h1>janus studio</h1></div>
    <div id="tabs"></div>
  </header>
  <div class="assembly-view"/>
  `), template(
    find('#tabs').render(from.vm().attribute('assembly'))
      .options({ stringify: (a => a.get('name')) }),
    find('.assembly-view').render(from.vm('assembly'))
  )
);

const AssemblyView = DomView.build(
  Model.build(
    bind('polymer', from.subject().and('view').map(view => view.closest_(Project).subject)
      .all.map((assembly, project, app) => new Polymer({ assembly, project })))
  ),
  $(`<div class="assembly">
    <h1 class="assembly-name"/>
    <div class="assembly-polymer"/>
    <div class="assembly-stacks"/>
  </div>`), template(
    find('.assembly-name').render(from.attribute('name')),
    find('.assembly-polymer').render(from.vm('polymer'))
  )
);


module.exports = {
  ProjectView, AssemblyView,
  register(library) {
    library.register(Project, ProjectView);
    library.register(Assembly, AssemblyView);
  }
};

