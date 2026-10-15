const { withMainActivity } = require("expo/config-plugins");

function addLaunchTapForwarding(source) {
  return source;
}

function withLaunchTapForwarding(config) {
  return withMainActivity(config, (activity) => activity);
}

module.exports = withLaunchTapForwarding;
module.exports.addLaunchTapForwarding = addLaunchTapForwarding;
