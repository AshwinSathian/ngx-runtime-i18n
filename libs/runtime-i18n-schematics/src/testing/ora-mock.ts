// @angular-devkit/schematics/testing pulls in the package-manager task
// executor eagerly, which imports the ESM-only `ora` package for its
// spinner UI. Nothing in this workspace's schematics tests exercises that
// package-manager task, so this stub avoids Jest having to parse ESM it
// never needs to run.
function ora() {
  return {
    start() {
      return this;
    },
    stop() {
      return this;
    },
    succeed() {
      return this;
    },
    fail() {
      return this;
    },
  };
}

export = ora;
