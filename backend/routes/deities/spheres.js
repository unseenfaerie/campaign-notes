const express = require('express');
const router = express.Router();
const deitySpheres = require('../../services/joinTables/deitySpheres');
const validate = require('../../../common/validate');

// SPHERE - DEITY ASSOCIATIONS
// Add a sphere to a deity
router.post('/', (req, res) => {
  const deity_id = req.params.id;
  const { sphere_id } = req.body;
  // Validate using generic entity validator
  const { valid, errors, validated } = validate.validateFields('DeitySphere', {
    sphere_id,
    deity_id
  });
  if (!valid) return res.status(400).json({ errors });
  deitySpheres.addDeitySphere(
    validated.deity_id,
    validated.sphere_id
  )
    .then(result => res.status(201).json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Get all spheres for a deity
router.get('/', (req, res) => {
  const deity_id = req.params.id;
  deitySpheres.getSpheresForDeity(deity_id)
    .then(spheres => res.json(spheres))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Get a specific sphere-deity relationship
router.get('/:sphereId', (req, res) => {
  const sphere_id = req.params.sphereId;
  const deity_id = req.params.id;
  deitySpheres.getSphereDeity(sphere_id, deity_id)
    .then(relationship => res.json(relationship))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Update sphere-deity association
router.patch('/:sphereId', (req, res) => {
  const sphere_id = req.params.sphereId;
  const deity_id = req.params.id;
  // Validate PATCH body for allowed fields only (partial allowed)
  const { valid, errors, validated } = validateFields('DeitySphere', req.body, { allowPartial: true });
  if (!valid) return res.status(400).json({ errors });
  deitySpheres.updateSphereDeity(sphere_id, deity_id, validated)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

// Remove a sphere from a deity
router.delete('/:sphereId', (req, res) => {
  const sphere_id = req.params.sphereId;
  const deity_id = req.params.id;
  deitySpheres.removeSphereDeity(sphere_id, deity_id)
    .then(result => res.json(result))
    .catch(err => res.status(500).json({ error: err.message }));
});

module.exports = router;