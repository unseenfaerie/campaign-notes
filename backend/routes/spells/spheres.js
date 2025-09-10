const express = require('express');
const router = express.Router({ mergeParams: true });
const spellSpheresService = require('../../services/joinTables/spellSpheres');
const { mapErrorToStatus } = require('../../utils/errorUtils');

router.post('/', async (req, res) => {
  // Pass the full linkage object, including spell_id from params and all fields from body
  const linkage = { ...req.body, spell_id: req.params.id };
  try {
    const result = await spellSpheresService.addSpellSphere(linkage);
    res.status(201).json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

router.get('/', async (req, res) => {
  const spell_id = req.params.id;
  try {
    const linkages = await spellSpheresService.getSpheresForSpell(spell_id);
    res.json(linkages);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

router.delete('/', async (req, res) => {
  const spell_id = req.params.id;
  try {
    const result = await spellSpheresService.removeAllSpheresForSpell(spell_id);
    res.json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

router.delete('/:sphereId', async (req, res) => {
  const spell_id = req.params.id;
  const sphere_id = req.params.sphereId;
  try {
    const result = await spellSpheresService.removeSpellSphere(spell_id, sphere_id);
    res.json(result);
  } catch (err) {
    res.status(mapErrorToStatus(err)).json({ error: err.message, code: err.code, details: err.details });
  }
});

module.exports = router;
