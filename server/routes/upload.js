const express = require('express');
const upload = require('../middleware/upload');
const { authRequired } = require('../middleware/auth');
const { success, fail } = require('../utils/response');

const router = express.Router();

router.post('/image', authRequired, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json(fail(400, '请上传图片'));
  }

  const baseUrl = process.env.BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;
  const url = `${baseUrl}/uploads/${req.file.filename}`;
  return res.json(success({ url }));
});

module.exports = router;
