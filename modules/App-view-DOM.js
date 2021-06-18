const Common = require("./common.js");
const anime = require("animejs");

const easingFactor = "cubicBezier(0.39, 0.575, 0.565, 1)";
// easing: "cubicBezier(.4,.1,.48,1)",
// easing: "cubicBezier(0.39, 0.575, 0.565, 1)"
// "cubicBezier(0.25, 0.46, 0.45, 0.94)"

exports.switchToSearch = () => {
  return new Promise((resolve) => {
    var tl = anime.timeline({
      complete: () => resolve(true),
      delay: (el, i) => 70 * (i + 1),
      easing: easingFactor,
    });

    document.getElementById("filter-actions-wrapper").style.display = "none";

    tl.add({
      targets: "#header",
      maxHeight: ["84px", "0"],
      duration: 350,
    })
      .add(
        {
          targets: "#search-container",
          background: "#282828",
          duration: 300,
          easing: "linear",
          begin: () => {
            document.getElementById("search-bar").style.display = "flex";
          },
        },
        "-=400"
      )
      .add(
        {
          targets: "#search-bar",
          opacity: 1,
          easing: "linear",
          duration: 200,
        },
        "-=300"
      );

    document.getElementById("search-bar").focus();
  });
};

exports.switchToPlayer = (oldValue) => {
  return new Promise((resolve) => {
    var tl = anime.timeline({
      complete: () => resolve(true),
      delay: (el, i) => 70 * (i + 1),
      easing: easingFactor,
    });

    if (oldValue === Common.View.Library) {
      tl.add({
        targets: "#header",
        maxHeight: "84px",
        duration: 400,
      });
    }

    tl.add({
      targets: ".list-view-nav-item",
      opacity: [1, 0],
      translateX: ["0", "15px"],
      duration: 100,
    })
      .add(
        {
          targets: "#list-view",
          maxHeight: "0",
          duration: 800,
        },
        `-=1000`
      )
      .add(
        {
          targets: "#footer-nav",
          maxHeight: "36px",
          duration: 400,
        },
        "-=600"
      )
      .add(
        {
          targets: "#bottom-nav",
          background: "#030303",
          duration: 300,
          easing: "linear",
        },
        "-=600"
      )
      .add(
        {
          targets: "#top-nav",
          maxHeight: "0",
          duration: 400,
        },
        "-=350"
      );
  });
};

exports.switchToLibrary = (oldValue) => {
  return new Promise((resolve) => {
    var tl = anime.timeline({
      complete: () => resolve(true),
      delay: (el, i) => 70 * (i + 1),
      easing: easingFactor,
    });

    document.getElementById("filter-actions-wrapper").style.display = "flex";

    if (oldValue && oldValue === Common.View.Search) {
      tl.add({
        targets: "#header",
        maxHeight: "84px",
        duration: 500,
      })
        .add(
          {
            targets: "#search-container",
            background: "#030303",
            duration: 300,
            easing: "linear",
          },
          "-=700"
        )
        .add(
          {
            targets: "#search-bar",
            opacity: 0,
            duration: 300,
            complete: () => {
              document.getElementById("search-bar").style.display = "none";
            },
          },
          "-= 300"
        );
    }

    tl.add({
      targets: "#footer-nav",
      maxHeight: "0",
      duration: 400,
    })
      .add(
        {
          targets: "#list-view",
          maxHeight: "300px",
          duration: 800,
        },
        `-=800`
      )
      .add(
        {
          targets: "#bottom-nav",
          background: "#1b1b1b",
          duration: 300,
          easing: "linear",
        },
        "-=150"
      )
      .add(
        {
          targets: "#top-nav",
          maxHeight: "44px",
          duration: 400,
        },
        "-=350"
      )
      .add(
        {
          targets: ".list-view-nav-item",
          opacity: [0, 1],
          translateX: ["15px", "0"],
          duration: 500,
        },
        "-=340"
      );
  });
};

exports.ToggleLibraryFilter = (show) => {
  return new Promise((resolve) => {
    var tl = anime.timeline({
      complete: () => resolve(true),
      delay: (el, i) => 70 * (i + 1),
      easing: easingFactor,
    });

    if (show) {
      tl.add({
        targets: ".list-view-nav-item",
        opacity: [1, 0],
        translateX: [0, "-15px"],
        duration: 300,
        complete: () =>
          (document.getElementById("list-view-nav").style.display = "none"),
      })
        .add(
          {
            targets: "#filter-bar",
            opacity: [0, 1],
            duration: 300,
            begin: () =>
              (document.getElementById(
                "filter-library-container"
              ).style.display = "flex"),
            complete: () => document.getElementById("filter-bar").focus(),
          },
          "-=80"
        )
        .add(
          {
            targets: "#filter-library-button",
            opacity: [1, 0],
            duration: 300,
            easing: "easeOutExpo",
            complete: () =>
              (document.getElementById("filter-library-button").style.display =
                "none"),
          },
          "-=1150"
        )
        .add(
          {
            targets: "#filter-close-button",
            opacity: [0, 1],
            duration: 300,
            easing: "easeOutExpo",
            complete: () =>
              (document.getElementById("filter-close-button").style.display =
                "flex"),
          },
          "-=600"
        );
    } else {
      tl.add({
        targets: "#filter-bar",
        opacity: [1, 0],
        duration: 300,
        complete: () =>
          (document.getElementById("filter-library-container").style.display =
            "none"),
      })
        .add({
          targets: ".list-view-nav-item",
          opacity: 1,
          translateX: 0,
          duration: 400,
          begin: () =>
            (document.getElementById("list-view-nav").style.display = "flex"),
        })
        .add(
          {
            targets: "#filter-close-button",
            opacity: [1, 0],
            duration: 300,
            complete: () =>
              (document.getElementById("filter-close-button").style.display =
                "none"),
          },
          "-=1150"
        )
        .add(
          {
            targets: "#filter-library-button",
            opacity: [0, 1],
            duration: 200,
            complete: () =>
              (document.getElementById("filter-library-button").style.display =
                "flex"),
          },
          "-=600"
        );
    }
  });
};

exports.SwitchOverlay = (view, show = true) => {
  return new Promise(async (resolve) => {
    var tl = anime.timeline({
      complete: () => resolve(true),
      delay: (el, i) => 70 * (i + 1),
      easing: easingFactor,
    });

    const viewToAnimate =
      view === Common.View.Profile ? "#profile-view" : "#devices-view";

    if (show) {
      const profileButton = view != Common.View.Profile ? "profile-button" : "";

      anime({
        targets: "#search-button, #library-button" + profileButton,
        opacity: [1, 0],
        duration: 250,
        easing: easingFactor,
        complete: () => {
          document.getElementById("search-button").style.display = "none";
          document.getElementById("library-button").style.display = "none";
          if (view != Common.View.Profile)
            document.getElementById("profile-button").style.display = "none";
        },
      });

      tl.add({
        targets: viewToAnimate,
        translateY: ["-100%", "0%"],
        duration: 400,
      }).add(
        {
          targets: "#top-nav",
          maxHeight: "44px",
          duration: 400,
        },
        "-=258"
      );

      if (view === Common.View.Profile) await switchToProfile(show);
      else if (view === Common.View.Devices) await switchToDevices(show);
    } else {
      tl.add({
        targets: "#top-nav",
        maxHeight: "0",
        duration: 400,
        complete: () => {
          if (view === Common.View.Devices) {
            document.getElementById("refresh-devices-button").style.display =
              "none";
          }

          document.getElementById("profile-button").style.display = "flex";
          document.getElementById("search-button").style.display = "flex";
          document.getElementById("library-button").style.display = "flex";
        },
      }).add(
        {
          targets: viewToAnimate,
          translateY: [0, "-100%"],
          duration: 500,
          complete: () => {
            anime({
              targets: "#search-button, #library-button",
              opacity: [0, 1],
              duration: 250,
              easing: easingFactor,
              complete: () => {
                document.getElementById("search-button").style.display = "flex";
                document.getElementById("library-button").style.display =
                  "flex";
                if (view === Common.View.Profile)
                  document.getElementById("profile-button").style.display =
                    "flex";
              },
            });
          },
        },
        "-=180"
      );

      if (view === Common.View.Devices) await switchToDevices(show);
    }
  });
};

function switchToProfile(show) {
  return new Promise((resolve) => {
    var tl = anime.timeline({
      complete: () => resolve(true),
      delay: (el, i) => 70 * (i + 1),
      easing: easingFactor,
      complete: () => resolve(true),
    });

    if (show) {
      tl.add({
        targets: ".profile-info-wrapper",
        opacity: [0, 1],
        duration: 250,
      }).add({
        targets: ".profile-details",
        opacity: [0, 1],
        translateX: ["10px", 0],
        duration: 500,
      });
    }
  });
}

function switchToDevices(show) {
  return new Promise((resolve) => {
    var tl = anime.timeline({
      complete: () => resolve(true),
      delay: (el, i) => 70 * (i + 1),
      easing: easingFactor,
      complete: () => resolve(true),
    });

    if (show) {
      tl.add({
        targets: "#refresh-devices-button",
        opacity: [0, 1],
        duration: 400,
        begin:() => document.getElementById("refresh-devices-button").style.display = "flex",
      });

      anime({
        targets: "#devices-chev",
        rotate: ["180deg", 0],
        duration: 400,
        easing: easingFactor,
      });
    } else {
      tl.add(
        {
          targets: "#refresh-devices-button",
          opacity: [1, 0],
          duration: 400,
          complete: () => document.getElementById("refresh-devices-button").style.display = "none",
        },
        "-= 150"
      );

      anime({
        targets: "#devices-chev",
        rotate: [0, "180deg"],
        duration: 400,
        easing: easingFactor,
      });
    }
  });
}
