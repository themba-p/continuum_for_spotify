importScripts("secrets.js");
importScripts("auth.js");

const _credentials = getSpotifyCredentials(true);
let _state, _access_token, _token_expiry;
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
    getAccessTokenAsync(sendResponse);
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
