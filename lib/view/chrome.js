const $ = require('jquery');
const { DomView, template, find, from, Model, attribute, bind } = require('janus');
const { Project, Assembly } = require('../model');
const { Polymer } = require('../exec/machine');


const ProjectView = DomView.build(
  Model.build(
    attribute('assembly', class extends attribute.Enum {
      _values() { return from.subject('assemblies'); }
    })
  ),
  $('<div class="assembly-select"/><div class="assembly-view"/>'),
  template(
    find('.assembly-select').render(from.vm().attribute('assembly'))
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

