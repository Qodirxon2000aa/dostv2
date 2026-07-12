const router = require('express').Router();
const c = require('../controllers/employee.controller');

router.get('/',      c.getAll);
router.get('/locations/live', c.getLocations);
router.patch('/me/location', c.updateMyLocation);
router.get('/:id',   c.getOne);
router.post('/',     c.create);
router.put('/:id',   c.update);
router.delete('/:id', c.remove);

module.exports = router;