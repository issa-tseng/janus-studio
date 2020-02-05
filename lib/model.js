const { Model, attribute, bind, from, List } = require('janus');
const uuid = require('uuid/v4');
const { blank, nonblank } = require('./util/util');
const { atomize, filterRequires, dereturn } = require('./exec/code');


class IdAttribute extends attribute.Text {
  initial() { return uuid(); }
}

class Statement extends Model.build(
  attribute('id', IdAttribute),
  attribute('name', attribute.Text),
  attribute('code', attribute.Text)
) {}
const Statements = List.of(Statement);

class Assembly extends Model.build(
  attribute('id', IdAttribute),
  attribute('name', attribute.Text),
  attribute('statements', attribute.List.of(Statements))
) {}
const Assemblies = List.of(Assembly);

class Project extends Model.build(
  attribute('context', attribute.Model.of(Model)),
  attribute('assemblies', attribute.List.of(Assemblies)),
  attribute('env', attribute.Model.of(Statement))
) {
  getAssembly(id) { this.get_('assemblies').list.find(a => a.get_('id') === id); }
}


module.exports = {
  Statement, Statements,
  Assembly, Assemblies,
  Project
};

