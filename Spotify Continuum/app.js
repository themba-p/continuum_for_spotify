const AppDOM = require("./modules/App-DOM.js");
const Common = require("./modules/common.js");
let Spotify = require("./modules/spotify.js");

let categoryTracks, categoryPlaylists, categoryAlbums;
let currentView, currentCategory;
let _nowplaying, npInterval;
let waitingForPlaybackTransfer = false;

// let font1 = new FontFace("HLVT_NT", "url('../fonts/HelveticaNowText-Regular.woff2')");
// let font2 = new FontFace("HLVT_NT", "url('../fonts/HelveticaNowText-Medium.woff2')");
// let font3 = new FontFace("HLVT_NT", "url('../fonts/HelveticaNowText-Bold.woff2')");
// document.fonts.add(font1);
// document.fonts.add(font2);
// document.fonts.add(font3);

function log(message) {
  chrome.runtime.sendMessage({
    message: "log",
    error: message,
  });
}

(() => {
  chrome.runtime.sendMessage({ message: "nowplaying" }, (nowplaying) => {
    _nowplaying = nowplaying;
    if (nowplaying) {
      AppDOM.UpdateNowplaying(nowplaying);
      initPlaybackButtons();
      initButtons();
      initialize();
    }
  });
})();

function initPlaybackButtons() {
  const playbackFunctions = {
    playPause: togglePlayback,
    skipTrack: skipTrack,
    toggleShuffle: toggleShuffle,
    toggleLike: toggleNpLike,
    toggleRepeat: toggleRepeatState,
  };

  AppDOM.InitPlaybackButtons(playbackFunctions);
}

function initButtons() {
  document
    .getElementById("sign-in-button")
    .addEventListener("click", () => signIn());

  document
    .getElementById("sign-out-button")
    .addEventListener("click", () => signOut());

  document
    .querySelector("#no-network-view .retry-button")
    .addEventListener("click", () => checkFailureReason());

  document
    .querySelector("#no-device-view .retry-button")
    .addEventListener("click", () => checkFailureReason());

  document
    .querySelector("#top-nav .close-button")
    .addEventListener("click", () => {
      if (currentView && currentView === Common.View.Search) {
        switchView(Common.View.Library);
        switchCategory(currentCategory, true);
      } else {
        switchView(Common.View.Player);
      }
    });

  document.getElementById("search-button").addEventListener("click", () => {
    AppDOM.ClearListView();
    AppDOM.ToggleLibraryFilter(false);
    switchView(Common.View.Search);
    switchCategory(Common.MediaType.Track);
  });

  document
    .getElementById("search-bar")
    .addEventListener("input", (e) =>
      loadSearch(e.target.value, currentCategory)
    );

  document
    .getElementById("filter-library-button")
    .addEventListener("click", () => {
      AppDOM.ToggleLibraryFilter(true);
    });

  document
    .getElementById("filter-close-button")
    .addEventListener("click", () => {
      AppDOM.ToggleLibraryFilter(false);
      const filterBar = document.getElementById("filter-bar");
      if (filterBar.value) {
        filterBar.value = "";
      }
    });

  document
    .getElementById("filter-bar")
    .addEventListener("input", (e) =>
      filterLibrary(e.target.value, currentCategory)
    );

  document.getElementById("library-button").addEventListener("click", () => {
    switchView(Common.View.Library).then(() =>
      switchCategory(Common.MediaType.Track)
    );
  });

  document.getElementById("profile-button").addEventListener("click", () => {
    if (currentView != Common.View.Profile) {
      switchView(Common.View.Profile);
    } else {
      switchView(Common.View.Player);
    }
  });

  document.getElementById("devices-button").addEventListener("click", () => {
    if (currentView !== Common.View.Devices) {
      switchView(Common.View.Devices);
      loadDevices();
    } else {
      switchView(Common.View.Player);
    }
  });

  document
    .getElementById("refresh-devices-button")
    .addEventListener("click", () => {
      switchView(Common.View.Devices);
      loadDevices();
    });
}

async function initialize() {
  await switchView(Common.View.Player);
  AppDOM.ShowLoadingIndicator(Common.View.Library);

  chrome.runtime.sendMessage({ message: "login" }, async (response) => {
    AppDOM.ShowLoadingIndicator(Common.View.Player, false);

    if (response && response.token) {
      Spotify.prototype.setAccessToken(response.token);
      loadNowplaying();
      loadProfile();
    } else {
      checkFailureReason();
    }
  });
}

function initCategories() {
  if (
    categoryTracks != null &&
    categoryPlaylists != null &&
    categoryAlbums != null
  ) {
    return;
  }

  categoryTracks = document.getElementById("category-tracks");
  categoryPlaylists = document.getElementById("category-playlists");
  categoryAlbums = document.getElementById("category-albums");

  categoryTracks.addEventListener("click", () =>
    switchCategory(Common.MediaType.Track)
  );
  categoryPlaylists.addEventListener("click", () =>
    switchCategory(Common.MediaType.Playlist)
  );
  categoryAlbums.addEventListener("click", () =>
    switchCategory(Common.MediaType.Album)
  );
}

function signIn() {
  AppDOM.ShowLoadingIndicator(Common.View.Login);
  chrome.runtime.sendMessage({ message: "authenticate" }, () => {
    AppDOM.ShowLoadingIndicator(Common.View.Login, false);
    initialize();
  });
}

function signOut() {
  chrome.runtime.sendMessage({ message: "logout" }, (response) => {
    AppDOM.ClearDevicesView();
    AppDOM.ClearListView();
    AppDOM.ClearNowplaying();
    _nowplaying = null;
    if (npInterval) clearInterval(npInterval);
    AppDOM.SwitchView(Common.View.Login);
  });
}

async function checkFailureReason() {
  AppDOM.ShowLoadingIndicator(Common.View.NoXView);

  // log("checking failure reason...");

  chrome.runtime.sendMessage({ message: "login" }, async (response) => {
    if (response && response?.token) {
      if (await Common.IsConnected()) {
        // log("network connection active...");

        if (!(await hasActiveDevices())) {
          AppDOM.ShowLoadingIndicator(Common.View.NoXView, false);
          // log("no active devices!");
          switchView(Common.View.NoDevice);
        } else {
          AppDOM.ShowLoadingIndicator(Common.View.NoXView, false);
          // generic error
        }
      } else {
        AppDOM.ShowLoadingIndicator(Common.View.NoXView, false);
        // log("no network connection...");
        switchView(Common.View.NoNetwork);
      }
    } else {
      if (await Common.IsConnected()) {
        AppDOM.ShowLoadingIndicator(Common.View.NoXView, false);
        // log("user is not logged in!");
        switchView(Common.View.Login);
      } else {
        AppDOM.ShowLoadingIndicator(Common.View.NoXView, false);
        // log("no network connection...");
        switchView(Common.View.NoNetwork);
      }
    }
  });
}

function hasActiveDevices() {
  return Spotify.prototype.hasDevices();
}

function switchView(view) {
  if (currentView === view) return;
  const oldValue = currentView;
  currentView = view;
  return AppDOM.SwitchView(view, oldValue);
}

function switchCategory(category, force = false) {
  initCategories();

  if (currentCategory === category && !force) return;

  currentCategory = category;

  const active = "list-view-nav-item active";
  const inactive = "list-view-nav-item";

  switch (category) {
    case Common.MediaType.Track:
      categoryPlaylists.className = inactive;
      categoryAlbums.className = inactive;
      categoryTracks.className = active;
      break;
    case Common.MediaType.Playlist:
      categoryTracks.className = inactive;
      categoryAlbums.className = inactive;
      categoryPlaylists.className = active;
      break;
    case Common.MediaType.Album:
      categoryTracks.className = inactive;
      categoryPlaylists.className = inactive;
      categoryAlbums.className = active;
      break;
  }

  if (currentView) {
    currentView === Common.View.Library
      ? loadLibrary(category)
      : loadSearch(document.getElementById("search-bar").value, category);
  }
}

function loadProfile() {
  chrome.runtime.sendMessage({ message: "profile" }, (result) => {
    if (result && result.item) {
      AppDOM.UpdateProfile(result.item);
    } else {
      Spotify.prototype.getUserProfile().then((user) => {
        if (user) {
          AppDOM.UpdateProfile(user);
          chrome.runtime.sendMessage({ message: "profile", item: user });
        } else {
          checkFailureReason();
        }
      });
    }
  });
}

function updatePlaybackState(response) {
  if (_nowplaying) {
    if (_nowplaying.shuffleState != response.shuffleState) {
      AppDOM.ToggleShuffleState(response);
    }

    if (_nowplaying.isPlaying != response.isPlaying) {
      AppDOM.TogglePlaybackState(response);
    }

    if (_nowplaying.repeatState != response.repeatState) {
      AppDOM.ToggleRepeatState(response);
    }

    if (response?.isSaved) {
      if (response.isSaved != _nowplaying.isSaved)
        AppDOM.ToggleLikeState(response.isSaved);
    } else {
      AppDOM.ToggleLikeState(false);
    }

    if (_nowplaying.device) {
      if (_nowplaying.device.id != response.device.id) {
        if (waitingForPlaybackTransfer)
          {
            waitingForPlaybackTransfer = false;
            AppDOM.ShowLoadingIndicator(Common.View.Devices, false);
          }

        AppDOM.UpdateActiveDevice(response.device);
      }
    }
  }
}

function probeNowplaying() {
  Spotify.prototype.getPlaybackState().then(async (response) => {
    if (response) {
      AppDOM.TogglePlackbackDisabledState(false);
      if (_nowplaying && _nowplaying.id != response.id) {
        AppDOM.ShowLoadingIndicator(Common.View.Player);

        AppDOM.ClearNowplaying();
        AppDOM.UpdateNowplaying(response);

        //isCurrentTrackSaved(response.id);
        response.isSaved = await Spotify.prototype.isTracksSaved(response.id);
        chrome.runtime.sendMessage({ message: "nowplaying", item: response });
        AppDOM.ShowLoadingIndicator(Common.View.Player, false);
      }

      updatePlaybackState(response);
      _nowplaying = response;
    }
  });
}

function loadNowplaying(switchToView = true) {
  if (switchToView) switchView(Common.View.Player);
  AppDOM.ShowLoadingIndicator(Common.View.Player);

  AppDOM.ClearNowplaying();
  if (npInterval) clearInterval(npInterval);
  Spotify.prototype
    .getPlaybackState()
    .then(async (response) => {
      if (response) {
        AppDOM.TogglePlackbackDisabledState(false);

        chrome.runtime.sendMessage({ message: "nowplaying", item: response });
        AppDOM.UpdateNowplaying(response);
        if (response.device) AppDOM.UpdateActiveDevice(response.device);
        response.isSaved = await Spotify.prototype.isTracksSaved(response.id);
        updatePlaybackState(response);
        _nowplaying = response;
      } else {
        AppDOM.TogglePlackbackDisabledState(true);
        checkFailureReason();
      }
    })
    .catch((e) => {
      log("Playback error, please try again.");
      AppDOM.TogglePlackbackDisabledState(true);
      checkFailureReason();
    })
    .finally(() => {
      npInterval = setInterval(probeNowplaying, 1000);
      AppDOM.ShowLoadingIndicator(Common.View.Player, false);
    });
}

function loadListViewItems(items) {
  if (!items) return;

  AppDOM.ClearListView();

  for (let item of items) {
    if (item.type === Common.MediaType.Track) {
      if (currentView && currentView === Common.View.Library) {
        AppDOM.AddToListViewContent(item, playSavedTracks, queueTrack);
      } else {
        AppDOM.AddToListViewContent(item, playMedia, queueTrack);
      }
    } else {
      AppDOM.AddToListViewContent(item, playMedia);
    }
  }
  AppDOM.AnimateListViewItems(currentView);
}

let _listviewCollection;

function loadLibrary(mediaType) {
  AppDOM.ShowLoadingIndicator(Common.View.Library);
  AppDOM.ClearListView();

  Spotify.prototype
    .getAllMedia(mediaType)
    .then((response) => {
      _listviewCollection = response;
      loadListViewItems(response);
    })
    .finally(() => {
      AppDOM.ShowLoadingIndicator(Common.View.Library, false);
    });
}

function filterLibrary(query, mediaType) {
  if (!_listviewCollection) return;
  const items = _listviewCollection;
  const results = [];
  let titleMatches, artistMatches;

  // you need to cache users library.
  if (query) {
    query = query.toLowerCase();
    titleMatches = items.filter((item) =>
      item.name.toLowerCase().includes(query)
    );

    switch (mediaType) {
      case Common.MediaType.Track:
      case Common.MediaType.Album:
        artistMatches = items.filter((track) => {
          const artists = track.author.split(",");
          let matches = artists.filter((artist) =>
            artist.toLowerCase().includes(query)
          );
          if (matches && matches.length > 0) {
            return matches;
          } else {
            return;
          }
        });
        break;
    }

    if (titleMatches) results.push(...titleMatches);
    if (artistMatches) results.push(...artistMatches);

    loadListViewItems(results);
  } else {
    loadListViewItems(items);
  }
}

function loadDevices() {
  AppDOM.ClearDevicesView();
  AppDOM.ShowLoadingIndicator(Common.View.Devices);

  Spotify.prototype
    .getDevices()
    .then((devices) => {
      AppDOM.ShowLoadingIndicator(Common.View.Devices, false);

      if (devices && devices.length > 0) {
        devices.forEach((device) => {
          AppDOM.AddDevice(device, transferPlayback);
        });

        AppDOM.AnimateListViewItems(currentView);
      } else {
        log("No active devices!");
        //switchView(Common.View.NoDevice); debug
      }
    })
    .finally(() => AppDOM.ShowLoadingIndicator(Common.View.Devices, false));
}

async function loadSearch(query, mediaType) {
  AppDOM.ClearListView();

  if (!query) {
    return;
  }

  AppDOM.ShowLoadingIndicator(Common.View.Search);

  let response = await Spotify.prototype.search(query, mediaType);
  if (response) {
    loadListViewItems(response);
    AppDOM.ShowLoadingIndicator(Common.View.Search, false);
  } else {
    log("error searching...");
    checkFailureReason();
    AppDOM.ShowLoadingIndicator(Common.View.Search, false);
  }
}

function playSavedTracks(uri) {
  AppDOM.ShowLoadingIndicator(Common.View.Library);

  Spotify.prototype.getAllMedia(Common.MediaType.Track).then((response) => {
    if (response) {
      let offset = response.findIndex((c) => c.uri === uri);
      if (offset < 0) offset = 0;
      const uris = response.map((item) => item.uri);
      playMedia(null, uris, offset);

      AppDOM.ShowLoadingIndicator(Common.View.Library, false);
    } else {
      AppDOM.ShowLoadingIndicator(Common.View.Library, false);
    }
  });
}

function playMedia(contextUri, uris = [], offset = 0) {
  AppDOM.ShowLoadingIndicator(Common.View.Library);

  Spotify.prototype
    .playMedia(contextUri, uris, offset)
    .then(() => {
      AppDOM.ShowLoadingIndicator(Common.View.Library, false);

      loadNowplaying(false);
    })
    .finally(() => AppDOM.ShowLoadingIndicator(Common.View.Library, false));
}

function queueTrack(uri) {
  AppDOM.ShowLoadingIndicator(Common.View.Player);

  Spotify.prototype
    .queue(uri)
    .then((response) => {
      if (response) {
        AppDOM.ShowMessagePopup("Track succesfully added to queue.");
      } else {
        AppDOM.ShowMessagePopup("An error occured, please try again.");
      }
    })
    .finally(() => AppDOM.ShowLoadingIndicator(Common.View.Player, false));
}

function togglePlayback(play = true) {
  if (play) {
    Spotify.prototype.play().then((response) => handleResponse(response));
  } else {
    Spotify.prototype.pause().then((response) => handleResponse(response));
  }

  function handleResponse(response) {
    if (!response) return;
    Spotify.prototype.getPlaybackState().then((nowplaying) => {
      if (nowplaying) AppDOM.TogglePlaybackState(nowplaying);
    });
  }
}

function skipTrack(next = true) {
  AppDOM.ShowLoadingIndicator(Common.View.Player);
  AppDOM.ClearNowplaying();

  Spotify.prototype
    .skipTrack(next)
    .then(() => {
      AppDOM.ShowLoadingIndicator(Common.View.Player, false);
      loadNowplaying(false);
    })
    .catch(() => AppDOM.ShowLoadingIndicator(Common.View.Player, false));
}

async function toggleShuffle() {
  let nowplaying = _nowplaying;
  if (!nowplaying) nowplaying = await Spotify.prototype.getPlaybackState();

  if (!nowplaying) return;
  AppDOM.ToggleShuffleState({ shuffleState: !nowplaying.shuffleState });

  Spotify.prototype.toggleShuffle(nowplaying.shuffleState).then(() => {
    Spotify.prototype.getPlaybackState().then((np) => {
      if (np && np.shuffleState != !nowplaying.shuffleState)
        AppDOM.ToggleShuffleState(np);
    });
  });
}

async function toggleNpLike() {
  let nowplaying = _nowplaying;
  if (!nowplaying) nowplaying = await Spotify.prototype.getPlaybackState();

  if (!nowplaying) return;
  let isNpSaved = nowplaying?.isSaved;
  if (isNpSaved === undefined)
    isNpSaved = await Spotify.prototype.isTracksSaved(nowplaying.id);

  if (isNpSaved != undefined) return;
  AppDOM.ToggleLikeState(!isNpSaved);

  Spotify.prototype
    .toggleSavedTrack(nowplaying.id, isNpSaved)
    .then((isSavedStatus) => {
      if (isSavedStatus != !isNpSaved) AppDOM.ToggleLikeState(isSavedStatus);
    });
}

async function transferPlayback(deviceId) {
  if (_nowplaying && _nowplaying.device && _nowplaying.device.id === deviceId) {
    return;
  }

  AppDOM.ShowLoadingIndicator(Common.View.Devices);

  await Spotify.prototype.transferPlayback(deviceId);
  AppDOM.UpdateDevicesActiveDevice(deviceId);

  AppDOM.ShowLoadingIndicator(Common.View.Devices, false);

  waitingForPlaybackTransfer = true;
  AppDOM.ShowLoadingIndicator(Common.View.Player);
}

async function toggleRepeatState() {
  let np = _nowplaying;
  if (!np) np = await Spotify.prototype.getPlaybackState();

  if (!np) return;

  let newState = getNewRepeatState(np);

  if (newState) {
    AppDOM.ToggleRepeatState({ repeatState: newState });

    await Spotify.prototype.setRepeat(newState);
    const playbackState = await Spotify.prototype.getPlaybackState();
    if (playbackState && playbackState.repeatState != newState) {
      AppDOM.ToggleRepeatState(playbackState);
    }
  }
}

function getNewRepeatState({ repeatState }) {
  switch (repeatState) {
    case Common.RepeatState.Off:
      return Common.RepeatState.Context;
    case Common.RepeatState.Context:
      return Common.RepeatState.Track;
    case Common.RepeatState.Track:
      return Common.RepeatState.Off;
  }
}

// browserify app.js -o bundle.js