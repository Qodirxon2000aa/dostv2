const router = require('express').Router();
const c = require('../controllers/object.controller');

router.get('/',             c.getAll);
router.post('/',            c.create);
router.delete('/:id',       c.remove);
router.patch('/:id/spent',  c.addSpent);
router.patch('/:id/income', c.addIncome);
router.patch('/:id/withdrawal', c.addWithdrawal);
router.put('/:id/withdrawal/:wid', c.updateWithdrawal);
router.delete('/:id/withdrawal/:wid', c.removeWithdrawal);

module.exports = router;