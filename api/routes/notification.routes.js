const router = require('express').Router();
const c = require('../controllers/notification.controller');

router.get('/', c.getByEmployee);
router.post('/broadcast', c.createBroadcast);
router.post('/', c.create);
router.patch('/:id/read', c.markRead);

module.exports = router;
