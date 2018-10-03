// **********************************************************************
//
// Copyright (c) 2003-2018 ZeroC, Inc. All rights reserved.
//
// **********************************************************************

var babel       = require("gulp-babel"),
    concat      = require("gulp-concat"),
    del         = require("del"),
    fs          = require("fs"),
    gulp        = require("gulp"),
    gzip        = require("gulp-gzip"),
    iceBuilder  = require("gulp-ice-builder"),
    newer       = require("gulp-newer"),
    npm         = require("npm"),
    open        = require("gulp-open"),
    path        = require("path"),
    paths       = require("vinyl-paths"),
    pump        = require("pump"),
    uglify      = require('gulp-uglifyes'),
    HttpServer  = require("./bin/HttpServer");

//
// Check ICE_HOME environment variable. If this is set and points to a source
// distribution then prefer it over default packages.
//
var iceHome;
if(process.env.ICE_HOME)
{
    iceHome = fs.existsSync(path.join(process.env.ICE_HOME, "js", "package.json")) ? process.env.ICE_HOME : undefined;
}

function parseArg(argv, key)
{
    for(var i = 0; i < argv.length; ++i)
    {
        var e = argv[i];
        if(e == key)
        {
            return argv[i + 1];
        }
        else if(e.indexOf(key + "=") === 0)
        {
            return e.substr(key.length + 1);
        }
    }
}

var platform = parseArg(process.argv, "--cppPlatform") || process.env.CPP_PLATFORM;
var configuration = parseArg(process.argv, "--cppConfiguration") || process.env.CPP_CONFIGURATION;

function slice2js(options)
{
    var defaults = {};
    var opts = options || {};

    defaults.args = opts.args || [];
    defaults.include = opts.include || []
    defaults.dest = opts.dest;
    if(iceHome)
    {
        if(process.platform == "win32")
        {
            if(!platform || (platform != "Win32" && platform != "x64"))
            {
                console.log("Error: CPP_PLATFORM environment variable must be set to " +
                            "`Win32' or `x64', in order to locate slice2js.exe");
                process.exit(1);
            }

            if(!configuration || (configuration != "Debug" && configuration != "Release"))
            {
                console.log("Error: CPP_CONFIGURATION environment variable must be set to " +
                            "`Debug' or `Release', in order to locate slice2js.exe");
                process.exit(1);
            }
            defaults.iceToolsPath = path.join(iceHome, 'cpp', 'bin', platform, configuration);
        }
        defaults.iceHome = iceHome;
    }
    return iceBuilder.compile(defaults);
}

function getIceLibs(es5)
{
    return  path.join(iceHome ? path.join(iceHome, 'js', 'lib') : path.join('node_modules', 'ice', 'lib'),
                      es5 ? 'es5/*' : '*');
}

//
// Deploy Ice for JavaScript browser libraries from ice or from ICE_HOME depending
// on whenever or not ICE_HOME is set.
//
gulp.task("dist:libs", ["npm"],
    function(cb)
    {
        pump([
            gulp.src([getIceLibs(false)]),
            newer("lib"),
            gulp.dest("lib")], cb);
    });

gulp.task("dist:libs-es5", ["npm"],
    function(cb)
    {
        pump([
            gulp.src([getIceLibs(true)]),
            newer("lib/es5"),
            gulp.dest("lib/es5")], cb);
    });

gulp.task("dist:clean", [],
    function()
    {
        del(["lib/*", "lib/es5/*"]);
    });

gulp.task("common-es5", [],
          function(cb)
          {
              pump([
                  gulp.src([path.join( "assets", "common.js")]),
                  babel({compact:false}),
                  gulp.dest(path.join("assets", "es5"))], cb);
          });

gulp.task("common-es5:clean", [],
          function()
          {
              del(["assets/es5/*"]);
          });

//
// If ICE_HOME is set we install Ice for JavaScript module from ICE_HOME
// that is required for running JavaScript NodeJS demos.
//
gulp.task("npm", [],
    function(cb)
    {
        npm.load({loglevel: 'silent', progress: false}, function(err, npm) {
            if(iceHome)
            {
                npm.commands.install([path.join(iceHome, 'js')], function(err, data)
                {
                    cb(err);
                });
            }
            else
            {
                cb();
            }
        });
    });

var demos =
{
    "Chat":
    {
        srcs: [
            "lib/Ice.min.js",
            "lib/Glacier2.min.js",
            "Chat/Chat.js",
            "Chat/ChatSession.js",
            "Chat/Client.js"],
        dest: "Chat"
    },
    "Glacier2/simpleChat":
    {
        srcs: [
            "lib/Ice.min.js",
            "lib/Glacier2.min.js",
            "Glacier2/simpleChat/generated/Chat.js",
            "Glacier2/simpleChat/browser/Client.js"],
        dest: "Glacier2/simpleChat/browser/"
    },
    "Ice/bidir":
    {
        srcs: [
            "lib/Ice.min.js",
            "Ice/bidir/generated/Callback.js",
            "Ice/bidir/browser/Client.js"],
        dest: "Ice/bidir/browser"
    },
    "Ice/hello":
    {
        srcs: [
            "lib/Ice.min.js",
            "Ice/hello/generated/Hello.js",
            "Ice/hello/browser/Client.js"],
        dest: "Ice/hello/browser"
    },
    "Ice/latency":
    {
        srcs: [
            "lib/Ice.min.js",
            "Ice/latency/generated/Latency.js",
            "Ice/latency/browser/Client.js"],
        dest: "Ice/latency/browser"
    },
    "Ice/minimal":
    {
        srcs: [
            "lib/Ice.min.js",
            "Ice/minimal/generated/Hello.js",
            "Ice/minimal/browser/Client.js"],
        dest: "Ice/minimal/browser/"
    },
    "Ice/throughput":
    {
        srcs: [
            "lib/Ice.min.js",
            "Ice/throughput/generated/Throughput.js",
            "Ice/throughput/browser/Client.js"],
        dest: "Ice/throughput/browser/"
    },
    "Manual/printer":
    {
        srcs: [
            "lib/Ice.min.js",
            "Manual/printer/generated/Printer.js",
            "Manual/simpleFileSystem/browser/Client.js"],
        dest: "Manual/printer/browser"
    },
    "Manual/simpleFileSystem":
    {
        srcs: [
            "lib/Ice.min.js",
            "Manual/simpleFileSystem/generated/Filesystem.js",
            "Manual/printer/browser/Client.js"],
        dest: "Manual/simpleFileSystem/browser"
    },
};
function demoTaskName(name) { return "demo_" + name.replace("/", "_"); }
function demoES5IceTask(name) { return demoTaskName(name) + ":ice-es5"; }
function demoBabelTask(name) { return demoTaskName(name) + ":babel"; }
function demoGeneratedBabelTask(name) { return demoTaskName(name) + "-generated:babel"; }
function demoBrowserBabelTask(name) { return demoTaskName(name) + "-browser:babel"; }
function demoBuildTask(name) { return demoTaskName(name) + ":build"; }
function demoDependCleanTask(name) { return demoTaskName(name) + "-depend:clean"; }
function demoCleanTask(name) { return demoTaskName(name) + ":clean"; }
function demoBabelCleanTask(name) { return demoTaskName(name) + ":babel-clean"; }
function demoGeneratedFile(file){ return path.join(path.basename(file, ".ice") + ".js"); }
function minDemoTaskName(name) { return demoTaskName(name) + ":min"; }
function minDemoCleanTaskName(name) { return minDemoTaskName(name) + ":clean"; }

Object.keys(demos).forEach(
    function(name){
        var demo = demos[name];

        gulp.task(demoTaskName(name), ['dist:libs', 'dist:libs-es5'],
            function(cb){
                pump([
                    gulp.src(path.join(name, "*.ice")),
                    slice2js({include: [name], dest: path.join(name, "generated")}),
                    gulp.dest(path.join(name, "generated"))], cb);
            });

        gulp.task(minDemoTaskName(name), [demoTaskName(name), "dist:libs"],
            function(cb){
                pump([gulp.src(demo.srcs),
                    newer(path.join(demo.dest, "Client.min.js")),
                    concat("Client.min.js"),
                    uglify({compress:false}),
                    gulp.dest(demo.dest),
                    gzip(),
                    gulp.dest(demo.dest)], cb);
            });

        gulp.task(minDemoCleanTaskName(name), [],
            function(){
                del([path.join(demo.dest, "Client.min.js"),
                     path.join(demo.dest, "Client.min.js.gz")]);
            });

        gulp.task(demoGeneratedBabelTask(name), [minDemoTaskName(name)],
            function(cb){
                pump([
                    gulp.src([path.join(name, "generated", "*.js")]),
                    babel({compact:false}),
                    gulp.dest(path.join(name, "es5", "generated"))], cb);
            });

        gulp.task(demoBabelTask(name), [demoGeneratedBabelTask(name)],
            function(cb){
                pump([
                    gulp.src([path.join(name, "*.js")]),
                    babel({compact:false}),
                    gulp.dest(path.join(name, "es5"))], cb);
            });

        const depends = [demoBabelTask(name)];

        if(fs.existsSync(path.join(name, "browser"))){
            gulp.task(demoBrowserBabelTask(name), [minDemoTaskName(name)],
                function(cb){
                    pump([
                        gulp.src(path.join(name, "browser", "*.js")),
                        babel({compact:false}),
                        gulp.dest(path.join(name, "es5", "browser"))], cb);
                });
            depends.push(demoBrowserBabelTask(name));
        }

        gulp.task(demoES5IceTask(name), [demoBabelTask(name)],
            function(cb){
                pump([
                    gulp.src(['node_modules/ice/src/es5/**/*']),
                    gulp.dest(path.join(name, "es5", "node_modules", "ice"))], cb);
            });
        depends.push(demoES5IceTask(name));

        gulp.task(demoBuildTask(name), depends, function(){});

        gulp.task(demoCleanTask(name), [],
            function(){
                gulp.src([
                    path.join(name, ".depend"),
                    path.join(name, "es5"),
                    path.join(name, "es5"),
                    path.join(name, "browser", "es5"),
                    path.join(name, "generated")])
                    .pipe(paths(del));
            });
    });

gulp.task("demo:build", Object.keys(demos).map(demoBuildTask));
gulp.task("demo:clean", Object.keys(demos).map(demoCleanTask));

gulp.task("build", ["demo:build", "common-es5"]);

gulp.task("run", ["build", "dist:libs"],
    function(){
        HttpServer();
        return gulp.src("").pipe(open({uri: "http://127.0.0.1:8080/index.html"}));
    });
gulp.task("clean", ["demo:clean", "dist:clean", "common-es5:clean"]);
gulp.task("default", ["build"]);
