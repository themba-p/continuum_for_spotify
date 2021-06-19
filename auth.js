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


function refreshAccessToken() {
  return new Promise(async (resolve, reject) => {
    if (!_refreshToken) return reject();

    const uri = "https://accounts.spotify.com/api/token";
    const params = {
      method: "POST",
      body: `grant_type=refresh_token&refresh_token=${_refreshToken}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          btoa(
            `${spotifyCredentials.clientId}:${spotifyCredentials.clientSecret}`
          ),
      },
    };

    resolve(await getAuthTokens(uri, params));   
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
            _refreshToken = refreshToken;

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

