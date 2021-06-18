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
