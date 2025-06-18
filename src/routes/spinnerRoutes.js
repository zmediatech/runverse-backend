import express from 'express';
import {
  createSpinner,
  getSpinners,
  getSpinnerById,
  updateSpinner,
  deleteSpinner,
  addItemToSpinner,
  editItemInSpinner,
  deleteItemFromSpinner,
  redeemSpinner,
} from '../controllers/spinnerController.js';

const router = express.Router();

router.post('/create', createSpinner); // Create a new spinner
router.get('/get-spinners', getSpinners); // Get a list of all spinners
router.get('/get-spinner/:id', getSpinnerById); // Get details of a specific spinner by ID
router.put('/update/:id', updateSpinner); // Update a specific spinner by ID
router.delete('/remove/:id', deleteSpinner); // Delete a specific spinner by ID
router.post('/:id/add-item', addItemToSpinner); // Add an item to a spinner
router.put('/:id/edit-item/:item_id', editItemInSpinner); // Edit an item in a spinner
router.delete('/:id/delete-item/:item_id', deleteItemFromSpinner); // Delete an item from a spinner
router.post('/redeem-spinner', redeemSpinner); // Redeem a spinner by ID

export default router;
