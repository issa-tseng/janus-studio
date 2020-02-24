const { Model, attribute, bind, from, List } = require('janus');
const { sticky, fromEvents } = require('janus-stdlib').varying;

class Flyout extends Model.build(
  attribute('children', attribute.List.withInitial()),

  bind('hover.trigger', from('trigger').flatMap((trigger) =>
    fromEvents(trigger, true, { mouseenter: true, mouseleave: false }))),

  bind('active.target', from('hover.target').pipe(sticky({ true: 300 }))),
  bind('active.trigger', from('hover.trigger').pipe(sticky({ true: 300 }))),
  bind('active.children', from('children').flatMap((children) => children.nonEmpty())),
  bind('active.net', from('active.target').and('active.trigger').and('active.children')
    .all.map((x, y, z) => x || y || z))
) {
  _initialize() {
    // first, destroy ourselves if our subject is, or we're ever not active.
    this.destroyWith(this.get_('subject'));
    this.reactTo(this.get('active.net'), false, (active) => {
      if (!active) this.destroy();
    });

    // and then add ourselves onto our flyout parent.
    const parent = this.get_('trigger').closest('.flyout');
    if (parent.length)
      parent.data('view').subject.get_('children').add(this);
  }
}

class Sticky extends Model {}

module.exports = { Flyout, Sticky };

