<?php if (!defined('ABSPATH')) { exit; } ?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<header class="g3b-site-header" style="background:#fff;border-bottom:1px solid #E2E8F0;position:relative;z-index:20;">
  <div class="container" style="display:flex;align-items:center;justify-content:space-between;gap:24px;min-height:82px;">
    <div class="g3b-brand" style="font-family:Poppins,sans-serif;font-weight:800;font-size:1.45rem;color:#0B2C5F;">
      <a href="<?php echo esc_url(home_url('/')); ?>" style="color:#0B2C5F;">
      <?php if (has_custom_logo()) { the_custom_logo(); } else { echo esc_html(get_bloginfo('name') ?: 'G3B Education'); } ?>
      </a>
    </div>
    <nav class="g3b-primary-navigation" aria-label="Primary navigation">
      <?php wp_nav_menu(array('theme_location' => 'primary', 'container' => false, 'fallback_cb' => 'g3b_education_menu_fallback', 'menu_class' => 'g3b-menu', 'depth' => 1)); ?>
    </nav>
  </div>
</header>
