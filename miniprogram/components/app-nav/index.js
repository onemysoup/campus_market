Component({
  properties: {
    title: {
      type: String,
      value: ''
    },
    showBack: {
      type: Boolean,
      value: false
    },
    background: {
      type: String,
      value: '#0f766e'
    },
    color: {
      type: String,
      value: '#ffffff'
    }
  },

  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    totalHeight: 64,
    sidePadding: 96
  },

  lifetimes: {
    attached() {
      this.updateMetrics();
    }
  },

  methods: {
    updateMetrics() {
      const info = wx.getSystemInfoSync ? wx.getSystemInfoSync() : {};
      const statusBarHeight = info.statusBarHeight || 20;
      let navBarHeight = 44;
      let sidePadding = 96;

      if (wx.getMenuButtonBoundingClientRect) {
        try {
          const menu = wx.getMenuButtonBoundingClientRect();
          if (menu && menu.top && menu.height) {
            navBarHeight = (menu.top - statusBarHeight) * 2 + menu.height;
            sidePadding = Math.max((info.windowWidth || 375) - menu.left, 88);
          }
        } catch (error) {
          console.warn('[AppNav] get menu metrics failed:', error);
        }
      }

      this.setData({
        statusBarHeight,
        navBarHeight,
        totalHeight: statusBarHeight + navBarHeight,
        sidePadding
      });
    },

    onBack() {
      if (getCurrentPages().length > 1) {
        wx.navigateBack();
      } else {
        wx.switchTab({ url: '/pages/index/index' });
      }
    }
  }
});
