# Releasing a new version of sketches-js

`@datadog/sketches-js` utilizes GitHub's Actions and Releases features to coordinate releases. You can follow these steps to prepare a new release.

## Preparing a release

### Before releasing
1. Make commits containing changes you wish to release on a dedicated branch
2. Create a pull request with your changes
   - This will trigger the `ci.yml` GitHub action to run tests and typechecking for your branch
3. Once your pull request has been approved and the CI action has passed, merge your changes into the main branch


### Releasing
1. When you're ready to make a new release, checkout the main branch locally and run `yarn version`
2. Choose the new version number following [SemVer](https://semver.org/). Make sure you prefix it with `v` (`vX.Y.Z`).
    - This command creates a new commit that only updates the version in `package.json`
3. Push this commit to the main branch
3. In GitHub's UI, navigate to Releases > "Draft New Release". Set the tag version to the version you just entered, and add a title and description for the new release
4. Hit "Publish Release". This will trigger the `publish.yml` GitHub action, which builds a new version of the package, and publishes it to [NPM](https://www.npmjs.com/package/@datadog/sketches-js)
