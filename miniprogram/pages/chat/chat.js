const api = require('../../api/index');
const { ensureLogin } = require('../../utils/util');

Page({
  data: {
    userId: 0,
    conversations: [],
    conversationId: '',
    messages: [],
    content: ''
  },

  onLoad(options) {
    if (!ensureLogin()) return;
    const user = wx.getStorageSync('userInfo') || {};
    this.setData({ userId: user.id, conversationId: options.conversationId || '' });
    if (options.conversationId) {
      this.loadMessages();
    } else {
      this.loadConversations();
    }
  },

  async loadConversations() {
    try {
      const data = await api.getConversations();
      this.setData({ conversations: data.list || [] });
    } catch (error) {
    }
  },

  async loadMessages() {
    try {
      const data = await api.getMessages(this.data.conversationId);
      this.setData({ messages: data.list || [] });
    } catch (error) {
    }
  },

  openConversation(e) {
    const conversationId = e.currentTarget.dataset.id;
    this.setData({ conversationId });
    this.loadMessages();
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  async send() {
    if (!this.data.content.trim()) return;
    const [receiver_id, goods_id] = this.data.conversationId.split('_').map(Number);
    try {
      await api.sendMessage({ receiver_id, goods_id, content: this.data.content.trim() });
      this.setData({ content: '' });
      this.loadMessages();
    } catch (error) {
    }
  }
});
