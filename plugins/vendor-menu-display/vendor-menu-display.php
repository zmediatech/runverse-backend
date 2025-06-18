<?php
/*
Plugin Name: Vendor Menu Display
Description: Display a list of all available vendors in a menu using a shortcode.
Version: 1.0
Author: Meer Muneeb Khan
*/

// Hook to register the shortcode
add_action('init', 'vendor_menu_shortcode_init');

function vendor_menu_shortcode_init() {
    add_shortcode('vendor_menu', 'display_vendor_menu');
}

// Shortcode to display all vendors in a menu
function display_vendor_menu($atts) {
    // Get all vendors (Dokan function)
    $vendors = dokan_get_sellers();

    if (empty($vendors)) {
        return '<p>No vendors found.</p>';
    }

    // Start the unordered list (menu)
    $output = '<ul class="vendor-menu-list">';

    // Loop through the vendors and create a list item for each
    foreach ($vendors as $vendor) {
        $vendor_name = esc_html($vendor->get_shop_name()); // Vendor shop name
        $vendor_url = dokan_get_store_url($vendor->ID); // Vendor store URL

        $output .= '<li><a href="' . esc_url($vendor_url) . '" title="' . $vendor_name . '">' . $vendor_name . '</a></li>';
    }

    // Close the unordered list
    $output .= '</ul>';

    // Return the final output to be displayed
    return $output;
}

// Optional: Add custom CSS to style the vendor menu
function vendor_menu_styles() {
    echo '
    <style>
        .vendor-menu-list {
            list-style-type: none;
            padding: 0;
            margin: 0;
        }
        .vendor-menu-list li {
            margin: 10px 0;
        }
        .vendor-menu-list a {
            text-decoration: none;
            color: #0071a1;
            font-weight: bold;
        }
        .vendor-menu-list a:hover {
            color: #ff6a00;
        }
    </style>';
}
add_action('wp_head', 'vendor_menu_styles');

?>
