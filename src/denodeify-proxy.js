import denodeify from 'denodeify';

const denodeifyHandler = {
  get: function (target, name) {
    return denodeify((...args) => target[name](...args));
  }
}

Object.defineProperty(Object.prototype, 'denodeify', {
  get: function () {
    return new Proxy(this, denodeifyHandler);
  }
});