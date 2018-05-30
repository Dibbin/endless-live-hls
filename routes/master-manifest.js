// var url = require('url');
import url from 'url';
import fetch from 'node-fetch';
import express from 'express';

const router = express.Router();

const cache = {};
const MAX_CACHE_DURATION_MS = 2 * 60 * 60 * 1000; //2 hours

const validateUrl = (req, res) => {
  // ensure that there is a target manifest in the url
  if(!req.query.targetManifest){
    res.statusCode = 400;
    res.send('targetManifest argument missing in query');
    return false;
  }

  // ensure that we have a start time in the url
  if(!req.query.initTime) {
    const { startTime } = req.query;

    const initTime = startTime ? new Date().getTime() - Number(startTime) * 1000 : new Date().getTime();

    res.redirect(url.format({
      pathname:"/master.m3u8",
      query: Object.assign(req.query, {
        initTime: initTime
      })
    }));
    return false;
  }
  return true;
};

const fetchManifest = (url) => {
  return new Promise((resolve, reject) => {
    if (cache[url]) {
      return resolve(cache[url]);
    }

    return fetch(url)
      .then(response => response.text())
      .then(responseText => {
        cache[url] = responseText;
        setTimeout(() => {
          delete cache[url];
        }, MAX_CACHE_DURATION_MS);
        resolve(responseText);
      })
      .catch(error => {
        reject(error);
      })
  })
};

const rewriteManifest = (req, manifest) => {
  const { initTime, targetManifest } = req.query;
  const hostUrl = `http://${req.headers.host}${req.baseUrl.replace('master.m3u8','')}`;
  const manifestBaseUrl = targetManifest.split('/').slice(0,-1).join('/');

  return manifest.split('\n')
    .map(line => {
      if (line.indexOf('m3u8') === -1) {
        return line;
      } else {

        //todo handle lines that start with /
        const fullLevelUrl = line.indexOf('http') === -1 ? manifestBaseUrl + '/' + line : line;

        return `${hostUrl}level.m3u8?targetManifest=${encodeURIComponent(fullLevelUrl)}&initTime=${initTime}`
      }
    })
    .join('\n');
};


/* GET users listing. */
router.get('/', function(req, res, next) {
  if (!validateUrl(req, res)) {
    return;
  }
  const {targetManifest} = req.query;

  fetchManifest(targetManifest)
  .then(manifest => {
    res.set({
      'Content-Type' : 'application/vnd.apple.mpegurl'
    });
    res.send(rewriteManifest(req, manifest))
  });
  //   .then(manifest => {
  //     res.send(`<h2>target manifest response:</h2>
  //               <pre>${manifest}</pre>
  //               <h2>rewritten manifest response:</h2>
  //               <pre>${rewriteManifest(req, manifest)}</pre>`)
  //   });
});
module.exports = router;
