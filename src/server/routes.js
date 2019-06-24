const ctrl = require('./controller');

module.exports = function routes(app) {
  // MONGO routes
  app.route('/testdb').get(ctrl.testDb);
  app.route('/addshow').get(ctrl.addShow);
  app.route('/removeshow').get(ctrl.removeShow);
  app.route('/listShows').get(ctrl.listShows);

  // TVDB routes
  app.route('/findshow').get(ctrl.findShow);
  app.route('/showinfo').get(ctrl.showInfo);
  app.route('/episodeInfo').get(ctrl.episodeInfo);
  app.route('/getShowCalendar').get(ctrl.getShowCalendar);
};
