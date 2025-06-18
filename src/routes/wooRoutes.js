import express from 'express';
import { getAllProducts, getAllVendors, getVendorById } from '../utils/woocommerce.js';   


const router = express.Router();

router.get('/get-products', async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json(products);
  } catch {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.get('/get-vendors', async (req, res) => {
  try {
    const vendors = await getAllVendors();
    res.json(vendors);
  } catch {
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// Add this route to handle GET /vendors/:vendorId
router.get('/get-url/:vendorId', async (req, res) => {
  try {
    const vendorId = req.params.vendorId;
    const vendor = await getVendorById(vendorId);
    res.json(vendor);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch vendor' });
  }
});

export default router;