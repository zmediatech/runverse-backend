<?php
/*
Plugin Name: Auto Login By Token
Description: Allows automatic login to WooCommerce store via a token URL.
Version: 1.0
Author: Meer Muneeb Khan
*/

// Hook into init to add a rewrite endpoint
add_action('init', 'alt_add_rewrite_endpoint');
function alt_add_rewrite_endpoint() {
    add_rewrite_rule('^autologin/?$', 'index.php?alt_autologin=1', 'top');
    add_rewrite_tag('%alt_autologin%', '1');
}

// Hook into template_redirect to process login
add_action('template_redirect', 'alt_handle_autologin');
function alt_handle_autologin() {
    global $wp_query;

    // Check if our endpoint was matched
    if (!isset($wp_query->query_vars['alt_autologin'])) {
        return;
    }

    // Get token from URL query param
    $token = isset($_GET['token']) ? sanitize_text_field($_GET['token']) : '';

    if (empty($token)) {
        wp_die('Missing login token.', 'Auto Login Error', array('response' => 400));
    }

    // Verify token with your backend API
    $verify_url = 'https://runverse-backend.vercel.app/api/users/verify-token'; // <- Change this to your backend verification endpoint

    $response = wp_remote_post($verify_url, array(
        'body' => json_encode(array('token' => $token)),
        'headers' => array('Content-Type' => 'application/json'),
        'timeout' => 15,
    ));

    if (is_wp_error($response)) {
        wp_die('Token verification failed: ' . $response->get_error_message(), 'Auto Login Error', array('response' => 500));
    }

    $body = json_decode(wp_remote_retrieve_body($response), true);

    if (empty($body) || empty($body['wooCustomerId'])) {
        wp_die('Invalid or expired token.', 'Auto Login Error', array('response' => 403));
    }

    // Get WordPress user by WooCommerce customer ID (usually WP user ID)
    $user_id = intval($body['wooCustomerId']);

    if (!$user_id) {
        wp_die('User not found.', 'Auto Login Error', array('response' => 404));
    }

    // Log the user in programmatically
    wp_set_auth_cookie($user_id);
    wp_set_current_user($user_id);

    // Redirect to desired page (homepage or dashboard)
    wp_redirect(home_url());
    exit;
}

// Flush rewrite rules on plugin activation/deactivation
register_activation_hook(__FILE__, 'alt_flush_rewrite_rules');
register_deactivation_hook(__FILE__, 'alt_flush_rewrite_rules');
function alt_flush_rewrite_rules() {
    flush_rewrite_rules();
}
