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
    res.redirect(url.format({
      pathname:"/level.m3u8",
      query: Object.assign(req.query, {
        initTime: new Date().getTime()
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
  const {
    initTime,
    targetManifest
  } = req.query;
  const manifestBaseUrl = targetManifest.split('/').slice(0,-1).join('/');

  const currentTime = new Date().getTime() - Number(initTime);
  // const [ ,targetDurationStr] = manifest.match(/#EXT-X-TARGETDURATION:(.+)$/);
  // const targetDuration = Number(targetDurationStr);
  const targetDuration = 6;
  const targetFragmentCount = Math.floor(currentTime / (targetDuration * 1000));


  let count = 0;
  let totalDuration = 0;
  let response = [];

  while (totalDuration * 1000 < currentTime) {

    if (count > 0) {
      response.push('#EXT-X-DISCONTINUITY')
    }

    let nextFragDuration = 6;
    response = response.concat(manifest.split('\n')
      .filter(line => {
        if (count !== 0) {
          if ( line.indexOf('#EXT-X') !== -1 ||
            line.indexOf('#EXTM3U') !== -1) {
            return false;
          }
        }
        return line &&
          line.indexOf('#EXT-X-ENDLIST') === -1;
      })
      .filter(line => {
        if (totalDuration * 1000 >= currentTime) {
          return false;
        }
        if (line.indexOf('.ts') !== -1) {
          count++;
          totalDuration += nextFragDuration;
        } else {
          try {
            const [ ,duration] = line.match(/#EXTINF:(\d+\.\d+)/);
            if (duration) {
              nextFragDuration = Number(duration);
            }
          } catch (e) {
            // don't do anything
          }
        }
        return true;
      })
      .map(line => {
        if(line.indexOf('.ts') !== -1) {
          //todo handle lines that start with /
          const fullFragmentUrl = line.indexOf('http') === -1 ? manifestBaseUrl + '/' + line : line;
          return fullFragmentUrl;
        }
        return line;
      }));
      // .join('\n');
  }

  return response.join('\n');
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
    // .then(manifest => {
    //   res.send(`
    //             <h2>rewritten manifest response:</h2>
    //             <pre>${rewriteManifest(req, manifest)}</pre>`)
    // });
});
module.exports = router;
