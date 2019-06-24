const mongoose = require('mongoose');

const request = require('request');

const Show = mongoose.model('showtracker');

// MONGO routes

exports.testDb = function testDb(req, res) {
  mongoose.connect('mongodb://localhost/showtracker', (err) => {
    if (err) {
      res.json({ message: `Mongoose Connection FAILED: ${err.message}` });
    } else {
      res.json({ message: 'Mongoose Connection Successful' });
    }
  });
};

exports.addShow = function addShow(req, res) {
  new Show(req.query).save((err, show) => {
    if (err) {
      res.send(err.message);
    } else {
      res.json(show);
    }
  });
};

exports.removeShow = function removeShow(req, res) {
  Show.remove(
    {
      id: req.query.id,
    },
    (err) => {
      if (err) {
        res.send(err);
      } else {
        res.json({ message: `Show ${req.query.id} removed` });
      }
    },
  );
};

async function getShowList() {
  return new Promise((resolve, reject) => {
    Show.find({}, (err, showList) => {
      if (err) {
        reject(err);
      } else {
        resolve(showList);
      }
    });
  });
}

exports.listShows = async function listShows(req, res) {
  try {
    res.json(await getShowList());
  } catch (err) {
    res.send(err.message);
  }
};

// TVDB routes

async function getBearerToken() {
  return new Promise((resolve, reject) => {
    request.post(
      'https://api.thetvdb.com/login',
      {
        json: {
          apikey: process.env.TVDB_API_KEY,
        },
      },
      (err, tvdbRes, body) => {
        if (err) {
          reject(err);
        } else {
          resolve(body.token);
        }
      },
    );
  });
}

exports.findShow = async function findShow(req, res) {
  let bearerToken;

  try {
    bearerToken = await getBearerToken();
  } catch (err) {
    res.send(err.message);
  }

  request.get(
    'https://api.thetvdb.com/search/series',
    {
      qs: {
        name: req.query.name,
      },
      auth: {
        bearer: bearerToken,
      },
    },
    (err, tvdbRes) => {
      if (err) {
        res.send(err.message);
      } else {
        res.send(tvdbRes);
      }
    },
  );
};

async function getShowOrEpisodeInfo(queryId, episodeFlag) {
  const bearerToken = await getBearerToken();

  return new Promise((resolve, reject) => {
    request.get(
      `https://api.thetvdb.com/series/${queryId}${episodeFlag ? '/episodes' : ''}`,
      {
        auth: {
          bearer: bearerToken,
        },
      },
      (err, tvdbRes) => {
        if (err) reject(err);
        else {
          resolve(JSON.parse(tvdbRes.body));
        }
      },
    );
  });
}

exports.showInfo = async function showInfo(req, res) {
  try {
    res.json(await getShowOrEpisodeInfo(req.query.id, false));
  } catch (err) {
    res.send(err.message);
  }
};

exports.episodeInfo = async function episodeInfo(req, res) {
  try {
    res.json(await getShowOrEpisodeInfo(req.query.id, true));
  } catch (err) {
    res.send(err.message);
  }
};

function makeEpisodeSummary(episode, showName) {
  const episodeSummary = {};
  episodeSummary.id = episode.id;
  episodeSummary.episodeName = episode.episodeName;
  episodeSummary.shortName = `S${`0${episode.airedSeason}`.slice(-2)}E${`0${
    episode.airedEpisodeNumber
  }`.slice(-2)}`;
  episodeSummary.airedEpisodeNumber = episode.airedEpisodeNumber;
  episodeSummary.firstAired = episode.firstAired;
  episodeSummary.showName = showName;
  return episodeSummary;
}

async function getShowCalendar() {
  return new Promise(async (resolve, reject) => {
    try {
      const showList = await getShowList();
      let episodeList;
      const allEpisodes = [];

      /* eslint-disable no-await-in-loop */
      for (const show of showList) {
        episodeList = (await getShowOrEpisodeInfo(show.id, true)).data;
        for (const episode of episodeList) {
          if (episode.airedSeason !== 0) {
            allEpisodes.push(makeEpisodeSummary(episode, show.name));
          }
        }
      }

      // sort the date list
      allEpisodes.sort((a, b) => {
        const dateA = new Date(a.firstAired);
        const dateB = new Date(b.firstAired);
        return dateA - dateB;
      });

      resolve(allEpisodes);
    } catch (err) {
      reject(err);
    }
  });
}

exports.getShowCalendar = async function _getShowCalendar(req, res) {
  try {
    res.json(await getShowCalendar());
  } catch (err) {
    res.send(err.message);
  }
};

/**
  this version groups and sorts shows, but i'm not sure the client will need it

  async function getShowCalendar() {
  return new Promise(async (resolve, reject) => {
    try {
      const showList = await getShowList();
      var episodeList, episodeSummary;
      var allEpisodes = [];
      var episodesGroupedByDate = {};

      var allEpisodesIndex =0;

      for (const show of showList) {
        episodeList = (await getShowOrEpisodeInfo(show.id, true)).data;
        for (const episode of episodeList) {
          if (episode.airedSeason != "0") {
            episodeSummary = makeEpisodeSummary(episode, show.name);

            if (
               episodesGroupedByDate[episodeSummary.firstAired] ==
              null
            ) {
              episodesGroupedByDate[episodeSummary.firstAired] = allEpisodesIndex;
              allEpisodes[allEpisodesIndex++] = [episodeSummary];
            } else {
              allEpisodes[episodesGroupedByDate[episodeSummary.firstAired]].push(episodeSummary);
            }
          }
        }
      }

      //sort the date list
      allEpisodes.sort((a, b) => {
        var dateA = new Date(a[0].firstAired),
          dateB = new Date(b[0].firstAired);
       return dateA - dateB;
      });

      //sort the episodes in the date list
      for(var episodesOnThisDay of allEpisodes)
      {
        episodesOnThisDay.sort((a, b) => {
          var dateA = new Date(a.firstAired),
            dateB = new Date(b.firstAired);

          return a.firstAired === b.firstAired
            ? a.airedEpisodeNumber - b.airedEpisodeNumber
           : dateA - dateB;
        });
      }

      resolve(allEpisodes);
    } catch (err) {
      reject(err);
    }
  });
} */
