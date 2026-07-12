const router = require('express').Router();
const c = require('../controllers/attendance.controller');

router.get('/',              c.getAll);
router.post('/',             c.upsert);        // create yoki update
router.patch('/:id/approve', c.approve);
router.delete('/:id',        c.remove);

module.exports = router;