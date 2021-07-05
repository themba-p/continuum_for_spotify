"use strict";

let SpotifyWebApi = require("spotify-web-api-js");
let Common = require("./common.js");

var Spotify = (function () {
  var _accessToken = null;
  let spotifyApi;

  /**
   * Creates an instance of the wrapper
   * @constructor
   */
  var Constr = function () {};

  Constr.prototype = {
    constructor: Spotify,
  };

  Constr.prototype.setAccessToken = function (accessToken) {
    _accessToken = accessToken;

    if (_accessToken) {
      spotifyApi = new SpotifyWebApi();
      spotifyApi.setAccessToken(_accessToken);
    }
  };

  function getSteps(total, step) {
    const length = total;

    const numbers = [];
    for (let i = 0; i < length; i++) {
      numbers.push(i);
    }

    const x = (length / step).toString().split(".");
    const numTurns = Number(x[0]);

    const remainder = length % step;

    const steps = [];
    for (let i = 0; i < numTurns; i++) {
      steps.push(step);
    }
    // add the remainder step
    steps.push(remainder);
    return steps;
  }

  function log(content) {
    chrome.runtime.sendMessage({
      message: "log",
      content: content,
    });
  }

  /* 
  --------------------------------------
  SPOTIFY GET REQUESTS.
  Get data from Spotify.
  --------------------------------------
  */
  //#region Get Spotify data
  Constr.prototype.getUserProfile = () => {
    if (!_accessToken || !spotifyApi)
      return new Promise((resolve) => resolve(null));

    return spotifyApi
      .getMe()
      .then((response, err) => {
        if (err || !response) return null;

        return {
          id: response.id,
          name: response.display_name,
          imgUrl: response.images[0]?.url,
          product: response?.product,
          uri: response.uri,
        };
      })
      .catch((e) => {
        log(e);
        return null;
      });
  };

  Constr.prototype.getPlaybackState = () => {
    if (!_accessToken || !spotifyApi)
      return new Promise((resolve) => resolve(null));

    return spotifyApi
      .getMyCurrentPlaybackState()
      .then((response, err) => {
        if (err || !response || !response.item) return null;
        const repeatState =
          response.repeat_state === "track"
            ? Common.RepeatState.Track
            : response.repeat_state === "context"
            ? Common.RepeatState.Context
            : Common.RepeatState.Off;

        return {
          id: response.item?.id,
          title: response.item?.name,
          author: response.item?.artists.map((a) => a.name).join(", "),

          imgUrl:
            response.item?.album.images?.length > 2
              ? response.item.album?.images[1]?.url
              : response.item.album?.images[0]?.url,

          isPlaying: response.is_playing,
          explicit: response.item.explicit,
          shuffleState: response.shuffle_state,
          repeatState: repeatState,
          uri: response.item.uri,
          device: {
            id: response.device.id,
            isActive: response.device.is_active,
            name: response.device.name,
            type: Common.GetDeviceType(response.device.type),
          },
        };
      })
      .catch(() => null);
  };

  function getFunc(type) {
    try {
      switch (type) {
        case Common.MediaType.Track:
          return spotifyApi.getMySavedTracks;
        case Common.MediaType.Playlist:
          return spotifyApi.getUserPlaylists;
        case Common.MediaType.Album:
          return spotifyApi.getMySavedAlbums;
      }
    } catch (e) {
      return null;
    }
  }

  async function getTotal(type) {
    const func = await getFunc(type);

    const options = {
      limit: 1,
      offset: 0,
    };

    return func(options)
      .then((response, err) => {
        return err ? err : response?.total;
      })
      .catch((e) => {
        log(e);
        return null;
      });
  }

  async function getMedia(offset, limit, type) {
    let func = await getFunc(type);

    const options = {
      limit: limit,
      offset: offset,
    };

    return func(options)
      .then((response, err) => {
        return err ? null : response?.items;
      })
      .catch((e) => {
        log(e);
        return null;
      });
  }

  let cache = new Map();

  function convertMedia(item, type) {
    if (!cache.has(item)) {
      let media;
      switch (type) {
        case Common.MediaType.Track:
          if (item?.track) item = item.track;

          media = {
            id: item.id,
            name: item.name,
            author: item.artists.map((a) => a.name).join(", "),
            explicit: item.explicit,
            imgUrl: item.album?.images[2]?.url,
            uri: item.uri,
            type: type,
          };
          break;
        case Common.MediaType.Playlist:
          media = {
            id: item.id,
            name: item.name,
            author: item.owner.display_name,
            imgUrl:
              item.images.length >= 3
                ? item.images[2]?.url
                : item.images[0]?.url,
            length: item.tracks.total,
            uri: item.uri,
            type: type,
          };
          break;
        case Common.MediaType.Album:
          if (item?.album) item = item.album;

          media = {
            id: item.id,
            name: item.name,
            author: item.artists.map((a) => a.name).join(", "),
            imgUrl:
              item.images.length >= 3
                ? item.images[2]?.url
                : item.images[0]?.url,
            uri: item.uri,
            type: type,
          };
          break;
      }

      cache.set(item, media);
    }

    return cache.get(item);
  }

  const libraryCache = new Map();

  Constr.prototype.getAllMedia = async (type) => {
    if (!_accessToken || !spotifyApi)
      return new Promise((resolve) => resolve(null));

    const step = 20;

    const total = await getTotal(type);
    if (!total || total < 0 || isNaN(total)) return;

    let _cache = libraryCache.get(type);

    // what if items have been added and removed but length remains the same?
     let refresh = true;
    if (_cache) {
      if (_cache.length === total) {
        const items = await getMedia(0, 1, type);
        const item = convertMedia(items?.[0], type);
        refresh = !(item?.id === _cache?.[0].id);
      }
    }

    if (refresh) {
      const items = [];
      let offset = 0;
      const limits = getSteps(total, step);
      if (!limits) return;

      for (let limit of limits) {
        const response = await getMedia(offset, limit, type);

        if (response) {
          const files = response.map((item) => convertMedia(item, type));
          if (files) items.push(...files);
        }

        offset += limit;
      }

      libraryCache.set(type, items);
    }

    return new Promise((resolve, reject) => {
      resolve(libraryCache.get(type));
    });
  };

  Constr.prototype.search = (query, type) => {
    if (!_accessToken || !spotifyApi)
      return new Promise((resolve) => resolve(null));

    const options = {
      limit: 20,
      offset: 0,
    };
    switch (type) {
      case Common.MediaType.Track:
        return spotifyApi
          ?.searchTracks(query, options)
          .then((response, err) => handleSearchResponse(response, err, type))
          .catch(() => null);
      case Common.MediaType.Playlist:
        return spotifyApi
          .searchPlaylists(query, options)
          .then((response, err) => handleSearchResponse(response, err, type))
          .catch(() => null);
      case Common.MediaType.Album:
        return spotifyApi
          .searchAlbums(query, options)
          .then((response, err) => handleSearchResponse(response, err, type))
          .catch(() => null);
    }
  };

  function handleSearchResponse(response, err, type) {
    if (err) return null;

    switch (type) {
      case Common.MediaType.Track:
        return response.tracks.items.map((item) => convertMedia(item, type));
      case Common.MediaType.Playlist:
        return response.playlists.items.map((item) => convertMedia(item, type));
      case Common.MediaType.Album:
        return response.albums.items.map((item) => convertMedia(item, type));
    }
  }

  Constr.prototype.getDevices = () => {
    if (!_accessToken || !spotifyApi)
      return new Promise((resolve) => resolve(null));

    return spotifyApi
      .getMyDevices()
      .then((response, err) => {
        if (err || !response || !response.devices) return null;

        return response.devices.map((device) => {
          return {
            id: device.id,
            isActive: device.is_active,
            name: device.name,
            type: Common.GetDeviceType(device.type),
          };
        });
      })
      .catch((e) => {
        log(e);
        return null;
      });
  };

  Constr.prototype.hasDevices = () => {
    if (!_accessToken || !spotifyApi)
      return new Promise((resolve) => resolve(null));

    return spotifyApi
      .getMyDevices()
      .then((response, err) => {
        return !err && response?.devices?.length > 0 ? true : false;
      })
      .catch(() => {
        return false;
      });
  };

  Constr.prototype.transferPlayback = (targetDeviceId) => {
    const options = { play: true };

    return spotifyApi
      .transferMyPlayback([targetDeviceId], options)
      .catch(() => false);
  };

  Constr.prototype.setRepeat = (state) => {
    spotifyApi.setRepeat(state).catch((e) => log(e));
  };

  //#endregion

  /* 
  --------------------------------------
  SPOTIFY MEDIA CONTROL
  Control Spotify media playback.
  --------------------------------------
  */
  //#region Media Control

  Constr.prototype.playMedia = (contextUri, uris = [], offset = 0) => {
    let options = {};

    if (contextUri) options["context_uri"] = contextUri;
    if (uris && uris.length > 0) options.uris = uris;
    if (offset > 0) options.offset = { position: offset };

    return spotifyApi
      .play(options)
      .then((response, err) => {
        return err ? false : true;
      })
      .catch(() => false);
  };

  Constr.prototype.queue = (uri) => {
    return spotifyApi
      .queue(uri)
      .then(
        () => true,
        () => false
      )
      .catch(() => false);
  };

  Constr.prototype.play = () => {
    return spotifyApi
      .play()
      .then(
        () => true,
        () => false
      )
      .catch(() => false);
  };

  Constr.prototype.pause = () => {
    return spotifyApi
      .pause()
      .then(
        () => true,
        () => false
      )
      .catch(() => false);
  };

  Constr.prototype.skipTrack = (next = true) => {
    if (next) {
      return spotifyApi
        .skipToNext()
        .then(
          () => true,
          () => false
        )
        .catch(() => false);
    } else {
      return spotifyApi
        .skipToPrevious()
        .then(
          () => true,
          () => false
        )
        .catch(() => false);
    }
  };

  Constr.prototype.toggleShuffle = (shuffleState) => {
    return spotifyApi
      .setShuffle(!shuffleState)
      .then(
        () => true,
        () => false
      )
      .catch(() => false);
  };

  Constr.prototype.toggleSavedTrack = (id, isSaved) => {
    try {
      if (!isSaved) {
        return spotifyApi
          .addToMySavedTracks([id])
          .then(
            () => true,
            () => false
          )
          .catch(() => false);
      } else {
        return spotifyApi
          .removeFromMySavedTracks([id])
          .then(
            () => true,
            () => false
          )
          .catch(() => false);
      }
    } catch (e) {}
  };

  Constr.prototype.isTracksSaved = (id) => {
    return spotifyApi
      .containsMySavedTracks([id])
      .then(
        (response) => response[0],
        () => false
      )
      .catch(() => false);
  };

  //#endregion

  return Constr;
})();

if (typeof module === "object" && typeof module.exports === "object") {
  module.exports = Spotify;
}
