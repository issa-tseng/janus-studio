const $ = require('jquery');
const { DomView, template, find, from, Model, bind } = require('janus');
const { Tab } = require('../model/app');
const { Project } = require('../model/project');
const { Assembly } = require('../model/assembly');
const { ifexists, nonblank } = require('../util/util');

const ProjectBrowser = DomView.build(Model.build(
  bind('assemblies', from.subject('assemblies').map(ifexists(assemblies =>
    assemblies.values().flatMap(a => a.get('content').map(
      ifexists(buf => Assembly.deserialize(JSON.parse(buf)))))
  )))
), $(`
  <div class="browser-project">
    <h1 class="browser-project-name"/>
    <div class="browser-assemblies">
      <div class="browser-assembly new-assembly">
        <div class="browser-assembly-name">New</div>
        <div class="new-icon">+</div>
      </div>
      <div class="saved"/>
    </div>
  </div>`
), template(
  find('.browser-project-name').text(from('name')),
  find('.new-assembly')
    .on('dblclick', (_, project, view) => {
      view.closest_(Tab).subject.set('content', new Assembly({ project }));
    }),
  find('.browser-assemblies .saved')
    .render(from.vm('assemblies')).options({ renderItem: _ => _.context('browser') })
    .on('dblclick', '.browser-assembly', (event, project, view) => {
      const assembly = $(event.currentTarget).view().subject;
      view.closest_(Tab).subject.set('content', project.open(assembly.get_('id')));
    })
));

class Box extends Model {}
const BoxView = DomView.build($('<div class="box"/>'), template());

const AssemblyBrowser = DomView.build($(`
  <div class="browser-assembly">
    <div class="browser-assembly-name"/>
    <div class="browser-assembly-bindings"/>
    <div class="browser-assembly-stacks"/>
  </div>
`), template(
  find('.browser-assembly-name').text(from('name')),
  find('.browser-assembly-bindings').render(from('statements').map(ss =>
    ss.flatMap(s => s.get('name')).filter(nonblank).take(6))),
  find('.browser-assembly-stacks').render(from('stacks').map(ss =>
    ss.flatMap(s => s.get('blocks')).map(bs => bs.map(_ => new Box()))))
));

module.exports = {
  ProjectBrowser, AssemblyBrowser,
  register(library) {
    library.register(Project, ProjectBrowser, { context: 'browser' });
    library.register(Assembly, AssemblyBrowser, { context: 'browser' });
    library.register(Box, BoxView);
  }
};

