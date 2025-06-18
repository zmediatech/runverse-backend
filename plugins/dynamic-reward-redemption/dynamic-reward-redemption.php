<?php
/*
Plugin Name: Dynamic Reward Redemption
Description: Handles dynamic reward redemption via rewardlogin token and applies discounts on WooCommerce cart.
Version: 3
Author: Meer Muneeb Khan
*/

// Rewrite rule for rewardlogin URL
add_action('init', function() {
    add_rewrite_rule('^rewardlogin/?$', 'index.php?dynamic_reward_rewardlogin=1', 'top');
    add_rewrite_tag('%dynamic_reward_rewardlogin%', '1');
});
register_activation_hook(__FILE__, function() { flush_rewrite_rules(); });
register_deactivation_hook(__FILE__, function() { flush_rewrite_rules(); });

// Helper: Get vendor/store URL from API by vendorId
function dynamic_reward_get_vendor_url($vendor_id) {
    if (!$vendor_id) return false;
    $response = wp_remote_get("https://runverse-backend.vercel.app/api/woo/get-url/" . intval($vendor_id), [
        'timeout' => 15,
        'headers' => ['Accept' => 'application/json'],
    ]);
    if (is_wp_error($response)) return false;
    $body = json_decode(wp_remote_retrieve_body($response), true);
    if (!empty($body['shopUrl'])) return esc_url_raw($body['shopUrl']);
    return false;
}

// Process reward login URL, verify token, login user, store reward in session
add_action('template_redirect', function() {
    global $wp_query;
    if (!isset($wp_query->query_vars['dynamic_reward_rewardlogin'])) return;

    $token = isset($_GET['token']) ? sanitize_text_field($_GET['token']) : '';
    $reward = isset($_GET['reward']) ? sanitize_text_field($_GET['reward']) : '';

    if (!$token) wp_die('Missing login token.', 'Reward Login Error', ['response' => 400]);

    $verify_url = 'https://runverse-backend.vercel.app/api/users/verify-token';
    $response = wp_remote_post($verify_url, [
        'body' => json_encode(['token' => $token]),
        'headers' => ['Content-Type' => 'application/json'],
        'timeout' => 15,
    ]);

    if (is_wp_error($response)) {
        wp_die('Token verification failed: ' . $response->get_error_message(), 'Reward Login Error', ['response' => 500]);
    }

    $body = json_decode(wp_remote_retrieve_body($response), true);
    if (empty($body) || empty($body['wooCustomerId'])) {
        wp_die('Invalid or expired token.', 'Reward Login Error', ['response' => 403]);
    }

    $user_id = intval($body['wooCustomerId']);
    if (!$user_id) wp_die('User not found.', 'Reward Login Error', ['response' => 404]);

    wp_set_auth_cookie($user_id);
    wp_set_current_user($user_id);

    if (!session_id()) session_start();
    $_SESSION['dynamic_reward'] = $reward;

    // Parse reward JSON
    $reward_data = json_decode(stripslashes($reward), true);

    // If vendorId is set, fetch vendor URL and redirect there
    if (!empty($reward_data['vendorId'])) {
        $vendor_url = dynamic_reward_get_vendor_url(intval($reward_data['vendorId']));
        if ($vendor_url) {
            wp_redirect($vendor_url);
            exit;
        }
    }

    // If sitewide_discount redirect to /shop/
    if (isset($reward_data['type']) && $reward_data['type'] === 'sitewide_discount') {
        wp_redirect(home_url('/shop/'));
        exit;
    }

    // Default redirect to cart
    wp_redirect(wc_get_cart_url());
    exit;
});

// Add free item or product discount reward product to cart if not present
add_action('template_redirect', 'dynamic_reward_add_reward_product_on_cart_page');
function dynamic_reward_add_reward_product_on_cart_page() {
    if (!is_cart()) return;
    if (!session_id()) session_start();
    if (empty($_SESSION['dynamic_reward'])) return;

    $reward_data = json_decode(stripslashes($_SESSION['dynamic_reward']), true);
    if (!$reward_data || empty($reward_data['type'])) return;

    // Only for free_item or product_discount add product to cart
    if (!in_array($reward_data['type'], ['free_item', 'product_discount'])) return;

    $product_id = intval($reward_data['productId'] ?? 0);
    if (!$product_id) return;

    foreach (WC()->cart->get_cart() as $cart_item_key => $cart_item) {
        if (
            $cart_item['product_id'] == $product_id &&
            !empty($cart_item['dynamic_reward_key']) &&
            $cart_item['dynamic_reward_key'] === md5(json_encode($reward_data))
        ) {
            return; // Already in cart
        }
    }

    WC()->cart->add_to_cart($product_id, 1, 0, [], ['dynamic_reward_key' => md5(json_encode($reward_data))]);
    WC()->cart->calculate_totals();
    wp_safe_redirect(wc_get_cart_url());
    exit;
}

// Append 🎁 emoji once outside product link on cart items for all reward types that apply discount
add_filter('woocommerce_cart_item_name', 'dynamic_reward_modify_cart_item_name', 10, 3);
function dynamic_reward_modify_cart_item_name($product_name_html, $cart_item, $cart_item_key) {
    if (!session_id()) session_start();
    if (empty($_SESSION['dynamic_reward'])) return $product_name_html;

    $reward_data = json_decode(stripslashes($_SESSION['dynamic_reward']), true);
    if (!$reward_data) return $product_name_html;

    $reward_type = $reward_data['type'] ?? '';
    $apply_emoji = false;

    // Determine if this cart item qualifies for discount and emoji
    switch ($reward_type) {
        case 'free_item':
        case 'product_discount':
            if (!empty($cart_item['dynamic_reward_key']) &&
                $cart_item['dynamic_reward_key'] === md5(json_encode($reward_data))) {
                $apply_emoji = true;
            }
            break;

        case 'vendor_discount':
            $vendor_id = intval($reward_data['vendorId']);
            $product_vendor_id = dynamic_reward_get_product_vendor_id($cart_item['product_id']);
            if ($product_vendor_id === $vendor_id) {
                $apply_emoji = true;
            }
            break;

        case 'sitewide_discount':
            // Applies to all cart items
            $apply_emoji = true;
            break;
    }

    if ($apply_emoji) {
        if (preg_match('/^(<a[^>]*>)(.*)(<\/a>)(.*)$/is', $product_name_html, $matches)) {
            $link_start = $matches[1];
            $link_text = $matches[2];
            $link_end = $matches[3];
            $after_link = $matches[4];

            $link_text = preg_replace('/\s*🎁$/u', '', $link_text);

            return $link_start . $link_text . $link_end . ' 🎁' . $after_link;
        } else {
            $clean_text = preg_replace('/\s*🎁$/u', '', strip_tags($product_name_html));
            return esc_html($clean_text) . ' 🎁';
        }
    }

    return $product_name_html;
}

// Add CSS class for reward products in cart
add_filter('woocommerce_cart_item_class', function($class, $cart_item, $cart_item_key) {
    if (!session_id()) session_start();
    if (empty($_SESSION['dynamic_reward'])) return $class;

    $reward_data = json_decode(stripslashes($_SESSION['dynamic_reward']), true);
    if (!$reward_data) return $class;

    if (
        !empty($cart_item['dynamic_reward_key']) &&
        $cart_item['dynamic_reward_key'] === md5(json_encode($reward_data)) &&
        in_array($reward_data['type'], ['free_item', 'product_discount'])
    ) {
        $class .= ' dynamic-reward-product';
    }
    return $class;
}, 10, 3);

// Lock quantity input for reward products (readonly)
add_filter('woocommerce_cart_item_quantity', 'dynamic_reward_lock_qty_input_for_reward', 10, 3);
function dynamic_reward_lock_qty_input_for_reward($product_quantity, $cart_item, $cart_item_key) {
    if (!session_id()) session_start();
    if (empty($_SESSION['dynamic_reward'])) return $product_quantity;

    $reward_data = json_decode(stripslashes($_SESSION['dynamic_reward']), true);
    if (!$reward_data) return $product_quantity;

    if (
        !empty($cart_item['dynamic_reward_key']) &&
        $cart_item['dynamic_reward_key'] === md5(json_encode($reward_data)) &&
        in_array($reward_data['type'], ['free_item', 'product_discount'])
    ) {
        $qty = intval($cart_item['quantity']);
        return sprintf(
            '<input type="number" readonly name="cart[%s][qty]" value="%d" style="width:50px;opacity:0.6;pointer-events:none;" />',
            esc_attr($cart_item_key),
            $qty
        );
    }

    return $product_quantity;
}

// Enqueue styles and scripts with custom ribbon, timer, and quantity input disabling
add_action('wp_enqueue_scripts', function() {
    if (!session_id()) session_start();
    if (empty($_SESSION['dynamic_reward'])) return;

    $reward_data = json_decode(stripslashes($_SESSION['dynamic_reward']), true);
    if (!$reward_data) return;

    wp_enqueue_script('jquery');

    wp_add_inline_style('wp-block-library', "
        /* Fixed floating timer box */
        #dynamic-reward-timer {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 999999;
            background: #0071a1;
            color: white;
            padding: 12px 18px;
            border-radius: 6px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 0 10px rgba(0,0,0,0.3);
            cursor: default;
            user-select: none;
            min-width: 200px;
            text-align: center;
        }
        /* Disable qty input globally for reward products */
        .dynamic-reward-product .qty-box input.qty {
            pointer-events: none !important;
            opacity: 0.6 !important;
        }
        .dynamic-reward-product .qty-box .increase,
        .dynamic-reward-product .qty-box .decrease {
            display: none !important;
        }
        /* Hide original sale ribbons when vendor or sitewide discount active */
        .onsale.ribbon {
            display: none !important;
        }
        /* Custom discount ribbon with #0071A1 background and rectangle shape */
        .custom-discount-ribbon {
            background-color: #0071A1 !important;
            color: white !important;
            font-weight: bold;
            font-size: 1.20rem;
            padding: 4px 10px;
            border-radius: 3px;
            position: absolute;
            top: 10px;
            left: 10px;
            z-index: 2;
            text-transform: uppercase;
            font-family: Arial, sans-serif;
        }
        /* Discounted price style everywhere */
        ins {
            color: green !important;
            font-weight: bold !important;
            text-decoration: none !important;
        }
        del {
            color: #555 !important;
        }
    ");

    wp_add_inline_script('jquery-core', "
        jQuery(function($){
            if ($('#dynamic-reward-timer').length === 0) {
                $('body').append('<div id=\"dynamic-reward-timer\">🎁 Reward expires in <span id=\"dynamic-reward-countdown\">15:00</span></div>');
            }

            var totalDuration = 900; // 15 minutes in seconds
            var storageKey = 'dynamic_reward_timer_start';
            var startTime = localStorage.getItem(storageKey);
            var now = Date.now();

            if (!startTime) {
                localStorage.setItem(storageKey, now);
                startTime = now;
            } else {
                startTime = parseInt(startTime);
            }

            function updateTimer() {
                var elapsed = Math.floor((Date.now() - startTime) / 1000);
                var remaining = totalDuration - elapsed;

                if (remaining <= 0) {
                    localStorage.removeItem(storageKey);
                    $.post('" . admin_url('admin-ajax.php') . "', {action: 'clear_dynamic_reward_session'}, function(){
                        location.reload();
                    });
                    return;
                }

                var minutes = Math.floor(remaining / 60);
                var seconds = remaining % 60;
                $('#dynamic-reward-countdown').text(('0' + minutes).slice(-2) + ':' + ('0' + seconds).slice(-2));
                setTimeout(updateTimer, 1000);
            }
            updateTimer();
        });
    ");
});

// AJAX to clear reward session
add_action('wp_ajax_clear_dynamic_reward_session', 'clear_dynamic_reward_session');
add_action('wp_ajax_nopriv_clear_dynamic_reward_session', 'clear_dynamic_reward_session');
function clear_dynamic_reward_session() {
    if (!session_id()) session_start();
    if (isset($_SESSION['dynamic_reward'])) {
        unset($_SESSION['dynamic_reward']);
    }
    wp_send_json_success();
}

add_filter('woocommerce_cart_item_price', 'dynamic_reward_modify_cart_item_price', 10, 3);
function dynamic_reward_modify_cart_item_price($price_html, $cart_item, $cart_item_key) {
    if (!session_id()) session_start();
    if (empty($_SESSION['dynamic_reward'])) return $price_html;

    $reward_data = json_decode(stripslashes($_SESSION['dynamic_reward']), true);
    if (!$reward_data) return $price_html;

    $reward_type = $reward_data['type'] ?? '';
    $apply_discount = false;
    $original_price = floatval($cart_item['data']->get_price());

    switch ($reward_type) {
        case 'free_item':
            if (!empty($cart_item['dynamic_reward_key']) &&
                $cart_item['dynamic_reward_key'] === md5(json_encode($reward_data))) {
                // Free item price is zero
                $apply_discount = true;
                $discounted_price = 0;
            }
            break;

        case 'product_discount':
            if (!empty($cart_item['dynamic_reward_key']) &&
                $cart_item['dynamic_reward_key'] === md5(json_encode($reward_data))) {
                $apply_discount = true;
                $discount_percent = floatval($reward_data['discountPercentage'] ?? 0);
                $discounted_price = $original_price * (1 - $discount_percent / 100);
            }
            break;

        case 'vendor_discount':
            $vendor_id = intval($reward_data['vendorId']);
            $product_vendor_id = dynamic_reward_get_product_vendor_id($cart_item['product_id']);
            if ($product_vendor_id === $vendor_id) {
                $apply_discount = true;
                $discount_percent = floatval($reward_data['discountPercentage'] ?? 0);
                $discounted_price = $original_price * (1 - $discount_percent / 100);
            }
            break;

        case 'sitewide_discount':
            $apply_discount = true;
            $discount_percent = floatval($reward_data['discountPercentage'] ?? 0);
            $discounted_price = $original_price * (1 - $discount_percent / 100);
            break;
    }

    if ($apply_discount) {
        $original_price_html = wc_price($original_price);
        $discounted_price_html = wc_price($discounted_price);
        return '<del>' . $original_price_html . '</del> <ins style="font-weight:bold; color:green;">' . $discounted_price_html . '</ins>';
    }

    return $price_html;
}

// Modify cart item subtotal display for all reward types with discounts
add_filter('woocommerce_cart_item_subtotal', 'dynamic_reward_modify_cart_item_subtotal', 10, 3);
function dynamic_reward_modify_cart_item_subtotal($subtotal_html, $cart_item, $cart_item_key) {
    if (!session_id()) session_start();
    if (empty($_SESSION['dynamic_reward'])) return $subtotal_html;

    $reward_data = json_decode(stripslashes($_SESSION['dynamic_reward']), true);
    if (!$reward_data) return $subtotal_html;

    $reward_type = $reward_data['type'] ?? '';
    $apply_discount = false;
    $original_price = floatval($cart_item['data']->get_price());
    $quantity = intval($cart_item['quantity']);

    switch ($reward_type) {
        case 'free_item':
            if (!empty($cart_item['dynamic_reward_key']) &&
                $cart_item['dynamic_reward_key'] === md5(json_encode($reward_data))) {
                $apply_discount = true;
                $discounted_total = 0;
            }
            break;

        case 'product_discount':
            if (!empty($cart_item['dynamic_reward_key']) &&
                $cart_item['dynamic_reward_key'] === md5(json_encode($reward_data))) {
                $apply_discount = true;
                $discount_percent = floatval($reward_data['discountPercentage'] ?? 0);
                $discounted_total = $original_price * $quantity * (1 - $discount_percent / 100);
            }
            break;

        case 'vendor_discount':
            $vendor_id = intval($reward_data['vendorId']);
            $product_vendor_id = dynamic_reward_get_product_vendor_id($cart_item['product_id']);
            if ($product_vendor_id === $vendor_id) {
                $apply_discount = true;
                $discount_percent = floatval($reward_data['discountPercentage'] ?? 0);
                $discounted_total = $original_price * $quantity * (1 - $discount_percent / 100);
            }
            break;

        case 'sitewide_discount':
            $apply_discount = true;
            $discount_percent = floatval($reward_data['discountPercentage'] ?? 0);
            $discounted_total = $original_price * $quantity * (1 - $discount_percent / 100);
            break;
    }

    if ($apply_discount) {
        $original_total_html = wc_price($original_price * $quantity);
        $discounted_total_html = wc_price($discounted_total);
        return '<del>' . $original_total_html . '</del> <ins style="font-weight:bold; color:green;">' . $discounted_total_html . '</ins>';
    }

    return $subtotal_html;
}

// Helper: Get vendor ID from product ID using Dokan or fallback to post author
function dynamic_reward_get_product_vendor_id($product_id) {
    if (function_exists('dokan_get_vendor_by_product')) {
        $vendor = dokan_get_vendor_by_product($product_id);
        if ($vendor && isset($vendor->id)) {
            return intval($vendor->id);
        }
    }
    // Fallback to post author ID
    return intval(get_post_field('post_author', $product_id));
}

// Apply discount fee for all reward types including vendor discount restricted by vendorId
add_action('woocommerce_cart_calculate_fees', function($cart) {
    if (is_admin() && !defined('DOING_AJAX')) return;
    if (!session_id()) session_start();
    if (empty($_SESSION['dynamic_reward'])) return;

    $reward = $_SESSION['dynamic_reward'];
    $reward_data = json_decode(stripslashes($reward), true);
    if (!$reward_data || empty($reward_data['type'])) return;

    $discount_total = 0;

    switch ($reward_data['type']) {
        case 'free_item':
            foreach ($cart->get_cart() as $cart_item) {
                if (
                    $cart_item['product_id'] == $reward_data['productId'] &&
                    !empty($cart_item['dynamic_reward_key']) &&
                    $cart_item['dynamic_reward_key'] === md5(json_encode($reward_data))
                ) {
                    $discount_total = $cart_item['data']->get_price() * $cart_item['quantity'];
                    break;
                }
            }
            break;

        case 'product_discount':
            foreach ($cart->get_cart() as $cart_item) {
                if (
                    $cart_item['product_id'] == $reward_data['productId'] &&
                    !empty($cart_item['dynamic_reward_key']) &&
                    $cart_item['dynamic_reward_key'] === md5(json_encode($reward_data))
                ) {
                    $price = $cart_item['data']->get_price();
                    $discount_total = ($reward_data['discountPercentage'] / 100) * $price * $cart_item['quantity'];
                    break;
                }
            }
            break;

        case 'vendor_discount':
            $vendor_id = intval($reward_data['vendorId']);
            foreach ($cart->get_cart() as $cart_item) {
                $product_vendor_id = dynamic_reward_get_product_vendor_id($cart_item['product_id']);
                if ($product_vendor_id === $vendor_id) {
                    $price = $cart_item['data']->get_price() * $cart_item['quantity'];
                    $discount_total += ($reward_data['discountPercentage'] / 100) * $price;
                }
            }
            break;

        case 'sitewide_discount':
            foreach ($cart->get_cart() as $cart_item) {
                $price = $cart_item['data']->get_price() * $cart_item['quantity'];
                $discount_total += ($reward_data['discountPercentage'] / 100) * $price;
            }
            break;
    }

    if ($discount_total > 0) {
        $cart->add_fee(__('Reward Discount', 'dynamic-reward-redemption'), -$discount_total);
    }
});

// Updated notice text on cart and checkout pages
add_action('woocommerce_before_cart', 'show_dynamic_reward_notice');
add_action('woocommerce_before_checkout_form', 'show_dynamic_reward_notice');
function show_dynamic_reward_notice() {
    if (!session_id()) session_start();
    if (isset($_SESSION['dynamic_reward'])) {
        wc_print_notice(__('🎁 Complete your reward redemption within 15 minutes or your rewards will expire.', 'dynamic-reward-redemption'), 'notice');
    }
}

// Clear session reward after order completion
add_action('woocommerce_thankyou', function($order_id) {
    if (!session_id()) session_start();
    if (isset($_SESSION['dynamic_reward'])) unset($_SESSION['dynamic_reward']);
});

// Override price display on shop page for vendor or sitewide discounts
add_filter('woocommerce_get_price_html', function($price_html, $product) {
    if (!session_id()) session_start();
    if (empty($_SESSION['dynamic_reward'])) return $price_html;

    $reward_data = json_decode(stripslashes($_SESSION['dynamic_reward']), true);
    if (!$reward_data) return $price_html;

    $discount_percent = floatval($reward_data['discountPercentage'] ?? 0);
    if ($discount_percent <= 0) return $price_html;

    $product_vendor_id = dynamic_reward_get_product_vendor_id($product->get_id());

    // Apply discount only if:
    // - sitewide_discount: always apply
    // - vendor_discount: only if vendor matches
    // - other types: do not apply here
    $apply_discount = false;
    if ($reward_data['type'] === 'sitewide_discount') {
        $apply_discount = true;
    } elseif ($reward_data['type'] === 'vendor_discount' && isset($reward_data['vendorId']) && $product_vendor_id === intval($reward_data['vendorId'])) {
        $apply_discount = true;
    }

    if (!$apply_discount) return $price_html;

    $original_price = floatval($product->get_regular_price() ?: $product->get_price());
    $discounted_price = $original_price * (1 - $discount_percent / 100);
    if ($discounted_price >= $original_price) return $price_html;

    $original_price_html = wc_price($original_price);
    $discounted_price_html = wc_price($discounted_price);

    return '<del>' . $original_price_html . '</del> <ins style="font-weight:bold; color:green;">' . $discounted_price_html . '</ins>';
}, 10, 2);

// Add custom discount ribbon/tag on shop page products for vendor or sitewide discounts
add_action('woocommerce_before_shop_loop_item_title', function() {
    if (!session_id()) session_start();
    if (empty($_SESSION['dynamic_reward'])) return;

    $reward_data = json_decode(stripslashes($_SESSION['dynamic_reward']), true);
    if (!$reward_data) return;

    $discount_percent = floatval($reward_data['discountPercentage'] ?? 0);
    if ($discount_percent <= 0) return;

    global $product;
    if (!$product) return;

    $product_vendor_id = dynamic_reward_get_product_vendor_id($product->get_id());

    $show_ribbon = false;
    if ($reward_data['type'] === 'sitewide_discount') {
        $show_ribbon = true;
    } elseif ($reward_data['type'] === 'vendor_discount' && isset($reward_data['vendorId']) && $product_vendor_id === intval($reward_data['vendorId'])) {
        $show_ribbon = true;
    }

    if (!$show_ribbon) return;

    echo '<span class="custom-discount-ribbon">-' . intval($discount_percent) . '% 🎁</span>';
}, 15);