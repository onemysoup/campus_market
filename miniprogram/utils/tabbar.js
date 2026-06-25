function syncTabBar(page, selected) {
  if (typeof page.getTabBar !== 'function') return;
  const tabBar = page.getTabBar();
  if (tabBar) tabBar.setData({ selected });
}

module.exports = {
  syncTabBar
};
