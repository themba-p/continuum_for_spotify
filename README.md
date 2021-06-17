
# Continuum for Spotify
![Spotify Continuum (1)](https://user-images.githubusercontent.com/57948152/122431318-a416d000-cf94-11eb-9d59-38555cc90b77.png)

An extension for Google Chrome ( and Microsoft Edge) that allows you to control your Spotify playback on any active devices.\
This is a personal project to learn more about developing in javascript and chrome extensions.

## Supported features
- Playback (pause, play, skip)
- Toggle shuffle and repeat.
- Add currently playing track to Liked songs.
- View actice devices and transfer playback between them.
- View and play liked songs, user playlists, and albums.
- Search Spotify catalogue for tracks, albums, and playlists.

## Get up and running...

Place your own Spotify ClientId and ClientSecret in [secrets.js](../secrets.js) which can be found in the root of the project.\
Get your own credentials at [Spotify Developer dashboard](https://developer.spotify.com/dashboard/) (requires a Spotify account). 
```js
const spotifyCredentials = {
  clientId: "<CLIENT ID HERE>",
  clientSecret: "<CLIENT SECRET HERE>",
  redirectUri: chrome.identity.getRedirectURL(),
  scope: _scope.join(" "),
};
```
The extension does not use a server to handle authentication so be careful not to expose your developer credentials.\
To sideload the extension, follow these instructions: [Sideload extension on Edge](https://docs.microsoft.com/en-us/microsoft-edge/extensions-chromium/getting-started/extension-sideloading). Method is similar with Google Chrome, just replace "edge://extensions" with "chrome://extensions"

### Created with the help of:
- Spotify Api Wrapper Js [Spotify Web API JS](https://github.com/JMPerez/spotify-web-api-js).
- Animation [Anime JS](https://animejs.com/).
- [Browserify](https://browserify.org/).

###### This extension has no affiliation to Spotify. Some of the assets used belong to their respective parties, no infrigement intended.
