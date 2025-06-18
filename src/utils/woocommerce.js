import WooCommerceRestApiPkg from "@woocommerce/woocommerce-rest-api";
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WooCommerceRestApi = WooCommerceRestApiPkg.default || WooCommerceRestApiPkg;


const api = new WooCommerceRestApi({
  url: process.env.WORDPRESS_SITE_URL, 
  consumerKey: process.env.WC_CONSUMER_KEY,
  consumerSecret: process.env.WC_CONSUMER_SECRET,
  version: "wc/v3",
  queryStringAuth: true,
});

/**
 * Create WooCommerce customer
 * @param {string} email 
 * @param {string} firstName 
 * @param {string} lastName 
 * @param {string} username
 * @returns {number} WooCommerce customer ID
 */
export async function createWooCommerceCustomer(email, firstName, lastName, username) {
  try {
    const response = await api.post("customers", {
      email,
      first_name: firstName,
      last_name: lastName,
      username,
      password: Math.random().toString(36).slice(-8) // random password if you want
    });

    return response.data.id;
  } catch (error) {
    console.error("Error creating WooCommerce customer:", error.response?.data || error.message);
    throw error;
  }
}

export async function getAllProducts() {
  try {
    const response = await api.get('products', { per_page: 100 });
    return response.data.map(product => ({
      productId: product.id,
      productName: product.name,
      picture: product.images.length > 0 ? product.images[0].src : null
    }));
  } catch (error) {
    console.error("WooCommerce API Error:", error.response?.data || error.message);
    throw error;
  }
}

export async function getAllVendors() {
  try {
    const response = await axios.get('https://multivendor.zmedia.com.pk/wp-json/dokan/v1/stores');
    const vendors = response.data.map(store => ({
      vendorId: store.id,
      vendorName: store.store_name,
      shopUrl: store.shop_url,
    }));
    return vendors;
  } catch (error) {
    console.error('Failed to fetch vendors:', error);
    throw error;
  }
}

export async function getVendorById(vendorId) {
  try {
    const response = await axios.get(`https://multivendor.zmedia.com.pk/wp-json/dokan/v1/stores/${vendorId}`);
    // The response should be a single vendor/store object
    return {
      shopUrl: response.data.shop_url,
    };
  } catch (error) {
    console.error(`Failed to fetch vendor with ID ${vendorId}:`, error.response?.data || error.message);
    throw error;
  }
}
