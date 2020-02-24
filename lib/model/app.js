const $ = require('jquery');
const { Model, App, attribute, initial, List } = require('janus');


class Studio extends App.build(
  attribute('tabs', attribute.List.withInitial()),
  attribute('active', class extends attribute.Enum {
    _values() { return from('tabs'); }
  }),

  initial.writing('flyouts', new List()),
  initial.writing('transfer', new List())
) {
  _initialize() {
    const original = this.original();
    this.listenTo(this, 'createdView', (view) => {
      if (view.subject == null) return;
      if (view.subject.isInspector !== true) return;
      original.emit('inspected', view);
    });
  }

  valuator(trigger, options, callback) {
    const assembly = trigger.closest('.assembly').view().subject;
    const valuator = assembly.valuator(trigger, options, callback);

    const flyout = trigger.closest('.flyout');
    if (flyout.length) flyout.view().subject.get_('children').add(valuator);

    return valuator;
  }
}


module.exports = { App: Studio };

