importScripts("secrets.js");
importScripts("auth.js");

const _credentials = getSpotifyCredentials(true);
let _state, _access_token, _token_expiry, _refreshToken;
let nowplaying, profile, savedTracks;

const keys = {
  accessToken: "access_token",
  refreshToken: "refresh_token",
  tokenExpiry: "token_expire",
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "log") {
    console.warn(request.content);
  } else if (request.message === "login") {
    loadLocalStorageAsync().then(() => {
      if (isAccessTokenValid()) {
        sendResponse({ message: "success", token: _access_token });
      } else {
        refreshAccessToken().then((token) => {
          sendResponse({ message: "success", token: token });
        }).catch(() => {
          sendResponse({ message: "fail" });
        })
      }
    });
  } else if (request.message === "authenticate") {
    chrome.identity.launchWebAuthFlow(
      {
        url: createSpotifyEndpoint(),
        interactive: true,
      },
      (redirectUri) => {
        console.log(_credentials);
        if (chrome.runtime.lastError) {
          console.warn(chrome.runtime.lastError.message);
          sendResponse({ message: "fail" });
        } else {
          WebAuthFlowCallback(redirectUri).then((accessToken) => {
            console.log("Token:" + accessToken);
            if (accessToken)
              sendResponse({ message: "success", token: accessToken });
            else sendResponse({ message: "fail" });
          });
        }
      }
    );
  } else if (request.message === "logout") {
    chrome.storage.local.clear(() => {
      _access_token = "";
      nowplaying = null;
      profile = null;
      _state = null;

      sendResponse({ message: "success" });
    });
  }

  return true;
});

function loadLocalStorageAsync() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(null, (items) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      const allKeys = Object.keys(items);
      allKeys.forEach((key) => {
        if (key === keys.accessToken) _access_token = items[key];
        else if (key === keys.refreshToken) _refreshToken = items[key];
        else if (key === keys.tokenExpiry) {
          const expiryJSON = items[key];

          if (expiryJSON)
            _token_expiry = new Date(expiryJSON)
        }
      });
      resolve(items);
    });
  });
}

function isAccessTokenValid() {
  if (!_token_expiry) return false;

  const dateNow = new Date();
  if (dateNow > _token_expiry) return false;

  return true;
}


