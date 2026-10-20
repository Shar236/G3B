G3B Education WordPress Theme
=============================

INSTALLATION
1. In WordPress, go to Appearance > Themes > Add New Theme > Upload Theme.
2. Upload g3b-education-theme.zip and click Install Now, then Activate.
3. Go to Settings > Reading and set the homepage to a static page. Create/select a page named Home; this theme's front-page.php will render the homepage when WordPress is configured to use a static front page. If needed, create a Home page and select it under Settings > Reading.
4. Go to Appearance > Menus (or Appearance > Editor, depending on your WordPress version) and create a Primary Menu. Use custom links to homepage anchors such as /#why, /#services, /#destinations, /#reviews, and /#contact.
5. Go to Settings > General and set the WordPress Administration Email Address. Website enquiry form submissions are sent to that address using wp_mail(). Configure SMTP through your hosting provider or a trusted SMTP plugin if email delivery is not configured.
6. To change the header logo, use Appearance > Customize > Site Identity if your WordPress setup exposes the Customizer, or the Site Logo setting in your admin interface.

NOTES
- The homepage markup and original CSS are based on the supplied index.html. Most original image URLs are preserved as in the source file.
- The supplied source did not contain an actual footer element, so a simple branded footer has been added.
- The enquiry form now submits to WordPress and attempts to email the configured site administrator. Email delivery depends on server mail configuration.
- Many homepage content areas remain in the front-page template rather than editable fields. They can be edited by a developer in front-page.php; a custom-field editing interface was not part of the source HTML.
- This theme does not bundle WordPress itself, a database, third-party plugins, or the remote images.
