function createSpotifyEndpoint() {
  _state = encodeURIComponent(
    "meet" + Math.random().toString(36).substring(2, 15)
  );
  return `https://accounts.spotify.com/authorize?response_type=code&client_id=${_credentials.clientId}&redirect_uri=${_credentials.redirectUri}&state=${_state}&scope=${_credentials.scope}&show_dialog=true`;
}

function WebAuthFlowCallback(redirectUri) {
  console.log(redirectUri);
  return new Promise((resolve, reject) => {
    handleRedirectUri(redirectUri)
      .then((code) =>
        validate(code).then((accessToken) => {
          resolve(accessToken);
        })
      )
      .catch(() => reject());
  }).catch(() => Promise.resolve(null));
}

function handleRedirectUri(redirectUri) {
  return new Promise((resolve, reject) => {
    if (!redirectUri) reject();
    const code = extractCode(redirectUri);
    resolve(code);
  }).catch(() => Promise.resolve(null));
}

function extractCode(redirectUri) {
  let m = redirectUri.match(/[#?](.*)/);
  if (!m || m.length < 1) return null;
  let params = new URLSearchParams(m[1].split("#")[0]);
  return params.get("code");
}

function validate(code) {
  return new Promise(async (resolve, reject) => {
    if (!code) reject();

    const uri = "https://accounts.spotify.com/api/token";
    const params = {
      method: "POST",
      body: `grant_type=authorization_code&code=${code}&redirect_uri=${_credentials.redirectUri}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          btoa(`${_credentials.clientId}:${_credentials.clientSecret}`),
      },
    };

    const token = await getAuthTokens(uri, params);
    token ? resolve(token) : reject();
  });
}

function getAuthTokens(uri, params) {
  return new Promise((resolve, reject) => {
    fetch(uri, params)
      .then((response) => {
        if (!response) reject();
        response
          .json()
          .then((responseJson) => {
            if (!responseJson) reject();

            const {
              access_token: accessToken,
              refresh_token: refreshToken,
              expires_in: expiresIn,
            } = responseJson;

            let tokenExpiry = new Date();
            tokenExpiry.setSeconds(tokenExpiry.getSeconds() + expiresIn);

            _access_token = accessToken;
            _token_expiry = tokenExpiry;
            storeCredentials(accessToken, refreshToken, tokenExpiry);
            resolve(accessToken);
          })
          .catch(() => {
            reject();
          });
      })
      .catch(() => Promise.resolve(null));
  });
}

function storeCredentials(accessToken, refreshToken, tokenExpiry) {
  chrome.storage.local.set({ [keys.accessToken]: accessToken });
  chrome.storage.local.set({ [keys.refreshToken]: refreshToken });
  chrome.storage.local.set({ [keys.tokenExpiry]: tokenExpiry.toJSON() });
}

function readLocalStorageAsync(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], (result) => {
      if (result && result[key]) {
        resolve(result[key]);
      } else {
        reject();
      }
    });
  }).catch((e) => console.log(e));
}

function getAccessTokenAsync(sendResponse) {
  if (_access_token && _token_expiry) {
    const currentDate = new Date();

    if (currentDate > _token_expiry) {
      refreshAccessToken()
        .then((newAccessToken) => {
          if (newAccessToken) {
            _access_token = newAccessToken;
            sendResponse({ message: "success", token: newAccessToken });
          } else {
            console.log("failed to get new access token");
            sendResponse({ message: "failure" });
          }
        })
        .catch((e) => {
          console.log("failed to get new access token");
          sendResponse({ message: "failure" });
        });
    } else {
      sendResponse({ message: "success", token: _access_token });
    }
  } else {
    readLocalStorageAsync(keys.accessToken)
      .then((token) => {
        _access_token = token;

        if (!token) {
          sendResponse({ message: "failed to get access token." });
          return;
        }

        readLocalStorageAsync(keys.tokenExpiry)
          .then((tokenExpiryJSON) => {
            if (tokenExpiryJSON) {
              const currentDate = new Date();
              const tokenExpiry = new Date(tokenExpiryJSON);

              _token_expiry = tokenExpiry;

              if (currentDate > tokenExpiry) {
                refreshAccessToken()
                  .then((newAccessToken) => {
                    if (newAccessToken) {
                      _access_token = newAccessToken;
                      sendResponse({
                        message: "success",
                        token: newAccessToken,
                      });
                    } else {
                      console.log("failed to get new access token");
                      sendResponse({ message: "failure" });
                    }
                  })
                  .catch((e) => {
                    console.log("failed to get new access token");
                    sendResponse({ message: "failure" });
                  });
              } else {
                sendResponse({ message: "success", token: token });
              }
            }
          })
          .catch((e) => {
            console.log(e);
            sendResponse({ message: "failure" });
          });
      })
      .catch((e) => {
        console.log(e);
        sendResponse({ message: "failure" });
      });
  }
}

function getAccessTokenAsync(sendResponse) {
  if (_access_token && _token_expiry) {
    const currentDate = new Date();

    if (currentDate > _token_expiry) {
      refreshAccessToken()
        .then((newAccessToken) => {
          if (newAccessToken) {
            _access_token = newAccessToken;
            sendResponse({ message: "success", token: newAccessToken });
          } else {
            console.log("failed to get new access token");
            sendResponse({ message: "failure" });
          }
        })
        .catch((e) => {
          console.log("failed to get new access token");
          sendResponse({ message: "failure" });
        });
    } else {
      sendResponse({ message: "success", token: _access_token });
    }
  } else {
    readLocalStorageAsync(keys.accessToken)
      .then((token) => {
        _access_token = token;

        if (!token) {
          sendResponse({ message: "failed to get access token." });
          return;
        }

        readLocalStorageAsync(keys.tokenExpiry)
          .then((tokenExpiryJSON) => {
            if (tokenExpiryJSON) {
              const currentDate = new Date();
              const tokenExpiry = new Date(tokenExpiryJSON);

              _token_expiry = tokenExpiry;

              if (currentDate > tokenExpiry) {
                refreshAccessToken()
                  .then((newAccessToken) => {
                    if (newAccessToken) {
                      _access_token = newAccessToken;
                      sendResponse({
                        message: "success",
                        token: newAccessToken,
                      });
                    } else {
                      console.log("failed to get new access token");
                      sendResponse({ message: "failure" });
                    }
                  })
                  .catch((e) => {
                    console.log("failed to get new access token");
                    sendResponse({ message: "failure" });
                  });
              } else {
                sendResponse({ message: "success", token: token });
              }
            }
          })
          .catch((e) => {
            console.log(e);
            sendResponse({ message: "failure" });
          });
      })
      .catch((e) => {
        console.log(e);
        sendResponse({ message: "failure" });
      });
  }
}

function refreshAccessToken() {
  const uri = "https://accounts.spotify.com/api/token";

  return new Promise((resolve, reject) => {
    readLocalStorageAsync(keys.refreshToken).then((result) => {
      const params = {
        method: "POST",
        body: `grant_type=refresh_token&refresh_token=${result}`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            btoa(
              `21d0b374958f4733a98bd1e5919ae85c:e38945e6a0d34e4b8b2bc28b179148c4`
            ),
        },
      };

      fetch(uri, params)
        .then((response) => {
          response.json().then((responseJson) => {
            const {
              access_token: accessToken,
              refresh_token: refreshToken,
              expires_in: expiresIn,
            } = responseJson;

            let tokenExpiry = new Date();
            tokenExpiry.setSeconds(tokenExpiry.getSeconds() + expiresIn);

            _access_token = accessToken;
            _token_expiry = tokenExpiry;

            chrome.storage.local.set(
              { [keys.accessToken]: accessToken },
              () => {}
            );

            chrome.storage.local.set(
              {
                [keys.refreshToken]: refreshToken,
              },
              function () {}
            );

            chrome.storage.local.set(
              {
                [keys.tokenExpiry]: tokenExpiry.toJSON(),
              },
              function () {}
            );
            resolve(accessToken);
          });
        })
        .catch((e) => {
          console.log(e);
          reject(null);
        });
    });
  });
}
