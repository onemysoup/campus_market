/**
 * 文件上传模块 API
 * 对应后端: FilesController (/api/v1/files)
 */

const { upload } = require('../utils/request');

const filesApi = {
  /**
   * 上传图片
   * @param {string} filePath - 本地文件路径
   */
  uploadImage(filePath) {
    return upload('/api/v1/files/upload', filePath, 'file');
  }
};

module.exports = filesApi;
