const express = require('express');
const router = express.Router({ mergeParams: true });
const spellSpheresService = require('../../services/joinTables/spellSpheres');

router.post('/', async (req, res) => {
  const spell_id = req.params.id;
  const { sphere_id } = req.body;
  if (!sphere_id) {
    return res.status(400).json({ error: 'sphere_id is required' });
  }
  try {
    await spellSpheresService.addSpellSphere(spell_id, sphere_id);
    res.status(201).json({ spell_id, sphere_id });
  } catch (err) {
    if (err.code === 'DUPLICATE_ID') {
      return res.status(409).json({ error: 'This spell-sphere relationship already exists.' });
    }
    res.status(400).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  const spell_id = req.params.id;
  try {
    const linkages = await spellSpheresService.getSpheresForSpell(spell_id);
    res.json(linkages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/', async (req, res) => {
  const spell_id = req.params.id;
  try {
    const result = await spellSpheresService.removeAllSpheresForSpell(spell_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:sphereId', async (req, res) => {
  const spell_id = req.params.id;
  const sphere_id = req.params.sphereId;
  try {
    const result = await spellSpheresService.removeSpellSphere(spell_id, sphere_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
