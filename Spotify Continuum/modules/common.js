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
