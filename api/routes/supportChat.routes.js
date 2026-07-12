const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/supportChat.controller');

router.get('/messages', ctrl.listMessages);
router.post('/messages', ctrl.sendMessage);
router.patch('/messages/:id', ctrl.updateMessage);
router.delete('/messages/:id', ctrl.deleteMessage);
router.patch('/read', ctrl.markRead);
router.get('/conversations', ctrl.listConversations);
router.get('/unread-employee', ctrl.unreadCountForEmployee);

module.exports = router;
