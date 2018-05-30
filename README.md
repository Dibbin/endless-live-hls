# Endless Live HLS Stream

## Setup
```
npm install
```

## Start Server
```
npm run start
```

## Useage
1) Visit [localhost:3000/master.m3u8](localhost:3000/master.m3u8) to view example video
1) Use url argument `targetManifest` to run vs another video: [localhost:3000/master.m3u8?targetManifest=http://localhost:3000/example-video/index.m3u8](localhost:3000/master.m3u8?targetManifest=http://localhost:3000/example-video/index.m3u8) 
    1) You may need to `encodeURIComponent` the `targetManifest` argument.
1) Use url argument `startTime` to set the duration of the live stream in seconds on first request: [localhost:3000/master.m3u8?startTime=500](localhost:3000/master.m3u8?startTime=500) 
4) The sever will add an argument `initTime` to the url which is used for timing purposes. Delete this url argument to have the stream start over.


