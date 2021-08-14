const proxy = require('http-proxy-middleware');

module.exports = (app) => {
  if (process.env.NODE_ENV === 'production') {
    app.use(proxy('/api', { target: 'http://api:5000/' }));
  } else {
    app.use(proxy('/api', { target: 'http://api:5000/' }));
  }
};