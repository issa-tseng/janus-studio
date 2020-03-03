const { join } = require('path');
const { Model, attribute, initial, bind, from, List } = require('janus');
const uuid = require('uuid/v4');
const { Assembly } = require('./assembly');
const { Listing, content } = require('../util/fs');
const { ifexists } = require('../util/util');


class Project extends Model.build(
  bind('config', from('path')
    .map(path => join(path, 'project.json'))
    .flatMap(content)
    .map(ifexists(buf => new Model(JSON.parse(buf))))),

  // TODO: maybe some better way to plumb these out?
  bind('name', from('config').get('name')),
  bind('context', from('config').get('context').map(x => new Model(x))),
  bind('stylesheet', from('config').get('stylesheet').flatMap(ifexists(content))),

  // TODO: dispose of old Listing if path changes.
  bind('assemblies', from('path').map(path => new Listing(join(path, 'assemblies'))))
) {
  _initialize() {
  }

  open(id) {
    const data = JSON.parse(this.getAssembly_(id).get_('content'));
    data.project = this;
    return Assembly.deserialize(data);
  }

  getAssembly_(id) { return this.get_('assemblies').get_(id); }
  static of(path) { return new Project({ path }); }
}


module.exports = { Project };

