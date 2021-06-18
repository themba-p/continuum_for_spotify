importScripts("secrets.js");
let _sendResponse;

const _credentials = getSpotifyCredentials(true);
let _state, _access_token, _token_expiry;
let nowplaying, profile, savedTracks;

const keys = {
  accessToken: "access_token",
  refreshToken: "refresh_token",
  tokenExpiry: "token_expire",
};

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  // _sendResponse = sendResponse;
  if (request.message === "log") {
    console.warn(request.content);
  } else if (request.message === "authenticate") {
    console.log("authenticating...");
    setTimeout(() => {
      sendResponse({ message: "Bitch" });
    }, 3000);
    // authenticate().then((accessToken) => {
    //   console.log("async finished")
    //    sendResponse({ message: accessToken });
    // });
  }
  
  return true;
});

// chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
//   if (request.message === "login") {
//     try {
//       getAccessTokenAsync(sendResponse);
//     } catch (error) {
//       console.error("Token error. " + error);
//     }
//     return true;
//   } else if (request.message === "authenticate") {
//     // try {
//     //   const accessToken = await authenticate();
//     //   console.log(accessToken);
//     //   if (accessToken) {
//     //     sendResponse({ message: "success", token: accessToken });
//     //   } else {
//     //     sendResponse({ message: "fail" });
//     //   }
//     // } catch (error) {
//     //   sendResponse({ message: "fail" });
//     // }

//     return true;
//     // console.log("Authenticating...");
//     // chrome.identity.launchWebAuthFlow(
//     //   {
//     //     url: createSpotifyEndpoint(),
//     //     interactive: true,
//     //   },
//     //   function (redirectUri) {
//     //     if (!redirectUri) return false;

//     //     const code = extractCode(redirectUri);

//     //     if (code) {
//     //       const uri = "https://accounts.spotify.com/api/token";
//     //       const params = {
//     //         method: "POST",
//     //         body: `grant_type=authorization_code&code=${code}&redirect_uri=${_credentials.redirectUri}`,
//     //         headers: {
//     //           "Content-Type": "application/x-www-form-urlencoded",
//     //           Authorization:
//     //             "Basic " +
//     //             btoa(`${_credentials.clientId}:${_credentials.clientSecret}`),
//     //         },
//     //       };

//     //       fetch(uri, params)
//     //         .then((response) => {
//     //           response
//     //             .json()
//     //             .then((responseJson) => {
//     //               const {
//     //                 access_token: accessToken,
//     //                 refresh_token: refreshToken,
//     //                 expires_in: expiresIn,
//     //               } = responseJson;

//     //               let tokenExpiry = new Date();
//     //               tokenExpiry.setSeconds(tokenExpiry.getSeconds() + expiresIn);

//     //               _access_token = accessToken;
//     //               _token_expiry = tokenExpiry;

//     //               console.log("Authentication successfull");

//     //               chrome.storage.local.set(
//     //                 { [keys.accessToken]: accessToken },
//     //                 () => {
//     //                   sendResponse({
//     //                     message: "success",
//     //                     token: accessToken,
//     //                   });
//     //                 }
//     //               );

//     //               chrome.storage.local.set({
//     //                 [keys.refreshToken]: refreshToken,
//     //               });

//     //               chrome.storage.local.set({
//     //                 [keys.tokenExpiry]: tokenExpiry.toJSON(),
//     //               });
//     //             })
//     //             .catch((e) => {
//     //               console.log(e);
//     //               sendResponse({ message: "fail" });
//     //             });
//     //         })
//     //         .catch((error) => {
//     //           console.log(error);
//     //           sendResponse({ message: "fail" });
//     //         });
//     //     } else {
//     //       console.log("Authentication failure!");
//     //       sendResponse({ message: "fail" });
//     //     }
//     //   }
//     // ).catch((e) => {
//     //   sendResponse({ message: "failure" });
//     //   return false;
//     // });

//   } else if (request.message === "logout") {
//     chrome.storage.local.clear(() => {
//       _access_token = "";
//       nowplaying = null;
//       profile = null;
//       _state = null;

//       sendResponse({ message: "success" });
//     });

//     return true;
//   } else if (request.message === "log") {
//     console.log(request?.error);
//   } else if (request.message === "nowplaying") {
//     if (request.item) {
//       nowplaying = request.item;
//     } else {
//       sendResponse({ item: nowplaying });
//     }
//     return true;
//   } else if (request.message === "profile") {
//     if (request.item) {
//       profile = request.item;
//     } else {
//       sendResponse({ item: profile });
//     }
//     return true;
//   } else if (request.message === "savedTracks") {
//     if (request.item) {
//       savedTracks = request.item;
//     } else {
//       sendResponse({ item: savedTracks });
//     }
//     return true;
//   }
// });

async function authenticate() {
  return new Promise((resolve, reject) => {
    return setTimeout(() => {
      _sendResponse({ message: "Bitch" });
      //resolve("Bitch");
    }, 3000);
  });

  return chrome.identity.launchWebAuthFlow(
    {
      url: createSpotifyEndpoint(),
      interactive: true,
    },
    (redirectUri) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
      } else {
        console.log(c);
      }
      // if (chrome.runtime.lastError) {
      //   console.warn("Error " + chrome.runtime.lastError.message);
      //   _sendResponse({ message: "fail" });
      // } else {
      //   handleRedirectUri(redirectUri);
      // }
    }
  );
  return new Promise(async (resolve, reject) => {
    //   const code = await launchAuth();
    //   console.log(code);
    // chrome.identity.launchWebAuthFlow(
    //   {
    //     url: createSpotifyEndpoint(),
    //     interactive: true,
    //   },
    //   (redirectUri) => {
    //     console.log(redirectUri);
    //     resolve(true);
    //     //if (!redirectUri) return false;
    //     // const code = extractCode(redirectUri);
    //     // const uri = "https://accounts.spotify.com/api/token";
    //     // const params = {
    //     //   method: "POST",
    //     //   body: `grant_type=authorization_code&code=${code}&redirect_uri=${_credentials.redirectUri}`,
    //     //   headers: {
    //     //     "Content-Type": "application/x-www-form-urlencoded",
    //     //     Authorization:
    //     //       "Basic " +
    //     //       btoa(`${_credentials.clientId}:${_credentials.clientSecret}`),
    //     //   },
    //     // };
    //     // fetch(uri, params).then((response) => {
    //     //   response.json().then((responseJson) => {
    //     //     const {
    //     //       access_token: accessToken,
    //     //       refresh_token: refreshToken,
    //     //       expires_in: expiresIn,
    //     //     } = responseJson;
    //     //     let tokenExpiry = new Date();
    //     //     tokenExpiry.setSeconds(tokenExpiry.getSeconds() + expiresIn);
    //     //     _access_token = accessToken;
    //     //     _token_expiry = tokenExpiry;
    //     //     chrome.storage.local.set({ [keys.accessToken]: accessToken });
    //     //     chrome.storage.local.set({ [keys.refreshToken]: refreshToken });
    //     //     chrome.storage.local.set({
    //     //       [keys.tokenExpiry]: tokenExpiry.toJSON(),
    //     //     });
    //     //     _access_token ? resolve(_access_token) : reject();
    //     //   });
    //     // });
    //     resolve(true);
    //   }
    // );
  }).catch(() => Promise.reject());
}

function handleRedirectUri(redirectUri) {
  return new Promise((resolve, reject) => {
    const code = extractCode(redirectUri);
    console.log(code);
    resolve(code);
  });
}

function createSpotifyEndpoint() {
  _state = encodeURIComponent(
    "meet" + Math.random().toString(36).substring(2, 15)
  );
  return `https://accounts.spotify.com/authorize?response_type=code&client_id=${_credentials.clientId}&redirect_uri=${_credentials.redirectUri}&state=${_state}&scope=${_credentials.scope}&show_dialog=true`;
}

function extractCode(redirectUri) {
  let m = redirectUri.match(/[#?](.*)/);
  if (!m || m.length < 1) return null;
  let params = new URLSearchParams(m[1].split("#")[0]);
  return params.get("code");
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

function getAllStorageSyncData() {
  // Immediately return a promise and start asynchronous work
  return new Promise((resolve, reject) => {
    // Asynchronously fetch all data from storage.sync.
    chrome.storage.sync.get(null, (items) => {
      // Pass any observed errors down the promise chain.
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      // Pass the data retrieved from storage down the promise chain.
      resolve(items);
    });
  });
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
