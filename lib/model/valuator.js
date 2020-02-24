const { Model, attribute, bind, from } = require('janus');
const { success } = require('../exec/eval');
const { primitive } = require('../util/util');

class Valuator extends Model.build(
  attribute('code', attribute.Text),

  bind('inject', from('values').map(pairs => {
    const inject = {};
    for (const { name, value } of pairs) inject[name] = value;
    return inject;
  }))
) {
  _initialize() {
    const initial = this.get_('initial');
    if (primitive(initial)) this.set('code', JSON.stringify(initial))
  }

  exec(assembly) {
    const result = assembly.exec(this.get_('code'), this.get_('inject'));
    this.set('result', result);
    return success.match(result);
  }

  offer() {
    const result = this.get_('result');
    if (success.match(result)) {
      this.get_('callback')(result.get());
      this.destroy();
    }
  }
}

module.exports = { Valuator };

