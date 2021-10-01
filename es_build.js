const http = require("http");
const express = require("express");
const fs = require("fs");
const esbuild = require("esbuild");
const path = require("path");
const EventEmitter = require("events");

const serverEmitter = new EventEmitter();
const REBUILD_DONE = "REBUILD_DONE";
const PORT = 3000;

const PUBLIC_DIR_PUBLIC = path.join(__dirname, "public");

/**
 * Inject emotion to each component,
 * / `/** @jsx jsx` needed for emotion to know how to parse the component see: https://emotion.sh/docs/introduction
 */
const injectEmotion = {
  name: "injectEmotion",
  setup(build) {
    build.onLoad({ filter: /\.tsx$/ }, async (args) => {
      let content = await fs.promises.readFile(args.path, "utf8");
      return {
        contents: "/** @jsx jsx */ \n".concat(content),
        loader: "tsx",
      };
    });
  },
};

const build = esbuild
  .build({
    entryPoints: ["src/index.ts"],
    sourcemap: "external",
    write: true,
    loader: { ".wasm": "binary" },
    plugins: [injectEmotion],
    inject: ["./src/emotion.js"],
    outfile: path.join(PUBLIC_DIR_PUBLIC, "bundle.js"),
    bundle: true,
    // hot reloader, send a event from express whenever serverEmitter has gotten a reBuild from esbuild watch
    banner: {
      js: `
      const source = new EventSource('/events');
      source.addEventListener('message', message => {
        if(window){
          window.location.reload();
        }
      });
      `,
    },
    watch: {
      onRebuild(error, result) {
        serverEmitter.emit(REBUILD_DONE, error);
        if (error) {
          console.error("watch build failed:", error);
        } else {
          console.log("watch build succeeded:", result);
        }
      },
    },
  })
  .then((result) => {});

const app = express();

// need to be able to read all static files in public to get javascript as well
app.use(express.static("public"));

// use event bus to handle event stream between client and express server
app.get("/events", async (req, res) => {
  res.set({
    "Cache-Control": "no-cache",
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
  });
  // on refresh remove previous rebuild listener from emitter
  serverEmitter.removeAllListeners([REBUILD_DONE]);

  // Tell the client to retry every 10 seconds if connectivity is lost
  res.write("retry: 10000\n\n");
  // emit to the client that a new version of the code as been updated
  serverEmitter.once(REBUILD_DONE, (error) => {
    if (!error) {
      // Make the client to reload
      res.write(`data: reload\n\n`);
    }
  });
});
app.get("*", function (req, res) {
  res.sendFile(path.join(PUBLIC_DIR_PUBLIC, "index.html"));
});

app.listen(PORT, () => {
  console.log("hello? -> port", { PORT });
});
