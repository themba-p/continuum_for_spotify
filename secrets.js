const _scope = [
  "user-read-private",
  "user-read-currently-playing",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-library-read",
  "user-library-modify",
  "playlist-read-private",
];

const spotifyCredentials = {
  clientId: "21d0b374958f4733a98bd1e5919ae85c",
  clientSecret: "e38945e6a0d34e4b8b2bc28b179148c4",
  redirectUri: chrome.identity.getRedirectURL(),
  scope: _scope.join(" "),
};

function getSpotifyCredentials(encodedUri = true) {
  const credentials = {};
  if (encodedUri) {
    for (let key in spotifyCredentials) {
      credentials[key] = encodeURIComponent(spotifyCredentials[key]);
    }
  } else {
    credentials = spotifyCredentials;
  }

  return credentials;
}
