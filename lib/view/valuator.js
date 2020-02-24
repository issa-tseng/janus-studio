const $ = require('jquery');
const { DomView, template, find, from, Model, List } = require('janus');
const { Valuator } = require('../model/valuator');
const { Assembly } = require('../model/machine');
const { success } = require('../exec/eval');
const { inspect } = require('../util/inspect');
const { ifexists } = require('../util/util');
const { EditorView } = require('./editor');

class Pair extends Model {}
const PairView = DomView.build(
  $('<div class="valuator-pair"><span class="k"/><span class="eq"> = </span><span class="v"/></div>'),
  template(
    find('.k').text(from('name')),
    find('.v').render(from('value').map(inspect)).options({ handle: false })
  )
);

class ValuatorView extends DomView.build($(`
  <div class="valuator">
    <div class="valuator-values"/>
    <div class="valuator-rider"/>
    <div class="valuator-code"/>
    <div class="valuator-result"/>
    <button class="valuator-offer">&#x2713;</button>
  </div>
`), template(
  find('.valuator').classed('offerable', from('result').map(success.match)),

  find('.valuator-values').render(from('values').map(ifexists(pairs =>
    new List(pairs.map(x => new Pair(x)))))),
  find('.valuator-rider').render(from('rider')),
  find('.valuator-code').render(from.attribute('code'))
    .criteria({ style: 'code' })
    .options(from.self().map(view =>
      ({ onCommit: _ => view.subject.exec(view.closest_(Assembly).subject) }))),
  find('.valuator-result').render(from('result').map(ifexists(r => r.mapSuccess(inspect).get())))
    .context('panel')
    .options({ handle: false }),
  find('.valuator-offer').on('click', (_, valuator) => { valuator.offer(); })
)) {
  _wireEvents() {
    this.into_(EditorView).focus(true);

    this.destroyWith(this.subject);
    this.subject.destroyWith(this);
  }
}


module.exports = {
  Pair, PairView, ValuatorView,
  register(library) {
    library.register(Pair, PairView);
    library.register(Valuator, ValuatorView);
  }
};

