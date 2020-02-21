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

  transfer(source, target) {
    const transfer = new Transfer(source, target);
    const list = this.get_('transfer');
    list.add(transfer);
    return this.get_('view').into_(list).into_(transfer);
  }
}


module.exports = { App: Studio };

