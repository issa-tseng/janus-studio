const { DomView, template, find, from, Model, bind, attribute, match, otherwise } = require('janus');
const { give, exists, ifExists, nonblank } = require('../util/util');
const { inspect } = require('../util/inspect');
const { Atom, Polymer } = require('../exec/machine');


const AtomView = DomView.build(
  Model.build(
    bind('has-name', from('statement').get('name').map(nonblank)),
    bind('result', from.subject('result').map(ifExists((result) => result.mapSuccess(inspect).get()))),
    bind('status', from.subject('result').map(match(
      inert(give('inert')), success(give('success')), fail(give('fail')), otherwise(give('none'))))),

    attribute('panel', attribute.Boolean),
    bind('context', from('panel').map(p => p ? 'panel' : null))
  ), $(`
  <div class="atom">
    <div class="atom-left">
      <div class="atom-name"/>
      <div class="atom-toolbox">
        <button class="atom-insert" title="Add atom">+</button>
        <span class="atom-panel" title="View as panel"/>
        <button class="atom-remove" title="Delete statement">&times;</button>
      </div>
    </div>
    <div class="atom-code"/>
    <div class="atom-result"/>
  </div>
`), template(
  find('.atom')
    .classed('has-name', from.vm('has-name'))
    .classed('has-result', from('result').map(exists))
    .classGroup('status-', from.vm('status')),
  find('.atom-name').render(from.attribute('name')),

  find('.atom-insert').on('click', (e, atom, view) => {
    const polymer = view.closest_(Polymer).subject;
    const idx = polymer.get_('atoms').list.indexOf(atom);
    polymer.createStatement(idx);
  }),
  find('.atom-remove').on('click', (e, atom) => {
    atom.destroy();
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

module.exports = {
  AtomView,
  register(library) {
    library.register(Atom, AtomView);
    library.register(Polymer, PolymerView);
  }
};

