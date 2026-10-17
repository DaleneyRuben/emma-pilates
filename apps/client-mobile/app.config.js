const { withAppVariant } = require("@pilates/mobile-core/app-variant");

// app.json holds the store app; the EAS staging profile sets
// APP_VARIANT=staging to build the variant that installs beside it (EXT-017).
module.exports = ({ config }) => withAppVariant(config, process.env.APP_VARIANT);
