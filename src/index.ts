const loadApp = () => import("./app").catch((error) => console.log("error"));
const run = async () => {
  await loadApp();
};
run();
