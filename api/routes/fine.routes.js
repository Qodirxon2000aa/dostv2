const router = require('express').Router();
const c      = require('../controllers/fine.controller');

router.get('/',            c.getAll);   // GET  /api/fines
router.post('/',           c.create);   // POST /api/fines
router.patch('/:id/cancel', c.cancel); // PATCH /api/fines/:id/cancel
router.delete('/:id',      c.remove);  // DELETE /api/fines/:id

module.exports = router;