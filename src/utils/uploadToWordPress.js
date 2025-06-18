// import axios from 'axios';
// import FormData from 'form-data';
// import fs from 'fs';

// export async function uploadToWordPress(file) {
//   if (!file || !file.path) {
//     throw new Error('No file uploaded or invalid file data');
//   }

//   const form = new FormData();
//   form.append('file', fs.createReadStream(file.path), file.originalname);

//   try {
//     const response = await axios.post(process.env.WORDPRESS_API_URL, form, {
//       headers: {
//         ...form.getHeaders(),
//         Authorization:
//           'Basic ' +
//           Buffer.from(
//             `${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_APP_PASSWORD}`
//           ).toString('base64'),
//       },
//     });

//     return response.data.source_url;
//   } catch (error) {
//     console.error('❌ WordPress upload failed:', error.response?.data || error.message);
//     throw new Error('Failed to upload image');
//   }
// }

// src/utils/uploadToWordPress.js

// import axios from 'axios';
// import FormData from 'form-data';
// import fs from 'fs'; // Use fs to read the file from the file system
// import dotenv from 'dotenv';
// import https from 'https';

// const agent = new https.Agent({
//   rejectUnauthorized: false,
// });

// dotenv.config(); // Load .env variables

// // Function to upload the image to WordPress
// export async function uploadToWordPress(filePath, fileName) {
//   const formData = new FormData();
  
//   // Open the file as a readable stream and append it to the form data
//   formData.append('file', fs.createReadStream(filePath), fileName); // Correctly using fs.createReadStream
//   console.log('Form Data:', formData);


//   try {
//     console.log('Uploading image to WordPress:', filePath); // Log the file path being uploaded

//     const response = await axios.post(process.env.WORDPRESS_API_URL, formData, {
//       headers: {
//         // 'Authorization': `Basic ${Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_APP_PASSWORD}`).toString('base64')}`,
//         'Authorization': `Basic ${Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_APP_PASSWORD}`).toString('base64')}`,
//         ...formData.getHeaders(), // Ensure correct headers are set for FormData
//       },
//       httpsAgent: agent,
//     });

//     // Log the response from WordPress
//     console.log('WordPress upload response:', response.data);

//     return response.data.source_url; // Return the image URL
//   } catch (error) {
//     console.error('Error uploading image to WordPress:', error.response ? error.response.data : error.message);
//     throw error;
//   }
// }


import axios from 'axios';
import FormData from 'form-data';

export async function uploadToWordPress(file) {
  const formData = new FormData();
  formData.append('file', file.buffer, {
    filename: file.originalname,
    contentType: file.mimetype,
  });

  const response = await axios.post(process.env.WORDPRESS_API_URL, formData, {
    headers: {
      ...formData.getHeaders(),
      Authorization:
        'Basic ' +
        Buffer.from(
          `${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_APP_PASSWORD}`
        ).toString('base64'),
    },
  });

  return response.data.source_url;
}
