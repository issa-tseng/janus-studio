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
}


module.exports = { App: Studio };

