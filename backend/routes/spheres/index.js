const express = require('express');
const router = express.Router();
const sphereService = require('../../services/entities/spheres');

// Create a new sphere
router.post('/', async (req, res) => {
  const s = req.body;
  try {
    const result = await sphereService.createSphere(s);
    res.status(201).json(result);
  } catch (err) {
    if (err.code === 'DUPLICATE_ID') {
      return res.status(409).json({ error: err.message });
    }
    res.status(400).json({ error: err.message });
  }
});

// Get all spheres
router.get('/', async (req, res) => {
  try {
    const spheres = await sphereService.getAllSpheres();
    res.json(spheres);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single sphere by id
router.get('/:id', async (req, res) => {
  try {
    const sphere = await sphereService.getSphereById(req.params.id);
    if (!sphere) {
      return res.status(404).json({ error: 'Sphere not found' });
    }
    res.json(sphere);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a full-detail sphere with all associations
router.get('/:id/full', async (req, res) => {
  try {
    const fullSphere = await sphereService.getFullSphereById(req.params.id);
    if (!fullSphere) {
      return res.status(404).json({ error: 'Sphere not found' });
    }
    res.json(fullSphere);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Partially update an existing sphere
router.patch('/:id', async (req, res) => {
  const updates = req.body;
  try {
    const result = await sphereService.patchSphere(req.params.id, updates);
    res.json(result);
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Sphere not found' });
    }
    res.status(400).json({ error: err.message });
  }
});

// Delete a sphere
router.delete('/:id', async (req, res) => {
  try {
    const result = await sphereService.deleteSphere(req.params.id);
    res.json(result);
  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Sphere not found' });
    }
    res.status(500).json({ error: err.message });
  }
});

//router.use('/:id/spells', require('./spells'));
//router.use('/:id/deities', require('./deities'));

module.exports = router;