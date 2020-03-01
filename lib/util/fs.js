const { Map, Base, Varying } = require('janus');
const { watch, stat, readdir, readFile } = require('fs');
const { Minimatch } = require('minimatch');
const { join } = require('path');


// for getting content of a file, continually refreshed off disk.
class Content extends Base {
  constructor(path) {
    super();
    this.path = path;
    this.content = new Varying();

    this._watcher = watch(path, { persistent: false });
    this._watcher.on('change', _ => { this._update(); });
    this._update();
  }
  _update() { readFile(this.path, (_, buf) => { this.content.set(buf); }); }
  _destroy() { this._watcher.close(); }
}
const content = path => Varying.managed(
  (_ => new Content(path)),
  (c => c.content)
);


// for listing assemblies for a project.
// { id : { path, mtime?, content } }
const assemblyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.json$/i;
class Listing extends Map {
  constructor(path) {
    super();
    this._base = path;

    // set up the fs watcher and pay attention to its events.
    this._watcher = watch(path, { persistent: false });
    this._watcher.on('change', (type, name) => {
      if (!assemblyPattern.test(name)) return;

      const id = this._idForName(name);

      if (type === 'change') {
        this.get_(id).set('mtime', new Date());
      } else {
        stat(name, (err, stat) => {
          if (err && (err.code === 'ENOENT')) this.unset(name);
          else this._update(id, stat.mtime);
        });
      }
    });

    // populate the initial list.
    // TODO: possible race condition between this and the above.
    readdir(path, (err, names) => {
      if (err) console.error('cant open dir', err);
      for (const name of names) {
        if (!assemblyPattern.test(name)) continue;
        const id = this._idForName(name);
        this.set(id, new Map({ path: join(path, name) }));
        this._update(id);
      }
    });
  }

  // TODO: brittle parsing sort of i guess.
  _idForName(name) { return name.split('.')[0]; }

  _update(id, mtime) {
    const record = this.get_(id);
    record.set('mtime', mtime);

    readFile(record.get_('path'), (err, content) => {
      if (err && (err.code === 'ENOENT')) this.unset(id);
      record.set('content', content);
    });
  }
  
  _destroy() { this._watcher.close(); }
}


class Mtimer extends Base {
  constructor(path, pattern) {
    super();
    this.time = new Varying(new Date(0));
    this.pattern = new Minimatch(pattern);

    this._watcher = watch(path, { persistent: false, recursive: true });
    this._watcher.on('change', (_, name) => {
      console.log('change', name, this.pattern.match(name));
      if (this.pattern.match(name)) this.time.set(new Date());
    });
  }
  _destroy() { this._watcher.close(); }
}
const mtimer = (path, pattern) => Varying.managed(
  (_ => new Mtimer(path, pattern)),
  (m => m.time)
);

module.exports = { content, Listing, mtimer };

