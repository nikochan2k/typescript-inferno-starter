var gulp = require("gulp");
var plumber = require("gulp-plumber");
var newer = require("gulp-newer");

var srcStaticGlob = [
  "src/**/*",
  "!src/**/*.ts",
  "!src/**/*.tsx"
];
var srcStaticNewer = null;
gulp.task("src2transpiled", function(cb) {
  if (srcStaticNewer == null) {
    srcStaticNewer = gulp.src(srcStaticGlob)
      .pipe(newer("transpiled"));
  }
  return srcStaticNewer
    .pipe(gulp.dest("transpiled"));
});

var tsGlob = [
  "src/typings/*.d.ts",
  "src/*/*/**/*.ts",
  "src/*/*/**/*.tsx",
];

var sourcemaps = require("gulp-sourcemaps");
var babel = require("gulp-babel");
var ts = require("gulp-typescript");
var tsConfigUpdate = require("gulp-tsconfig-update");
var tsConfig = null;
var tsProject = null;
gulp.task("transpile", ["src2transpiled"], function(cb) {
  if (tsConfig == null) {
    tsConfig = gulp.src(tsGlob).pipe(tsConfigUpdate());
    tsProject = ts.createProject("tsconfig.json", {
      sortOutput: true
    });
  }
  return gulp.src(tsGlob)
    .pipe(sourcemaps.init())
    .pipe(ts(tsProject))
    .pipe(babel({
      presets: ['es2015'],
      plugins: ["babel-plugin-syntax-jsx", "babel-plugin-inferno"]
    }))
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest("transpiled"));
});

var transpiledStaticNewer = null;
gulp.task("transpiled2dist", function(cb) {
  if (transpiledStaticNewer == null) {
    transpiledStaticNewer = gulp.src([
        "transpiled/main/client/**/*",
        "!transpiled/main/client/**/*.js",
        "!transpiled/main/client/**/*.map"
      ])
      .pipe(newer("dist/client"));
  }
  return transpiledStaticNewer
    .pipe(gulp.dest("dist/client"));
});


var webpack = require("gulp-webpack");

var jsNewer = null;
gulp.task("build", ["tslint", "transpiled2dist"], function(cb) {
  if (jsNewer == null) {
    jsNewer = gulp.src([
        "transpiled/main/isomorphic/**/*.js",
        "transpiled/main/client/**/*.js"
      ])
      .pipe(newer("dist/client/main.js"));
  }

  return jsNewer
    .pipe(plumber())
    .pipe(webpack({
      output: {
        filename: 'main.js',
      }
    }))
    .pipe(gulp.dest("dist/client"));
});

var espower = null;
var testNewer = null;
gulp.task("espower", ["transpile"], function() {
  if (espower == null) {
    espower = require("gulp-espower");
  }
  if (testNewer == null) {
    testNewer = gulp.src(["transpiled/test/**/*.js"])
      .pipe(newer("transpiled/espowered"));
  }
  return testNewer
    .pipe(espower())
    .pipe(gulp.dest("transpiled/espowered"));
});

var mocha = null;
var espoweredSrc = null;
gulp.task("test", ["espower"], function() {
  if (mocha == null) {
    mocha = require("gulp-mocha");
  }
  return gulp.src([
    "transpiled/main/**/*.js",
    "transpiled/espowered/**/*.js"
  ]).pipe(mocha());
});

var typedoc = null;
gulp.task("typedoc", function() {
  if (typedoc == null) {
    typedoc = require("gulp-typedoc");
  }
  return gulp.src(tsGlob)
    .pipe(typedoc({
      module: "commonjs",
      target: "es5",
      out: "docs/",
      name: "Sample Project",
      readme: "README.md"
    }));
});

function watch(glob, tasks, action) {
  var watcher = gulp.watch(glob, tasks);
  if (!action) {
    return;
  }
  watcher.on("change", function(event) {
    console.log('File "' + event.path + '" was ' + event.type + ", running tasks...");
    switch (event.type) {
      case "added":
        action.onAdded && action.onAdded(event);
        break;
      case "changed":
        action.onChanged && action.onChanged(event);
        break;
      case "deleted":
        action.onDeleted && action.onDelete(event);
        break;
    }
  });
}

var fs = null,
  path = null;

function doWatch(pretasks) {
  if (fs == null) {
    fs = require('fs');
    path = require("path");
  }

  watch(["src/**/*"], pretasks, {
    onAdded: function(event) {
      if (event.path.match(/\.tsx?$/)) {
        tsConfig = null;
      } else {
        srcStaticNewer = null;
      }
    },
    onDeleted: function(event) {
      var deleted = event.path.substr(__dirname.length);
      if (deleted.match(/\.tsx?$/)) {
        var delTarget = deleted.replace(/.tsx?$/, ".js");
        var delJs = __dirname + path.sep + "transpiled" + delTarget;
        var delJsMap = delJs + ".map";
        fs.unlink(delJs);
        console.log('File "' + delJs + '" was also deleted.');
        fs.unlink(delJsMap);
        console.log('File "' + delJsMap + '" was also deleted.');
        tsConfig = null;
      } else {
        var delFile = __dirname + path.sep + "transpiled" + deleted;
        fs.unlink(delFile);
        console.log('File "' + delFile + '" was also deleted.');
        srcStaticNewer = null;
      }
    }
  });
}

gulp.task("watch-transpile", ["transpile"], function() {
  doWatch(["transpile"]);
});

gulp.task("watch-test", ["test"], function() {
  doWatch(["test"]);
});

gulp.task("watch-build", ["build"], function() {
  doWatch(["build"]);
});

gulp.task("clean", function(cb) {
  var del = require("del");
  del(["transpiled", "dist", "docs"], cb);
});
gulp.task("rebuild", ["clean", "build"]);
gulp.task("retest", ["clean", "test"]);
