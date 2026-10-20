<?php get_header(); ?>
<main class="container section">
<?php if (have_posts()) : while (have_posts()) : the_post(); ?>
  <article <?php post_class(); ?>><h1 class="section-title"><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h1><div class="entry-content"><?php the_content(); ?></div></article>
<?php endwhile; the_posts_pagination(); else : ?><h1><?php esc_html_e('Nothing found', 'g3b-education'); ?></h1><?php endif; ?>
</main>
<?php get_footer(); ?>
