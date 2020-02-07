const { Model, attribute, initial, bind, from, List } = require('janus');
const uuid = require('uuid/v4');


class IdAttribute extends attribute.Text {
  get writeInitial() { return true; }
  initial() { return uuid(); }
}


class Statement extends Model.build(
  attribute('id', IdAttribute),
  attribute('name', attribute.Text),
  attribute('code', attribute.Text)
) {}
const Statements = List.of(Statement);


class Reference extends Model.build(
  initial.writing('type', 'reference')
  // to: reference to statement id
) {}

class Action extends Model.build(
  initial.writing('type', 'action'),
  attribute('id', IdAttribute),
  attribute('code', attribute.Text)
) {}

const classMap = { reference: Reference, action: Action };
class Stack extends Model.build(
  attribute('name', attribute.Text),
  attribute('wider', attribute.Boolean),
  attribute('members', class extends attribute.List {
    static deserialize(data) {
      const list = [];
      for (const item of data) list.push(new (classMap[item.type])(item));
      return new List(list);
    }
  })
) {}
const Stacks = List.of(Stack);


class Assembly extends Model.build(
  attribute('id', IdAttribute),
  attribute('name', attribute.Text),
  attribute('statements', attribute.List.of(Statements)),
  attribute('stacks', attribute.List.of(Stacks))
) {}
const Assemblies = List.of(Assembly);

class Project extends Model.build(
  attribute('context', attribute.Model.of(Model)),
  attribute('assemblies', attribute.List.of(Assemblies))
) {
  getAssembly(id) { this.get_('assemblies').list.find(a => a.get_('id') === id); }
}


module.exports = {
  Statement, Statements,
  Stack, Stacks, Reference, Action,
  Assembly, Assemblies,
  Project
};

