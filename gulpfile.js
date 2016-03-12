var gulp = require("gulp");
var plumber = require("gulp-plumber");
var newer = require("gulp-newer");

var tsGlob = [
  "src/typings/*.d.ts",
  "src/*main/isomorphic/**/*.ts",
  "src/*main/isomorphic/**/*.tsx",
  "src/*main/server/**/*.ts",
  "src/*main/server/**/*.tsx",
  "src/*main/client/**/*.ts",
  "src/*main/client/**/*.tsx",
  "src/*test/isomorphic/**/*.ts",
  "src/*test/server/**/*.ts",
  "src/*test/client/**/*.ts",
  "src/*playground/**/*.ts",
  "src/*playground/**/*.tsx"
];

var ts = require("gulp-typescript");
var tsConfigUpdate = require("gulp-tsconfig-update");
var tsConfig = null;
var tsProject = null;
gulp.task("tsconfig", function() {
  if (tsConfig == null) {
    tsConfig = gulp.src(tsGlob).pipe(tsConfigUpdate());
    tsProject = ts.createProject("tsconfig.json", {
      sortOutput: true
    });
    tsNewer = null;
  }
  return tsConfig;
});

var sourcemaps = require("gulp-sourcemaps");
var babel = require("gulp-babel");

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

var tsNewer = null;
gulp.task("transpile", ["tsconfig", "src2transpiled"], function(cb) {
  if (tsNewer == null) {
    tsNewer = gulp.src(tsGlob)
      .pipe(newer({
        dest: "transpiled",
        ext: ".js"
      }));
    jsNewer = null;
  }
  return tsNewer
    .pipe(sourcemaps.init())
    .pipe(ts(tsProject))
    .pipe(babel({
      presets: ['es2015'],
      plugins: ["babel-plugin-syntax-jsx", "babel-plugin-inferno"]
    }))
    .pipe(sourcemaps.write("."))
    .pipe(gulp.dest("transpiled"));
});

var tslint = null;
gulp.task("tslint", ["transpile"], function() {
  if (tslint == null) {
    tslint = require("gulp-tslint");
  }
  return tsNewer
    .pipe(tslint({
      config: "tslint.json"
    }))
    .pipe(tslint.report("verbose", {
      emitError: false
    }));
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
gulp.task("espower", ["tslint"], function() {
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
  return tsNewer
    .pipe(typedoc({
      module: "commonjs",
      target: "es6",
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
gulp.task("watch", function() {
  if (fs == null) {
    fs = require('fs');
    path = require("path");
  }

  watch(["src/**/*"], ["build"], {
    onAdded: function(event) {
      if(event.path.match(/\.tsx?$/)){
        tsConfig = null;
      }
    },
    onDeleted: function(event) {
      var deleted = event.path.substr(__dirname.length);
      console.log(deleted);
      if(deleted.match(/\.tsx?$/)){
        var delTarget = deleted.replace(/.tsx?$/, ".js");
        var delJs = __dirname + path.sep + "transpiled" + delTarget;
        var delJsMap = delJs + ".map";
        fs.unlink(delJs);
        fs.unlink(delJsMap);
        tsConfig = null;
      } else {
        var delFile = __dirname + path.sep + "transpiled" + deleted;
        fs.unlink(delFile);
      }
    }
  });

  watch(srcStaticGlob, ["transpiled2dist"], {
    onDeleted: function(event) {
    }
  });
});

gulp.task("clean", function(cb) {
  var del = require("del");
  del(["transpiled", "dist", "docs"], cb);
});
gulp.task("rebuild", ["clean", "build"]);
gulp.task("retest", ["clean", "test"]);
