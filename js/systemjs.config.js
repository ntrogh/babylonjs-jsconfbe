(function (global) {
    System.config({
      map: {
        // our app is within the js/build folder
        app: '/js/build'
      },
      // packages tells the System loader how to load when no filename and/or no extension
      packages: {
        app: {
          main: './game.js',
          defaultExtension: 'js'
        }
      }
    });
  })(this);