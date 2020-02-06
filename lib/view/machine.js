const { DomView, template, find, from, Model, bind, attribute, match, otherwise } = require('janus');
const { give, exists, ifexists, blank, nonblank } = require('../util/util');
const { inspect } = require('../util/inspect');
const { Atom, Polymer } = require('../exec/machine');
const { Assembly, Reference } = require('../model');


const AtomView = DomView.build(
  Model.build(
    bind('has-name', from.subject('statement').get('name').map(nonblank)),
    bind('result', from.subject('result').map(ifexists((result) => result.mapSuccess(inspect).get()))),
    bind('status', from.subject('result').map(match(
      inert(give('inert')), success(give('success')), fail(give('fail')), otherwise(give('none'))))),

    attribute('panel', attribute.Boolean),
    bind('context', from('panel').map(p => p ? 'panel' : null))
), $(`
  <div class="atom">
    <button class="atom-insert" title="Add atom">+</button>
    <button class="atom-remove" title="Delete statement">&times;</button>
    <div class="atom-code"/>
    <div class="atom-lower">
      <span class="atom-name-edit"/>
      <span class="atom-name"><span class="name"/><span class="binding"/></span>
      <span class="atom-result"/>
      <span class="atom-panel" title="View as panel"/>
    </div>
  </div>
`), template(
  find('.atom')
    .classed('has-name', from.vm('has-name'))
    .classGroup('status-', from.vm('status'))
    .classed('has-result', from('result').map(exists))
    .classed('is-panel', from.vm('panel')),

  find('.atom-name-edit').render(from('statement').attribute('name'))
    .options({ placeholder: 'result' }),
  find('.atom-name .name').text(from('statement').get('name').map(x => x || 'result')),
  find('.atom-name .binding').text(from('statement').get('name').map(x => blank(x) ? ':' : '=')),

  find('.atom-insert').on('click', (e, atom, view) => {
    const polymer = view.closest_(Polymer).subject;
    const idx = polymer.get_('atoms').list.indexOf(atom);
    polymer.createStatement(idx);
  }),
  find('.atom-remove').on('click', (e, atom) => {
    atom.get_('statement').destroy();
  }),
  find('.atom-panel').render(from.vm().attribute('panel'))
    .criteria({ style: 'button' })
    .options({ stringify: give('\u25a1') }),

  find('.atom-result').render(from.vm('result').map(inspect))
    .context(from.vm('context'))
    .options(from.app().and('env.final').all.map((app, env) =>
      ({ app: app.with({ eval: { env } }) }))),

  find('.atom-code').render(from('statement').attribute('code'))
    .criteria({ style: 'code' })
    .options(from.self().map((view) => ({ onCommit: () => view.subject.commit() })))
));

class PolymerView extends DomView.build(
  $(`<div class="polymer"/>`),
  find('.polymer').render(from('atoms'))
) {
  _initialize() { this.subject.run(); }
};


const ReferenceView = DomView.build(
  Model.build(
    bind('atom', from('view').flatMap(v => v.closest_(Assembly).into(Polymer).map(ifexists(pv => pv.subject)))
      .and.subject('to')
      .all.map(ifexists((polymer, id) => polymer.getAtom(id))))
), $(`
  <div class="reference">
    <div class="reference-target"/>
  </div>
`), template(
  find('.reference-target')
    .render(from.vm('atom').get('result').map(ifexists(x => x.getSuccess())).map(inspect))
    .context('panel')
));


module.exports = {
  AtomView, PolymerView, ReferenceView,
  register(library) {
    library.register(Atom, AtomView);
    library.register(Polymer, PolymerView);
    library.register(Reference, ReferenceView);
  }
};

