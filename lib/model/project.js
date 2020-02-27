const { Model, attribute, initial, bind, from, List } = require('janus');
const uuid = require('uuid/v4');
const { Assemblies } = require('./assembly');


class Project extends Model.build(
  attribute('context', attribute.Model.of(Model)),
  attribute('assemblies', attribute.List.of(Assemblies))
) {
  _initialize() {
    // inject our own context into assemblies that come our way.
    // TODO: sort of gross.
    this.get('assemblies').react(as => {
      for (const a of as) a.set('project', this);
      as.on('added', (a => { a.set('project', this); }));
    });
  }
  getAssembly(id) { this.get_('assemblies').list.find(a => a.get_('id') === id); }
}


module.exports = { Project };

