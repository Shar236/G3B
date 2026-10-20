<?php
/** Theme setup and assets. */
if (!defined('ABSPATH')) { exit; }

function g3b_education_setup() {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', array('search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script'));
    add_theme_support('custom-logo', array('height' => 100, 'width' => 280, 'flex-height' => true, 'flex-width' => true));
    register_nav_menus(array('primary' => __('Primary Menu', 'g3b-education')));
}
add_action('after_setup_theme', 'g3b_education_setup');

function g3b_education_assets() {
    wp_enqueue_style('g3b-google-fonts', 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@600;700;800&display=swap', array(), null);
    wp_enqueue_style('g3b-font-awesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css', array(), '6.5.1');
    wp_enqueue_style('g3b-education-style', get_stylesheet_uri(), array('g3b-google-fonts', 'g3b-font-awesome'), '1.0.0');
    wp_enqueue_script('g3b-education-main', get_template_directory_uri() . '/assets/js/main.js', array(), '1.0.0', true);
}
add_action('wp_enqueue_scripts', 'g3b_education_assets');

/** Process homepage enquiries securely and email the site administrator. */
function g3b_education_submit_enquiry() {
    if (!isset($_POST['g3b_enquiry_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['g3b_enquiry_nonce'])), 'g3b_enquiry_form')) {
        wp_die(esc_html__('Security check failed. Please go back and try again.', 'g3b-education'));
    }

    $name = isset($_POST['full_name']) ? sanitize_text_field(wp_unslash($_POST['full_name'])) : '';
    $phone = isset($_POST['phone']) ? sanitize_text_field(wp_unslash($_POST['phone'])) : '';
    $email = isset($_POST['email']) ? sanitize_email(wp_unslash($_POST['email'])) : '';
    $interest = isset($_POST['interested_in']) ? sanitize_text_field(wp_unslash($_POST['interested_in'])) : '';
    $message = isset($_POST['message']) ? sanitize_textarea_field(wp_unslash($_POST['message'])) : '';
    $redirect = wp_get_referer() ? wp_get_referer() : home_url('/');

    if (!$name || !$phone || !is_email($email) || !$interest) {
        wp_safe_redirect(add_query_arg('g3b_enquiry', 'error', $redirect) . '#contact');
        exit;
    }

    $to = get_option('admin_email');
    $subject = sprintf('[G3B Education] Website enquiry from %s', $name);
    $body = "Name: {$name}\nPhone: {$phone}\nEmail: {$email}\nInterested in: {$interest}\n\nMessage:\n{$message}";
    $headers = array('Reply-To: ' . $name . ' <' . $email . '>');
    $sent = wp_mail($to, $subject, $body, $headers);
    wp_safe_redirect(add_query_arg('g3b_enquiry', $sent ? 'sent' : 'error', $redirect) . '#contact');
    exit;
}
add_action('admin_post_nopriv_g3b_submit_enquiry', 'g3b_education_submit_enquiry');
add_action('admin_post_g3b_submit_enquiry', 'g3b_education_submit_enquiry');

/** Fallback navigation for themes without a configured menu. */
function g3b_education_menu_fallback() {
    echo '<ul class="menu"><li><a href="' . esc_url(home_url('/#why')) . '">About</a></li><li><a href="' . esc_url(home_url('/#services')) . '">Services</a></li><li><a href="' . esc_url(home_url('/#destinations')) . '">Destinations</a></li><li><a href="' . esc_url(home_url('/#reviews')) . '">Reviews</a></li><li><a href="' . esc_url(home_url('/#contact')) . '">Contact</a></li></ul>';
}
