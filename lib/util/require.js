// hijacks require to always point at our janus-*

const Module = require('module');
const _require = Module.prototype.require;

const core = require('janus');
const stdlib = require('janus-stdlib');
const inspect = require('janus-inspect');

Module.prototype.require = function(x) {
  return (x === 'janus') ? core
    : (x === 'janus-stdlib') ? stdlib
    : (x === 'janus-inspect') ? inspect
    : _require.call(this, x);
};

