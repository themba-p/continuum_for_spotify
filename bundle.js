(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const AppDOM = require("./modules/App-DOM.js");
const Common = require("./modules/common.js");
let Spotify = require("./modules/spotify.js");

let categoryTracks, categoryPlaylists, categoryAlbums;
let currentView, currentCategory;
let _nowplaying, npInterval;
let waitingForPlaybackTransfer = false;

function log(content) {
  chrome.runtime.sendMessage({
    message: "log",
    content: content,
  });
}

(() => {
  initPlaybackButtons();
  initButtons();
  AppDOM.Initialize();
  initialize();
})();

async function initialize() {
  log("Initializing...");
  AppDOM.ShowLoadingIndicator(Common.View.Library);
  switchView(Common.View.Login);
  // chrome.runtime.sendMessage({ message: "login" }, async (response) => {
  //   AppDOM.ShowLoadingIndicator(Common.View.Player, false);
  //   if (response.token) {
  //     Spotify.prototype.setAccessToken(response.token);
  //     loadNowplaying();
  //     loadProfile();
  //     AppDOM.SetButtonsDisabled(false);
  //   } else {
  //     checkFailureReason();
  //   }
  // });
}

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
  chrome.runtime.sendMessage({ message: "authenticate" }, function(response) {
    log("authentication callback running..." + response);
    AppDOM.ShowLoadingIndicator(Common.View.Login, false);
    if (chrome.runtime.lastError) log(chrome.runtime.lastError);
    else initialize();
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
  chrome.runtime.sendMessage({ message: "login" }, async (response) => {
    if (response && response?.token) {
      if (await Common.IsConnected()) {
        if (!(await hasActiveDevices())) {
          AppDOM.ShowLoadingIndicator(Common.View.NoXView, false);
          switchView(Common.View.NoDevice);
        } else {
          AppDOM.ShowLoadingIndicator(Common.View.NoXView, false);
          switchView(Common.View.Player);
        }
      } else {
        AppDOM.ShowLoadingIndicator(Common.View.NoXView, false);
        switchView(Common.View.NoNetwork);
      }
    } else {
      if (await Common.IsConnected()) {
        AppDOM.ShowLoadingIndicator(Common.View.NoXView, false);
        switchView(Common.View.Login);
      } else {
        AppDOM.ShowLoadingIndicator(Common.View.NoXView, false);
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
        if (waitingForPlaybackTransfer) {
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
        switchView(Common.View.NoDevice);
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

},{"./modules/App-DOM.js":2,"./modules/common.js":4,"./modules/spotify.js":5}],2:[function(require,module,exports){
const Common = require("./common.js");
const anime = require("animejs");
const AppViewDOM = require("./App-view-DOM.js");

let playerPlayButton,
  playerPauseButton,
  playerShuffleButton,
  playerToggleLikeButton,
  playerSkipForwardButton,
  playerSkipBackButton,
  playerRepeatButton;

let devicesButton, profileButton, libraryButton;

const listViewContent = document.getElementById("list-view-content");
const devicesListView = document.getElementById("devices-list-view");

function log(message) {
  chrome.runtime.sendMessage({
    message: "log",
    error: message,
  });
}

exports.Initialize = () => {
  devicesButton = document.getElementById("devices-button");
  profileButton = document.getElementById("profile-button");
  libraryButton = document.getElementById("library-button");

  devicesButton.disabled = true;
  profileButton.disabled = true;
  libraryButton.disabled = true;
}

exports.InitPlaybackButtons = ({
  playPause,
  skipTrack,
  toggleShuffle,
  toggleLike,
  toggleRepeat,
}) => {
  playerPlayButton = document.getElementById("player-play-button");
  playerPauseButton = document.getElementById("player-pause-button");
  playerShuffleButton = document.getElementById("player-shuffle-button");
  playerToggleLikeButton = document.getElementById("player-toggle-like-button");
  playerSkipForwardButton = document.getElementById("player-skip-forward");
  playerSkipBackButton = document.getElementById("player-skip-back");
  playerRepeatButton = document.getElementById("player-repeat-button");

  playerPlayButton.addEventListener("click", () => playPause());
  playerPauseButton.addEventListener("click", () => playPause(false));
  playerShuffleButton.addEventListener("click", () => toggleShuffle());
  playerToggleLikeButton.addEventListener("click", () => toggleLike());
  playerRepeatButton.addEventListener("click", () => toggleRepeat());

  playerSkipForwardButton.addEventListener("click", () => skipTrack());
  playerSkipBackButton.addEventListener("click", () => skipTrack(false));

  this.TogglePlackbackDisabledState(true);
};

exports.SetButtonsDisabled = (disabled) => {
  devicesButton.disabled = disabled;
  profileButton.disabled = disabled;
  libraryButton.disabled = disabled;
}

exports.TogglePlackbackDisabledState = (isDisabled) => {
  playerPlayButton.disabled = isDisabled;
  playerPauseButton.disabled = isDisabled;
  playerShuffleButton.disabled = isDisabled;
  playerToggleLikeButton.disabled = isDisabled;
  playerSkipForwardButton.disabled = isDisabled;
  playerSkipBackButton.disabled = isDisabled;
  playerRepeatButton.disabled = isDisabled;
};

exports.ShowMessagePopup = (message) => {
  let messagePopup = document.getElementById("message-popup");
  let p = messagePopup.querySelector("p");

  p.textContent = message;
  anime({
    targets: messagePopup,
    opacity: [0, 1],
    translateY: ["-100%", 0],
    duration: 800,
    easing: "easeOutExpo",

    complete: () => {
      setTimeout(() => {
        anime({
          targets: messagePopup,
          opacity: [1, 0],
          translateY: [0, "-100%"],
          duration: 800,
          easing: "easeOutExpo",
        });
      }, 2000);
    },
  });
};

exports.ShowLoadingIndicator = (view, show = true) => {
  const display = show ? "flex" : "none";

  switch (view) {
    case Common.View.Default:
      document.getElementById("global-loading-indicator").style.display =
        display;
      break;
    case Common.View.Login:
      document.querySelector("#login-view-loading-indicator").style.display =
        display;
      document.querySelector(
        "#login-view-loading-indicator .loader"
      ).style.display = display;
      document.getElementById("sign-in-button").disabled = show;
      break;
    case Common.View.Library:
    case Common.View.Search:
      document.getElementById("list-view-loading-indicator").style.display =
        display;
      break;
    case Common.View.Devices:
      document.getElementById("devices-view-loading-indicator").style.display =
        display;
      break;
    case Common.View.Player:
      document.getElementById("player-loading-indicator").style.display =
        display;
      break;
    case Common.View.NoXView:
      const noXElements = document.querySelectorAll(".no-x-view");
      noXElements.forEach((el) => {
        const innerSvg = el.querySelector(".inner svg");
        const loadingIndicator = el.querySelector(
          ".no-x-view-loading-indicator"
        );
        const retryButton = el.querySelector(".retry-button");

        innerSvg.style.opacity = show ? 0 : 1;
        loadingIndicator.style.display = show ? "flex" : "none";
        retryButton.disabled = show;
      });
      break;
  }
};

exports.SwitchView = async (view, oldValue) => {
  if (oldValue === Common.View.Profile || oldValue === Common.View.Devices)
    AppViewDOM.SwitchOverlay(oldValue, false);

  document.getElementById("login-view").style.display =
    view != Common.View.Login ? "none" : "flex";

  // document.getElementById("no-device-view").style.display =
  //   view != Common.View.NoDevice ? "none" : "flex";

  // document.getElementById("no-network-view").style.display =
  //   view != Common.View.NoNetwork ? "none" : "flex";

  switch (view) {
    case Common.View.Player:
    case Common.View.Login:
    case Common.View.NoDevice:
    case Common.View.NoNetwork:
      return AppViewDOM.switchToPlayer(oldValue);
    case Common.View.Library:
      return AppViewDOM.switchToLibrary(oldValue);
    case Common.View.Search:
      return AppViewDOM.switchToSearch();
    case Common.View.Profile:
    case Common.View.Devices:
      return AppViewDOM.SwitchOverlay(view);
  }
};

exports.ToggleLibraryFilter = (show) => {
  return AppViewDOM.ToggleLibraryFilter(show);
};

exports.AddDevice = ({ id, name, isActive, type }, selectDeviceFunc = null) => {
  const li = document.createElement("li");
  li.setAttribute("id", id);
  li.className = isActive ? "device-item device-active" : "device-item";
  //"device-item" + isActive ? " device-active" : " device-inactive";

  let indicatorSrc =
    "https://open.scdn.co/cdn/images/equaliser-animated-green.73b73928.gif";
  if (!isActive) indicatorSrc = "";

  const iconColor = isActive ? "active" : "inactive";
  let iconImgSrc = `./assets/devices-default-${iconColor}.svg`;

  switch (type) {
    case Common.Device.Laptop:
      iconImgSrc = `./assets/device-laptop-${iconColor}.svg`;
      break;
    case Common.Device.Smartphone:
      iconImgSrc = `./assets/device-mobile-${iconColor}.svg`;
      break;
  }
  /* <div class="content-fade"></div> */
  li.innerHTML = 
    `<div class="device-icon-wrapper">
      <img src="${iconImgSrc}" alt="" />
    </div>
    <p class="device-name">${name}</p>
    <div class="device-item-actions">
      <div class="device-item-actions-inner">
        <button class="device-select-button text-button">
          Select
        </button>
        <div class="device-active-indicator">
          <img
            width="12"
            height="12"
            alt=""
            src="${indicatorSrc}"
          />
        </div>
      </div>
    </div>`;

  li.addEventListener("click", () => selectDeviceFunc(id));

  devicesListView.appendChild(li);
};

exports.UpdateDevicesActiveDevice = (id) => {
  const devicesListView = document.getElementById("devices-list-view");
  const devices = devicesListView.querySelectorAll("li");
  if (!devices) return;

  devices.forEach((device) => {
    device.className =
      device.id === id ? "device-item device-active" : "device-item";
  });
};

exports.UpdateActiveDevice = ({ name, type }) => {
  const smartphone = "./assets/device-mobile-active.svg";
  const laptop = "./assets/device-laptop-active.svg";
  const defaultDevice = "./assets/device-default-active.svg";

  const activeDeviceImg = document.getElementById("active-device-img");
  const activeDeviceText = document.getElementById("active-device-text");
  const activeDeviceName = document.getElementById("active-device-name");

  switch (type) {
    case Common.Device.Smartphone:
      activeDeviceImg.src = smartphone;
      break;
    case Common.Device.Laptop:
      activeDeviceImg.src = laptop;
      break;
    default:
      activeDeviceImg.src = defaultDevice;
      break;
  }

  activeDeviceText.textContent = "Listening on ";
  activeDeviceName.textContent = name;
};

exports.ClearDevicesView = () => {
  document.getElementById("devices-list-view").innerHTML = "";
};

exports.ClearListView = () => {
  listViewContent.innerHTML = "";
};

exports.AddToListViewContent = (
  { id, name, author, imgUrl, uri, type },
  playFunc,
  queueFunc = null
) => {
  const subtitle =
    type === Common.MediaType.Playlist
      ? `Playlist • ${author}`
      : type === Common.MediaType.Album
      ? `Album • ${author}`
      : `${author}`;

  const li = document.createElement("li");
  li.setAttribute("id", id);
  li.className = "list-view-item";

  const innerContainerHTML = `<div class="cover">
    <img src="${imgUrl}" alt="" loading="lazy" style="height: 44px; width: 44px;">
    <div class="play-button-hint">
        <svg
        class="play-hint-icon"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        >
        <path
            d="M6.99994 4V20L19.9999 12L6.99994 4Z"
            fill="white"
        />
        </svg>
    </div>
    </div>
    <div class="info">
    <p class="title">${name}</p>
    <p class="owner">${subtitle}</p>
    </div>`;

  const innerContainer = document.createElement("div");
  innerContainer.className = "list-view-item-inner";
  innerContainer.addEventListener("click", () => playFunc(uri));
  innerContainer.innerHTML = innerContainerHTML;
  li.appendChild(innerContainer);

  const contentFade = document.createElement("div");
  contentFade.className = "content-fade";
  li.appendChild(contentFade);

  if (type === Common.MediaType.Track) {
    const queueButton = document.createElement("button");
    queueButton.className = "queue-button text-button";
    queueButton.addEventListener("click", () => queueFunc(uri));
    queueButton.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" 
          fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 4V9L8 6.5L3 4Z" fill="#ffffff"/>
          <line x1="10" y1="7.5" x2="17" y2="7.5" stroke="#ffffff"/>
          <line x1="3" y1="11.5" x2="17" y2="11.5" stroke="#ffffff"/>
          <line x1="3" y1="15.5" x2="17" y2="15.5" stroke="#ffffff"/>
        </svg>`;

    li.appendChild(queueButton);
  }

  li.style.opacity = 0;

  listViewContent.appendChild(li);

  return li;
};

exports.AnimateListViewItems = (view) => {
  const targets =
    view === Common.View.Devices ? ".device-item" : ".list-view-item";

  if (view === Common.View.Devices) {
    anime({
      targets: targets,
      opacity: 1,
      translateY: ["20px", 0],
      duration: 800,
      easing: "easeOutExpo",
      delay: (el, i) => 70 * (i + 1),
    });
  } else {
    anime({
      targets: targets,
      opacity: 1,
      translateX: ["24px", 0],
      duration: 700,
      easing: "easeOutExpo",
      delay: (el, i) => 70 * (i + 1),
    });
  }
};

const nowPlayingImg = document.getElementById("now-playing-img");
const nowPlayingTitle = document.getElementById("title");
const owner = document.getElementById("owner");
const explicitTag = document.getElementById("explicit-tag");

const nowplayingStatus = document.getElementById("now-playing-status");
const nowPlayingIndicator = document.getElementById("now-playing-indicator");

exports.UpdateProfile = ({ name, imgUrl, uri }) => {
  if (!imgUrl) imgUrl = "./assets/cover-transparent.svg";

  if (imgUrl) {
    document.querySelector("#profile-view .profile-cover").style.background =
      "#030303";
    document.getElementById("profile-img-main").src = imgUrl;
  }

  document.getElementById("profile-name").textContent = name;
  document.getElementById("open-profile-button").href = uri;

  if (name && name.lenth > 0) {
    document.querySelector(".profile-name-initials").textContent = name[0];
  }
};

exports.ClearNowplaying = () => {
  nowPlayingImg.src = "./assets/cover-placeholder.svg";
  nowPlayingTitle.textContent = "...";
  owner.textContent = "...";
  explicitTag.style.display = "none";
  if (nowplayingStatus.textContent != "...")
    nowplayingStatus.textContent = "...";
};

exports.UpdateNowplaying = ({ title, author, imgUrl, explicit }) => {
  if (nowplayingStatus.textContent != "NOWPLAYING")
    nowplayingStatus.textContent = "NOWPLAYING";

  nowPlayingImg.src = imgUrl ? imgUrl : "./assets/cover-transparent.svg";
  nowPlayingTitle.textContent = title;
  owner.textContent = author;
  explicitTag.style.display = explicit ? "block" : "none";
};

exports.TogglePlaybackState = ({ isPlaying }) => {
  playerPlayButton.style.display = isPlaying ? "none" : "block";
  playerPauseButton.style.display = isPlaying ? "block" : "none";
  nowPlayingIndicator.style.display = isPlaying ? "flex" : "none";

  const npTitle = isPlaying ? "NOWPLAYING" : "PAUSED";
  if (nowplayingStatus.textContent != npTitle)
    nowplayingStatus.textContent = npTitle;
};

exports.ToggleShuffleState = ({ shuffleState }) => {
  const className = shuffleState ? "shuffle-on" : "shuffle-off";
  playerShuffleButton.className = `text-button ${className}`;
};

exports.ToggleLikeState = (isSaved) => {
  const className = isSaved ? "like-active" : "like-inactive";
  playerToggleLikeButton.className = `text-button ${className}`;
};

exports.ToggleRepeatState = ({ repeatState }) => {
  playerRepeatButton;
  const className =
    repeatState === Common.RepeatState.Off
      ? "text-button"
      : "text-button repeat-on";
  let svgIconHTML;
  if (repeatState === Common.RepeatState.Track) {
    svgIconHTML = `<svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5 5V4C2.8 4.3 1 6.2 1 8.5C1 9.1 1.1 9.7 1.4 10.3L2.3 9.8C2.1 9.4 2 9 2 8.5C2 6.7 3.3 5.3 5 5ZM10.5 12H6V10.5L2.5 12.5L6 14.5V13H10.5C12.4 13 14 11.8 14.7 10.2C14.2 10.5 13.7 10.7 13.2 10.8C12.5 11.5 11.6 12 10.5 12V12ZM11.5 0C9 0 7 2 7 4.5C7 7 9 9 11.5 9C14 9 16 7 16 4.5C16 2 14 0 11.5 0ZM12.4 7H11.1V3.6H10V2.6H10.1C10.3 2.6 10.4 2.6 10.5 2.5C10.6 2.5 10.8 2.4 10.9 2.3C11 2.2 11.1 2.1 11.1 2C11.2 1.9 11.2 1.8 11.2 1.7V1.6H12.3V7H12.4Z"
          fill="#1ED760"
        />
      </svg>`;
  } else {
    const color =
      repeatState === Common.RepeatState.Context ? "#1ED760" : "#B3B3B3";
    svgIconHTML = `<svg role="img" height="16" width="16" viewBox="0 0 16 16">
        <path
          d="M5.5 5H10v1.5l3.5-2-3.5-2V4H5.5C3 4 1 6 1 8.5c0 .6.1 1.2.4 1.8l.9-.5C2.1 9.4 2 9 2 8.5 2 6.6 3.6 5 5.5 5zm9.1 1.7l-.9.5c.2.4.3.8.3 1.3 0 1.9-1.6 3.5-3.5 3.5H6v-1.5l-3.5 2 3.5 2V13h4.5C13 13 15 11 15 8.5c0-.6-.1-1.2-.4-1.8z"
          fill=${color}
        ></path>
      </svg>`;
  }

  playerRepeatButton.innerHTML = svgIconHTML;
  playerRepeatButton.className = className;
};

},{"./App-view-DOM.js":3,"./common.js":4,"animejs":6}],3:[function(require,module,exports){
const Common = require("./common.js");
const anime = require("animejs");

const easingFactor = "cubicBezier(0.39, 0.575, 0.565, 1)";
// easing: "cubicBezier(.4,.1,.48,1)",
// easing: "cubicBezier(0.39, 0.575, 0.565, 1)"
// "cubicBezier(0.25, 0.46, 0.45, 0.94)"

exports.switchToSearch = () => {
  return new Promise((resolve) => {
    var tl = anime.timeline({
      complete: () => resolve(true),
      delay: (el, i) => 70 * (i + 1),
      easing: easingFactor,
    });

    document.getElementById("filter-actions-wrapper").style.display = "none";

    tl.add({
      targets: "#header",
      maxHeight: ["84px", "0"],
      duration: 350,
    })
      .add(
        {
          targets: "#search-container",
          background: "#282828",
          duration: 300,
          easing: "linear",
          begin: () => {
            document.getElementById("search-bar").style.display = "flex";
          },
        },
        "-=400"
      )
      .add(
        {
          targets: "#search-bar",
          opacity: 1,
          easing: "linear",
          duration: 200,
        },
        "-=300"
      );

    document.getElementById("search-bar").focus();
  });
};

exports.switchToPlayer = (oldValue) => {
  return new Promise((resolve) => {
    var tl = anime.timeline({
      complete: () => resolve(true),
      delay: (el, i) => 70 * (i + 1),
      easing: easingFactor,
    });

    if (oldValue === Common.View.Library) {
      tl.add({
        targets: "#header",
        maxHeight: "84px",
        duration: 400,
      });
    }

    tl.add({
      targets: ".list-view-nav-item",
      opacity: [1, 0],
      translateX: ["0", "15px"],
      duration: 100,
    })
      .add(
        {
          targets: "#list-view",
          maxHeight: "0",
          duration: 800,
        },
        `-=1000`
      )
      .add(
        {
          targets: "#footer-nav",
          maxHeight: "36px",
          duration: 400,
        },
        "-=600"
      )
      .add(
        {
          targets: "#bottom-nav",
          background: "#030303",
          duration: 300,
          easing: "linear",
        },
        "-=600"
      )
      .add(
        {
          targets: "#top-nav",
          maxHeight: "0",
          duration: 400,
        },
        "-=350"
      );
  });
};

exports.switchToLibrary = (oldValue) => {
  return new Promise((resolve) => {
    var tl = anime.timeline({
      complete: () => resolve(true),
      delay: (el, i) => 70 * (i + 1),
      easing: easingFactor,
    });

    document.getElementById("filter-actions-wrapper").style.display = "flex";

    if (oldValue && oldValue === Common.View.Search) {
      tl.add({
        targets: "#header",
        maxHeight: "84px",
        duration: 500,
      })
        .add(
          {
            targets: "#search-container",
            background: "#030303",
            duration: 300,
            easing: "linear",
          },
          "-=700"
        )
        .add(
          {
            targets: "#search-bar",
            opacity: 0,
            duration: 300,
            complete: () => {
              document.getElementById("search-bar").style.display = "none";
            },
          },
          "-= 300"
        );
    }

    tl.add({
      targets: "#footer-nav",
      maxHeight: "0",
      duration: 400,
    })
      .add(
        {
          targets: "#list-view",
          maxHeight: "300px",
          duration: 800,
        },
        `-=800`
      )
      .add(
        {
          targets: "#bottom-nav",
          background: "#1b1b1b",
          duration: 300,
          easing: "linear",
        },
        "-=150"
      )
      .add(
        {
          targets: "#top-nav",
          maxHeight: "44px",
          duration: 400,
        },
        "-=350"
      )
      .add(
        {
          targets: ".list-view-nav-item",
          opacity: [0, 1],
          translateX: ["15px", "0"],
          duration: 500,
        },
        "-=340"
      );
  });
};

exports.ToggleLibraryFilter = (show) => {
  return new Promise((resolve) => {
    var tl = anime.timeline({
      complete: () => resolve(true),
      delay: (el, i) => 70 * (i + 1),
      easing: easingFactor,
    });

    if (show) {
      tl.add({
        targets: ".list-view-nav-item",
        opacity: [1, 0],
        translateX: [0, "-15px"],
        duration: 300,
        complete: () =>
          (document.getElementById("list-view-nav").style.display = "none"),
      })
        .add(
          {
            targets: "#filter-bar",
            opacity: [0, 1],
            duration: 300,
            begin: () =>
              (document.getElementById(
                "filter-library-container"
              ).style.display = "flex"),
            complete: () => document.getElementById("filter-bar").focus(),
          },
          "-=80"
        )
        .add(
          {
            targets: "#filter-library-button",
            opacity: [1, 0],
            duration: 300,
            easing: "easeOutExpo",
            complete: () =>
              (document.getElementById("filter-library-button").style.display =
                "none"),
          },
          "-=1150"
        )
        .add(
          {
            targets: "#filter-close-button",
            opacity: [0, 1],
            duration: 300,
            easing: "easeOutExpo",
            complete: () =>
              (document.getElementById("filter-close-button").style.display =
                "flex"),
          },
          "-=600"
        );
    } else {
      tl.add({
        targets: "#filter-bar",
        opacity: [1, 0],
        duration: 300,
        complete: () =>
          (document.getElementById("filter-library-container").style.display =
            "none"),
      })
        .add({
          targets: ".list-view-nav-item",
          opacity: 1,
          translateX: 0,
          duration: 400,
          begin: () =>
            (document.getElementById("list-view-nav").style.display = "flex"),
        })
        .add(
          {
            targets: "#filter-close-button",
            opacity: [1, 0],
            duration: 300,
            complete: () =>
              (document.getElementById("filter-close-button").style.display =
                "none"),
          },
          "-=1150"
        )
        .add(
          {
            targets: "#filter-library-button",
            opacity: [0, 1],
            duration: 200,
            complete: () =>
              (document.getElementById("filter-library-button").style.display =
                "flex"),
          },
          "-=600"
        );
    }
  });
};

exports.SwitchOverlay = (view, show = true) => {
  return new Promise(async (resolve) => {
    var tl = anime.timeline({
      complete: () => resolve(true),
      delay: (el, i) => 70 * (i + 1),
      easing: easingFactor,
    });

    const viewToAnimate =
      view === Common.View.Profile ? "#profile-view" : "#devices-view";

    if (show) {
      const profileButton = view != Common.View.Profile ? "profile-button" : "";

      anime({
        targets: "#search-button, #library-button" + profileButton,
        opacity: [1, 0],
        duration: 250,
        easing: easingFactor,
        complete: () => {
          document.getElementById("search-button").style.display = "none";
          document.getElementById("library-button").style.display = "none";
          if (view != Common.View.Profile)
            document.getElementById("profile-button").style.display = "none";
        },
      });

      tl.add({
        targets: viewToAnimate,
        translateY: ["-100%", "0%"],
        duration: 400,
      }).add(
        {
          targets: "#top-nav",
          maxHeight: "44px",
          duration: 400,
        },
        "-=258"
      );

      if (view === Common.View.Profile) await switchToProfile(show);
      else if (view === Common.View.Devices) await switchToDevices(show);
    } else {
      tl.add({
        targets: "#top-nav",
        maxHeight: "0",
        duration: 400,
        complete: () => {
          if (view === Common.View.Devices) {
            document.getElementById("refresh-devices-button").style.display =
              "none";
          }

          document.getElementById("profile-button").style.display = "flex";
          document.getElementById("search-button").style.display = "flex";
          document.getElementById("library-button").style.display = "flex";
        },
      }).add(
        {
          targets: viewToAnimate,
          translateY: [0, "-100%"],
          duration: 500,
          complete: () => {
            anime({
              targets: "#search-button, #library-button",
              opacity: [0, 1],
              duration: 250,
              easing: easingFactor,
              complete: () => {
                document.getElementById("search-button").style.display = "flex";
                document.getElementById("library-button").style.display =
                  "flex";
                if (view === Common.View.Profile)
                  document.getElementById("profile-button").style.display =
                    "flex";
              },
            });
          },
        },
        "-=180"
      );

      if (view === Common.View.Devices) await switchToDevices(show);
    }
  });
};

function switchToProfile(show) {
  return new Promise((resolve) => {
    var tl = anime.timeline({
      complete: () => resolve(true),
      delay: (el, i) => 70 * (i + 1),
      easing: easingFactor,
      complete: () => resolve(true),
    });

    if (show) {
      tl.add({
        targets: ".profile-info-wrapper",
        opacity: [0, 1],
        duration: 250,
      }).add({
        targets: ".profile-details",
        opacity: [0, 1],
        translateX: ["10px", 0],
        duration: 500,
      });
    }
  });
}

function switchToDevices(show) {
  return new Promise((resolve) => {
    var tl = anime.timeline({
      complete: () => resolve(true),
      delay: (el, i) => 70 * (i + 1),
      easing: easingFactor,
      complete: () => resolve(true),
    });

    if (show) {
      tl.add({
        targets: "#refresh-devices-button",
        opacity: [0, 1],
        duration: 400,
        begin:() => document.getElementById("refresh-devices-button").style.display = "flex",
      });

      anime({
        targets: "#devices-chev",
        rotate: ["180deg", 0],
        duration: 400,
        easing: easingFactor,
      });
    } else {
      tl.add(
        {
          targets: "#refresh-devices-button",
          opacity: [1, 0],
          duration: 400,
          complete: () => document.getElementById("refresh-devices-button").style.display = "none",
        },
        "-= 150"
      );

      anime({
        targets: "#devices-chev",
        rotate: [0, "180deg"],
        duration: 400,
        easing: easingFactor,
      });
    }
  });
}

},{"./common.js":4,"animejs":6}],4:[function(require,module,exports){
exports.View = {
  Default: 0,
  Player: 1,
  Library: 2,
  Search: 3,
  Login: 4,
  Welcome: 5,
  NoXView: 6,
  NoDevice: 7,
  NoNetwork: 8,
  Profile: 9,
  Devices: 10,
};

exports.Device = {
  Default: 0,
  Smartphone: 1,
  Laptop: 2,
};

exports.MediaType = {
  Track: 1,
  Playlist: 2,
  Album: 3,
};

exports.RepeatState = {
  Track: "track",
  Context: "context",
  Off: "off",
}

exports.IsConnected = () => {
  return fetch("https://www.google.com")
    .then((response) => {
      return response.ok;
    })
    .catch((e) => {
      return false;
    });
};

exports.GetDeviceType = (str) => {
  const type =
    str === "Computer"
      ? this.Device.Laptop
      : str === "Laptop"
      ? this.Device.Laptop
      : str === "Smartphone"
      ? this.Device.Smartphone
      : this.Device.Default;

  return type;
};

exports.LoadImage = async (url, elem) => {
  return new Promise((resolve, reject) => {
    elem.onload = () => resolve(elem);
    elem.onerror = reject;
    elem.src = url;
  });
}

},{}],5:[function(require,module,exports){
"use strict";

let SpotifyWebApi = require("spotify-web-api-js");
let Common = require("./common.js");

// // remember to convert object to Json object by adding quotations to keys.

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

  function log(message) {
    chrome.runtime.sendMessage({
      message: "log",
      error: message,
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

    // return new Promise((resolve, reject) => {
    //   func(options).then((response, err) => {
    //     (err) ? reject(err) : resolve(response?.total);
    //   })
    // }).catch((e) => {
    //   log(e);
    //   return;
    // });
  }

  function getMedia(offset, limit, type) {
    let func = getFunc(type);

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

    //   return new Promise((resolve, reject) => {
    //     func(options).then((response, err) => {
    //       (err) ? reject(null) : resolve(response?.items);
    //     });
    // });
  }

  function convertMedia(item, type) {
    switch (type) {
      case Common.MediaType.Track:
        if (item?.track) item = item.track;

        return {
          id: item.id,
          name: item.name,
          author: item.artists.map((a) => a.name).join(", "),
          explicit: item.explicit,
          imgUrl: item.album?.images[2]?.url,
          uri: item.uri,
          type: type,
        };
      case Common.MediaType.Playlist:
        return {
          id: item.id,
          name: item.name,
          author: item.owner.display_name,
          imgUrl:
            item.images.length >= 3 ? item.images[2]?.url : item.images[0]?.url,
          length: item.tracks.total,
          uri: item.uri,
          type: type,
        };
      case Common.MediaType.Album:
        if (item?.album) item = item.album;

        return {
          id: item.id,
          name: item.name,
          author: item.artists.map((a) => a.name).join(", "),
          imgUrl:
            item.images.length >= 3 ? item.images[2]?.url : item.images[0]?.url,
          // length: item.tracks.total, item.total_tracks
          uri: item.uri,
          type: type,
        };
    }
  }

  Constr.prototype.getAllMedia = async (type) => {
    if (!_accessToken || !spotifyApi)
      return new Promise((resolve) => resolve(null));

    const items = [];
    const step = 20;

    const total = await getTotal(type);

    if (!total || total < 0 || isNaN(total)) return;

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

    return new Promise((resolve, reject) => {
      items && items.length > 0 ? resolve(items) : reject(null);
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

},{"./common.js":4,"spotify-web-api-js":7}],6:[function(require,module,exports){
/*
 * anime.js v3.2.1
 * (c) 2020 Julian Garnier
 * Released under the MIT license
 * animejs.com
 */

'use strict';

// Defaults

var defaultInstanceSettings = {
  update: null,
  begin: null,
  loopBegin: null,
  changeBegin: null,
  change: null,
  changeComplete: null,
  loopComplete: null,
  complete: null,
  loop: 1,
  direction: 'normal',
  autoplay: true,
  timelineOffset: 0
};

var defaultTweenSettings = {
  duration: 1000,
  delay: 0,
  endDelay: 0,
  easing: 'easeOutElastic(1, .5)',
  round: 0
};

var validTransforms = ['translateX', 'translateY', 'translateZ', 'rotate', 'rotateX', 'rotateY', 'rotateZ', 'scale', 'scaleX', 'scaleY', 'scaleZ', 'skew', 'skewX', 'skewY', 'perspective', 'matrix', 'matrix3d'];

// Caching

var cache = {
  CSS: {},
  springs: {}
};

// Utils

function minMax(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function stringContains(str, text) {
  return str.indexOf(text) > -1;
}

function applyArguments(func, args) {
  return func.apply(null, args);
}

var is = {
  arr: function (a) { return Array.isArray(a); },
  obj: function (a) { return stringContains(Object.prototype.toString.call(a), 'Object'); },
  pth: function (a) { return is.obj(a) && a.hasOwnProperty('totalLength'); },
  svg: function (a) { return a instanceof SVGElement; },
  inp: function (a) { return a instanceof HTMLInputElement; },
  dom: function (a) { return a.nodeType || is.svg(a); },
  str: function (a) { return typeof a === 'string'; },
  fnc: function (a) { return typeof a === 'function'; },
  und: function (a) { return typeof a === 'undefined'; },
  nil: function (a) { return is.und(a) || a === null; },
  hex: function (a) { return /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(a); },
  rgb: function (a) { return /^rgb/.test(a); },
  hsl: function (a) { return /^hsl/.test(a); },
  col: function (a) { return (is.hex(a) || is.rgb(a) || is.hsl(a)); },
  key: function (a) { return !defaultInstanceSettings.hasOwnProperty(a) && !defaultTweenSettings.hasOwnProperty(a) && a !== 'targets' && a !== 'keyframes'; },
};

// Easings

function parseEasingParameters(string) {
  var match = /\(([^)]+)\)/.exec(string);
  return match ? match[1].split(',').map(function (p) { return parseFloat(p); }) : [];
}

// Spring solver inspired by Webkit Copyright © 2016 Apple Inc. All rights reserved. https://webkit.org/demos/spring/spring.js

function spring(string, duration) {

  var params = parseEasingParameters(string);
  var mass = minMax(is.und(params[0]) ? 1 : params[0], .1, 100);
  var stiffness = minMax(is.und(params[1]) ? 100 : params[1], .1, 100);
  var damping = minMax(is.und(params[2]) ? 10 : params[2], .1, 100);
  var velocity =  minMax(is.und(params[3]) ? 0 : params[3], .1, 100);
  var w0 = Math.sqrt(stiffness / mass);
  var zeta = damping / (2 * Math.sqrt(stiffness * mass));
  var wd = zeta < 1 ? w0 * Math.sqrt(1 - zeta * zeta) : 0;
  var a = 1;
  var b = zeta < 1 ? (zeta * w0 + -velocity) / wd : -velocity + w0;

  function solver(t) {
    var progress = duration ? (duration * t) / 1000 : t;
    if (zeta < 1) {
      progress = Math.exp(-progress * zeta * w0) * (a * Math.cos(wd * progress) + b * Math.sin(wd * progress));
    } else {
      progress = (a + b * progress) * Math.exp(-progress * w0);
    }
    if (t === 0 || t === 1) { return t; }
    return 1 - progress;
  }

  function getDuration() {
    var cached = cache.springs[string];
    if (cached) { return cached; }
    var frame = 1/6;
    var elapsed = 0;
    var rest = 0;
    while(true) {
      elapsed += frame;
      if (solver(elapsed) === 1) {
        rest++;
        if (rest >= 16) { break; }
      } else {
        rest = 0;
      }
    }
    var duration = elapsed * frame * 1000;
    cache.springs[string] = duration;
    return duration;
  }

  return duration ? solver : getDuration;

}

// Basic steps easing implementation https://developer.mozilla.org/fr/docs/Web/CSS/transition-timing-function

function steps(steps) {
  if ( steps === void 0 ) steps = 10;

  return function (t) { return Math.ceil((minMax(t, 0.000001, 1)) * steps) * (1 / steps); };
}

// BezierEasing https://github.com/gre/bezier-easing

var bezier = (function () {

  var kSplineTableSize = 11;
  var kSampleStepSize = 1.0 / (kSplineTableSize - 1.0);

  function A(aA1, aA2) { return 1.0 - 3.0 * aA2 + 3.0 * aA1 }
  function B(aA1, aA2) { return 3.0 * aA2 - 6.0 * aA1 }
  function C(aA1)      { return 3.0 * aA1 }

  function calcBezier(aT, aA1, aA2) { return ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT }
  function getSlope(aT, aA1, aA2) { return 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1) }

  function binarySubdivide(aX, aA, aB, mX1, mX2) {
    var currentX, currentT, i = 0;
    do {
      currentT = aA + (aB - aA) / 2.0;
      currentX = calcBezier(currentT, mX1, mX2) - aX;
      if (currentX > 0.0) { aB = currentT; } else { aA = currentT; }
    } while (Math.abs(currentX) > 0.0000001 && ++i < 10);
    return currentT;
  }

  function newtonRaphsonIterate(aX, aGuessT, mX1, mX2) {
    for (var i = 0; i < 4; ++i) {
      var currentSlope = getSlope(aGuessT, mX1, mX2);
      if (currentSlope === 0.0) { return aGuessT; }
      var currentX = calcBezier(aGuessT, mX1, mX2) - aX;
      aGuessT -= currentX / currentSlope;
    }
    return aGuessT;
  }

  function bezier(mX1, mY1, mX2, mY2) {

    if (!(0 <= mX1 && mX1 <= 1 && 0 <= mX2 && mX2 <= 1)) { return; }
    var sampleValues = new Float32Array(kSplineTableSize);

    if (mX1 !== mY1 || mX2 !== mY2) {
      for (var i = 0; i < kSplineTableSize; ++i) {
        sampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
      }
    }

    function getTForX(aX) {

      var intervalStart = 0;
      var currentSample = 1;
      var lastSample = kSplineTableSize - 1;

      for (; currentSample !== lastSample && sampleValues[currentSample] <= aX; ++currentSample) {
        intervalStart += kSampleStepSize;
      }

      --currentSample;

      var dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
      var guessForT = intervalStart + dist * kSampleStepSize;
      var initialSlope = getSlope(guessForT, mX1, mX2);

      if (initialSlope >= 0.001) {
        return newtonRaphsonIterate(aX, guessForT, mX1, mX2);
      } else if (initialSlope === 0.0) {
        return guessForT;
      } else {
        return binarySubdivide(aX, intervalStart, intervalStart + kSampleStepSize, mX1, mX2);
      }

    }

    return function (x) {
      if (mX1 === mY1 && mX2 === mY2) { return x; }
      if (x === 0 || x === 1) { return x; }
      return calcBezier(getTForX(x), mY1, mY2);
    }

  }

  return bezier;

})();

var penner = (function () {

  // Based on jQuery UI's implemenation of easing equations from Robert Penner (http://www.robertpenner.com/easing)

  var eases = { linear: function () { return function (t) { return t; }; } };

  var functionEasings = {
    Sine: function () { return function (t) { return 1 - Math.cos(t * Math.PI / 2); }; },
    Circ: function () { return function (t) { return 1 - Math.sqrt(1 - t * t); }; },
    Back: function () { return function (t) { return t * t * (3 * t - 2); }; },
    Bounce: function () { return function (t) {
      var pow2, b = 4;
      while (t < (( pow2 = Math.pow(2, --b)) - 1) / 11) {}
      return 1 / Math.pow(4, 3 - b) - 7.5625 * Math.pow(( pow2 * 3 - 2 ) / 22 - t, 2)
    }; },
    Elastic: function (amplitude, period) {
      if ( amplitude === void 0 ) amplitude = 1;
      if ( period === void 0 ) period = .5;

      var a = minMax(amplitude, 1, 10);
      var p = minMax(period, .1, 2);
      return function (t) {
        return (t === 0 || t === 1) ? t : 
          -a * Math.pow(2, 10 * (t - 1)) * Math.sin((((t - 1) - (p / (Math.PI * 2) * Math.asin(1 / a))) * (Math.PI * 2)) / p);
      }
    }
  };

  var baseEasings = ['Quad', 'Cubic', 'Quart', 'Quint', 'Expo'];

  baseEasings.forEach(function (name, i) {
    functionEasings[name] = function () { return function (t) { return Math.pow(t, i + 2); }; };
  });

  Object.keys(functionEasings).forEach(function (name) {
    var easeIn = functionEasings[name];
    eases['easeIn' + name] = easeIn;
    eases['easeOut' + name] = function (a, b) { return function (t) { return 1 - easeIn(a, b)(1 - t); }; };
    eases['easeInOut' + name] = function (a, b) { return function (t) { return t < 0.5 ? easeIn(a, b)(t * 2) / 2 : 
      1 - easeIn(a, b)(t * -2 + 2) / 2; }; };
    eases['easeOutIn' + name] = function (a, b) { return function (t) { return t < 0.5 ? (1 - easeIn(a, b)(1 - t * 2)) / 2 : 
      (easeIn(a, b)(t * 2 - 1) + 1) / 2; }; };
  });

  return eases;

})();

function parseEasings(easing, duration) {
  if (is.fnc(easing)) { return easing; }
  var name = easing.split('(')[0];
  var ease = penner[name];
  var args = parseEasingParameters(easing);
  switch (name) {
    case 'spring' : return spring(easing, duration);
    case 'cubicBezier' : return applyArguments(bezier, args);
    case 'steps' : return applyArguments(steps, args);
    default : return applyArguments(ease, args);
  }
}

// Strings

function selectString(str) {
  try {
    var nodes = document.querySelectorAll(str);
    return nodes;
  } catch(e) {
    return;
  }
}

// Arrays

function filterArray(arr, callback) {
  var len = arr.length;
  var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
  var result = [];
  for (var i = 0; i < len; i++) {
    if (i in arr) {
      var val = arr[i];
      if (callback.call(thisArg, val, i, arr)) {
        result.push(val);
      }
    }
  }
  return result;
}

function flattenArray(arr) {
  return arr.reduce(function (a, b) { return a.concat(is.arr(b) ? flattenArray(b) : b); }, []);
}

function toArray(o) {
  if (is.arr(o)) { return o; }
  if (is.str(o)) { o = selectString(o) || o; }
  if (o instanceof NodeList || o instanceof HTMLCollection) { return [].slice.call(o); }
  return [o];
}

function arrayContains(arr, val) {
  return arr.some(function (a) { return a === val; });
}

// Objects

function cloneObject(o) {
  var clone = {};
  for (var p in o) { clone[p] = o[p]; }
  return clone;
}

function replaceObjectProps(o1, o2) {
  var o = cloneObject(o1);
  for (var p in o1) { o[p] = o2.hasOwnProperty(p) ? o2[p] : o1[p]; }
  return o;
}

function mergeObjects(o1, o2) {
  var o = cloneObject(o1);
  for (var p in o2) { o[p] = is.und(o1[p]) ? o2[p] : o1[p]; }
  return o;
}

// Colors

function rgbToRgba(rgbValue) {
  var rgb = /rgb\((\d+,\s*[\d]+,\s*[\d]+)\)/g.exec(rgbValue);
  return rgb ? ("rgba(" + (rgb[1]) + ",1)") : rgbValue;
}

function hexToRgba(hexValue) {
  var rgx = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  var hex = hexValue.replace(rgx, function (m, r, g, b) { return r + r + g + g + b + b; } );
  var rgb = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  var r = parseInt(rgb[1], 16);
  var g = parseInt(rgb[2], 16);
  var b = parseInt(rgb[3], 16);
  return ("rgba(" + r + "," + g + "," + b + ",1)");
}

function hslToRgba(hslValue) {
  var hsl = /hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/g.exec(hslValue) || /hsla\((\d+),\s*([\d.]+)%,\s*([\d.]+)%,\s*([\d.]+)\)/g.exec(hslValue);
  var h = parseInt(hsl[1], 10) / 360;
  var s = parseInt(hsl[2], 10) / 100;
  var l = parseInt(hsl[3], 10) / 100;
  var a = hsl[4] || 1;
  function hue2rgb(p, q, t) {
    if (t < 0) { t += 1; }
    if (t > 1) { t -= 1; }
    if (t < 1/6) { return p + (q - p) * 6 * t; }
    if (t < 1/2) { return q; }
    if (t < 2/3) { return p + (q - p) * (2/3 - t) * 6; }
    return p;
  }
  var r, g, b;
  if (s == 0) {
    r = g = b = l;
  } else {
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return ("rgba(" + (r * 255) + "," + (g * 255) + "," + (b * 255) + "," + a + ")");
}

function colorToRgb(val) {
  if (is.rgb(val)) { return rgbToRgba(val); }
  if (is.hex(val)) { return hexToRgba(val); }
  if (is.hsl(val)) { return hslToRgba(val); }
}

// Units

function getUnit(val) {
  var split = /[+-]?\d*\.?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(%|px|pt|em|rem|in|cm|mm|ex|ch|pc|vw|vh|vmin|vmax|deg|rad|turn)?$/.exec(val);
  if (split) { return split[1]; }
}

function getTransformUnit(propName) {
  if (stringContains(propName, 'translate') || propName === 'perspective') { return 'px'; }
  if (stringContains(propName, 'rotate') || stringContains(propName, 'skew')) { return 'deg'; }
}

// Values

function getFunctionValue(val, animatable) {
  if (!is.fnc(val)) { return val; }
  return val(animatable.target, animatable.id, animatable.total);
}

function getAttribute(el, prop) {
  return el.getAttribute(prop);
}

function convertPxToUnit(el, value, unit) {
  var valueUnit = getUnit(value);
  if (arrayContains([unit, 'deg', 'rad', 'turn'], valueUnit)) { return value; }
  var cached = cache.CSS[value + unit];
  if (!is.und(cached)) { return cached; }
  var baseline = 100;
  var tempEl = document.createElement(el.tagName);
  var parentEl = (el.parentNode && (el.parentNode !== document)) ? el.parentNode : document.body;
  parentEl.appendChild(tempEl);
  tempEl.style.position = 'absolute';
  tempEl.style.width = baseline + unit;
  var factor = baseline / tempEl.offsetWidth;
  parentEl.removeChild(tempEl);
  var convertedUnit = factor * parseFloat(value);
  cache.CSS[value + unit] = convertedUnit;
  return convertedUnit;
}

function getCSSValue(el, prop, unit) {
  if (prop in el.style) {
    var uppercasePropName = prop.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    var value = el.style[prop] || getComputedStyle(el).getPropertyValue(uppercasePropName) || '0';
    return unit ? convertPxToUnit(el, value, unit) : value;
  }
}

function getAnimationType(el, prop) {
  if (is.dom(el) && !is.inp(el) && (!is.nil(getAttribute(el, prop)) || (is.svg(el) && el[prop]))) { return 'attribute'; }
  if (is.dom(el) && arrayContains(validTransforms, prop)) { return 'transform'; }
  if (is.dom(el) && (prop !== 'transform' && getCSSValue(el, prop))) { return 'css'; }
  if (el[prop] != null) { return 'object'; }
}

function getElementTransforms(el) {
  if (!is.dom(el)) { return; }
  var str = el.style.transform || '';
  var reg  = /(\w+)\(([^)]*)\)/g;
  var transforms = new Map();
  var m; while (m = reg.exec(str)) { transforms.set(m[1], m[2]); }
  return transforms;
}

function getTransformValue(el, propName, animatable, unit) {
  var defaultVal = stringContains(propName, 'scale') ? 1 : 0 + getTransformUnit(propName);
  var value = getElementTransforms(el).get(propName) || defaultVal;
  if (animatable) {
    animatable.transforms.list.set(propName, value);
    animatable.transforms['last'] = propName;
  }
  return unit ? convertPxToUnit(el, value, unit) : value;
}

function getOriginalTargetValue(target, propName, unit, animatable) {
  switch (getAnimationType(target, propName)) {
    case 'transform': return getTransformValue(target, propName, animatable, unit);
    case 'css': return getCSSValue(target, propName, unit);
    case 'attribute': return getAttribute(target, propName);
    default: return target[propName] || 0;
  }
}

function getRelativeValue(to, from) {
  var operator = /^(\*=|\+=|-=)/.exec(to);
  if (!operator) { return to; }
  var u = getUnit(to) || 0;
  var x = parseFloat(from);
  var y = parseFloat(to.replace(operator[0], ''));
  switch (operator[0][0]) {
    case '+': return x + y + u;
    case '-': return x - y + u;
    case '*': return x * y + u;
  }
}

function validateValue(val, unit) {
  if (is.col(val)) { return colorToRgb(val); }
  if (/\s/g.test(val)) { return val; }
  var originalUnit = getUnit(val);
  var unitLess = originalUnit ? val.substr(0, val.length - originalUnit.length) : val;
  if (unit) { return unitLess + unit; }
  return unitLess;
}

// getTotalLength() equivalent for circle, rect, polyline, polygon and line shapes
// adapted from https://gist.github.com/SebLambla/3e0550c496c236709744

function getDistance(p1, p2) {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

function getCircleLength(el) {
  return Math.PI * 2 * getAttribute(el, 'r');
}

function getRectLength(el) {
  return (getAttribute(el, 'width') * 2) + (getAttribute(el, 'height') * 2);
}

function getLineLength(el) {
  return getDistance(
    {x: getAttribute(el, 'x1'), y: getAttribute(el, 'y1')}, 
    {x: getAttribute(el, 'x2'), y: getAttribute(el, 'y2')}
  );
}

function getPolylineLength(el) {
  var points = el.points;
  var totalLength = 0;
  var previousPos;
  for (var i = 0 ; i < points.numberOfItems; i++) {
    var currentPos = points.getItem(i);
    if (i > 0) { totalLength += getDistance(previousPos, currentPos); }
    previousPos = currentPos;
  }
  return totalLength;
}

function getPolygonLength(el) {
  var points = el.points;
  return getPolylineLength(el) + getDistance(points.getItem(points.numberOfItems - 1), points.getItem(0));
}

// Path animation

function getTotalLength(el) {
  if (el.getTotalLength) { return el.getTotalLength(); }
  switch(el.tagName.toLowerCase()) {
    case 'circle': return getCircleLength(el);
    case 'rect': return getRectLength(el);
    case 'line': return getLineLength(el);
    case 'polyline': return getPolylineLength(el);
    case 'polygon': return getPolygonLength(el);
  }
}

function setDashoffset(el) {
  var pathLength = getTotalLength(el);
  el.setAttribute('stroke-dasharray', pathLength);
  return pathLength;
}

// Motion path

function getParentSvgEl(el) {
  var parentEl = el.parentNode;
  while (is.svg(parentEl)) {
    if (!is.svg(parentEl.parentNode)) { break; }
    parentEl = parentEl.parentNode;
  }
  return parentEl;
}

function getParentSvg(pathEl, svgData) {
  var svg = svgData || {};
  var parentSvgEl = svg.el || getParentSvgEl(pathEl);
  var rect = parentSvgEl.getBoundingClientRect();
  var viewBoxAttr = getAttribute(parentSvgEl, 'viewBox');
  var width = rect.width;
  var height = rect.height;
  var viewBox = svg.viewBox || (viewBoxAttr ? viewBoxAttr.split(' ') : [0, 0, width, height]);
  return {
    el: parentSvgEl,
    viewBox: viewBox,
    x: viewBox[0] / 1,
    y: viewBox[1] / 1,
    w: width,
    h: height,
    vW: viewBox[2],
    vH: viewBox[3]
  }
}

function getPath(path, percent) {
  var pathEl = is.str(path) ? selectString(path)[0] : path;
  var p = percent || 100;
  return function(property) {
    return {
      property: property,
      el: pathEl,
      svg: getParentSvg(pathEl),
      totalLength: getTotalLength(pathEl) * (p / 100)
    }
  }
}

function getPathProgress(path, progress, isPathTargetInsideSVG) {
  function point(offset) {
    if ( offset === void 0 ) offset = 0;

    var l = progress + offset >= 1 ? progress + offset : 0;
    return path.el.getPointAtLength(l);
  }
  var svg = getParentSvg(path.el, path.svg);
  var p = point();
  var p0 = point(-1);
  var p1 = point(+1);
  var scaleX = isPathTargetInsideSVG ? 1 : svg.w / svg.vW;
  var scaleY = isPathTargetInsideSVG ? 1 : svg.h / svg.vH;
  switch (path.property) {
    case 'x': return (p.x - svg.x) * scaleX;
    case 'y': return (p.y - svg.y) * scaleY;
    case 'angle': return Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI;
  }
}

// Decompose value

function decomposeValue(val, unit) {
  // const rgx = /-?\d*\.?\d+/g; // handles basic numbers
  // const rgx = /[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g; // handles exponents notation
  var rgx = /[+-]?\d*\.?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g; // handles exponents notation
  var value = validateValue((is.pth(val) ? val.totalLength : val), unit) + '';
  return {
    original: value,
    numbers: value.match(rgx) ? value.match(rgx).map(Number) : [0],
    strings: (is.str(val) || unit) ? value.split(rgx) : []
  }
}

// Animatables

function parseTargets(targets) {
  var targetsArray = targets ? (flattenArray(is.arr(targets) ? targets.map(toArray) : toArray(targets))) : [];
  return filterArray(targetsArray, function (item, pos, self) { return self.indexOf(item) === pos; });
}

function getAnimatables(targets) {
  var parsed = parseTargets(targets);
  return parsed.map(function (t, i) {
    return {target: t, id: i, total: parsed.length, transforms: { list: getElementTransforms(t) } };
  });
}

// Properties

function normalizePropertyTweens(prop, tweenSettings) {
  var settings = cloneObject(tweenSettings);
  // Override duration if easing is a spring
  if (/^spring/.test(settings.easing)) { settings.duration = spring(settings.easing); }
  if (is.arr(prop)) {
    var l = prop.length;
    var isFromTo = (l === 2 && !is.obj(prop[0]));
    if (!isFromTo) {
      // Duration divided by the number of tweens
      if (!is.fnc(tweenSettings.duration)) { settings.duration = tweenSettings.duration / l; }
    } else {
      // Transform [from, to] values shorthand to a valid tween value
      prop = {value: prop};
    }
  }
  var propArray = is.arr(prop) ? prop : [prop];
  return propArray.map(function (v, i) {
    var obj = (is.obj(v) && !is.pth(v)) ? v : {value: v};
    // Default delay value should only be applied to the first tween
    if (is.und(obj.delay)) { obj.delay = !i ? tweenSettings.delay : 0; }
    // Default endDelay value should only be applied to the last tween
    if (is.und(obj.endDelay)) { obj.endDelay = i === propArray.length - 1 ? tweenSettings.endDelay : 0; }
    return obj;
  }).map(function (k) { return mergeObjects(k, settings); });
}


function flattenKeyframes(keyframes) {
  var propertyNames = filterArray(flattenArray(keyframes.map(function (key) { return Object.keys(key); })), function (p) { return is.key(p); })
  .reduce(function (a,b) { if (a.indexOf(b) < 0) { a.push(b); } return a; }, []);
  var properties = {};
  var loop = function ( i ) {
    var propName = propertyNames[i];
    properties[propName] = keyframes.map(function (key) {
      var newKey = {};
      for (var p in key) {
        if (is.key(p)) {
          if (p == propName) { newKey.value = key[p]; }
        } else {
          newKey[p] = key[p];
        }
      }
      return newKey;
    });
  };

  for (var i = 0; i < propertyNames.length; i++) loop( i );
  return properties;
}

function getProperties(tweenSettings, params) {
  var properties = [];
  var keyframes = params.keyframes;
  if (keyframes) { params = mergeObjects(flattenKeyframes(keyframes), params); }
  for (var p in params) {
    if (is.key(p)) {
      properties.push({
        name: p,
        tweens: normalizePropertyTweens(params[p], tweenSettings)
      });
    }
  }
  return properties;
}

// Tweens

function normalizeTweenValues(tween, animatable) {
  var t = {};
  for (var p in tween) {
    var value = getFunctionValue(tween[p], animatable);
    if (is.arr(value)) {
      value = value.map(function (v) { return getFunctionValue(v, animatable); });
      if (value.length === 1) { value = value[0]; }
    }
    t[p] = value;
  }
  t.duration = parseFloat(t.duration);
  t.delay = parseFloat(t.delay);
  return t;
}

function normalizeTweens(prop, animatable) {
  var previousTween;
  return prop.tweens.map(function (t) {
    var tween = normalizeTweenValues(t, animatable);
    var tweenValue = tween.value;
    var to = is.arr(tweenValue) ? tweenValue[1] : tweenValue;
    var toUnit = getUnit(to);
    var originalValue = getOriginalTargetValue(animatable.target, prop.name, toUnit, animatable);
    var previousValue = previousTween ? previousTween.to.original : originalValue;
    var from = is.arr(tweenValue) ? tweenValue[0] : previousValue;
    var fromUnit = getUnit(from) || getUnit(originalValue);
    var unit = toUnit || fromUnit;
    if (is.und(to)) { to = previousValue; }
    tween.from = decomposeValue(from, unit);
    tween.to = decomposeValue(getRelativeValue(to, from), unit);
    tween.start = previousTween ? previousTween.end : 0;
    tween.end = tween.start + tween.delay + tween.duration + tween.endDelay;
    tween.easing = parseEasings(tween.easing, tween.duration);
    tween.isPath = is.pth(tweenValue);
    tween.isPathTargetInsideSVG = tween.isPath && is.svg(animatable.target);
    tween.isColor = is.col(tween.from.original);
    if (tween.isColor) { tween.round = 1; }
    previousTween = tween;
    return tween;
  });
}

// Tween progress

var setProgressValue = {
  css: function (t, p, v) { return t.style[p] = v; },
  attribute: function (t, p, v) { return t.setAttribute(p, v); },
  object: function (t, p, v) { return t[p] = v; },
  transform: function (t, p, v, transforms, manual) {
    transforms.list.set(p, v);
    if (p === transforms.last || manual) {
      var str = '';
      transforms.list.forEach(function (value, prop) { str += prop + "(" + value + ") "; });
      t.style.transform = str;
    }
  }
};

// Set Value helper

function setTargetsValue(targets, properties) {
  var animatables = getAnimatables(targets);
  animatables.forEach(function (animatable) {
    for (var property in properties) {
      var value = getFunctionValue(properties[property], animatable);
      var target = animatable.target;
      var valueUnit = getUnit(value);
      var originalValue = getOriginalTargetValue(target, property, valueUnit, animatable);
      var unit = valueUnit || getUnit(originalValue);
      var to = getRelativeValue(validateValue(value, unit), originalValue);
      var animType = getAnimationType(target, property);
      setProgressValue[animType](target, property, to, animatable.transforms, true);
    }
  });
}

// Animations

function createAnimation(animatable, prop) {
  var animType = getAnimationType(animatable.target, prop.name);
  if (animType) {
    var tweens = normalizeTweens(prop, animatable);
    var lastTween = tweens[tweens.length - 1];
    return {
      type: animType,
      property: prop.name,
      animatable: animatable,
      tweens: tweens,
      duration: lastTween.end,
      delay: tweens[0].delay,
      endDelay: lastTween.endDelay
    }
  }
}

function getAnimations(animatables, properties) {
  return filterArray(flattenArray(animatables.map(function (animatable) {
    return properties.map(function (prop) {
      return createAnimation(animatable, prop);
    });
  })), function (a) { return !is.und(a); });
}

// Create Instance

function getInstanceTimings(animations, tweenSettings) {
  var animLength = animations.length;
  var getTlOffset = function (anim) { return anim.timelineOffset ? anim.timelineOffset : 0; };
  var timings = {};
  timings.duration = animLength ? Math.max.apply(Math, animations.map(function (anim) { return getTlOffset(anim) + anim.duration; })) : tweenSettings.duration;
  timings.delay = animLength ? Math.min.apply(Math, animations.map(function (anim) { return getTlOffset(anim) + anim.delay; })) : tweenSettings.delay;
  timings.endDelay = animLength ? timings.duration - Math.max.apply(Math, animations.map(function (anim) { return getTlOffset(anim) + anim.duration - anim.endDelay; })) : tweenSettings.endDelay;
  return timings;
}

var instanceID = 0;

function createNewInstance(params) {
  var instanceSettings = replaceObjectProps(defaultInstanceSettings, params);
  var tweenSettings = replaceObjectProps(defaultTweenSettings, params);
  var properties = getProperties(tweenSettings, params);
  var animatables = getAnimatables(params.targets);
  var animations = getAnimations(animatables, properties);
  var timings = getInstanceTimings(animations, tweenSettings);
  var id = instanceID;
  instanceID++;
  return mergeObjects(instanceSettings, {
    id: id,
    children: [],
    animatables: animatables,
    animations: animations,
    duration: timings.duration,
    delay: timings.delay,
    endDelay: timings.endDelay
  });
}

// Core

var activeInstances = [];

var engine = (function () {
  var raf;

  function play() {
    if (!raf && (!isDocumentHidden() || !anime.suspendWhenDocumentHidden) && activeInstances.length > 0) {
      raf = requestAnimationFrame(step);
    }
  }
  function step(t) {
    // memo on algorithm issue:
    // dangerous iteration over mutable `activeInstances`
    // (that collection may be updated from within callbacks of `tick`-ed animation instances)
    var activeInstancesLength = activeInstances.length;
    var i = 0;
    while (i < activeInstancesLength) {
      var activeInstance = activeInstances[i];
      if (!activeInstance.paused) {
        activeInstance.tick(t);
        i++;
      } else {
        activeInstances.splice(i, 1);
        activeInstancesLength--;
      }
    }
    raf = i > 0 ? requestAnimationFrame(step) : undefined;
  }

  function handleVisibilityChange() {
    if (!anime.suspendWhenDocumentHidden) { return; }

    if (isDocumentHidden()) {
      // suspend ticks
      raf = cancelAnimationFrame(raf);
    } else { // is back to active tab
      // first adjust animations to consider the time that ticks were suspended
      activeInstances.forEach(
        function (instance) { return instance ._onDocumentVisibility(); }
      );
      engine();
    }
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  return play;
})();

function isDocumentHidden() {
  return !!document && document.hidden;
}

// Public Instance

function anime(params) {
  if ( params === void 0 ) params = {};


  var startTime = 0, lastTime = 0, now = 0;
  var children, childrenLength = 0;
  var resolve = null;

  function makePromise(instance) {
    var promise = window.Promise && new Promise(function (_resolve) { return resolve = _resolve; });
    instance.finished = promise;
    return promise;
  }

  var instance = createNewInstance(params);
  var promise = makePromise(instance);

  function toggleInstanceDirection() {
    var direction = instance.direction;
    if (direction !== 'alternate') {
      instance.direction = direction !== 'normal' ? 'normal' : 'reverse';
    }
    instance.reversed = !instance.reversed;
    children.forEach(function (child) { return child.reversed = instance.reversed; });
  }

  function adjustTime(time) {
    return instance.reversed ? instance.duration - time : time;
  }

  function resetTime() {
    startTime = 0;
    lastTime = adjustTime(instance.currentTime) * (1 / anime.speed);
  }

  function seekChild(time, child) {
    if (child) { child.seek(time - child.timelineOffset); }
  }

  function syncInstanceChildren(time) {
    if (!instance.reversePlayback) {
      for (var i = 0; i < childrenLength; i++) { seekChild(time, children[i]); }
    } else {
      for (var i$1 = childrenLength; i$1--;) { seekChild(time, children[i$1]); }
    }
  }

  function setAnimationsProgress(insTime) {
    var i = 0;
    var animations = instance.animations;
    var animationsLength = animations.length;
    while (i < animationsLength) {
      var anim = animations[i];
      var animatable = anim.animatable;
      var tweens = anim.tweens;
      var tweenLength = tweens.length - 1;
      var tween = tweens[tweenLength];
      // Only check for keyframes if there is more than one tween
      if (tweenLength) { tween = filterArray(tweens, function (t) { return (insTime < t.end); })[0] || tween; }
      var elapsed = minMax(insTime - tween.start - tween.delay, 0, tween.duration) / tween.duration;
      var eased = isNaN(elapsed) ? 1 : tween.easing(elapsed);
      var strings = tween.to.strings;
      var round = tween.round;
      var numbers = [];
      var toNumbersLength = tween.to.numbers.length;
      var progress = (void 0);
      for (var n = 0; n < toNumbersLength; n++) {
        var value = (void 0);
        var toNumber = tween.to.numbers[n];
        var fromNumber = tween.from.numbers[n] || 0;
        if (!tween.isPath) {
          value = fromNumber + (eased * (toNumber - fromNumber));
        } else {
          value = getPathProgress(tween.value, eased * toNumber, tween.isPathTargetInsideSVG);
        }
        if (round) {
          if (!(tween.isColor && n > 2)) {
            value = Math.round(value * round) / round;
          }
        }
        numbers.push(value);
      }
      // Manual Array.reduce for better performances
      var stringsLength = strings.length;
      if (!stringsLength) {
        progress = numbers[0];
      } else {
        progress = strings[0];
        for (var s = 0; s < stringsLength; s++) {
          var a = strings[s];
          var b = strings[s + 1];
          var n$1 = numbers[s];
          if (!isNaN(n$1)) {
            if (!b) {
              progress += n$1 + ' ';
            } else {
              progress += n$1 + b;
            }
          }
        }
      }
      setProgressValue[anim.type](animatable.target, anim.property, progress, animatable.transforms);
      anim.currentValue = progress;
      i++;
    }
  }

  function setCallback(cb) {
    if (instance[cb] && !instance.passThrough) { instance[cb](instance); }
  }

  function countIteration() {
    if (instance.remaining && instance.remaining !== true) {
      instance.remaining--;
    }
  }

  function setInstanceProgress(engineTime) {
    var insDuration = instance.duration;
    var insDelay = instance.delay;
    var insEndDelay = insDuration - instance.endDelay;
    var insTime = adjustTime(engineTime);
    instance.progress = minMax((insTime / insDuration) * 100, 0, 100);
    instance.reversePlayback = insTime < instance.currentTime;
    if (children) { syncInstanceChildren(insTime); }
    if (!instance.began && instance.currentTime > 0) {
      instance.began = true;
      setCallback('begin');
    }
    if (!instance.loopBegan && instance.currentTime > 0) {
      instance.loopBegan = true;
      setCallback('loopBegin');
    }
    if (insTime <= insDelay && instance.currentTime !== 0) {
      setAnimationsProgress(0);
    }
    if ((insTime >= insEndDelay && instance.currentTime !== insDuration) || !insDuration) {
      setAnimationsProgress(insDuration);
    }
    if (insTime > insDelay && insTime < insEndDelay) {
      if (!instance.changeBegan) {
        instance.changeBegan = true;
        instance.changeCompleted = false;
        setCallback('changeBegin');
      }
      setCallback('change');
      setAnimationsProgress(insTime);
    } else {
      if (instance.changeBegan) {
        instance.changeCompleted = true;
        instance.changeBegan = false;
        setCallback('changeComplete');
      }
    }
    instance.currentTime = minMax(insTime, 0, insDuration);
    if (instance.began) { setCallback('update'); }
    if (engineTime >= insDuration) {
      lastTime = 0;
      countIteration();
      if (!instance.remaining) {
        instance.paused = true;
        if (!instance.completed) {
          instance.completed = true;
          setCallback('loopComplete');
          setCallback('complete');
          if (!instance.passThrough && 'Promise' in window) {
            resolve();
            promise = makePromise(instance);
          }
        }
      } else {
        startTime = now;
        setCallback('loopComplete');
        instance.loopBegan = false;
        if (instance.direction === 'alternate') {
          toggleInstanceDirection();
        }
      }
    }
  }

  instance.reset = function() {
    var direction = instance.direction;
    instance.passThrough = false;
    instance.currentTime = 0;
    instance.progress = 0;
    instance.paused = true;
    instance.began = false;
    instance.loopBegan = false;
    instance.changeBegan = false;
    instance.completed = false;
    instance.changeCompleted = false;
    instance.reversePlayback = false;
    instance.reversed = direction === 'reverse';
    instance.remaining = instance.loop;
    children = instance.children;
    childrenLength = children.length;
    for (var i = childrenLength; i--;) { instance.children[i].reset(); }
    if (instance.reversed && instance.loop !== true || (direction === 'alternate' && instance.loop === 1)) { instance.remaining++; }
    setAnimationsProgress(instance.reversed ? instance.duration : 0);
  };

  // internal method (for engine) to adjust animation timings before restoring engine ticks (rAF)
  instance._onDocumentVisibility = resetTime;

  // Set Value helper

  instance.set = function(targets, properties) {
    setTargetsValue(targets, properties);
    return instance;
  };

  instance.tick = function(t) {
    now = t;
    if (!startTime) { startTime = now; }
    setInstanceProgress((now + (lastTime - startTime)) * anime.speed);
  };

  instance.seek = function(time) {
    setInstanceProgress(adjustTime(time));
  };

  instance.pause = function() {
    instance.paused = true;
    resetTime();
  };

  instance.play = function() {
    if (!instance.paused) { return; }
    if (instance.completed) { instance.reset(); }
    instance.paused = false;
    activeInstances.push(instance);
    resetTime();
    engine();
  };

  instance.reverse = function() {
    toggleInstanceDirection();
    instance.completed = instance.reversed ? false : true;
    resetTime();
  };

  instance.restart = function() {
    instance.reset();
    instance.play();
  };

  instance.remove = function(targets) {
    var targetsArray = parseTargets(targets);
    removeTargetsFromInstance(targetsArray, instance);
  };

  instance.reset();

  if (instance.autoplay) { instance.play(); }

  return instance;

}

// Remove targets from animation

function removeTargetsFromAnimations(targetsArray, animations) {
  for (var a = animations.length; a--;) {
    if (arrayContains(targetsArray, animations[a].animatable.target)) {
      animations.splice(a, 1);
    }
  }
}

function removeTargetsFromInstance(targetsArray, instance) {
  var animations = instance.animations;
  var children = instance.children;
  removeTargetsFromAnimations(targetsArray, animations);
  for (var c = children.length; c--;) {
    var child = children[c];
    var childAnimations = child.animations;
    removeTargetsFromAnimations(targetsArray, childAnimations);
    if (!childAnimations.length && !child.children.length) { children.splice(c, 1); }
  }
  if (!animations.length && !children.length) { instance.pause(); }
}

function removeTargetsFromActiveInstances(targets) {
  var targetsArray = parseTargets(targets);
  for (var i = activeInstances.length; i--;) {
    var instance = activeInstances[i];
    removeTargetsFromInstance(targetsArray, instance);
  }
}

// Stagger helpers

function stagger(val, params) {
  if ( params === void 0 ) params = {};

  var direction = params.direction || 'normal';
  var easing = params.easing ? parseEasings(params.easing) : null;
  var grid = params.grid;
  var axis = params.axis;
  var fromIndex = params.from || 0;
  var fromFirst = fromIndex === 'first';
  var fromCenter = fromIndex === 'center';
  var fromLast = fromIndex === 'last';
  var isRange = is.arr(val);
  var val1 = isRange ? parseFloat(val[0]) : parseFloat(val);
  var val2 = isRange ? parseFloat(val[1]) : 0;
  var unit = getUnit(isRange ? val[1] : val) || 0;
  var start = params.start || 0 + (isRange ? val1 : 0);
  var values = [];
  var maxValue = 0;
  return function (el, i, t) {
    if (fromFirst) { fromIndex = 0; }
    if (fromCenter) { fromIndex = (t - 1) / 2; }
    if (fromLast) { fromIndex = t - 1; }
    if (!values.length) {
      for (var index = 0; index < t; index++) {
        if (!grid) {
          values.push(Math.abs(fromIndex - index));
        } else {
          var fromX = !fromCenter ? fromIndex%grid[0] : (grid[0]-1)/2;
          var fromY = !fromCenter ? Math.floor(fromIndex/grid[0]) : (grid[1]-1)/2;
          var toX = index%grid[0];
          var toY = Math.floor(index/grid[0]);
          var distanceX = fromX - toX;
          var distanceY = fromY - toY;
          var value = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
          if (axis === 'x') { value = -distanceX; }
          if (axis === 'y') { value = -distanceY; }
          values.push(value);
        }
        maxValue = Math.max.apply(Math, values);
      }
      if (easing) { values = values.map(function (val) { return easing(val / maxValue) * maxValue; }); }
      if (direction === 'reverse') { values = values.map(function (val) { return axis ? (val < 0) ? val * -1 : -val : Math.abs(maxValue - val); }); }
    }
    var spacing = isRange ? (val2 - val1) / maxValue : val1;
    return start + (spacing * (Math.round(values[i] * 100) / 100)) + unit;
  }
}

// Timeline

function timeline(params) {
  if ( params === void 0 ) params = {};

  var tl = anime(params);
  tl.duration = 0;
  tl.add = function(instanceParams, timelineOffset) {
    var tlIndex = activeInstances.indexOf(tl);
    var children = tl.children;
    if (tlIndex > -1) { activeInstances.splice(tlIndex, 1); }
    function passThrough(ins) { ins.passThrough = true; }
    for (var i = 0; i < children.length; i++) { passThrough(children[i]); }
    var insParams = mergeObjects(instanceParams, replaceObjectProps(defaultTweenSettings, params));
    insParams.targets = insParams.targets || params.targets;
    var tlDuration = tl.duration;
    insParams.autoplay = false;
    insParams.direction = tl.direction;
    insParams.timelineOffset = is.und(timelineOffset) ? tlDuration : getRelativeValue(timelineOffset, tlDuration);
    passThrough(tl);
    tl.seek(insParams.timelineOffset);
    var ins = anime(insParams);
    passThrough(ins);
    children.push(ins);
    var timings = getInstanceTimings(children, params);
    tl.delay = timings.delay;
    tl.endDelay = timings.endDelay;
    tl.duration = timings.duration;
    tl.seek(0);
    tl.reset();
    if (tl.autoplay) { tl.play(); }
    return tl;
  };
  return tl;
}

anime.version = '3.2.1';
anime.speed = 1;
// TODO:#review: naming, documentation
anime.suspendWhenDocumentHidden = true;
anime.running = activeInstances;
anime.remove = removeTargetsFromActiveInstances;
anime.get = getOriginalTargetValue;
anime.set = setTargetsValue;
anime.convertPx = convertPxToUnit;
anime.path = getPath;
anime.setDashoffset = setDashoffset;
anime.stagger = stagger;
anime.timeline = timeline;
anime.easing = parseEasings;
anime.penner = penner;
anime.random = function (min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; };

module.exports = anime;

},{}],7:[function(require,module,exports){
/* global module */
'use strict';

/**
 * Class representing the API
 */
var SpotifyWebApi = (function () {
  var _baseUri = 'https://api.spotify.com/v1';
  var _accessToken = null;
  var _promiseImplementation = null;

  var WrapPromiseWithAbort = function (promise, onAbort) {
    promise.abort = onAbort;
    return promise;
  };

  var _promiseProvider = function (promiseFunction, onAbort) {
    var returnedPromise;
    if (_promiseImplementation !== null) {
      var deferred = _promiseImplementation.defer();
      promiseFunction(
        function (resolvedResult) {
          deferred.resolve(resolvedResult);
        },
        function (rejectedResult) {
          deferred.reject(rejectedResult);
        }
      );
      returnedPromise = deferred.promise;
    } else {
      if (window.Promise) {
        returnedPromise = new window.Promise(promiseFunction);
      }
    }

    if (returnedPromise) {
      return new WrapPromiseWithAbort(returnedPromise, onAbort);
    } else {
      return null;
    }
  };

  var _extend = function () {
    var args = Array.prototype.slice.call(arguments);
    var target = args[0];
    var objects = args.slice(1);
    target = target || {};
    objects.forEach(function (object) {
      for (var j in object) {
        if (object.hasOwnProperty(j)) {
          target[j] = object[j];
        }
      }
    });
    return target;
  };

  var _buildUrl = function (url, parameters) {
    var qs = '';
    for (var key in parameters) {
      if (parameters.hasOwnProperty(key)) {
        var value = parameters[key];
        qs += encodeURIComponent(key) + '=' + encodeURIComponent(value) + '&';
      }
    }
    if (qs.length > 0) {
      // chop off last '&'
      qs = qs.substring(0, qs.length - 1);
      url = url + '?' + qs;
    }
    return url;
  };

  var _performRequest = function (requestData, callback) {
    var req = new XMLHttpRequest();

    var promiseFunction = function (resolve, reject) {
      function success(data) {
        if (resolve) {
          resolve(data);
        }
        if (callback) {
          callback(null, data);
        }
      }

      function failure() {
        if (reject) {
          reject(req);
        }
        if (callback) {
          callback(req, null);
        }
      }

      var type = requestData.type || 'GET';
      req.open(type, _buildUrl(requestData.url, requestData.params));
      if (_accessToken) {
        req.setRequestHeader('Authorization', 'Bearer ' + _accessToken);
      }

      req.onreadystatechange = function () {
        if (req.readyState === 4) {
          var data = null;
          try {
            data = req.responseText ? JSON.parse(req.responseText) : '';
          } catch (e) {
            console.error(e);
          }

          if (req.status >= 200 && req.status < 300) {
            success(data);
          } else {
            failure();
          }
        }
      };

      if (type === 'GET') {
        req.send(null);
      } else {
        var postData = null;
        if (requestData.postData) {
          if (requestData.contentType === 'image/jpeg') {
            postData = requestData.postData;
            req.setRequestHeader('Content-Type', requestData.contentType);
          } else {
            postData = JSON.stringify(requestData.postData);
            req.setRequestHeader('Content-Type', 'application/json');
          }
        }
        req.send(postData);
      }
    };

    if (callback) {
      promiseFunction();
      return null;
    } else {
      return _promiseProvider(promiseFunction, function () {
        req.abort();
      });
    }
  };

  var _checkParamsAndPerformRequest = function (
    requestData,
    options,
    callback,
    optionsAlwaysExtendParams
  ) {
    var opt = {};
    var cb = null;

    if (typeof options === 'object') {
      opt = options;
      cb = callback;
    } else if (typeof options === 'function') {
      cb = options;
    }

    // options extend postData, if any. Otherwise they extend parameters sent in the url
    var type = requestData.type || 'GET';
    if (type !== 'GET' && requestData.postData && !optionsAlwaysExtendParams) {
      requestData.postData = _extend(requestData.postData, opt);
    } else {
      requestData.params = _extend(requestData.params, opt);
    }
    return _performRequest(requestData, cb);
  };

  /**
   * Creates an instance of the wrapper
   * @constructor
   */
  var Constr = function () {};

  Constr.prototype = {
    constructor: SpotifyWebApi
  };

  /**
   * Fetches a resource through a generic GET request.
   *
   * @param {string} url The URL to be fetched
   * @param {function(Object,Object)} callback An optional callback
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getGeneric = function (url, callback) {
    var requestData = {
      url: url
    };
    return _checkParamsAndPerformRequest(requestData, callback);
  };

  /**
   * Fetches information about the current user.
   * See [Get Current User's Profile](https://developer.spotify.com/web-api/get-current-users-profile/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getMe = function (options, callback) {
    var requestData = {
      url: _baseUri + '/me'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches current user's saved tracks.
   * See [Get Current User's Saved Tracks](https://developer.spotify.com/web-api/get-users-saved-tracks/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getMySavedTracks = function (options, callback) {
    var requestData = {
      url: _baseUri + '/me/tracks'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Adds a list of tracks to the current user's saved tracks.
   * See [Save Tracks for Current User](https://developer.spotify.com/web-api/save-tracks-user/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Array<string>} trackIds The ids of the tracks. If you know their Spotify URI it is easy
   * to find their track id (e.g. spotify:track:<here_is_the_track_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.addToMySavedTracks = function (trackIds, options, callback) {
    var requestData = {
      url: _baseUri + '/me/tracks',
      type: 'PUT',
      postData: trackIds
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Remove a list of tracks from the current user's saved tracks.
   * See [Remove Tracks for Current User](https://developer.spotify.com/web-api/remove-tracks-user/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Array<string>} trackIds The ids of the tracks. If you know their Spotify URI it is easy
   * to find their track id (e.g. spotify:track:<here_is_the_track_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.removeFromMySavedTracks = function (
    trackIds,
    options,
    callback
  ) {
    var requestData = {
      url: _baseUri + '/me/tracks',
      type: 'DELETE',
      postData: trackIds
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Checks if the current user's saved tracks contains a certain list of tracks.
   * See [Check Current User's Saved Tracks](https://developer.spotify.com/web-api/check-users-saved-tracks/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Array<string>} trackIds The ids of the tracks. If you know their Spotify URI it is easy
   * to find their track id (e.g. spotify:track:<here_is_the_track_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.containsMySavedTracks = function (
    trackIds,
    options,
    callback
  ) {
    var requestData = {
      url: _baseUri + '/me/tracks/contains',
      params: { ids: trackIds.join(',') }
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Get a list of the albums saved in the current Spotify user's "Your Music" library.
   * See [Get Current User's Saved Albums](https://developer.spotify.com/web-api/get-users-saved-albums/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getMySavedAlbums = function (options, callback) {
    var requestData = {
      url: _baseUri + '/me/albums'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Save one or more albums to the current user's "Your Music" library.
   * See [Save Albums for Current User](https://developer.spotify.com/web-api/save-albums-user/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Array<string>} albumIds The ids of the albums. If you know their Spotify URI, it is easy
   * to find their album id (e.g. spotify:album:<here_is_the_album_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.addToMySavedAlbums = function (albumIds, options, callback) {
    var requestData = {
      url: _baseUri + '/me/albums',
      type: 'PUT',
      postData: albumIds
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Remove one or more albums from the current user's "Your Music" library.
   * See [Remove Albums for Current User](https://developer.spotify.com/web-api/remove-albums-user/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Array<string>} albumIds The ids of the albums. If you know their Spotify URI, it is easy
   * to find their album id (e.g. spotify:album:<here_is_the_album_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.removeFromMySavedAlbums = function (
    albumIds,
    options,
    callback
  ) {
    var requestData = {
      url: _baseUri + '/me/albums',
      type: 'DELETE',
      postData: albumIds
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Check if one or more albums is already saved in the current Spotify user's "Your Music" library.
   * See [Check User's Saved Albums](https://developer.spotify.com/web-api/check-users-saved-albums/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Array<string>} albumIds The ids of the albums. If you know their Spotify URI, it is easy
   * to find their album id (e.g. spotify:album:<here_is_the_album_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.containsMySavedAlbums = function (
    albumIds,
    options,
    callback
  ) {
    var requestData = {
      url: _baseUri + '/me/albums/contains',
      params: { ids: albumIds.join(',') }
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Get the current user’s top artists based on calculated affinity.
   * See [Get a User’s Top Artists](https://developer.spotify.com/web-api/get-users-top-artists-and-tracks/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getMyTopArtists = function (options, callback) {
    var requestData = {
      url: _baseUri + '/me/top/artists'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Get the current user’s top tracks based on calculated affinity.
   * See [Get a User’s Top Tracks](https://developer.spotify.com/web-api/get-users-top-artists-and-tracks/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getMyTopTracks = function (options, callback) {
    var requestData = {
      url: _baseUri + '/me/top/tracks'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Get tracks from the current user’s recently played tracks.
   * See [Get Current User’s Recently Played Tracks](https://developer.spotify.com/web-api/web-api-personalization-endpoints/get-recently-played/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getMyRecentlyPlayedTracks = function (options, callback) {
    var requestData = {
      url: _baseUri + '/me/player/recently-played'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Adds the current user as a follower of one or more other Spotify users.
   * See [Follow Artists or Users](https://developer.spotify.com/web-api/follow-artists-users/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Array<string>} userIds The ids of the users. If you know their Spotify URI it is easy
   * to find their user id (e.g. spotify:user:<here_is_the_user_id>)
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is an empty value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.followUsers = function (userIds, callback) {
    var requestData = {
      url: _baseUri + '/me/following/',
      type: 'PUT',
      params: {
        ids: userIds.join(','),
        type: 'user'
      }
    };
    return _checkParamsAndPerformRequest(requestData, callback);
  };

  /**
   * Adds the current user as a follower of one or more artists.
   * See [Follow Artists or Users](https://developer.spotify.com/web-api/follow-artists-users/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Array<string>} artistIds The ids of the artists. If you know their Spotify URI it is easy
   * to find their artist id (e.g. spotify:artist:<here_is_the_artist_id>)
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is an empty value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.followArtists = function (artistIds, callback) {
    var requestData = {
      url: _baseUri + '/me/following/',
      type: 'PUT',
      params: {
        ids: artistIds.join(','),
        type: 'artist'
      }
    };
    return _checkParamsAndPerformRequest(requestData, callback);
  };

  /**
   * Add the current user as a follower of one playlist.
   * See [Follow a Playlist](https://developer.spotify.com/web-api/follow-playlist/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
   * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
   * @param {Object} options A JSON object with options that can be passed. For instance,
   * whether you want the playlist to be followed privately ({public: false})
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is an empty value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.followPlaylist = function (playlistId, options, callback) {
    var requestData = {
      url: _baseUri + '/playlists/' + playlistId + '/followers',
      type: 'PUT',
      postData: {}
    };

    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Removes the current user as a follower of one or more other Spotify users.
   * See [Unfollow Artists or Users](https://developer.spotify.com/web-api/unfollow-artists-users/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Array<string>} userIds The ids of the users. If you know their Spotify URI it is easy
   * to find their user id (e.g. spotify:user:<here_is_the_user_id>)
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is an empty value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.unfollowUsers = function (userIds, callback) {
    var requestData = {
      url: _baseUri + '/me/following/',
      type: 'DELETE',
      params: {
        ids: userIds.join(','),
        type: 'user'
      }
    };
    return _checkParamsAndPerformRequest(requestData, callback);
  };

  /**
   * Removes the current user as a follower of one or more artists.
   * See [Unfollow Artists or Users](https://developer.spotify.com/web-api/unfollow-artists-users/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Array<string>} artistIds The ids of the artists. If you know their Spotify URI it is easy
   * to find their artist id (e.g. spotify:artist:<here_is_the_artist_id>)
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is an empty value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.unfollowArtists = function (artistIds, callback) {
    var requestData = {
      url: _baseUri + '/me/following/',
      type: 'DELETE',
      params: {
        ids: artistIds.join(','),
        type: 'artist'
      }
    };
    return _checkParamsAndPerformRequest(requestData, callback);
  };

  /**
   * Remove the current user as a follower of one playlist.
   * See [Unfollow a Playlist](https://developer.spotify.com/web-api/unfollow-playlist/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
   * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is an empty value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.unfollowPlaylist = function (playlistId, callback) {
    var requestData = {
      url: _baseUri + '/playlists/' + playlistId + '/followers',
      type: 'DELETE'
    };
    return _checkParamsAndPerformRequest(requestData, callback);
  };

  /**
   * Checks to see if the current user is following one or more other Spotify users.
   * See [Check if Current User Follows Users or Artists](https://developer.spotify.com/web-api/check-current-user-follows/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Array<string>} userIds The ids of the users. If you know their Spotify URI it is easy
   * to find their user id (e.g. spotify:user:<here_is_the_user_id>)
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is an array of boolean values that indicate
   * whether the user is following the users sent in the request.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.isFollowingUsers = function (userIds, callback) {
    var requestData = {
      url: _baseUri + '/me/following/contains',
      type: 'GET',
      params: {
        ids: userIds.join(','),
        type: 'user'
      }
    };
    return _checkParamsAndPerformRequest(requestData, callback);
  };

  /**
   * Checks to see if the current user is following one or more artists.
   * See [Check if Current User Follows](https://developer.spotify.com/web-api/check-current-user-follows/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Array<string>} artistIds The ids of the artists. If you know their Spotify URI it is easy
   * to find their artist id (e.g. spotify:artist:<here_is_the_artist_id>)
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is an array of boolean values that indicate
   * whether the user is following the artists sent in the request.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.isFollowingArtists = function (artistIds, callback) {
    var requestData = {
      url: _baseUri + '/me/following/contains',
      type: 'GET',
      params: {
        ids: artistIds.join(','),
        type: 'artist'
      }
    };
    return _checkParamsAndPerformRequest(requestData, callback);
  };

  /**
   * Check to see if one or more Spotify users are following a specified playlist.
   * See [Check if Users Follow a Playlist](https://developer.spotify.com/web-api/check-user-following-playlist/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
   * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
   * @param {Array<string>} userIds The ids of the users. If you know their Spotify URI it is easy
   * to find their user id (e.g. spotify:user:<here_is_the_user_id>)
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is an array of boolean values that indicate
   * whether the users are following the playlist sent in the request.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.areFollowingPlaylist = function (
    playlistId,
    userIds,
    callback
  ) {
    var requestData = {
      url: _baseUri + '/playlists/' + playlistId + '/followers/contains',
      type: 'GET',
      params: {
        ids: userIds.join(',')
      }
    };
    return _checkParamsAndPerformRequest(requestData, callback);
  };

  /**
   * Get the current user's followed artists.
   * See [Get User's Followed Artists](https://developer.spotify.com/web-api/get-followed-artists/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Object} [options] Options, being after and limit.
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is an object with a paged object containing
   * artists.
   * @returns {Promise|undefined} A promise that if successful, resolves to an object containing a paging object which contains
   * artists objects. Not returned if a callback is given.
   */
  Constr.prototype.getFollowedArtists = function (options, callback) {
    var requestData = {
      url: _baseUri + '/me/following',
      type: 'GET',
      params: {
        type: 'artist'
      }
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches information about a specific user.
   * See [Get a User's Profile](https://developer.spotify.com/web-api/get-users-profile/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} userId The id of the user. If you know the Spotify URI it is easy
   * to find the id (e.g. spotify:user:<here_is_the_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getUser = function (userId, options, callback) {
    var requestData = {
      url: _baseUri + '/users/' + encodeURIComponent(userId)
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches a list of the current user's playlists.
   * See [Get a List of a User's Playlists](https://developer.spotify.com/web-api/get-list-users-playlists/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} userId An optional id of the user. If you know the Spotify URI it is easy
   * to find the id (e.g. spotify:user:<here_is_the_id>). If not provided, the id of the user that granted
   * the permissions will be used.
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getUserPlaylists = function (userId, options, callback) {
    var requestData;
    if (typeof userId === 'string') {
      requestData = {
        url: _baseUri + '/users/' + encodeURIComponent(userId) + '/playlists'
      };
    } else {
      requestData = {
        url: _baseUri + '/me/playlists'
      };
      callback = options;
      options = userId;
    }
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches a specific playlist.
   * See [Get a Playlist](https://developer.spotify.com/web-api/get-playlist/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
   * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getPlaylist = function (playlistId, options, callback) {
    var requestData = {
      url: _baseUri + '/playlists/' + playlistId
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches the tracks from a specific playlist.
   * See [Get a Playlist's Tracks](https://developer.spotify.com/web-api/get-playlists-tracks/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
   * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getPlaylistTracks = function (
    playlistId,
    options,
    callback
  ) {
    var requestData = {
      url: _baseUri + '/playlists/' + playlistId + '/tracks'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Gets the current image associated with a specific playlist.
   * See [Get a Playlist Cover Image](https://developer.spotify.com/documentation/web-api/reference/playlists/get-playlist-cover/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
   * to find the playlist id (e.g. spotify:playlist:<here_is_the_playlist_id>)
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getPlaylistCoverImage = function (playlistId, callback) {
    var requestData = {
      url: _baseUri + '/playlists/' + playlistId + '/images'
    };
    return _checkParamsAndPerformRequest(requestData, callback);
  };

  /**
   * Creates a playlist and stores it in the current user's library.
   * See [Create a Playlist](https://developer.spotify.com/web-api/create-playlist/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} userId The id of the user. If you know the Spotify URI it is easy
   * to find the id (e.g. spotify:user:<here_is_the_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.createPlaylist = function (userId, options, callback) {
    var requestData = {
      url: _baseUri + '/users/' + encodeURIComponent(userId) + '/playlists',
      type: 'POST',
      postData: options
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Change a playlist's name and public/private state
   * See [Change a Playlist's Details](https://developer.spotify.com/web-api/change-playlist-details/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
   * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
   * @param {Object} data A JSON object with the data to update. E.g. {name: 'A new name', public: true}
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.changePlaylistDetails = function (
    playlistId,
    data,
    callback
  ) {
    var requestData = {
      url: _baseUri + '/playlists/' + playlistId,
      type: 'PUT',
      postData: data
    };
    return _checkParamsAndPerformRequest(requestData, data, callback);
  };

  /**
   * Add tracks to a playlist.
   * See [Add Tracks to a Playlist](https://developer.spotify.com/web-api/add-tracks-to-playlist/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
   * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
   * @param {Array<string>} uris An array of Spotify URIs for the tracks
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.addTracksToPlaylist = function (
    playlistId,
    uris,
    options,
    callback
  ) {
    var requestData = {
      url: _baseUri + '/playlists/' + playlistId + '/tracks',
      type: 'POST',
      postData: {
        uris: uris
      }
    };
    return _checkParamsAndPerformRequest(requestData, options, callback, true);
  };

  /**
   * Replace the tracks of a playlist
   * See [Replace a Playlist's Tracks](https://developer.spotify.com/web-api/replace-playlists-tracks/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
   * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
   * @param {Array<string>} uris An array of Spotify URIs for the tracks
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.replaceTracksInPlaylist = function (
    playlistId,
    uris,
    callback
  ) {
    var requestData = {
      url: _baseUri + '/playlists/' + playlistId + '/tracks',
      type: 'PUT',
      postData: { uris: uris }
    };
    return _checkParamsAndPerformRequest(requestData, {}, callback);
  };

  /**
   * Reorder tracks in a playlist
   * See [Reorder a Playlist’s Tracks](https://developer.spotify.com/web-api/reorder-playlists-tracks/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
   * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
   * @param {number} rangeStart The position of the first track to be reordered.
   * @param {number} insertBefore The position where the tracks should be inserted. To reorder the tracks to
   * the end of the playlist, simply set insert_before to the position after the last track.
   * @param {Object} options An object with optional parameters (range_length, snapshot_id)
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.reorderTracksInPlaylist = function (
    playlistId,
    rangeStart,
    insertBefore,
    options,
    callback
  ) {
    /* eslint-disable camelcase */
    var requestData = {
      url: _baseUri + '/playlists/' + playlistId + '/tracks',
      type: 'PUT',
      postData: {
        range_start: rangeStart,
        insert_before: insertBefore
      }
    };
    /* eslint-enable camelcase */
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Remove tracks from a playlist
   * See [Remove Tracks from a Playlist](https://developer.spotify.com/web-api/remove-tracks-playlist/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
   * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
   * @param {Array<Object>} uris An array of tracks to be removed. Each element of the array can be either a
   * string, in which case it is treated as a URI, or an object containing the properties `uri` (which is a
   * string) and `positions` (which is an array of integers).
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.removeTracksFromPlaylist = function (
    playlistId,
    uris,
    callback
  ) {
    var dataToBeSent = uris.map(function (uri) {
      if (typeof uri === 'string') {
        return { uri: uri };
      } else {
        return uri;
      }
    });

    var requestData = {
      url: _baseUri + '/playlists/' + playlistId + '/tracks',
      type: 'DELETE',
      postData: { tracks: dataToBeSent }
    };
    return _checkParamsAndPerformRequest(requestData, {}, callback);
  };

  /**
   * Remove tracks from a playlist, specifying a snapshot id.
   * See [Remove Tracks from a Playlist](https://developer.spotify.com/web-api/remove-tracks-playlist/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
   * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
   * @param {Array<Object>} uris An array of tracks to be removed. Each element of the array can be either a
   * string, in which case it is treated as a URI, or an object containing the properties `uri` (which is a
   * string) and `positions` (which is an array of integers).
   * @param {string} snapshotId The playlist's snapshot ID against which you want to make the changes
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.removeTracksFromPlaylistWithSnapshotId = function (
    playlistId,
    uris,
    snapshotId,
    callback
  ) {
    var dataToBeSent = uris.map(function (uri) {
      if (typeof uri === 'string') {
        return { uri: uri };
      } else {
        return uri;
      }
    });
    /* eslint-disable camelcase */
    var requestData = {
      url: _baseUri + '/playlists/' + playlistId + '/tracks',
      type: 'DELETE',
      postData: {
        tracks: dataToBeSent,
        snapshot_id: snapshotId
      }
    };
    /* eslint-enable camelcase */
    return _checkParamsAndPerformRequest(requestData, {}, callback);
  };

  /**
   * Remove tracks from a playlist, specifying the positions of the tracks to be removed.
   * See [Remove Tracks from a Playlist](https://developer.spotify.com/web-api/remove-tracks-playlist/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
   * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
   * @param {Array<number>} positions array of integers containing the positions of the tracks to remove
   * from the playlist.
   * @param {string} snapshotId The playlist's snapshot ID against which you want to make the changes
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.removeTracksFromPlaylistInPositions = function (
    playlistId,
    positions,
    snapshotId,
    callback
  ) {
    /* eslint-disable camelcase */
    var requestData = {
      url: _baseUri + '/playlists/' + playlistId + '/tracks',
      type: 'DELETE',
      postData: {
        positions: positions,
        snapshot_id: snapshotId
      }
    };
    /* eslint-enable camelcase */
    return _checkParamsAndPerformRequest(requestData, {}, callback);
  };

  /**
   * Upload a custom playlist cover image.
   * See [Upload A Custom Playlist Cover Image](https://developer.spotify.com/web-api/upload-a-custom-playlist-cover-image/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} playlistId The id of the playlist. If you know the Spotify URI it is easy
   * to find the playlist id (e.g. spotify:user:xxxx:playlist:<here_is_the_playlist_id>)
   * @param {string} imageData Base64 encoded JPEG image data, maximum payload size is 256 KB.
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.uploadCustomPlaylistCoverImage = function (
    playlistId,
    imageData,
    callback
  ) {
    var requestData = {
      url: _baseUri + '/playlists/' + playlistId + '/images',
      type: 'PUT',
      postData: imageData.replace(/^data:image\/jpeg;base64,/, ''),
      contentType: 'image/jpeg'
    };
    return _checkParamsAndPerformRequest(requestData, {}, callback);
  };

  /**
   * Fetches an album from the Spotify catalog.
   * See [Get an Album](https://developer.spotify.com/web-api/get-album/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} albumId The id of the album. If you know the Spotify URI it is easy
   * to find the album id (e.g. spotify:album:<here_is_the_album_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getAlbum = function (albumId, options, callback) {
    var requestData = {
      url: _baseUri + '/albums/' + albumId
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches the tracks of an album from the Spotify catalog.
   * See [Get an Album's Tracks](https://developer.spotify.com/web-api/get-albums-tracks/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} albumId The id of the album. If you know the Spotify URI it is easy
   * to find the album id (e.g. spotify:album:<here_is_the_album_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getAlbumTracks = function (albumId, options, callback) {
    var requestData = {
      url: _baseUri + '/albums/' + albumId + '/tracks'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches multiple albums from the Spotify catalog.
   * See [Get Several Albums](https://developer.spotify.com/web-api/get-several-albums/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Array<string>} albumIds The ids of the albums. If you know their Spotify URI it is easy
   * to find their album id (e.g. spotify:album:<here_is_the_album_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getAlbums = function (albumIds, options, callback) {
    var requestData = {
      url: _baseUri + '/albums/',
      params: { ids: albumIds.join(',') }
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches a track from the Spotify catalog.
   * See [Get a Track](https://developer.spotify.com/web-api/get-track/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} trackId The id of the track. If you know the Spotify URI it is easy
   * to find the track id (e.g. spotify:track:<here_is_the_track_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getTrack = function (trackId, options, callback) {
    var requestData = {};
    requestData.url = _baseUri + '/tracks/' + trackId;
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches multiple tracks from the Spotify catalog.
   * See [Get Several Tracks](https://developer.spotify.com/web-api/get-several-tracks/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Array<string>} trackIds The ids of the tracks. If you know their Spotify URI it is easy
   * to find their track id (e.g. spotify:track:<here_is_the_track_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getTracks = function (trackIds, options, callback) {
    var requestData = {
      url: _baseUri + '/tracks/',
      params: { ids: trackIds.join(',') }
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches an artist from the Spotify catalog.
   * See [Get an Artist](https://developer.spotify.com/web-api/get-artist/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} artistId The id of the artist. If you know the Spotify URI it is easy
   * to find the artist id (e.g. spotify:artist:<here_is_the_artist_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getArtist = function (artistId, options, callback) {
    var requestData = {
      url: _baseUri + '/artists/' + artistId
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches multiple artists from the Spotify catalog.
   * See [Get Several Artists](https://developer.spotify.com/web-api/get-several-artists/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Array<string>} artistIds The ids of the artists. If you know their Spotify URI it is easy
   * to find their artist id (e.g. spotify:artist:<here_is_the_artist_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getArtists = function (artistIds, options, callback) {
    var requestData = {
      url: _baseUri + '/artists/',
      params: { ids: artistIds.join(',') }
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches the albums of an artist from the Spotify catalog.
   * See [Get an Artist's Albums](https://developer.spotify.com/web-api/get-artists-albums/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} artistId The id of the artist. If you know the Spotify URI it is easy
   * to find the artist id (e.g. spotify:artist:<here_is_the_artist_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getArtistAlbums = function (artistId, options, callback) {
    var requestData = {
      url: _baseUri + '/artists/' + artistId + '/albums'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches a list of top tracks of an artist from the Spotify catalog, for a specific country.
   * See [Get an Artist's Top Tracks](https://developer.spotify.com/web-api/get-artists-top-tracks/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} artistId The id of the artist. If you know the Spotify URI it is easy
   * to find the artist id (e.g. spotify:artist:<here_is_the_artist_id>)
   * @param {string} countryId The id of the country (e.g. ES for Spain or US for United States)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getArtistTopTracks = function (
    artistId,
    countryId,
    options,
    callback
  ) {
    var requestData = {
      url: _baseUri + '/artists/' + artistId + '/top-tracks',
      params: { country: countryId }
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches a list of artists related with a given one from the Spotify catalog.
   * See [Get an Artist's Related Artists](https://developer.spotify.com/web-api/get-related-artists/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} artistId The id of the artist. If you know the Spotify URI it is easy
   * to find the artist id (e.g. spotify:artist:<here_is_the_artist_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getArtistRelatedArtists = function (
    artistId,
    options,
    callback
  ) {
    var requestData = {
      url: _baseUri + '/artists/' + artistId + '/related-artists'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches a list of Spotify featured playlists (shown, for example, on a Spotify player's "Browse" tab).
   * See [Get a List of Featured Playlists](https://developer.spotify.com/web-api/get-list-featured-playlists/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getFeaturedPlaylists = function (options, callback) {
    var requestData = {
      url: _baseUri + '/browse/featured-playlists'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches a list of new album releases featured in Spotify (shown, for example, on a Spotify player's "Browse" tab).
   * See [Get a List of New Releases](https://developer.spotify.com/web-api/get-list-new-releases/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getNewReleases = function (options, callback) {
    var requestData = {
      url: _baseUri + '/browse/new-releases'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Get a list of categories used to tag items in Spotify (on, for example, the Spotify player's "Browse" tab).
   * See [Get a List of Categories](https://developer.spotify.com/web-api/get-list-categories/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getCategories = function (options, callback) {
    var requestData = {
      url: _baseUri + '/browse/categories'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Get a single category used to tag items in Spotify (on, for example, the Spotify player's "Browse" tab).
   * See [Get a Category](https://developer.spotify.com/web-api/get-category/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} categoryId The id of the category. These can be found with the getCategories function
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getCategory = function (categoryId, options, callback) {
    var requestData = {
      url: _baseUri + '/browse/categories/' + categoryId
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Get a list of Spotify playlists tagged with a particular category.
   * See [Get a Category's Playlists](https://developer.spotify.com/web-api/get-categorys-playlists/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} categoryId The id of the category. These can be found with the getCategories function
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getCategoryPlaylists = function (
    categoryId,
    options,
    callback
  ) {
    var requestData = {
      url: _baseUri + '/browse/categories/' + categoryId + '/playlists'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Get Spotify catalog information about artists, albums, tracks or playlists that match a keyword string.
   * See [Search for an Item](https://developer.spotify.com/web-api/search-item/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} query The search query
   * @param {Array<string>} types An array of item types to search across.
   * Valid types are: 'album', 'artist', 'playlist', and 'track'.
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.search = function (query, types, options, callback) {
    var requestData = {
      url: _baseUri + '/search/',
      params: {
        q: query,
        type: types.join(',')
      }
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches albums from the Spotify catalog according to a query.
   * See [Search for an Item](https://developer.spotify.com/web-api/search-item/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} query The search query
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.searchAlbums = function (query, options, callback) {
    return this.search(query, ['album'], options, callback);
  };

  /**
   * Fetches artists from the Spotify catalog according to a query.
   * See [Search for an Item](https://developer.spotify.com/web-api/search-item/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} query The search query
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.searchArtists = function (query, options, callback) {
    return this.search(query, ['artist'], options, callback);
  };

  /**
   * Fetches tracks from the Spotify catalog according to a query.
   * See [Search for an Item](https://developer.spotify.com/web-api/search-item/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} query The search query
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.searchTracks = function (query, options, callback) {
    return this.search(query, ['track'], options, callback);
  };

  /**
   * Fetches playlists from the Spotify catalog according to a query.
   * See [Search for an Item](https://developer.spotify.com/web-api/search-item/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} query The search query
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.searchPlaylists = function (query, options, callback) {
    return this.search(query, ['playlist'], options, callback);
  };

  /**
   * Fetches shows from the Spotify catalog according to a query.
   * See [Search for an Item](https://developer.spotify.com/web-api/search-item/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} query The search query
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.searchShows = function (query, options, callback) {
    return this.search(query, ['show'], options, callback);
  };

  /**
   * Fetches episodes from the Spotify catalog according to a query.
   * See [Search for an Item](https://developer.spotify.com/web-api/search-item/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} query The search query
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.searchEpisodes = function (query, options, callback) {
    return this.search(query, ['episode'], options, callback);
  };

  /**
   * Get audio features for a single track identified by its unique Spotify ID.
   * See [Get Audio Features for a Track](https://developer.spotify.com/web-api/get-audio-features/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} trackId The id of the track. If you know the Spotify URI it is easy
   * to find the track id (e.g. spotify:track:<here_is_the_track_id>)
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getAudioFeaturesForTrack = function (trackId, callback) {
    var requestData = {};
    requestData.url = _baseUri + '/audio-features/' + trackId;
    return _checkParamsAndPerformRequest(requestData, {}, callback);
  };

  /**
   * Get audio features for multiple tracks based on their Spotify IDs.
   * See [Get Audio Features for Several Tracks](https://developer.spotify.com/web-api/get-several-audio-features/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Array<string>} trackIds The ids of the tracks. If you know their Spotify URI it is easy
   * to find their track id (e.g. spotify:track:<here_is_the_track_id>)
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getAudioFeaturesForTracks = function (trackIds, callback) {
    var requestData = {
      url: _baseUri + '/audio-features',
      params: { ids: trackIds }
    };
    return _checkParamsAndPerformRequest(requestData, {}, callback);
  };

  /**
   * Get audio analysis for a single track identified by its unique Spotify ID.
   * See [Get Audio Analysis for a Track](https://developer.spotify.com/web-api/get-audio-analysis/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} trackId The id of the track. If you know the Spotify URI it is easy
   * to find the track id (e.g. spotify:track:<here_is_the_track_id>)
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getAudioAnalysisForTrack = function (trackId, callback) {
    var requestData = {};
    requestData.url = _baseUri + '/audio-analysis/' + trackId;
    return _checkParamsAndPerformRequest(requestData, {}, callback);
  };

  /**
   * Create a playlist-style listening experience based on seed artists, tracks and genres.
   * See [Get Recommendations Based on Seeds](https://developer.spotify.com/web-api/get-recommendations/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getRecommendations = function (options, callback) {
    var requestData = {
      url: _baseUri + '/recommendations'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Retrieve a list of available genres seed parameter values for recommendations.
   * See [Available Genre Seeds](https://developer.spotify.com/web-api/get-recommendations/#available-genre-seeds) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getAvailableGenreSeeds = function (callback) {
    var requestData = {
      url: _baseUri + '/recommendations/available-genre-seeds'
    };
    return _checkParamsAndPerformRequest(requestData, {}, callback);
  };

  /**
   * Get information about a user’s available devices.
   * See [Get a User’s Available Devices](https://developer.spotify.com/web-api/get-a-users-available-devices/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getMyDevices = function (callback) {
    var requestData = {
      url: _baseUri + '/me/player/devices'
    };
    return _checkParamsAndPerformRequest(requestData, {}, callback);
  };

  /**
   * Get information about the user’s current playback state, including track, track progress, and active device.
   * See [Get Information About The User’s Current Playback](https://developer.spotify.com/web-api/get-information-about-the-users-current-playback/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Object} options A JSON object with options that can be passed.
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getMyCurrentPlaybackState = function (options, callback) {
    var requestData = {
      url: _baseUri + '/me/player'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Get the object currently being played on the user’s Spotify account.
   * See [Get the User’s Currently Playing Track](https://developer.spotify.com/web-api/get-the-users-currently-playing-track/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Object} options A JSON object with options that can be passed.
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getMyCurrentPlayingTrack = function (options, callback) {
    var requestData = {
      url: _baseUri + '/me/player/currently-playing'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Transfer playback to a new device and determine if it should start playing.
   * See [Transfer a User’s Playback](https://developer.spotify.com/web-api/transfer-a-users-playback/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Array<string>} deviceIds A JSON array containing the ID of the device on which playback should be started/transferred.
   * @param {Object} options A JSON object with options that can be passed.
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.transferMyPlayback = function (
    deviceIds,
    options,
    callback
  ) {
    var postData = options || {};
    postData.device_ids = deviceIds;
    var requestData = {
      type: 'PUT',
      url: _baseUri + '/me/player',
      postData: postData
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Play a track on the user's active device
   * See [Start/Resume a User's Playback](https://developer.spotify.com/documentation/web-api/reference/player/start-a-users-playback/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Object} options A JSON object with options that can be passed.
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.play = function (options, callback) {
    options = options || {};
    var params =
      'device_id' in options ? { device_id: options.device_id } : null;
    var postData = {};
    ['context_uri', 'uris', 'offset', 'position_ms'].forEach(function (field) {
      if (field in options) {
        postData[field] = options[field];
      }
    });
    var requestData = {
      type: 'PUT',
      url: _baseUri + '/me/player/play',
      params: params,
      postData: postData
    };

    // need to clear options so it doesn't add all of them to the query params
    var newOptions = typeof options === 'function' ? options : {};
    return _checkParamsAndPerformRequest(requestData, newOptions, callback);
  };

  /**
   * Add an item to the end of the user’s current playback queue.
   * See [Add an Item to the User's Playback Queue](https://developer.spotify.com/documentation/web-api/reference/player/add-to-queue/) on
   * the Spotify Developer site for more information about the endpoint.
   * @param {string} uri The uri of the item to add to the queue. Must be a track or an episode uri.
   * @param {Object} options A JSON object with options that can be passed.
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.queue = function (uri, options, callback) {
    options = options || {};
    var params =
      'device_id' in options
        ? { uri: uri, device_id: options.device_id }
        : { uri: uri };
    var requestData = {
      type: 'POST',
      url: _baseUri + '/me/player/queue',
      params: params
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Pause playback on the user’s account.
   * See [Pause a User’s Playback](https://developer.spotify.com/web-api/pause-a-users-playback/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Object} options A JSON object with options that can be passed.
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.pause = function (options, callback) {
    options = options || {};
    var params =
      'device_id' in options ? { device_id: options.device_id } : null;
    var requestData = {
      type: 'PUT',
      url: _baseUri + '/me/player/pause',
      params: params
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Skips to next track in the user’s queue.
   * See [Skip User’s Playback To Next Track](https://developer.spotify.com/web-api/skip-users-playback-to-next-track/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Object} options A JSON object with options that can be passed.
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.skipToNext = function (options, callback) {
    options = options || {};
    var params =
      'device_id' in options ? { device_id: options.device_id } : null;
    var requestData = {
      type: 'POST',
      url: _baseUri + '/me/player/next',
      params: params
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Skips to previous track in the user’s queue.
   * Note that this will ALWAYS skip to the previous track, regardless of the current track’s progress.
   * Returning to the start of the current track should be performed using `.seek()`
   * See [Skip User’s Playback To Previous Track](https://developer.spotify.com/web-api/skip-users-playback-to-next-track/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Object} options A JSON object with options that can be passed.
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.skipToPrevious = function (options, callback) {
    options = options || {};
    var params =
      'device_id' in options ? { device_id: options.device_id } : null;
    var requestData = {
      type: 'POST',
      url: _baseUri + '/me/player/previous',
      params: params
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Seeks to the given position in the user’s currently playing track.
   * See [Seek To Position In Currently Playing Track](https://developer.spotify.com/web-api/seek-to-position-in-currently-playing-track/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {number} position_ms The position in milliseconds to seek to. Must be a positive number.
   * @param {Object} options A JSON object with options that can be passed.
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.seek = function (position_ms, options, callback) {
    options = options || {};
    var params = {
      position_ms: position_ms
    };
    if ('device_id' in options) {
      params.device_id = options.device_id;
    }
    var requestData = {
      type: 'PUT',
      url: _baseUri + '/me/player/seek',
      params: params
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Set the repeat mode for the user’s playback. Options are repeat-track, repeat-context, and off.
   * See [Set Repeat Mode On User’s Playback](https://developer.spotify.com/web-api/set-repeat-mode-on-users-playback/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {String} state A string set to 'track', 'context' or 'off'.
   * @param {Object} options A JSON object with options that can be passed.
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.setRepeat = function (state, options, callback) {
    options = options || {};
    var params = {
      state: state
    };
    if ('device_id' in options) {
      params.device_id = options.device_id;
    }
    var requestData = {
      type: 'PUT',
      url: _baseUri + '/me/player/repeat',
      params: params
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Set the volume for the user’s current playback device.
   * See [Set Volume For User’s Playback](https://developer.spotify.com/web-api/set-volume-for-users-playback/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {number} volume_percent The volume to set. Must be a value from 0 to 100 inclusive.
   * @param {Object} options A JSON object with options that can be passed.
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.setVolume = function (volume_percent, options, callback) {
    options = options || {};
    var params = {
      volume_percent: volume_percent
    };
    if ('device_id' in options) {
      params.device_id = options.device_id;
    }
    var requestData = {
      type: 'PUT',
      url: _baseUri + '/me/player/volume',
      params: params
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Toggle shuffle on or off for user’s playback.
   * See [Toggle Shuffle For User’s Playback](https://developer.spotify.com/web-api/toggle-shuffle-for-users-playback/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {bool} state Whether or not to shuffle user's playback.
   * @param {Object} options A JSON object with options that can be passed.
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.setShuffle = function (state, options, callback) {
    options = options || {};
    var params = {
      state: state
    };
    if ('device_id' in options) {
      params.device_id = options.device_id;
    }
    var requestData = {
      type: 'PUT',
      url: _baseUri + '/me/player/shuffle',
      params: params
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches a show from the Spotify catalog.
   * See [Get a Show](https://developer.spotify.com/documentation/web-api/reference/shows/get-a-show/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} showId The id of the show. If you know the Spotify URI it is easy
   * to find the show id (e.g. spotify:show:<here_is_the_show_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getShow = function (showId, options, callback) {
    var requestData = {};
    requestData.url = _baseUri + '/shows/' + showId;
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches multiple shows from the Spotify catalog.
   * See [Get Several Shows](https://developer.spotify.com/documentation/web-api/reference/shows/get-several-shows/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Array<string>} showIds The ids of the shows. If you know their Spotify URI it is easy
   * to find their show id (e.g. spotify:show:<here_is_the_show_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getShows = function (showIds, options, callback) {
    var requestData = {
      url: _baseUri + '/shows/',
      params: { ids: showIds.join(',') }
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches current user's saved shows.
   * See [Get Current User's Saved Shows](https://developer.spotify.com/documentation/web-api/reference/library/get-users-saved-shows/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getMySavedShows = function (options, callback) {
    var requestData = {
      url: _baseUri + '/me/shows'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Adds a list of shows to the current user's saved shows.
   * See [Save Shows for Current User](https://developer.spotify.com/documentation/web-api/reference/library/save-shows-user/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Array<string>} showIds The ids of the shows. If you know their Spotify URI it is easy
   * to find their show id (e.g. spotify:show:<here_is_the_show_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.addToMySavedShows = function (showIds, options, callback) {
    var requestData = {
      url: _baseUri + '/me/shows',
      type: 'PUT',
      postData: showIds
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Remove a list of shows from the current user's saved shows.
   * See [Remove Shows for Current User](https://developer.spotify.com/documentation/web-api/reference/library/remove-shows-user/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Array<string>} showIds The ids of the shows. If you know their Spotify URI it is easy
   * to find their show id (e.g. spotify:show:<here_is_the_show_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.removeFromMySavedShows = function (
    showIds,
    options,
    callback
  ) {
    var requestData = {
      url: _baseUri + '/me/shows',
      type: 'DELETE',
      postData: showIds
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Checks if the current user's saved shows contains a certain list of shows.
   * See [Check Current User's Saved Shows](https://developer.spotify.com/documentation/web-api/reference/library/check-users-saved-shows/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Array<string>} showIds The ids of the shows. If you know their Spotify URI it is easy
   * to find their show id (e.g. spotify:show:<here_is_the_show_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.containsMySavedShows = function (
    showIds,
    options,
    callback
  ) {
    var requestData = {
      url: _baseUri + '/me/shows/contains',
      params: { ids: showIds.join(',') }
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches the episodes of a show from the Spotify catalog.
   * See [Get a Show's Episodes](https://developer.spotify.com/documentation/web-api/reference/shows/get-shows-episodes/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} showId The id of the show. If you know the Spotify URI it is easy
   * to find the show id (e.g. spotify:show:<here_is_the_show_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getShowEpisodes = function (showId, options, callback) {
    var requestData = {
      url: _baseUri + '/shows/' + showId + '/episodes'
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches an episode from the Spotify catalog.
   * See [Get an Episode](https://developer.spotify.com/documentation/web-api/reference/episodes/get-an-episode/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {string} episodeId The id of the episode. If you know the Spotify URI it is easy
   * to find the episode id (e.g. spotify:episode:<here_is_the_episode_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getEpisode = function (episodeId, options, callback) {
    var requestData = {};
    requestData.url = _baseUri + '/episodes/' + episodeId;
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Fetches multiple episodes from the Spotify catalog.
   * See [Get Several Episodes](https://developer.spotify.com/documentation/web-api/reference/episodes/get-several-episodes/) on
   * the Spotify Developer site for more information about the endpoint.
   *
   * @param {Array<string>} episodeIds The ids of the episodes. If you know their Spotify URI it is easy
   * to find their episode id (e.g. spotify:episode:<here_is_the_episode_id>)
   * @param {Object} options A JSON object with options that can be passed
   * @param {function(Object,Object)} callback An optional callback that receives 2 parameters. The first
   * one is the error object (null if no error), and the second is the value if the request succeeded.
   * @return {Object} Null if a callback is provided, a `Promise` object otherwise
   */
  Constr.prototype.getEpisodes = function (episodeIds, options, callback) {
    var requestData = {
      url: _baseUri + '/episodes/',
      params: { ids: episodeIds.join(',') }
    };
    return _checkParamsAndPerformRequest(requestData, options, callback);
  };

  /**
   * Gets the access token in use.
   *
   * @return {string} accessToken The access token
   */
  Constr.prototype.getAccessToken = function () {
    return _accessToken;
  };

  /**
   * Sets the access token to be used.
   * See [the Authorization Guide](https://developer.spotify.com/web-api/authorization-guide/) on
   * the Spotify Developer site for more information about obtaining an access token.
   *
   * @param {string} accessToken The access token
   * @return {void}
   */
  Constr.prototype.setAccessToken = function (accessToken) {
    _accessToken = accessToken;
  };

  /**
   * Sets an implementation of Promises/A+ to be used. E.g. Q, when.
   * See [Conformant Implementations](https://github.com/promises-aplus/promises-spec/blob/master/implementations.md)
   * for a list of some available options
   *
   * @param {Object} PromiseImplementation A Promises/A+ valid implementation
   * @throws {Error} If the implementation being set doesn't conform with Promises/A+
   * @return {void}
   */
  Constr.prototype.setPromiseImplementation = function (PromiseImplementation) {
    var valid = false;
    try {
      var p = new PromiseImplementation(function (resolve) {
        resolve();
      });
      if (typeof p.then === 'function' && typeof p.catch === 'function') {
        valid = true;
      }
    } catch (e) {
      console.error(e);
    }
    if (valid) {
      _promiseImplementation = PromiseImplementation;
    } else {
      throw new Error('Unsupported implementation of Promises/A+');
    }
  };

  return Constr;
})();

if (typeof module === 'object' && typeof module.exports === 'object') {
  module.exports = SpotifyWebApi;
}

},{}]},{},[1]);
