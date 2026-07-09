const { getFeatureConfig } = require("../../utils/profile");

Page({
  data: {
    panel: getFeatureConfig("system")
  },

  onLoad(query) {
    this.setData({
      panel: getFeatureConfig(query.key)
    });
  },

  goBack() {
    tt.navigateBack();
  }
});

