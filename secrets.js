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
  clientId: "",
  clientSecret: "",
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
